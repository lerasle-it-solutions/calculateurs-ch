/** A2 — script de la page, chargé à la première interaction (first-interaction.ts). */
import type { GrossToTaxableRuleSet } from "../calculations/gross-to-taxable";
import { startCalculator } from "./calculator-runtime";
import type { TaxDataFile } from "./tax-data";
import { readPillar3aTaxSavingForm, type Pillar3aTaxSavingPageData } from "./pillar-3a-tax-saving-form";
import type { Pillar3aTaxSavingSummary } from "./pillar-3a-tax-saving";

export const start = (clicked: Element | null, file: TaxDataFile): void => {
	const excess = document.getElementById("pillar3a-saving-excess")!;
	startCalculator<Pillar3aTaxSavingPageData & { estimator: GrossToTaxableRuleSet | null; municipalityOptions: string[] }, Pillar3aTaxSavingSummary>({
		dataId: "pillar3a-saving-data",
		read: readPillar3aTaxSavingForm,
		show: (shown, data) => {
			excess.hidden = !shown?.excess;
			excess.querySelector("[data-excess-text]")!.textContent = shown?.excess ? data.texts.excessWarning.replace("{amount}", shown.excess) : "";
		},
	}, clicked, file);
};
