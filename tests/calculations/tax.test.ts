import { describe, expect, it } from "vitest";

import {
	MissingTaxDataError,
	OutOfScopeError,
	PartialCoverageError,
	computeIncomeAndWealthTax,
	computeMarginalRate,
	computeFederalIncomeTax,
	computeTaxSavingOnDeduction,
	evaluateFederalScale,
	evaluateScale,
	type FederalScaleTable,
	type FederalTaxScales,
	type Pending,
	type ScaleTable,
	type TaxInput,
	type TaxScales,
} from "../../src/lib/calculations/tax";

/**
 * Mécanique du moteur fiscal sur des barèmes FICTIFS : chaque règle est testée
 * isolément, avec des chiffres ronds calculables de tête. Aucun de ces nombres
 * n'est une valeur fiscale réelle ; la conformité au droit est vérifiée par
 * canton-references.engine.test.ts.
 */
const ALL = ["single", "singleWithChildren", "married"] as ScaleTable["households"];

const table = (overrides: Partial<ScaleTable> = {}): ScaleTable => ({
	households: ALL,
	scaleType: "marginal",
	rateSplittingDivisor: null,
	// 0 % jusqu'à 10 000, 10 % jusqu'à 20 000, puis 20 %
	brackets: [
		{ threshold: 0, ratePercent: 0, baseAmount: 0 },
		{ threshold: 10_000, ratePercent: 10, baseAmount: 0 },
		{ threshold: 20_000, ratePercent: 20, baseAmount: 1_000 },
	],
	sourceId: "fictive-scale",
	...overrides,
});

const pct = (value: number, sourceId = "fictive-multiplier") => ({ value, sourceId });

const ALL_SITUATIONS = [
	"marriedCoupleLivingTogether",
	"livingWithSupportedDependants",
	"otherTaxpayer",
] as FederalScaleTable["appliesTo"];

const federalTable = (overrides: Partial<FederalScaleTable> = {}): FederalScaleTable => ({
	label: "barème fédéral fictif",
	appliesTo: ALL_SITUATIONS,
	incrementStep: 100,
	// comme `table()`, par tranches complètes de 100 ; 15 % du revenu entier dès 60 000
	brackets: [
		{ threshold: 0, ratePercent: 0, baseAmount: 0 },
		{ threshold: 10_000, ratePercent: 10, baseAmount: 0 },
		{ threshold: 20_000, ratePercent: 20, baseAmount: 1_000 },
		{ threshold: 59_900, ratePercent: null, baseAmount: 8_980 },
		{ threshold: 60_000, ratePercent: 15, baseAmount: 9_000 },
	],
	sourceId: "fictive-federal",
	...overrides,
});

const federal = (overrides: Partial<FederalTaxScales> = {}): FederalTaxScales => ({
	income: [federalTable()],
	maximumRatePercent: pct(15, "fictive-federal"),
	taxReductionPerDependant: pct(0),
	minimumLeviedTax: pct(0),
	taxRoundingToNearest: pct(1),
	...overrides,
});
const pending = (label: string): Pending => ({ pending: label, sourceId: "fictive-todo" });
const noChurch = { protestant: pct(0), catholic: pct(0), christianCatholic: pct(0) };

const scales = (overrides: Partial<TaxScales> = {}, canton: Partial<TaxScales["canton"]> = {}): TaxScales => ({
	canton: {
		income: [table()],
		wealth: [
			table({
				brackets: [
					{ threshold: 0, ratePercent: 0, baseAmount: 0 },
					{ threshold: 100_000, ratePercent: 1, baseAmount: 0 },
				],
			}),
		],
		multiplier: { income: pct(100), wealth: pct(100) },
		baseTaxReduction: null,
		unreducedMultiplier: null,
		incomeScaleIndexation: null,
		supplementaryWealthTax: null,
		taxCreditPerChild: null,
		maximumTaxBurden: null,
		...canton,
	},
	municipality: { model: "multiplierOnBaseTax", multiplier: { income: pct(50), wealth: pct(50) } },
	church: { income: noChurch, wealth: noChurch },
	familyModel: { type: "separateScale", sourceId: "fictive-family" },
	taxBaseRounding: { income: pct(1, "fictive-rounding"), wealth: pct(1, "fictive-rounding"), rateDeterminingIncome: null },
	personalTax: null,
	federal: federal(),
	coverage: null,
	...overrides,
});

