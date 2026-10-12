import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { getFederalData, getMunicipalMultipliers } from "../../src/data";
import { getTaxScales, TAX_ENGINE_CANTONAL_KEYS } from "../../src/data/tax-scales";
import {
	availableTaxYears,
	CALCULATOR_DATA_REQUIREMENTS,
	getAvailableTaxYears,
	missingDataForYear,
	resolveTaxYear,
	resolveYear,
	siteTaxYearData,
	type TaxYearData,
} from "../../src/data/tax-years";
import { computePillar3aBuyback } from "../../src/lib/calculations/pension/pillar-3a-buyback";
import type { TaxInput } from "../../src/lib/calculations/tax";

/**
 * Année fiscale de calcul : l'année civile de la construction si toutes les
 * données lues par le calculateur sont relevées pour elle, sinon la plus
 * récente année complète qui la précède ; jamais une année future.
 */
const A1 = "pension.pillar-3a-buyback";
const requirement = CALCULATOR_DATA_REQUIREMENTS[A1]!;

/** Copie profonde d'un fichier de données, réétiqueté pour une autre année. */
const relabel = <T extends { year: number }>(data: T, year: number): T => ({ ...structuredClone(data), year });

describe("année fiscale de calcul", () => {
	it("le 04.10.2026 : année 2026, sans repli, et A1 inchangé — lacune entière à Lausanne, 1 842 CHF d'économie", () => {
		const resolution = resolveTaxYear(A1, new Date("2026-10-04T12:00:00+02:00"));
		expect(resolution).toEqual({ year: 2026, isFallback: false, calendarYear: 2026 });

		const year = resolution.year;
		const pillar3a = getFederalData(year).pillar3a;
		const cap = { value: pillar3a.smallContributionCap.value, sourceId: pillar3a.smallContributionCap.sourceId };
		const lausanne = (getMunicipalMultipliers()?.multipliers ?? []).find((m) => m.municipality === "Lausanne" && m.canton === "VD")!;
		const taxInput: TaxInput = {
			taxYear: year,
			canton: "VD",
			municipalityOfsId: lausanne.bfsId,
			maritalStatus: "single",
			children: 0,
			childrenAges: [],
			denomination: "none",
			federalTaxableIncome: 67_927,
			cantonalTaxableIncome: 65_167,
			taxableWealth: 0,
		};
		const result = computePillar3aBuyback({
			taxInput,
			scales: getTaxScales(taxInput),
			gaps: {
				buybackYear: year,
				firstGapYear: { value: pillar3a.buyback.firstGapYear.value, sourceId: pillar3a.buyback.firstGapYear.sourceId },
				lookbackYears: { value: pillar3a.buyback.lookbackYears.value, sourceId: pillar3a.buyback.lookbackYears.sourceId },
				buybackYearCap: cap,
				gapYears: [{ year: year - 1, maxContribution: cap, paidContribution: 0, hadAvsIncome: true, alreadyBoughtBack: false }],
				currentYearContributionPaidInFull: true,
				hasAvsIncomeInBuybackYear: true,
				receivedOldAgeBenefit: false,
			},
		});
		expect(result.buybackAmount).toBe(cap.value);
		expect(result.taxSaving).toBe(1_842);
	});

	it("le 02.01.2027 : année 2026, avec repli, tant que 2027 n'est pas relevée", () => {
		expect(resolveTaxYear(A1, new Date("2027-01-02T09:00:00+01:00"))).toEqual({ year: 2026, isFallback: true, calendarYear: 2027 });
	});

	it("2027 n'est pas disponible pour A1 : barèmes IFD 2027 en TODO, cantons et coefficients communaux en 2026", () => {
		expect(getAvailableTaxYears(A1)).toEqual([2026]);
		const missing = missingDataForYear(2027, requirement, siteTaxYearData());
		expect(missing).toContain("federal/2027.directFederalTax.incomeTaxScales");
		expect(missing).toContain("federal/2027.directFederalTax.taxReductionPerDependant");
		expect(missing.some((item) => /^canton VD : données 2026, pas 2027$/.test(item))).toBe(true);
		expect(missing).toContain("coefficients communaux : données 2026, pas 2027");
	});

	it("une année fédérale complète ne suffit pas si les cantons sont d'une autre année", () => {
		const real = siteTaxYearData();
		const completeFederal2027 = relabel(real.federal.get(2026)!, 2027);
		const data: TaxYearData = { ...real, federal: new Map([...real.federal, [2027, completeFederal2027]]) };
		expect(missingDataForYear(2027, requirement, data).filter((item) => item.startsWith("federal/"))).toEqual([]);
		expect(availableTaxYears(requirement, data)).not.toContain(2027);

		// Témoin : cantons et coefficients communaux de 2027 aussi, l'année devient disponible
		const complete: TaxYearData = {
			federal: data.federal,
			cantons: real.cantons.map((canton) => relabel(canton, 2027)),
			municipalMultipliers: relabel(real.municipalMultipliers!, 2027),
		};
		expect(availableTaxYears(requirement, complete)).toContain(2027);
	});

	it("jamais une année future, même complète ; repli sur la plus récente qui précède", () => {
		expect(resolveYear([2026, 2027], new Date("2026-10-04T12:00:00+02:00"))).toEqual({ year: 2026, isFallback: false, calendarYear: 2026 });
		expect(resolveYear([2025, 2028], new Date("2027-06-01T12:00:00+02:00"))).toEqual({ year: 2025, isFallback: true, calendarYear: 2027 });
		expect(() => resolveYear([2028], new Date("2027-06-01T12:00:00+02:00"))).toThrow();
		// Le 1er janvier à 00 h 30 en Suisse, il est encore le 31 décembre en UTC
		expect(resolveYear([2026, 2027], new Date("2026-12-31T23:30:00Z")).calendarYear).toBe(2027);
	});

	it("getFederalData est stricte : une année absente lève une erreur, sans repli", () => {
		expect(() => getFederalData(2030)).toThrow(/Aucune donnée fédérale pour 2030/);
	});

	it("les plafonds 3a de 2027 se lisent explicitement : petite cotisation de 7 373 CHF", () => {
		expect(getFederalData(2027).year).toBe(2027);
		expect(getFederalData(2027).pillar3a.smallContributionCap.value).toBe(7373);
	});

	it("TAX_ENGINE_CANTONAL_KEYS est exactement la liste des clés cantonales que lit getTaxScales", () => {
		const source = readFileSync(new URL("../../src/data/tax-scales.ts", import.meta.url), "utf8");
		const read = new Set([...source.matchAll(/\bcanton\.([a-zA-Z]+)/g)].map((match) => match[1]!));
		read.delete("year");
		expect([...read].sort()).toEqual([...TAX_ENGINE_CANTONAL_KEYS].sort());
	});
});

