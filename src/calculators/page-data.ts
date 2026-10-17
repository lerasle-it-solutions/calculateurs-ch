/**
 * Données embarquées par la page d'un calculateur fiscal, construites à la
 * compilation (R2 : lues dans src/data/, jamais tapées) et lues par le même
 * code à la construction (cas exemple) et dans le navigateur : barèmes du
 * canton et de chaque commune, règles de l'estimateur du salaire brut,
 * communes, calculettes officielles et textes des messages.
 */
import { getCantonData, getMunicipalMultipliers } from "../data";
import { getGrossToTaxableRuleSet } from "../data/gross-to-taxable";
import { getTaxScalesBundle } from "../data/tax-scales";
import { fr } from "../i18n/fr";
import type { GrossToTaxableRuleSet } from "../lib/calculations/gross-to-taxable";
import type { HouseholdPageData } from "../lib/display/calculator-form";
import { ROMANDE_CANTONS } from "./cantons";

type CantonCode = (typeof ROMANDE_CANTONS)[number]["code"];

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

export function householdPageData(
	taxYear: number,
	cantonsCovered: readonly string[],
	texts: HouseholdTexts,
): HouseholdPageData & EstimatorPageData {
	const cantons = cantonsCovered as CantonCode[];
	const bundle = getTaxScalesBundle(taxYear, cantons);
	return {
		bundle,
		// Chemin « salaire brut » : seulement si l'estimateur a ses données pour l'année de calcul
		estimator: (() => {
			try {
				return getGrossToTaxableRuleSet(taxYear, cantons);
			} catch {
				return null;
			}
		})(),
		// Clés « Commune (CT) » ; le champ affiche le libellé (src/calculators/municipalities.ts)
		municipalities: Object.fromEntries(
			(getMunicipalMultipliers()?.multipliers ?? [])
				.filter((entry) => cantons.includes(entry.canton))
				.map((entry) => [`${entry.municipality} (${entry.canton})`, { ofsId: entry.bfsId, canton: entry.canton }]),
		),
		officialCalculators: Object.fromEntries(
			cantons.flatMap((code) => {
				const official = getCantonData(code).coverage?.officialCalculator;
				return official && "url" in official ? [[code, official]] : [];
			}),
		),
		texts: {
			outOfScope: Object.fromEntries(ROMANDE_CANTONS.map((canton) => [canton.code, texts.outOfScope(canton.name)])),
			// Seules les communes non couvertes en entier en ont besoin : le moteur ne lève leur
			// erreur de couverture qu'avec ce nom (PartialCoverageError.municipality).
			outOfScopeMunicipality: Object.fromEntries(
				bundle.municipalities.flatMap(({ coverage }) =>
					coverage?.municipality === undefined ? [] : [[coverage.municipality, texts.outOfScopeMunicipality(coverage.municipality)]],
				),
			),
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
		},
	};
}

/** JSON d'une page, sans « < » qui fermerait la balise `<script>`. */
export const pageDataJson = (data: unknown): string => JSON.stringify(data).replace(/</g, "\\u003c");