const input = (overrides: Partial<TaxInput> = {}): TaxInput => ({
	taxYear: 2026,
	canton: "NE",
	municipalityOfsId: 1,
	maritalStatus: "single",
	children: 0,
	childrenAges: [],
	denomination: "none",
	federalTaxableIncome: 15_000,
	cantonalTaxableIncome: 15_000,
	taxableWealth: 0,
	...overrides,
});

describe("évaluation d'un barème", () => {
	it("marginal : montant de base + (assiette − seuil) × taux", () => {
		expect(evaluateScale(table(), 15_000).tax).toBeCloseTo(500);
		expect(evaluateScale(table(), 25_000).tax).toBeCloseTo(2_000);
	});

	it("taux moyen : le taux de la tranche s'applique à l'assiette entière", () => {
		const averageRate = table({
			scaleType: "averageRate",
			brackets: [
				{ threshold: 0, ratePercent: 1, baseAmount: 0 },
				{ threshold: 10_000, ratePercent: 5, baseAmount: 0 },
			],
		});
		expect(evaluateScale(averageRate, 15_000).tax).toBeCloseTo(750);
	});

	it("interpolé : taux interpolé entre les seuils, appliqué à l'assiette entière ; au-delà du dernier seuil, dernier taux", () => {
		const interpolated = table({
			scaleType: "interpolated",
			brackets: [
				{ threshold: 0, ratePercent: 0, baseAmount: 0 },
				{ threshold: 10_000, ratePercent: 10, baseAmount: 0 },
			],
		});
		expect(evaluateScale(interpolated, 5_000).tax).toBeCloseTo(250); // 5 %
		expect(evaluateScale(interpolated, 20_000).tax).toBeCloseTo(2_000); // 10 %
		// seuils indexés par 2 : le taux de 10 000 se lit à 5 000
		expect(evaluateScale(interpolated, 10_000, 2).tax).toBeCloseTo(500);
	});

	it("assiette nulle ou négative : aucun impôt", () => {
		expect(evaluateScale(table(), 0).tax).toBe(0);
		expect(evaluateScale(table(), -500).tax).toBe(0);
	});

	it("refuse d'indexer les seuils d'un barème marginal", () => {
		expect(() => evaluateScale(table(), 15_000, 2)).toThrow(/marginal/);
	});
});

describe("chaîne de calcul", () => {
	it("impôt de base, puis coefficients cantonal et communal, plus l'impôt fédéral", () => {
		const result = computeIncomeAndWealthTax(
			input({ taxableWealth: 200_000 }),
			scales({}, { multiplier: { income: pct(120), wealth: pct(100) } }),
		);
		expect(result.baseCantonalIncomeTax).toBeCloseTo(500);
		expect(result.baseCantonalWealthTax).toBeCloseTo(1_000);
		expect(result.cantonalTax).toBeCloseTo(500 * 1.2 + 1_000);
		expect(result.municipalTax).toBeCloseTo((500 + 1_000) * 0.5);
		expect(result.federalTax).toBeCloseTo(500);
		expect(result.totalTax).toBeCloseTo(600 + 1_000 + 750 + 500);
	});

	it("arrondit l'assiette cantonale vers le bas au pas déclaré ; le barème fédéral progresse par tranches complètes de 100 CHF, sans arrondi de l'assiette", () => {
		const result = computeIncomeAndWealthTax(
			input({ cantonalTaxableIncome: 15_099, federalTaxableIncome: 15_099 }),
			scales({
				taxBaseRounding: { income: pct(100, "fictive-rounding"), wealth: pct(1_000, "fictive-rounding"), rateDeterminingIncome: null },
				federal: federal(),
			}),
		);
		expect(result.baseCantonalIncomeTax).toBeCloseTo(500); // 15 000
		expect(result.federalTax).toBeCloseTo(500);
	});

	it("le moteur ne lit jamais le code du canton : mêmes barèmes, même résultat", () => {
		const vaud = computeIncomeAndWealthTax(input({ canton: "VD" }), scales());
		const jura = computeIncomeAndWealthTax(input({ canton: "JU" }), scales());
		expect(vaud.totalTax).toBe(jura.totalTax);
	});

	it("impôt paroissial selon la confession, nul sans confession", () => {
		const church = { protestant: pct(10), catholic: pct(20), christianCatholic: pct(30) };
		const withChurch = scales({ church: { income: church, wealth: church } });
		expect(computeIncomeAndWealthTax(input(), withChurch).churchTax).toBe(0);
		expect(computeIncomeAndWealthTax(input({ denomination: "catholic" }), withChurch).churchTax).toBeCloseTo(100);
	});

	it("taxe personnelle forfaitaire ajoutée au total", () => {
		const result = computeIncomeAndWealthTax(input(), scales({ personalTax: pct(30) }));
		expect(result.personalTax).toBe(30);
		expect(result.totalTax).toBeCloseTo(500 + 250 + 500 + 30);
	});

	it("chaque ligne de la trace porte un libellé, une formule et, si elle applique une valeur, sa source", () => {
		const { breakdown } = computeIncomeAndWealthTax(input(), scales());
		expect(breakdown.length).toBeGreaterThan(4);
		for (const entry of breakdown) {
			expect(entry.label.length).toBeGreaterThan(0);
			expect(entry.formula.length).toBeGreaterThan(0);
			expect(Number.isFinite(entry.value)).toBe(true);
		}
		expect(breakdown.filter((entry) => entry.sourceId === null).map((entry) => entry.label)).toEqual(["Impôt total"]);
	});
});

