/**
 * Retrait en capital de la prévoyance (A4) : l'impôt du calendrier saisi
 * (capital-withdrawal-plan.ts) et la comparaison des échelonnements
 * (capital-withdrawal-scenarios.ts), réunis pour la construction et les tests.
 * Le navigateur importe les deux modules séparément (décision n° 22).
 */
import type { BreakdownLine } from "../../utils/breakdown";
import {
	computeCapitalWithdrawalPlan,
	type CapitalWithdrawalCalendar,
	type CapitalWithdrawalInput,
	type CapitalWithdrawalOptions,
	type CapitalWithdrawalRefusal,
	type CapitalWithdrawalScales,
} from "./capital-withdrawal-plan";
import { compareCapitalWithdrawalScenarios, type CapitalWithdrawalScenario, type FeasibleScenario } from "./capital-withdrawal-scenarios";

export * from "./capital-withdrawal-plan";
export * from "./capital-withdrawal-scenarios";

export type CapitalWithdrawalResult = {
	/** Vide si le calendrier envisagé respecte l'art. 13a LPP ; sinon, `plan` vaut `null`. */
	refusals: CapitalWithdrawalRefusal[];
	plan: CapitalWithdrawalCalendar | null;
	/** Un scénario par nombre d'années de `SCENARIO_TRANCHE_COUNTS`. */
	scenarios: CapitalWithdrawalScenario[];
	/** Le scénario le moins imposé ; à égalité, celui qui a le moins d'années. */
	optimal: FeasibleScenario;
	/** Retrait en une fois moins le scénario optimal. */
	staggeringSaving: number;
	/** Calendrier envisagé moins le scénario optimal ; `null` si le calendrier est refusé. */
	planExtraTax: number | null;
	breakdown: BreakdownLine[];
};

export function computeCapitalWithdrawal(
	input: CapitalWithdrawalInput,
	scales: CapitalWithdrawalScales,
	options: CapitalWithdrawalOptions = {},
): CapitalWithdrawalResult {
	const plan = computeCapitalWithdrawalPlan(input, scales, options);
	const comparison = compareCapitalWithdrawalScenarios(input, scales, options);
	return {
		refusals: plan.refusals,
		plan: plan.plan,
		scenarios: comparison.scenarios,
		optimal: comparison.optimal,
		staggeringSaving: comparison.staggeringSaving,
		planExtraTax: comparison.planExtraTax,
		breakdown: [...plan.breakdown, ...comparison.breakdown],
	};
}
