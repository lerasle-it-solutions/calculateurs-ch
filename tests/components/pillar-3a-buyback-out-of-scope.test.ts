import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";

import { getCantonData, getMunicipalMultipliers } from "../../src/data";
import type { Pillar3aGapsParams } from "../../src/lib/calculations/pension/pillar-3a-buyback";
import type { TaxInput } from "../../src/lib/calculations/tax";
import { taxScalesFromBundle, type TaxScalesBundle } from "../../src/lib/calculations/tax-scales-bundle";
import {
	displayPillar3aBuyback,
	type Pillar3aBuybackDisplayTexts,
	type StatusLink,
} from "../../src/lib/display/pillar-3a-buyback";

/**
 * Un ménage hors périmètre voit le message de couverture partielle et le lien
 * vers la calculette officielle du canton, jamais une économie, pas même nulle.
 * Le test lit les données que la page embarque et applique la même fonction
 * d'affichage que son script.
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

const show = (data: PageData, municipality: string, household: Partial<TaxInput>, gaps: Partial<Pillar3aGapsParams> = {}) => {
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
				...household,
			},
			scales: taxScalesFromBundle(data.bundle, ofsId),
			gaps: {
				buybackYear: data.buybackYear,
				firstGapYear: data.firstGapYear,
				lookbackYears: data.lookbackYears,
				buybackYearCap: cap,
				// Lacune 2025 entière : rien versé
				gapYears: [{ year: 2025, maxContribution: cap, paidContribution: 0, hadAvsIncome: true, alreadyBoughtBack: false }],
				currentYearContributionPaidInFull: true,
				hasAvsIncomeInBuybackYear: true,
				receivedOldAgeBenefit: false,
				...gaps,
			},
		},
		data.texts,
		data.officialCalculators,
	);
};

const officialValais = getCantonData("VS").coverage?.officialCalculator;

const expectCoverageMessage = (shown: ReturnType<typeof show>, text: string) => {
	expect(shown.status?.text).toBe(text);
	expect(officialValais && "url" in officialValais).toBe(true);
	expect(shown.status?.link?.url).toBe(officialValais && "url" in officialValais ? officialValais.url : undefined);
	// Aucune économie chiffrée : ni résultat, ni trace
	expect(shown.value).toBe("—");
	expect(shown.breakdown).toEqual([]);
};

describe("A1, ménage hors périmètre", () => {
	it("couple marié à Sion, lacune 2025 entière : message de couverture et lien officiel, aucune économie chiffrée", async () => {
		const data = await renderPageData();
		expectCoverageMessage(show(data, "Sion (VS)", { maritalStatus: "married", children: 0 }), data.texts.outOfScope.VS!);
	});

	it("rien de rachetable ne masque pas la couverture partielle : couple marié, personne seule avec enfant", async () => {
		const data = await renderPageData();
		const nothing = { currentYearContributionPaidInFull: false };
		expectCoverageMessage(show(data, "Sion (VS)", { maritalStatus: "married" }, nothing), data.texts.outOfScope.VS!);
		expectCoverageMessage(show(data, "Sion (VS)", { children: 1, childrenAges: [8] }, nothing), data.texts.outOfScope.VS!);
	});

	it("commune valaisanne sans indexation relevée : message de la commune, avec ou sans montant rachetable", async () => {
		const data = await renderPageData();
		const commune = (getMunicipalMultipliers()?.multipliers ?? []).find(
			(entry) => entry.canton === "VS" && entry.communalScaleIndexation === undefined,
		)!;
		const text = data.texts.outOfScopeMunicipality[commune.municipality]!;
		expect(text).toContain(commune.municipality);
		expectCoverageMessage(show(data, `${commune.municipality} (VS)`, {}), text);
		expectCoverageMessage(show(data, `${commune.municipality} (VS)`, {}, { receivedOldAgeBenefit: true }), text);
	});

	it("un ménage couvert sans montant rachetable voit une économie nulle, sans message", async () => {
		const data = await renderPageData();
		const shown = show(data, "Sion (VS)", {}, { currentYearContributionPaidInFull: false });
		expect(shown.status).toBeNull();
		expect(shown.value).toMatch(/^(CHF\s0|0\sCHF)$/);
	});
});
