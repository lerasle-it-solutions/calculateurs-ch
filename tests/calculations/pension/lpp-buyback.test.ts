import { describe, expect, it } from "vitest";

import { getFederalData, getMunicipalMultipliers, sourceRegistry } from "../../../src/data";
import { getTaxScales } from "../../../src/data/tax-scales";
import {
	computeLppBuyback,
	type LppBuybackParams,
	SCENARIO_TRANCHE_COUNTS,
	splitIntoTranches,
} from "../../../src/lib/calculations/pension/lpp-buyback";
import * as labels from "../../../src/lib/calculations/pension/lpp-buyback-labels";
import { computeTaxSavingOnDeduction, PartialCoverageError, type TaxInput, type TaxResult } from "../../../src/lib/calculations/tax";

/**
 * A3 — moteur du rachat LPP (W09, prompt 3). Délai de blocage lu dans les
 * données 2026 (R2) ; l'économie attendue se recalcule par la différence de
 * deux impôts totaux de `computeTaxSavingOnDeduction`, composantes arrondies au
 * franc avant l'addition : aucun montant attendu n'est recopié de mémoire.
 */
const YEAR = 2026;
const lockData = getFederalData(YEAR).lppBuyback!.lockPeriodYears;
const lock = { value: lockData.value, sourceId: lockData.sourceId };

const ofsIdOf = (municipality: string, canton: string): number =>
	(getMunicipalMultipliers()?.multipliers ?? []).find((entry) => entry.municipality === municipality && entry.canton === canton)!.bfsId;

const taxInput = (municipality: string, canton: TaxInput["canton"], overrides: Partial<TaxInput> = {}): TaxInput => ({
	taxYear: YEAR,
	canton,
	municipalityOfsId: ofsIdOf(municipality, canton),
	maritalStatus: "single",
	children: 0,
	childrenAges: [],
	denomination: "none",
	federalTaxableIncome: 120_000,
	cantonalTaxableIncome: 117_000,
	taxableWealth: 0,
	...overrides,
});

const params = (input: TaxInput, overrides: Partial<LppBuybackParams> = {}): LppBuybackParams => ({
	taxInput: input,
	scales: getTaxScales({ taxYear: input.taxYear, canton: input.canton, municipalityOfsId: input.municipalityOfsId }),
	buybackPotential: 50_000,
	amount: 20_000,
	unrepaidHomeOwnershipWithdrawal: false,
	plannedCapitalWithdrawalYear: null,
	lockPeriodYears: lock,
	...overrides,
});

/** Économie directe : impôts totaux de `computeTaxSavingOnDeduction`, composantes arrondies au franc. */
const directSaving = (input: TaxInput, deduction: number): number => {
	const direct = computeTaxSavingOnDeduction(input, params(input).scales, deduction);
	const rounded = (tax: TaxResult) =>
		(["cantonalTax", "municipalTax", "churchTax", "personalTax", "federalTax"] as const).reduce((sum, key) => sum + Math.round(tax[key]), 0);
	return rounded(direct.before) - rounded(direct.after);
};

describe("données du rachat LPP", () => {
	it("délai de blocage sourcé à la LPP, relevé W09 ; sources d'A3 au registre", () => {
		expect(lockData.sourceId).toBe("fedlex-lpp");
		expect(lockData.verifiedOn).toBe("2026-10-10");
		expect(lockData.effectiveFrom).toBe("2006-01-01");
		expect(lockData.note).toMatch(/art\. 79b al\. 3/);
		for (const id of ["fedlex-lpp", "fedlex-opp2", "atf-142-ii-399"]) expect(sourceRegistry().has(id), id).toBe(true);
	});
});

