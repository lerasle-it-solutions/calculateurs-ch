/**
 * Accueil — cœur à la demande du héros (first-interaction.ts) : le calcul
 * d'A2 sur trois champs (commune, revenu imposable, montant versé), les autres
 * réponses valant celles d'A2 par défaut. Le revenu fédéral du cas exemple, en
 * champ masqué, cesse de compter dès que le revenu cantonal change : le
 * fédéral le suit alors, hypothèse inscrite dans la trace. Le lien « Affiner »
 * reprend les saisies dans le fragment d'URL (share-state.ts).
 */
import type { GrossToTaxableRuleSet } from "../calculations/gross-to-taxable";
import { startCalculator } from "./calculator-runtime";
import { readPillar3aTaxSavingForm, type Pillar3aTaxSavingPageData } from "./pillar-3a-tax-saving-form";
import { encodeShareState } from "./share-state";
import type { TaxDataFile } from "./tax-data";

export const start = (clicked: Element | null, file: TaxDataFile): void => {
	const form = document.querySelector<HTMLFormElement>("[data-calculator]")!;
	const refine = document.querySelector<HTMLAnchorElement>("[data-refine]")!;
	const differs = form.elements.namedItem("federalDiffers") as HTMLInputElement | null;
	const cantonal = form.elements.namedItem("cantonalTaxableIncome") as HTMLInputElement;
	// Revenu cantonal déjà modifié pendant le chargement du cœur
	if (differs && cantonal.value !== cantonal.defaultValue) differs.value = "no";
	// En capture : avant le recalcul, que le formulaire déclenche sur le même évènement
	form.addEventListener("input", (event) => {
		if (differs && (event.target as HTMLInputElement).name === "cantonalTaxableIncome") differs.value = "no";
	}, true);
	startCalculator<Pillar3aTaxSavingPageData & { estimator: GrossToTaxableRuleSet | null; municipalityOptions: string[] }, unknown>({
		dataId: "home-data",
		read: readPillar3aTaxSavingForm,
		show: () => {
			const values = Object.fromEntries(new FormData(form)) as Record<string, string>;
			if (values.federalDiffers === "no") {
				delete values.federalDiffers;
				delete values.federalTaxableIncome;
			}
			refine.hash = encodeShareState(values);
		},
	}, clicked, file);
};
