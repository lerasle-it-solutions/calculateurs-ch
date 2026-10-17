/**
 * Vues du résultat abonnées à l'évènement `calc:update` : carte (ResultCard),
 * barre mobile, message de couverture sous le champ commune (MunicipalityField)
 * et trace (CalculationBreakdown). Ces composants n'ont pas de script : ce
 * qu'ils affichent au chargement est rendu à la construction, et le script de
 * la page, chargé à la demande, les abonne ici. Aucune formule.
 */
import type { BreakdownRow } from "./pillar-3a-buyback";
import { applyResult, coverageOnly, type ResultDetail } from "./result-card";

const escapeHtml = (value: string) =>
	value.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char] as string);

// Classes répétées, mises en commun pour le budget de JavaScript.
const cell = "border-b border-hairline px-md py-sm";
const fine = "block text-fine text-ink-muted";

const rowHtml = (row: BreakdownRow) =>
	`<tr class="align-top"><td class="${cell}"><span class="block">${escapeHtml(row.label)}</span>` +
	(row.detail ? `<span class="${fine} tabular-nums">${escapeHtml(row.detail)}</span>` : "") +
	(row.note ? `<span class="${fine}">${escapeHtml(row.note)}</span>` : "") +
	`</td><td class="${cell} text-right tabular-nums">${escapeHtml(row.amount)}` +
	(row.qualifier ? `<span class="block text-fine">${escapeHtml(row.qualifier)}</span>` : "") +
	`</td></tr>`;

/** Abonne carte, barre mobile, message sous le champ commune et trace à `calc:update`. */
export function attachResultViews(): void {
	const on = (handler: (detail: ResultDetail & { breakdown?: BreakdownRow[] }) => void) =>
		document.addEventListener("calc:update", (event) => handler((event as CustomEvent).detail ?? {}));

	for (const card of document.querySelectorAll<HTMLElement>("[data-result-card]")) {
		const slots = {
			value: card.querySelector<HTMLElement>("[data-result-value]")!,
			message: card.querySelector<HTMLElement>("[data-result-status]"),
			messageText: card.querySelector<HTMLElement>("[data-status-text]"),
			messageLink: card.querySelector<HTMLAnchorElement>("[data-status-link]"),
			note: card.querySelector<HTMLElement>("[data-result-note]"),
		};
		// Transition du recalcul (§ 3.3) : relancée à chaque nouvelle valeur, jamais de chiffres intermédiaires
		on((detail) => {
			const changed = typeof detail.value === "string" && detail.value !== slots.value.textContent;
			applyResult(slots, detail);
			if (!changed || !card.matches("output")) return;
			slots.value.classList.remove("motion-safe:animate-result-refresh");
			void slots.value.offsetWidth;
			slots.value.classList.add("motion-safe:animate-result-refresh");
		});
	}

	// Limite de couverture sous le champ commune (MunicipalityField) : le conteneur sert d'emplacement du montant
	for (const message of document.querySelectorAll<HTMLElement>("[data-coverage-message]")) {
		const slots = {
			value: message,
			message,
			messageText: message.querySelector<HTMLElement>("[data-coverage-text]"),
			messageLink: message.querySelector<HTMLAnchorElement>("[data-coverage-link]"),
		};
		on((detail) => applyResult(slots, coverageOnly(detail)));
	}

	for (const breakdown of document.querySelectorAll<HTMLElement>("[data-breakdown]")) {
		const body = breakdown.querySelector<HTMLElement>("[data-breakdown-body]")!;
		const empty = `<tr><td colspan="2" class="px-md py-sm text-fine text-ink-muted">${escapeHtml(breakdown.dataset.emptyLabel ?? "")}</td></tr>`;
		on((detail) => {
			if (Array.isArray(detail.breakdown)) body.innerHTML = detail.breakdown.length ? detail.breakdown.map(rowHtml).join("") : empty;
		});
	}
}
