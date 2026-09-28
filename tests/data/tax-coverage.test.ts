import { describe, expect, it } from "vitest";

import { cantonFiles } from "../../src/data";
import { cantonDataSchema } from "../../src/data/schema";
import { getTaxScales } from "../../src/data/tax-scales";
import { taxEngineCoverage } from "../../src/calculators/tax-coverage";
import { computeIncomeAndWealthTax, PartialCoverageError, type TaxInput } from "../../src/lib/calculations/tax";

/**
 * Couverture partielle déclarée dans la couche de données : le périmètre des
 * calculateurs l'annonce et le moteur refuse le calcul des contribuables non
 * couverts, pour le canton entier ou pour certains ménages.
 */
const partial = cantonFiles()
	.map((file) => ({ code: file.code, coverage: cantonDataSchema.parse(file.data).coverage }))
	.filter((entry) => entry.coverage !== undefined);

const sion = (overrides: Partial<TaxInput>): TaxInput => ({
	taxYear: 2026,
	canton: "VS",
	municipalityOfsId: 6266,
	maritalStatus: "single",
	children: 0,
	childrenAges: [],
	denomination: "none",
	federalTaxableIncome: 50_000,
	cantonalTaxableIncome: 50_000,
	taxableWealth: 0,
	...overrides,
});

describe("couverture partielle d'un canton", () => {
	it("chaque couverture partielle porte une note et renvoie au calculateur officiel, ou à un TODO explicite", () => {
		for (const { code, coverage } of partial) {
			expect(coverage?.note.length, `${code} : note vide`).toBeGreaterThan(0);
			const official = coverage?.officialCalculator;
			expect(official && ("url" in official || "todo" in official), `${code} : calculateur officiel absent`).toBe(true);
		}
	});

	it("un canton entièrement non couvert sort de cantonsCovered ; un canton non couvert pour certains ménages y reste ; chacun entre dans notCovered", () => {
		const { cantonsCovered, notCovered } = taxEngineCoverage();
		for (const { code, coverage } of partial) {
			if (coverage?.notCoveredHouseholds === undefined) expect(cantonsCovered).not.toContain(code);
			else expect(cantonsCovered).toContain(code);
		}
		expect(notCovered).toHaveLength(partial.length);
		const whollyExcluded = partial.filter(({ coverage }) => coverage?.notCoveredHouseholds === undefined).length;
		expect(cantonsCovered.length + whollyExcluded).toBe(6);
	});

	it("Valais : le moteur calcule pour une personne seule et refuse les ménages ayant droit à l'abattement", () => {
		const vs = partial.find((entry) => entry.code === "VS");
		expect(vs?.coverage?.notCoveredHouseholds).toEqual(["married", "singleWithChildren"]);
		const scales = getTaxScales({ taxYear: 2026, canton: "VS", municipalityOfsId: 6266 });
		expect(() => computeIncomeAndWealthTax(sion({}), scales)).not.toThrow();
		expect(() => computeIncomeAndWealthTax(sion({ maritalStatus: "married" }), scales)).toThrow(PartialCoverageError);
		expect(() => computeIncomeAndWealthTax(sion({ children: 1 }), scales)).toThrow(PartialCoverageError);
	});
});