describe("modèles familiaux", () => {
	const married = input({ maritalStatus: "married", cantonalTaxableIncome: 30_000, federalTaxableIncome: 0 });

	it("divisorOnIncomeAndWealth : diviseur × barème(assiette / diviseur) pour les ménages listés", () => {
		const model = scales({
			familyModel: {
				type: "divisorOnIncomeAndWealth",
				sourceId: "fictive-family",
				households: { value: ["married"], sourceId: "fictive-family" },
			},
		}, { income: [table({ rateSplittingDivisor: 2 })] });
		// 2 × barème(15 000) = 2 × 500
		expect(computeIncomeAndWealthTax(married, model).baseCantonalIncomeTax).toBeCloseTo(1_000);
		// personne seule : pas de diviseur, barème(30 000) = 1 000 + 10 000 × 20 %
		expect(
			computeIncomeAndWealthTax({ ...married, maritalStatus: "single" }, model).baseCantonalIncomeTax,
		).toBeCloseTo(3_000);
	});

	it("familyQuotient : diviseur selon la situation, plus une part par enfant", () => {
		const model = scales({
			familyModel: {
				type: "familyQuotient",
				sourceId: "fictive-family",
				coefficients: {
					value: { single: 1, singleWithChildren: 1.5, married: 1.5, perChild: 0.5 },
					sourceId: "fictive-family",
				},
				childReductionCap: null,
			},
		});
		// quotient 1,5 + 0,5 = 2 → 2 × barème(15 000)
		expect(computeIncomeAndWealthTax({ ...married, children: 1 }, model).baseCantonalIncomeTax).toBeCloseTo(1_000);
	});

	it("splittingIncludedInScale : la table du ménage est choisie, le diviseur publié est ignoré", () => {
		const model = scales(
			{ familyModel: { type: "splittingIncludedInScale", sourceId: "fictive-family" } },
			{
				income: [
					table({ households: ["single"], rateSplittingDivisor: 2 }),
					table({
						households: ["married", "singleWithChildren"],
						rateSplittingDivisor: 2,
						brackets: [
							{ threshold: 0, ratePercent: 0, baseAmount: 0 },
							{ threshold: 20_000, ratePercent: 10, baseAmount: 0 },
						],
					}),
				],
			},
		);
		expect(computeIncomeAndWealthTax(married, model).baseCantonalIncomeTax).toBeCloseTo(1_000);
	});

	it("refuse un ménage sans table, ou avec plusieurs", () => {
		const model = scales({}, { income: [table({ households: ["single"] })] });
		expect(() => computeIncomeAndWealthTax(married, model)).toThrow(/0 table/);
	});
});

