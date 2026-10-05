import { describe, expect, it } from "vitest";

import { formatChf, formatPercent, formatSwissNumber, THOUSANDS_SEPARATOR } from "../../src/lib/format/chf";

/** Formateur suisse unique : séparateur imposé, indépendant de l'ICU de Node. */
describe("formateur suisse", () => {
	it("sépare les milliers par l'apostrophe typographique, sans séparateur sous mille", () => {
		expect(THOUSANDS_SEPARATOR).toBe("’");
		expect(formatChf(7373)).toBe("7’373");
		expect(formatChf(36864)).toBe("36’864");
		expect(formatChf(1226)).toBe("1’226");
		expect(formatChf(143)).toBe("143");
		expect(formatChf(1234567)).toBe("1’234’567");
	});

	it("arrondit, garde la virgule décimale et le signe", () => {
		expect(formatChf(7372.6)).toBe("7’373");
		expect(formatSwissNumber(1.8, 2)).toBe("1,8");
		expect(formatSwissNumber(0.5, 2)).toBe("0,5");
		expect(formatSwissNumber(-7258)).toBe("-7’258");
		expect(formatSwissNumber(-0.4)).toBe("0");
		expect(formatPercent(0.2)).toBe("20 %");
		expect(() => formatChf(Number.NaN)).toThrow();
	});
});
