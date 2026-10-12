/**
 * Rachat dans la prévoyance professionnelle (LPP, RS 831.40, art. 79b ;
 * OPP 2, RS 831.441.1, art. 60d).
 *
 * Fonction pure : situation fiscale, barèmes et délai de blocage arrivent en
 * paramètres (R2), la fonction n'importe aucun fichier de données. Elle refuse
 * un rachat que la loi exclut, chiffre l'économie d'impôt du rachat en une fois
 * puis échelonné sur 1 à 5 années, et situe chaque tranche par rapport au délai
 * de blocage des prestations en capital (art. 79b al. 3, 1re phrase).
 *
 * L'économie de chaque année se calcule par différence de deux impôts totaux
 * (`computeTaxSavingOnDeduction`, via `computeIncomeTaxSaving`), composantes
 * arrondies au franc avant l'addition : jamais par taux marginal.
 */
import type { BreakdownLine } from "../../utils/breakdown";
import { formatNumber } from "../../utils/format-number";
import { assertTaxCoverage, type TaxInput, type TaxScales } from "../tax";
import { computeIncomeTaxSaving, type IncomeTaxSaving } from "./income-tax-saving";
import * as labels from "./lpp-buyback-labels";

/** Une valeur relevée, avec l'acte qui la fixe. */
export type Sourced<T> = { value: T; sourceId: string };

/** Nombres de tranches comparés (décision du 12.10.2026, W09) : de 1 à 5 années. */
export const SCENARIO_TRANCHE_COUNTS = [1, 2, 3, 4, 5] as const;

export type LppBuybackParams = {
	/** Contexte fiscal et revenus imposables avant rachat ; `taxYear` est l'année de calcul. */
	taxInput: TaxInput;
	scales: TaxScales;
	/** Potentiel de rachat indiqué par la caisse de pension (art. 79b al. 1 LPP). */
	buybackPotential: number;
	/** Montant envisagé, en francs entiers. */
	amount: number;
	/** Versement anticipé pour la propriété du logement non remboursé (art. 79b al. 3 LPP). */
	unrepaidHomeOwnershipWithdrawal: boolean;
	/** Année prévue du premier retrait en capital, s'il y en a un. */
	plannedCapitalWithdrawalYear?: number | null;
	/** Délai de blocage des prestations en capital après un rachat, en années (art. 79b al. 3 LPP). */
	lockPeriodYears: Sourced<number>;
};

/** Situation d'une tranche de l'année Y face à un retrait en capital prévu l'année R. */
export type LockStatus = "compatible" | "checkExactDate" | "withinLockPeriod";

export type LppBuybackRefusal = {
	reason: "exceedsPotential" | "unrepaidHomeOwnershipWithdrawal";
	/** Motif en français, avec son article. */
	message: string;
};

/** Part d'une tranche qui dépasse le revenu imposable : le calculateur ne fait pas descendre le revenu sous zéro. */
export type NotDeducted = { federal: number; cantonal: number };

/** Une tranche, versée une année donnée, et son économie d'impôt. */
export type LppBuybackTranche = {
	year: number;
	amount: number;
	/** Impôt sur le revenu avant moins après la tranche, composantes arrondies au franc. */
	taxSaving: number;
	cantonalAndMunicipalSaving: number;
	federalSaving: number;
	/** Économie par impôt (cantonal, communal, paroissial, taxe personnelle, fédéral), au franc. */
	componentSavings: IncomeTaxSaving["componentSavings"];
	notDeducted: NotDeducted;
	/** `null` sans année de retrait en capital prévue. */
	lockStatus: LockStatus | null;
	breakdown: BreakdownLine[];
};

export type LppBuybackScenario = {
	trancheCount: number;
	tranches: LppBuybackTranche[];
	/** Somme des économies des tranches. */
	totalSaving: number;
	/** `totalSaving` moins l'économie du rachat en une fois. */
	differenceFromSingleBuyback: number;
	breakdown: BreakdownLine[];
};

/** Une année de rachat possible des scénarios, et l'année où son délai de blocage s'achève. */
export type LockCalendarEntry = {
	buybackYear: number;
	lockEndsYear: number;
	status: LockStatus | null;
};

export type LppBuybackResult = {
	/** Vide si le rachat est possible ; sinon, aucun montant n'est calculé. */
	refusals: LppBuybackRefusal[];
	/** Rachat en une fois l'année de calcul ; `null` en cas de refus. */
	singleBuyback: LppBuybackTranche | null;
	scenarios: LppBuybackScenario[];
	lockCalendar: LockCalendarEntry[];
	breakdown: BreakdownLine[];
};

const fmt = (value: number): string => formatNumber(value, 2);

