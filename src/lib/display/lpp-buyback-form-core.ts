/**
 * A3 — lecture du formulaire, l'affichage passé en argument (décision n° 22) :
 * le cœur du navigateur l'appelle avec `displayLppBuybackCore`, sans importer la
 * mise en forme des tableaux ; lpp-buyback-form.ts, avec l'affichage complet.
 *
 * Du formulaire au résultat affiché : ménage et revenus imposables
 * (calculator-form.ts), potentiel, montant et année de retrait, puis
 * displayLppBuyback. Sans DOM : la construction l'exécute sur le cas exemple,
 * le script de la page à chaque saisie.
 */
import { amountOf, emptyOutcome, missingInputStatus, readHousehold, withEstimate, type EstimateReading, type FormOutcome, type FormValues, type HouseholdPageData } from "./calculator-form";
import type { displayLppBuybackCore, LppBuybackCoreDisplay, LppBuybackDisplayTexts } from "./lpp-buyback-core";

export type LppBuybackPageData = HouseholdPageData & {
	taxYear: number;
	lockPeriodYears: { value: number; sourceId: string };
	/** `amountsMissing` : potentiel ou montant du rachat vide, texte neutre à la place du montant (§ 4.4). */
	texts: LppBuybackDisplayTexts & { amountsMissing: string };
};

export function readLppBuybackFormWith<D extends LppBuybackCoreDisplay>(
	values: FormValues,
	data: LppBuybackPageData,
	estimate: EstimateReading,
	display: (...args: Parameters<typeof displayLppBuybackCore>) => D,
): FormOutcome<D> {
	const household = readHousehold(values, data, data.taxYear, estimate);
	if ("outcome" in household) return household.outcome;

	const potential = amountOf(values.buybackPotential);
	const amount = amountOf(values.buybackAmount);
	const withdrawalText = (values.plannedCapitalWithdrawalYear ?? "").trim();
	const withdrawalYear = withdrawalText === "" ? null : amountOf(withdrawalText);
	if (![potential, amount].every(Number.isFinite)) return emptyOutcome(missingInputStatus(data.texts.amountsMissing, data));
	if (potential < 0 || amount < 0) return emptyOutcome();
	if (withdrawalYear !== null && !Number.isInteger(withdrawalYear)) return emptyOutcome();

	const shown = display(
		{
			taxInput: household.taxInput,
			scales: household.scales,
			buybackPotential: Math.round(potential),
			amount: Math.round(amount),
			unrepaidHomeOwnershipWithdrawal: values.unrepaidHomeOwnershipWithdrawal === "yes",
			plannedCapitalWithdrawalYear: withdrawalYear,
			lockPeriodYears: data.lockPeriodYears,
		},
		data.texts,
		data.officialCalculators,
	);
	return withEstimate(household, data, shown, shown);
}
