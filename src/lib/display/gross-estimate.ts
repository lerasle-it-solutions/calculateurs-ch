/**
 * Estimation du revenu imposable depuis le salaire brut, telle que la page d'un
 * calculateur l'affiche (W08, prompt B2) : défauts publics, revenus imposables
 * estimés et lignes de la trace mises en forme. Sans DOM : le module chargé à
 * la demande (gross-estimator-ui.ts) l'applique au formulaire, les tests le
 * vérifient.
 *
 * Défauts publics (décisions du 11.10.2026), tous modifiables : cotisation LPP
 * au minimum légal, primes d'assurance à la prime moyenne du canton, taux LAA
 * non professionnel nul. Aucune valeur tirée du calculateur de l'AFC.
 */
import {
	estimateTaxableIncome,
	legalMinimumPensionContribution,
	rulesFor,
	type GrossToTaxableRuleSet,
	type Sourced,
} from "../calculations/gross-to-taxable";
import * as labels from "../calculations/gross-to-taxable-labels";
import { formatSwissNumber } from "../format/chf";
import { formatChfAmount } from "./amounts";
import type { BreakdownRow } from "./pillar-3a-buyback";

export type EstimatePerson = {
	grossSalary: number;
	age: number;
	/** Cotisation LPP saisie ; `null` : minimum légal par défaut. */
	pensionContribution: number | null;
};

export type EstimateInput = {
	canton: string;
	married: boolean;
	childrenAges: number[];
	persons: EstimatePerson[];
	/** Primes saisies, par adulte et par enfant ; `null` : prime moyenne du canton. */
	premiums: { perAdult: number; perChild: number } | null;
	/** Taux LAA non professionnel saisi, en pour-cent ; `null` : 0 % par défaut. */
	accidentRatePercent: number | null;
};

export type EstimateDefaults = {
	pensionContributions: number[];
	premiums: { perAdult: number; perChild: number };
	accidentRatePercent: number;
};

export type Estimate = {
	federalTaxableIncome: number;
	cantonalTaxableIncome: number;
	rows: BreakdownRow[];
};

/** Défauts publics pour un canton et des personnes données. */
export function estimateDefaults(ruleSet: GrossToTaxableRuleSet, canton: string, persons: Omit<EstimatePerson, "pensionContribution">[]): EstimateDefaults {
	const premiums = ruleSet.averagePremiums[canton];
	if (!premiums) throw new Error(`Primes moyennes du canton ${canton} absentes.`);
	return {
		pensionContributions: persons.map(
			(person) => legalMinimumPensionContribution(person.grossSalary, person.age, ruleSet.socialInsurance.occupationalPension).contribution,
		),
		premiums: { perAdult: premiums.value.adult, perChild: premiums.value.child },
		accidentRatePercent: 0,
	};
}

const row = (line: { label: string; formula: string; value: number; unit?: string; noAmount?: boolean; assumption?: string }): BreakdownRow => ({
	label: line.label,
	detail: line.formula,
	amount: line.noAmount ? "" : line.unit === "CHF" ? formatChfAmount(line.value) : `${formatSwissNumber(line.value, 2)}${line.unit ? ` ${line.unit}` : ""}`,
	note: line.assumption,
});

/**
 * Revenus imposables estimés. `ordinaryContribution` (A1) : cotisation 3a
 * ordinaire de l'année, versée par hypothèse et retranchée des deux revenus ;
 * `null` (A2) : revenus non diminués, la cotisation étant la déduction dont on
 * calcule l'économie.
 */
export function computeEstimate(input: EstimateInput, ruleSet: GrossToTaxableRuleSet, ordinaryContribution: Sourced<number> | null): Estimate {
	const defaults = estimateDefaults(ruleSet, input.canton, input.persons);
	const result = estimateTaxableIncome(
		{
			maritalStatus: input.married ? "married" : "single",
			childrenAges: input.childrenAges,
			earners: input.persons.map((person) => ({
				grossSalary: person.grossSalary,
				age: person.age,
				...(person.pensionContribution === null ? {} : { occupationalPensionContribution: person.pensionContribution }),
			})),
			nonOccupationalAccidentRate: {
				value: (input.accidentRatePercent ?? defaults.accidentRatePercent) / 100,
				assumption: input.accidentRatePercent === null ? labels.ACCIDENT_RATE_PUBLIC_DEFAULT : labels.USER_VALUE,
			},
			insurancePremiums: {
				...(input.premiums ?? defaults.premiums),
				assumption: input.premiums === null ? labels.PREMIUMS_PUBLIC_DEFAULT : labels.USER_VALUE,
			},
		},
		rulesFor(ruleSet, input.canton),
	);
	const rows = result.breakdown.map(row);
	if (!ordinaryContribution) {
		return { federalTaxableIncome: result.federalTaxableIncome, cantonalTaxableIncome: result.cantonalTaxableIncome, rows };
	}
	const amount = ordinaryContribution.value;
	const federalTaxableIncome = Math.max(0, result.federalTaxableIncome - amount);
	const cantonalTaxableIncome = Math.max(0, result.cantonalTaxableIncome - amount);
	const fmt = (value: number) => formatSwissNumber(value, 2);
	rows.push(
		row({
			label: labels.ORDINARY_CONTRIBUTION,
			formula: fmt(amount),
			value: amount,
			unit: "CHF",
			assumption: input.married
				? `${labels.ORDINARY_CONTRIBUTION_ASSUMPTION} ${labels.ORDINARY_CONTRIBUTION_COUPLE}`
				: labels.ORDINARY_CONTRIBUTION_ASSUMPTION,
		}),
		row({ label: labels.FEDERAL_TAXABLE_INCOME_USED, formula: `${fmt(result.federalTaxableIncome)} − ${fmt(amount)}`, value: federalTaxableIncome, unit: "CHF" }),
		row({ label: labels.CANTONAL_TAXABLE_INCOME_USED, formula: `${fmt(result.cantonalTaxableIncome)} − ${fmt(amount)}`, value: cantonalTaxableIncome, unit: "CHF" }),
	);
	return { federalTaxableIncome, cantonalTaxableIncome, rows };
}
