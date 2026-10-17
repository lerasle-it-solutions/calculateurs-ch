import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, posix, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * Après la construction (`postbuild`, donc aussi sur Cloudflare) : budget de
 * JavaScript de chaque page de dist/ (CLAUDE.md § 3, décision n° 21, checklist
 * point 17). Tailles minifiées, non compressées : celles des fichiers de dist/.
 *
 * - Démarrage : scripts en ligne, scripts de la page et morceaux partagés
 *   qu'ils importent statiquement, de proche en proche, chacun compté une fois.
 *   Moins de 30 000 octets.
 * - Cœur à la demande : chaque `import()` d'un script du démarrage, avec ses
 *   imports statiques qui ne sont pas déjà chargés au démarrage. Au plus
 *   40 000 octets. Le code qui le charge compte dans le démarrage.
 * - Module à la demande distinct : chaque `import()` d'un script chargé à la
 *   demande (estimateur, graphiques, comparateur…), avec ses imports statiques
 *   qui ne sont chargés ni au démarrage ni par le chargement qui le déclenche.
 *   Au plus 15 000 octets.
 *
 * Le message d'échec donne la page, le total et le détail par fichier.
 */
const DIST = fileURLToPath(new URL("../../dist/", import.meta.url));

export const BUDGETS = { startup: 29_999, core: 40_000, module: 15_000 } as const;
type Kind = keyof typeof BUDGETS;

const htmlFiles = (dir: string): string[] =>
	readdirSync(dir).flatMap((entry) => {
		const path = join(dir, entry);
		return statSync(path).isDirectory() ? htmlFiles(path) : path.endsWith(".html") ? [path] : [];
	});

