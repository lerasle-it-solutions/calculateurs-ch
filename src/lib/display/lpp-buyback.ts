/**
 * A3 — affichage complet d'un calcul (construction, tests) : le cœur
 * (lpp-buyback-core.ts) et les lignes des tableaux « Et si »
 * (lpp-buyback-tables.ts). Le navigateur n'importe jamais ce module : le cœur
 * de la page prend lpp-buyback-core.ts, le module « visualisations » les
 * tableaux (décision n° 22).
 */
import type { LppBuybackParams } from "../calculations/pension/lpp-buyback";
import { displayLppBuybackCore, type LppBuybackDisplay, type LppBuybackDisplayTexts } from "./lpp-buyback-core";
import { lppBuybackTableRows } from "./lpp-buyback-tables";
import type { StatusLink } from "./result-card";

export * from "./lpp-buyback-core";

export function displayLppBuyback(
	params: LppBuybackParams,
	texts: LppBuybackDisplayTexts,
	officialCalculators: Record<string, StatusLink>,
): LppBuybackDisplay {
	const core = displayLppBuybackCore(params, texts, officialCalculators);
	return { ...core, ...lppBuybackTableRows(core.tables, texts) };
}
