import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";

import CalculationBreakdown from "../../src/components/ui/CalculationBreakdown.astro";
import { fr } from "../../src/i18n/fr";

/**
 * La trace ne s'affiche jamais en tableau vide (docs/design-system.md § 4.4) :
 * sans ligne, une phrase la remplace. Origine : hors périmètre, la trace
 * gardait ses en-têtes et disait « Renseignez les champs… » alors que tout
 * était saisi (vérification UX du 17.10.2026).
 */
/** Balise ouvrante de l'élément qui porte `attribute`, et si elle est masquée. */
const isHidden = (html: string, attribute: string): boolean => {
	const tag = html.match(new RegExp(`<[a-z]+\\b[^>]*\\s${attribute}\\b[^>]*>`))?.[0];
	if (!tag) throw new Error(`${attribute} absent`);
	return /\shidden\b/.test(tag);
};

const render = async (props: Record<string, unknown>): Promise<string> => {
	const container = await AstroContainer.create();
	return container.renderToString(CalculationBreakdown, { props });
};

describe("CalculationBreakdown", () => {
	it("sans ligne : la phrase est visible, le tableau masqué", async () => {
		const html = await render({ rows: [] });
		expect(isHidden(html, "data-breakdown-empty")).toBe(false);
		expect(isHidden(html, "data-breakdown-table")).toBe(true);
		expect(html).toContain(fr.breakdown.empty.split("'")[0]);
	});

	it("avec des lignes : le tableau est visible, la phrase masquée", async () => {
		const html = await render({ rows: [{ label: "Revenu imposable", amount: "70’000 CHF" }] });
		expect(isHidden(html, "data-breakdown-empty")).toBe(true);
		expect(isHidden(html, "data-breakdown-table")).toBe(false);
		expect(html).toContain("Revenu imposable");
	});
});
