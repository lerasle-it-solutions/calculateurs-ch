import { describe, expect, it } from "vitest";

import { getCantonData, getFederalData, getMunicipalMultipliers } from "../../../src/data";
import { getTaxScales } from "../../../src/data/tax-scales";
import { computeIncomeTaxSaving } from "../../../src/lib/calculations/pension/income-tax-saving";
import {
	computePillar3aTaxSaving,
	type Pillar3aContributor,
	type Pillar3aTaxSavingParams,
} from "../../../src/lib/calculations/pension/pillar-3a-tax-saving";
import { PartialCoverageError, type TaxInput } from "../../../src/lib/calculations/tax";
import * as labels from "../../../src/lib/calculations/pension/pillar-3a-tax-saving-labels";
import { pillar3aTaxSavingTexts } from "../../../src/calculators/pension/pillar-3a-tax-saving";
import { formatChfAmount } from "../../../src/lib/display/pillar-3a-buyback";
import { displayPillar3aTaxSaving } from "../../../src/lib/display/pillar-3a-tax-saving";
import type { StatusLink } from "../../../src/lib/display/result-card";

/**
 * A2 — règles 1 à 8 de la fiche validée le 07.10.2026, chacune par au moins un
 * cas. Plafonds et taux lus dans les données 2026 (R2) : aucun montant attendu
 * n'est recopié de mémoire. L'économie de référence d'un cas se recalcule par la
 * même différence de deux impôts (`computeIncomeTaxSaving`), sur la déduction
 * attendue par la règle.
 */
const YEAR = 2026;
const pillar3a = getFederalData(YEAR).pillar3a;
const sourced = (value: { value: number; sourceId: string }) => ({ value: value.value, sourceId: value.sourceId });
const small = sourced(pillar3a.smallContributionCap);
const large = sourced(pillar3a.largeContributionCap);
const rate = sourced(pillar3a.largeContributionIncomeRate);

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
	federalTaxableIncome: 67_927,
	cantonalTaxableIncome: 65_167,
	taxableWealth: 0,
	...overrides,
});

/** Conditions personnelles des règles 3 et 4 : par défaut, revenu soumis à l'AVS, âge de référence non atteint. */
type Conditions = Partial<Pick<Pillar3aContributor, "hasAvsIncome" | "reachedReferenceAge" | "workingWithinFiveYearsOfReferenceAge">>;
const eligible = { hasAvsIncome: true, reachedReferenceAge: false, workingWithinFiveYearsOfReferenceAge: false };

const affiliated = (contribution: number, conditions: Conditions = {}): Pillar3aContributor => ({
	affiliated: true,
	earnedIncome: null,
	contribution,
	...eligible,
	...conditions,
});
const notAffiliated = (earnedIncome: number, contribution: number, conditions: Conditions = {}): Pillar3aContributor => ({
	affiliated: false,
	earnedIncome,
	contribution,
	...eligible,
	...conditions,
});

const params = (
	input: TaxInput,
	contributors: Pillar3aContributor[],
	overrides: Partial<Pillar3aTaxSavingParams> = {},
): Pillar3aTaxSavingParams => ({
	taxInput: input,
	scales: getTaxScales(input),
	smallContributionCap: small,
	largeContributionCap: large,
	largeContributionIncomeRate: rate,
	contributors,
	ruleSources: { ordinance: "opp3-art-7a", circular: "afc-circular-18a" },
	...overrides,
});

const run = (input: TaxInput, contributors: Pillar3aContributor[], overrides: Partial<Pillar3aTaxSavingParams> = {}) =>
	computePillar3aTaxSaving(params(input, contributors, overrides));

/** Économie de référence : même différence de deux impôts, sur la déduction attendue. */
const expectedSaving = (input: TaxInput, deduction: number) =>
	computeIncomeTaxSaving(input, getTaxScales(input), deduction, labels.NO_DEDUCTION).taxSaving;

const texts = {
	outOfScope: { VS: pillar3aTaxSavingTexts.outOfScope("Valais") },
	outOfScopeMunicipality: { "Brig-Glis": pillar3aTaxSavingTexts.outOfScopeMunicipality("Brig-Glis") },
	missingData: pillar3aTaxSavingTexts.missingData,
	outOfScopeShort: pillar3aTaxSavingTexts.outOfScopeShort,
	missingDataShort: pillar3aTaxSavingTexts.missingDataShort,
	blockedShort: pillar3aTaxSavingTexts.blockedShort,
};
const official = getCantonData("VS").coverage?.officialCalculator;
const officialCalculators: Record<string, StatusLink> = official && "url" in official ? { VS: official } : {};

