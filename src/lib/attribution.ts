/**
 * Textes d'attribution des sources citées par une page (CLAUDE.md § Conditions
 * d'usage des données de l'AFC). Les pages et composants passent par ici plutôt
 * que par le registre brut : une source `reference-tool` ne peut jamais y être
 * citée.
 */
import { sourceRegistry } from "../data";

/**
 * Textes d'attribution exigés par les sources citées, sans doublon, dans
 * l'ordre de première apparition. Le texte vient toujours du registre
 * (`attributionText`), jamais d'une copie. Un identifiant inconnu, ou une
 * source `reference-tool`, arrête la construction.
 */
export const attributionTextsFor = (sourceIds: readonly string[]): string[] => {
	const texts: string[] = [];
	for (const id of sourceIds) {
		const source = sourceRegistry().get(id);
		if (source === undefined) throw new Error(`Source « ${id} » absente du registre.`);
		if (source.nature === "reference-tool") {
			throw new Error(`Source « ${id} » : outil de référence, jamais cité sur une page publique.`);
		}
		if (source.requiresAttribution && source.attributionText && !texts.includes(source.attributionText)) {
			texts.push(source.attributionText);
		}
	}
	return texts;
};
