/**
 * Règles du garde-fou du premier écran (scripts/fold-check.ts), sans
 * navigateur : testées par tests/scripts/fold-rules.test.ts.
 *
 * Critère du design system (§ 4.1, arbitrage du mainteneur du 23.10.2026) :
 *   - page de calculateur : le premier champ est visible sans défiler, au-dessus
 *     de la barre de résultat mobile ;
 *   - accueil : le montant du cas exemple est visible sans défiler.
 */
export const FOLD_VIEWPORTS = [
	{ width: 375, height: 667 },
	{ width: 320, height: 568 },
] as const;

export type FoldKind = "firstField" | "amount";
export type FoldTarget = { path: string; kind: FoldKind };

/** Pages à mesurer : l'accueil pour son montant, chaque calculateur (JSON-LD WebApplication) pour son premier champ. */
export const foldTargets = (pages: { url: string; html: string }[]): FoldTarget[] =>
	pages.flatMap((page): FoldTarget[] => {
		const path = new URL(page.url).pathname;
		if (path === "/") return [{ path, kind: "amount" }];
		return /"@type":"WebApplication"/.test(page.html) ? [{ path, kind: "firstField" }] : [];
	});

/** L'élément tient dans l'écran, entre son haut et la limite (haut de la barre mobile, sinon bas de l'écran). */
export const foldVerdict = (box: { top: number; bottom: number } | null, limit: number): boolean =>
	box !== null && box.top >= 0 && box.bottom <= limit;