describe("A2, règle 1 : plafond selon l'affiliation à un 2e pilier", () => {
	it("affilié : la petite cotisation ; même économie qu'A1 pour la même déduction à Lausanne (1’842)", () => {
		const input = taxInput("Lausanne", "VD");
		const result = run(input, [affiliated(small.value)]);
		expect(result.contributors[0]).toEqual({ blockedReason: null, cap: small.value, contribution: small.value, deductible: small.value, excess: 0 });
		expect(result.deduction).toBe(small.value);
		// A1 donne 1 842 CHF pour un rachat de la petite cotisation sur ces revenus (tests d'A1)
		expect(result.taxSaving).toBe(1_842);
		expect(result.taxSaving).toBe(result.cantonalAndMunicipalSaving + result.federalSaving);
		expect(result.effectiveRate).toBeCloseTo(1_842 / small.value, 10);
	});

	it("non affilié : la part du revenu de l'activité lucrative, sous la grande cotisation", () => {
		const input = taxInput("Lausanne", "VD");
		const income = 30_000;
		const result = run(input, [notAffiliated(income, income * rate.value)]);
		expect(result.contributors[0]!.cap).toBe(income * rate.value);
		expect(result.deduction).toBe(income * rate.value);
		expect(result.taxSaving).toBe(expectedSaving(input, income * rate.value));
	});

	it("non affilié à haut revenu : au plus la grande cotisation", () => {
		const input = taxInput("Lausanne", "VD", { federalTaxableIncome: 250_000, cantonalTaxableIncome: 245_000 });
		const result = run(input, [notAffiliated(400_000, large.value)]);
		expect(400_000 * rate.value).toBeGreaterThan(large.value);
		expect(result.contributors[0]!.cap).toBe(large.value);
		expect(result.deduction).toBe(large.value);
	});

	it("rentier LPP non affilié, encore actif moins de cinq ans après l'âge de référence : plafond des non-affiliés", () => {
		const input = taxInput("Lausanne", "VD");
		const income = 40_000;
		const result = run(input, [
			notAffiliated(income, small.value, { reachedReferenceAge: true, workingWithinFiveYearsOfReferenceAge: true }),
		]);
		expect(result.blockedReason).toBeNull();
		expect(result.contributors[0]!.cap).toBe(income * rate.value);
		expect(result.deduction).toBe(Math.min(small.value, income * rate.value));
		expect(result.breakdown.some((line) => line.label === labels.AFTER_REFERENCE_AGE_ALLOWED)).toBe(true);
	});
});

describe("A2, règle 2 : revenu de l'activité lucrative des non-affiliés", () => {
	it("résultat d'activité négatif : aucune déduction, aucune économie", () => {
		const result = run(taxInput("Lausanne", "VD"), [notAffiliated(-12_000, 3_000)]);
		expect(result.contributors[0]).toEqual({ blockedReason: null, cap: 0, contribution: 3_000, deductible: 0, excess: 3_000 });
		expect(result.deduction).toBe(0);
		expect(result.taxSaving).toBe(0);
		expect(result.effectiveRate).toBeNull();
		expect(result.breakdown.some((line) => line.assumption === labels.NEGATIVE_EARNED_INCOME_ASSUMPTION)).toBe(true);
	});

	it("le revenu saisi et sa définition (circulaire 18a, ch. 5.5) figurent dans la trace", () => {
		const result = run(taxInput("Lausanne", "VD"), [notAffiliated(30_000, 1_000)]);
		const incomeLine = result.breakdown.find((line) => line.label === "Revenu de l'activité lucrative")!;
		expect(incomeLine).toMatchObject({ value: 30_000, sourceId: "afc-circular-18a", assumption: labels.EARNED_INCOME_ASSUMPTION });
	});
});

