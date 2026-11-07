/**
 * Évaluation des barèmes et refus du moteur fiscal (src/lib/calculations/tax.ts),
 * dans un module à part : un calculateur qui n'a besoin que d'évaluer un barème
 * (retrait en capital, A4) n'emporte pas le calcul de l'impôt sur le revenu et la
 * fortune dans son script (budget JavaScript, décision n° 21). Déplacé tel quel
 * de tax.ts le 7.11.2026, qui le réexporte : aucune règle ne change.
 */
import { formatNumber } from "../utils/format-number";
import type {
	Bracket,
	FederalScaleTable,
	Household,
	MissingItem,
	ScaleTable,
	StepwiseDeflation,
	TaxInput,
	TaxScales,
} from "./tax";
import * as labels from "./tax-scale-labels";

const fmt = (value: number): string => formatNumber(value, 4);

/** Le calcul demande des valeurs encore à relever (R3). */
export class MissingTaxDataError extends Error {
	readonly missing: MissingItem[];

	constructor(missing: MissingItem[]) {
		// Détail de chaque valeur, TODO et source, dans `missing`
		super(`Valeurs à relever : ${missing.map((item) => item.label).join(" ; ")}.`);
		this.name = "MissingTaxDataError";
		this.missing = missing;
	}
}

/**
 * Le canton est déclaré en couverture partielle : le moteur ne reproduit pas son
 * calculateur officiel et refuse de rendre un résultat faux.
 */
export class PartialCoverageError extends Error {
	readonly canton: TaxInput["canton"];
	readonly note: string;
	/** Commune non couverte en entier ; `null` si la restriction vise le canton ou le ménage. */
	readonly municipality: string | null;

	constructor(canton: TaxInput["canton"], note: string, scope: { household?: string; municipality?: string } = {}) {
		super(
			`${scope.municipality ? `Commune ${scope.municipality}` : `Canton ${canton}`} en couverture partielle${scope.household ? ` pour ce ménage (${scope.household})` : ""}. ${note}`,
		);
		this.name = "PartialCoverageError";
		this.canton = canton;
		this.note = note;
		this.municipality = scope.municipality ?? null;
	}
}

/**
 * Le cas sort de ce que le moteur sait calculer avec les entrées reçues : il le
 * dit plutôt que de rendre un résultat faux.
 */
export class OutOfScopeError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "OutOfScopeError";
	}
}

const bracketIndex = (brackets: Pick<Bracket, "threshold">[], amount: number): number => {
	let index = 0;
	for (let i = 0; i < brackets.length; i++) {
		if (brackets[i]!.threshold <= amount) index = i;
		else break;
	}
	return index;
};

/**
 * Taux et impôt d'un barème pour une assiette. `lookupFactor` indexe les seuils
 * pour la seule lecture du taux : il n'a de sens que pour un barème à taux.
 */
/** Taux, en %, d'un barème à taux (`averageRate` ou `interpolated`) lu à `lookup`. */
const rateOf = (table: Pick<ScaleTable, "scaleType" | "brackets">, lookup: number): number => {
	const { brackets } = table;
	const index = bracketIndex(brackets, lookup);
	const bracket = brackets[index]!;
	const next = brackets[index + 1];
	if (table.scaleType === "averageRate" || next === undefined || next.threshold === bracket.threshold) {
		return bracket.ratePercent;
	}
	return (
		bracket.ratePercent +
		((lookup - bracket.threshold) * (next.ratePercent - bracket.ratePercent)) / (next.threshold - bracket.threshold)
	);
};

/** Revenu déterminant pour le taux après déflation par étapes, tronqué au franc à chaque division. */
export function deflateStepwise(income: number, deflation: StepwiseDeflation): { value: number; divisorsPercent: number[] } {
	const excess = deflation.indexPercent - 100;
	if (excess < 0 || deflation.stepPercent <= 0) {
		throw new Error("Indexation non définie.");
	}
	const steps = Math.floor(excess / deflation.stepPercent);
	const rest = excess - steps * deflation.stepPercent;
	const divisorsPercent = [
		...Array.from({ length: steps }, () => 100 + deflation.stepPercent),
		...(rest > 0 ? [100 + rest] : []),
	];
	let value = income;
	// Division d'entiers (× 100 / 110) : aucune erreur de virgule flottante avant la troncature
	for (const divisor of divisorsPercent) value = Math.floor((value * 100) / divisor);
	return { value, divisorsPercent };
}

/**
 * Impôt d'un barème à taux dont l'indexation se fait par déflation par étapes :
 * taux lu, non arrondi, au revenu déflaté, appliqué au revenu entier.
 */
export function evaluateDeflatedScale(
	table: Pick<ScaleTable, "scaleType" | "brackets">,
	amount: number,
	deflation: StepwiseDeflation,
): { tax: number; ratePercent: number; rateIncome: number; formula: string } {
	if (table.scaleType === "marginal") throw new Error("Barème marginal : déflation non définie.");
	if (amount <= 0) return { tax: 0, ratePercent: 0, rateIncome: 0, formula: labels.ZERO_BASE };
	const { value: rateIncome, divisorsPercent } = deflateStepwise(amount, deflation);
	const ratePercent = rateOf(table, rateIncome);
	return {
		tax: (amount * ratePercent) / 100,
		ratePercent,
		rateIncome,
		formula: `${fmt(amount)} × ${fmt(ratePercent)} %, taux lu au revenu déflaté ${fmt(rateIncome)} = ${fmt(amount)} ÷ ${divisorsPercent.map((divisor) => fmt(divisor / 100)).join(" ÷ ")}, tronqué au franc à chaque étape`,
	};
}

