import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { getCollection } from "astro:content";
import { describe, expect, it } from "vitest";

import { allCalculators, isPublished } from "../../src/calculators/catalog";
import { sourceRegistry } from "../../src/data";

/**
 * Garde-fous des articles MDX (src/content/articles/). Le contenu ne peut
 * contenir que : du texte Markdown ; des expressions {nom} dont le nom est
 * exporté, sous forme de chaîne, par le module de valeurs de l'article
 * (src/lib/articles/{slug}.ts) ; des composants importés depuis
 * src/components/articles/. Ni export, ni fonction, ni opérateur, ni
 * expression calculée, ni balise HTML : toute logique vit dans le module de
 * valeurs, qui passe par l'accesseur strict des données.
 */
const ARTICLES_DIR = fileURLToPath(new URL("../../src/content/articles/", import.meta.url));
const VALUES_DIR = fileURLToPath(new URL("../../src/lib/articles/", import.meta.url));
const COMPONENTS_DIR = fileURLToPath(new URL("../../src/components/articles/", import.meta.url));

const valueModules = import.meta.glob<Record<string, unknown>>("../../src/lib/articles/*.ts");

const mdxFiles = existsSync(ARTICLES_DIR) ? readdirSync(ARTICLES_DIR).filter((file) => file.endsWith(".mdx")) : [];

/** Corps de l'article, sans le frontmatter, avec ses numéros de ligne d'origine. */
const bodyLines = (source: string): { line: number; text: string }[] => {
	const lines = source.split("\n");
	let start = 0;
	if (lines[0] === "---") start = lines.indexOf("---", 1) + 1;
	return lines.slice(start).map((text, index) => ({ line: start + index + 1, text }));
};

const IMPORT = /^import\s+(?:\{([^}]*)\}|([A-Z]\w*))\s+from\s+"([^"]+)";?\s*$/;

/** Violations du contenu d'un fichier MDX. */
export async function mdxViolations(file: string, source: string): Promise<string[]> {
	const slug = basename(file, ".mdx");
	const valuesPath = join(VALUES_DIR, `${slug}.ts`);
	const violations: string[] = [];
	const values = new Set<string>();
	const components = new Set<string>();

	const lines = bodyLines(source);
	for (const { line, text } of lines) {
		if (/^\s*export\b/.test(text)) violations.push(`ligne ${line} : export interdit`);
		if (!/^\s*import\b/.test(text)) continue;
		const match = text.match(IMPORT);
		if (!match) {
			violations.push(`ligne ${line} : import non reconnu`);
			continue;
		}
		const [, named, component, from] = match;
		const target = resolve(dirname(join(ARTICLES_DIR, file)), from!);
		if (named !== undefined) {
			if (target !== valuesPath && `${target}.ts` !== valuesPath) {
				violations.push(`ligne ${line} : valeurs importées d'ailleurs que src/lib/articles/${slug}.ts`);
				continue;
			}
			for (const name of named.split(",").map((part) => part.trim()).filter(Boolean)) values.add(name);
		} else if (component !== undefined) {
			if (!target.startsWith(COMPONENTS_DIR) || !target.endsWith(".astro")) {
				violations.push(`ligne ${line} : composant importé d'ailleurs que src/components/articles/`);
				continue;
			}
			components.add(component);
		}
	}

	// Les noms importés doivent être des chaînes exportées par le module de valeurs
	const loader = valueModules[`../../src/lib/articles/${slug}.ts`];
	if (values.size > 0 && loader === undefined) violations.push(`module de valeurs src/lib/articles/${slug}.ts absent`);
	if (loader !== undefined) {
		const module = await loader();
		for (const name of values) {
			if (typeof module[name] !== "string") violations.push(`{${name}} : pas une chaîne exportée par src/lib/articles/${slug}.ts`);
		}
	}

	for (const { line, text } of lines) {
		if (/^\s*import\b/.test(text)) continue;
		for (const [, expression] of text.matchAll(/\{([^{}]*)\}/g)) {
			const name = expression!.trim();
			if (!/^[A-Za-z_$][\w$]*$/.test(name)) violations.push(`ligne ${line} : expression interdite {${expression}}`);
			else if (!values.has(name)) violations.push(`ligne ${line} : {${name}} n'est pas importé du module de valeurs`);
		}
		if (/[{}]/.test(text.replace(/\{[^{}]*\}/g, ""))) violations.push(`ligne ${line} : accolade non appariée`);
		for (const [, tag, attributes] of text.matchAll(/<\/?([A-Za-z][\w.]*)([^>]*)>/g)) {
			if (!/^[A-Z]/.test(tag!)) violations.push(`ligne ${line} : balise HTML <${tag}> interdite`);
			else if (!components.has(tag!)) violations.push(`ligne ${line} : composant <${tag}> non importé de src/components/articles/`);
			const rest = attributes!.replace(/\s+[a-zA-Z-]+="[^"]*"/g, "").replace(/\s*\/$/, "").trim();
			if (rest !== "") violations.push(`ligne ${line} : attribut interdit sur <${tag}> : ${rest}`);
		}
	}
	return violations;
}

describe("articles MDX : contenu", () => {
	for (const file of mdxFiles) {
		it(`${file} ne contient que du texte, des valeurs du module et des composants d'article`, async () => {
			expect(await mdxViolations(file, readFileSync(join(ARTICLES_DIR, file), "utf8"))).toEqual([]);
		});
	}

	it("le garde-fou refuse export, expression calculée, balise HTML, valeur ou composant étrangers", async () => {
		const sample = [
			"---",
			"title: Exemple",
			"---",
			'import { smallCap2026, formatAmount } from "../../lib/articles/rachat-3a-retroactif";',
			'import Figure from "../../components/layout/Section.astro";',
			"export const x = 1;",
			"Texte {smallCap2026} et {smallCap2026 * 2} puis {inconnu} et {formatAmount}.",
			'<div>html</div> <Figure title={x} />',
		].join("\n");
		const violations = (await mdxViolations("rachat-3a-retroactif.mdx", sample)).join("\n");
		expect(violations).toMatch(/export interdit/);
		expect(violations).toMatch(/expression interdite \{smallCap2026 \* 2\}/);
		expect(violations).toMatch(/\{inconnu\} n'est pas importé/);
		expect(violations).toMatch(/\{formatAmount\} : pas une chaîne/);
		expect(violations).toMatch(/balise HTML <div> interdite/);
		expect(violations).toMatch(/composant importé d'ailleurs que src\/components\/articles\//);
		expect(violations).toMatch(/attribut interdit sur <Figure>/);
	});
});

describe("articles MDX : fiche", () => {
	it("chaque article lie des calculateurs publiés et cite des sources connues du registre", async () => {
		const ids = new Set(allCalculators.map((calculator) => calculator.id));
		for (const entry of await getCollection("articles")) {
			for (const id of entry.data.relatedCalculators) {
				expect(ids.has(id), `${entry.id} : calculateur ${id} inconnu`).toBe(true);
				expect(isPublished(allCalculators.find((calculator) => calculator.id === id)!), `${entry.id} : ${id} non publié`).toBe(true);
			}
			for (const source of entry.data.sources) {
				if ("sourceId" in source) expect(sourceRegistry().has(source.sourceId), `${entry.id} : ${source.sourceId}`).toBe(true);
			}
		}
	});
});
