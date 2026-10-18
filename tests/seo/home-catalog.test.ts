import { beforeAll, describe, expect, it } from "vitest";

import { allCalculators, isPublished } from "../../src/calculators/catalog";
import { FAMILY_ORDER } from "../../src/calculators/families";
import { fr } from "../../src/i18n/fr";
import { decodeEntities, pageRoutes, renderAllPages } from "./site-pages";

/**
 * L'accueil est généré depuis le catalogue : chaque intitulé de calculateur
 * est un lien vers une page existante, ou sa famille figure dans la seule ligne
 * « Prochainement ». Aucun intitulé en impasse, aucune date promise.
 * Origine : revue UX du 16.10.2026 (« en préparation » sans lien, « Retrait en
 * capital » annoncé sans exister, « en ligne dès octobre 2026 » périmé).
 */
let home: string;
let routes: Set<string>;
beforeAll(async () => {
	const pages = await renderAllPages();
	home = pages.find((page) => page.route === "/")!.html;
	routes = new Set(await pageRoutes());
});

const text = (html: string): string => decodeEntities(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

/** Bloc du catalogue de l'accueil, section `#calculateurs`. */
const catalogBlock = (): string => home.match(/<section\b[^>]*\sid="calculateurs"[\s\S]*?<\/section>/)?.[0] ?? "";

/** Éléments de liste les plus internes : un intitulé chacun. */
const leafItems = (html: string): string[] => [...html.matchAll(/<li\b[^>]*>((?:(?!<li\b)[\s\S])*?)<\/li>/g)].map((match) => match[1]!);

const familiesWithout = FAMILY_ORDER.filter((family) => !allCalculators.some((c) => c.family === family && isPublished(c)));

describe("accueil généré depuis le catalogue", () => {
	it("le bloc du catalogue existe", () => {
		expect(catalogBlock()).not.toBe("");
	});

	it("chaque intitulé de calculateur est un lien vers une page existante", () => {
		const items = leafItems(catalogBlock());
		expect(items.length).toBeGreaterThan(0);
		const deadEnds = items.flatMap((item) => {
			const href = item.match(/<a\b[^>]*\shref="([^"]+)"/)?.[1];
			return href !== undefined && routes.has(href) ? [] : [text(item)];
		});
		expect(deadEnds).toEqual([]);
	});

	it("chaque calculateur publié est lié depuis l'accueil, et lui seul", () => {
		const hrefs = leafItems(catalogBlock()).map((item) => item.match(/\shref="([^"]+)"/)?.[1]);
		const published = allCalculators.filter(isPublished).map((c) => c.slug);
		expect([...hrefs].sort()).toEqual([...published].sort());
	});

	it("les familles sans calculateur publié tiennent en une seule ligne « Prochainement »", () => {
		const lines = [...home.matchAll(/<p\b[^>]*data-home-coming-soon[^>]*>([\s\S]*?)<\/p>/g)].map((match) => text(match[1]!));
		if (familiesWithout.length === 0) {
			expect(lines).toEqual([]);
			return;
		}
		// `text` ramène tout blanc à une espace, espace fine comprise : même normalisation pour l'attendu (18.10.2026)
		expect(lines).toEqual([fr.home.comingSoon(familiesWithout.map((family) => fr.family[family])).replace(/\s+/g, " ")]);
	});

	it("aucune mention « en préparation » ni date promise", () => {
		const visible = text(home.replace(/<script\b[\s\S]*?<\/script>/g, " "));
		expect(visible).not.toContain(fr.common.comingSoon);
		expect(visible).not.toMatch(/\bdès (?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre) \d{4}/i);
	});
});
