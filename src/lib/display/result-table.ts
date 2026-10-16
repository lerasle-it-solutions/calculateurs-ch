/**
 * Remplissage d'un ResultTable (src/components/ui/ResultTable.astro) dans le
 * navigateur. Un tableau ne s'affiche jamais vide (docs/design-system.md
 * § 4.4) : sans ligne, le tableau est retiré et le bloc masqué ; sinon, il est
 * construit depuis le gabarit, une ligne par entrée. Le premier `<div>` du bloc
 * reçoit le tableau ; filets et marges des cellules viennent de la classe du
 * tableau, pas du script (budget de JavaScript).
 *
 * Une cellule `null` est omise (colonne facultative absente) ; `right` aligne
 * les montants ; `optionalColumns` garde les en-têtes des colonnes facultatives.
 */
export const fillResultTable = (
	section: HTMLElement,
	rows: (string | null)[][],
	{ right = [], optionalColumns = false }: { right?: number[]; optionalColumns?: boolean } = {},
): void => {
	const slot = section.querySelector("div")!;
	section.hidden = !rows.length;
	if (!rows.length) return slot.replaceChildren();
	const table = section.querySelector("template")!.content.querySelector("table")!.cloneNode(true) as HTMLTableElement;
	if (!optionalColumns) for (const head of table.querySelectorAll("[data-optional-column]")) head.remove();
	table.tBodies[0]!.replaceChildren(
		...rows.map((cells) => {
			const tr = document.createElement("tr");
			cells.forEach((text, index) => {
				if (text === null) return;
				const cell = tr.appendChild(document.createElement(index ? "td" : "th"));
				if (!index) cell.scope = "row";
				if (right.includes(index)) cell.className = "text-right tabular-nums";
				cell.textContent = text;
			});
			return tr;
		}),
	);
	slot.replaceChildren(table);
};
