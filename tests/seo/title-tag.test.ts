import { describe, expect, it } from "vitest";

import { allCalculators, isPublished } from "../../src/calculators/catalog";
import { renderAllPages } from "./site-pages";

/**
 * Balise <title> d'un calculateur publié : l'année de calcul, lue dans la
 * définition, et le bénéfice sous forme de question (« Rachat LPP 2026 :
 * combien d'impôt économisez-vous ? »). La méta-description reste.
 */
const titleOf = (html: string) => html.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/&#39;|&apos;/g, "'");

describe.each(allCalculators.filter(isPublished).map((definition) => ({ id: definition.id, definition })))("$id : balise <title>", ({ definition }) => {
	it("porte l'année de calcul et une question, en 65 caractères au plus", async () => {
		const page = (await renderAllPages()).find((entry) => entry.route === definition.slug);
		const title = titleOf(page!.html);
		expect(title).toBe(definition.metaTitle);
		expect(title).toContain(String(definition.scope.referenceYear));
		expect(title).toMatch(/\?$/);
		expect(title!.length).toBeLessThanOrEqual(65);
		expect(page!.html).toContain(`<meta name="description" content="`);
	});
});
