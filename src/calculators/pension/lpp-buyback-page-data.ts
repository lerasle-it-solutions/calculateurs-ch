/** A3 — données de la page (src/calculators/page-data.ts). */
import { householdPageData, type EstimatorPageData } from "../page-data";
import type { LppBuybackPageData } from "../../lib/display/lpp-buyback-form";
import { lppBuyback, lppBuybackLockPeriod, lppBuybackTexts as texts, lppBuybackYear } from "./lpp-buyback";

const household = householdPageData(lppBuybackYear, lppBuyback.scope.cantonsCovered, texts);

export const lppBuybackPageData: LppBuybackPageData & EstimatorPageData = {
	...household,
	taxYear: lppBuybackYear,
	lockPeriodYears: { value: lppBuybackLockPeriod.value, sourceId: lppBuybackLockPeriod.sourceId },
	texts: {
		...household.texts,
		refusedShort: texts.refusedShort,
		notDeducted: texts.notDeducted,
		single: texts.scenarios.single,
		spread: texts.scenarios.spread,
	},
};
