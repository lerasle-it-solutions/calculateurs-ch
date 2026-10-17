/** A1 — données de la page (src/calculators/page-data.ts). */
import { getFederalData } from "../../data";
import { ROMANDE_CANTONS } from "../cantons";
import { householdPageData, type EstimatorPageData } from "../page-data";
import type { Pillar3aBuybackPageData } from "../../lib/display/pillar-3a-buyback-form";
import { pillar3aBuyback, pillar3aBuybackTexts, pillar3aBuybackYear, pillar3aGapYears } from "./pillar-3a-buyback";

const pillar3a = getFederalData(pillar3aBuybackYear).pillar3a;
const sourced = (value: { value: number; sourceId: string }) => ({ value: value.value, sourceId: value.sourceId });
// Exclusion déclenchée par la saisie : l'alternative est celle que notCovered déclare (§ 4.3)
const oldAgeBenefitAlternative = (() => {
	const alternative = pillar3aBuyback.scope.notCovered.find((entry) => entry.case.includes("prestation de vieillesse"))?.alternative;
	if (typeof alternative !== "object" || !alternative.url) throw new Error("Alternative de l'exclusion « prestation de vieillesse » absente.");
	return { label: alternative.label, url: alternative.url };
})();
const household = householdPageData(pillar3aBuybackYear, pillar3aBuyback.scope.cantonsCovered, pillar3aBuybackTexts);

export const pillar3aBuybackPageData: Pillar3aBuybackPageData & EstimatorPageData = {
	...household,
	buybackYear: pillar3aBuybackYear,
	gapYears: pillar3aGapYears,
	firstGapYear: sourced(pillar3a.buyback.firstGapYear),
	lookbackYears: sourced(pillar3a.buyback.lookbackYears),
	smallContributionCap: sourced(pillar3a.smallContributionCap),
	cantonNames: Object.fromEntries(ROMANDE_CANTONS.map((canton) => [canton.code, canton.name])),
	texts: { ...household.texts, blockedShort: pillar3aBuybackTexts.blockedShort },
	oldAgeBenefitAlternative,
};
