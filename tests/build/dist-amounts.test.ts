import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * Après la construction (`postbuild`) : aucune page de dist/ n'affiche un
 * nombre de quatre chiffres ou plus dont les milliers sont séparés par une
 * espace (ordinaire, insécable ou fine) ou par une apostrophe droite. Le
 * séparateur du site est l'apostrophe typographique (src/lib/format/chf.ts).
 *
 * Seul le texte des pages est examiné, après décodage des entités : ni les
 * balises et leurs attributs (géométrie SVG), ni les scripts — le script
 * d'A1 calcule dans le navigateur, son format est tranché à l'étape 0 de W08.
 * Les exceptions sont listées par la sortie du test, jamais masquées.
 */
const DIST = fileURLToPath(new URL("../../dist/", import.meta.url));

const htmlFiles = (dir: string): string[] =>
	readdirSync(dir).flatMap((entry) => {
		const path = join(dir, entry);
		return statSync(path).isDirectory() ? htmlFiles(path) : path.endsWith(".html") ? [path] : [];
	});

const ENTITIES: Record<string, string> = { "&nbsp;": " ", "&#39;": "'", "&#x27;": "'", "&apos;": "'", "&amp;": "&", "&#8239;": " ", "&#160;": " " };

/** Texte visible d'une page : sans scripts, styles ni balises, entités décodées. */
export const pageText = (html: string): string =>
	html
		.replace(/<script\b[\s\S]*?<\/script>/g, " ")
		.replace(/<style\b[\s\S]*?<\/style>/g, " ")
		.replace(/<[^>]+>/g, " ")
		.replace(/&(?:nbsp|#39|#x27|apos|amp|#8239|#160);/g, (entity) => ENTITIES[entity] ?? entity);

/** Milliers séparés par une espace (U+0020, U+00A0, U+202F) ou une apostrophe droite. */
const BAD_GROUPING = /(?<![\d.,'’])\d{1,3}(?:[   ']\d{3})+(?![\d’])/g;

export const badAmounts = (text: string): string[] => [...text.matchAll(BAD_GROUPING)].map((match) => match[0]);

describe("montants dans les pages construites", () => {
	it("le contrôle reconnaît les séparateurs refusés et accepte l'apostrophe typographique", () => {
		expect(badAmounts("7 373 · 7 373 · 7 373 · 7'373 · 36 864 000")).toEqual(["7 373", "7 373", "7 373", "7'373", "36 864 000"]);
		expect(badAmounts("7’373 · 143 · 2025 à 2034 · 10 ans · 2026 2025")).toEqual([]);
	});

	it("dist/ existe : le test tourne après la construction", () => {
		expect(existsSync(DIST)).toBe(true);
	});

	it("aucun nombre de quatre chiffres ou plus séparé par une espace ou une apostrophe droite", () => {
		const offenders = htmlFiles(DIST).flatMap((file) =>
			badAmounts(pageText(readFileSync(file, "utf8"))).map((amount) => `${relative(DIST, file)} : « ${amount} »`),
		);
		expect(offenders).toEqual([]);
	});
});