describe("A2, règle 3 : revenu soumis à l'AVS l'année du versement", () => {
	it("sans revenu soumis à l'AVS : aucune déduction, et le résultat l'explique", () => {
		const input = taxInput("Lausanne", "VD");
		const result = run(input, [affiliated(small.value, { hasAvsIncome: false })]);
		expect(result.blockedReason).toBe(labels.NO_AVS_INCOME);
		expect(result.deduction).toBe(0);
		expect(result.taxSaving).toBe(0);
		const shown = displayPillar3aTaxSaving(params(input, [affiliated(small.value, { hasAvsIncome: false })]), texts, officialCalculators);
		expect(shown.status).toEqual({ text: labels.NO_AVS_INCOME, short: pillar3aTaxSavingTexts.blockedShort });
		expect(shown.summary).toBeNull();
		expect(shown.breakdown[0]).toMatchObject({ label: labels.DEDUCTION_BLOCKED, detail: labels.NO_AVS_INCOME });
	});
});

describe("A2, règle 4 : après l'âge de référence AVS", () => {
	it("âge atteint, sans activité ou depuis cinq ans ou plus : aucune déduction", () => {
		const result = run(taxInput("Lausanne", "VD"), [
			affiliated(small.value, { reachedReferenceAge: true, workingWithinFiveYearsOfReferenceAge: false }),
		]);
		expect(result.blockedReason).toBe(labels.AFTER_REFERENCE_AGE_BLOCKED);
		expect(result.deduction).toBe(0);
		expect(result.taxSaving).toBe(0);
	});

	it("âge atteint, encore actif depuis moins de cinq ans : cotisation possible", () => {
		const input = taxInput("Lausanne", "VD");
		const result = run(input, [
			affiliated(small.value, { reachedReferenceAge: true, workingWithinFiveYearsOfReferenceAge: true }),
		]);
		expect(result.blockedReason).toBeNull();
		expect(result.taxSaving).toBe(expectedSaving(input, small.value));
	});
});

describe("A2, règles 5 et 8 : mentions du résultat", () => {
	it("année de cessation de l'activité (art. 7 al. 4) et versement crédité au plus tard le 31 décembre (ch. 5.1)", () => {
		const reminders = pillar3aTaxSavingTexts.reminders.join(" ");
		expect(reminders).toMatch(/cessez votre activité lucrative.*cotisation entière reste déductible.*art\. 7 al\. 4 OPP 3/);
		expect(reminders).toMatch(/au plus tard le 31 décembre \(circulaire AFC n° 18a, ch\. 5\.1\)/);
	});
});

describe("A2, règle 6 : couple marié ou partenaires enregistrés", () => {
	it("deux affiliations différentes : chacun son plafond, l'économie porte sur la somme", () => {
		const input = taxInput("Lausanne", "VD", { maritalStatus: "married", federalTaxableIncome: 120_000, cantonalTaxableIncome: 115_000 });
		const spouseIncome = 20_000;
		const result = run(input, [affiliated(small.value), notAffiliated(spouseIncome, 5_000)]);
		expect(result.contributors[0]).toMatchObject({ cap: small.value, deductible: small.value });
		expect(result.contributors[1]).toMatchObject({ cap: spouseIncome * rate.value, deductible: spouseIncome * rate.value });
		expect(result.deduction).toBe(small.value + spouseIncome * rate.value);
		expect(result.taxSaving).toBe(expectedSaving(input, small.value + spouseIncome * rate.value));
		expect(result.breakdown.some((line) => line.label === labels.TOTAL_DEDUCTION)).toBe(true);
	});

	it("un seul conjoint a un revenu soumis à l'AVS : l'autre n'a pas de déduction, l'économie est celle de la seule déduction du premier", () => {
		const input = taxInput("Lausanne", "VD", { maritalStatus: "married", federalTaxableIncome: 120_000, cantonalTaxableIncome: 115_000 });
		const result = run(input, [affiliated(small.value), affiliated(small.value, { hasAvsIncome: false })]);
		expect(result.blockedReason).toBeNull();
		expect(result.contributors[0]).toMatchObject({ blockedReason: null, deductible: small.value });
		expect(result.contributors[1]).toMatchObject({ blockedReason: labels.NO_AVS_INCOME, deductible: 0, excess: 0 });
		expect(result.deduction).toBe(small.value);
		expect(result.taxSaving).toBe(expectedSaving(input, small.value));
		expect(result.breakdown.find((line) => line.formula === labels.NO_AVS_INCOME)?.label).toBe(
			`${labels.DEDUCTION_BLOCKED}, ${labels.CONTRIBUTOR_SPOUSE}`,
		);
	});

	it("un conjoint a atteint l'âge de référence sans activité : l'économie est celle de la seule déduction de l'autre", () => {
		const input = taxInput("Lausanne", "VD", { maritalStatus: "married", federalTaxableIncome: 120_000, cantonalTaxableIncome: 115_000 });
		const spouseIncome = 20_000;
		const result = run(input, [
			affiliated(small.value, { reachedReferenceAge: true, workingWithinFiveYearsOfReferenceAge: false }),
			notAffiliated(spouseIncome, 5_000),
		]);
		expect(result.blockedReason).toBeNull();
		expect(result.contributors[0]).toMatchObject({ blockedReason: labels.AFTER_REFERENCE_AGE_BLOCKED, deductible: 0, excess: 0 });
		expect(result.contributors[1]).toMatchObject({ blockedReason: null, deductible: spouseIncome * rate.value });
		expect(result.deduction).toBe(spouseIncome * rate.value);
		expect(result.taxSaving).toBe(expectedSaving(input, spouseIncome * rate.value));
	});

	it("aucun des deux ne remplit les conditions : aucune déduction, le motif de chacun est affiché", () => {
		const input = taxInput("Lausanne", "VD", { maritalStatus: "married", federalTaxableIncome: 120_000, cantonalTaxableIncome: 115_000 });
		const contributors = [
			affiliated(small.value, { hasAvsIncome: false }),
			affiliated(small.value, { reachedReferenceAge: true, workingWithinFiveYearsOfReferenceAge: false }),
		];
		const result = run(input, contributors);
		expect(result.deduction).toBe(0);
		expect(result.taxSaving).toBe(0);
		expect(result.blockedReason).toBe(
			`${labels.PERSON_YOU} : ${labels.NO_AVS_INCOME} ${labels.PERSON_SPOUSE} : ${labels.AFTER_REFERENCE_AGE_BLOCKED}`,
		);
		const shown = displayPillar3aTaxSaving(params(input, contributors), texts, officialCalculators);
		expect(shown.status?.text).toBe(result.blockedReason);
	});

	it("le nombre de personnes suit l'état civil", () => {
		expect(() => run(taxInput("Lausanne", "VD", { maritalStatus: "married" }), [affiliated(1_000)])).toThrow(/2 personne/);
		expect(() => run(taxInput("Lausanne", "VD"), [affiliated(1_000), affiliated(1_000)])).toThrow(/1 personne/);
	});
});

