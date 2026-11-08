import { describe, expect, it } from "vitest";

import { getMunicipalMultipliers } from "../../src/data";

/**
 * Valais, relevé du 7.11.2026 (« Coefficients et indexations des communes
 * 2022-2027 », Service cantonal des contributions) : chaque commune a
 * l'indexation de son barème communal (art. 178 al. 4 et 5 LF), sourcée par
 * l'entrée du registre qui porte ce PDF, en vigueur dès le 1.1.2026.
 */
const valais = (getMunicipalMultipliers()?.multipliers ?? []).filter((entry) => entry.canton === "VS");

describe("Valais : indexation communale de chaque commune", () => {
	it("chaque commune valaisanne a une indexation numérique, source vs-municipal-multipliers, en vigueur au 1.1.2026", () => {
		expect(valais.length).toBeGreaterThan(0);
		for (const entry of valais) {
			const indexation = entry.communalScaleIndexation;
			expect(indexation, `${entry.municipality} (${entry.bfsId}) : indexation absente`).toBeDefined();
			expect(typeof indexation!.value, `${entry.municipality} : indexation non numérique`).toBe("number");
			expect(Number.isFinite(indexation!.value)).toBe(true);
			expect(indexation!.sourceId, entry.municipality).toBe("vs-municipal-multipliers");
			expect(indexation!.effectiveFrom, entry.municipality).toBe("2026-01-01");
		}
	});
});