describe("corrections cantonales", () => {
	it("la réduction de l'impôt de base touche la part cantonale, pas la part communale", () => {
		const result = computeIncomeAndWealthTax(
			input(),
			scales({}, { baseTaxReduction: { value: { ratePercent: 10, appliesTo: ["income"] }, sourceId: "fictive-reduction" } }),
		);
		expect(result.cantonalTax).toBeCloseTo(450);
		expect(result.municipalTax).toBeCloseTo(250);
	});

	it("la part du coefficient hors réduction se calcule sur l'impôt de base non réduit", () => {
		const result = computeIncomeAndWealthTax(
			input(),
			scales({}, {
				baseTaxReduction: { value: { ratePercent: 10, appliesTo: ["income"] }, sourceId: "fictive-reduction" },
				unreducedMultiplier: { value: { income: 2, wealth: 2 }, sourceId: "fictive-unreduced" },
			}),
		);
		expect(result.cantonalTax).toBeCloseTo(500 * 0.9 + 500 * 0.02);
	});

	it("le rabais par enfant se déduit de l'impôt cantonal, sans le rendre négatif", () => {
		const credit = scales({}, { taxCreditPerChild: pct(100, "fictive-credit") });
		expect(computeIncomeAndWealthTax(input({ children: 2 }), credit).cantonalTax).toBeCloseTo(300);
		expect(computeIncomeAndWealthTax(input({ children: 9 }), credit).cantonalTax).toBe(0);
		expect(computeIncomeAndWealthTax(input({ children: 2 }), credit).municipalTax).toBeCloseTo(250);
	});

	it("barème communal propre, puis coefficient communal", () => {
		const result = computeIncomeAndWealthTax(
			input(),
			scales({
				municipality: {
					model: "communalScale",
					income: [table({ scaleType: "averageRate", brackets: [{ threshold: 0, ratePercent: 4, baseAmount: 0 }] })],
					wealth: [table()],
					incomeScaleIndexation: null,
					multiplier: { income: pct(110), wealth: pct(110) },
				},
			}),
		);
		expect(result.municipalTax).toBeCloseTo(15_000 * 0.04 * 1.1);
	});

	it("réduction fédérale par enfant, sans rendre l'impôt négatif", () => {
		const model = scales({ federal: federal({ taxReductionPerDependant: pct(200) }) });
		expect(computeIncomeAndWealthTax(input({ children: 1 }), model).federalTax).toBeCloseTo(300);
		expect(computeIncomeAndWealthTax(input({ children: 5 }), model).federalTax).toBe(0);
	});
});

describe("valeurs à relever (R3)", () => {
	it("lève MissingTaxDataError avec la liste complète des valeurs manquantes, sans résultat partiel", () => {
		const incomplete = scales({
			taxBaseRounding: { income: pending("arrondi"), wealth: pending("arrondi de la fortune"), rateDeterminingIncome: null },
			personalTax: pending("taxe personnelle"),
			federal: federal({ income: pending("barème IFD") }),
		});
		try {
			computeIncomeAndWealthTax(input(), incomplete);
			expect.unreachable("le calcul aurait dû échouer");
		} catch (error) {
			expect(error).toBeInstanceOf(MissingTaxDataError);
			expect((error as MissingTaxDataError).missing.map((item) => item.todo)).toEqual([
				"arrondi",
				"taxe personnelle",
				"barème IFD",
			]);
		}
	});

	it("une valeur à relever dont le cas n'a pas besoin ne bloque pas le calcul", () => {
		const model = scales({}, { taxCreditPerChild: pending("rabais par enfant"), supplementaryWealthTax: pending("fortune") });
		expect(() => computeIncomeAndWealthTax(input({ children: 0, taxableWealth: 0 }), model)).not.toThrow();
		expect(() => computeIncomeAndWealthTax(input({ children: 1 }), model)).toThrow(MissingTaxDataError);
	});
});

