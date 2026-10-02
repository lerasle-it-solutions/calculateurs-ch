/**
 * Pages non indexées (`noindex`) et filtre du sitemap : une page en noindex
 * n'a rien à faire dans le sitemap, Search Console le signalerait comme une
 * erreur. Liste unique, lue par astro.config.mjs (filtre de @astrojs/sitemap)
 * et vérifiée par tests/seo/sitemap.test.ts contre le rendu réel des pages.
 */
export const NOINDEX_PATHS: readonly string[] = [
	"/404/",
	"/demo-calculateur/",
	"/demo-ui/",
	"/mentions-legales/",
	"/politique-de-confidentialite/",
];

/** Filtre de @astrojs/sitemap : reçoit l'URL absolue d'une page. */
export const includeInSitemap = (page: string): boolean => !NOINDEX_PATHS.includes(new URL(page).pathname);
