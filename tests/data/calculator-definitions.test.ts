import { describe, expect, it } from "vitest";

import type { CalculatorDefinition } from "../../src/calculators/types";
import { pillar3aBuyback } from "../../src/calculators/pension/pillar-3a-buyback";

/**
 * Définitions déclaratives des calculateurs (CLAUDE.md § 2) : aucun
 * utilisateur hors périmètre ne reste dans une impasse.
 */
const calculatorModules = import.meta.glob<Record<string, unknown>>("../../src/calculators/**/*.ts", { eager: true });

const isCalculatorDefinition = (candidate: unknown): candidate is CalculatorDefinition =>
	typeof candidate === "object" &&
	candidate !== null &&
	"id" in candidate &&
	"family" in candidate &&
	"scope" in candidate &&
	"sourceIds" in candidate;

const definitions = Object.values(calculatorModules)
	.flatMap((module) => Object.values(module))
	.filter(isCalculatorDefinition);

describe("définitions des calculateurs", () => {
	it("chaque entrée notCovered de chaque calculateur possède une alternative", () => {
		expect(definitions.length).toBeGreaterThan(0);
		for (const definition of definitions) {
			for (const entry of definition.scope.notCovered) {
				expect(entry.alternative, `${definition.id} : « ${entry.case} » n'a pas d'alternative`).toBeDefined();
			}
		}
	});

	it("A1 reprend les comptes de la fiche validée le 01.10.2026 : 6 entrées notCovered, 7 hypothèses, 9 questions", () => {
		expect(pillar3aBuyback.scope.notCovered).toHaveLength(6);
		expect(pillar3aBuyback.scope.assumptions).toHaveLength(7);
		expect(pillar3aBuyback.faq).toHaveLength(9);
		expect(pillar3aBuyback.slug).toBe("/prevoyance/rachat-3a-retroactif/");
		expect(pillar3aBuyback.sourceIds).not.toContain("estv-tax-calculator");
		for (const id of ["fedlex-lifd", "fedlex-ifd-cold-progression", "estv-base-data-module", "opp3-art-7a", "ofas-pillar-3a-caps"]) {
			expect(pillar3aBuyback.sourceIds).toContain(id);
		}
	});
});
