import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, posix, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * Après la construction (`postbuild`, donc aussi sur Cloudflare) : budget de
 * JavaScript de chaque page de dist/ (CLAUDE.md § 3, checklist point 17).
 *
 * - Au démarrage : scripts en ligne, scripts de la page et morceaux partagés
 *   qu'ils importent statiquement, de proche en proche, chacun compté une fois.
 *   Minifiés, non compressés : la taille des fichiers de dist/. Moins de
 *   30 000 octets par page.
 * - À la demande (`import()` déclenché par une action de l'utilisateur) : chaque
 *   script chargé, avec ses propres imports statiques qui ne sont pas déjà
 *   chargés au démarrage, a son propre budget de 30 000 octets. Le code qui le
 *   charge compte dans la page, puisqu'il fait partie de ses scripts.
 *
 * Le message d'échec donne la page, le total et le détail par fichier.
 */
const DIST = fileURLToPath(new URL("../../dist/", import.meta.url));
const BUDGET_BYTES = 30_000;

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
type Load = { label: string; parts: Part[]; total: number };

const read = (url: string): string => readFileSync(join(DIST, url), "utf8");

/** Fichiers chargés par `entries` et leurs imports statiques, hors `loaded` ; complète `loaded`. */
const closure = (entries: string[], loaded: Set<string>): string[] => {
	const added: string[] = [];
	const visit = (url: string) => {
		if (loaded.has(url)) return;
		loaded.add(url);
		added.push(url);
		for (const target of staticImports(read(url))) visit(posix.join(posix.dirname(url), target));
	};
	entries.forEach(visit);
	return added;
};

const load = (label: string, inline: Part[], files: string[]): Load => {
	const parts = [...inline, ...files.map((url) => ({ name: url, bytes: statSync(join(DIST, url)).size }))];
	return { label, parts, total: parts.reduce((sum, part) => sum + part.bytes, 0) };
};

/** Chargement au démarrage d'une page, puis chaque chargement à la demande qu'elle peut déclencher. */
const pageLoads = (file: string): Load[] => {
	const html = readFileSync(file, "utf8");
	const page = `/${relative(DIST, file)}`;
	const inline: Part[] = [];
	const sources: string[] = [];
	for (const [, attributes, body] of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
		if (/type="application\/(?:ld\+)?json"/.test(attributes!)) continue;
		const src = attributes!.match(/\ssrc="([^"]+)"/)?.[1];
		if (src) sources.push(src);
		else inline.push({ name: `script en ligne n° ${inline.length + 1}`, bytes: Buffer.byteLength(body!) });
	}
	const loaded = new Set<string>();
	const startup = closure(sources, loaded);
	const loads = [load(`${page} (démarrage)`, inline, startup)];

	const seen = new Set<string>();
	const pending = [...startup];
	while (pending.length > 0) {
		const url = pending.shift()!;
		for (const target of dynamicImports(read(url))) {
			const chunk = posix.join(posix.dirname(url), target);
			if (seen.has(chunk) || loaded.has(chunk)) continue;
			seen.add(chunk);
			// Ce qui est déjà chargé au démarrage ne se recharge pas
			const files = closure([chunk], new Set(loaded));
			loads.push(load(`${page} (à la demande : ${chunk})`, [], files));
			pending.push(...files);
		}
	}
	return loads;
};

const describeLoad = ({ label, parts, total }: Load): string =>
	`${label} : ${total} octets (${parts.map((part) => `${part.name} ${part.bytes}`).join(" + ") || "aucun script"})`;

describe("budget de JavaScript des pages construites", () => {
	it("le contrôle suit les imports statiques et dynamiques d'un module minifié", () => {
		const code = `import{n as e,t}from"./chf.CI.js";import"./side.js";export{a}from"../x/y.js";const r=()=>import("./lazy.js");const s="from './not-an-import.js'";`;
		expect(staticImports(code)).toEqual(["./chf.CI.js", "./side.js", "../x/y.js"]);
		expect(dynamicImports(code)).toEqual(["./lazy.js"]);
	});

	it("dist/ existe : le test tourne après la construction", () => {
		expect(existsSync(DIST)).toBe(true);
	});

	it(`chaque chargement, au démarrage ou à la demande, reste sous ${BUDGET_BYTES} octets`, () => {
		const loads = htmlFiles(DIST).flatMap(pageLoads);
		expect(loads.length).toBeGreaterThan(0);
		const overBudget = loads.filter((entry) => entry.total >= BUDGET_BYTES).map(describeLoad);
		expect(overBudget, `Budget de ${BUDGET_BYTES} octets dépassé`).toEqual([]);
	});
});
