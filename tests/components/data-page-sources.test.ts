import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";

import { allCalculators, isPublished } from "../../src/calculators/catalog";
import { sourceRegistry } from "../../src/data";

/**
 * /donnees/ montre chaque source déclarée par un calculateur publié : celles
 * qui alimentent une valeur (tableau), les outils de collecte, et les sources
 * des règles, qui fondent un calcul sans fournir de valeur (circulaire AFC
 * n° 18a). Jamais une source `reference-tool`.
 */
const render = async (path: string, page: string): Promise<string> => {
	const { default: Page } = await import(`../../src/pages/${page}.astro`);
	const container = await AstroContainer.create({ astroConfig: { site: "https://calculateurs.ch" } });
	const html = await container.renderToString(Page, { request: new Request(`https://calculateurs.ch${path}`) });
	return html
		.replace(/<script\b[\s\S]*?<\/script>/g, " ")
		.replace(/<[^>]+>/g, " ")
		.replace(/&#39;/g, "'")
		.replace(/&amp;/g, "&")
		.replace(/&quot;/g, '"')
		.replace(/\s+/g, " ");
};

describe("/donnees/, sources des calculateurs", () => {
	it("chaque source déclarée par un calculateur publié apparaît sur /donnees/", async () => {
		const text = await render("/donnees/", "donnees");
		const registry = sourceRegistry();
		const published = allCalculators.filter(isPublished);
		expect(published.length).toBeGreaterThan(0);
		const missing = published.flatMap((calculator) =>
			calculator.sourceIds
				.map((id) => registry.get(id))
				.filter((source) => source !== undefined && source.nature !== "reference-tool")
				.filter((source) => !text.includes(source!.name.replace(/\s+/g, " ")))
				.map((source) => `${calculator.id} : ${source!.id}`),
		);
		expect(missing).toEqual([]);
	});

	it("la circulaire AFC n° 18a figure parmi les sources des règles, avec sa référence légale", async () => {
		const text = await render("/donnees/", "donnees");
		const circular = sourceRegistry().get("afc-circular-18a")!;
		const section = text.slice(text.indexOf("Sources des règles"));
		expect(section).toContain(circular.name);
		expect(section).toContain(circular.legalReference!);
	});

	it("la méthodologie liste aussi les sources des règles de prévoyance", async () => {
		const text = await render("/methodologie/", "methodologie");
		const circular = sourceRegistry().get("afc-circular-18a")!;
		const section = text.slice(text.indexOf("Sources des règles :"));
		expect(section).toContain(`${circular.name}, ${circular.legalReference}`);
	});
});
