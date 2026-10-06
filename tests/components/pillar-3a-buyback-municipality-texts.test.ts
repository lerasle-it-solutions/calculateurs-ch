import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";

import { pillar3aBuybackTexts } from "../../src/calculators/pension/pillar-3a-buyback";
import { getMunicipalMultipliers } from "../../src/data";
import type { TaxInput } from "../../src/lib/calculations/tax";
import { taxScalesFromBundle, type TaxScalesBundle } from "../../src/lib/calculations/tax-scales-bundle";
import {
	displayPillar3aBuyback,
	type Pillar3aBuybackDisplayTexts,
	type StatusLink,
} from "../../src/lib/display/pillar-3a-buyback";

/**
 * Textes hors périmètre embarqués pour les seules communes non couvertes
 * (W08, étape 0, piste D). Une commune couverte et une commune hors périmètre
 * affichent exactement les mêmes textes qu'avant l'allègement : le texte attendu
 * de Brig-Glis est celui de la page construite sur main (fbcb7e5).
 */
type Sourced = { value: number; sourceId: string };
type PageData = {
	buybackYear: number;
	firstGapYear: Sourced;
	lookbackYears: Sourced;
	smallContributionCap: Sourced;
	bundle: TaxScalesBundle;
	municipalities: Record<string, { ofsId: number; canton: TaxInput["canton"] }>;
	officialCalculators: Record<string, StatusLink>;
	texts: Pillar3aBuybackDisplayTexts;
};

const renderPageData = async (): Promise<PageData> => {
	const { default: Page } = await import("../../src/pages/prevoyance/rachat-3a-retroactif.astro");
	const container = await AstroContainer.create({ astroConfig: { site: "https://calculateurs.ch" } });
	const html = await container.renderToString(Page, {
		request: new Request("https://calculateurs.ch/prevoyance/rachat-3a-retroactif/"),
	});
	const json = html.match(/<script type="application\/json" id="pillar3a-data">([\s\S]*?)<\/script>/)?.[1];
	expect(json, "données de la page absentes").toBeDefined();
	return JSON.parse(json!) as PageData;
};

/** Personne seule, revenus imposables 65 167 / 67 927, lacune 2025 entière. */
const show = (data: PageData, municipality: string) => {
	const { ofsId, canton } = data.municipalities[municipality]!;
	const cap = data.smallContributionCap;
	return displayPillar3aBuyback(
		{
			taxInput: {
				taxYear: data.buybackYear,
				canton,
				municipalityOfsId: ofsId,
				maritalStatus: "single",
				children: 0,
				childrenAges: [],
				denomination: "none",
				federalTaxableIncome: 67_927,
				cantonalTaxableIncome: 65_167,
				taxableWealth: 0,
			},
			scales: taxScalesFromBundle(data.bundle, ofsId),
			gaps: {
				buybackYear: data.buybackYear,
				firstGapYear: data.firstGapYear,
				lookbackYears: data.lookbackYears,
				buybackYearCap: cap,
				gapYears: [{ year: 2025, maxContribution: cap, paidContribution: 0, hadAvsIncome: true, alreadyBoughtBack: false }],
				currentYearContributionPaidInFull: true,
				hasAvsIncomeInBuybackYear: true,
				receivedOldAgeBenefit: false,
			},
		},
		data.texts,
		data.officialCalculators,
	);
};

describe("A1, textes hors périmètre des communes", () => {
	it("seules les communes non couvertes en entier ont un texte, celui d'avant l'allègement", async () => {
		const data = await renderPageData();
		const notCovered = data.bundle.municipalities.flatMap(({ coverage }) =>
			coverage?.municipality === undefined ? [] : [coverage.municipality],
		);
		expect(notCovered.length).toBeGreaterThan(0);
		expect(Object.keys(data.texts.outOfScopeMunicipality).sort()).toEqual([...notCovered].sort());
		for (const name of notCovered) {
			expect(data.texts.outOfScopeMunicipality[name]).toBe(pillar3aBuybackTexts.outOfScopeMunicipality(name));
		}
		// Moins de textes que de communes : Lausanne, couverte, n'en a plus
		expect(notCovered.length).toBeLessThan(Object.keys(data.municipalities).length);
		expect(data.texts.outOfScopeMunicipality.Lausanne).toBeUndefined();
	});

	it("commune hors périmètre : même message qu'avant, lien officiel, aucune économie", async () => {
		const data = await renderPageData();
		const brig = (getMunicipalMultipliers()?.multipliers ?? []).find((entry) => entry.municipality === "Brig-Glis");
		expect(brig?.communalScaleIndexation, "Brig-Glis a désormais une indexation : choisir une autre commune").toBeUndefined();
		const shown = show(data, "Brig-Glis (VS)");
		expect(shown.status?.text).toBe(
			"Ce calculateur ne couvre pas encore la commune de Brig-Glis : une donnée communale nécessaire au calcul n'y est pas relevée. Utilisez la calculette du canton :",
		);
		expect(shown.status?.link).toEqual(data.officialCalculators.VS);
		expect(shown.value).toBe("—");
		expect(shown.breakdown).toEqual([]);
	});

	it("commune couverte : aucun message, l'économie de Lausanne reste 1’842 CHF", async () => {
		const data = await renderPageData();
		const shown = show(data, "Lausanne (VD)");
		expect(shown.status).toBeNull();
		expect(shown.value).toBe("1’842 CHF");
	});
});
