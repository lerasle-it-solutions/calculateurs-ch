import { beforeAll, describe, expect, it } from "vitest";

import { formatVerificationDate, siteVerifiedOn } from "../../src/calculators/site-verification";
import { fr } from "../../src/i18n/fr";
import { decodeEntities, renderAllPages, type RenderedPage } from "./site-pages";

/**
 * En-tête et pied de page (docs/design-system.md § 2.4) : trois entrées,
 * pastille « Sources vérifiées le » liée à /donnees/, sans bouton Menu sous
 * cinq entrées ; adresse en clair, dépôt GitHub, date de vérification du site,
 * « Signaler une erreur » prérempli avec l'URL de la page, jamais une saisie.
 */
let pages: RenderedPage[];
beforeAll(async () => {
	pages = await renderAllPages();
});
const part = (html: string, tag: "header" | "footer") => html.match(new RegExp(`<${tag}[\\s>][\\s\\S]*?</${tag}>`))![0];
const text = (html: string) => decodeEntities(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const date = () => formatVerificationDate(siteVerifiedOn());

describe("en-tête", () => {
	it("trois entrées, liées à des pages existantes, dans chacune des deux navigations", () => {
		const header = part(pages.find((page) => page.route === "/")!.html, "header");
		const navs = header.match(/<nav\b[\s\S]*?<\/nav>/g) ?? [];
		// Dès md, la navigation visible ; sous md, celle du menu replié
		expect(navs).toHaveLength(2);
		const routes = new Set(pages.map((page) => page.route));
		for (const nav of navs) {
			const links = [...nav.matchAll(/<a\b[^>]*\shref="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].map(([, href, label]) => [href, text(label!)]);
			expect(links.map(([, label]) => label)).toEqual([fr.header.calculators, fr.header.guides, fr.header.methodology]);
			for (const [href] of links) expect(routes.has(href!.replace(/#.*$/, "")), href).toBe(true);
		}
	});

	it("pastille « Sources vérifiées le » datée, liée à /donnees/, sans formule de garantie", () => {
		const header = part(pages[0]!.html, "header");
		const pills = header.match(/<a\b[^>]*\shref="\/donnees\/"[^>]*>[\s\S]*?<\/a>/g) ?? [];
		expect(pills).toHaveLength(2);
		for (const pill of pills) {
			expect(text(pill)).toBe(`${fr.header.verified} ${date()}`);
			expect(pill).toContain(`<time datetime="${siteVerifiedOn()}"`);
		}
		expect(text(header)).not.toMatch(/à jour|garanti/i);
	});

	it("sous md, un bouton « Menu » natif qui contient les trois entrées et la pastille ; dès md, pas de Menu", () => {
		const header = part(pages[0]!.html, "header");
		const menu = header.match(/<details\b[^>]*>[\s\S]*?<\/details>/)?.[0];
		expect(menu).toMatch(/^<details\b[^>]*class="[^"]*\bmd:hidden\b/);
		expect(text(menu!.match(/<summary\b[\s\S]*?<\/summary>/)![0])).toBe(fr.header.menu);
		expect(menu).toContain("<nav");
		expect(menu).toContain('href="/donnees/"');
		expect(header).not.toContain("<script");
	});

	it("page courante : Guides sur un guide, Calculateurs sur un calculateur", () => {
		const current = (route: string) => text(part(pages.find((page) => page.route === route)!.html, "header").match(/<a\b[^>]*aria-current="page"[^>]*>[\s\S]*?<\/a>/)?.[0] ?? "");
		expect(current("/prevoyance/guides/rachat-3a-retroactif/")).toBe(fr.header.guides);
		expect(current("/prevoyance/rachat-lpp/")).toBe(fr.header.calculators);
		expect(current("/methodologie/")).toBe(fr.header.methodology);
	});
});

describe("pied de page", () => {
	it("adresse en clair, dépôt GitHub, date de vérification du site", () => {
		const footer = part(pages[0]!.html, "footer");
		expect(footer).toMatch(new RegExp(`<a href="mailto:${fr.site.contactEmail}"[^>]*>${fr.site.contactEmail}</a>`));
		expect(footer).toContain(`href="${fr.site.repositoryUrl}"`);
		expect(text(footer)).toContain(date());
	});

	it("« Signaler une erreur » : courriel prérempli avec l'URL de la page, sans saisie du calculateur", () => {
		for (const route of ["/", "/prevoyance/economie-impot-3a/"]) {
			const footer = part(pages.find((page) => page.route === route)!.html, "footer");
			const href = decodeEntities(footer.match(/<a\b[^>]*\sdata-report-error[^>]*\shref="([^"]+)"|<a\b[^>]*\shref="([^"]+)"[^>]*\sdata-report-error/)!.slice(1).find(Boolean)!);
			expect(href.startsWith(`mailto:${fr.site.contactEmail}?`)).toBe(true);
			const body = decodeURIComponent(href);
			expect(body).toContain(`https://calculateurs.ch${route}`);
			expect(body).not.toContain("#v1");
		}
	});
});
