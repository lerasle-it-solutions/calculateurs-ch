import { existsSync, readFileSync } from "node:fs";
import { relative } from "node:path";

import { describe, expect, it } from "vitest";

import { DIST, htmlFiles, pageText } from "./dist-pages";

/**
 * Après la construction (`postbuild`) : aucune page de dist/ ne publie une note
 * de rédaction. Une note s'ouvre par un crochet suivi de « Conserver »,
 * « À REMPLIR », « TODO » ou « TBD » ; seul le texte visible est examiné.
 * Origine : la politique de confidentialité a publié « [Conserver uniquement la
 * phrase applicable…] » (16.10.2026).
 */
const PLACEHOLDER = /\[\s*(?:Conserver|À REMPLIR|TODO|TBD)\b[^\]]{0,60}/giu;

export const editorialPlaceholders = (text: string): string[] =>
	[...text.matchAll(PLACEHOLDER)].map((match) => match[0].replace(/\s+/g, " "));

describe("notes de rédaction dans les pages construites", () => {
	it("le contrôle reconnaît les quatre marques et ignore les crochets ordinaires", () => {
		expect(editorialPlaceholders("x [Conserver la phrase] y [À REMPLIR] [TODO: date] [ tbd ]")).toHaveLength(4);
		expect(editorialPlaceholders("[1] voir note [art. 7a] [Conservation des données]")).toEqual([]);
	});

	it("dist/ existe : le test tourne après la construction", () => {
		expect(existsSync(DIST)).toBe(true);
	});

	it("aucune page ne contient de note de rédaction dans son texte visible", () => {
		const offenders = htmlFiles(DIST).flatMap((file) =>
			editorialPlaceholders(pageText(readFileSync(file, "utf8"))).map((note) => `${relative(DIST, file)} : « ${note} »`),
		);
		expect(offenders).toEqual([]);
	});
});
