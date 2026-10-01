import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";

import type { CalculatorDefinition } from "../../src/calculators/types";

/**
 * Garde-fou de docs/plan/pages.md : toute famille ayant au moins un calculateur
 * publié possède sa section rédigée dans /methodologie/, vérifiée par la
 * présence de son ancre ; la mise en relation de même dès qu'un calculateur la
 * propose.
 */
const calculatorModules = import.meta.glob<Record<string, unknown>>("../../src/calculators/**/*.ts", { eager: true });
const pageModules = import.meta.glob("../../src/pages/**/*.astro");

const isCalculatorDefinition = (candidate: unknown): candidate is CalculatorDefinition =>
	typeof candidate === "object" &&
	candidate !== null &&
	"id" in candidate &&
	"family" in candidate &&
	"slug" in candidate &&
	"scope" in candidate;

/** Ancres listées par docs/plan/pages.md, par famille. */
const FAMILY_ANCHORS: Partial<Record<CalculatorDefinition["family"], string>> = {
	pension: "prevoyance",
	property: "logement",
	energy: "energie",
};

/** Un calculateur est publié si sa page existe dans src/pages/. */
const isPublished = (definition: CalculatorDefinition): boolean =>
	`../../src/pages${definition.slug.replace(/\/$/, "")}.astro` in pageModules;

const published = Object.values(calculatorModules)
	.flatMap((module) => Object.values(module))
	.filter(isCalculatorDefinition)
	.filter(isPublished);

describe("sections rédigées de /methodologie/", () => {
	it("chaque famille ayant un calculateur publié a son ancre, et la mise en relation dès qu'un calculateur la propose", async () => {
		expect(published.length).toBeGreaterThan(0);
		const { default: Methodology } = await import("../../src/pages/methodologie.astro");
		const container = await AstroContainer.create({ astroConfig: { site: "https://calculateurs.ch" } });
		const html = await container.renderToString(Methodology, {
			request: new Request("https://calculateurs.ch/methodologie/"),
		});
		for (const definition of published) {
			const anchor = FAMILY_ANCHORS[definition.family];
			if (anchor !== undefined) expect(html, `${definition.id} : ancre #${anchor} absente`).toContain(`id="${anchor}"`);
			if (definition.monetization?.type === "lead") {
				expect(html, `${definition.id} : ancre #mise-en-relation absente`).toContain('id="mise-en-relation"');
			}
		}
	});
});
