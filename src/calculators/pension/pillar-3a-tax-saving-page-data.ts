/** A2 — données de la page (src/calculators/page-data.ts). */
import { getFederalData } from "../../data";
import { buildPageData, householdPagePart } from "../page-data";
import { pillar3aTaxSaving, pillar3aTaxSavingTexts as texts, pillar3aTaxSavingYear } from "./pillar-3a-tax-saving";

const pillar3a = getFederalData(pillar3aTaxSavingYear).pillar3a;
const sourced = (value: { value: number; sourceId: string }) => ({ value: value.value, sourceId: value.sourceId });
const household = householdPagePart(pillar3aTaxSavingYear, pillar3aTaxSaving.scope.cantonsCovered, texts);

/** Partie propre à la page, en JSON dans le HTML. */
export const pillar3aTaxSavingPagePart = {
	...household,
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

/** Données complètes, à la construction (cas exemple). */
export const pillar3aTaxSavingPageData = buildPageData(pillar3aTaxSavingPagePart);
