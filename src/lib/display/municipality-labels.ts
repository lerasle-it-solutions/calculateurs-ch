/**
 * Libellés du champ commune (docs/design-system.md § 4.3) : une commune
 * s'affiche seule ; un homonyme dans un autre canton couvert porte son canton
 * entre parenthèses (« Corcelles (NE) »). Fonction pure, partagée par la
 * construction (validation du cas exemple) et le navigateur, qui remplit la
 * liste des communes à la première interaction (src/lib/display/tax-data.ts).
 */
type Entry = { municipality: string; canton: string };

/** Libellé affiché de chaque commune, par clé « Commune (CT) ». */
export function municipalityLabels(entries: Entry[]): Map<string, string> {
	const cantonsByName = new Map<string, Set<string>>();
	for (const { municipality, canton } of entries) {
		cantonsByName.set(municipality, (cantonsByName.get(municipality) ?? new Set()).add(canton));
	}
	return new Map(
		entries.map(({ municipality, canton }) => {
			const key = `${municipality} (${canton})`;
			return [key, cantonsByName.get(municipality)!.size > 1 ? key : municipality];
		}),
	);
}
