/**
 * A3 — du formulaire au résultat affiché : ménage et revenus imposables
 * (calculator-form.ts), potentiel, montant et année de retrait, puis
 * displayLppBuyback. Sans DOM : la construction l'exécute sur le cas exemple,
 * le script de la page à chaque saisie.
 */
import { emptyOutcome, readHousehold, withEstimate, type EstimateReading, type FormOutcome, type FormValues, type HouseholdPageData } from "./calculator-form";
import { displayLppBuyback, type LppBuybackDisplay, type LppBuybackDisplayTexts } from "./lpp-buyback";

export type LppBuybackPageData = HouseholdPageData & {
	taxYear: number;
	lockPeriodYears: { value: number; sourceId: string };
	texts: LppBuybackDisplayTexts;
};

export function readLppBuybackForm(values: FormValues, data: LppBuybackPageData, estimate?: EstimateReading): FormOutcome<LppBuybackDisplay> {
	const household = readHousehold(values, data, data.taxYear, estimate);
	if ("outcome" in household) return household.outcome;

	const amountOf = (text: string | undefined): number | null => (text === undefined || text === "" ? null : Number(text));
	const potential = amountOf(values.buybackPotential);
	const amount = amountOf(values.buybackAmount);
	const withdrawalYear = amountOf(values.plannedCapitalWithdrawalYear);
	if ([potential, amount].some((value) => value === null || !Number.isFinite(value) || value < 0)) return emptyOutcome();
	if (withdrawalYear !== null && !Number.isInteger(withdrawalYear)) return emptyOutcome();

	const shown = displayLppBuyback(
		{
			taxInput: household.taxInput,
			scales: household.scales,
			buybackPotential: Math.round(potential!),
			amount: Math.round(amount!),
			unrepaidHomeOwnershipWithdrawal: values.unrepaidHomeOwnershipWithdrawal === "yes",
			plannedCapitalWithdrawalYear: withdrawalYear,
			lockPeriodYears: data.lockPeriodYears,
		},
		data.texts,
		data.officialCalculators,
	);
	return withEstimate(household, data, shown, shown);
}
