/** A1 — script de la page, chargé à la première interaction (first-interaction.ts). */
import { startCalculator } from "./calculator-runtime";
import type { TaxDataFile } from "./tax-data";
import { readPillar3aBuybackForm, type Pillar3aBuybackPageData } from "./pillar-3a-buyback-form";
import type { GrossToTaxableRuleSet } from "../calculations/gross-to-taxable";

export const start = (clicked: Element | null, file: TaxDataFile): void =>
	startCalculator<Pillar3aBuybackPageData & { estimator: GrossToTaxableRuleSet | null; municipalityOptions: string[] }, null>({
		dataId: "pillar3a-data",
		read: readPillar3aBuybackForm,
		// Revenus imposables estimés depuis le salaire brut, A1 : diminués de la cotisation ordinaire de l'année
		ordinaryContribution: (data) => data.smallContributionCap,
	}, clicked, file);
