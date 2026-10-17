/**
 * A2 — du formulaire au résultat affiché : ménage et revenus imposables
 * (calculator-form.ts), conditions et versement de chaque personne, puis
 * displayPillar3aTaxSaving. Sans DOM : la construction l'exécute sur le cas
 * exemple, le script de la page à chaque saisie.
 */
import type { Pillar3aContributor } from "../calculations/pension/pillar-3a-tax-saving";
import {
	amountOf,
	emptyOutcome,
	readHousehold,
	withEstimate,
	type EstimateReading,
	type FormOutcome,
	type FormValues,
	type HouseholdPageData,
} from "./calculator-form";
import { displayPillar3aTaxSaving, type Pillar3aTaxSavingDisplayTexts, type Pillar3aTaxSavingSummary } from "./pillar-3a-tax-saving";

type Sourced = { value: number; sourceId: string };

export type Pillar3aTaxSavingPageData = HouseholdPageData & {
	taxYear: number;
	smallContributionCap: Sourced;
	largeContributionCap: Sourced;
	largeContributionIncomeRate: Sourced;
	ruleSources: { ordinance: string; circular: string };
	texts: Pillar3aTaxSavingDisplayTexts & {
		earnedIncomeMissing: string;
		earnedIncomeMissingShort: string;
		/** « {amount} » remplacé par l'excédent. */
		excessWarning: string;
	};
};

/** Nom d'un champ de personne : « affiliated » pour vous, « spouseAffiliated » pour le conjoint ou partenaire. */
export const personField = (prefix: "" | "spouse", name: string): string =>
	prefix === "" ? name : `${prefix}${name[0]!.toUpperCase()}${name.slice(1)}`;

export function readPillar3aTaxSavingForm(
	values: FormValues,
	data: Pillar3aTaxSavingPageData,
	estimate?: EstimateReading,
): FormOutcome<Pillar3aTaxSavingSummary> {
	const household = readHousehold(values, data, data.taxYear, estimate);
	if ("outcome" in household) return household.outcome;

	const contributor = (prefix: "" | "spouse"): Pillar3aContributor | null => {
		const key = (name: string) => personField(prefix, name);
		const affiliated = values[key("affiliated")] !== "no";
		const hasAvsIncome = values[key("hasAvsIncome")] !== "no";
		const reachedReferenceAge = values[key("reachedReferenceAge")] === "yes";
		const workingWithinFiveYearsOfReferenceAge = values[key("workingAfterReferenceAge")] === "yes";
		const income = amountOf(values[key("earnedIncome")]);
		// Le revenu n'est requis que si la personne peut déduire : sans caisse de pension et conditions remplies
		const eligible = hasAvsIncome && (!reachedReferenceAge || workingWithinFiveYearsOfReferenceAge);
		const incomeGiven = Number.isFinite(income);
		if (!affiliated && eligible && !incomeGiven) return null;
		const contribution = amountOf(values[key("contribution")]);
		return {
			affiliated,
			earnedIncome: affiliated || !incomeGiven ? null : income,
			contribution: Number.isFinite(contribution) ? Math.max(0, contribution) : 0,
			hasAvsIncome,
			reachedReferenceAge,
			workingWithinFiveYearsOfReferenceAge,
		};
	};
	const married = household.taxInput.maritalStatus === "married";
	const contributors = (married ? (["", "spouse"] as const) : ([""] as const)).map(contributor);
	if (contributors.some((entry) => entry === null)) {
		return emptyOutcome({ text: data.texts.earnedIncomeMissing, short: data.texts.earnedIncomeMissingShort });
	}

	const shown = displayPillar3aTaxSaving(
		{
			taxInput: household.taxInput,
			scales: household.scales,
			smallContributionCap: data.smallContributionCap,
			largeContributionCap: data.largeContributionCap,
			largeContributionIncomeRate: data.largeContributionIncomeRate,
			contributors: contributors as Pillar3aContributor[],
			ruleSources: data.ruleSources,
		},
		data.texts,
		data.officialCalculators,
	);
	// Bouton « Verser le maximum » de chaque personne : le plafond retenu par le moteur, masqué s'il est nul
	const maxima = Object.fromEntries(
		(married ? (["", "spouse"] as const) : ([""] as const)).map((prefix, index) => {
			const cap = shown.caps?.[index] ?? null;
			return [personField(prefix, "contribution"), cap ? cap : null];
		}),
	);
	return { ...withEstimate(household, data, shown, shown.summary), maxima };
}
