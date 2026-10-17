import { describe, expect, it } from "vitest";

import { exampleFormValues } from "../../src/calculators/field-values";
import { lppBuyback } from "../../src/calculators/pension/lpp-buyback";
import { pillar3aBuyback } from "../../src/calculators/pension/pillar-3a-buyback";
import { pillar3aTaxSaving } from "../../src/calculators/pension/pillar-3a-tax-saving";
import { SHARE_PREFIX, decodeShareState, encodeShareState } from "../../src/lib/display/share-state";

/**
 * État partagé (docs/design-system.md § 4.4) : les saisies d'un calculateur
 * vont dans le fragment d'URL, jamais dans la query string ni au serveur ; le
 * résultat n'y est pas, il est recalculé à l'ouverture.
 */
describe.each([
	{ calculator: "A1", definition: pillar3aBuyback },
	{ calculator: "A2", definition: pillar3aTaxSaving },
	{ calculator: "A3", definition: lppBuyback },
])("$calculator : aller-retour des saisies", ({ definition }) => {
	it("le cas exemple revient à l'identique", () => {
		const values = exampleFormValues(definition);
		expect(decodeShareState(encodeShareState(values))).toEqual(values);
	});

	it("saisies du visiteur : apostrophes, accents, espaces, homonymes", () => {
		const values = {
			...exampleFormValues(definition),
			municipality: "Corcelles (NE)",
			cantonalTaxableIncome: "70’000",
			federalTaxableIncome: "72'000",
			childAge1: "12",
			note: "Genève & Neuchâtel = 50 %",
		};
		expect(decodeShareState(encodeShareState(values))).toEqual(values);
	});
});

describe("fragment d'URL", () => {
	it("commence par la version du format, sans « ? » : jamais une query string", () => {
		const hash = encodeShareState({ municipality: "Lausanne", children: "0" });
		expect(hash.startsWith(SHARE_PREFIX)).toBe(true);
		expect(hash.startsWith("#")).toBe(true);
		expect(hash).not.toContain("?");
	});

	it("les saisies vides ne sont pas transmises", () => {
		expect(decodeShareState(encodeShareState({ municipality: "Lausanne", federalTaxableIncome: "" }))).toEqual({ municipality: "Lausanne" });
	});

	it("une ancre ordinaire de la page n'est pas un état", () => {
		expect(decodeShareState("#detail-du-calcul")).toBeNull();
		expect(decodeShareState("#ce-que-ce-calcul-suppose")).toBeNull();
		expect(decodeShareState("")).toBeNull();
	});
});
