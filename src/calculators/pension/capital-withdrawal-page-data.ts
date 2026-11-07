/** A4 — données de la page (src/calculators/page-data.ts). */
import { buildPageData, householdPagePart } from "../page-data";
import { taxDataFile } from "../tax-data-file";
import { capitalWithdrawal, capitalWithdrawalTexts as texts, capitalWithdrawalYear } from "./capital-withdrawal";

const household = householdPagePart(capitalWithdrawalYear, capitalWithdrawal.scope.cantonsCovered, texts);

/** Partie propre à la page, en JSON dans le HTML. */
export const capitalWithdrawalPagePart = {
	...household,
	texts: {
		...household.texts,
		refusedShort: texts.refusedShort,
		householdNotCovered: texts.householdNotCovered,
		householdNotCoveredShort: texts.householdNotCoveredShort,
		capitalMissing: texts.capitalMissing,
		profileMissing: texts.profileMissing,
	},
	tableTexts: {
		single: texts.scenarios.single,
		spread: texts.scenarios.spread,
		impossible: texts.scenarios.impossible,
		optimal: texts.scenarios.optimal,
		optimalSingle: texts.scenarios.optimalSingle,
	},
};

/**
 * Données complètes, à la construction (cas exemple) : celles de la page et du fichier de données,
 * plus les règles du retrait en capital du même fichier, que le script de la page ajoute de même.
 */
export const capitalWithdrawalPageData = {
	...buildPageData(capitalWithdrawalPagePart),
	capitalWithdrawal: taxDataFile(capitalWithdrawalYear).capitalWithdrawal,
};
