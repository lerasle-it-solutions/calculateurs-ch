/**
 * Mise à jour d'une carte de résultat à la réception de `calc:update` : le
 * montant, ou, quand le calcul ne rend pas de résultat (ménage ou commune hors
 * périmètre, donnée manquante, saisie à corriger), le message qui l'explique, à
 * la place du montant. Sans DOM : `ResultCard.astro` et la barre de résultat
 * mobile l'appliquent à leurs éléments, les tests à des objets simples.
 */
export type StatusLink = { label: string; url: string };

/**
 * Message qui remplace le montant : texte complet dans la carte, mention courte dans la barre mobile.
 * Son type fixe son rendu (docs/design-system.md § 4.4, `statusTone`) :
 * - `missing` : donnée que le visiteur n'a pas encore saisie, texte neutre ;
 * - `invalid` : saisie invalide, style erreur, préfixe « Erreur : » ;
 * - `coverage` : hors périmètre du moteur (canton, commune, ménage, donnée non relevée), répété sous
 *   le champ commune (`coverageOnly`) ;
 * - `exclusion` : cas `notCovered` déclenché par la saisie, avec son alternative ;
 * - `refusal` : condition légale non remplie, motif du moteur.
 * Les trois derniers : avertissement renforcé, préfixe « Attention : ».
 */
export type ResultStatus = { text: string; short: string; link?: StatusLink; kind?: "missing" | "invalid" | "coverage" | "exclusion" | "refusal" };

/** Rendu d'un message de la carte selon son type. */
export const statusTone = (kind: ResultStatus["kind"]): "neutral" | "error" | "warning" =>
	kind === "invalid" ? "error" : kind === "coverage" || kind === "exclusion" || kind === "refusal" ? "warning" : "neutral";

/** `note` : mention courte sous le montant, p. ex. « estimation » ; absente, la note s'efface. */
export type ResultDetail = { value?: string; status?: ResultStatus | null; note?: string | null };

/** Ce que la mise à jour touche d'un élément : de quoi le tester sans DOM. */
type Slot = Pick<HTMLElement, "hidden" | "textContent">;
type LinkSlot = Slot & Pick<HTMLAnchorElement, "href">;

export type ResultCardSlots = {
	/** Montant affiché. */
	value: Slot;
	/** Conteneur du message ; absent sur une carte qui n'en affiche pas. */
	message: Slot | null;
	/** Texte complet du message (carte). Sans lui, le conteneur reçoit la mention courte (barre mobile). */
	messageText: Slot | null;
	/** Lien du message, vers la calculette officielle du canton. */
	messageLink: LinkSlot | null;
	/** Mention sous le montant (carte seulement). */
	note?: Slot | null;
};

export function applyResult(slots: ResultCardSlots, detail: ResultDetail): void {
	if (typeof detail.value === "string") slots.value.textContent = detail.value;
	if (slots.note) {
		slots.note.hidden = !detail.note;
		slots.note.textContent = detail.note ?? "";
	}
	const { message, messageText, messageLink } = slots;
	if (!message) return;
	const status = detail.status ?? null;
	slots.value.hidden = status !== null;
	message.hidden = status === null;
	// Style du type de message (ResultCard.astro), sur un élément du DOM seulement
	if ("toggleAttribute" in message) {
		const tone = status ? statusTone(status.kind) : "neutral";
		(message as HTMLElement).toggleAttribute("data-warning", tone === "warning");
		(message as HTMLElement).toggleAttribute("data-error", tone === "error");
	}
	if (!messageText) {
		message.textContent = status?.short ?? "";
		return;
	}
	messageText.textContent = status?.text ?? "";
	if (messageLink) {
		messageLink.hidden = !status?.link;
		messageLink.textContent = status?.link?.label ?? "";
		if (status?.link) messageLink.href = status.link.url;
	}
}

/**
 * Message sous le champ commune (MunicipalityField, docs/design-system.md § 4.3) :
 * seul un statut de couverture s'y affiche ; tout autre statut, ou un résultat,
 * l'efface. Appliqué par `applyResult` au bloc du champ, dont le conteneur sert
 * aussi d'emplacement du montant : la dernière affectation de `hidden` gagne.
 */
export const coverageOnly = (detail: ResultDetail): ResultDetail => ({
	status: detail.status?.kind === "coverage" ? detail.status : null,
});
