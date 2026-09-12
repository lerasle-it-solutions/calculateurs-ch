/**
 * Registre central des sources officielles (CLAUDE.md § 1.2).
 *
 * Chaque `sourceId` référencé dans un fichier de `src/data/` doit exister ici
 * (vérifié par `tests/data/sources.test.ts`). Les clés sont en anglais ou des
 * acronymes d'institutions/textes légaux (exception assumée § Convention de
 * nommage) ; `name` et `authority` portent des libellés français, ce sont des
 * noms propres.
 *
 * Une seule entrée pour l'instant : celle qu'alimente
 * `scripts/import-estv-tax-data.ts`. Chaque autre valeur chiffrée entrera avec
 * sa propre source (R2). On n'invente jamais une entrée (R3).
 *
 * Exemple d'entrée à venir :
 *   "opp3-art-7a": {
 *     name: "OPP 3, art. 7a — rachats dans le pilier 3a",
 *     url: "https://www.fedlex.admin.ch/...",
 *     authority: "Confédération",
 *     cadence: "annual",
 *   },
 */
import type { SourceEntry } from "./schema";

export const SOURCES = {
	"estv-swisstaxcalculator": {
		name: "Calculateur d'impôt — barèmes, coefficients communaux et déductions",
		url: "https://swisstaxcalculator.estv.admin.ch/",
		authority: "Administration fédérale des contributions",
		cadence: "annual",
	},
} satisfies Record<string, SourceEntry>;

/** Union des identifiants de source connus (`never` tant que le registre est vide). */
export type SourceId = keyof typeof SOURCES;