describe("rachat en une fois", () => {
	it("sous le potentiel : égal au résultat direct de computeTaxSavingOnDeduction", () => {
		const input = taxInput("Lausanne", "VD");
		const result = computeLppBuyback(params(input));
		expect(result.refusals).toEqual([]);
		expect(result.singleBuyback!.amount).toBe(20_000);
		expect(result.singleBuyback!.taxSaving).toBe(directSaving(input, 20_000));
		expect(result.singleBuyback!.taxSaving).toBeGreaterThan(0);
		expect(result.singleBuyback!.notDeducted).toEqual({ federal: 0, cantonal: 0 });
		expect(result.breakdown.some((line) => line.label === labels.NOT_DEDUCTED)).toBe(false);
		// Le scénario à une tranche est le rachat en une fois
		expect(result.scenarios[0]!.totalSaving).toBe(result.singleBuyback!.taxSaving);
		expect(result.scenarios[0]!.differenceFromSingleBuyback).toBe(0);
	});

	it("montant supérieur au potentiel : refusé, art. 79b al. 1 LPP, aucun montant calculé", () => {
		const result = computeLppBuyback(params(taxInput("Lausanne", "VD"), { amount: 50_001 }));
		expect(result.refusals.map((refusal) => refusal.reason)).toEqual(["exceedsPotential"]);
		expect(result.refusals[0]!.message).toMatch(/art\. 79b al\. 1 LPP/);
		expect(result.singleBuyback).toBeNull();
		expect(result.scenarios).toEqual([]);
		expect(result.lockCalendar).toEqual([]);
	});

	it("versement anticipé pour le logement non remboursé : refusé, art. 79b al. 3 LPP, exception de l'art. 60d OPP 2, caisse à interroger", () => {
		const result = computeLppBuyback(params(taxInput("Lausanne", "VD"), { unrepaidHomeOwnershipWithdrawal: true }));
		expect(result.refusals.map((refusal) => refusal.reason)).toEqual(["unrepaidHomeOwnershipWithdrawal"]);
		const message = result.refusals[0]!.message;
		expect(message).toMatch(/art\. 79b al\. 3 LPP/);
		expect(message).toMatch(/art\. 60d OPP 2/);
		expect(message).toMatch(/Interrogez votre caisse/);
		expect(result.singleBuyback).toBeNull();
		expect(result.scenarios).toEqual([]);
	});

	it("rachat supérieur au revenu imposable : revenu ramené à zéro, part non déduite retournée et signalée", () => {
		const input = taxInput("Lausanne", "VD", { federalTaxableIncome: 15_000, cantonalTaxableIncome: 14_000 });
		const result = computeLppBuyback(params(input));
		const single = result.singleBuyback!;
		expect(single.notDeducted).toEqual({ federal: 5_000, cantonal: 6_000 });
		expect(single.taxSaving).toBe(directSaving(input, 20_000));
		// Tout l'impôt sur le revenu disparaît, rien de plus
		expect(single.taxSaving).toBe(directSaving(input, 1_000_000));
		const flagged = result.breakdown.filter((line) => line.label.startsWith(labels.NOT_DEDUCTED));
		expect(flagged.map((line) => line.value)).toEqual([5_000, 6_000]);
		for (const line of flagged) expect(line.assumption).toMatch(/ne descend pas sous zéro/);
	});
});

