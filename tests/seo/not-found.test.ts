import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { includeInSitemap } from "../../src/lib/seo/sitemap";
import { isNoindex, renderAllPages } from "./site-pages";

/**
 * Page 404. Cloudflare Pages sert le fichier 404.html le plus proche, avec le
 * code 404, pour toute URL inconnue ; sans 404.html à la racine, il renvoie
 * l'accueil avec un code 200. Astro émet src/pages/404.astro en dist/404.html,
 * à la racine.
 */
describe("page 404", () => {
	it("existe à la racine de src/pages/, donc en dist/404.html", () => {
		expect(existsSync(fileURLToPath(new URL("../../src/pages/404.astro", import.meta.url)))).toBe(true);
	});

	it("n'est pas indexée, n'entre pas dans le sitemap et renvoie à l'accueil", async () => {
		const page = (await renderAllPages()).find(({ route }) => route === "/404/");
		expect(page).toBeDefined();
		expect(isNoindex(page!.html)).toBe(true);
		expect(includeInSitemap("https://calculateurs.ch/404/")).toBe(false);
		expect(page!.html).toMatch(/<h1[^>]*>[^<]+<\/h1>/);
		expect(page!.html).toMatch(/<a href="\/"[^>]*>[^<]*accueil/i);
	});
});
