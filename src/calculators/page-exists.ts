/**
 * Existence de la page d'un calculateur, d'après son `slug` : « /prevoyance/x/ »
 * ↔ src/pages/prevoyance/x.astro. Sans importer aucune définition : une
 * définition peut s'en servir pour annoncer un autre calculateur sans cycle
 * d'imports (src/calculators/catalog.ts importe toutes les définitions).
 */
const pages = import.meta.glob("../pages/**/*.astro");

export const pageExists = (slug: string): boolean => `../pages${slug.replace(/\/$/, "")}.astro` in pages;
