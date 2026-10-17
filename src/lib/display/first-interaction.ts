/**
 * Chargeur minimal d'une page qui calcule, seul script exécuté au chargement :
 * le résultat du cas exemple est rendu à la construction, la page n'a besoin
 * de rien d'autre pour s'afficher. Dès le premier focus, `pointerdown`,
 * `touchstart` ou clic dans `[data-calculator-root]`, il charge le
 * fichier de données de l'année (`data-tax-data`, src/lib/display/tax-data.ts),
 * puis le cœur à la demande (`import()` à chemin fixe, CLAUDE.md § 3, décision
 * n° 21) : les modules du cœur lisent dès leur évaluation les libellés de la
 * trace, que le fichier apporte (src/lib/build/browser-trace-labels.ts). Il
 * passe ensuite au cœur les données et le dernier élément cliqué entre-temps,
 * pour qu'un bouton pressé pendant le chargement ne soit pas perdu. Pendant le
 * chargement, la carte garde le résultat de l'exemple : aucun état vide, aucun
 * indicateur.
 *
 * Un état partagé dans le fragment d'URL (share-state.ts) se restaure sans
 * attendre d'interaction : le chargement part aussitôt.
 *
 * En cas d'échec, la carte et la barre mobile remplacent le montant par un
 * message neutre (`data-load-failed`) ; la carte porte un bouton « Réessayer ».
 * Toute nouvelle interaction relance le chargement.
 */
// Signature de méthode : le cœur type ses données (TaxDataFile), le chargeur ne les lit pas
export type PageScript = { start(clicked: Element | null, data: unknown): void };

// « click » : seulement pour retenir le bouton pressé ; le focus ou le pointeur l'a précédé
const EVENTS = ["focusin", "pointerdown", "touchstart", "click"];

/** Montant ou message d'échec, dans la carte et la barre mobile. */
const showFailure = (failed: boolean): void => {
	for (const card of document.querySelectorAll("[data-result-card]")) {
		const value = card.querySelector<HTMLElement>("[data-result-value]");
		const status = card.querySelector<HTMLElement>("[data-result-status]");
		const message = card.querySelector<HTMLElement>("[data-load-failed]");
		if (!message) continue;
		message.hidden = !failed;
		if (failed) {
			// Ce qui était affiché revient au prochain essai
			card.toggleAttribute("data-status-shown", status?.hidden === false);
			if (status) status.hidden = true;
			if (value) value.hidden = true;
		} else if (value) {
			const shown = card.hasAttribute("data-status-shown");
			value.hidden = shown;
			if (status) status.hidden = !shown;
		}
	}
};

export function onFirstInteraction(load: () => Promise<PageScript>): void {
	const root = document.querySelector<HTMLElement>("[data-calculator-root]");
	if (!root) return;
	let clicked: Element | null = null;
	let loading = false;
	let failed = false;
	const handle = (event: Event) => {
		if (event.type === "click") clicked = event.target as Element;
		if (loading) return;
		loading = true;
		if (failed) showFailure((failed = false));
		const data = fetch(root.dataset.taxData!)
			.then((response) => (response.ok ? response.json() : Promise.reject(response.status)))
			.then((file: { traceLabels: Record<string, string[]> }) => {
				for (const [id, labels] of Object.entries(file.traceLabels)) {
					if (document.getElementById(id)) continue;
					const element = document.createElement("script");
					element.type = "application/json";
					element.id = id;
					element.textContent = JSON.stringify(labels);
					document.body.append(element);
				}
				return file;
			});
		Promise.all([data.then(load), data]).then(
			([script, file]) => {
				for (const type of EVENTS) root.removeEventListener(type, handle);
				script.start(clicked, file);
			},
			() => {
				loading = false;
				showFailure((failed = true));
			},
		);
	};
	for (const type of EVENTS) root.addEventListener(type, handle, { passive: true });
	if (location.hash.length > 1) handle(new Event("hashchange"));
}
