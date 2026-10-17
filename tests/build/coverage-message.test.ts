import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * Après la construction (`postbuild`), sur la page d'A1. Principe, reformulé avec
 * l'accord du mainteneur le 17.10.2026 (docs/design-system.md § 4.3) : un message
 * qui remplace le résultat (hors périmètre, donnée manquante, saisie à corriger,
 * condition non remplie) s'affiche dans la carte, `<output data-result-card>`, à
 * la place du montant, avec une espace entre le texte et le lien, et sa mention
 * courte dans la barre mobile, liée à la carte. Il peut se répéter sous le champ
 * qui le déclenche : limite de couverture sous le champ commune, erreur préfixée
 * « Erreur : » sous le champ concerné ; jamais ailleurs, et jamais seulement là.
 */
const DIST = fileURLToPath(new URL("../../dist/", import.meta.url));
const html = (): string => readFileSync(join(DIST, "prevoyance/rachat-3a-retroactif/index.html"), "utf8");

/** Contenu de l'élément ouvert à `start`, balise fermante comprise, en comptant les imbrications de `tag`. */
const elementAt = (page: string, start: number, tag: string): string => {
	const pattern = new RegExp(`<${tag}\\b|</${tag}>`, "g");
	pattern.lastIndex = start;
	let depth = 0;
	for (let match = pattern.exec(page); match; match = pattern.exec(page)) {
		depth += match[0].startsWith("</") ? -1 : 1;
		if (depth === 0) return page.slice(start, match.index + match[0].length);
	}
	throw new Error(`<${tag}> non fermé`);
};

describe("A1 : message hors périmètre dans le cadre de résultat", () => {
	it("le cadre de résultat contient l'emplacement du message, son texte et son lien, séparés par une espace", () => {
		const page = html();
		const start = page.search(/<output\b[^>]*data-result-card/);
		expect(start, "cadre de résultat absent").toBeGreaterThanOrEqual(0);
		const card = elementAt(page, start, "output");
		expect(card).toMatch(/<span\b[^>]*data-result-status[^>]*\bhidden/);
		expect(card).toMatch(/<span\b[^>]*data-status-text[^>]*><\/span> <a\b[^>]*data-status-link/);
		const outputId = card.match(/<output\b[^>]*\bid="([^"]+)"/)?.[1];
		expect(outputId).toBeDefined();

		// La barre mobile : mention courte, liée au cadre de résultat
		const barStart = page.search(/<div\b[^>]*data-result-card/);
		expect(barStart, "barre de résultat mobile absente").toBeGreaterThanOrEqual(0);
		const bar = elementAt(page, barStart, "div");
		expect(bar).toMatch(new RegExp(`<a\\b[^>]*data-result-status[^>]*href="#${outputId}"|<a\\b[^>]*href="#${outputId}"[^>]*data-result-status`));
	});

	it("hors de la carte et de la barre mobile, un message ne se répète que sous le champ qui le déclenche", () => {
		const page = html();
		const card = elementAt(page, page.search(/<output\b[^>]*data-result-card/), "output");
		const bar = elementAt(page, page.search(/<div\b[^>]*data-result-card/), "div");
		// Éléments seulement : les scripts nomment ces attributs dans leurs sélecteurs
		const rest = page
			.replace(card, "")
			.replace(bar, "")
			.replace(/<script\b[\s\S]*?<\/script>/g, "");
		expect(rest).not.toMatch(/data-status-text|data-status-link|data-result-status|id="pillar3a-status"/);

		// Limite de couverture : sous le champ commune seulement, annoncée par son aria-describedby
		const municipality = rest.match(/<input\b[^>]*\bname="municipality"[^>]*>/)![0];
		const municipalityId = municipality.match(/\sid="([^"]+)"/)![1]!;
		const coverage = [...rest.matchAll(/<div\b[^>]*\sdata-coverage-message[^>]*>/g)].map((match) => match[0]);
		expect(coverage).toHaveLength(1);
		expect(coverage[0]).toContain(`id="${municipalityId}-coverage"`);

		// Erreur de saisie : sous un champ numérique, à l'identifiant de ce champ, préfixée « Erreur : »
		const numberIds = new Set([...rest.matchAll(/<input\b[^>]*\sdata-number[^>]*>/g)].map((match) => match[0].match(/\sid="([^"]+)"/)![1]!));
		const errors = [...rest.matchAll(/<p\b[^>]*\sid="([^"]+)-error"[^>]*\sdata-field-error[^>]*>([\s\S]*?)<\/p>/g)];
		expect(errors.length).toBeGreaterThan(0);
		expect(errors.length).toBe([...rest.matchAll(/\sdata-field-error[\s>]/g)].length);
		for (const [, id, inner] of errors) {
			expect(numberIds.has(id!), `${id}-error sans champ numérique`).toBe(true);
			expect(inner).toMatch(/^\s*Erreur :/);
		}
	});

	it("la page embarque les mentions courtes de la barre mobile", () => {
		const json = html().match(/<script type="application\/json" id="pillar3a-data">([\s\S]*?)<\/script>/)?.[1];
		const texts = (JSON.parse(json!) as { texts: Record<string, unknown> }).texts;
		expect(texts.outOfScopeShort).toBe("Hors périmètre, voir le message");
		expect(typeof texts.missingDataShort).toBe("string");
		expect(typeof texts.inputShort).toBe("string");
	});
});
