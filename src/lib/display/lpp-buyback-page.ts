/** A3 — script de la page, chargé à la première interaction (first-interaction.ts). */
import type { GrossToTaxableRuleSet } from "../calculations/gross-to-taxable";
import { startCalculator } from "./calculator-runtime";
import { readLppBuybackForm, type LppBuybackPageData } from "./lpp-buyback-form";
import type { LppBuybackDisplay } from "./lpp-buyback";
import { fillResultTable } from "./result-table";

export const start = (): void => {
	const resultBlock = document.getElementById("lpp-buyback-result")!;
	const notDeducted = document.getElementById("lpp-buyback-not-deducted")!;
	const scenarioTable = document.getElementById("lpp-buyback-scenarios")!;
	const calendarTable = document.getElementById("lpp-buyback-calendar")!;
	startCalculator<LppBuybackPageData & { estimator: GrossToTaxableRuleSet | null }, LppBuybackDisplay>({
		dataId: "lpp-buyback-data",
		read: readLppBuybackForm,
		show: (shown) => {
			resultBlock.hidden = shown === null;
			if (shown?.summary) {
				for (const slot of resultBlock.querySelectorAll<HTMLElement>("[data-summary]")) {
					slot.textContent = shown.summary[slot.dataset.summary as keyof typeof shown.summary];
				}
			}
			notDeducted.hidden = !shown?.notDeducted;
			notDeducted.textContent = shown?.notDeducted ?? "";
			const withLock = Boolean(shown?.calendar.some((entry) => entry.status !== null));
			// Sans ligne, aucun tableau : ni en-têtes seuls, ni bloc vide (docs/design-system.md § 4.4)
			fillResultTable(
				scenarioTable,
				(shown?.scenarios ?? []).map((scenario) => [scenario.label, scenario.tranches, scenario.total, scenario.difference, withLock ? scenario.lock : null]),
				{ right: [2, 3], optionalColumns: withLock },
			);
			fillResultTable(
				calendarTable,
				(shown?.calendar ?? []).map((entry) => [entry.buybackYear, entry.lockEnds, entry.compatibleFrom, withLock ? entry.status : null]),
				{ optionalColumns: withLock },
			);
		},
	});
};