const assertAmount = (name: string, value: number): void => {
	if (!Number.isInteger(value) || value < 0) throw new Error(`${name} invalide : ${value} (francs entiers attendus).`);
};

/** Montants de `count` tranches égales en francs entiers ; la dernière absorbe le reste. */
export const splitIntoTranches = (amount: number, count: number): number[] => {
	assertAmount("Montant", amount);
	if (!Number.isInteger(count) || count < 1) throw new Error(`Nombre de tranches invalide : ${count}.`);
	const tranche = Math.floor(amount / count);
	return Array.from({ length: count }, (_, index) => (index === count - 1 ? amount - tranche * (count - 1) : tranche));
};

/**
 * Classe d'une tranche de l'année Y pour un retrait en capital l'année R : au-delà
 * du délai, compatible ; l'année où il s'achève, selon les dates exactes ; avant,
 * dans le délai.
 */
export const lockStatusOf = (buybackYear: number, withdrawalYear: number, lockPeriodYears: number): LockStatus => {
	const gap = withdrawalYear - buybackYear;
	if (gap > lockPeriodYears) return "compatible";
	if (gap === lockPeriodYears) return "checkExactDate";
	return "withinLockPeriod";
};

export const LOCK_STATUS_LABELS: Record<LockStatus, string> = {
	compatible: labels.LOCK_COMPATIBLE,
	checkExactDate: labels.LOCK_CHECK_EXACT_DATE,
	withinLockPeriod: labels.LOCK_WITHIN,
};

const refusalsOf = (params: LppBuybackParams): LppBuybackRefusal[] => {
	const refusals: LppBuybackRefusal[] = [];
	if (params.amount > params.buybackPotential) {
		refusals.push({
			reason: "exceedsPotential",
			message: `Le montant envisagé (${fmt(params.amount)} CHF) dépasse le potentiel de rachat (${fmt(params.buybackPotential)} CHF) : la caisse ne peut permettre le rachat que jusqu'à hauteur des prestations réglementaires (art. 79b al. 1 LPP).`,
		});
	}
	if (params.unrepaidHomeOwnershipWithdrawal) {
		refusals.push({ reason: "unrepaidHomeOwnershipWithdrawal", message: labels.UNREPAID_HOME_OWNERSHIP_WITHDRAWAL });
	}
	return refusals;
};

/** Économie d'impôt d'une tranche, calculée sur le revenu et les barèmes de l'année de calcul. */
const trancheOf = (params: LppBuybackParams, year: number, amount: number): LppBuybackTranche => {
	const { taxInput } = params;
	const saving = computeIncomeTaxSaving(taxInput, params.scales, amount, {
		noDeduction: labels.NOTHING_TO_BUY_BACK,
		incomeOnlyTotals: labels.INCOME_ONLY_TOTALS_ASSUMPTION,
	});
	const notDeducted = {
		federal: Math.max(0, amount - taxInput.federalTaxableIncome),
		cantonal: Math.max(0, amount - taxInput.cantonalTaxableIncome),
	};
	const notDeductedLines = (
		[
			["federal", "revenu imposable fédéral", taxInput.federalTaxableIncome],
			["cantonal", "revenu imposable cantonal", taxInput.cantonalTaxableIncome],
		] as const
	)
		.filter(([base]) => notDeducted[base] > 0)
		.map(([base, name, income]) => ({
			label: `${labels.NOT_DEDUCTED} (${name})`,
			operands: { amount, taxableIncome: income },
			formula: `${fmt(amount)} − ${fmt(income)}`,
			value: notDeducted[base],
			unit: "CHF",
			sourceId: null,
			assumption: labels.NOT_DEDUCTED_ASSUMPTION,
		}));
	return {
		year,
		amount,
		...saving,
		notDeducted,
		// Situé par rapport au délai de blocage par `trancheFor`, année par année
		lockStatus: null,
		breakdown: [
			{
				label: labels.BUYBACK_AMOUNT,
				operands: { amount, buybackPotential: params.buybackPotential },
				formula: `${fmt(amount)} ≤ ${fmt(params.buybackPotential)}`,
				value: amount,
				unit: "CHF",
				sourceId: null,
				assumption: labels.BUYBACK_AMOUNT_ASSUMPTION,
			},
			...notDeductedLines,
			...saving.breakdown,
		],
	};
};

