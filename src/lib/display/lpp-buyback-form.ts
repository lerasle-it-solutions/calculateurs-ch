/**
 * A3 — du formulaire au résultat affiché, tableaux « Et si » compris : la
 * lecture de lpp-buyback-form-core.ts avec l'affichage complet. Sans DOM : la
 * construction l'exécute sur le cas exemple ; dans le navigateur, le cœur de la
 * page appelle la lecture avec l'affichage sans tableaux (décision n° 22).
 */
import type { EstimateReading, FormOutcome, FormValues } from "./calculator-form";
import { displayLppBuyback, type LppBuybackDisplay } from "./lpp-buyback";
import { readLppBuybackFormWith, type LppBuybackPageData } from "./lpp-buyback-form-core";

export type { LppBuybackPageData };

export const readLppBuybackForm = (values: FormValues, data: LppBuybackPageData, estimate?: EstimateReading): FormOutcome<LppBuybackDisplay> =>
	readLppBuybackFormWith(values, data, estimate, displayLppBuyback);
