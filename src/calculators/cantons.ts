/**
 * Cantons romands couverts (voir CLAUDE.md § 11, décision 2 : 6 cantons, pas 26).
 *
 * Ce ne sont pas des valeurs chiffrées au sens de R2 (aucun barème, plafond,
 * taux ni seuil) : les `code` sont les abréviations officielles (exception R5),
 * les `name` sont des noms propres (exception § Convention de nommage).
 */
export const ROMANDE_CANTONS = [
	{ code: "VD", name: "Vaud" },
	{ code: "GE", name: "Genève" },
	{ code: "VS", name: "Valais" },
	{ code: "FR", name: "Fribourg" },
	{ code: "NE", name: "Neuchâtel" },
	{ code: "JU", name: "Jura" },
] as const;

export type CantonCode = (typeof ROMANDE_CANTONS)[number]["code"];
