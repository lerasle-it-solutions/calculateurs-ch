import { describe, expect, it } from "vitest";

import { getCantonData, getFederalData, getMunicipalMultipliers, sourceRegistry } from "../../../src/data";
import { getCapitalWithdrawalScales } from "../../../src/data/capital-withdrawal-scales";
import { getTaxScales } from "../../../src/data/tax-scales";
import {
	computeCapitalWithdrawal,
	type CapitalWithdrawalEntry,
	type CapitalWithdrawalInput,
	type CapitalWithdrawalOptions,
	type CapitalWithdrawalScales,
} from "../../../src/lib/calculations/pension/capital-withdrawal";
import * as labels from "../../../src/lib/calculations/pension/capital-withdrawal-labels";
import {
	evaluateFederalScale,
	evaluateScale,
	MissingTaxDataError,
	OutOfScopeError,
	type FederalScaleTable,
	type ScaleTable,
	type TaxInput,
} from "../../../src/lib/calculations/tax";

/**
 * A4 — moteur du retrait en capital (W11, session A). Tests unitaires sur des
 * cas calculables à la main depuis la loi : barème fribourgeois de l'art. 39
 * LICD, barème jurassien de l'art. 37 LI, conversion en rente, bornes de
 * l'art. 13a LPP. Les relevés du calculateur de l'AFC viendront dans
 * tests/calculations/private/ (R6) ; aucun de leurs résultats n'est ici.
 */
const YEAR = 2026;

const ofsIdOf = (municipality: string, canton: string): number =>
	(getMunicipalMultipliers()?.multipliers ?? []).find((entry) => entry.municipality === municipality && entry.canton === canton)!.bfsId;

const lpp = (amount: number, year = YEAR): CapitalWithdrawalEntry => ({ pillar: "lpp", amount, year });
const pillar3a = (amount: number, year = YEAR): CapitalWithdrawalEntry => ({ pillar: "pillar3a", amount, year });

const inputFor = (municipality: string, canton: TaxInput["canton"], withdrawals: CapitalWithdrawalEntry[], overrides: Partial<CapitalWithdrawalInput> = {}): CapitalWithdrawalInput => ({
	taxYear: YEAR,
	canton,
	municipalityOfsId: ofsIdOf(municipality, canton),
	maritalStatus: "single",
	children: 0,
	denomination: "none",
	withdrawals,
	...overrides,
});

const realScales = (input: CapitalWithdrawalInput): CapitalWithdrawalScales =>
	getCapitalWithdrawalScales({ taxYear: input.taxYear, canton: input.canton, municipalityOfsId: input.municipalityOfsId });

/** IFD attendu : un cinquième du barème de l'art. 36 al. 1 LIFD, arrondi au franc (art. 38 al. 2 LIFD). */
const expectedFederalTax = (amount: number): number => {
	const scales = getTaxScales({ taxYear: YEAR, canton: "VD", municipalityOfsId: ofsIdOf("Lausanne", "VD") }).federal;
	const table = (scales.income as FederalScaleTable[]).find((candidate) => candidate.appliesTo.includes("otherTaxpayer"))!;
	const maximum = (scales.maximumRatePercent as { value: number }).value;
	return Math.round(evaluateFederalScale(table, amount, maximum).tax * getFederalData(YEAR).capitalWithdrawal!.federalScaleFactor.value);
};

