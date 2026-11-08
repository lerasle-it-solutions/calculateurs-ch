/**
 * Retrait en capital (A4), comparaison des échelonnements : pour 1 à 4 années
 * civiles successives, le calendrier le moins imposé, le calendrier optimal et
 * l'économie de l'échelonnement. Hors du cœur (décision n° 22) : le navigateur
 * le charge à la demande, après le premier recalcul ou quand la section
 * approche de l'écran. Méthode : comptes 3a entiers (circulaire AFC n° 18a,
 * ch. 6.2.a), capital LPP en trois étapes au plus, la première d'au moins 20 %
 * (art. 13a al. 2 et 3 LPP), bornes lues dans les données.
 */
import type { BreakdownLine } from "../../utils/breakdown";
import {
	calendarOf,
	fmtChf,
	lppRefusals,
	prepareCapitalWithdrawal,
	type CapitalWithdrawalCalendar,
	type CapitalWithdrawalEntry,
	type CapitalWithdrawalInput,
	type CapitalWithdrawalOptions,
	type CapitalWithdrawalScales,
	type Evaluator,
	type Line,
} from "./capital-withdrawal-plan";
import * as labels from "./capital-withdrawal-labels";

/** Nombres d'années civiles comparés. */
export const SCENARIO_TRANCHE_COUNTS = [1, 2, 3, 4] as const;
/** Méthode : premier pas de la répartition du capital LPP entre ses étapes, 1/50 du capital. */
const LPP_FIRST_STEP_DIVISOR = 50;
/** Méthode : déplacements au plus par taille de pas. */
const LPP_MOVES_PER_STEP = 200;
/** Méthode : placements des comptes 3a et des étapes LPP repris pour la répartition fine. */
const REFINED_CANDIDATES = 5;

export type CapitalWithdrawalScenario =
	| ({ trancheCount: number; feasible: true } & CapitalWithdrawalCalendar)
	| { trancheCount: number; feasible: false; reason: string };

export type FeasibleScenario = Extract<CapitalWithdrawalScenario, { feasible: true }>;

export type CapitalWithdrawalComparison = {
	/** Un scénario par nombre d'années de `SCENARIO_TRANCHE_COUNTS`. */
	scenarios: CapitalWithdrawalScenario[];
	/** Le scénario le moins imposé ; à égalité, celui qui a le moins d'années. */
	optimal: FeasibleScenario;
	/** Retrait en une fois moins le scénario optimal. */
	staggeringSaving: number;
	/** Calendrier saisi moins le scénario optimal ; `null` si le calendrier est refusé. */
	planExtraTax: number | null;
	breakdown: BreakdownLine[];
};

/** Montant minimal de la première étape LPP, en francs entiers (art. 13a al. 3 LPP). */
const minimumFirstPart = (lppTotal: number, lpp: CapitalWithdrawalScales["lpp"]): number =>
	Math.ceil((lppTotal * lpp.minimumFirstPartialPercent.value) / 100);

/** Parts égales en francs entiers, la première relevée au minimum légal s'il le faut, la dernière absorbant le reste. */
const equalLppSplit = (lppTotal: number, count: number, minimumFirst: number): number[] => {
	if (count === 1) return [lppTotal];
	const first = Math.max(minimumFirst, Math.floor(lppTotal / count));
	const other = Math.floor((lppTotal - first) / (count - 1));
	const parts = [first, ...Array.from({ length: count - 1 }, () => other)];
	parts[count - 1] = lppTotal - parts.slice(0, -1).reduce((sum, part) => sum + part, 0);
	return parts;
};

/**
 * Meilleure répartition du capital LPP entre les années `lppYears` (croissantes),
 * les comptes 3a étant déjà placés : on part de parts égales, puis on déplace des
 * montants d'une année à l'autre tant que l'impôt baisse, par pas de 1/`LPP_FIRST_STEP_DIVISOR`
 * du capital, puis dix fois plus fins, jusqu'au franc. Méthode.
 */
