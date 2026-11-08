/**
 * A4 — module « échelonnement » (décision n° 22) : impôt par année du calendrier
 * saisi, comparaison des retraits sur 1 à 4 années et calendrier optimal, hors
 * du cœur. Chargé à la demande par le cœur (capital-withdrawal-page.ts) quand la
 * section approche de l'écran ou après le premier recalcul ; d'ici là, et sans
 * JavaScript, les tableaux rendus au build restent visibles. Au plus
 * 15 000 octets (tests/build/js-budget.test.ts).
 */
import type { CapitalWithdrawalCoreDisplay } from "./capital-withdrawal-core";
import { capitalWithdrawalTableRows, type CapitalWithdrawalTableTexts } from "./capital-withdrawal-tables";
import { fillResultTable } from "./result-table";

export function show(shown: CapitalWithdrawalCoreDisplay | null, texts: CapitalWithdrawalTableTexts): void {
	const { years, scenarios, optimal } = capitalWithdrawalTableRows(shown?.engine ?? null, texts);
	// Sans ligne, aucun tableau : ni en-têtes seuls, ni bloc vide (docs/design-system.md § 4.4)
	fillResultTable(document.getElementById("capital-withdrawal-years")!, years, { right: [2, 3, 4, 5] });
	fillResultTable(document.getElementById("capital-withdrawal-scenarios")!, scenarios, { right: [2, 3] });
	document.getElementById("capital-withdrawal-optimal")!.textContent = optimal;
}
