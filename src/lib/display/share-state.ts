/**
 * État partagé d'un calculateur (docs/design-system.md § 4.4) : les saisies
 * sont sérialisées dans le fragment d'URL (`#v1&municipality=Lausanne&…`),
 * jamais en query string : le navigateur n'envoie pas le fragment au serveur.
 * Le résultat n'y figure pas, il est recalculé à l'ouverture. Le préfixe porte
 * la version du format et distingue un état d'une ancre de la page
 * (« #detail-du-calcul »). Sans DOM.
 */
import type { FormValues } from "./calculator-form";

/** Début de tout fragment d'état : version du format. */
export const SHARE_PREFIX = "#v1&";

/** Fragment d'URL des saisies, vides omises. */
export function encodeShareState(values: FormValues): string {
	const params = new URLSearchParams(Object.entries(values).filter(([, value]) => value !== ""));
	return `${SHARE_PREFIX}${params.toString()}`;
}

/** Saisies d'un fragment d'état ; `null` si le fragment n'en est pas un. */
export function decodeShareState(hash: string): FormValues | null {
	if (!hash.startsWith(SHARE_PREFIX)) return null;
	return Object.fromEntries(new URLSearchParams(hash.slice(SHARE_PREFIX.length)));
}
