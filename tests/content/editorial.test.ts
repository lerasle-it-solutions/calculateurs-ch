import { existsSync, readFileSync } from "node:fs";
import { relative } from "node:path";

import { describe, expect, it } from "vitest";

import { blockViolations, parseForbiddenPhrases } from "../../src/lib/build/editorial-rules";
import { visibleBlocks } from "../../src/lib/build/visible-text";
import { DIST, htmlFiles } from "../build/dist-pages";

/**
 * Après la construction (`postbuild`) : le texte visible de dist/ respecte la
 * charte rédactionnelle (docs/editorial-style.md § 6.1). Aucun tiret cadratin
 * ni demi-cadratin, aucun trait d'union isolé entre deux espaces, aucun point
 * d'exclamation, aucune tournure de la table du § 4.3, lue dans la charte.
 */
const CHARTER = readFileSync(new URL("../../docs/editorial-style.md", import.meta.url), "utf8");
const FORBIDDEN = parseForbiddenPhrases(CHARTER);

/**
 * Pages pas encore relues (réécriture d'octobre 2026, une famille par commit).
 * La liste se vide à mesure ; toute page qui n'y figure pas est contrôlée.
 */
const PENDING_PAGES = new Set([
	"404.html",
	"demo-calculateur/index.html",
	"demo-ui/index.html",
	"donnees/index.html",
	"mentions-legales/index.html",
	"methodologie/index.html",
	"politique-de-confidentialite/index.html",
	"prevoyance/guides/rachat-3a-retroactif/index.html",
]);

const violations = (html: string) =>
	visibleBlocks(html).flatMap((block) => blockViolations(block.text, FORBIDDEN).map((found) => `${found.rule} : « ${found.excerpt} »`));

describe("charte rédactionnelle dans les pages construites", () => {
	it("la table des tournures interdites est lue dans la charte", () => {
		expect(FORBIDDEN.length).toBeGreaterThanOrEqual(15);
		expect(FORBIDDEN.map((entry) => entry.phrase)).toContain("« N’hésitez pas »");
	});

	it("le contrôle reconnaît chaque faute et laisse passer la typographie permise", () => {
		const rules = (text: string) => blockViolations(text, FORBIDDEN).map((found) => found.rule);
		expect(rules("Un calcul — exact")).toEqual(["tiret cadratin (U+2014)"]);
		expect(rules("de 2025 – 2034")).toEqual(["tiret demi-cadratin (U+2013)"]);
		expect(rules("70’000 - 7’258")).toEqual(["trait d'union isolé entre deux espaces"]);
		expect(rules("Calculez !")).toEqual(["point d'exclamation"]);
		expect(rules("En résumé, rien.")).toEqual(["tournure interdite « En résumé »"]);
		expect(rules("Le taux. En effet, il baisse.")).toEqual(["tournure interdite « En effet » en tête de phrase"]);
		expect(rules("Ce n’est pas un taux, c’est une différence.")).toHaveLength(1);
		expect(rules("tout en bas, tout en haut")).toHaveLength(1);
		expect(rules("Un point essentiel.")).toHaveLength(1);
		expect(rules("Brig-Glis, peut-être, 70’000 − 7’258, l’essentiel ? Non.")).toHaveLength(1);
		expect(rules("dont il assume pour l’essentiel l’entretien ; un effet tout en nuance")).toEqual([]);
		expect(rules("Attention : la déduction se perd. Erreur : indiquez un montant.")).toEqual([]);
	});

	it("dist/ existe : le test tourne après la construction", () => {
		expect(existsSync(DIST)).toBe(true);
	});

	it("chaque page en attente de relecture existe encore", () => {
		const pages = new Set(htmlFiles(DIST).map((file) => relative(DIST, file)));
		expect([...PENDING_PAGES].filter((page) => !pages.has(page))).toEqual([]);
	});

	it("aucune page relue ne contient de tiret, de point d'exclamation ni de tournure interdite", () => {
		const offenders = htmlFiles(DIST)
			.filter((file) => !PENDING_PAGES.has(relative(DIST, file)))
			.flatMap((file) => violations(readFileSync(file, "utf8")).map((found) => `${relative(DIST, file)} → ${found}`));
		expect(offenders).toEqual([]);
	});
});
