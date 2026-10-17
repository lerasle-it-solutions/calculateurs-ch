/**
 * Un seul champ commune (docs/design-system.md § 4.3) : le canton est déduit de
 * la commune. Une commune s'affiche seule ; un homonyme dans un autre canton
 * couvert porte son canton entre parenthèses (« Corcelles (NE) »). Les données
 * de la page restent indexées par « Commune (CT) » ; le libellé saisi y est
 * retrouvé par `municipalityKey` (src/lib/display/calculator-form.ts).
 */
import { getMunicipalMultipliers } from "../data";
import { municipalityLabels } from "../lib/display/municipality-labels";

export { municipalityLabels };

/** Options du champ commune pour les cantons couverts par un calculateur. */
export function municipalityOptions(cantonsCovered: readonly string[]): { value: string }[] {
	const entries = (getMunicipalMultipliers()?.multipliers ?? []).filter((entry) => cantonsCovered.includes(entry.canton));
	return [...municipalityLabels(entries).values()].map((value) => ({ value }));
}