const scenarioOf = (
	params: LppBuybackParams,
	trancheCount: number,
	singleSaving: number,
	trancheFor: (year: number, amount: number) => LppBuybackTranche,
): LppBuybackScenario => {
	const firstYear = params.taxInput.taxYear;
	const tranches = splitIntoTranches(params.amount, trancheCount).map((amount, index) => trancheFor(firstYear + index, amount));
	const totalSaving = tranches.reduce((sum, tranche) => sum + tranche.taxSaving, 0);
	const differenceFromSingleBuyback = totalSaving - singleSaving;
	return {
		trancheCount,
		tranches,
		totalSaving,
		differenceFromSingleBuyback,
		breakdown: [
			...tranches.map((tranche) => ({
				label: `Tranche versée en ${tranche.year}`,
				operands: { amount: tranche.amount, taxSaving: tranche.taxSaving },
				formula: `économie sur ${fmt(tranche.amount)} CHF`,
				value: tranche.taxSaving,
				unit: "CHF",
				sourceId: null,
				...(tranche.lockStatus ? { qualifier: LOCK_STATUS_LABELS[tranche.lockStatus] } : {}),
			})),
			{
				label: labels.SCENARIO_TOTAL,
				operands: Object.fromEntries(tranches.map((tranche) => [String(tranche.year), tranche.taxSaving])),
				formula: tranches.map((tranche) => fmt(tranche.taxSaving)).join(" + "),
				value: totalSaving,
				unit: "CHF",
				sourceId: null,
				assumption: labels.SCENARIO_ASSUMPTION,
			},
			{
				label: labels.SCENARIO_DIFFERENCE,
				operands: { totalSaving, singleSaving },
				formula: `${fmt(totalSaving)} − ${fmt(singleSaving)}`,
				value: differenceFromSingleBuyback,
				unit: "CHF",
				sourceId: null,
			},
		],
	};
};

/**
 * Calcul complet du rachat LPP. Un ménage hors du périmètre du moteur fiscal
 * lève `PartialCoverageError` avant tout autre examen. Un rachat exclu par la
 * loi est refusé avec ses motifs, sans aucun montant calculé.
 */
export function computeLppBuyback(params: LppBuybackParams): LppBuybackResult {
	assertTaxCoverage(params.taxInput, params.scales);
	assertAmount("Montant", params.amount);
	assertAmount("Potentiel de rachat", params.buybackPotential);
	const lock = params.lockPeriodYears;
	if (!Number.isInteger(lock.value) || lock.value < 1) throw new Error(`Délai de blocage invalide : ${lock.value}.`);
	const withdrawalYear = params.plannedCapitalWithdrawalYear;
	if (withdrawalYear != null && !Number.isInteger(withdrawalYear)) throw new Error(`Année de retrait invalide : ${withdrawalYear}.`);

	const refusals = refusalsOf(params);
	if (refusals.length > 0) {
		return {
			refusals,
			singleBuyback: null,
			scenarios: [],
			lockCalendar: [],
			breakdown: refusals.map((refusal) => ({
				label: refusal.message,
				operands: {},
				formula: "",
				value: 0,
				sourceId: null,
				noAmount: true,
			})),
		};
	}

	// Les tranches de même montant ont la même économie : un seul calcul par montant
	const savings = new Map<number, LppBuybackTranche>();
	const trancheFor = (year: number, amount: number): LppBuybackTranche => {
		if (!savings.has(amount)) savings.set(amount, trancheOf(params, year, amount));
		const tranche = savings.get(amount)!;
		return {
			...tranche,
			year,
			lockStatus: withdrawalYear == null ? null : lockStatusOf(year, withdrawalYear, lock.value),
		};
	};
	const singleBuyback = trancheFor(params.taxInput.taxYear, params.amount);
	const scenarios = SCENARIO_TRANCHE_COUNTS.map((count) => scenarioOf(params, count, singleBuyback.taxSaving, trancheFor));
	const lockCalendar = SCENARIO_TRANCHE_COUNTS.map((_, index) => {
		const buybackYear = params.taxInput.taxYear + index;
		return {
			buybackYear,
			lockEndsYear: buybackYear + lock.value,
			status: withdrawalYear == null ? null : lockStatusOf(buybackYear, withdrawalYear, lock.value),
		};
	});

	return {
		refusals,
		singleBuyback,
		scenarios,
		lockCalendar,
		breakdown: [
			...singleBuyback.breakdown,
			{
				label: labels.LOCK_PERIOD,
				operands: { lockPeriodYears: lock.value, buybackYear: singleBuyback.year },
				formula: `rachat en ${singleBuyback.year}, délai jusqu'en ${singleBuyback.year + lock.value}`,
				value: lock.value,
				unit: "ans",
				sourceId: lock.sourceId,
				assumption: `${labels.LOCK_PERIOD_ASSUMPTION_START}${lock.value}${labels.LOCK_PERIOD_ASSUMPTION_END}`,
				...(singleBuyback.lockStatus ? { qualifier: LOCK_STATUS_LABELS[singleBuyback.lockStatus] } : {}),
			},
		],
	};
}
