import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";

import CalculatorShell from "../../src/components/calculator/CalculatorShell.astro";
import DataFreshness from "../../src/components/ui/DataFreshness.astro";
import type { CalculatorDefinition } from "../../src/calculators/types";
import { sourceRegistry } from "../../src/data";
import { ESTV_BASE_DATA_ATTRIBUTION } from "../../src/data/sources";

/**
 * Attribution de l'AFC (CLAUDE.md § Conditions d'usage) : toute page de
 * calculateur qui s'appuie sur une source marquée `requiresAttribution` affiche
 * son texte, sous le résultat, par DataFreshness. Le texte vient du registre,
 * jamais d'une copie.
 */
const visibleText = (html: string): string =>
	html
		.replace(/<[^>]*>/g, "")
		.replace(/&#39;/g, "'")
		.replace(/&quot;/g, '"')
		.replace(/\s+/g, " ")
		.trim();

const calculatorModules = import.meta.glob<Record<string, unknown>>("../../src/calculators/**/*.ts", { eager: true });

const isCalculatorDefinition = (candidate: unknown): candidate is CalculatorDefinition =>
	typeof candidate === "object" &&
	candidate !== null &&
	"id" in candidate &&
	"family" in candidate &&
	"scope" in candidate &&
	"sourceIds" in candidate &&
	Array.isArray((candidate as { sourceIds: unknown }).sourceIds);

const definitions = Object.values(calculatorModules)
	.flatMap((module) => Object.values(module))
	.filter(isCalculatorDefinition);

const requiresAttribution = (definition: CalculatorDefinition): boolean =>
	definition.sourceIds.some((id) => sourceRegistry().get(id)?.requiresAttribution === true);

const renderShell = async (definition: CalculatorDefinition): Promise<string> => {
	const container = await AstroContainer.create();
	return container.renderToString(CalculatorShell, {
		props: { definition, intro: "", resultLabel: "", verifiedOn: "2026-01-01", catalog: definitions },
	});
};

/** Définition fictive, pour vérifier le mécanisme indépendamment des calculateurs réels. */
const fictive = (sourceIds: string[]): CalculatorDefinition => ({
	id: "pension.fictive-attribution",
	family: "pension",
	slug: "/fictif/",
	title: "Calculateur fictif",
	metaDescription: "Calculateur fictif pour le test d'attribution.",
	scope: {
		forWhom: ["Test"],
		notCovered: [{ case: "Test" }],
		assumptions: [],
		cantonsCovered: ["VD"],
		referenceYear: 2026,
	},
	fields: [],
	engine: "tax",
	sourceIds,
	variants: [],
	faq: [],
});

describe("attribution des sources qui l'exigent", () => {
	it("DataFreshness affiche le texte d'attribution du registre, une seule fois, pour les sources qui l'exigent", async () => {
		const container = await AstroContainer.create();
		const withAttribution = visibleText(
			await container.renderToString(DataFreshness, {
				props: { referenceYear: 2026, verifiedOn: "2026-01-08", sourceIds: ["estv-base-data-module", "vd-municipal-multipliers"] },
			}),
		);
		expect(withAttribution).toContain(ESTV_BASE_DATA_ATTRIBUTION);
		expect(withAttribution.split(ESTV_BASE_DATA_ATTRIBUTION)).toHaveLength(2);

		const withoutAttribution = visibleText(
			await container.renderToString(DataFreshness, { props: { referenceYear: 2026, verifiedOn: "2026-01-08", sourceIds: ["vd-li"] } }),
		);
		expect(withoutAttribution).not.toContain(ESTV_BASE_DATA_ATTRIBUTION);
	});

	it("le Shell d'un calculateur affiche l'attribution si l'une de ses sources l'exige, et seulement alors", async () => {
		expect(visibleText(await renderShell(fictive(["estv-base-data-module"])))).toContain(ESTV_BASE_DATA_ATTRIBUTION);
		expect(visibleText(await renderShell(fictive(["vd-li"])))).not.toContain(ESTV_BASE_DATA_ATTRIBUTION);
	});

	it("toute page de calculateur qui s'appuie sur une source marquée requiresAttribution affiche son texte", async () => {
		for (const definition of definitions.filter(requiresAttribution)) {
			const text = visibleText(await renderShell(definition));
			expect(text.includes(ESTV_BASE_DATA_ATTRIBUTION), `${definition.id} : texte d'attribution de l'AFC absent de la page`).toBe(true);
		}
	});
});

describe("attribution sur /methodologie/", () => {
	it("la page de méthodologie affiche le texte d'attribution de l'AFC", async () => {
		const { default: Methodology } = await import("../../src/pages/methodologie.astro");
		// La mise en page construit l'URL canonique à partir de `site`
		const container = await AstroContainer.create({ astroConfig: { site: "https://calculateurs.ch" } });
		const html = await container.renderToString(Methodology, {
			request: new Request("https://calculateurs.ch/methodologie/"),
		});
		expect(visibleText(html)).toContain(ESTV_BASE_DATA_ATTRIBUTION);
	});
});
