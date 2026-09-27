/**
 * Moteur fiscal : impôt sur le revenu et la fortune des six cantons romands,
 * impôt communal et paroissial, impôt fédéral direct.
 *
 * Contrat : CLAUDE.md § « Contrat du moteur fiscal » et docs/plan/engine.md.
 * Aucun import de `src/data/` : barèmes, coefficients et corrections arrivent
 * par `scales` (R2, § 10).
 *
 * Semaine 5, session A : signatures seulement. Les fonctions lèvent « non
 * implémenté » jusqu'à la session B, et les suites de comparaison de
 * `tests/calculations/canton-references.engine.test.ts` échouent volontairement.
 */
import type { BreakdownLine } from "../utils/breakdown";

export type TaxInput = {
	taxYear: number;
	canton: "VD" | "GE" | "VS" | "FR" | "NE" | "JU";
	municipalityOfsId: number;
	maritalStatus: "single" | "married";
	children: number;
	childrenAges: number[]; // certaines déductions en dépendent
	denomination: "none" | "protestant" | "catholic" | "christianCatholic";
	federalTaxableIncome: number;
	cantonalTaxableIncome: number;
	taxableWealth: number;
};

/**
 * Barèmes, coefficients et corrections datées nécessaires au calcul d'un
 * `TaxInput`, assemblés hors du moteur par `getTaxScales` (src/data/tax-scales.ts).
 * Forme arrêtée en session B.
 */
export type TaxScales = Readonly<Record<string, unknown>>;

export type TaxResult = {
	baseCantonalIncomeTax: number;
	baseCantonalWealthTax: number;
	cantonalTax: number;
	municipalTax: number;
	churchTax: number;
	personalTax: number;
	federalTax: number;
	totalTax: number;
	averageRateOnCantonalTaxableIncome: number;
	breakdown: BreakdownLine[];
};

export type MarginalRateResult = {
	/** Impôt supplémentaire sur 100 CHF ajoutés aux deux revenus imposables, en %. */
	marginalRatePercent: number;
	breakdown: BreakdownLine[];
};

export type TaxSavingResult = {
	totalTaxBefore: number;
	totalTaxAfter: number;
	/** `totalTaxBefore − totalTaxAfter`, jamais un taux marginal × un montant. */
	taxSaving: number;
	breakdown: BreakdownLine[];
};

const notImplemented = (name: string): never => {
	throw new Error(`${name} : non implémenté (semaine 5, session B).`);
};

export function computeIncomeAndWealthTax(
	input: TaxInput,
	scales: TaxScales,
): TaxResult {
	void input;
	void scales;
	return notImplemented("computeIncomeAndWealthTax");
}

/**
 * Impôt supplémentaire sur 100 CHF de revenu imposable ajoutés simultanément
 * aux deux bases, divisé par 100. Oracle de pente, jamais méthode de calcul
 * d'une économie.
 */
export function computeMarginalRate(
	input: TaxInput,
	scales: TaxScales,
): MarginalRateResult {
	void input;
	void scales;
	return notImplemented("computeMarginalRate");
}

/**
 * Impôt total moins impôt total avec les deux revenus imposables diminués de
 * `deduction`.
 */
export function computeTaxSavingOnDeduction(
	input: TaxInput,
	scales: TaxScales,
	deduction: number,
): TaxSavingResult {
	void input;
	void scales;
	void deduction;
	return notImplemented("computeTaxSavingOnDeduction");
}
