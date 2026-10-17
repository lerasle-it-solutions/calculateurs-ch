/**
 * Lecture du formulaire d'un calculateur fiscal, commune à A1, A2 et A3 : les
 * saisies brutes (chaînes, telles que `FormData` les rend ou que le cas exemple
 * les déclare) donnent le ménage, ses barèmes et ses deux revenus imposables,
 * ou le message qui remplace le montant — commune à choisir, ménage hors
 * périmètre, salaire brut à saisir (docs/design-system.md § 4.3).
 *
 * Sans DOM : le même code calcule le cas exemple à la construction et chaque
 * saisie dans le navigateur, et les tests l'exécutent.
 */
import type { TaxInput, TaxScales } from "../calculations/tax";
import { taxScalesFromBundle, type TaxScalesBundle } from "../calculations/tax-scales-bundle";
import { parseNumber } from "../format/amount-input";
import { formatChfAmount } from "./amounts";
import { coverageStatusOf, type CoverageTexts } from "./coverage";
import type { Estimate } from "./gross-estimate";
import type { BreakdownRow } from "./pillar-3a-buyback";
import type { ResultStatus, StatusLink } from "./result-card";
import { resultSummary, summaryRows, type ResultFigures, type ResultSummary } from "./result-summary";

/** Saisies du formulaire, par nom de champ. */
export type FormValues = Record<string, string>;

/**
 * Estimation du chemin « salaire brut » : `undefined` hors de ce chemin, la
 * saisie qui manque tant que le salaire ou l'âge manque, un statut quand la
 * saisie est à corriger.
 */
export type EstimateReading = Estimate | { status: string } | { missing: "grossSalary" | "age" } | undefined;

/** Ce que la page affiche : montant, trace, message, mention, et compléments propres au calculateur. */
export type FormOutcome<T> = {
	value: string;
	breakdown: BreakdownRow[];
	status: ResultStatus | null;
	note: string | null;
	/** Compléments du résultat (ventilation, tableaux) ; `null` sans résultat. */
	shown: T | null;
	/** Valeur du bouton « maximum » de chaque champ qui en a un ; absente ou `null`, le bouton est masqué. */
	maxima?: Record<string, number | null>;
	/** Part du versement, coût net et économie par impôt (§ 4.4) ; absent ou `null` sans résultat. */
	summary?: ResultSummary | null;
};

/** Données de la page communes aux calculateurs fiscaux. */
export type HouseholdPageData = {
	bundle: TaxScalesBundle;
	/** Communes, par clé « Commune (CT) » ; le champ en affiche le libellé (src/calculators/municipalities.ts). */
	municipalities: Record<string, { ofsId: number; canton: TaxInput["canton"] }>;
	/** Calculette officielle du canton, lue dans coverage.officialCalculator des données. */
	officialCalculators: Record<string, StatusLink>;
	texts: CoverageTexts & {
		unknownMunicipality: string;
		inputShort: string;
		missingData: string;
		missingDataShort: string;
		/** Mention sous le montant quand les revenus imposables sont estimés. */
		estimateNote: string;
		/** Hypothèse de la trace quand le revenu fédéral n'est pas distingué du cantonal. */
		federalAssumedLabel: string;
		federalAssumed: string;
		/** Chemin « salaire brut » : saisies qui manquent. */
		grossSalaryMissing: string;
		ageMissing: string;
		grossMissingShort: string;
		/** Commune ou revenu imposable vide : texte neutre à la place du montant (§ 4.4). */
		municipalityMissing: string;
		taxableIncomeMissing: string;
		inputMissingShort: string;
		/** Lignes de la trace qui suivent l'économie : part du versement, coût net de l'année. */
		shareLabel: string;
		netCostLabel: string;
	};
};

/** Saisie invalide : style erreur dans la carte (§ 4.4). */
export const invalidInputStatus = (text: string, short: string): ResultStatus => ({ text, short, kind: "invalid" });

/** Donnée manquante : texte neutre dans la carte (§ 4.4), jamais un tiret seul. */
export const missingInputStatus = (text: string, data: Pick<HouseholdPageData, "texts">): ResultStatus => ({
	text,
	short: data.texts.inputMissingShort,
	kind: "missing",
});

/**
 * Type d'un message rendu par l'affichage d'un calculateur (`display…`), qui ne
 * le donne pas toujours : donnée communale non relevée, hors périmètre, avec la
 * calculette officielle du canton quand elle est relevée ; tout autre message
 * sans type est un refus du moteur, condition légale non remplie (§ 4.4).
 */
export function classifyDisplayStatus(status: ResultStatus, data: Pick<HouseholdPageData, "texts" | "officialCalculators">, canton: string): ResultStatus {
	if (status.kind) return status;
	if (status.text === data.texts.missingData) {
		const link = data.officialCalculators[canton];
		return { ...status, kind: "coverage", ...(link ? { link } : {}) };
	}
	return { ...status, kind: "refusal" };
}

export const emptyOutcome = <T>(status: ResultStatus | null = null): FormOutcome<T> => ({
	value: "—",
	breakdown: [],
	status,
	note: null,
	shown: null,
	summary: null,
});

/**
 * Clé « Commune (CT) » du libellé saisi : la clé elle-même, ou la seule commune
 * de ce nom ; `null` si le libellé est inconnu ou désigne des homonymes.
 */
export function municipalityKey(label: string, municipalities: Record<string, unknown>): string | null {
	if (label in municipalities) return label;
	const matches = Object.keys(municipalities).filter((key) => key.slice(0, key.lastIndexOf(" (")) === label);
	return matches.length === 1 ? matches[0]! : null;
}