describe("données du retrait en capital", () => {
	it("le facteur de l'IFD et les bornes LPP sont lus dans federal/2026.json", () => {
		const data = getFederalData(YEAR).capitalWithdrawal!;
		expect(data.federalScaleFactor.value).toBe(0.2);
		expect(data.lppMaximumSteps.value).toBe(3);
		expect(data.lppMinimumFirstPartialPercent.value).toBe(20);
	});

	it("Fribourg : barème de l'art. 39 al. 2 LICD à partir de 0, exonération de l'al. 4 à part", () => {
		const fr = getCantonData("FR");
		const table = (fr.capitalWithdrawalTax as { table: { value: { brackets: unknown[] } } }[])[0]!.table.value.brackets;
		expect(table).toEqual([
			{ threshold: 0, ratePercent: 1, baseAmount: 0 },
			{ threshold: 50_000, ratePercent: 2, baseAmount: 500 },
			{ threshold: 100_000, ratePercent: 3, baseAmount: 1_500 },
			{ threshold: 150_000, ratePercent: 4, baseAmount: 3_000 },
			{ threshold: 200_000, ratePercent: 5, baseAmount: 5_000 },
		]);
		expect(fr.capitalWithdrawalExemption?.value).toEqual({ exemptBelow: 10_000 });
	});

	it("toute source citée par la trace existe au registre", () => {
		const input = inputFor("Delémont", "JU", [lpp(100_000)]);
		const { breakdown } = computeCapitalWithdrawal(input, realScales(input));
		for (const entry of breakdown) {
			if (entry.sourceId !== null) expect(sourceRegistry().has(entry.sourceId), entry.sourceId).toBe(true);
		}
	});
});

describe("Fribourg : art. 39 LICD", () => {
	// Le coefficient communal sur le capital est encore à relever (TODO) : valeur fictive « non » pour isoler l'impôt cantonal.
	const withoutCommunal = (input: CapitalWithdrawalInput): CapitalWithdrawalScales => {
		const scales = realScales(input);
		return { ...scales, multipliers: { ...scales.multipliers, communal: { value: false, sourceId: "fixture" } } };
	};
	const cantonalTaxOn = (amount: number): number => {
		const input = inputFor("Fribourg", "FR", [lpp(amount)]);
		return computeCapitalWithdrawal(input, withoutCommunal(input)).plan!.years[0]!.cantonalTax;
	};

	it("9 999 CHF sont exonérés, 10 000 CHF tout juste paient 100 CHF (« inférieur à 10 000 », al. 4)", () => {
		expect(cantonalTaxOn(9_999)).toBe(0);
		expect(cantonalTaxOn(10_000)).toBe(100);
	});

	it("taux fixes : le coefficient cantonal annuel de 96 % ne s'applique pas (art. 2 al. 2)", () => {
		expect(getCantonData("FR").cantonalMultiplier.income.value).toBe(96);
		expect(cantonalTaxOn(100_000)).toBe(1_500); // 1 % × 50 000 + 2 % × 50 000
		expect(cantonalTaxOn(300_000)).toBe(10_000); // 500 + 1 000 + 1 500 + 2 000 + 5 % × 100 000
	});

	it("l'exonération porte sur le total de l'année : deux retraits de 6 000 CHF la même année sont imposés", () => {
		const input = inputFor("Fribourg", "FR", [lpp(6_000), pillar3a(6_000)]);
		const year = computeCapitalWithdrawal(input, withoutCommunal(input)).plan!.years[0]!;
		expect(year.total).toBe(12_000);
		expect(year.cantonalTax).toBe(120);
	});

	it("la trace cite la loi cantonale pour l'addition des prestations de l'année", () => {
		const input = inputFor("Fribourg", "FR", [lpp(100_000)]);
		const line = computeCapitalWithdrawal(input, withoutCommunal(input)).breakdown.find((entry) => entry.label.startsWith(labels.SAME_YEAR_TOTAL))!;
		expect(line.sourceId).toBe("fr-licd");
		expect(line.assumption).toBe(labels.SAME_YEAR_TOTAL_LAW);
	});

	it("avec les données réelles, le calcul est refusé tant que le coefficient communal est à relever (R3)", () => {
		const input = inputFor("Fribourg", "FR", [lpp(100_000)]);
		expect(() => computeCapitalWithdrawal(input, realScales(input))).toThrow(MissingTaxDataError);
	});
});

