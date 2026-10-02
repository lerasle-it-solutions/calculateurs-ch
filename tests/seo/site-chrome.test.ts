import { describe, expect, it } from "vitest";

import { renderAllPages } from "./site-pages";

/**
 * En-tête et pied de page identiques sur toutes les pages du site, ceux de
 * l'accueil faisant référence. Seul l'état « page courante » (aria-current)
 * varie, par construction : il souligne la rubrique de la page.
 */
const chrome = (html: string, tag: "header" | "footer"): string | undefined =>
	html
		.match(new RegExp(`<${tag}[\\s>][\\s\\S]*?</${tag}>`))?.[0]
		.replace(/ aria-current="page"/g, "")
		.replace(/ data-astro-cid-[a-z0-9]+/g, "");

describe("en-tête et pied de page", () => {
	it("chaque page porte l'en-tête et le pied de page de l'accueil", async () => {
		const pages = await renderAllPages();
		const home = pages.find((page) => page.route === "/");
		expect(home).toBeDefined();
		const header = chrome(home!.html, "header");
		const footer = chrome(home!.html, "footer");
		expect(header).toBeDefined();
		expect(footer).toBeDefined();
		const different = pages.flatMap(({ route, html }) => [
			...(chrome(html, "header") === header ? [] : [`${route} : en-tête`]),
			...(chrome(html, "footer") === footer ? [] : [`${route} : pied de page`]),
		]);
		expect(different).toEqual([]);
	});
});