/** Nombre saisi, ou `NaN` si la saisie est vide ou illisible. */
export const amountOf = (text: string | undefined): number => parseNumber(text ?? "") ?? Number.NaN;

/** État civil, nombre d'enfants et âge de chacun (un champ par enfant : childAge1, childAge2…). */
export function familyOf(values: FormValues): Pick<TaxInput, "maritalStatus" | "children" | "childrenAges"> {
	const children = parseNumber(values.children ?? "") ?? 0;
	const count = Number.isInteger(children) && children > 0 ? children : 0;
	return {
		maritalStatus: values.maritalStatus === "married" ? "married" : "single",
		children,
		childrenAges: Array.from({ length: count }, (_, index) => parseNumber(values[`childAge${index + 1}`] ?? "")).filter(
			(age): age is number => age !== null && Number.isFinite(age),
		),
	};
}

/** Ménage lu dans le formulaire, avec ses barèmes et ses revenus imposables. */
export type Household = {
	taxInput: TaxInput;
	scales: TaxScales;
	/** Estimation retenue (chemin « salaire brut ») ; `null` sur le chemin du revenu imposable. */
	estimate: Estimate | null;
	/** Lignes de la trace qui précèdent le calcul : estimation, ou hypothèse sur le revenu fédéral. */
	rows: BreakdownRow[];
};

/**
 * Ménage et revenus imposables, ou le message qui remplace le montant. Une
 * commune ou un revenu imposable vide rend un texte neutre qui le demande
 * (§ 4.4) ; une saisie illisible est signalée sous son champ et dans la carte
 * par le script de la page. Tant que « différent ? » est replié (`federalDiffers`
 * vaut « no ») ou que le revenu fédéral est vide, il vaut le cantonal, et la
 * trace le dit (R4).
 */
export function readHousehold(
	values: FormValues,
	data: HouseholdPageData,
	taxYear: number,
	estimate: EstimateReading,
): Household | { outcome: FormOutcome<never> } {
	const key = municipalityKey(values.municipality ?? "", data.municipalities);
	const municipality = key === null ? undefined : data.municipalities[key];
	const { children, childrenAges, maritalStatus } = familyOf(values);

	if (!municipality) {
		return {
			outcome: emptyOutcome(
				values.municipality
					? invalidInputStatus(data.texts.unknownMunicipality, data.texts.inputShort)
					: missingInputStatus(data.texts.municipalityMissing, data),
			),
		};
	}

	// Couverture établie dès la commune, l'état civil et les enfants : le message
	// hors périmètre s'affiche sans attendre les revenus ni les autres champs (P5).
	const scales = taxScalesFromBundle(data.bundle, municipality.ofsId);
	if (Number.isFinite(children) && children >= 0) {
		const coverage = coverageStatusOf({ canton: municipality.canton, maritalStatus, children }, scales, data.texts, data.officialCalculators);
		if (coverage) return { outcome: emptyOutcome(coverage) };
	}
	if (estimate && "missing" in estimate) {
		const text = estimate.missing === "age" ? data.texts.ageMissing : data.texts.grossSalaryMissing;
		return { outcome: emptyOutcome({ text, short: data.texts.grossMissingShort, kind: "missing" }) };
	}
	// Seul message de l'estimateur : l'âge d'un enfant manque
	if (estimate && "status" in estimate) return { outcome: emptyOutcome({ text: estimate.status, short: data.texts.inputShort, kind: "missing" }) };

	const rows: BreakdownRow[] = [];
	let cantonalTaxableIncome: number;
	let federalTaxableIncome: number;
	if (estimate) {
		({ cantonalTaxableIncome, federalTaxableIncome } = estimate);
		rows.push(...estimate.rows);
	} else {
		cantonalTaxableIncome = amountOf(values.cantonalTaxableIncome);
		const federalGiven = values.federalDiffers !== "no" && (values.federalTaxableIncome ?? "").trim() !== "";
		federalTaxableIncome = federalGiven ? amountOf(values.federalTaxableIncome) : cantonalTaxableIncome;
		if (!federalGiven && Number.isFinite(cantonalTaxableIncome)) {
			rows.push({ label: data.texts.federalAssumedLabel, amount: formatChfAmount(federalTaxableIncome), note: data.texts.federalAssumed });
		}
	}
	if (![cantonalTaxableIncome, federalTaxableIncome].every(Number.isFinite)) {
		return { outcome: emptyOutcome(missingInputStatus(data.texts.taxableIncomeMissing, data)) };
	}
	if (![cantonalTaxableIncome, federalTaxableIncome, children].every((value) => value >= 0)) return { outcome: emptyOutcome() };

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
		rows,
	};
}

/** Résultat d'un calculateur, précédé des lignes de l'estimation ou de l'hypothèse fédérale, et suivi de sa mention quand l'estimation a servi. */
export function withEstimate<T>(
	household: Household,
	data: HouseholdPageData,
	shown: { value: string; breakdown: BreakdownRow[]; status: ResultStatus | null; figures: ResultFigures | null },
	extras: T | null,
): FormOutcome<T> {
	const computed = shown.status === null;
	const figures = computed ? shown.figures : null;
	return {
		value: shown.value,
		breakdown: computed ? [...household.rows, ...shown.breakdown, ...(figures ? summaryRows(figures, data.texts) : [])] : shown.breakdown,
		status: shown.status && classifyDisplayStatus(shown.status, data, household.taxInput.canton),
		note: computed && household.estimate !== null ? data.texts.estimateNote : null,
		shown: computed ? extras : null,
		summary: figures && resultSummary(figures),
	};
}
