import { describe, expect, it } from "vitest";

import { allCalculators } from "../../src/calculators/catalog";
import { decodeEntities, renderAllPages } from "./site-pages";

/**
 * Méta-descriptions de 155 caractères au plus (checklist, point 16) : au-delà,
 * le moteur de recherche coupe la phrase. Vérifiées sur le rendu de chaque
 * page et sur chaque définition de calculateur, publiée ou non.
 */
const MAX_LENGTH = 155;
const length = (text: string): number => [...text].length;

describe("méta-descriptions", () => {
	it(`chaque page a une méta-description de ${MAX_LENGTH} caractères au plus`, async () => {
		const tooLong: string[] = [];
		for (const { route, html } of await renderAllPages()) {
			const match = html.match(/<meta name="description" content="([^"]*)"/);
			expect(match, `${route} : méta-description absente`).not.toBeNull();
			const description = decodeEntities(match![1]!);
			expect(description.trim().length, `${route} : méta-description vide`).toBeGreaterThan(0);
			if (length(description) > MAX_LENGTH) tooLong.push(`${route} (${length(description)}) : ${description}`);
		}
		expect(tooLong).toEqual([]);
	});

	it(`chaque calculateur déclare une méta-description de ${MAX_LENGTH} caractères au plus`, () => {
		expect(allCalculators.length).toBeGreaterThan(0);
		for (const calculator of allCalculators) {
			expect(length(calculator.metaDescription), `${calculator.id} : ${calculator.metaDescription}`).toBeLessThanOrEqual(MAX_LENGTH);
		}
	});
});
