import { describe, expect, it } from "vitest";

import { getFederalData, getMunicipalMultipliers } from "../../../src/data";
import { getTaxScales } from "../../../src/data/tax-scales";
import { computePillar3aBuyback } from "../../../src/lib/calculations/pension/pillar-3a-buyback";
import type { TaxInput } from "../../../src/lib/calculations/tax";

/**
 * Cas limites d'A1 (checklist, point 6), au chef-lieu de chaque canton : un
 * revenu imposable nul et un revenu extrême. Aucune valeur attendue n'est
 * affirmée, seulement des bornes : l'économie est un nombre entier de francs,
 * nulle sans impôt, et jamais supérieure au rachat.
 */
const pillar3a = getFederalData(2026).pillar3a;
const sourced = (value: { value: number; sourceId: string }) => ({ value: value.value, sourceId: value.sourceId });
const cap = sourced(pillar3a.smallContributionCap);

const CAPITALS = [
	["Lausanne", "VD"],
	["Genève", "GE"],
	["Sion", "VS"],
	["Fribourg", "FR"],
	["Neuchâtel", "NE"],
	["Delémont", "JU"],
] as const;

const run = (municipality: string, canton: TaxInput["canton"], income: number) => {
	const entry = (getMunicipalMultipliers()?.multipliers ?? []).find((m) => m.municipality === municipality && m.canton === canton);
	expect(entry, `${municipality} absente des coefficients communaux`).toBeDefined();
	const taxInput: TaxInput = {
		taxYear: 2026,
		canton,
		municipalityOfsId: entry!.bfsId,
		maritalStatus: "single",
		children: 0,
		childrenAges: [],
		denomination: "none",
		federalTaxableIncome: income,
		cantonalTaxableIncome: income,
		taxableWealth: 0,
	};
	return computePillar3aBuyback({
		taxInput,
		scales: getTaxScales(taxInput),
		gaps: {
			buybackYear: 2026,
			firstGapYear: sourced(pillar3a.buyback.firstGapYear),
			lookbackYears: sourced(pillar3a.buyback.lookbackYears),
			buybackYearCap: cap,
			gapYears: [{ year: 2025, maxContribution: cap, paidContribution: 0, hadAvsIncome: true, alreadyBoughtBack: false }],
			currentYearContributionPaidInFull: true,
			hasAvsIncomeInBuybackYear: true,
			receivedOldAgeBenefit: false,
		},
	});
};

describe("A1, cas limites", () => {
	for (const [municipality, canton] of CAPITALS) {
		it(`${municipality} : revenu imposable nul, économie nulle`, () => {
			expect(run(municipality, canton, 0).taxSaving).toBe(0);
		});

		it(`${municipality} : revenu imposable de 10 millions, économie entière, positive, inférieure au rachat`, () => {
			const result = run(municipality, canton, 10_000_000);
			expect(Number.isInteger(result.taxSaving)).toBe(true);
			expect(result.taxSaving).toBeGreaterThan(0);
			expect(result.taxSaving).toBeLessThan(result.buybackAmount);
		});
	}
});