describe("fonctions dérivées", () => {
	it("taux marginal : impôt supplémentaire sur 1 000 CHF ajoutés aux deux bases", () => {
		// 15 000 : 10 % cantonal, 5 % communal, 10 % fédéral
		expect(computeMarginalRate(input(), scales()).marginalRatePercent).toBeCloseTo(25);
	});

	it("économie d'impôt : différence de deux impôts totaux, qui voit le franchissement d'une limite de barème", () => {
		const base = input({ cantonalTaxableIncome: 21_000, federalTaxableIncome: 21_000 });
		const { taxSaving, totalTaxBefore, totalTaxAfter } = computeTaxSavingOnDeduction(base, scales(), 2_000);
		expect(taxSaving).toBeCloseTo(totalTaxBefore - totalTaxAfter);
		// 1 000 à 20 % + 1 000 à 10 %, sur chaque étage : 300 cantonal + 150 communal + 300 fédéral
		expect(taxSaving).toBeCloseTo(750);
		// le taux marginal × le montant surestimerait l'économie
		const marginal = computeMarginalRate(base, scales()).marginalRatePercent;
		expect((marginal / 100) * 2_000).toBeGreaterThan(taxSaving);
	});

	it("refuse une déduction négative", () => {
		expect(() => computeTaxSavingOnDeduction(input(), scales(), -1)).toThrow(/Déduction invalide/);
	});
});

describe("impôt fédéral direct", () => {
	const married = input({ maritalStatus: "married" });

	it("le taux s'applique par tranche complète de 100 CHF au-delà du seuil", () => {
		expect(evaluateFederalScale(federalTable(), 15_099, 15).tax).toBeCloseTo(500);
		expect(evaluateFederalScale(federalTable(), 15_100, 15).tax).toBeCloseTo(510);
	});

	it("une ligne sans taux (« - ») n'ajoute aucun montant par tranche", () => {
		expect(evaluateFederalScale(federalTable(), 59_999, 15).tax).toBeCloseTo(8_980);
	});

	it("dès le dernier seuil, le taux maximal s'applique au revenu entier, sans calcul par tranche", () => {
		expect(evaluateFederalScale(federalTable(), 60_000, 15).tax).toBeCloseTo(9_000);
		// par tranche : 9 000 + 100 × 15 = 10 500 ; sur le revenu entier : 10 507,50
		expect(evaluateFederalScale(federalTable(), 70_050, 15).tax).toBeCloseTo(10_507.5);
	});

	it("refuse une dernière ligne qui ne traduit pas le taux maximal", () => {
		expect(() => evaluateFederalScale(federalTable(), 15_000, 11.5)).toThrow(/taux maximal/);
	});

	it("choisit le barème selon la situation de ménage, pas selon le seul état civil", () => {
		const tables = [
			federalTable({ label: "base", appliesTo: ["otherTaxpayer"] }),
			federalTable({
				label: "époux",
				appliesTo: ["marriedCoupleLivingTogether", "livingWithSupportedDependants"],
				brackets: [
					{ threshold: 0, ratePercent: 0, baseAmount: 0 },
					{ threshold: 12_000, ratePercent: 10, baseAmount: 0 },
					{ threshold: 59_900, ratePercent: null, baseAmount: 4_790 },
					{ threshold: 60_000, ratePercent: 15, baseAmount: 9_000 },
				],
			}),
		];
		const model = federal({ income: tables });
		const tax = (overrides: Partial<TaxInput>) => computeFederalIncomeTax(input(overrides), model).federalTax;
		expect(tax({})).toBe(500); // personne seule : barème de base
		expect(tax({ maritalStatus: "married" })).toBe(300); // époux
		expect(tax({ children: 1 })).toBe(300); // enfant en ménage commun, par défaut
		// célibataire avec un enfant qui ne vit pas en ménage commun avec lui : barème de base
		expect(tax({ children: 1, supportedHouseholdMembers: { children: 0, needyPersons: 0 } })).toBe(500);
		// célibataire sans enfant, avec une personne nécessiteuse à charge : barème pour époux
		expect(tax({ supportedHouseholdMembers: { children: 0, needyPersons: 1 } })).toBe(300);
	});

	it("inscrit dans la trace l'hypothèse sur le ménage quand elle n'est pas déclarée", () => {
		const { breakdown } = computeFederalIncomeTax(input({ children: 2 }), federal());
		const choice = breakdown.find((entry) => entry.label === "Barème de l'impôt fédéral direct applicable");
		expect(choice?.assumption).toMatch(/2 enfant\(s\) vivent en ménage commun/);
	});

	it("réduit l'impôt par enfant et par personne nécessiteuse", () => {
		const model = federal({ taxReductionPerDependant: pct(100) });
		const members = { children: 1, needyPersons: 2 };
		expect(computeFederalIncomeTax({ ...married, supportedHouseholdMembers: members }, model).federalTax).toBe(200);
	});

	it("arrondit l'impôt au franc le plus proche", () => {
		// 10 000 + 1 × 10 = 10 ; la réduction de 0,40 donne 9,60
		const model = federal({ taxReductionPerDependant: pct(0.4) });
		expect(
			computeFederalIncomeTax(input({ federalTaxableIncome: 10_100, children: 1 }), model).federalTax,
		).toBe(10);
	});

	it("ne perçoit pas un impôt inférieur au montant minimal, appliqué en fin de calcul", () => {
		const model = federal({ minimumLeviedTax: pct(25) });
		const levied = (federalTaxableIncome: number) =>
			computeFederalIncomeTax(input({ federalTaxableIncome }), model);
		expect(levied(10_200).federalTax).toBe(0); // 20
		expect(levied(10_200).breakdown.at(-1)?.label).toBe("Impôt fédéral direct non perçu");
		expect(levied(10_300).federalTax).toBe(30);
		// 24,60 arrondi à 25 : perçu
		const rounded = federal({ minimumLeviedTax: pct(25), taxReductionPerDependant: pct(5.4) });
		expect(computeFederalIncomeTax(input({ federalTaxableIncome: 10_300, children: 1 }), rounded).federalTax).toBe(25);
	});
});

