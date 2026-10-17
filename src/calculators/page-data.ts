/**
 * Données d'une page de calculateur fiscal, construites à la compilation (R2 :
 * lues dans src/data/, jamais tapées), en deux parties (src/lib/display/tax-data.ts) :
 *
 * - la partie propre à la page, en JSON dans le HTML (`pageDataJson`) : textes
 *   des messages, calculettes officielles, cantons couverts, adresse du
 *   fichier de données ;
 * - le fichier de données de l'année (src/calculators/tax-data-file.ts),
 *   commun à tous les calculateurs, chargé à la première interaction.
 *
 * La construction les réunit par `hydratePageData` pour calculer le cas
 * exemple, comme le navigateur le fait à la première interaction.
 */
import { getCantonData } from "../data";
import { fr } from "../i18n/fr";
import type { GrossToTaxableRuleSet } from "../lib/calculations/gross-to-taxable";
import { MUNICIPALITY_PLACEHOLDER, hydratePageData, type HouseholdPagePart, type HydratedPageData } from "../lib/display/tax-data";
import { ROMANDE_CANTONS } from "./cantons";
import { taxDataFile, taxDataFileUrl } from "./tax-data-file";

/** Textes des messages communs aux calculateurs fiscaux (A1, repris par A2 et A3). */
export type HouseholdTexts = {
	outOfScope: (canton: string) => string;
	outOfScopeMunicipality: (municipality: string) => string;
	missingData: string;
	unknownMunicipality: string;
	outOfScopeShort: string;
	missingDataShort: string;
	inputShort: string;
};

export type EstimatorPageData = { estimator: GrossToTaxableRuleSet | null };

/** Partie de la page commune aux calculateurs fiscaux. */
export function householdPagePart(taxYear: number, cantonsCovered: readonly string[], texts: HouseholdTexts): HouseholdPagePart {
	return {
		taxYear,
		cantonsCovered: [...cantonsCovered],
		taxDataUrl: taxDataFileUrl(taxYear),
		officialCalculators: Object.fromEntries(
			cantonsCovered.flatMap((code) => {
				const official = getCantonData(code as (typeof ROMANDE_CANTONS)[number]["code"]).coverage?.officialCalculator;
				return official && "url" in official ? [[code, official]] : [];
			}),
		),
		texts: {
			outOfScope: Object.fromEntries(ROMANDE_CANTONS.map((canton) => [canton.code, texts.outOfScope(canton.name)])),
			outOfScopeMunicipalityTemplate: texts.outOfScopeMunicipality(MUNICIPALITY_PLACEHOLDER),
			missingData: texts.missingData,
			unknownMunicipality: texts.unknownMunicipality,
			outOfScopeShort: texts.outOfScopeShort,
			missingDataShort: texts.missingDataShort,
			inputShort: texts.inputShort,
			estimateNote: fr.grossEstimator.resultNote,
			federalAssumedLabel: fr.incomePath.federalAssumedLabel,
			federalAssumed: fr.incomePath.federalAssumed,
			grossSalaryMissing: fr.incomePath.grossSalaryMissing,
			ageMissing: fr.incomePath.ageMissing,
			grossMissingShort: fr.incomePath.grossMissingShort,
			shareLabel: fr.resultSummary.shareLabel,
			netCostLabel: fr.resultSummary.netCostLabel,
		},
	};
}

/** Données complètes d'une page à la construction : sa partie propre et le fichier de données de l'année. */
export const buildPageData = <P extends HouseholdPagePart>(page: P): HydratedPageData<P> => hydratePageData(page, taxDataFile(page.taxYear));

/** JSON d'une page, sans « < » qui fermerait la balise `<script>`. */
export const pageDataJson = (data: unknown): string => JSON.stringify(data).replace(/</g, "\\u003c");
