/** A3 — données de la page (src/calculators/page-data.ts). */
import { buildPageData, householdPagePart } from "../page-data";
import { lppBuyback, lppBuybackLockPeriod, lppBuybackTexts as texts, lppBuybackYear } from "./lpp-buyback";

const household = householdPagePart(lppBuybackYear, lppBuyback.scope.cantonsCovered, texts);

/** Partie propre à la page, en JSON dans le HTML. */
export const lppBuybackPagePart = {
	...household,
	lockPeriodYears: { value: lppBuybackLockPeriod.value, sourceId: lppBuybackLockPeriod.sourceId },
	texts: {
		...household.texts,
		refusedShort: texts.refusedShort,
		amountsMissing: texts.amountsMissing,
		notDeducted: texts.notDeducted,
		single: texts.scenarios.single,
		spread: texts.scenarios.spread,
	},
};

/** Données complètes, à la construction (cas exemple). */
export const lppBuybackPageData = buildPageData(lppBuybackPagePart);
