/**
 * A3 — lignes des tableaux « Et si » : scénarios d'échelonnement et calendrier
 * du délai de blocage, mis en forme depuis ce que le moteur calcule. Hors du
 * cœur (décision n° 22) : la construction l'importe par `displayLppBuyback`,
 * le navigateur par le module « visualisations » (lpp-buyback-visuals.ts). Sans DOM.
 */
import { LOCK_STATUS_LABELS, type LockStatus } from "../calculations/pension/lpp-buyback";
import { formatChfAmount } from "./amounts";
import type { LppBuybackCalendarRow, LppBuybackScenarioRow, LppBuybackTables } from "./lpp-buyback-core";

/** Ordre de gravité des classes : la plus grave d'un scénario est affichée. */
const SEVERITY: LockStatus[] = ["compatible", "checkExactDate", "withinLockPeriod"];

/** Écart signé, dit en mots et non par la couleur : « + 295 CHF », « − 12 CHF » (signe moins typographique, docs/editorial-style.md § 3.1). */
const signedChf = (amount: number): string =>
	amount > 0 ? `+ ${formatChfAmount(amount)}` : amount < 0 ? `− ${formatChfAmount(-amount)}` : formatChfAmount(0);

export function lppBuybackTableRows(
	tables: LppBuybackTables | null,
	texts: { single: string; spread: string },
): { scenarios: LppBuybackScenarioRow[]; calendar: LppBuybackCalendarRow[] } {
	if (tables === null) return { scenarios: [], calendar: [] };
	return {
		scenarios: tables.scenarios.map((scenario) => {
			const statuses = scenario.tranches.flatMap((tranche) => (tranche.lockStatus ? [tranche.lockStatus] : []));
			const worst = statuses.length > 0 ? SEVERITY[Math.max(...statuses.map((status) => SEVERITY.indexOf(status)))]! : null;
			return {
				label: scenario.trancheCount === 1 ? texts.single : texts.spread.replace("{n}", String(scenario.trancheCount)),
				tranches: scenario.tranches.map((tranche) => formatChfAmount(tranche.amount)).join(" + "),
				total: formatChfAmount(scenario.totalSaving),
				difference: signedChf(scenario.differenceFromSingleBuyback),
				lock: worst ? LOCK_STATUS_LABELS[worst] : null,
			};
		}),
		calendar: tables.lockCalendar.map((entry) => ({
			buybackYear: String(entry.buybackYear),
			lockEnds: String(entry.lockEndsYear),
			compatibleFrom: String(entry.lockEndsYear + 1),
			status: entry.status ? LOCK_STATUS_LABELS[entry.status] : null,
		})),
	};
}
