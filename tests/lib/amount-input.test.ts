import { describe, expect, it } from "vitest";

import { formatNumberTyping, numberError, numberErrorText, parseNumber } from "../../src/lib/format/amount-input";
import { formatSwissNumber } from "../../src/lib/format/chf";
import { fr } from "../../src/i18n/fr";

/**
 * Saisie tolérante des nombres (docs/design-system.md § 2.3, NumberField en
 * `type="text" inputmode="decimal"`) : lecture des formes suisses courantes,
 * bornes et pas validés par le parseur, formatage pendant la frappe sans que le
 * curseur saute.
 */
describe("lecture d'un nombre saisi", () => {
	it("accepte l'apostrophe droite ou typographique, l'espace (y compris insécable) ou rien entre les milliers", () => {
		for (const text of ["70'000", "70’000", "70 000", "70 000", "70 000", "70000", "  70 000 "]) {
			expect(parseNumber(text), JSON.stringify(text)).toBe(70_000);
		}
	});

	it("accepte les décimales au point ou à la virgule, et le signe moins", () => {
		expect(parseNumber("1234.5")).toBe(1234.5);
		expect(parseNumber("1234,5")).toBe(1234.5);
		expect(parseNumber("1’234,50")).toBe(1234.5);
		expect(parseNumber("0.01")).toBe(0.01);
		expect(parseNumber("-500")).toBe(-500);
	});

	it("rend null pour une saisie vide, NaN pour une saisie qui n'est pas un nombre", () => {
		expect(parseNumber("")).toBeNull();
		expect(parseNumber("   ")).toBeNull();
		for (const text of ["abc", "12a", "1.2.3", "1,2.3", "--5", "5-", "'", ",", "-"]) {
			expect(parseNumber(text), JSON.stringify(text)).toBeNaN();
		}
	});
});

describe("validation des bornes et du pas", () => {
	it("aucune erreur pour une saisie vide ou conforme", () => {
		expect(numberError("", { min: 0 })).toBeNull();
		expect(numberError("70'000", { min: 0, step: 100 })).toBeNull();
		expect(numberError("0,05", { min: 0, step: 0.01 })).toBeNull();
		expect(numberError("2030", { min: 2026, step: 1 })).toBeNull();
		expect(numberError("-12", {})).toBeNull();
	});

	it("saisie illisible, sous le minimum, au-dessus du maximum, hors du pas", () => {
		expect(numberError("abc", { min: 0 })).toBe("invalid");
		expect(numberError("-1", { min: 0 })).toBe("min");
		expect(numberError("150", { max: 100 })).toBe("max");
		expect(numberError("70’050", { min: 0, step: 100 })).toBe("step");
		expect(numberError("0.005", { min: 0, step: 0.01 })).toBe("step");
		expect(numberError("2030.5", { min: 2026, step: 1 })).toBe("step");
	});

	it("le pas part du minimum, comme l'attribut step natif", () => {
		expect(numberError("15", { min: 5, step: 10 })).toBeNull();
		expect(numberError("20", { min: 5, step: 10 })).toBe("step");
	});
});

describe("formatage pendant la frappe", () => {
	it("groupe les milliers d'un montant par l'apostrophe typographique, curseur après le même chiffre", () => {
		expect(formatNumberTyping("70000", 5, true)).toEqual({ text: "70’000", caret: 6 });
		expect(formatNumberTyping("7000", 1, true)).toEqual({ text: "7’000", caret: 1 });
		expect(formatNumberTyping("1234,5", 6, true)).toEqual({ text: "1’234,5", caret: 7 });
		expect(formatNumberTyping("-1500", 5, true)).toEqual({ text: "-1’500", caret: 6 });
	});

	it("insertion et suppression au milieu du nombre : le curseur reste après le même chiffre", () => {
		// « 5 » tapé après « 70 » dans « 70’000 »
		expect(formatNumberTyping("705’000", 3, true)).toEqual({ text: "705’000", caret: 3 });
		// un zéro supprimé avant le curseur dans « 70’000 »
		expect(formatNumberTyping("70’00", 4, true)).toEqual({ text: "7’000", caret: 4 });
		// séparateur saisi à la main
		expect(formatNumberTyping("70'000", 6, true)).toEqual({ text: "70’000", caret: 6 });
		expect(formatNumberTyping("70 0000", 7, true)).toEqual({ text: "700’000", caret: 7 });
	});

	it("laisse intacte une saisie qui n'est pas un nombre, et ne groupe pas hors montant", () => {
		expect(formatNumberTyping("12a", 3, true)).toEqual({ text: "12a", caret: 3 });
		expect(formatNumberTyping("", 0, true)).toEqual({ text: "", caret: 0 });
		expect(formatNumberTyping("2030", 4, false)).toEqual({ text: "2030", caret: 4 });
		expect(formatNumberTyping("0,05", 4, false)).toEqual({ text: "0,05", caret: 4 });
	});
});

describe("message d'erreur d'un champ numérique", () => {
	// Un seul jeu de gabarits sur le formulaire, plus un jeu de messages par champ (poids du HTML) :
	// le message composé est celui que NumberField rendait pour chaque champ.
	const bound = (value: number) => formatSwissNumber(value, 4);
	it.each([
		{ min: 0, step: 1 },
		{ min: 2026, max: 2100, step: 1 },
		{ min: 0, step: 0.01 },
		{ min: 1000, max: 70000, step: 100 },
	])("bornes %o : mêmes messages qu'avant", (bounds) => {
		const templates = fr.numberField.templates;
		expect(numberErrorText("invalid", bounds, templates)).toBe(fr.numberField.invalid);
		expect(numberErrorText("min", bounds, templates)).toBe(fr.numberField.min(bound(bounds.min)));
		if (bounds.max !== undefined) expect(numberErrorText("max", bounds, templates)).toBe(fr.numberField.max(bound(bounds.max)));
		expect(numberErrorText("step", bounds, templates)).toBe(fr.numberField.step(bound(bounds.step)));
	});
});
