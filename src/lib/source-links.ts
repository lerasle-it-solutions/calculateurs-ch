/**
 * Lien vers une source du registre, pour les articles : nom et URL lus dans
 * src/data/sources.ts, jamais recopiés. Identifiant inconnu : la construction
 * échoue. Les pages et composants passent par ce module, sans importer le
 * registre (tests/data/sources.test.ts).
 */
import { sourceRegistry } from "../data";

export type SourceLink = { name: string; url: string };

export function sourceLink(sourceId: string): SourceLink {
	const source = sourceRegistry().get(sourceId);
	if (!source) throw new Error(`Source inconnue du registre : « ${sourceId} ».`);
	if (!source.url) throw new Error(`Source sans URL : « ${sourceId} ».`);
	return { name: source.name, url: source.url };
}
