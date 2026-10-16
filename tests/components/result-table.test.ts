import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";

import ResultTable from "../../src/components/ui/ResultTable.astro";
import { allCalculators, isPublished } from "../../src/calculators/catalog";
import { renderAllPages } from "../seo/site-pages";

/**
 * Un tableau ne s'affiche jamais vide (docs/design-system.md § 4.4) : sans
 * ligne, aucun `<table>` n'est rendu, seul un gabarit `<template>` attend le
 * script de la page. Origine : sur /prevoyance/rachat-lpp/, « Rachat en une
 * fois ou échelonné » et « Délai de blocage » s'affichaient avec leurs seuls
 * en-têtes (revue UX du 16.10.2026).
 */
const withoutTemplates = (html: string): string => html.replace(/<template\b[\s\S]*?<\/template>/g, "");

/** Tableaux rendus (hors gabarits) dont le corps n'a aucune ligne. */
const emptyTables = (html: string): string[] =>
	[...withoutTemplates(html).matchAll(/<table\b[\s\S]*?<\/table>/g)]
		.map((match) => match[0])
		.filter((table) => !/<tbody\b[^>]*>[\s\S]*?<tr\b/.test(table))
		.map((table) => table.match(/<caption\b[^>]*>([\s\S]*?)<\/caption>/)?.[1]?.trim() ?? table.slice(0, 80));

const columns = [{ label: "Année" }, { label: "Montant", align: "right" as const }];

const render = async (props: Record<string, unknown>): Promise<string> => {
	const container = await AstroContainer.create();
	return container.renderToString(ResultTable, { props: { id: "t", heading: "Titre", caption: "Légende", columns, ...props } });
};

describe("ResultTable", () => {
	it("sans ligne : aucun tableau rendu, bloc masqué, gabarit pour le script", async () => {
		const html = await render({});
		expect(withoutTemplates(html)).not.toContain("<table");
		expect(html).toMatch(/<section\b[^>]*\shidden/);
		expect(html).toMatch(/<template\b[^>]*data-result-table-template[\s\S]*<thead/);
	});

	it("avec au moins une ligne : tableau rendu et visible", async () => {
		const html = await render({ rows: [["2026", "1’000"]] });
		expect(withoutTemplates(html)).toMatch(/<table\b[\s\S]*<tbody\b[^>]*>[\s\S]*<tr\b[\s\S]*1’000/);
		expect(html).not.toMatch(/<section\b[^>]*\shidden/);
	});

	it("le contrôle repère un tableau sans ligne", () => {
		expect(emptyTables("<table><caption>Vide</caption><thead><tr><th>a</th></tr></thead><tbody></tbody></table>")).toEqual(["Vide"]);
		expect(emptyTables("<template><table><tbody></tbody></table></template>")).toEqual([]);
	});
});

describe("pages des calculateurs publiés", () => {
	it("aucune ne rend un tableau sans ligne", async () => {
		const slugs = new Set(allCalculators.filter(isPublished).map((calculator) => calculator.slug));
		const pages = (await renderAllPages()).filter((page) => slugs.has(page.route));
		expect(pages.length).toBe(slugs.size);
		const offenders = pages.flatMap(({ route, html }) => emptyTables(html).map((caption) => `${route} : ${caption}`));
		expect(offenders).toEqual([]);
	});
});
