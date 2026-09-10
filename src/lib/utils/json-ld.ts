/**
 * Sérialise un objet en JSON-LD sûr à injecter dans un <script>.
 * Neutralise « < » pour empêcher toute fermeture prématurée de la balise.
 */
export const jsonLd = (data: unknown): string =>
	JSON.stringify(data).replace(/</g, "\\u003c");
