/**
 * Mise à jour d'une carte de résultat à la réception de `calc:update` : le
 * montant, ou, quand le calcul ne rend pas de résultat (ménage ou commune hors
 * périmètre, donnée manquante, saisie à corriger), le message qui l'explique, à
 * la place du montant. Sans DOM : `ResultCard.astro` et la barre de résultat
 * mobile l'appliquent à leurs éléments, les tests à des objets simples.
 */
export type StatusLink = { label: string; url: string };

/** Message qui remplace le montant : texte complet dans la carte, mention courte dans la barre mobile. */
export type ResultStatus = { text: string; short: string; link?: StatusLink };

export type ResultDetail = { value?: string; status?: ResultStatus | null };

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
};

export function applyResult(slots: ResultCardSlots, detail: ResultDetail): void {
	if (typeof detail.value === "string") slots.value.textContent = detail.value;
	const { message, messageText, messageLink } = slots;
	if (!message) return;
	const status = detail.status ?? null;
	slots.value.hidden = status !== null;
	message.hidden = status === null;
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