const bestLppSplit = (
	lppTotal: number,
	lppYears: number[],
	baseByYear: Map<number, number>,
	minimumFirst: number,
	evaluate: Evaluator,
): number[] => {
	const parts = equalLppSplit(lppTotal, lppYears.length, minimumFirst);
	if (lppYears.length === 1) return parts;
	const minimum = lppYears.map((_, index) => (index === 0 ? minimumFirst : 1));
	const costAt = (index: number, amount: number): number =>
		evaluate(lppYears[index]!, (baseByYear.get(lppYears[index]!) ?? 0) + amount).totalTax;
	for (let step = Math.max(1, Math.floor(lppTotal / LPP_FIRST_STEP_DIVISOR)); ; step = Math.max(1, Math.floor(step / 10))) {
		for (let improved = true, guard = 0; improved && guard < LPP_MOVES_PER_STEP; guard++) {
			improved = false;
			for (let from = 0; from < parts.length; from++) {
				if (parts[from]! - step < minimum[from]!) continue;
				for (let to = 0; to < parts.length; to++) {
					if (to === from) continue;
					const change =
						costAt(from, parts[from]! - step) + costAt(to, parts[to]! + step) - costAt(from, parts[from]!) - costAt(to, parts[to]!);
					if (change < 0) {
						parts[from]! -= step;
						parts[to]! += step;
						improved = true;
					}
				}
			}
		}
		if (step === 1) break;
	}
	return parts;
};

type Candidate = { lppYears: number[]; assignment: number[]; baseByYear: Map<number, number>; quickTax: number };

/** Le calendrier le moins imposé sur `count` années civiles successives, ou le motif de son impossibilité. */
const bestScenario = (
	count: number,
	firstYear: number,
	lppTotal: number,
	accounts: number[],
	lpp: CapitalWithdrawalScales["lpp"],
	evaluate: Evaluator,
): CapitalWithdrawalScenario => {
	const maximumYears = accounts.length + (lppTotal > 0 ? lpp.maximumSteps.value : 0);
	if (count > maximumYears) {
		return {
			trancheCount: count,
			feasible: false,
			reason: `${count} années demandent au moins ${count} étapes : vous avez ${accounts.length} compte(s) 3a${lppTotal > 0 ? ` et un capital LPP retiré en ${lpp.maximumSteps.value} étapes au plus (art. 13a al. 2 LPP)` : ""}.`,
		};
	}
	const years = Array.from({ length: count }, (_, index) => firstYear + index);
	const minimumFirst = minimumFirstPart(lppTotal, lpp);
	const lppSubsets: number[][] = [];
	if (lppTotal > 0) {
		for (let mask = 1; mask < 1 << count; mask++) {
			const subset = years.filter((_, index) => mask & (1 << index));
			if (subset.length <= lpp.maximumSteps.value && (subset.length === 1 || minimumFirst + subset.length - 1 <= lppTotal)) {
				lppSubsets.push(subset);
			}
		}
	} else lppSubsets.push([]);

	const withdrawalsOf = (candidate: Candidate, parts: number[]): CapitalWithdrawalEntry[] => [
		...parts.map((amount, index) => ({ pillar: "lpp" as const, amount, year: candidate.lppYears[index]! })),
		...accounts.map((amount, index) => ({ pillar: "pillar3a" as const, amount, year: years[candidate.assignment[index]!]! })),
	];

	// 1. Tous les placements des comptes 3a et des étapes LPP, chiffrés avec des parts LPP égales
	const candidates: Candidate[] = [];
	const combinations = count ** accounts.length;
	for (let combination = 0; combination < combinations; combination++) {
		const assignment: number[] = [];
		for (let index = 0, rest = combination; index < accounts.length; index++, rest = Math.floor(rest / count)) assignment.push(rest % count);
		const baseByYear = new Map<number, number>();
		assignment.forEach((yearIndex, index) => baseByYear.set(years[yearIndex]!, (baseByYear.get(years[yearIndex]!) ?? 0) + accounts[index]!));
		for (const lppYears of lppSubsets) {
			if (!years.every((year) => baseByYear.has(year) || lppYears.includes(year))) continue;
			const candidate: Candidate = { lppYears, assignment, baseByYear, quickTax: 0 };
			const parts = lppTotal > 0 ? equalLppSplit(lppTotal, lppYears.length, minimumFirst) : [];
			candidate.quickTax = calendarOf(withdrawalsOf(candidate, parts), evaluate).totalTax;
			candidates.push(candidate);
		}
	}
	if (candidates.length === 0) {
		return { trancheCount: count, feasible: false, reason: `Aucun calendrier sur ${count} années ne respecte l'art. 13a LPP avec ces montants.` };
	}

	// 2. Répartition fine du capital LPP pour les meilleurs placements seulement
	candidates.sort((a, b) => a.quickTax - b.quickTax);
	let best: CapitalWithdrawalCalendar | null = null;
	for (const candidate of candidates.slice(0, REFINED_CANDIDATES)) {
		const parts = lppTotal > 0 ? bestLppSplit(lppTotal, candidate.lppYears, candidate.baseByYear, minimumFirst, evaluate) : [];
		const calendar = calendarOf(withdrawalsOf(candidate, parts), evaluate);
		if (best === null || calendar.totalTax < best.totalTax) best = calendar;
	}
	return { trancheCount: count, feasible: true, ...best! };
};

