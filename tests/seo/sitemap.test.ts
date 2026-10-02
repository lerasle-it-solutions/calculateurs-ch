import { describe, expect, it } from "vitest";

import { includeInSitemap, NOINDEX_PATHS } from "../../src/lib/seo/sitemap";
import { isNoindex, renderAllPages } from "./site-pages";

/**
 * Aucune page du sitemap ne porte noindex, et toute page indexable y figure.
 * Le sitemap est construit par @astrojs/sitemap avec `includeInSitemap` pour
 * filtre (astro.config.mjs) : le test confronte ce filtre au rendu réel de
 * chaque page.
 */
const url = (route: string): string => `https://calculateurs.ch${route}`;

describe("sitemap", () => {
	it("aucune page en noindex n'entre dans le sitemap, et toute page indexable y entre", async () => {
		const pages = await renderAllPages();
		const noindexInSitemap = pages.filter(({ route, html }) => isNoindex(html) && includeInSitemap(url(route)));
		const indexableExcluded = pages.filter(({ route, html }) => !isNoindex(html) && !includeInSitemap(url(route)));
		expect(noindexInSitemap.map((page) => page.route), "pages en noindex listées dans le sitemap").toEqual([]);
		expect(indexableExcluded.map((page) => page.route), "pages indexables absentes du sitemap").toEqual([]);
	});

	it("chaque chemin exclu correspond à une page existante", async () => {
		const routes = (await renderAllPages()).map((page) => page.route);
		for (const path of NOINDEX_PATHS) expect(routes, path).toContain(path);
	});
});
