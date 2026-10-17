import { describe, expect, it } from "vitest";

import { exampleOutcome } from "../../src/calculators/example-outcomes";
import { exampleProblems } from "../../src/calculators/field-values";
import { PILLAR_3A_BUYBACK_ID, pillar3aBuybackYear } from "../../src/calculators/pension/pillar-3a-buyback";
import { numbers as guide } from "../../src/lib/articles/rachat-3a-retroactif";
import { formatChfAmount } from "../../src/lib/display/amounts";
import { pillar3aTaxSaving, pillar3aTaxSavingYear } from "../../src/calculators/pension/pillar-3a-tax-saving";
import type { CalculatorDefinition } from "../../src/calculators/types";
import { getFederalData } from "../../src/data";

/**
 * Cas exemple (docs/design-system.md § 4.2, décision n° 18) : chaque
 * calculateur s'ouvre pré-rempli, et le montant de la carte est calculé à la
 * construction en exécutant le moteur sur l'exemple, jamais tapé.
 */
const calculatorModules = import.meta.glob<Record<string, unknown>>("../../src/calculators/**/*.ts", { eager: true });

const definitions = Object.values(calculatorModules)
	.flatMap((module) => Object.values(module))
	.filter(
		(candidate): candidate is CalculatorDefinition =>
			typeof candidate === "object" && candidate !== null && "id" in candidate && "scope" in candidate && "fields" in candidate,
	);

describe("cas exemple des calculateurs", () => {
	it("chaque définition déclare une promesse, une ligne de périmètre et un exemple, chacun en une phrase", () => {
		expect(definitions.length).toBeGreaterThan(0);
		for (const definition of definitions) {
			expect(definition.promise, definition.id).toMatch(/^[^.]+\.$/);
			expect(definition.scopeLine, definition.id).toMatch(/^[^.]+\.$/);
			expect(definition.example.label, definition.id).not.toBe("");
			expect(Object.keys(definition.example.values).length, definition.id).toBeGreaterThan(0);
		}
	});

	it("les valeurs de chaque exemple passent la validation de ses champs", () => {
		for (const definition of definitions) {
			expect(exampleProblems(definition), definition.id).toEqual([]);
		}
	});

	it("le moteur exécuté sur chaque exemple rend un montant, pas un statut d'exclusion", () => {
		for (const definition of definitions) {
			const outcome = exampleOutcome(definition.id);
			expect(outcome.status, `${definition.id} : ${outcome.status?.text}`).toBeNull();
			expect(outcome.value, definition.id).toMatch(/^\d[\d’]*\u00a0CHF$/);
			// Un exemple qui n'économise rien ne montre rien : le formulaire le lit avec les valeurs par défaut de ses champs
			expect(outcome.value, definition.id).not.toBe("0\u00a0CHF");
			expect(outcome.breakdown.length, definition.id).toBeGreaterThan(0);
		}
	});

	it("A1 : l'exemple est celui du guide, et rend son économie tant que l'année de calcul est celle du guide", () => {
		if (pillar3aBuybackYear !== guide.firstGapYear + 1) return;
		expect(exampleOutcome(PILLAR_3A_BUYBACK_ID).value).toBe(formatChfAmount(guide.example.totalSaving));
	});

	it("A2 : le versement de l'exemple est le plafond de l'année, lu dans les données", () => {
		const cap = getFederalData(pillar3aTaxSavingYear).pillar3a.smallContributionCap.value;
		expect(pillar3aTaxSaving.example.values.contribution).toBe(String(cap));
	});
});

describe("validation des saisies d'un exemple", () => {
	const definition = definitions.find((entry) => entry.id === "pension.lpp-buyback")!;
	const withValues = (values: Record<string, string>): CalculatorDefinition => ({
		...definition,
		example: { ...definition.example, values: { ...definition.example.values, ...values } },
	});

	it("signale un champ inconnu, un montant hors bornes, un choix absent de la liste", () => {
		expect(exampleProblems(withValues({ unknownField: "1" }))).toEqual(["unknownField : champ inconnu"]);
		expect(exampleProblems(withValues({ buybackAmount: "-5" }))).toEqual(["buybackAmount : min"]);
		expect(exampleProblems(withValues({ buybackAmount: "abc" }))).toEqual(["buybackAmount : invalid"]);
		expect(exampleProblems(withValues({ unrepaidHomeOwnershipWithdrawal: "maybe" }))).toEqual([
			"unrepaidHomeOwnershipWithdrawal : choix absent de la liste",
		]);
		expect(exampleProblems(withValues({ municipality: "Atlantis (VD)" }))).toEqual(["municipality : commune absente de la liste"]);
	});

	it("signale un champ obligatoire sans valeur ni valeur par défaut", () => {
		const { buybackPotential: _, ...values } = definition.example.values;
		expect(exampleProblems({ ...definition, example: { ...definition.example, values } })).toEqual(["buybackPotential : obligatoire"]);
	});
});
