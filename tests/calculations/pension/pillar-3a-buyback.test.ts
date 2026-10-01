import { describe, expect, it } from "vitest";

import { getFederalData } from "../../../src/data";
import {
	computePillar3aGaps,
	type Pillar3aGapYearInput,
	type Pillar3aGapsParams,
} from "../../../src/lib/calculations/pension/pillar-3a-buyback";

/**
 * Rachat rétroactif dans le pilier 3a (OPP 3, art. 7a et 7b), avec les plafonds
 * et les règles de src/data/federal/2026.json.
 */
const pillar3a = getFederalData(2026).pillar3a;
const sourced = (value: { value: number; sourceId: string }) => ({ value: value.value, sourceId: value.sourceId });
const small = sourced(pillar3a.smallContributionCap);
const large = sourced(pillar3a.largeContributionCap);

const gapYear = (year: number, overrides: Partial<Pillar3aGapYearInput> = {}): Pillar3aGapYearInput => ({
	year,
	maxContribution: small,
	paidContribution: 0,
	hadAvsIncome: true,
	alreadyBoughtBack: false,
	...overrides,
});

const params = (buybackYear: number, gapYears: Pillar3aGapYearInput[], overrides: Partial<Pillar3aGapsParams> = {}): Pillar3aGapsParams => ({
	buybackYear,
	firstGapYear: sourced(pillar3a.buyback.firstGapYear),
	lookbackYears: sourced(pillar3a.buyback.lookbackYears),
	buybackYearCap: small,
	gapYears,
	currentYearContributionPaidInFull: true,
	hasAvsIncomeInBuybackYear: true,
	receivedOldAgeBenefit: false,
	...overrides,
});