describe("A2, règle 7 : montant au-delà du plafond", () => {
	it("ramené au plafond, avec l'excédent à rembourser par la fondation", () => {
		const input = taxInput("Lausanne", "VD");
		const contribution = small.value + 2_000;
		const result = run(input, [affiliated(contribution)]);
		expect(result.deduction).toBe(small.value);
		expect(result.excess).toBe(2_000);
		expect(result.taxSaving).toBe(expectedSaving(input, small.value));
		const line = result.breakdown.find((entry) => entry.label === "Montant déductible retenu")!;
		expect(line.assumption).toMatch(/excédent de 2’000 CHF n'est pas déductible et doit être remboursé par la fondation.*ch\. 9\.1/);
		const shown = displayPillar3aTaxSaving(params(input, [affiliated(contribution)]), texts, officialCalculators);
		expect(shown.summary?.excess).toBe("2’000 CHF");
		expect(shown.summary?.deduction).toBe(formatChfAmount(small.value));
	});
});

describe("A2, hors périmètre valaisan", () => {
	it("couple marié à Sion : message de couverture du canton et lien officiel, aucune économie chiffrée", () => {
		const input = taxInput("Sion", "VS", { maritalStatus: "married" });
		expect(() => run(input, [affiliated(small.value), affiliated(small.value)])).toThrow(PartialCoverageError);
		const shown = displayPillar3aTaxSaving(params(input, [affiliated(small.value), affiliated(small.value)]), texts, officialCalculators);
		expect(shown.status?.text).toBe(texts.outOfScope.VS);
		expect(shown.status?.link).toEqual(officialCalculators.VS);
		expect(shown.status?.short).toBe(pillar3aTaxSavingTexts.outOfScopeShort);
		expect(shown.value).toBe("—");
		expect(shown.breakdown).toEqual([]);
		expect(shown.summary).toBeNull();
	});

	it("commune sans indexation relevée, même sans déduction : message de la commune", () => {
		const input = taxInput("Brig-Glis", "VS");
		const shown = displayPillar3aTaxSaving(params(input, [affiliated(0, { hasAvsIncome: false })]), texts, officialCalculators);
		expect(shown.status?.text).toBe(texts.outOfScopeMunicipality["Brig-Glis"]);
	});
});