/** Imports statiques relatifs d'un module minifié : `import … from "./x.js"`, `import "./x.js"`, `export … from "./x.js"`. */
export const staticImports = (code: string): string[] =>
	[...code.matchAll(/\b(?:import|export)\s*(?:[\w${},*\s]*?\bfrom\s*)?["'`](\.{1,2}\/[^"'`]+)["'`]/g)].map((match) => match[1]!);

/** Imports dynamiques relatifs : `import("./x.js")`. */
export const dynamicImports = (code: string): string[] =>
	[...code.matchAll(/\bimport\(\s*["'`](\.{1,2}\/[^"'`]+)["'`]\s*\)/g)].map((match) => match[1]!);

type Part = { name: string; bytes: number };
export type Load = { kind: Kind; label: string; parts: Part[]; total: number };
/** Accès aux fichiers construits, par URL absolue (« /_astro/x.js ») : réel ou fictif dans les tests. */
export type Files = { read: (url: string) => string; size: (url: string) => number };

/** Fichiers chargés par `entries` et leurs imports statiques, hors `loaded` ; complète `loaded`. */
const closure = (files: Files, entries: string[], loaded: Set<string>): string[] => {
	const added: string[] = [];
	const visit = (url: string) => {
		if (loaded.has(url)) return;
		loaded.add(url);
		added.push(url);
		for (const target of staticImports(files.read(url))) visit(posix.join(posix.dirname(url), target));
	};
	entries.forEach(visit);
	return added;
};

/** Chargement au démarrage d'une page, puis chaque chargement à la demande qu'elle peut déclencher, de proche en proche. */
export const pageLoads = (html: string, page: string, files: Files): Load[] => {
	const inline: Part[] = [];
	const sources: string[] = [];
	for (const [, attributes, body] of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
		if (/type="application\/(?:ld\+)?json"/.test(attributes!)) continue;
		const src = attributes!.match(/\ssrc="([^"]+)"/)?.[1];
		if (src) sources.push(src);
		else inline.push({ name: `script en ligne n° ${inline.length + 1}`, bytes: Buffer.byteLength(body!) });
	}
	const load = (kind: Kind, label: string, own: Part[], urls: string[]): Load => {
		const parts = [...own, ...urls.map((url) => ({ name: url, bytes: files.size(url) }))];
		return { kind, label, parts, total: parts.reduce((sum, part) => sum + part.bytes, 0) };
	};

	const startupLoaded = new Set<string>();
	const startup = closure(files, sources, startupLoaded);
	const loads = [load("startup", `${page} (démarrage)`, inline, startup)];
	const seen = new Set<string>();

	// `available` : ce qui est déjà chargé quand `from` déclenche ses import() — le démarrage, plus la chaîne qui y mène
	const follow = (from: string[], available: Set<string>, kind: Kind) => {
		for (const url of from) {
			for (const target of dynamicImports(files.read(url))) {
				const chunk = posix.join(posix.dirname(url), target);
				if (seen.has(chunk) || available.has(chunk)) continue;
				seen.add(chunk);
				const after = new Set(available);
				const added = closure(files, [chunk], after);
				loads.push(load(kind, `${page} (${kind === "core" ? "cœur à la demande" : "module à la demande"} : ${chunk})`, [], added));
				follow(added, after, "module");
			}
		}
	};
	follow(startup, startupLoaded, "core");
	return loads;
};

const describeLoad = ({ label, parts, total }: Load): string =>
	`${label} : ${total} octets (${parts.map((part) => `${part.name} ${part.bytes}`).join(" + ") || "aucun script"})`;

const overBudget = (loads: Load[]): string[] => loads.filter((entry) => entry.total > BUDGETS[entry.kind]).map(describeLoad);

const distFiles: Files = {
	read: (url) => readFileSync(join(DIST, url), "utf8"),
	size: (url) => statSync(join(DIST, url)).size,
};

describe("budget de JavaScript des pages construites", () => {
	it("le contrôle suit les imports statiques et dynamiques d'un module minifié", () => {
		const code = `import{n as e,t}from"./chf.CI.js";import"./side.js";export{a}from"../x/y.js";const r=()=>import("./lazy.js");const s="from './not-an-import.js'";`;
		expect(staticImports(code)).toEqual(["./chf.CI.js", "./side.js", "../x/y.js"]);
		expect(dynamicImports(code)).toEqual(["./lazy.js"]);
	});

	it("un module imbriqué ne compte pas ce que le démarrage et le cœur qui le charge ont déjà chargé", () => {
		const code: Record<string, string> = {
			"/_astro/page.js": `import"./shared.js";const l=()=>import("./core.js");`,
			"/_astro/shared.js": ``,
			"/_astro/core.js": `import"./shared.js";import"./engine.js";const e=()=>import("./estimator.js");`,
			"/_astro/engine.js": ``,
			"/_astro/estimator.js": `import"./engine.js";import"./estimator-only.js";`,
			"/_astro/estimator-only.js": ``,
		};
		const files: Files = { read: (url) => code[url]!, size: () => 1000 };
		const loads = pageLoads(`<script>x</script><script type="module" src="/_astro/page.js"></script>`, "/p", files);
		expect(loads.map((entry) => [entry.kind, entry.parts.map((part) => part.name)])).toEqual([
			["startup", ["script en ligne n° 1", "/_astro/page.js", "/_astro/shared.js"]],
			["core", ["/_astro/core.js", "/_astro/engine.js"]],
			["module", ["/_astro/estimator.js", "/_astro/estimator-only.js"]],
		]);
	});

	it("plafonds : démarrage sous 30 000 octets, cœur au plus 40 000, module au plus 15 000", () => {
		const load = (kind: Kind, total: number): Load => ({ kind, label: kind, parts: [], total });
		expect(overBudget([load("startup", 29_999), load("core", 40_000), load("module", 15_000)])).toEqual([]);
		expect(overBudget([load("startup", 30_000), load("core", 40_001), load("module", 15_001)])).toHaveLength(3);
	});

	it("dist/ existe : le test tourne après la construction", () => {
		expect(existsSync(DIST)).toBe(true);
	});

	it("chaque chargement, au démarrage ou à la demande, reste sous son plafond", () => {
		const loads = htmlFiles(DIST).flatMap((file) => pageLoads(readFileSync(file, "utf8"), `/${relative(DIST, file)}`, distFiles));
		expect(loads.length).toBeGreaterThan(0);
		expect(overBudget(loads), "Budget de JavaScript dépassé").toEqual([]);
	});
});