export const describeCalendar = (calendar: CapitalWithdrawalCalendar): string =>
	calendar.years
		.map(
			(year) =>
				`${year.year} : ${year.withdrawals.map((entry) => `${entry.pillar === "lpp" ? "LPP" : "3a"} ${fmtChf(entry.amount)}`).join(" + ")}, impôt ${fmtChf(year.totalTax)}`,
		)
		.join(" ; ");

/** Les échelonnements sur 1 à 4 années, le calendrier optimal et l'économie de l'échelonnement, avec leur trace. */
export function compareCapitalWithdrawalScenarios(
	input: CapitalWithdrawalInput,
	scales: CapitalWithdrawalScales,
	options: CapitalWithdrawalOptions = {},
): CapitalWithdrawalComparison {
	const prepared = prepareCapitalWithdrawal(input, scales, options);
	const { evaluate, firstYear, lppTotal, accounts } = prepared;
	const breakdown: BreakdownLine[] = [];
	const line: Line = (entry) => breakdown.push(entry);

	const scenarios = SCENARIO_TRANCHE_COUNTS.map((count) => bestScenario(count, firstYear, lppTotal, accounts, scales.lpp, evaluate));
	for (const scenario of scenarios) {
		line({
			label: `${labels.SCENARIO} ${scenario.trancheCount} année(s)`,
			operands: { trancheCount: scenario.trancheCount },
			formula: scenario.feasible ? describeCalendar(scenario) : scenario.reason,
			value: scenario.feasible ? scenario.totalTax : 0,
			unit: "CHF",
			sourceId: null,
			assumption: labels.SCENARIO_ASSUMPTION,
			...(scenario.feasible ? {} : { noAmount: true, qualifier: labels.SCENARIO_IMPOSSIBLE }),
		});
	}
	const feasible = scenarios.filter((scenario): scenario is FeasibleScenario => scenario.feasible);
	const optimal = feasible.reduce((best, scenario) => (scenario.totalTax < best.totalTax ? scenario : best));
	const single = feasible.find((scenario) => scenario.trancheCount === 1)!;

	line({ label: labels.OPTIMAL_CALENDAR, operands: { trancheCount: optimal.trancheCount }, formula: describeCalendar(optimal), value: optimal.totalTax, unit: "CHF", sourceId: null });
	prepared.traced(optimal.years.flatMap((year) => year.withdrawals), line);
	const staggeringSaving = single.totalTax - optimal.totalTax;
	line({
		label: labels.STAGGERING_SAVING,
		operands: { singleTax: single.totalTax, optimalTax: optimal.totalTax },
		formula: `${fmtChf(single.totalTax)} − ${fmtChf(optimal.totalTax)}`,
		value: staggeringSaving,
		unit: "CHF",
		sourceId: null,
	});
	const planTax = lppRefusals(input.withdrawals, scales.lpp).length === 0 ? calendarOf(input.withdrawals, evaluate).totalTax : null;
	const planExtraTax = planTax === null ? null : planTax - optimal.totalTax;
	if (planTax !== null) {
		line({
			label: labels.PLAN_EXTRA_TAX,
			operands: { planTax, optimalTax: optimal.totalTax },
			formula: `${fmtChf(planTax)} − ${fmtChf(optimal.totalTax)}`,
			value: planExtraTax!,
			unit: "CHF",
			sourceId: null,
		});
	}
	return { scenarios, optimal, staggeringSaving, planExtraTax, breakdown };
}