describe("Jura : art. 37 LI, quotités cantonale et communale", () => {
	const input = inputFor("Delémont", "JU", [lpp(100_000)]);
	const year = computeCapitalWithdrawal(input, realScales(input)).plan!.years[0]!;
	// 1,1 % × 56 700 + 1,3 % × 43 300 = 1 186,60
	const base = 623.7 + 562.9;

	it("impôt cantonal : impôt de base × quotité cantonale", () => {
		expect(getCantonData("JU").cantonalMultiplier.income.value).toBe(285);
		expect(year.cantonalTax).toBe(Math.round(base * 2.85));
	});

	it("impôt communal : impôt de base × quotité communale de Delémont", () => {
		expect(year.municipalTax).toBe(Math.round(base * 1.9));
	});

	it("addition des prestations de l'année marquée « méthode » hors de Fribourg", () => {
		const line = computeCapitalWithdrawal(input, realScales(input)).breakdown.find((entry) => entry.label.startsWith(labels.SAME_YEAR_TOTAL))!;
		expect(line.sourceId).toBeNull();
		expect(line.assumption).toBe(labels.SAME_YEAR_TOTAL_METHOD);
	});

	it("IFD : cinquième du barème de l'art. 36 al. 1 LIFD, arrondi au franc", () => {
		expect(year.federalTax).toBe(expectedFederalTax(100_000));
		expect(year.churchTax).toBe(0);
		expect(year.totalTax).toBe(year.federalTax + year.cantonalTax + year.municipalTax);
	});
});

describe("IFD : impôt minimal de 25 CHF (art. 36 al. 3 LIFD), en option", () => {
	const input = inputFor("Delémont", "JU", [lpp(20_000)]);

	it("par défaut, il n'est pas appliqué : 0,77 % × 4 800 / 5 = 7,39, arrondi à 7 CHF", () => {
		expect(computeCapitalWithdrawal(input, realScales(input)).plan!.years[0]!.federalTax).toBe(7);
	});

	it("en option, l'impôt inférieur à 25 CHF n'est pas perçu", () => {
		expect(computeCapitalWithdrawal(input, realScales(input), { applyFederalMinimumLeviedTax: true }).plan!.years[0]!.federalTax).toBe(0);
	});
});

describe("Vaud, Genève, Neuchâtel : fraction du barème du revenu", () => {
	const incomeScaleTax = (canton: "VD" | "NE", municipality: string, amount: number): number => {
		const tables = getTaxScales({ taxYear: YEAR, canton, municipalityOfsId: ofsIdOf(municipality, canton) }).canton.income;
		return evaluateScale(tables.find((table) => table.households.includes("single"))!, amount).tax;
	};

	it("Vaud : un cinquième, coefficients cantonal et communal, sans la réduction de 5 % (art. 49 LI, LRIPP art. 4 al. 2)", () => {
		const input = inputFor("Lausanne", "VD", [lpp(100_000)]);
		const year = computeCapitalWithdrawal(input, realScales(input)).plan!.years[0]!;
		const base = incomeScaleTax("VD", "Lausanne", 100_000) * 0.2;
		expect(year.cantonalTax).toBe(Math.round(base * 1.55));
		expect(year.municipalTax).toBe(Math.round(base * 0.785));
	});

	it("Neuchâtel : le quart, au moins 2,5 % du capital (art. 42 LCdir)", () => {
		const input = inputFor("Neuchâtel", "NE", [lpp(100_000)]);
		const year = computeCapitalWithdrawal(input, realScales(input)).plan!.years[0]!;
		const base = Math.max(incomeScaleTax("NE", "Neuchâtel", 100_000) / 4, 2_500);
		expect(year.cantonalTax).toBe(Math.round(base * 1.24));
		expect(year.municipalTax).toBe(Math.round(base * 0.65));
	});

	it("Genève : refusé tant que la diminution de 12 % sur le capital est à relever (R3)", () => {
		const input = inputFor("Genève", "GE", [lpp(100_000)]);
		expect(() => computeCapitalWithdrawal(input, realScales(input))).toThrow(MissingTaxDataError);
	});
});

