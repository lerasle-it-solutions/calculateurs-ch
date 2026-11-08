import { describe, expect, it } from "vitest";

import { cantonFiles } from "../../src/data";
import { cantonDataSchema } from "../../src/data/schema";
import { getTaxScales } from "../../src/data/tax-scales";
import { taxEngineCoverage } from "../../src/calculators/tax-coverage";
import { computeIncomeAndWealthTax, PartialCoverageError, type TaxInput } from "../../src/lib/calculations/tax";
import { UNINDEXED, withUnindexedMunicipality } from "../fixtures/unindexed-municipality";

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

describe("Valais : commune sans indexation communale relevée", () => {
	// Fixture partagée (tests/fixtures/unindexed-municipality.ts, décision du mainteneur du 7.11.2026) :
	// depuis le relevé du 7.11.2026, aucune commune valaisanne réelle n'est sans indexation.
	it("une commune valaisanne autre que Sion, sans indexation relevée, est hors périmètre pour tout ménage, par les deux chemins de barèmes", async () => {
		const { direct, viaBundle, sionViaBundle } = await withUnindexedMunicipality(async () => {
			const { getTaxScales, getTaxScalesBundle } = await import("../../src/data/tax-scales");
			const { taxScalesFromBundle } = await import("../../src/lib/calculations/tax-scales-bundle");
			const bundle = getTaxScalesBundle(2026, ["VS"]);
			return {
				direct: getTaxScales({ taxYear: 2026, canton: "VS", municipalityOfsId: UNINDEXED.ofsId }),
				viaBundle: taxScalesFromBundle(bundle, UNINDEXED.ofsId),
				sionViaBundle: taxScalesFromBundle(bundle, 6266),
			};
		});
		expect(UNINDEXED.ofsId).not.toBe(6266);
		const input = sion({ municipalityOfsId: UNINDEXED.ofsId });
		for (const scales of [direct, viaBundle]) {
			let error: unknown;
			try {
				computeIncomeAndWealthTax(input, scales);
			} catch (thrown) {
				error = thrown;
			}
			expect(error).toBeInstanceOf(PartialCoverageError);
			expect((error as PartialCoverageError).municipality).toBe(UNINDEXED.municipality);
			expect((error as Error).message).toMatch(new RegExp(`Commune ${UNINDEXED.municipality}`));
		}
		// Sion reste couverte pour une personne seule
		expect(() => computeIncomeAndWealthTax(sion({}), sionViaBundle)).not.toThrow();
	});
});
