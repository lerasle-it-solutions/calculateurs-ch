import { execFileSync } from "node:child_process";

import { describe, expect, it } from "vitest";

import { frSectionRanges, lastmodOf, pageSources } from "../../src/lib/seo/lastmod";
import { includeInSitemap } from "../../src/lib/seo/sitemap";
import { isW3cDatetime } from "../../src/lib/seo/meta-rules";
import { pageRoutes } from "./site-pages";

/**
 * `lastmod` du sitemap : la date du dernier commit qui a touché les sources de
 * la page (la page, les définitions de src/calculators/, l'article, les
 * données et le registre des sources qu'elle lit, et les seules sections de
 * src/i18n/fr.ts qu'elle affiche), jamais la date de construction. L'habillage
 * commun (gabarits, en-tête, pied de page, styles) et le code ne datent pas le
 * contenu (prompt SEO du 23.10.2026, étape 3).
 */
const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8" }).trim();

describe("sources d'une page", () => {
	it("un calculateur : sa page, ses définitions, ses données, ses sections de chaînes, sans l'habillage", () => {
		const { files, frSections } = pageSources("/prevoyance/rachat-lpp/");
		expect(files).toContain("src/pages/prevoyance/rachat-lpp.astro");
		expect(files).toContain("src/calculators/pension/lpp-buyback.ts");
		expect(files.some((file) => /^src\/data\/.+\.json$/.test(file))).toBe(true);
		for (const excluded of ["src/layouts/BaseLayout.astro", "src/layouts/CalculatorLayout.astro", "src/components/layout/Header.astro", "src/components/layout/Footer.astro", "src/i18n/fr.ts", "src/pages/index.astro"]) {
			expect(files, excluded).not.toContain(excluded);
		}
		expect(files.filter((file) => file.startsWith("src/lib/") || file.startsWith("src/components/") || file.startsWith("src/styles/"))).toEqual([]);
		expect(files.filter((file) => file.startsWith("src/data/private/"))).toEqual([]);
		expect(frSections).toContain("calculator");
		expect(frSections).not.toContain("notFound");
	});

	it("un guide : son seul article, pas les autres", () => {
		const { files } = pageSources("/prevoyance/guides/rachat-3a-retroactif/");
		expect(files).toContain("src/pages/prevoyance/guides/[slug].astro");
		expect(files).toContain("src/content/articles/rachat-3a-retroactif.mdx");
		expect(files).not.toContain("src/content/articles/3a-ou-rachat-lpp.mdx");
	});

	it("une page qui liste les guides dépend de chaque article", () => {
		const { files } = pageSources("/guides/");
		expect(files).toContain("src/pages/guides.astro");
		expect(files).toContain("src/content/articles/rachat-3a-retroactif.mdx");
		expect(files).toContain("src/content/articles/3a-ou-rachat-lpp.mdx");
	});

	it("une route inconnue est refusée", () => {
		expect(() => pageSources("/immobilier/")).toThrow();
	});
});

describe("sections de src/i18n/fr.ts", () => {
	it("chaque section de premier niveau a ses lignes de début et de fin", () => {
		const ranges = frSectionRanges(git("show", "HEAD:src/i18n/fr.ts"));
		expect(Object.keys(ranges)).toEqual(expect.arrayContaining(["site", "home", "calculator", "footer"]));
		for (const [name, [start, end]] of Object.entries(ranges)) expect(end, name).toBeGreaterThan(start);
	});
});

describe("lastmodOf", () => {
	it("chaque page du sitemap a une date de commit, au format ISO 8601 avec heure et fuseau", async () => {
		const commitDates = new Set(git("log", "--format=%cI").split("\n"));
		const routes = (await pageRoutes()).filter((route) => includeInSitemap(`https://calculateurs.ch${route}`));
		expect(routes.length).toBeGreaterThan(5);
		for (const route of routes) {
			const lastmod = lastmodOf(route);
			expect(isW3cDatetime(lastmod), route).toBe(true);
			expect(commitDates.has(lastmod), `${route} : ${lastmod} n'est la date d'aucun commit`).toBe(true);
		}
	});

	it("vaut au moins la date du dernier commit de la page elle-même", () => {
		const page = git("log", "-1", "--format=%cI", "--", "src/pages/prevoyance/rachat-lpp.astro");
		expect(new Date(lastmodOf("/prevoyance/rachat-lpp/")).getTime()).toBeGreaterThanOrEqual(new Date(page).getTime());
	});
});