describe("Valais : taux d'une rente équivalente (art. 33b al. 1 LF)", () => {
	const profile = { sex: "male" as const, age: 65, ageYear: YEAR };
	const input = inputFor("Sion", "VS", [lpp(100_000)], { annuityProfile: profile });

	it("sans âge ni sexe, le calcul est hors périmètre", () => {
		const { annuityProfile: _, ...withoutProfile } = input;
		expect(() => computeCapitalWithdrawal(withoutProfile, realScales(input), { communalRateBounds: "none" })).toThrow(OutOfScopeError);
	});

	it("tant que les relevés de Sion n'ont pas tranché la borne du taux communal, le calcul est refusé (R3)", () => {
		expect(() => computeCapitalWithdrawal(input, realScales(input))).toThrow(MissingTaxDataError);
	});

	it("rente : 100 000 × 50,77 / 1 000 = 5 077, taux lu à 5 000 et borné entre 2 % et 4 %", () => {
		for (const bounds of ["sameAsCantonal", "none"] as const) {
			const { breakdown } = computeCapitalWithdrawal(input, realScales(input), { communalRateBounds: bounds });
			expect(breakdown.find((entry) => entry.label === labels.EQUIVALENT_ANNUITY)!.value).toBeCloseTo(5_077, 6);
			expect(breakdown.find((entry) => entry.label === labels.RATE_DETERMINING_ANNUITY)!.value).toBe(5_000);
			const bounded = breakdown.find((entry) => entry.label === labels.BOUNDED_RATE)!.value;
			expect(bounded).toBeGreaterThanOrEqual(2);
			expect(bounded).toBeLessThanOrEqual(4);
		}
	});
});

// --- Barèmes fictifs, calculables à la main -------------------------------------------

/** IFD nul jusqu'au taux maximal, placé au-delà de tout montant testé. */
const noFederalTax = (maximumRatePercent: number): FederalScaleTable => ({
	label: "fictif",
	appliesTo: ["otherTaxpayer"],
	incrementStep: 100,
	brackets: [
		{ threshold: 0, baseAmount: 0, ratePercent: 0 },
		{ threshold: 1e12, baseAmount: (1e12 * maximumRatePercent) / 100, ratePercent: maximumRatePercent },
	],
	sourceId: "fixture",
});

const table = (scaleType: ScaleTable["scaleType"], brackets: [number, number, number][]): ScaleTable => ({
	households: ["single", "singleWithChildren", "married"],
	scaleType,
	rateSplittingDivisor: null,
	brackets: brackets.map(([threshold, ratePercent, baseAmount]) => ({ threshold, ratePercent, baseAmount })),
	sourceId: "fixture",
});

/** Barème propre : 1 % jusqu'à 100 000, 3 % au-delà ; aucun coefficient, pas d'IFD. */
const fixtureScales = (overrides: Partial<CapitalWithdrawalScales> = {}): CapitalWithdrawalScales => {
	const real = realScales(inputFor("Delémont", "JU", [lpp(1)]));
	return {
		...real,
		tax: {
			...real.tax,
			coverage: null,
			federal: { ...real.tax.federal, income: [noFederalTax(11.5)], maximumRatePercent: { value: 11.5, sourceId: "fixture" } },
		},
		model: { type: "ownScale", tables: [table("marginal", [[0, 1, 0], [100_000, 3, 1_000]])] },
		multipliers: {
			cantonal: { value: false, sourceId: "fixture" },
			communal: { value: false, sourceId: "fixture" },
			church: { pending: "fictif", sourceId: null },
			baseTaxReduction: null,
		},
		exemption: null,
		aggregation: null,
		...overrides,
	};
};

const fixtureInput = (withdrawals: CapitalWithdrawalEntry[], overrides: Partial<CapitalWithdrawalInput> = {}): CapitalWithdrawalInput =>
	inputFor("Delémont", "JU", withdrawals, overrides);

const totalsByCount = (result: ReturnType<typeof computeCapitalWithdrawal>) =>
	result.scenarios.map((scenario) => (scenario.feasible ? scenario.totalTax : null));

