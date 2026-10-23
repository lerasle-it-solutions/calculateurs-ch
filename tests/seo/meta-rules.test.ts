import { describe, expect, it } from "vitest";

import { checkMeta, headingJumps, isW3cDatetime, repeatsTitle } from "../../src/lib/seo/meta-rules";

/**
 * Règles des balises lues par Bing (prompt SEO du 23.10.2026) : limites dures
 * qui bloquent la construction, cibles signalées sans bloquer.
 */
const text = (length: number, char = "a") => char.repeat(length);

describe("checkMeta", () => {
	const description = text(130);

	it("bloque au-delà des limites dures de Bing : 70 caractères de title, 160 de description", () => {
		expect(checkMeta(text(70), description).errors).toEqual([]);
		expect(checkMeta(text(71), description).errors).toHaveLength(1);
		expect(checkMeta(text(50), text(160)).errors).toEqual([]);
		expect(checkMeta(text(50), text(161)).errors).toHaveLength(1);
		expect(checkMeta("", description).errors).toHaveLength(1);
		expect(checkMeta(text(50), " ").errors).toHaveLength(1);
	});

	it("compte les caractères, pas les unités UTF-16 ni les octets", () => {
		expect(checkMeta(text(70, "é"), description).errors).toEqual([]);
		expect(checkMeta(text(70, "’"), description).errors).toEqual([]);
	});

	it("signale sans bloquer un title de 60 caractères ou plus, une description hors de 120 à 150", () => {
		expect(checkMeta(text(59), description).warnings).toEqual([]);
		expect(checkMeta(text(60), description).warnings).toHaveLength(1);
		expect(checkMeta(text(50), text(120)).warnings).toEqual([]);
		expect(checkMeta(text(50), text(150)).warnings).toEqual([]);
		expect(checkMeta(text(50), text(119)).warnings).toHaveLength(1);
		expect(checkMeta(text(50), text(151)).warnings).toHaveLength(1);
		expect(checkMeta(text(60), text(151)).errors).toEqual([]);
	});

	it("signale un dépassement mesuré en octets UTF-8", () => {
		const warnings = checkMeta(text(50), text(140, "é")).warnings;
		expect(warnings).toHaveLength(1);
		expect(warnings[0]).toMatch(/280 octets/);
	});
});

describe("repeatsTitle", () => {
	it("repère une description qui reprend le title ou en reprend l'attaque", () => {
		expect(repeatsTitle("Guides · calculateurs.ch", "Guides de prévoyance pour la Suisse romande.")).toBe(true);
		expect(repeatsTitle("Rachat LPP 2026 : combien ?", "Rachat LPP : estimez l’économie d’impôt.")).toBe(true);
		expect(repeatsTitle("Méthodologie · calculateurs.ch", "Comment nous calculons. Méthodologie · calculateurs.ch")).toBe(true);
	});

	it("laisse passer une description qui résume sans répéter", () => {
		expect(repeatsTitle("Rachat LPP 2026 : combien ?", "L’économie d’impôt d’un rachat dans votre caisse de pension.")).toBe(false);
		expect(repeatsTitle("Données et sources · calculateurs.ch", "Chaque source officielle utilisée par les calculateurs.")).toBe(false);
	});
});

describe("headingJumps", () => {
	it("exige un H1 en tête et aucun niveau sauté en descendant", () => {
		expect(headingJumps([1, 2, 3, 2, 3, 3, 2, 2])).toEqual([]);
		expect(headingJumps([1, 2, 3, 4, 2, 1])).toEqual([]);
		expect(headingJumps([1, 3, 2])).toEqual(["h1 → h3"]);
		expect(headingJumps([2, 3])).toEqual(["début → h2"]);
		expect(headingJumps([])).toEqual([]);
	});
});

describe("isW3cDatetime", () => {
	it("accepte une date ISO 8601 avec l'heure et le fuseau, refuse le reste", () => {
		expect(isW3cDatetime("2026-10-18T09:00:00+02:00")).toBe(true);
		expect(isW3cDatetime("2026-10-18T07:00:00.000Z")).toBe(true);
		expect(isW3cDatetime("2026-10-18")).toBe(false);
		expect(isW3cDatetime("2026-10-18T09:00:00")).toBe(false);
		expect(isW3cDatetime("2026-13-18T09:00:00Z")).toBe(false);
	});
});
