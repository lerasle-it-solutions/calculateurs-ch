import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * Après la construction (`postbuild`) : sur la page d'A1, le message de
 * couverture (et tout autre message qui remplace le résultat) se trouve dans le
 * cadre de résultat, `<output data-result-card>`, à la place du montant, avec
 * une espace entre le texte et le lien ; la barre de résultat mobile porte la
 * mention courte, liée à ce cadre. Aucun emplacement de message ailleurs dans la
 * page, où le visiteur ne le verrait pas.
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

	it("aucun emplacement de message hors du cadre de résultat et de la barre mobile", () => {
		const page = html();
		const card = elementAt(page, page.search(/<output\b[^>]*data-result-card/), "output");
		const bar = elementAt(page, page.search(/<div\b[^>]*data-result-card/), "div");
		// Éléments seulement : les scripts nomment ces attributs dans leurs sélecteurs
		const rest = page
			.replace(card, "")
			.replace(bar, "")
			.replace(/<script\b[\s\S]*?<\/script>/g, "");
		expect(rest).not.toMatch(/data-status-text|data-status-link|data-result-status|id="pillar3a-status"/);
	});

	it("la page embarque les mentions courtes de la barre mobile", () => {
		const json = html().match(/<script type="application\/json" id="pillar3a-data">([\s\S]*?)<\/script>/)?.[1];
		const texts = (JSON.parse(json!) as { texts: Record<string, unknown> }).texts;
		expect(texts.outOfScopeShort).toBe("Hors périmètre, voir le message");
		expect(typeof texts.missingDataShort).toBe("string");
		expect(typeof texts.inputShort).toBe("string");
	});
});