describe("échelonnement : 1 à 4 années", () => {
	it("capital LPP seul : en une fois 7 000, en deux 5 000, en trois 3 000 ; quatre années impossibles (trois étapes au plus)", () => {
		const result = computeCapitalWithdrawal(fixtureInput([lpp(300_000)]), fixtureScales());
		expect(totalsByCount(result)).toEqual([7_000, 5_000, 3_000, null]);
		expect(result.optimal.trancheCount).toBe(3);
		expect(result.optimal.years.map((year) => year.total)).toEqual([100_000, 100_000, 100_000]);
		expect(result.staggeringSaving).toBe(4_000);
		expect(result.planExtraTax).toBe(4_000);
		const impossible = result.scenarios[3]!;
		expect(impossible.feasible).toBe(false);
	});

	it("comptes 3a entiers : deux comptes ne s'étalent pas sur trois années", () => {
		const result = computeCapitalWithdrawal(fixtureInput([pillar3a(120_000), pillar3a(80_000)]), fixtureScales());
		// 200 000 en une fois : 1 000 + 3 % × 100 000 ; puis 1 600 + 800
		expect(totalsByCount(result)).toEqual([4_000, 2_400, null, null]);
		// Une année par compte ; à impôt égal, l'ordre des années est indifférent
		expect(result.optimal.years.map((year) => year.withdrawals.map((entry) => entry.amount)).sort()).toEqual([[120_000], [80_000]]);
	});

	it("capital LPP et un compte 3a : quatre années possibles, années civiles successives", () => {
		const result = computeCapitalWithdrawal(fixtureInput([lpp(300_000), pillar3a(100_000)]), fixtureScales());
		// 400 000 sur une, deux, trois, quatre années : 10 000 ; 2 × 4 000 ; 3 × 2 000 ; 4 × 1 000
		expect(totalsByCount(result)).toEqual([10_000, 8_000, 6_000, 4_000]);
		expect(result.optimal.trancheCount).toBe(4);
		expect(result.optimal.years.map((year) => year.year)).toEqual([2026, 2027, 2028, 2029]);
	});

	it("le premier retrait partiel LPP respecte le minimum de 20 % dans chaque scénario", () => {
		// Un compte 3a de 500 000 pèse sur l'une des années : la meilleure répartition LPP reste bornée
		const result = computeCapitalWithdrawal(fixtureInput([lpp(100_000), pillar3a(500_000)]), fixtureScales());
		for (const scenario of result.scenarios) {
			if (!scenario.feasible) continue;
			const parts = scenario.years.flatMap((year) => year.withdrawals.filter((entry) => entry.pillar === "lpp").map((entry) => entry.amount));
			if (parts.length > 1) expect(parts[0]!).toBeGreaterThanOrEqual(20_000);
			expect(parts.reduce((sum, part) => sum + part, 0)).toBe(100_000);
		}
	});

	it("cinq comptes 3a et un capital LPP : le calcul aboutit", () => {
		const accounts = [40_000, 50_000, 60_000, 70_000, 80_000].map((amount) => pillar3a(amount));
		const result = computeCapitalWithdrawal(fixtureInput([lpp(400_000), ...accounts]), fixtureScales());
		expect(result.scenarios.every((scenario) => scenario.feasible)).toBe(true);
		expect(result.optimal.totalTax).toBeLessThanOrEqual((result.scenarios[0] as { totalTax: number }).totalTax);
	});
});

