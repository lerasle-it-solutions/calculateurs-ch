/** A2 — script de la page, chargé à la première interaction (first-interaction.ts). */
import type { GrossToTaxableRuleSet } from "../calculations/gross-to-taxable";
import { startCalculator } from "./calculator-runtime";
import type { FormValues } from "./calculator-form";
import { personField, readPillar3aTaxSavingForm, type Pillar3aTaxSavingPageData } from "./pillar-3a-tax-saving-form";
import type { Pillar3aTaxSavingSummary } from "./pillar-3a-tax-saving";

/** Bloc d'un champ : l'enfant du formulaire qui le contient. */
const fieldBlock = (form: HTMLFormElement, name: string): HTMLElement | null => {
	let element = form.elements.namedItem(name) as HTMLElement | null;
	while (element && element.parentElement !== form) element = element.parentElement;
	return element;
};

// Champs affichés selon les réponses : conjoint ou partenaire, activité après l'âge de référence,
// revenu de l'activité lucrative sans caisse de pension
const showFields = (values: FormValues, form: HTMLFormElement) => {
	const show = (name: string, shown: boolean) => {
		const block = fieldBlock(form, name);
		if (block) block.hidden = !shown;
	};
	const married = values.maritalStatus === "married";
	for (const prefix of ["", "spouse"] as const) {
		const key = (name: string) => personField(prefix, name);
		const shown = prefix === "" || married;
		for (const name of ["hasAvsIncome", "reachedReferenceAge", "affiliated", "contribution"]) show(key(name), shown);
		show(key("workingAfterReferenceAge"), shown && values[key("reachedReferenceAge")] === "yes");
		show(key("earnedIncome"), shown && values[key("affiliated")] === "no");
	}
};

export const start = (): void => {
	const summary = document.getElementById("pillar3a-saving-summary")!;
	const excess = document.getElementById("pillar3a-saving-excess")!;
	startCalculator<Pillar3aTaxSavingPageData & { estimator: GrossToTaxableRuleSet | null }, Pillar3aTaxSavingSummary>({
		dataId: "pillar3a-saving-data",
		read: readPillar3aTaxSavingForm,
		beforeRead: showFields,
		show: (shown, data) => {
			summary.hidden = shown === null;
			for (const slot of summary.querySelectorAll<HTMLElement>("[data-summary]")) {
				slot.textContent = shown?.[slot.dataset.summary as keyof Pillar3aTaxSavingSummary] ?? "";
			}
			excess.hidden = !shown?.excess;
			excess.textContent = shown?.excess ? data.texts.excessWarning.replace("{amount}", shown.excess) : "";
		},
	});
};