describe("couverture partielle", () => {
	it("refuse le calcul d'un canton déclaré en couverture partielle, avec la note de couverture", () => {
		const partial = scales({ coverage: { status: "partial", note: "barème non reproduit" } });
		expect(() => computeIncomeAndWealthTax(input({ canton: "VS" }), partial)).toThrow(PartialCoverageError);
		expect(() => computeIncomeAndWealthTax(input({ canton: "VS" }), partial)).toThrow(/barème non reproduit/);
		expect(() => computeMarginalRate(input({ canton: "VS" }), partial)).toThrow(PartialCoverageError);
	});
});

describe("règles cantonales relevées le 28.09.2026", () => {
	const quotientModel = (reference: number) =>
		scales({
			familyModel: {
				type: "familyQuotient",
				sourceId: "fictive-family",
				coefficients: {
					value: { single: 1, singleWithChildren: 1.5, married: 1.5, perChild: 0.5 },
					sourceId: "fictive-family",
				},
				childReductionCap: {
					value: { referenceTaxableIncome: reference, increasePerAdditionalChild: 1_000 },
					sourceId: "fictive-cap",
				},
			},
		});
	const married = input({ maritalStatus: "married", cantonalTaxableIncome: 30_000, federalTaxableIncome: 0 });

	it("quotient familial : plafond non atteint, l'impôt de base reste celui du quotient", () => {
		// réduction à 30 000 : 1,5 × barème(20 000) − 2 × barème(15 000) = 1 500 − 1 000 = 500 ;
		// réduction de référence à 40 000 : 1,5 × barème(26 667) − 2 × barème(20 000) = 3 500 − 2 000 = 1 500
		expect(computeIncomeAndWealthTax({ ...married, children: 1 }, quotientModel(40_000)).baseCantonalIncomeTax).toBeCloseTo(1_000);
	});

	it("quotient familial : plafond atteint pour un enfant, la réduction est ramenée à celle du revenu de référence", () => {
		// référence à 16 000 : 1,5 × barème(10 667) − 2 × barème(8 000) = 100 ; impôt = 1 500 − 100
		expect(computeIncomeAndWealthTax({ ...married, children: 1 }, quotientModel(16_000)).baseCantonalIncomeTax).toBeCloseTo(1_400);
	});

	it("quotient familial : plafond atteint pour plusieurs enfants, calcul refusé tant que la lecture de la loi n'est pas tranchée", () => {
		expect(() => computeIncomeAndWealthTax({ ...married, children: 2 }, quotientModel(16_000))).toThrow(MissingTaxDataError);
	});

	it("l'arrondi de la fortune n'est requis que s'il y a une fortune imposable", () => {
		const model = scales({ taxBaseRounding: { income: pct(1, "fictive-rounding"), wealth: pending("arrondi de la fortune"), rateDeterminingIncome: null } });
		expect(() => computeIncomeAndWealthTax(input({ taxableWealth: 0 }), model)).not.toThrow();
		expect(() => computeIncomeAndWealthTax(input({ taxableWealth: 200_000 }), model)).toThrow(MissingTaxDataError);
	});

	it("le rabais par enfant se déduit de l'impôt cantonal sur le revenu, pas de celui sur la fortune", () => {
		const credit = scales({}, { taxCreditPerChild: pct(1_000, "fictive-credit") });
		// revenu : 500 − 1 000 → 0 ; fortune : 1 000 intacte
		expect(computeIncomeAndWealthTax(input({ children: 1, taxableWealth: 200_000 }), credit).cantonalTax).toBeCloseTo(1_000);
	});

	it("charge fiscale maximale : trace si le plafond ne peut pas jouer, refus s'il peut jouer", () => {
		const burden = (percent: number) =>
			scales({}, { maximumTaxBurden: { value: { percentOfNetTaxableIncome: percent, minimumWealthYieldPercent: 1 }, sourceId: "fictive-burden" } });
		// 15 000 de revenu : cantonal 500 + communal 250 = 750, soit 5 %
		const { breakdown } = computeIncomeAndWealthTax(input(), burden(60));
		expect(breakdown.some((entry) => entry.label === "Charge fiscale maximale")).toBe(true);
		expect(() => computeIncomeAndWealthTax(input(), burden(4))).toThrow(OutOfScopeError);
	});
});