describe("refus de l'art. 13a LPP", () => {
	it("plus de trois étapes LPP : calendrier refusé, scénarios chiffrés quand même", () => {
		const result = computeCapitalWithdrawal(
			fixtureInput([lpp(100_000, 2026), lpp(100_000, 2027), lpp(100_000, 2028), lpp(100_000, 2029)]),
			fixtureScales(),
		);
		expect(result.refusals.map((refusal) => refusal.reason)).toEqual(["tooManyLppSteps"]);
		expect(result.refusals[0]!.message).toContain("art. 13a al. 2 LPP");
		expect(result.plan).toBeNull();
		expect(result.planExtraTax).toBeNull();
		// 400 000 en trois étapes au plus : environ 133 333 par année, 2 000 d'impôt chacune
		expect(totalsByCount(result)).toEqual([10_000, 8_000, 6_000, null]);
	});

	it("premier retrait partiel sous 20 % : refusé, avec renvoi au règlement de la caisse", () => {
		const result = computeCapitalWithdrawal(fixtureInput([lpp(30_000, 2026), lpp(270_000, 2027)]), fixtureScales());
		expect(result.refusals.map((refusal) => refusal.reason)).toEqual(["firstLppWithdrawalTooSmall"]);
		expect(result.refusals[0]!.message).toContain("règlement de votre caisse");
	});

	it("20 % tout juste : accepté", () => {
		const result = computeCapitalWithdrawal(fixtureInput([lpp(60_000, 2026), lpp(240_000, 2027)]), fixtureScales());
		expect(result.refusals).toEqual([]);
		// 600 + (1 000 + 3 % × 140 000)
		expect(result.plan!.totalTax).toBe(600 + 5_200);
	});
});

describe("modèles cantonaux, barèmes fictifs", () => {
	it("exonération : un total inférieur au seuil ne paie pas d'impôt cantonal", () => {
		const scales = fixtureScales({ exemption: { value: { exemptBelow: 10_000 }, sourceId: "fixture" } });
		expect(computeCapitalWithdrawal(fixtureInput([lpp(9_999)]), scales).plan!.totalTax).toBe(0);
		expect(computeCapitalWithdrawal(fixtureInput([lpp(10_000)]), scales).plan!.totalTax).toBe(100);
	});

	it("fraction du barème du revenu, taux minimal : 4 % × 100 000 / 4 = 1 000 < 2 500", () => {
		const real = fixtureScales();
		const scales = fixtureScales({
			tax: { ...real.tax, canton: { ...real.tax.canton, income: [table("marginal", [[0, 4, 0]])], incomeScaleIndexation: null } },
			model: { type: "incomeScaleFraction", factor: { value: 0.25, sourceId: "fixture" }, minimumRatePercent: { value: 2.5, sourceId: "fixture" } },
		});
		expect(computeCapitalWithdrawal(fixtureInput([lpp(100_000)]), scales).plan!.totalTax).toBe(2_500);
	});

	/** Rente : 50 CHF pour 1 000 à 65 ans, 60 à 66 (puis 70 et 80, pour les scénarios sur quatre années) ; barème à taux 1 %, 3 % dès 10 000, 5 % dès 50 000. */
	const periodicScales = (municipality?: CapitalWithdrawalScales["tax"]["municipality"]): CapitalWithdrawalScales => {
		const real = fixtureScales();
		return fixtureScales({
			tax: {
				...real.tax,
				canton: {
					...real.tax.canton,
					income: [table("averageRate", [[0, 1, 0], [10_000, 3, 0], [50_000, 5, 0]])],
					incomeScaleIndexation: null,
					incomeTaxRounding: null,
					multiplier: { income: { value: 100, sourceId: "fixture" }, wealth: { value: 100, sourceId: "fixture" } },
					unreducedMultiplier: null,
				},
				taxBaseRounding: { ...real.tax.taxBaseRounding, income: { value: 100, sourceId: "fixture" } },
				municipality: municipality ?? { model: "multiplierOnBaseTax", multiplier: { income: { value: 50, sourceId: "fixture" }, wealth: { value: 50, sourceId: "fixture" } } },
			},
			model: {
				type: "periodicBenefitRate",
				minimumRatePercent: { value: 2, sourceId: "fixture" },
				maximumRatePercent: { value: 4, sourceId: "fixture" },
				conversion: { value: { capitalAmount: 1_000, rows: [{ age: 65, male: 50, female: 45 }, { age: 66, male: 60, female: 50 }, { age: 67, male: 70, female: 55 }, { age: 68, male: 80, female: 60 }] }, sourceId: "fixture" },
			},
			multipliers: { cantonal: { value: true, sourceId: "fixture" }, communal: { value: true, sourceId: "fixture" }, church: { pending: "fictif", sourceId: null }, baseTaxReduction: null },
		});
	};
	const profile = { sex: "male" as const, age: 65, ageYear: YEAR };
	const periodic = (amount: number, scales: CapitalWithdrawalScales, options: CapitalWithdrawalOptions = {}, year = YEAR) =>
		computeCapitalWithdrawal(fixtureInput([lpp(amount, year)], { annuityProfile: profile }), scales, options).plan!.years[0]!;

	it("taux sous le minimum relevé à 2 %, au-dessus du maximum ramené à 4 %", () => {
		expect(periodic(100_000, periodicScales()).cantonalTax).toBe(2_000); // rente 5 000 : 1 % → 2 %
		expect(periodic(300_000, periodicScales()).cantonalTax).toBe(9_000); // rente 15 000 : 3 %
		expect(periodic(1_000_000, periodicScales()).cantonalTax).toBe(40_000); // rente 50 000 : 5 % → 4 %
		expect(periodic(100_000, periodicScales()).municipalTax).toBe(1_000); // coefficient communal de 50 %
	});

	it("l'âge avance d'un an par année civile : 300 000 en 2027 se convertit à 66 ans", () => {
		// rente 300 000 × 60 / 1 000 = 18 000 : 3 %
		expect(periodic(300_000, periodicScales(), {}, YEAR + 1).cantonalTax).toBe(9_000);
		expect(periodic(150_000, periodicScales(), {}, YEAR + 1).cantonalTax).toBe(3_000); // rente 9 000 : 1 % → 2 %
	});

	it("barème communal propre : les deux variantes de la borne du taux communal", () => {
		const communal = periodicScales({
			model: "communalScale",
			income: [table("averageRate", [[0, 4.5, 0]])],
			wealth: [],
			incomeScaleIndexation: null,
			multiplier: { income: { value: 100, sourceId: "fixture" }, wealth: { value: 100, sourceId: "fixture" } },
		});
		expect(periodic(100_000, communal, { communalRateBounds: "sameAsCantonal" }).municipalTax).toBe(4_000);
		expect(periodic(100_000, communal, { communalRateBounds: "none" }).municipalTax).toBe(4_500);
		expect(() => periodic(100_000, communal)).toThrow(MissingTaxDataError);
	});
});