describe("rachat rétroactif dans le pilier 3a", () => {
	it("lacune simple : 2025 rachetée en 2026, rachetable jusqu'en 2035", () => {
		const result = computePillar3aGaps(params(2026, [gapYear(2025, { paidContribution: 3_000 })]));
		const [y2025] = result.years;
		expect(y2025).toMatchObject({ year: 2025, gap: small.value - 3_000, proposedBuyback: small.value - 3_000, eligible: true, refusalReason: null, lastBuybackYear: 2035 });
		expect(result.totalBuyback).toBe(small.value - 3_000);
	});

	it("année antérieure à 2025 : non rachetable, disposition transitoire", () => {
		const result = computePillar3aGaps(params(2026, [gapYear(2024)]));
		expect(result.years[0]).toMatchObject({ eligible: false, proposedBuyback: 0 });
		expect(result.years[0]!.refusalReason).toMatch(/disposition transitoire/);
		expect(result.totalBuyback).toBe(0);
	});

	it("deux lacunes dont une périmée : en 2036, 2025 est échue (dernière année 2035), 2030 reste rachetable", () => {
		const result = computePillar3aGaps(params(2036, [gapYear(2025), gapYear(2030, { paidContribution: 2_000 })]));
		const [y2025, y2030] = result.years;
		expect(y2025).toMatchObject({ eligible: false, lastBuybackYear: 2035, proposedBuyback: 0 });
		expect(y2025!.refusalReason).toMatch(/jusqu'en 2035.*art\. 7a al\. 1 let\. a/);
		expect(y2030).toMatchObject({ eligible: true, lastBuybackYear: 2040, proposedBuyback: small.value - 2_000 });
	});

	it("lacunes cumulées au-delà du plafond de R : une année entière, la plus ancienne à égalité, l'autre gardée intacte pour plus tard", () => {
		const result = computePillar3aGaps(
			params(2027, [gapYear(2026, { paidContribution: 2_000 }), gapYear(2025, { paidContribution: 2_000 })]),
		);
		const [y2025, y2026] = result.years;
		const gap = small.value - 2_000;
		expect(y2025).toMatchObject({ year: 2025, proposedBuyback: gap, partiallyFilled: false });
		// 2026 n'est pas entamée : elle reste rachetable jusqu'en 2036, sans solde perdu
		expect(y2026).toMatchObject({ year: 2026, proposedBuyback: 0, partiallyFilled: false, lostBalance: 0, lastBuybackYear: 2036 });
		expect(result.totalBuyback).toBe(gap);
		expect(result.breakdown.some((entry) => entry.assumption?.includes("reste rachetable jusqu'en 2036"))).toBe(true);
	});

	it("R = 2029 : 2025 et 2028 entières plutôt que 2025 et une partie de 2027", () => {
		const result = computePillar3aGaps(
			params(2029, [
				gapYear(2025, { paidContribution: small.value - 5_258 }),
				gapYear(2027, { paidContribution: small.value - 7_258 }),
				gapYear(2028, { paidContribution: small.value - 2_000 }),
			]),
		);
		const byYear = Object.fromEntries(result.years.map((year) => [year.year, year]));
		expect(byYear[2025]).toMatchObject({ gap: 5_258, proposedBuyback: 5_258, partiallyFilled: false });
		expect(byYear[2027]).toMatchObject({ gap: 7_258, proposedBuyback: 0, partiallyFilled: false, lostBalance: 0 });
		expect(byYear[2028]).toMatchObject({ gap: 2_000, proposedBuyback: 2_000, partiallyFilled: false });
		expect(result.totalBuyback).toBe(7_258);
		expect(result.years.some((year) => year.partiallyFilled)).toBe(false);
	});

	it("indépendant : une lacune de grande cotisation, au-delà du plafond de R, n'est entamée que l'année où elle expire", () => {
		// En 2026, l'entamer perdrait le solde : elle reste rachetable jusqu'en 2035
		const early = computePillar3aGaps(params(2026, [gapYear(2025, { maxContribution: large })]));
		expect(early.years[0]).toMatchObject({ gap: large.value, proposedBuyback: 0, partiallyFilled: false, lastBuybackYear: 2035 });
		expect(early.totalBuyback).toBe(0);
		// En 2035, dernière année : comblée jusqu'au plafond, le solde est perdu
		const last = computePillar3aGaps(params(2035, [gapYear(2025, { maxContribution: large })]));
		expect(last.years[0]).toMatchObject({ proposedBuyback: small.value, partiallyFilled: true, lostBalance: large.value - small.value });
		expect(last.totalBuyback).toBe(small.value);
	});

	it("inéligible faute de revenu soumis à l'AVS l'année de la lacune", () => {
		const result = computePillar3aGaps(params(2026, [gapYear(2025, { hadAvsIncome: false })]));
		expect(result.years[0]).toMatchObject({ eligible: false, proposedBuyback: 0 });
		expect(result.years[0]!.refusalReason).toMatch(/art\. 7a al\. 1 let\. b/);
	});

	it("inéligible faute de revenu soumis à l'AVS l'année du rachat", () => {
		const result = computePillar3aGaps(params(2026, [gapYear(2025)], { hasAvsIncomeInBuybackYear: false }));
		expect(result.years[0]).toMatchObject({ eligible: false, proposedBuyback: 0 });
		expect(result.years[0]!.refusalReason).toMatch(/découle de l'art\. 7a al\. 1 let\. c/);
		expect(result.totalBuyback).toBe(0);
	});

	it("aucun rachat si la cotisation ordinaire de R n'est pas versée intégralement", () => {
		const result = computePillar3aGaps(params(2026, [gapYear(2025)], { currentYearContributionPaidInFull: false }));
		expect(result.years[0]!.refusalReason).toMatch(/pas versée intégralement.*art\. 7a al\. 1 let\. c/);
		expect(result.totalBuyback).toBe(0);
	});

	it("année déjà rachetée en partie : plus rachetable, solde perdu", () => {
		const result = computePillar3aGaps(params(2027, [gapYear(2025, { paidContribution: 5_000, alreadyBoughtBack: true }), gapYear(2026)]));
		const [y2025, y2026] = result.years;
		expect(y2025).toMatchObject({ eligible: false, proposedBuyback: 0 });
		expect(y2025!.refusalReason).toMatch(/un seul rachat par année de lacune.*art\. 7a al\. 3/);
		expect(y2026).toMatchObject({ eligible: true, proposedBuyback: small.value });
	});

	it("aucun rachat après une prestation de vieillesse", () => {
		const result = computePillar3aGaps(params(2026, [gapYear(2025)], { receivedOldAgeBenefit: true }));
		expect(result.years[0]!.refusalReason).toMatch(/prestation de vieillesse.*art\. 7a al\. 4/);
		expect(result.totalBuyback).toBe(0);
	});

	it("la trace signale la limite d'âge non examinée et chaque ligne porte une source", () => {
		const { breakdown } = computePillar3aGaps(params(2026, [gapYear(2025)]));
		expect(breakdown.some((entry) => entry.formula.includes("art. 7a al. 5"))).toBe(true);
		for (const entry of breakdown) expect(entry.sourceId).not.toBeNull();
	});
});
