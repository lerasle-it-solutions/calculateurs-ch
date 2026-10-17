/** A1 — données de la page (src/calculators/page-data.ts). */
import { getFederalData } from "../../data";
import { buildPageData, householdPagePart } from "../page-data";
import { pillar3aBuyback, pillar3aBuybackTexts, pillar3aBuybackYear, pillar3aGapYears } from "./pillar-3a-buyback";

const pillar3a = getFederalData(pillar3aBuybackYear).pillar3a;
const sourced = (value: { value: number; sourceId: string }) => ({ value: value.value, sourceId: value.sourceId });
// Exclusion déclenchée par la saisie : l'alternative est celle que notCovered déclare (§ 4.3)
const oldAgeBenefitAlternative = (() => {
	const alternative = pillar3aBuyback.scope.notCovered.find((entry) => entry.case.includes("prestation de vieillesse"))?.alternative;
	if (typeof alternative !== "object" || !alternative.url) throw new Error("Alternative de l'exclusion « prestation de vieillesse » absente.");
	return { label: alternative.label, url: alternative.url };
})();
const household = householdPagePart(pillar3aBuybackYear, pillar3aBuyback.scope.cantonsCovered, pillar3aBuybackTexts);

/** Partie propre à la page, en JSON dans le HTML. */
export const pillar3aBuybackPagePart = {
	...household,
	buybackYear: pillar3aBuybackYear,
	gapYears: pillar3aGapYears,
	firstGapYear: sourced(pillar3a.buyback.firstGapYear),
	lookbackYears: sourced(pillar3a.buyback.lookbackYears),
	smallContributionCap: sourced(pillar3a.smallContributionCap),
	texts: { ...household.texts, blockedShort: pillar3aBuybackTexts.blockedShort },
	oldAgeBenefitAlternative,
};

/** Données complètes, à la construction (cas exemple). */
export const pillar3aBuybackPageData = buildPageData(pillar3aBuybackPagePart);
