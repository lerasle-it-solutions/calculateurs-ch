import { describe, expect, it } from "vitest";

import { formatChfAmount } from "../../src/lib/display/pillar-3a-buyback";
import { formatChf, formatSwissNumber } from "../../src/lib/format/chf";
import { formatNumber } from "../../src/lib/utils/format-number";

/**
 * Le navigateur et la construction écrivent un montant de la même façon :
 * apostrophe typographique imposée, unité après le nombre, sans Intl. Les
 * fonctions testées ici sont celles qu'exécute le script d'A1.
 */
const AMOUNTS: [number, string][] = [
	[0, "0"],
	[143, "143"],
	[1842, "1’842"],
	[12346, "12’346"],
	[1234567, "1’234’567"],
];

describe("formateur du navigateur", () => {
	it.each(AMOUNTS)("%d : même chaîne qu'à la construction", (value, digits) => {
		expect(formatChf(value)).toBe(digits);
		expect(formatChfAmount(value)).toBe(`${formatChf(value)} CHF`);
		expect(formatChfAmount(value)).toBe(`${digits} CHF`);
	});

	it.each(AMOUNTS)("%d : la trace suit le même formateur", (value, digits) => {
		expect(formatNumber(value, 2)).toBe(formatSwissNumber(value, 2));
		expect(formatNumber(value, 4)).toBe(digits);
	});
});
