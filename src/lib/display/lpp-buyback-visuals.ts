/**
 * A3 — module « visualisations » (décision n° 22) : les tableaux « Et si »,
 * échelonnement et délai de blocage, hors du cœur, lignes mises en forme ici
 * (lpp-buyback-tables.ts). Chargé à la demande par le cœur (lpp-buyback-page.ts)
 * quand leur section approche de l'écran ou après le premier recalcul ; d'ici
 * là, et sans JavaScript, les tableaux rendus au build restent visibles. Les
 * graphiques du calculateur viendront ici. Au plus 15 000 octets
 * (tests/build/js-budget.test.ts).
 */
import type { LppBuybackCoreDisplay } from "./lpp-buyback-core";
import { lppBuybackTableRows } from "./lpp-buyback-tables";
import { fillResultTable } from "./result-table";

export function show(shown: LppBuybackCoreDisplay | null, texts: { single: string; spread: string }): void {
	const { scenarios, calendar } = lppBuybackTableRows(shown?.tables ?? null, texts);
	const withLock = calendar.some((entry) => entry.status !== null);
	// Sans ligne, aucun tableau : ni en-têtes seuls, ni bloc vide (docs/design-system.md § 4.4)
	fillResultTable(
		document.getElementById("lpp-buyback-scenarios")!,
		scenarios.map((scenario) => [scenario.label, scenario.tranches, scenario.total, scenario.difference, withLock ? scenario.lock : null]),
		{ right: [2, 3], optionalColumns: withLock },
	);
	fillResultTable(
		document.getElementById("lpp-buyback-calendar")!,
		calendar.map((entry) => [entry.buybackYear, entry.lockEnds, entry.compatibleFrom, withLock ? entry.status : null]),
		{ optionalColumns: withLock },
	);
}