describe("impôt supplémentaire sur la fortune", () => {
	it("s'ajoute à l'impôt cantonal sans coefficient ni réduction, et reste hors de l'impôt communal", () => {
		const supplementary = {
			value: {
				scaleType: "marginal" as const,
				brackets: [
					{ threshold: 0, ratePercent: 0, baseAmount: 0 },
					{ threshold: 100_000, ratePercent: 0.1, baseAmount: 0 },
				],
			},
			sourceId: "fictive-supplementary",
		};
		const model = scales({}, {
			multiplier: { income: pct(200), wealth: pct(200) },
			baseTaxReduction: { value: { ratePercent: 50, appliesTo: ["income", "wealth"] }, sourceId: "fictive-reduction" },
			supplementaryWealthTax: supplementary,
		});
		const withExtra = computeIncomeAndWealthTax(input({ taxableWealth: 200_000 }), model);
		const without = computeIncomeAndWealthTax(input({ taxableWealth: 200_000 }), scales({}, {
			multiplier: { income: pct(200), wealth: pct(200) },
			baseTaxReduction: { value: { ratePercent: 50, appliesTo: ["income", "wealth"] }, sourceId: "fictive-reduction" },
		}));
		// 100 000 × 0,1 % = 100, ajouté tel quel
		expect(withExtra.cantonalTax - without.cantonalTax).toBeCloseTo(100);
		expect(withExtra.municipalTax).toBeCloseTo(without.municipalTax);
	});
});

describe("revenu déterminant pour le taux arrondi", () => {
	it("après division, le taux se lit au revenu déterminant arrondi et s'applique à l'assiette entière", () => {
		const model = scales({
			familyModel: { type: "divisorOnIncomeAndWealth", sourceId: "fictive-family", households: { value: ["married"], sourceId: "fictive-family" } },
			taxBaseRounding: { income: pct(1, "fictive-rounding"), wealth: pct(1, "fictive-rounding"), rateDeterminingIncome: pct(100, "fictive-rounding") },
		}, { income: [table({ rateSplittingDivisor: 2 })] });
		// 30 150 / 2 = 15 075 → 15 000 ; taux moyen à 15 000 : 500 / 15 000 ; impôt = 30 150 × 500 / 15 000 = 1 005
		const married = input({ maritalStatus: "married", cantonalTaxableIncome: 30_150, federalTaxableIncome: 0 });
		expect(computeIncomeAndWealthTax(married, model).baseCantonalIncomeTax).toBeCloseTo(1_005);
	});
});
