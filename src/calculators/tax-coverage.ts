/**
 * Couverture cantonale du moteur fiscal, lue dans la couche de données.
 *
 * Un canton déclaré en couverture partielle (`coverage` dans
 * src/data/cantons/{ct}.json) entre dans `notCovered`, avec un lien vers le
 * calculateur officiel du canton quand il est relevé : le périmètre l'annonce
 * avant la saisie (P5), et le moteur refuse le calcul (`PartialCoverageError`)
 * plutôt que de rendre un résultat faux. Si la couverture partielle ne vise que
 * certains ménages (`notCoveredHouseholds`), le canton reste dans
 * `cantonsCovered` pour les autres.
 */
import { cantonFiles, getMunicipalMultipliers } from "../data";
import { cantonDataSchema } from "../data/schema";
import { fr } from "../i18n/fr";
import { ROMANDE_CANTONS, type CantonCode } from "./cantons";
import type { CalculatorDefinition } from "./types";

type Scope = CalculatorDefinition["scope"];

export type TaxEngineCoverage = {
	cantonsCovered: CantonCode[];
	notCovered: Scope["notCovered"];
};

/**
 * Cantons que le moteur fiscal calcule, et entrées `notCovered` des cantons en
 * couverture partielle. À reprendre dans le `scope` de tout calculateur qui
 * appelle le moteur fiscal.
 */
export function taxEngineCoverage(): TaxEngineCoverage {
	const cantonsCovered: CantonCode[] = [];
	const notCovered: Scope["notCovered"] = [];
	for (const { code, name } of ROMANDE_CANTONS) {
		const file = cantonFiles().find((candidate) => candidate.code === code);
		const data = file ? cantonDataSchema.parse(file.data) : undefined;
		const coverage = data?.coverage;
		if (coverage === undefined) {
			cantonsCovered.push(code);
			continue;
		}
		// Couverture limitée à certains ménages : le canton reste couvert pour les autres.
		const households = coverage.notCoveredHouseholds;
		if (households !== undefined) cantonsCovered.push(code);
		// Barème communal propre : seules les communes dont l'indexation est relevée sont couvertes.
		const communes = (getMunicipalMultipliers()?.multipliers ?? []).filter((entry) => entry.canton === code);
		const coveredMunicipalities = communes
			.filter((entry) => entry.communalScaleIndexation !== undefined)
			.map((entry) => entry.municipality)
			.sort((a, b) => a.localeCompare(b, "fr"));
		const someMunicipalitiesUncovered =
			data?.communalScale !== null && coveredMunicipalities.length < communes.length;
		const householdsText = households?.map((household) => fr.partialCoverage.households[household]).join(" ; ");
		const text =
			householdsText === undefined
				? fr.partialCoverage.notCoveredCase(name)
				: someMunicipalitiesUncovered
					? fr.partialCoverage.notCoveredHouseholdsAndMunicipalitiesCase(name, householdsText, coveredMunicipalities)
					: fr.partialCoverage.notCoveredHouseholdsCase(name, householdsText);
		const official = coverage.officialCalculator;
		notCovered.push(
			"url" in official
				? { case: text, alternative: { label: official.label, url: official.url } }
				: { case: `${text} ${fr.partialCoverage.useOfficialCalculator}` },
		);
	}
	return { cantonsCovered, notCovered };
}
