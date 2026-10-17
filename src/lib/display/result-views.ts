/**
 * Vues du résultat abonnées à l'évènement `calc:update` : carte (ResultCard)
 * et son résumé, barre mobile, économie par impôt (TaxComponents), message de
 * couverture sous le champ commune (MunicipalityField), trace
 * (CalculationBreakdown) et annonce du montant aux lecteurs d'écran. Ces composants n'ont pas de script : ce
 * qu'ils affichent au chargement est rendu à la construction, et le script de
 * la page, chargé à la demande, les abonne ici. Aucune formule.
 */
import type { BreakdownRow } from "./pillar-3a-buyback";
import { applyResult, coverageOnly, type ResultDetail } from "./result-card";
import { fillSummary, type ResultSummary } from "./result-summary";

/** Délai sans nouvelle saisie avant l'annonce du montant : jamais une annonce par frappe. */
const ANNOUNCE_DELAY_MS = 1000;

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
	const on = (handler: (detail: ResultDetail & { breakdown?: BreakdownRow[]; summary?: ResultSummary | null }) => void) =>
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
			// Part du versement, coût net, rappel de l'imposition à la sortie, coût net de la barre : avec un résultat seulement
			const summary = detail.summary ?? null;
			const block = card.querySelector<HTMLElement>("[data-result-summary]");
			if (block) block.hidden = !summary;
			for (const line of card.querySelectorAll<HTMLElement>("[data-summary-line], [data-bar-net-cost]")) {
				// Base nommée quand la somme saisie dépasse le montant retenu (data-capped)
				line.textContent = summary ? fillSummary((summary.capped && line.dataset.capped) || line.dataset.summaryLine || line.dataset.barNetCost!, summary) : "";
				if (line.matches("[data-bar-net-cost]")) line.hidden = !summary;
			}
			const reminder = card.querySelector<HTMLElement>("[data-exit-reminder]");
			if (reminder) reminder.hidden = !summary;
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

	for (const section of document.querySelectorAll<HTMLElement>("[data-tax-components]")) {
		on(({ summary }) => {
			section.hidden = !summary;
			for (const row of section.querySelectorAll<HTMLElement>("[data-component]")) {
				const amount = summary?.components.find((entry) => entry.key === row.dataset.component)?.amount;
				row.hidden = !amount;
				row.querySelector("dd")!.textContent = amount ?? "";
			}
		});
	}

	// Lecteurs d'écran : le montant final, ou la mention du message, une fois la saisie arrêtée
	const announcer = document.querySelector<HTMLElement>("[data-result-announce]");
	const output = document.querySelector<HTMLElement>("output[data-result-card]");
	if (announcer && output) {
		let timer: ReturnType<typeof setTimeout> | undefined;
		on(({ value, status }) => {
			clearTimeout(timer);
			timer = setTimeout(() => {
				announcer.textContent = status ? status.short : `${output.firstElementChild?.textContent ?? ""} : ${value ?? ""}`;
			}, ANNOUNCE_DELAY_MS);
		});
	}

	for (const breakdown of document.querySelectorAll<HTMLElement>("[data-breakdown]")) {
		const body = breakdown.querySelector<HTMLElement>("[data-breakdown-body]")!;
		const table = breakdown.querySelector<HTMLElement>("[data-breakdown-table]")!;
		const empty = breakdown.querySelector<HTMLElement>("[data-breakdown-empty]")!;
		// Sans ligne, la phrase remplace le tableau : jamais un tableau vide (§ 4.4)
		on(({ breakdown: rows }) => {
			if (!Array.isArray(rows)) return;
			body.innerHTML = rows.map(rowHtml).join("");
			empty.hidden = !(table.hidden = rows.length === 0);
		});
	}
}
