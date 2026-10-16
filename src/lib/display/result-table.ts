/**
 * Remplissage d'un ResultTable (src/components/ui/ResultTable.astro) dans le
 * navigateur. Un tableau ne s'affiche jamais vide (docs/design-system.md
 * § 4.4) : sans ligne, le tableau est retiré et le bloc masqué ; sinon, il est
 * construit depuis le gabarit de la page, une ligne par entrée.
 *
 * Une cellule `null` est omise (colonne facultative absente) ; `right` aligne
 * les montants ; `optionalColumns` garde les en-têtes des colonnes facultatives.
 */
export const fillResultTable = (
	section: HTMLElement,
	rows: (string | null)[][],
	{ right = [], optionalColumns = false }: { right?: number[]; optionalColumns?: boolean } = {},
): void => {
	const slot = section.querySelector<HTMLElement>("[data-result-table-slot]");
	const template = section.querySelector<HTMLTemplateElement>("[data-result-table-template]");
	if (!slot || !template) return;
	section.hidden = rows.length === 0;
	if (rows.length === 0) {
		slot.replaceChildren();
		return;
	}
	const table = template.content.querySelector("table")!.cloneNode(true) as HTMLTableElement;
	if (!optionalColumns) for (const head of table.querySelectorAll("[data-optional-column]")) head.remove();
	const cellClass = section.dataset.cellClass ?? "";
	table.tBodies[0]!.replaceChildren(
		...rows.map((cells) => {
			const tr = document.createElement("tr");
			cells.forEach((text, index) => {
				if (text === null) return;
				const td = document.createElement(index === 0 ? "th" : "td");
				if (index === 0) td.setAttribute("scope", "row");
				td.className = `${cellClass}${index === 0 ? " text-left font-medium" : ""}${right.includes(index) ? " text-right tabular-nums" : ""}`;
				td.textContent = text;
				tr.append(td);
			});
			return tr;
		}),
	);
	slot.replaceChildren(table);
};