describe("année fiscale de calcul d'A3, et A1 et A2 inchangés par la clé fédérale absente", () => {
	const A2 = "pension.pillar-3a-tax-saving";
	const A3 = "pension.lpp-buyback";
	const BEFORE = new Date("2026-10-04T12:00:00+02:00");
	const AFTER = new Date("2027-01-02T09:00:00+01:00");
	const real = siteTaxYearData();

	/** 2027 entièrement relevée sauf lppBuyback : fédéral, cantons et coefficients communaux copiés de 2026. */
	const federal2027 = relabel(real.federal.get(2026)!, 2027);
	delete (federal2027 as { lppBuyback?: unknown }).lppBuyback;
	const complete2027: TaxYearData = {
		federal: new Map([...real.federal, [2027, federal2027]]),
		cantons: real.cantons.map((canton) => relabel(canton, 2027)),
		municipalMultipliers: relabel(real.municipalMultipliers!, 2027),
	};
	const resolveWith = (id: string, data: TaxYearData, today: Date) => resolveYear(availableTaxYears(CALCULATOR_DATA_REQUIREMENTS[id]!, data), today);

	it("A1 et A2 : la règle de la clé absente ne retire aucune année, sur les données réelles comme sur 2027 complète", () => {
		for (const id of [A1, A2]) {
			for (const data of [real, complete2027]) {
				for (const year of [2026, 2027]) {
					// Avant le changement, une clé absente n'était pas comptée : les listes sont identiques s'il n'y en a aucune
					expect(missingDataForYear(year, CALCULATOR_DATA_REQUIREMENTS[id]!, data).filter((item) => item.endsWith(" absent"))).toEqual([]);
				}
			}
		}
	});

	it("A1 et A2 : mêmes années qu'avant, avant et après la bascule vers 2027", () => {
		for (const id of [A1, A2]) {
			expect(resolveTaxYear(id, BEFORE)).toEqual({ year: 2026, isFallback: false, calendarYear: 2026 });
			expect(resolveTaxYear(id, AFTER)).toEqual({ year: 2026, isFallback: true, calendarYear: 2027 });
			// 2027 relevée : la bascule a lieu le 1er janvier
			expect(resolveWith(id, complete2027, AFTER)).toEqual({ year: 2027, isFallback: false, calendarYear: 2027 });
		}
	});

	it("A3 reste en 2026 tant que lppBuyback.lockPeriodYears manque dans 2027.json", () => {
		expect(getFederalData(2027).lppBuyback).toBeUndefined();
		expect(resolveTaxYear(A3, BEFORE)).toEqual({ year: 2026, isFallback: false, calendarYear: 2026 });
		expect(resolveTaxYear(A3, AFTER)).toEqual({ year: 2026, isFallback: true, calendarYear: 2027 });
		expect(missingDataForYear(2027, CALCULATOR_DATA_REQUIREMENTS[A3]!, real)).toContain("federal/2027.lppBuyback absent");
		// 2027 complète sauf le délai : A3 n'y bascule pas, alors qu'A1 et A2 y basculent
		expect(missingDataForYear(2027, CALCULATOR_DATA_REQUIREMENTS[A3]!, complete2027)).toEqual(["federal/2027.lppBuyback absent"]);
		expect(availableTaxYears(CALCULATOR_DATA_REQUIREMENTS[A3]!, complete2027)).not.toContain(2027);
		// Témoin : le délai relevé pour 2027, A3 bascule comme A1 et A2
		const withLock: TaxYearData = {
			...complete2027,
			federal: new Map([...complete2027.federal, [2027, relabel(real.federal.get(2026)!, 2027)]]),
		};
		expect(resolveWith(A3, withLock, AFTER)).toEqual({ year: 2027, isFallback: false, calendarYear: 2027 });
	});
});
