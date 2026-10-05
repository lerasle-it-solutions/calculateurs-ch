import { describe, expect, it } from "vitest";

import { getFederalData } from "../../src/data";
import { federalNumber, federalValue } from "../../src/data/read-value";
import * as values from "../../src/lib/articles/rachat-3a-retroactif";
import { computePillar3aGaps, type Pillar3aGapsParams } from "../../src/lib/calculations/pension/pillar-3a-buyback";

/**
 * Module de valeurs de l'article 1 et accesseur strict : une valeur absente,
 * undefined ou TODO arrête la construction. Les exemples des pièges 1 et 4
 * sont rejoués par computePillar3aGaps, la répartition d'A1.
 */
describe("accesseur strict des valeurs d'article", () => {
	it("échoue sur une clé inexistante, une année absente ou une valeur TODO", () => {
		expect(() => federalValue(2026, "pillar3a.inexistant")).toThrow(/Valeur introuvable/);
		expect(() => federalValue(2030, "pillar3a.smallContributionCap")).toThrow(/Aucune donnée fédérale pour 2030/);
		expect(() => federalValue(2027, "directFederalTax.incomeTaxScales")).toThrow(/TODO/);
		expect(() => federalNumber(2026, "pillar3a.buyback")).toThrow();
	});

	it("chaque valeur exportée pour le texte est une chaîne non vide", () => {
		for (const [name, value] of Object.entries(values)) {
			if (typeof value === "string") expect(value.trim().length, name).toBeGreaterThan(0);
		}
		expect(values.firstGapYear).toBe("2025");
		expect(values.lookbackYears).toBe("10");
		expect(values.firstGapLastBuybackYear).toBe("2035");
		expect(values.firstGapExpiredYear).toBe("2036");
		expect(values.smallCap2027).toBe(new Intl.NumberFormat("fr-CH").format(getFederalData(2027).pillar3a.smallContributionCap.value));
		expect(values.lostWhenSplit2027).toBe(new Intl.NumberFormat("fr-CH").format(7143));
	});
});

describe("exemple chiffré de l'article", () => {
	it("reproduit le relevé fait sur A1 le 05.10.2026 : 4 758, 1 083, 143, 1 226 et 3 532 nets", () => {
		expect(values.numbers.example).toEqual({
			gap: 4758,
			buyback: 4758,
			cantonalSaving: 1083,
			federalSaving: 143,
			totalSaving: 1226,
			netCost: 3532,
			lastBuybackYear: 2035,
		});
	});
});

describe("pièges 1 et 4 rejoués par computePillar3aGaps", () => {
	const small2026 = getFederalData(2026).pillar3a.smallContributionCap.value;
	const small2027 = getFederalData(2027).pillar3a.smallContributionCap.value;
	const params = (buybackYear: number, cap: number, gaps: { year: number; gap: number; boughtBack?: boolean }[]): Pillar3aGapsParams => ({
		buybackYear,
		firstGapYear: { value: 2025, sourceId: "opp3-art-7a" },
		lookbackYears: { value: 10, sourceId: "opp3-art-7a" },
		buybackYearCap: { value: cap, sourceId: "ofas-amounts-2027" },
		gapYears: gaps.map(({ year, gap, boughtBack = false }) => ({
			year,
			maxContribution: { value: small2026, sourceId: "ofas-pillar-3a-caps" },
			paidContribution: small2026 - gap,
			hadAvsIncome: true,
			alreadyBoughtBack: boughtBack,
		})),
		currentYearContributionPaidInFull: true,
		hasAvsIncomeInBuybackYear: true,
		receivedOldAgeBenefit: false,
	});
	const bought = (result: ReturnType<typeof computePillar3aGaps>) =>
		result.years.filter((year) => year.proposedBuyback > 0).map((year) => year.year);

	it("piège 1 : deux lacunes entières ; 2025 rachetée en 2027, puis 2026 en 2028", () => {
		const in2027 = computePillar3aGaps(params(2027, small2027, [{ year: 2025, gap: small2026 }, { year: 2026, gap: small2026 }]));
		expect(bought(in2027)).toEqual([2025]);
		expect(in2027.years.find((year) => year.year === 2025)).toMatchObject({ proposedBuyback: small2026, partiallyFilled: false });
		// 2028 : plafond 2028 non publié ; celui de 2027 suffit, la lacune de 2026 tenant en dessous
		const in2028 = computePillar3aGaps(
			params(2028, small2027, [{ year: 2025, gap: small2026, boughtBack: true }, { year: 2026, gap: small2026 }]),
		);
		expect(bought(in2028)).toEqual([2026]);
	});

	it("piège 4 : 3 000 et 4 000 tiennent ensemble en 2027 ; avec 5 000 et une lacune entière, 2026 est rachetée en 2027 et 2025 gardée", () => {
		const together = computePillar3aGaps(params(2027, small2027, [{ year: 2025, gap: 3000 }, { year: 2026, gap: 4000 }]));
		expect(bought(together)).toEqual([2025, 2026]);
		expect(together.totalBuyback).toBe(7000);

		const apart = computePillar3aGaps(params(2027, small2027, [{ year: 2025, gap: 5000 }, { year: 2026, gap: small2026 }]));
		expect(bought(apart)).toEqual([2026]);
		expect(apart.years.find((year) => year.year === 2025)).toMatchObject({ proposedBuyback: 0, lostBalance: 0, lastBuybackYear: 2035 });
		// La figure 2 montre la même répartition
		expect(values.numbers.pitfall4.whole.filter((bar) => bar.bought > 0).map((bar) => bar.year)).toEqual([2026]);
	});
});
