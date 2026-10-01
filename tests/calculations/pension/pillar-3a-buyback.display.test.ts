import { describe, expect, it } from "vitest";

import { getFederalData, getMunicipalMultipliers } from "../../../src/data";
import { getTaxScales } from "../../../src/data/tax-scales";
import {
	computePillar3aBuyback,
	type Pillar3aGapsParams,
} from "../../../src/lib/calculations/pension/pillar-3a-buyback";
import type { TaxInput } from "../../../src/lib/calculations/tax";

/**
 * Trace d'A1 telle qu'affichée : totaux et économie sur les composantes
 * arrondies au franc, impôt sur le revenu seul, lignes sans montant, lacunes
 * refusées, et aucun calcul d'impôt sans montant rachetable.
 */
const pillar3a = getFederalData(2026).pillar3a;
const sourced = (value: { value: number; sourceId: string }) => ({ value: value.value, sourceId: value.sourceId });
const small = sourced(pillar3a.smallContributionCap);

const ofsIdOf = (municipality: string, canton: string): number =>
	(getMunicipalMultipliers()?.multipliers ?? []).find((entry) => entry.municipality === municipality && entry.canton === canton)!.bfsId;

const taxInput = (municipality: string, canton: TaxInput["canton"]): TaxInput => ({
	taxYear: 2026,
	canton,
	municipalityOfsId: ofsIdOf(municipality, canton),
	maritalStatus: "single",
	children: 0,
	childrenAges: [],
	denomination: "none",
	federalTaxableIncome: 67_927,
	cantonalTaxableIncome: 65_167,
	taxableWealth: 0,
});

const gaps = (buybackAmount: number, overrides: Partial<Pillar3aGapsParams> = {}): Pillar3aGapsParams => ({
	buybackYear: 2026,
	firstGapYear: sourced(pillar3a.buyback.firstGapYear),
	lookbackYears: sourced(pillar3a.buyback.lookbackYears),
	buybackYearCap: small,
	gapYears: [{ year: 2025, maxContribution: small, paidContribution: small.value - buybackAmount, hadAvsIncome: true, alreadyBoughtBack: false }],
	currentYearContributionPaidInFull: true,
	hasAvsIncomeInBuybackYear: true,
	receivedOldAgeBenefit: false,
	...overrides,
});

const run = (municipality: string, canton: TaxInput["canton"], buybackAmount: number, overrides: Partial<Pillar3aGapsParams> = {}) => {
	const input = taxInput(municipality, canton);
	return computePillar3aBuyback({ taxInput: input, scales: getTaxScales(input), gaps: gaps(buybackAmount, overrides) });
};

describe("trace d'A1 telle qu'affichée", () => {
	it("Fribourg, rachat de 4 258 : économie de 1 111, somme des lignes arrondies au franc", () => {
		const result = run("Fribourg", "FR", 4_258);
		expect(result.taxSaving).toBe(1_111);
		expect(result.cantonalAndMunicipalSaving + result.federalSaving).toBe(1_111);
	});

	it("Lausanne, rachat de 7 258 : économie de 1 842", () => {
		expect(run("Lausanne", "VD", 7_258).taxSaving).toBe(1_842);
	});

	it("les totaux sont l'impôt sur le revenu, somme des composantes affichées, et renvoient à l'hypothèse 6", () => {
		const { breakdown, taxSaving } = run("Lausanne", "VD", 7_258);
		const totals = breakdown.filter((line) => line.label.startsWith("Impôt sur le revenu (hors impôt sur la fortune)"));
		expect(totals).toHaveLength(2);
		for (const total of totals) {
			expect(Number.isInteger(total.value)).toBe(true);
			expect(total.value).toBe(Object.values(total.operands).reduce((sum, amount) => sum + amount, 0));
			expect(total.assumption).toMatch(/hypothèse 6/);
		}
		expect(totals[0]!.value - totals[1]!.value).toBe(taxSaving);
		expect(breakdown.some((line) => line.label.startsWith("Impôt total"))).toBe(false);
	});

	it("aucune ligne d'impôt sur une fortune à l'assiette nulle", () => {
		const { breakdown } = run("Fribourg", "FR", 4_258);
		expect(breakdown.some((line) => line.label.includes("fortune") && line.formula === "assiette nulle")).toBe(false);
	});

	it("les lignes sans montant sont marquées : limite d'âge, barème fédéral applicable", () => {
		const { breakdown } = run("Lausanne", "VD", 7_258);
		for (const label of ["Limite d'âge non examinée", "Barème de l'impôt fédéral direct applicable"]) {
			const line = breakdown.find((entry) => entry.label === label);
			expect(line, label).toBeDefined();
			expect(line!.noAmount).toBe(true);
		}
	});

	it("une lacune refusée porte la mention « non rachetable »", () => {
		const { breakdown } = run("Lausanne", "VD", 7_258, {
			gapYears: [
				{ year: 2024, maxContribution: small, paidContribution: 0, hadAvsIncome: true, alreadyBoughtBack: false },
				{ year: 2025, maxContribution: small, paidContribution: 0, hadAvsIncome: true, alreadyBoughtBack: false },
			],
		});
		expect(breakdown.find((line) => line.label === "Lacune 2024")!.qualifier).toBe("non rachetable");
		expect(breakdown.find((line) => line.label === "Lacune 2025")!.qualifier).toBeUndefined();
	});

	it("sans montant rachetable, l'impôt n'est pas calculé : motifs de refus et économie nulle", () => {
		const result = run("Lausanne", "VD", 7_258, { currentYearContributionPaidInFull: false });
		expect(result.buybackAmount).toBe(0);
		expect(result.taxSaving).toBe(0);
		expect(result.breakdown.some((line) => line.label.startsWith("Impôt"))).toBe(false);
		expect(result.breakdown.find((line) => line.label === "Lacune 2025")!.assumption).toMatch(/pas versée intégralement/);
		expect(result.breakdown.at(-1)).toMatchObject({ label: "Économie d'impôt", value: 0 });
	});

	it("sans montant rachetable, un ménage hors du périmètre du moteur n'est pas refusé par le moteur", () => {
		const input = { ...taxInput("Sion", "VS"), maritalStatus: "married" as const };
		const result = computePillar3aBuyback({ taxInput: input, scales: getTaxScales(input), gaps: gaps(7_258, { receivedOldAgeBenefit: true }) });
		expect(result.taxSaving).toBe(0);
	});
});
