import { existsSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { getFederalData } from "../../src/data";
import { getGrossToTaxableData } from "../../src/data/gross-to-taxable";
import {
	estimateTaxableIncome,
	legalMinimumPensionContribution,
	type GrossToTaxableParams,
} from "../../src/lib/calculations/gross-to-taxable";
import * as labels from "../../src/lib/calculations/gross-to-taxable-labels";
import { caseLabel, privateReferenceFileExists, PRIVATE_REFERENCE_PATH, readReferenceFile } from "./reference-file";

/**
 * Estimateur du revenu imposable (W08, prompt B1), contre les 18 cas de
 * référence de 2026 (blocs grossInput, estvIntermediate et engineInput).
 *
 * - Chaîne jusqu'au revenu net : à 1 CHF près, cotisation LPP saisie (celle de
 *   estvIntermediate, comme sur une fiche de salaire).
 * - Revenus imposables fédéral et cantonal : à 2 % près de engineInput.
 * - Défauts du calculateur de l'AFC (taux LAA, primes) : lus dans le fichier
 *   privé estimator-defaults.json, tirés des cas de référence (décisions des 07
 *   et 11.10.2026).
 * - Cotisation LPP par défaut (minimum légal) : identique à celle de l'AFC pour
 *   les cas 1 à 12 ; au-delà du salaire maximal assuré (cas 13 à 18), l'AFC
 *   compte davantage que le minimum légal. L'écart est constaté, pas masqué.
 */
const DEFAULTS_PATH = new URL("./private/estimator-defaults.json", import.meta.url);
const hasPrivateFiles = privateReferenceFileExists() && existsSync(DEFAULTS_PATH);

type Estv = {
	ahvIvEoContribution: number;
	alvContribution: number;
	nonOccupationalAccidentContribution: number;
	bvgContribution: number;
	netIncome: number;
};
type Defaults = { nonOccupationalAccidentRate: { value: number }; insurancePremiums: { perAdult: number; perChild: number } };

const TOLERANCE = 0.02;
const YEAR = 2026;

describe.skipIf(!hasPrivateFiles)("estimateur du revenu imposable, 18 cas de référence 2026", () => {
	const cases = readReferenceFile(PRIVATE_REFERENCE_PATH).cases ?? [];
	const defaults = hasPrivateFiles ? (JSON.parse(readFileSync(DEFAULTS_PATH, "utf8")) as Defaults) : null;

	/** Paramètres d'un cas : un couple marié a des cotisations exprimées par conjoint, sur la moitié du revenu brut. */
	const paramsOf = (referenceCase: (typeof cases)[number], withAfcPension: boolean): GrossToTaxableParams => {
		const taxpayer = referenceCase.taxpayer as { maritalStatus: "single" | "married"; age: number; childrenAges?: number[] };
		const gross = referenceCase.grossInput as { grossIncome: number; deductionsArePerSpouse: boolean };
		const estv = referenceCase.estvIntermediate as Estv;
		const married = taxpayer.maritalStatus === "married";
		const perEarner = gross.deductionsArePerSpouse ? gross.grossIncome / 2 : gross.grossIncome;
		const earner = {
			grossSalary: perEarner,
			age: taxpayer.age,
			...(withAfcPension ? { occupationalPensionContribution: estv.bvgContribution } : {}),
		};
		return {
			maritalStatus: taxpayer.maritalStatus,
			childrenAges: taxpayer.childrenAges ?? [],
			earners: married ? [earner, { ...earner }] : [earner],
			nonOccupationalAccidentRate: { value: defaults!.nonOccupationalAccidentRate.value, assumption: labels.AFC_CHAIN_ASSUMPTION },
			insurancePremiums: { ...defaults!.insurancePremiums, assumption: labels.AFC_CHAIN_ASSUMPTION },
		};
	};
	const run = (referenceCase: (typeof cases)[number], withAfcPension = true) =>
		estimateTaxableIncome(
			paramsOf(referenceCase, withAfcPension),
			getGrossToTaxableData(YEAR, (referenceCase.municipality as { canton: "VD" }).canton),
		);

	it("le fichier compte 18 cas", () => {
		expect(cases).toHaveLength(18);
	});

	it.each(cases.map((referenceCase, index) => [caseLabel(referenceCase, index), referenceCase] as const))(
		"%s : cotisations et revenu net à 1 CHF près, par personne",
		(_, referenceCase) => {
			const estv = referenceCase.estvIntermediate as Estv;
			for (const earner of run(referenceCase).earners) {
				expect(Math.abs(earner.oldAgeSurvivors + earner.disability + earner.incomeCompensation - estv.ahvIvEoContribution)).toBeLessThanOrEqual(1);
				expect(Math.abs(earner.unemployment - estv.alvContribution)).toBeLessThanOrEqual(1);
				expect(Math.abs(earner.nonOccupationalAccident - estv.nonOccupationalAccidentContribution)).toBeLessThanOrEqual(1);
				expect(earner.occupationalPension).toBe(estv.bvgContribution);
				expect(Math.abs(earner.netEarnedIncome - estv.netIncome)).toBeLessThanOrEqual(1);
			}
		},
	);

	it.each(cases.map((referenceCase, index) => [caseLabel(referenceCase, index), referenceCase] as const))(
		"%s : revenus imposables fédéral et cantonal à 2 % près",
		(_, referenceCase) => {
			const expected = referenceCase.engineInput as { federalTaxableIncome: number; cantonalTaxableIncome: number };
			const result = run(referenceCase);
			expect(Math.abs(result.federalTaxableIncome - expected.federalTaxableIncome) / expected.federalTaxableIncome).toBeLessThanOrEqual(TOLERANCE);
			expect(Math.abs(result.cantonalTaxableIncome - expected.cantonalTaxableIncome) / expected.cantonalTaxableIncome).toBeLessThanOrEqual(TOLERANCE);
			expect(result.isEstimate).toBe(true);
		},
	);

	it("cotisation LPP par défaut (minimum légal) : identique à celle de l'AFC pour les cas 1 à 12", () => {
		for (const referenceCase of cases.slice(0, 12)) {
			const estv = referenceCase.estvIntermediate as Estv;
			for (const earner of run(referenceCase, false).earners) expect(earner.occupationalPension).toBe(estv.bvgContribution);
		}
	});

	it("cas 13 à 18, au-delà du salaire maximal assuré : l'AFC compte davantage que le minimum légal (écart documenté)", () => {
		const pension = getGrossToTaxableData(YEAR, "VD").socialInsurance.occupationalPension;
		for (const referenceCase of cases.slice(12)) {
			const estv = referenceCase.estvIntermediate as Estv;
			const [earner] = run(referenceCase, false).earners;
			const gross = (referenceCase.grossInput as { grossIncome: number }).grossIncome;
			// Minimum légal : salaire coordonné plafonné à la borne supérieure de l'art. 8 LPP
			expect(gross).toBeGreaterThan(pension.upperSalaryLimit.value);
			expect(earner!.occupationalPension).toBe(legalMinimumPensionContribution(gross, (referenceCase.taxpayer as { age: number }).age, pension).contribution);
			// Constat : la chaîne de l'AFC retient une cotisation plus élevée, hypothèse propre non légale
			expect(estv.bvgContribution).toBeGreaterThan(earner!.occupationalPension);
		}
	});

	it("la trace déclare les hypothèses : valeurs par défaut de l'AFC, aucuns frais de transport, de repas ni de garde, estimation", () => {
		const { breakdown } = run(cases[0]!, false);
		const assumptions = breakdown.map((line) => line.assumption ?? "");
		expect(assumptions.filter((text) => text === labels.AFC_CHAIN_ASSUMPTION).length).toBeGreaterThanOrEqual(3);
		expect(assumptions).toContain(labels.NO_TRANSPORT_MEALS_CHILDCARE);
		expect(assumptions.some((text) => text.startsWith(labels.LPP_DEFAULT_ASSUMPTION_START))).toBe(true);
		expect(assumptions.filter((text) => text === labels.ESTIMATE)).toHaveLength(2);
	});
});

describe("estimateur : paramètres et règles", () => {
	it("le nombre de personnes suit l'état civil", () => {
		const data = getGrossToTaxableData(YEAR, "VD");
		const earner = { grossSalary: 50_000, age: 30 };
		const base = {
			childrenAges: [],
			nonOccupationalAccidentRate: { value: 0, assumption: labels.USER_VALUE },
			insurancePremiums: { perAdult: 0, perChild: 0, assumption: labels.USER_VALUE },
		};
		expect(() => estimateTaxableIncome({ ...base, maritalStatus: "married", earners: [earner] }, data)).toThrow(/2 personne/);
		expect(() => estimateTaxableIncome({ ...base, maritalStatus: "single", earners: [earner, earner] }, data)).toThrow(/1 personne/);
	});

	it("Genève : plafond des primes de 8 760 par adulte et 17 520 pour un couple, jamais 2 × 17 520", () => {
		const data = getGrossToTaxableData(YEAR, "GE");
		const premiumsLine = (maritalStatus: "single" | "married") => {
			const earner = { grossSalary: 90_000, age: 40 };
			const { breakdown } = estimateTaxableIncome(
				{
					maritalStatus,
					childrenAges: [],
					earners: maritalStatus === "married" ? [earner, { ...earner }] : [earner],
					nonOccupationalAccidentRate: { value: 0, assumption: labels.USER_VALUE },
					// Primes payées au-delà de tout plafond : la déduction vaut le plafond
					insurancePremiums: { perAdult: 20_000, perChild: 0, assumption: labels.USER_VALUE },
				},
				data,
			);
			return breakdown.find((line) => line.label === `${labels.INSURANCE_PREMIUMS}, ${labels.CANTON}`)!.value;
		};
		// Décision du 11.10.2026 : « Prime moyenne adulte » de cantons/ge.json est le montant d'un couple
		const couple = data.cantonal.insurancePremiums.married.bothWithPension.value;
		expect(premiumsLine("married")).toBe(couple);
		expect(premiumsLine("single")).toBe(couple / 2);
		expect(premiumsLine("married")).not.toBe(2 * couple);
		// Recoupement : deux fois la prime adulte genevoise de l'ordonnance du DFI (federal/2026.json)
		const ordinance = getFederalData(YEAR).averageHealthInsurancePremiums as { GE: { value: { adult: number } } };
		expect(couple).toBe(2 * ordinance.GE.value.adult);
	});

	it("sous le seuil d'entrée LPP, aucune cotisation par défaut", () => {
		const pension = getGrossToTaxableData(YEAR, "VD").socialInsurance.occupationalPension;
		expect(legalMinimumPensionContribution(pension.entryThreshold.value, 40, pension).contribution).toBe(0);
	});

	it("2027 n'est pas relevé : l'estimateur s'arrête au lieu de supposer", () => {
		expect(() => getGrossToTaxableData(2027, "VD")).toThrow(/non relevées|pour 2026/);
	});
});
