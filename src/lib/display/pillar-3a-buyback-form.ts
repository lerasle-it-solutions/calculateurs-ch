/**
 * A1 — du formulaire au résultat affiché : ménage et revenus imposables
 * (calculator-form.ts), lacunes saisies année par année, puis
 * displayPillar3aBuyback. Sans DOM : la construction l'exécute sur le cas
 * exemple, le script de la page à chaque saisie.
 */
import { blockingConditionOf, type Pillar3aGapsParams } from "../calculations/pension/pillar-3a-buyback";
import {
	amountOf,
	readHousehold,
	withEstimate,
	type EstimateReading,
	type FormOutcome,
	type FormValues,
	type HouseholdPageData,
} from "./calculator-form";
import { displayPillar3aBuyback, type Pillar3aBuybackDisplayTexts } from "./pillar-3a-buyback";
import type { StatusLink } from "./result-card";

type Sourced = { value: number; sourceId: string };

export type Pillar3aBuybackPageData = HouseholdPageData & {
	buybackYear: number;
	gapYears: number[];
	firstGapYear: Sourced;
	lookbackYears: Sourced;
	smallContributionCap: Sourced;
	cantonNames: Record<string, string>;
	texts: Pillar3aBuybackDisplayTexts & {
		/** Mention courte de la barre mobile quand une condition bloque tout rachat. */
		blockedShort: string;
	};
	/** Alternative déclarée dans notCovered pour une prestation de vieillesse déjà perçue (exclusion, § 4.3). */
	oldAgeBenefitAlternative: StatusLink;
};

export function readPillar3aBuybackForm(values: FormValues, data: Pillar3aBuybackPageData, estimate?: EstimateReading): FormOutcome<null> {
	const household = readHousehold(values, data, data.buybackYear, estimate);
	if ("outcome" in household) return household.outcome;

	const gaps: Pillar3aGapsParams = {
		buybackYear: data.buybackYear,
		firstGapYear: data.firstGapYear,
		lookbackYears: data.lookbackYears,
		buybackYearCap: data.smallContributionCap,
		gapYears: data.gapYears.map((year) => {
			const paid = amountOf(values[`paidContribution${year}`]);
			return {
				year,
				maxContribution: data.smallContributionCap,
				paidContribution: Number.isFinite(paid) ? Math.max(0, paid) : 0,
				hadAvsIncome: values[`avsIncome${year}`] === "yes",
				alreadyBoughtBack: values[`alreadyBoughtBack${year}`] === "yes",
			};
		}),
		currentYearContributionPaidInFull: values.currentYearContributionPaidInFull === "yes",
		hasAvsIncomeInBuybackYear: values.avsIncomeInBuybackYear === "yes",
		receivedOldAgeBenefit: values.oldAgeBenefit === "yes",
	};
	const shown = displayPillar3aBuyback({ taxInput: household.taxInput, scales: household.scales, gaps }, data.texts, data.officialCalculators);
	// Une condition qui bloque tout rachat : la carte la nomme, par le motif du moteur, à la place d'une économie nulle (§ 4.3)
	const blocked = shown.status === null ? blockingConditionOf(gaps) : null;
	if (blocked !== null) {
		return {
			value: "—",
			breakdown: shown.breakdown,
			status: {
				text: blocked,
				short: data.texts.blockedShort,
				...(gaps.receivedOldAgeBenefit ? { kind: "exclusion" as const, link: data.oldAgeBenefitAlternative } : {}),
			},
			note: null,
			shown: null,
		};
	}
	return withEstimate(household, data, shown, null);
}
