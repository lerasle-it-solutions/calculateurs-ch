/**
 * Limite de couverture sous le champ commune, au moment du choix
 * (docs/design-system.md § 4.3) : à la réception de `calc:update`, un statut de
 * couverture (`kind: "coverage"`, établi par coverage.ts) s'affiche sous le
 * champ, avec le lien vers la calculette du canton ; tout autre statut, ou un
 * résultat, l'efface. La carte résultat affiche le même statut (result-card.ts).
 * Sans DOM : `MunicipalityField.astro` l'applique à ses éléments, les tests à
 * des objets simples.
 */
import type { ResultDetail } from "./result-card";

type Slot = Pick<HTMLElement, "hidden" | "textContent">;

export type FieldCoverageSlots = {
	/** Conteneur du message, sous le champ. */
	message: Slot;
	/** Texte du message. */
	text: Slot;
	/** Lien vers la calculette officielle du canton. */
	link: Slot & Pick<HTMLAnchorElement, "href">;
};

export function applyFieldCoverage(slots: FieldCoverageSlots, detail: ResultDetail): void {
	const status = detail.status?.kind === "coverage" ? detail.status : null;
	slots.message.hidden = status === null;
	slots.text.textContent = status?.text ?? "";
	slots.link.hidden = !status?.link;
	slots.link.textContent = status?.link?.label ?? "";
	if (status?.link) slots.link.href = status.link.url;
}