describe("périmètre et valeurs à relever", () => {
	it("couples et familles : hors périmètre de la v1", () => {
		expect(() => computeCapitalWithdrawal(fixtureInput([lpp(100_000)], { maritalStatus: "married" }), fixtureScales())).toThrow(OutOfScopeError);
		expect(() => computeCapitalWithdrawal(fixtureInput([lpp(100_000)], { children: 1 }), fixtureScales())).toThrow(OutOfScopeError);
	});

	it("une confession demande le coefficient paroissial, encore à relever : refus listant la valeur", () => {
		try {
			computeCapitalWithdrawal(fixtureInput([lpp(100_000)], { denomination: "protestant" }), fixtureScales());
			expect.unreachable();
		} catch (error) {
			expect(error).toBeInstanceOf(MissingTaxDataError);
			expect((error as MissingTaxDataError).missing.map((item) => item.label)).toEqual(["Coefficient paroissial sur l'impôt sur le capital"]);
		}
	});

	it("la trace cite chaque règle : imposition séparée, compte 3a entier, fenêtre de retrait, étapes LPP, cinquième de l'IFD", () => {
		const input = inputFor("Delémont", "JU", [lpp(100_000)]);
		const { breakdown } = computeCapitalWithdrawal(input, realScales(input));
		const sourceOf = (label: string) => breakdown.find((entry) => entry.label === label)?.sourceId;
		expect(sourceOf(labels.SEPARATE_TAXATION)).toBe("fedlex-lhid");
		expect(sourceOf(labels.PILLAR_3A_ACCOUNT)).toBe("afc-circular-18a");
		expect(sourceOf(labels.WITHDRAWAL_WINDOW)).toBe("opp3-art-7a");
		expect(sourceOf(labels.LPP_STEPS)).toBe("fedlex-lpp");
		expect(sourceOf(labels.FEDERAL_FIFTH)).toBe("fedlex-lifd");
	});
});
