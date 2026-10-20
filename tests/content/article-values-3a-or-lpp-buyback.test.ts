import { describe, expect, it } from "vitest";

import * as values from "../../src/lib/articles/3a-ou-rachat-lpp";

/**
 * Module de valeurs de l'article 2 (« 3a ou rachat LPP »). Les deux exemples
 * sont rejoués à la construction par les moteurs d'A2 et d'A3, sur l'année
 * 2026 fixée ; leurs valeurs sont figées sur le relevé fait à l'écran, sur les
 * pages en production, le 20.10.2026 (jamais sur le calculateur de l'AFC, R6).
 */
describe("valeurs de l'article 2", () => {
	it("chaque valeur exportée pour le texte est une chaîne non vide", () => {
		for (const [name, value] of Object.entries(values)) {
			if (typeof value === "string") expect(value.trim().length, name).toBeGreaterThan(0);
		}
		expect(values.numbers.year).toBe(2026);
		expect(values.smallCap2026).toBe("7’258");
		expect(values.lockYears).toBe("3");
	});
});

describe("exemple 1 : même montant, même économie", () => {
	it("reproduit le relevé du 20.10.2026 : 915, 762 et 472, soit 2 149 sur 7 258 versés, 5 109 nets", () => {
		const expected = { deducted: 7258, cantonalTax: 915, municipalTax: 762, federalTax: 472, totalSaving: 2149, netCost: 5109 };
		expect(values.numbers.example1.amount).toBe(7258);
		expect(values.numbers.example1.pillar3a).toEqual(expected);
		expect(values.numbers.example1.lpp).toEqual(expected);
		expect(values.example1Share).toBe("30 %");
	});

	it("A2 et A3 rendent la même économie, composante par composante", () => {
		expect(values.numbers.example1.pillar3a).toEqual(values.numbers.example1.lpp);
	});
});

describe("exemple 2 : un gros rachat échelonné", () => {
	it("reproduit le relevé du 20.10.2026 : 14 523 en une fois, 3 tranches de 5 279, 15 837 en tout, + 1 314", () => {
		expect(values.numbers.example2.single).toEqual({ year: 2026, cantonalTax: 7770, municipalTax: 2702, federalTax: 4051, totalSaving: 14523 });
		expect(values.numbers.example2.tranches).toEqual([
			{ year: 2026, amount: 15000, saving: 5279 },
			{ year: 2027, amount: 15000, saving: 5279 },
			{ year: 2028, amount: 15000, saving: 5279 },
		]);
		expect(values.numbers.example2.spreadSaving).toBe(15837);
		expect(values.numbers.example2.difference).toBe(1314);
		expect(values.example2Difference).toBe("+ 1’314");
		expect(values.example2Tranches).toBe("15’000 + 15’000 + 15’000");
	});

	it("le délai de blocage de chaque tranche s'achève en 2029, 2030 et 2031", () => {
		expect(values.numbers.example2.lockCalendar).toEqual([
			{ buybackYear: 2026, lockEndsYear: 2029, compatibleFrom: 2030 },
			{ buybackYear: 2027, lockEndsYear: 2030, compatibleFrom: 2031 },
			{ buybackYear: 2028, lockEndsYear: 2031, compatibleFrom: 2032 },
		]);
	});

	it("reprend les libellés d'A3, typographie française comprise", () => {
		expect(values.spreadLabel).toBe("Sur 3 ans");
		expect(values.lockAssumption).toBe(
			"Le calcul raisonne en années civiles. Le délai se compte à partir de la date de chaque versement : si l’écart est de 3 ans, vérifiez la date exacte auprès de votre caisse.",
		);
	});
});
