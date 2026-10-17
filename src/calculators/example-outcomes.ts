/**
 * Résultat du cas exemple de chaque calculateur publié, calculé à la
 * construction en exécutant le moteur (docs/design-system.md § 4.2) : la page
 * l'affiche au chargement, et tout montant « type » affiché ailleurs en vient.
 */
import type { FormOutcome } from "../lib/display/calculator-form";
import { exampleFormValues } from "./field-values";
import { readLppBuybackForm } from "../lib/display/lpp-buyback-form";
import { readPillar3aBuybackForm } from "../lib/display/pillar-3a-buyback-form";
import { readPillar3aTaxSavingForm } from "../lib/display/pillar-3a-tax-saving-form";
import { LPP_BUYBACK_ID, lppBuyback } from "./pension/lpp-buyback";
import { lppBuybackPageData } from "./pension/lpp-buyback-page-data";
import { PILLAR_3A_BUYBACK_ID, pillar3aBuyback } from "./pension/pillar-3a-buyback";
import { pillar3aBuybackPageData } from "./pension/pillar-3a-buyback-page-data";
import { PILLAR_3A_TAX_SAVING_ID, pillar3aTaxSaving } from "./pension/pillar-3a-tax-saving";
import { pillar3aTaxSavingPageData } from "./pension/pillar-3a-tax-saving-page-data";

const RUNS: Record<string, () => FormOutcome<unknown>> = {
	[PILLAR_3A_BUYBACK_ID]: () => readPillar3aBuybackForm(exampleFormValues(pillar3aBuyback), pillar3aBuybackPageData),
	[PILLAR_3A_TAX_SAVING_ID]: () => readPillar3aTaxSavingForm(exampleFormValues(pillar3aTaxSaving), pillar3aTaxSavingPageData),
	[LPP_BUYBACK_ID]: () => readLppBuybackForm(exampleFormValues(lppBuyback), lppBuybackPageData),
};

export function exampleOutcome(id: string): FormOutcome<unknown> {
	const run = RUNS[id];
	if (!run) throw new Error(`Aucun cas exemple exécutable pour ${id}.`);
	return run();
}
