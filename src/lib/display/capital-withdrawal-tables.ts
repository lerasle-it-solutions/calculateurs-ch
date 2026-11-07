/**
 * A4 — lignes des tableaux hors du cœur (décision n° 22) : impôt par année du
 * calendrier saisi, comparaison des échelonnements et phrase du calendrier
 * optimal, mis en forme depuis ce que le moteur calcule. La construction
 * l'importe pour rendre les tableaux du cas exemple, le navigateur par le module
 * « échelonnement » (capital-withdrawal-visuals.ts). Sans DOM.
 */
import { computeCapitalWithdrawalPlan, type CapitalWithdrawalCalendar } from "../calculations/pension/capital-withdrawal-plan";
import { compareCapitalWithdrawalScenarios } from "../calculations/pension/capital-withdrawal-scenarios";
import { formatChfAmount } from "./amounts";
import { CAPITAL_WITHDRAWAL_OPTIONS, type CapitalWithdrawalCoreDisplay } from "./capital-withdrawal-core";

export type CapitalWithdrawalTableTexts = {
	single: string;
	/** « {n} » remplacé par le nombre d'années. */
	spread: string;
	impossible: string;
	/** « {calendar} » et « {saving} » remplacés par le calendrier et l'économie. */
	optimal: string;
	optimalSingle: string;
};

export type CapitalWithdrawalTables = {
	years: string[][];
	scenarios: string[][];
	/** Phrase du calendrier le moins imposé. */
	optimal: string;
};

/** Écart signé, dit en mots et non par la couleur : « + 295 CHF », « − 12 CHF » (signe moins typographique). */
const signedChf = (amount: number): string =>
	amount > 0 ? `+ ${formatChfAmount(amount)}` : amount < 0 ? `− ${formatChfAmount(-amount)}` : formatChfAmount(0);

/** « LPP 240’000 CHF + 3a 45’000 CHF ». */
const withdrawalsText = (entries: CapitalWithdrawalCalendar["years"][number]["withdrawals"]): string =>
	entries.map((entry) => `${entry.pillar === "lpp" ? "LPP" : "3a"} ${formatChfAmount(entry.amount)}`).join(" + ");

/** « 2026 (LPP 120’000 CHF) ; 2027 (LPP 120’000 CHF + 3a 45’000 CHF) ». */
const calendarText = (calendar: CapitalWithdrawalCalendar): string =>
	calendar.years.map((year) => `${year.year} (${withdrawalsText(year.withdrawals)})`).join(" ; ");

export function capitalWithdrawalTableRows(
	engine: CapitalWithdrawalCoreDisplay["engine"] | null,
	texts: CapitalWithdrawalTableTexts,
): CapitalWithdrawalTables {
	if (engine === null) return { years: [], scenarios: [], optimal: "" };
	const plan = computeCapitalWithdrawalPlan(engine.input, engine.scales, CAPITAL_WITHDRAWAL_OPTIONS).plan;
	const comparison = compareCapitalWithdrawalScenarios(engine.input, engine.scales, CAPITAL_WITHDRAWAL_OPTIONS);
	const single = comparison.scenarios.find((scenario) => scenario.feasible && scenario.trancheCount === 1);
	const singleTax = single?.feasible ? single.totalTax : 0;
	return {
		years: (plan?.years ?? []).map((year) => [
			String(year.year),
			withdrawalsText(year.withdrawals),
			formatChfAmount(year.federalTax),
			formatChfAmount(year.cantonalTax),
			formatChfAmount(year.municipalTax),
			formatChfAmount(year.totalTax),
		]),
		scenarios: comparison.scenarios.map((scenario) => [
			scenario.trancheCount === 1 ? texts.single : texts.spread.replace("{n}", String(scenario.trancheCount)),
			scenario.feasible ? calendarText(scenario) : scenario.reason,
			scenario.feasible ? formatChfAmount(scenario.totalTax) : texts.impossible,
			scenario.feasible ? signedChf(scenario.totalTax - singleTax) : "",
		]),
		optimal:
			comparison.optimal.trancheCount === 1
				? texts.optimalSingle
				: texts.optimal.replace("{calendar}", calendarText(comparison.optimal)).replace("{saving}", formatChfAmount(comparison.staggeringSaving)),
	};
}
