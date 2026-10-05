/**
 * Accès strict à une valeur des données fédérales, pour les textes éditoriaux
 * (articles) qui citent un montant ou une année : année absente, chemin
 * inexistant, valeur undefined ou TODO, la lecture lève une erreur et la
 * construction échoue. Jamais de valeur par défaut (R3).
 */
import { getFederalData } from "./index";

const describe = (year: number, path: string): string => `federal/${year}.json → ${path}`;

/** Valeur brute d'un `Value<T>` lu au chemin `path` (« pillar3a.smallContributionCap »). */
export function federalValue(year: number, path: string): unknown {
	let node: unknown = getFederalData(year);
	for (const key of path.split(".")) {
		if (node === null || typeof node !== "object" || !(key in node)) {
			throw new Error(`Valeur introuvable : ${describe(year, path)}.`);
		}
		node = (node as Record<string, unknown>)[key];
	}
	if (node === null || typeof node !== "object") throw new Error(`Pas une valeur sourcée : ${describe(year, path)}.`);
	if ("todo" in node) throw new Error(`Valeur encore à relever (TODO) : ${describe(year, path)}.`);
	if (!("value" in node) || (node as { value: unknown }).value === undefined) {
		throw new Error(`Valeur undefined : ${describe(year, path)}.`);
	}
	return (node as { value: unknown }).value;
}

/** Comme `federalValue`, en exigeant un nombre fini. */
export function federalNumber(year: number, path: string): number {
	const value = federalValue(year, path);
	if (typeof value !== "number" || !Number.isFinite(value)) {
		throw new Error(`Nombre attendu : ${describe(year, path)}, obtenu ${JSON.stringify(value)}.`);
	}
	return value;
}
