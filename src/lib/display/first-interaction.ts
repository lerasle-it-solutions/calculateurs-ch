/**
 * Chargeur minimal d'une page de calculateur, seul script exécuté au
 * chargement : le résultat du cas exemple est rendu à la construction, la page
 * n'a besoin de rien d'autre pour s'afficher. Dès le premier focus, `pointerdown`
 * ou `touchstart` dans `[data-calculator-root]`, il charge le cœur à la demande
 * (`import()` à chemin fixe, CLAUDE.md § 3, décision n° 21) et lui passe le
 * dernier élément cliqué entre-temps, pour qu'un bouton pressé pendant le
 * chargement ne soit pas perdu. Pendant le chargement, la carte garde le
 * résultat de l'exemple : aucun état vide, aucun indicateur.
 */
export type PageScript = { start: (clicked: Element | null) => void };

// « click » : seulement pour retenir le bouton pressé ; le focus ou le pointeur l'a précédé
const EVENTS = ["focusin", "pointerdown", "touchstart", "click"];

export function onFirstInteraction(load: () => Promise<PageScript>): void {
	const root = document.querySelector("[data-calculator-root]");
	if (!root) return;
	let clicked: Element | null = null;
	let loading = false;
	const handle = (event: Event) => {
		if (event.type === "click") clicked = event.target as Element;
		if (loading) return;
		loading = true;
		load().then((script) => {
			for (const type of EVENTS) root.removeEventListener(type, handle);
			script.start(clicked);
		});
	};
	for (const type of EVENTS) root.addEventListener(type, handle, { passive: true });
}
