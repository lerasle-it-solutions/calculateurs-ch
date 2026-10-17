/** A2 — données de la page (src/calculators/page-data.ts). */
import { getFederalData } from "../../data";
import { householdPageData, type EstimatorPageData } from "../page-data";
import type { Pillar3aTaxSavingPageData } from "../../lib/display/pillar-3a-tax-saving-form";
import { pillar3aTaxSaving, pillar3aTaxSavingTexts as texts, pillar3aTaxSavingYear } from "./pillar-3a-tax-saving";

const pillar3a = getFederalData(pillar3aTaxSavingYear).pillar3a;
const sourced = (value: { value: number; sourceId: string }) => ({ value: value.value, sourceId: value.sourceId });
const household = householdPageData(pillar3aTaxSavingYear, pillar3aTaxSaving.scope.cantonsCovered, texts);

export const pillar3aTaxSavingPageData: Pillar3aTaxSavingPageData & EstimatorPageData = {
	...household,
	taxYear: pillar3aTaxSavingYear,
	smallContributionCap: sourced(pillar3a.smallContributionCap),
	largeContributionCap: sourced(pillar3a.largeContributionCap),
	largeContributionIncomeRate: sourced(pillar3a.largeContributionIncomeRate),
	ruleSources: { ordinance: "opp3-art-7a", circular: "afc-circular-18a" },
	texts: {
		...household.texts,
		blockedShort: texts.blockedShort,
		earnedIncomeMissing: texts.earnedIncomeMissing,
		earnedIncomeMissingShort: texts.earnedIncomeMissingShort,
		excessWarning: texts.excessWarning,
	},
};