/** Arrondi au plus proche multiple de `step` ; la marge absorbe les erreurs de virgule flottante. */
export const roundToNearest = (value: number, step: number): number =>
	Math.round(Math.round(value / step + 5e-8) * step * 1e6) / 1e6;

export function evaluateScale(
	table: Pick<ScaleTable, "scaleType" | "brackets">,
	amount: number,
	lookupFactor = 1,
): { tax: number; formula: string } {
	if (amount <= 0) return { tax: 0, formula: labels.ZERO_BASE };
	const { brackets } = table;

	if (table.scaleType === "marginal") {
		if (lookupFactor !== 1) {
			throw new Error("Barème marginal : indexation non définie.");
		}
		const bracket = brackets[bracketIndex(brackets, amount)]!;
		const tax = bracket.baseAmount + ((amount - bracket.threshold) * bracket.ratePercent) / 100;
		return {
			tax,
			formula: `${fmt(bracket.baseAmount)} + (${fmt(amount)} − ${fmt(bracket.threshold)}) × ${fmt(bracket.ratePercent)} %`,
		};
	}

	const lookup = amount / lookupFactor;
	const index = bracketIndex(brackets, lookup);
	const bracket = brackets[index]!;
	const next = brackets[index + 1];
	const lookupText = lookupFactor === 1 ? "" : ` (taux lu à ${fmt(amount)} / ${fmt(lookupFactor)} = ${fmt(lookup)})`;

	if (table.scaleType === "averageRate" || next === undefined || next.threshold === bracket.threshold) {
		return {
			tax: (amount * bracket.ratePercent) / 100,
			formula: `${fmt(amount)} × ${fmt(bracket.ratePercent)} %${lookupText}`,
		};
	}

	const ratePercent = rateOf(table, lookup);
	return {
		tax: (amount * ratePercent) / 100,
		formula: `${fmt(amount)} × ${fmt(ratePercent)} %, taux interpolé entre ${fmt(bracket.threshold)} (${fmt(bracket.ratePercent)} %) et ${fmt(next.threshold)} (${fmt(next.ratePercent)} %)${lookupText}`,
	};
}

/**
 * Impôt selon une table de l'art. 36 LIFD : montant dû au seuil de la ligne,
 * plus le taux par tranche complète de `incrementStep` francs au-delà. Dès le
 * seuil de la dernière ligne, le taux maximal s'applique au revenu entier, sans
 * calcul par tranche ; la dernière ligne doit en être la traduction exacte.
 */
export function evaluateFederalScale(
	table: Pick<FederalScaleTable, "incrementStep" | "brackets">,
	amount: number,
	maximumRatePercent: number,
): { tax: number; formula: string } {
	const { brackets, incrementStep } = table;
	const first = brackets[0]!;
	const capRow = brackets[brackets.length - 1]!;
	if (
		capRow.ratePercent !== maximumRatePercent ||
		Math.abs(capRow.baseAmount - (capRow.threshold * maximumRatePercent) / 100) > 0.005
	) {
		throw new Error("Barème fédéral : dernière ligne contraire au taux maximal.");
	}
	if (amount <= 0) return { tax: 0, formula: labels.ZERO_BASE };
	if (amount >= capRow.threshold) {
		return {
			tax: (amount * maximumRatePercent) / 100,
			formula: `${fmt(amount)} × ${fmt(maximumRatePercent)} %, taux maximal sur le revenu entier dès ${fmt(capRow.threshold)}`,
		};
	}
	if (amount < first.threshold) {
		return { tax: first.baseAmount, formula: `jusqu'à ${fmt(first.threshold)} : ${fmt(first.baseAmount)}` };
	}
	const bracket = brackets[bracketIndex(brackets, amount)]!;
	const steps = Math.floor((amount - bracket.threshold) / incrementStep);
	if (bracket.ratePercent === null) {
		return {
			tax: bracket.baseAmount,
			formula: `${fmt(bracket.baseAmount)}, sans montant par tranche au-delà de ${fmt(bracket.threshold)}`,
		};
	}
	const perStep = (incrementStep * bracket.ratePercent) / 100;
	return {
		tax: bracket.baseAmount + steps * perStep,
		formula: `${fmt(bracket.baseAmount)} + ${steps} × ${fmt(perStep)} (tranches complètes de ${fmt(incrementStep)} au-delà de ${fmt(bracket.threshold)})`,
	};
}

/**
 * Refuse, sans rien calculer, un contribuable hors du périmètre que la couche
 * de données déclare : commune, canton ou ménage non couverts.
 */
export function assertTaxCoverage(input: TaxInput, scales: TaxScales): void {
	if (scales.coverage !== null) {
		const excluded = scales.coverage.notCoveredHouseholds;
		// Une personne nécessiteuse à charge ouvre les mêmes droits qu'un enfant : le ménage n'est plus « seul ».
		const coverageHousehold: Household =
			input.maritalStatus === "married"
				? "married"
				: input.children > 0 || (input.supportedHouseholdMembers?.needyPersons ?? 0) > 0
					? "singleWithChildren"
					: "single";
		if (scales.coverage.municipality !== undefined) {
			throw new PartialCoverageError(input.canton, scales.coverage.note, { municipality: scales.coverage.municipality });
		}
		if (excluded === null) throw new PartialCoverageError(input.canton, scales.coverage.note);
		if (excluded.includes(coverageHousehold)) {
			throw new PartialCoverageError(input.canton, scales.coverage.note, { household: coverageHousehold });
		}
	}
}
