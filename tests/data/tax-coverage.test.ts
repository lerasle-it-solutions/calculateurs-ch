import { describe, expect, it } from "vitest";

import { cantonFiles } from "../../src/data";
import { cantonDataSchema } from "../../src/data/schema";
import { getTaxScales } from "../../src/data/tax-scales";
import { taxEngineCoverage } from "../../src/calculators/tax-coverage";
import { computeIncomeAndWealthTax, PartialCoverageError } from "../../src/lib/calculations/tax";

/**
 * Couverture partielle déclarée dans la couche de données : le périmètre des
 * calculateurs l'annonce et le moteur refuse le calcul du canton.
 */
const partial = cantonFiles()
	.map((file) => ({ code: file.code, coverage: cantonDataSchema.parse(file.data).coverage }))
	.filter((entry) => entry.coverage !== undefined);

describe("couverture partielle d'un canton", () => {
	it("chaque couverture partielle porte une note et renvoie au calculateur officiel, ou à un TODO explicite", () => {
		for (const { code, coverage } of partial) {
			expect(coverage?.note.length, `${code} : note vide`).toBeGreaterThan(0);
			const official = coverage?.officialCalculator;
			expect(official && ("url" in official || "todo" in official), `${code} : calculateur officiel absent`).toBe(true);
		}
	});

	it("un canton en couverture partielle sort de cantonsCovered et entre dans notCovered", () => {
		const { cantonsCovered, notCovered } = taxEngineCoverage();
		for (const { code } of partial) {
			expect(cantonsCovered).not.toContain(code);
		}
		expect(notCovered).toHaveLength(partial.length);
		expect(cantonsCovered.length + notCovered.length).toBe(6);
	});

	it("le moteur refuse le calcul du Valais, déclaré en couverture partielle", () => {
		expect(partial.map((entry) => entry.code)).toContain("VS");
		const scales = getTaxScales({ taxYear: 2026, canton: "VS", municipalityOfsId: 6266 });
		expect(() =>
			computeIncomeAndWealthTax(
				{
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
				},
				scales,
			),
		).toThrow(PartialCoverageError);
	});
});
