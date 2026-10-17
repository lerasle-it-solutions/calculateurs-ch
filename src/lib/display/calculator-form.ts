/**
 * Lecture du formulaire d'un calculateur fiscal, commune à A1, A2 et A3 : les
 * saisies brutes (chaînes, telles que `FormData` les rend ou que le cas exemple
 * les déclare) donnent le ménage, ses barèmes et ses deux revenus imposables,
 * ou le message qui remplace le montant — commune à choisir, ménage hors
 * périmètre, estimation incomplète.
 *
 * Sans DOM : le même code calcule le cas exemple à la construction et chaque
 * saisie dans le navigateur, et les tests l'exécutent.
 */
import type { TaxInput, TaxScales } from "../calculations/tax";
import { taxScalesFromBundle, type TaxScalesBundle } from "../calculations/tax-scales-bundle";
import { coverageStatusOf, type CoverageTexts } from "./coverage";
import type { Estimate } from "./gross-estimate";
import type { BreakdownRow } from "./pillar-3a-buyback";
import type { ResultStatus, StatusLink } from "./result-card";

/** Saisies du formulaire, par nom de champ. */
export type FormValues = Record<string, string>;

/**
 * Estimation du chemin « salaire brut » : `undefined` hors de ce chemin, `null`
 * tant que le salaire et l'âge manquent, un statut quand la saisie est à
 * corriger.
 */
export type EstimateReading = Estimate | { status: string } | null | undefined;

/** Ce que la page affiche : montant, trace, message, mention, et compléments propres au calculateur. */
export type FormOutcome<T> = {
	value: string;
	breakdown: BreakdownRow[];
	status: ResultStatus | null;
	note: string | null;
	/** Compléments du résultat (ventilation, tableaux) ; `null` sans résultat. */
	shown: T | null;
};

/** Données de la page communes aux calculateurs fiscaux. */
export type HouseholdPageData = {
	bundle: TaxScalesBundle;
	municipalities: Record<string, { ofsId: number; canton: TaxInput["canton"] }>;
	/** Calculette officielle du canton, lue dans coverage.officialCalculator des données. */
	officialCalculators: Record<string, StatusLink>;
	texts: CoverageTexts & {
		municipalityMismatch: string;
		unknownMunicipality: string;
		inputShort: string;
		missingData: string;
		missingDataShort: string;
		/** Mention sous le montant quand les revenus imposables sont estimés. */
		estimateNote: string;
	};
};

export const emptyOutcome = <T>(status: ResultStatus | null = null): FormOutcome<T> => ({
	value: "—",
	breakdown: [],
	status,
	note: null,
	shown: null,
});

/** État civil, nombre et âges des enfants saisis. */
export function familyOf(values: FormValues): Pick<TaxInput, "maritalStatus" | "children" | "childrenAges"> {
	return {
		maritalStatus: values.maritalStatus === "married" ? "married" : "single",
		children: Number(values.children || 0),
		childrenAges: (values.childrenAges ?? "")
			.split(",")
			.map((age) => Number(age.trim()))
			.filter((age) => age !== 0 && Number.isFinite(age)),
	};
}

/** Ménage lu dans le formulaire, avec ses barèmes et ses revenus imposables. */
export type Household = {
	taxInput: TaxInput;
	scales: TaxScales;
	/** Estimation retenue (chemin « salaire brut ») ; `null` sur le chemin du revenu imposable. */
	estimate: Estimate | null;
};

/**
 * Ménage et revenus imposables, ou le message qui remplace le montant. Les
 * revenus absents ou invalides rendent un tiret sans message : le visiteur n'a
 * pas fini de saisir.
 */
export function readHousehold(
	values: FormValues,
	data: HouseholdPageData,
	taxYear: number,
	estimate: EstimateReading,
): Household | { outcome: FormOutcome<never> } {
	const inputStatus = (text: string): ResultStatus => ({ text, short: data.texts.inputShort });
	const municipality = data.municipalities[values.municipality ?? ""];
	const { children, childrenAges, maritalStatus } = familyOf(values);

	if (!municipality) {
		return { outcome: emptyOutcome(values.municipality ? inputStatus(data.texts.unknownMunicipality) : null) };
	}
	if (municipality.canton !== values.canton) return { outcome: emptyOutcome(inputStatus(data.texts.municipalityMismatch)) };

	// Couverture établie dès le canton, la commune, l'état civil et les enfants : le message
	// hors périmètre s'affiche sans attendre les revenus ni les autres champs (P5).
	const scales = taxScalesFromBundle(data.bundle, municipality.ofsId);
	if (Number.isFinite(children) && children >= 0) {
		const coverage = coverageStatusOf({ canton: municipality.canton, maritalStatus, children }, scales, data.texts, data.officialCalculators);
		if (coverage) return { outcome: emptyOutcome(coverage) };
	}
	if (estimate && "status" in estimate) return { outcome: emptyOutcome(inputStatus(estimate.status)) };
	if (estimate === null) return { outcome: emptyOutcome() };

	const amount = (text: string | undefined): number => (text === undefined || text === "" ? Number.NaN : Number(text));
	const cantonalTaxableIncome = estimate ? estimate.cantonalTaxableIncome : amount(values.cantonalTaxableIncome);
	const federalTaxableIncome = estimate ? estimate.federalTaxableIncome : amount(values.federalTaxableIncome);
	if (![cantonalTaxableIncome, federalTaxableIncome, children].every((value) => Number.isFinite(value) && value >= 0)) {
		return { outcome: emptyOutcome() };
	}

	return {
		taxInput: {
			taxYear,
			canton: municipality.canton,
			municipalityOfsId: municipality.ofsId,
			maritalStatus,
			children,
			childrenAges,
			denomination: "none",
			federalTaxableIncome,
			cantonalTaxableIncome,
			taxableWealth: 0,
		},
		scales,
		estimate: estimate ?? null,
	};
}

/** Résultat d'un calculateur, précédé des lignes de l'estimation et suivi de sa mention quand elle a servi. */
export function withEstimate<T>(
	household: Household,
	data: HouseholdPageData,
	shown: { value: string; breakdown: BreakdownRow[]; status: ResultStatus | null },
	extras: T | null,
): FormOutcome<T> {
	const estimated = household.estimate !== null && shown.status === null;
	return {
		value: shown.value,
		breakdown: estimated ? [...household.estimate!.rows, ...shown.breakdown] : shown.breakdown,
		status: shown.status,
		note: estimated ? data.texts.estimateNote : null,
		shown: shown.status === null ? extras : null,
	};
}
