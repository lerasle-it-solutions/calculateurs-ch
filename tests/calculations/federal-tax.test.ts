import { describe, expect, it } from "vitest";

import { getFederalTaxScales } from "../../src/data/tax-scales";
import { computeFederalIncomeTax, type TaxInput } from "../../src/lib/calculations/tax";

/**
 * Impôt fédéral direct 2026 sur les barèmes réels de src/data/federal/2026.json
 * (RS 642.119.2). Les montants attendus se calculent à la main depuis la table
 * publiée ; aucun n'est un résultat du calculateur de l'AFC.
 */
const federal = getFederalTaxScales(2026);

const input = (overrides: Partial<TaxInput>): TaxInput => ({
	taxYear: 2026,
	canton: "NE",
	municipalityOfsId: 1,
	maritalStatus: "single",
	children: 0,
	childrenAges: [],
	denomination: "none",
	federalTaxableIncome: 0,
	cantonalTaxableIncome: 0,
	taxableWealth: 0,
	...overrides,
});

const federalTax = (overrides: Partial<TaxInput>): number => computeFederalIncomeTax(input(overrides), federal).federalTax;

describe("impôt fédéral direct 2026", () => {
	it("revenu d'un million : 11,5 % du revenu entier, barème de base comme barème pour époux", () => {
		expect(federalTax({ federalTaxableIncome: 1_000_000 })).toBe(115_000);
		expect(federalTax({ federalTaxableIncome: 1_000_000, maritalStatus: "married" })).toBe(115_000);
		// au-delà du seuil, pas de calcul par tranche de 100 : 1 000 050 × 11,5 % = 115 005,75
		expect(federalTax({ federalTaxableIncome: 1_000_050 })).toBe(115_006);
	});

	it("revenu de 16 000 : 8 × 0,77 = 6,16, arrondi à 6, inférieur à 25 CHF, non perçu", () => {
		const { federalTax: tax, breakdown } = computeFederalIncomeTax(input({ federalTaxableIncome: 16_000 }), federal);
		expect(tax).toBe(0);
		const notLevied = breakdown.at(-1);
		expect(notLevied?.label).toBe("Impôt fédéral direct non perçu");
		expect(notLevied?.operands).toEqual({ federalTax: 6, minimumLeviedTax: 25 });
		expect(notLevied?.sourceId).toBe("fedlex-lifd");
	});
});
