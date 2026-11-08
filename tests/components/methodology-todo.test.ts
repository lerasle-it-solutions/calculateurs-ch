import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";

import { capitalWithdrawalPublished } from "../../src/calculators/pension/capital-withdrawal-link";

/**
 * Méthodologie et publication d'A4 (demande du mainteneur du 7.11.2026) : les
 * points que trancheront les relevés AFC (coefficient communal de Fribourg,
 * réduction genevoise, impôt paroissial) restent marqués TODO dans le brouillon.
 * Aucun TODO ne peut rester affiché une fois le retrait en capital publié.
 */
const render = async (): Promise<string> => {
	const { default: Page } = await import("../../src/pages/methodologie.astro");
	const container = await AstroContainer.create({ astroConfig: { site: "https://calculateurs.ch" } });
	return container.renderToString(Page, { request: new Request("https://calculateurs.ch/methodologie/") });
};

describe("méthodologie : aucun TODO quand A4 est publié", () => {
	it("si la page du retrait en capital existe, la méthodologie ne contient aucun TODO", async () => {
		const html = await render();
		if (capitalWithdrawalPublished) expect(html, "TODO restant dans /methodologie/ alors qu'A4 est publié").not.toMatch(/TODO/);
		else expect(true).toBe(true);
	});
});
