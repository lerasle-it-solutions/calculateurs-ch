import { afterEach, describe, expect, it, vi } from "vitest";


/**
 * Annonce de l'année de calcul sur A1 : rendue à la construction, au-dessus
 * du formulaire, quand l'année civile n'est pas encore relevée. L'horloge est
 * figée, puis la page est rechargée : l'année se résout à l'import.
 */
const renderA1At = async (iso: string): Promise<string> => {
	vi.useFakeTimers({ toFake: ["Date"] });
	vi.setSystemTime(new Date(iso));
	vi.resetModules();
	const { experimental_AstroContainer: AstroContainer } = await import("astro/container");
	const { default: Page } = await import("../../src/pages/prevoyance/rachat-3a-retroactif.astro");
	const container = await AstroContainer.create({ astroConfig: { site: "https://calculateurs.ch" } });
	return container.renderToString(Page, {
		request: new Request("https://calculateurs.ch/prevoyance/rachat-3a-retroactif/"),
	});
};

afterEach(() => {
	vi.useRealTimers();
});

describe("annonce de l'année de calcul sur A1", () => {
	it("le 02.01.2027, la page annonce le calcul sur les barèmes 2026, au-dessus du formulaire", async () => {
		const html = await renderA1At("2027-01-02T09:00:00+01:00");
		const notice = "Ce calcul porte sur un rachat effectué en 2026 : les barèmes de 2027 ne sont pas encore relevés.";
		expect(html).toContain(notice);
		expect(html.indexOf(notice)).toBeLessThan(html.indexOf("<form"));
	});

	it("le 04.10.2026, aucune annonce", async () => {
		const html = await renderA1At("2026-10-04T12:00:00+02:00");
		expect(html).not.toContain("ne sont pas encore relevés");
	});
});
