import { describe, expect, it } from "vitest";

import { decodeEntities, pageRoutes, renderAllPages, staticFiles } from "./site-pages";

/**
 * Aucun lien interne du site ne mène à une page inexistante : chaque `href`
 * qui commence par « / » désigne une page de src/pages/, une route générée
 * (src/pages/**\/*.ts) ou un fichier de public/.
 */
const targets = new Set([...pageRoutes, ...staticFiles]);

/** « /prevoyance » et « /prevoyance/ » désignent la même page ; fragment et requête ignorés. */
const normalize = (href: string): string => {
	const path = decodeURI(decodeEntities(href).split(/[?#]/)[0]!);
	return /\.[a-z0-9]+$/i.test(path) || path.endsWith("/") ? path : `${path}/`;
};

describe("liens internes", () => {
	it("chaque lien interne de chaque page mène à une page ou à un fichier existant", async () => {
		const pages = await renderAllPages();
		expect(pages.length).toBeGreaterThan(5);
		const broken: string[] = [];
		for (const { route, html } of pages) {
			for (const [, href] of html.matchAll(/\shref="([^"]+)"/g)) {
				if (!href!.startsWith("/") || href!.startsWith("//") || href!.startsWith("/_astro/")) continue;
				if (!targets.has(normalize(href!))) broken.push(`${route} → ${href}`);
			}
		}
		expect(broken, "liens internes vers une page inexistante").toEqual([]);
	});

	it("le test sait reconnaître un lien mort", () => {
		expect(targets.has(normalize("/immobilier/"))).toBe(false);
		expect(targets.has(normalize("/prevoyance"))).toBe(true);
		expect(targets.has(normalize("/favicon.svg"))).toBe(true);
		expect(targets.has(normalize("/donnees/coefficients-communaux.csv"))).toBe(true);
	});
});
