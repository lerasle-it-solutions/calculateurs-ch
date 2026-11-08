import { describe, expect, it } from "vitest";

import { getMunicipalMultipliers } from "../../src/data";
import { getTaxScales } from "../../src/data/tax-scales";
import { computeIncomeAndWealthTax, PartialCoverageError, type TaxInput } from "../../src/lib/calculations/tax";
import { UNINDEXED, unindexedScales, withoutIndexation, withUnindexedMunicipality } from "./unindexed-municipality";

/**
 * La fixture partagée est bien hors périmètre : sans quoi les tests qui
 * l'emploient passeraient à vide (décision du mainteneur du 7.11.2026).
 */
const single: TaxInput = {
	taxYear: 2026,
	canton: UNINDEXED.canton,
	municipalityOfsId: UNINDEXED.ofsId,
	maritalStatus: "single",
	children: 0,
	childrenAges: [],
	denomination: "none",
	federalTaxableIncome: 50_000,
	cantonalTaxableIncome: 50_000,
	taxableWealth: 0,
};
const query = { taxYear: single.taxYear, canton: single.canton, municipalityOfsId: single.municipalityOfsId };

const fixture = await withUnindexedMunicipality(async () => {
	const [{ taxEngineCoverage }, { getTaxScales: fixtureScales, getTaxScalesBundle }, { taxScalesFromBundle }, data] = await Promise.all([
		import("../../src/calculators/tax-coverage"),
		import("../../src/data/tax-scales"),
		import("../../src/lib/calculations/tax-scales-bundle"),
		import("../../src/data"),
	]);
	return {
		coverage: taxEngineCoverage(),
		scales: fixtureScales(query),
		viaBundle: taxScalesFromBundle(getTaxScalesBundle(single.taxYear, [UNINDEXED.canton]), UNINDEXED.ofsId),
		multipliers: data.getMunicipalMultipliers(),
	};
});

describe(`fixture : ${UNINDEXED.municipality} sans indexation communale`, () => {
	it("taxEngineCoverage() la classe hors périmètre : elle manque à la liste des communes valaisannes couvertes", () => {
		const valais = fixture.coverage.notCovered.find((entry) => entry.case.startsWith("Valais"));
		expect(valais?.case).toMatch(/seulement dans (la commune|les communes) de/);
		expect(valais?.case).not.toContain(UNINDEXED.municipality);
		expect(fixture.coverage.cantonsCovered).toContain(UNINDEXED.canton);
	});

	it("le moteur refuse la commune pour une personne seule, par les deux chemins de barèmes, en la nommant", () => {
		for (const scales of [fixture.scales, fixture.viaBundle]) {
			expect(scales.coverage?.municipality).toBe(UNINDEXED.municipality);
			let error: unknown;
			try {
				computeIncomeAndWealthTax(single, scales);
			} catch (thrown) {
				error = thrown;
			}
			expect(error).toBeInstanceOf(PartialCoverageError);
			expect((error as PartialCoverageError).municipality).toBe(UNINDEXED.municipality);
		}
	});

	it("seule l'indexation de la commune est retirée ; les autres communes sont celles des données réelles", () => {
		const real = getMunicipalMultipliers()!;
		expect(fixture.multipliers).toEqual(withoutIndexation(real));
		// Aucune fuite : les données importées en tête de fichier gardent l'indexation de la commune
		expect(real.multipliers.find((entry) => entry.bfsId === UNINDEXED.ofsId)?.communalScaleIndexation).toBeDefined();
		const commune = fixture.multipliers!.multipliers.find((entry) => entry.bfsId === UNINDEXED.ofsId)!;
		expect(commune.municipality).toBe(UNINDEXED.municipality);
		expect(commune.communalScaleIndexation).toBeUndefined();
	});

	it("les barèmes fictifs des tests de moteur sont ceux que la couche de données assemble pour la fixture", () => {
		expect(unindexedScales(getTaxScales(query))).toEqual(fixture.scales);
	});
});