describe("échelonnement", () => {
	it.each([20_000, 20_003, 7, 0])("%s CHF sur 1 à 5 tranches : francs entiers, la dernière absorbe le reste, somme égale au montant", (amount) => {
		for (const count of SCENARIO_TRANCHE_COUNTS) {
			const tranches = splitIntoTranches(amount, count);
			expect(tranches).toHaveLength(count);
			expect(tranches.every(Number.isInteger)).toBe(true);
			expect(tranches.reduce((sum, tranche) => sum + tranche, 0)).toBe(amount);
			const equal = Math.floor(amount / count);
			expect(tranches.slice(0, -1).every((tranche) => tranche === equal)).toBe(true);
		}
	});

	it("scénarios de 1 à 5 tranches : années successives, économie de chaque tranche par différence de deux impôts, total et écart", () => {
		const input = taxInput("Lausanne", "VD");
		const result = computeLppBuyback(params(input, { amount: 20_003 }));
		expect(result.scenarios.map((scenario) => scenario.trancheCount)).toEqual([1, 2, 3, 4, 5]);
		for (const scenario of result.scenarios) {
			expect(scenario.tranches.map((tranche) => tranche.year)).toEqual(scenario.tranches.map((_, index) => YEAR + index));
			expect(scenario.tranches.reduce((sum, tranche) => sum + tranche.amount, 0)).toBe(20_003);
			for (const tranche of scenario.tranches) expect(tranche.taxSaving).toBe(directSaving(input, tranche.amount));
			const total = scenario.tranches.reduce((sum, tranche) => sum + tranche.taxSaving, 0);
			expect(scenario.totalSaving).toBe(total);
			expect(scenario.differenceFromSingleBuyback).toBe(total - result.singleBuyback!.taxSaving);
			expect(scenario.breakdown.find((line) => line.label === labels.SCENARIO_TOTAL)!.assumption).toBe(labels.SCENARIO_ASSUMPTION);
		}
		// Progressivité : étaler le rachat ne fait pas moins bien que le verser en une fois
		expect(result.scenarios[4]!.differenceFromSingleBuyback).toBeGreaterThanOrEqual(0);
	});
});

describe("délai de blocage", () => {
	it("les trois classes, selon l'écart entre l'année de retrait et l'année de chaque tranche", () => {
		const withdrawal = YEAR + lock.value + 2;
		const result = computeLppBuyback(params(taxInput("Lausanne", "VD"), { plannedCapitalWithdrawalYear: withdrawal }));
		const statuses = result.scenarios[4]!.tranches.map((tranche) => ({ gap: withdrawal - tranche.year, status: tranche.lockStatus }));
		for (const { gap, status } of statuses) {
			expect(status).toBe(gap > lock.value ? "compatible" : gap === lock.value ? "checkExactDate" : "withinLockPeriod");
		}
		expect(new Set(statuses.map(({ status }) => status))).toEqual(new Set(["compatible", "checkExactDate", "withinLockPeriod"]));
		expect(result.lockCalendar).toEqual(
			statuses.map(({ status }, index) => ({ buybackYear: YEAR + index, lockEndsYear: YEAR + index + lock.value, status })),
		);
		const lockLine = result.breakdown.find((line) => line.label === labels.LOCK_PERIOD)!;
		expect(lockLine).toMatchObject({ value: lock.value, sourceId: "fedlex-lpp" });
	});

	it("le délai vient des données : un autre délai déplace les classes", () => {
		const withdrawal = YEAR + 3;
		const status = (lockPeriodYears: number) =>
			computeLppBuyback(params(taxInput("Lausanne", "VD"), { plannedCapitalWithdrawalYear: withdrawal, lockPeriodYears: { value: lockPeriodYears, sourceId: "fedlex-lpp" } }))
				.singleBuyback!.lockStatus;
		expect(status(2)).toBe("compatible");
		expect(status(3)).toBe("checkExactDate");
		expect(status(4)).toBe("withinLockPeriod");
	});

	it("sans année de retrait : aucune classe", () => {
		const result = computeLppBuyback(params(taxInput("Lausanne", "VD")));
		expect(result.singleBuyback!.lockStatus).toBeNull();
		expect(result.lockCalendar.every((entry) => entry.status === null)).toBe(true);
	});
});

describe("hors périmètre", () => {
	it.each([
		["couple marié à Sion", taxInput("Sion", "VS", { maritalStatus: "married" })],
		["commune valaisanne sans indexation relevée", taxInput("Brig-Glis", "VS")],
	])("%s : aucune économie chiffrée", (_, input) => {
		expect(() => computeLppBuyback(params(input))).toThrow(PartialCoverageError);
	});
});
