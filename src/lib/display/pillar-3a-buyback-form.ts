/**
 * A1 — du formulaire au résultat affiché : ménage et revenus imposables
 * (calculator-form.ts), lacunes saisies année par année, puis
 * displayPillar3aBuyback. Sans DOM : la construction l'exécute sur le cas
 * exemple, le script de la page à chaque saisie.
 */
import type { Pillar3aGapYearInput } from "../calculations/pension/pillar-3a-buyback";
import { readHousehold, withEstimate, type EstimateReading, type FormOutcome, type FormValues, type HouseholdPageData } from "./calculator-form";
import { displayPillar3aBuyback, type Pillar3aBuybackDisplayTexts } from "./pillar-3a-buyback";

type Sourced = { value: number; sourceId: string };

export type Pillar3aBuybackPageData = HouseholdPageData & {
	buybackYear: number;
	gapYears: number[];
	firstGapYear: Sourced;
	lookbackYears: Sourced;
	smallContributionCap: Sourced;
	cantonNames: Record<string, string>;
	texts: Pillar3aBuybackDisplayTexts;
};

export function readPillar3aBuybackForm(values: FormValues, data: Pillar3aBuybackPageData, estimate?: EstimateReading): FormOutcome<null> {
	const household = readHousehold(values, data, data.buybackYear, estimate);
	if ("outcome" in household) return household.outcome;

	const gapYears: Pillar3aGapYearInput[] = data.gapYears.map((year) => ({
		year,
		maxContribution: data.smallContributionCap,
		paidContribution: Math.max(0, Number(values[`paidContribution${year}`] || 0)),
		hadAvsIncome: values[`avsIncome${year}`] === "yes",
		alreadyBoughtBack: values[`alreadyBoughtBack${year}`] === "yes",
	}));
	const shown = displayPillar3aBuyback(
		{
			taxInput: household.taxInput,
			scales: household.scales,
			gaps: {
				buybackYear: data.buybackYear,
				firstGapYear: data.firstGapYear,
				lookbackYears: data.lookbackYears,
				buybackYearCap: data.smallContributionCap,
				gapYears,
				currentYearContributionPaidInFull: values.currentYearContributionPaidInFull === "yes",
				hasAvsIncomeInBuybackYear: values.avsIncomeInBuybackYear === "yes",
				receivedOldAgeBenefit: values.oldAgeBenefit === "yes",
			},
		},
		data.texts,
		data.officialCalculators,
	);
	return withEstimate(household, data, shown, null);
}
