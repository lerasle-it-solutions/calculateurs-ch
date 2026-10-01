import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";

import CalculatorShell from "../../src/components/calculator/CalculatorShell.astro";
import { pillar3aBuyback } from "../../src/calculators/pension/pillar-3a-buyback";
import { getMunicipalMultipliers } from "../../src/data";

/**
 * Le périmètre est annoncé avant la saisie (P5) : au Valais, le bandeau nomme
 * les communes couvertes, déduites des données (indexation communale relevée).
 */
const visibleText = (html: string): string =>
	html
		.replace(/<[^>]*>/g, "")
		.replace(/&#39;/g, "'")
		.replace(/\s+/g, " ")
		.trim();

describe("bandeau de périmètre d'A1, Valais", () => {
	it("le bandeau, affiché avant le formulaire, nomme les communes valaisannes couvertes", async () => {
		const covered = (getMunicipalMultipliers()?.multipliers ?? [])
			.filter((entry) => entry.canton === "VS" && entry.communalScaleIndexation !== undefined)
			.map((entry) => entry.municipality);
		expect(covered.length).toBeGreaterThan(0);

		const container = await AstroContainer.create();
		const html = await container.renderToString(CalculatorShell, {
			props: { definition: pillar3aBuyback, intro: "", resultLabel: "", verifiedOn: "2026-01-01" },
		});
		const asideStart = html.indexOf("<aside");
		const asideEnd = html.indexOf("</aside>");
		expect(asideStart).toBeGreaterThanOrEqual(0);
		expect(asideEnd).toBeLessThan(html.indexOf("<form"));

		const notice = visibleText(html.slice(asideStart, asideEnd));
		expect(notice).toContain("Valais");
		for (const name of covered) expect(notice, `${name} absente du bandeau`).toContain(name);
		expect(notice).toContain(covered.length > 1 ? "communes couvertes" : "seule commune couverte");
		expect(pillar3aBuyback.scope.notCovered).toHaveLength(6);
	});
});
