import type { CalculatorDefinition } from "./types";

export type Family = CalculatorDefinition["family"];

/** Ordre d'affichage des familles dans le Header et sur l'accueil. */
export const FAMILY_ORDER = [
	"pension",
	"property",
	"energy",
	"business",
] as const satisfies readonly Family[];

/**
 * Segment d'URL FRANÇAIS de chaque famille (voir CLAUDE.md § 6). C'est du
 * contenu (mots-clés, référencement), pas de l'interface : il ne passe donc pas
 * par i18n. Les libellés affichés, eux, sont dans `i18n/fr.ts` (`fr.family`).
 */
export const FAMILY_SEGMENTS: Record<Family, string> = {
	pension: "prevoyance",
	property: "immobilier",
	energy: "energie",
	business: "entreprise",
};

/** URL publique de la page d'index d'une famille : « /prevoyance/ ». */
export const familyUrl = (family: Family): string =>
	`/${FAMILY_SEGMENTS[family]}/`;
