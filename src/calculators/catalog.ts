/**
 * Catalogue des calculateurs : toutes les définitions déclarées dans
 * src/calculators/, et celles qui sont publiées, c'est-à-dire dont la page
 * existe dans src/pages/ à l'URL de leur `slug`.
 */
import { pageExists } from "./page-exists";
import type { CalculatorDefinition } from "./types";

const definitionModules = import.meta.glob<Record<string, unknown>>("./*/*.ts", { eager: true });

const isCalculatorDefinition = (candidate: unknown): candidate is CalculatorDefinition =>
	typeof candidate === "object" &&
	candidate !== null &&
	"id" in candidate &&
	"family" in candidate &&
	"slug" in candidate &&
	"scope" in candidate;

export const allCalculators: CalculatorDefinition[] = Object.values(definitionModules)
	.flatMap((module) => Object.values(module))
	.filter(isCalculatorDefinition);

/** Vrai si la page du calculateur existe : « /prevoyance/x/ » ↔ src/pages/prevoyance/x.astro. */
export const isPublished = (definition: CalculatorDefinition): boolean => pageExists(definition.slug);

export const publishedCalculators = (family: CalculatorDefinition["family"]): CalculatorDefinition[] =>
	allCalculators.filter((definition) => definition.family === family && isPublished(definition));
