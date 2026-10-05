/**
 * Valeurs de l'article « Rachat rétroactif du 3e pilier »
 * (src/content/articles/rachat-3a-retroactif.mdx).
 *
 * Seul endroit où vit la logique de l'article : le texte MDX n'affiche que
 * des noms exportés ici, sans calcul (tests/content/articles.test.ts). Chaque
 * montant ou année passe par l'accesseur strict de src/data/read-value.ts :
 * année absente, valeur introuvable, undefined ou TODO, la construction échoue.
 * Les années 2026 et 2027 sont celles dont parle le texte, en toutes lettres.
 */
import { federalNumber } from "../../data/read-value";
import { getMunicipalMultipliers } from "../../data";
import { getTaxScales } from "../../data/tax-scales";
import { resolveTaxYear } from "../../data/tax-years";
import { PILLAR_3A_BUYBACK_ID } from "../../calculators/pension/pillar-3a-buyback";
import { computePillar3aBuyback, computePillar3aGaps } from "../calculations/pension/pillar-3a-buyback";
import type { TaxInput } from "../calculations/tax";

const amount = new Intl.NumberFormat("fr-CH");
/**
 * Montant à la suisse avec l'apostrophe typographique, « 7’258 », quel que soit
 * l'ICU de Node : selon la version, Intl sépare les milliers en fr-CH par une
 * apostrophe droite (Node 24) ou par une espace fine (Node 22, celui de la
 * construction sur Cloudflare). Le séparateur est donc imposé, pas transformé.
 * L'apostrophe typographique est aussi celle que la ponctuation de Markdown
 * donne aux montants écrits dans le texte (« 3’000 »).
 */
const chf = (value: number): string =>
	amount
		.formatToParts(value)
		.map((part) => (part.type === "group" ? "\u2019" : part.value))
		.join("");
const percent = (rate: number): string => `${amount.format(rate * 100)} %`;

// Données
const firstGap = federalNumber(2026, "pillar3a.buyback.firstGapYear");
const lookback = federalNumber(2026, "pillar3a.buyback.lookbackYears");
const small2026 = federalNumber(2026, "pillar3a.smallContributionCap");
const small2027 = federalNumber(2027, "pillar3a.smallContributionCap");
const large2026 = federalNumber(2026, "pillar3a.largeContributionCap");
const large2027 = federalNumber(2027, "pillar3a.largeContributionCap");
const largeRate2026 = federalNumber(2026, "pillar3a.largeContributionIncomeRate");

/** Première année de lacune rachetable : [2025]. */
export const firstGapYear = String(firstGap);
/** Premier rachat possible, l'année qui suit la première lacune : [2026]. */
export const firstBuybackYear = String(firstGap + 1);
/** Délai de rachat, en années : [10]. */
export const lookbackYears = String(lookback);
/** Dernière année de rachat de la première lacune : [2035]. */
export const firstGapLastBuybackYear = String(firstGap + lookback);
/** Année où la première lacune est périmée : [2036]. */
export const firstGapExpiredYear = String(firstGap + lookback + 1);

/** Petite cotisation 2025-2026 : [7 258]. */
export const smallCap2026 = chf(small2026);
/** Petite cotisation 2027 : [7 373]. */
export const smallCap2027 = chf(small2027);
/** Grande cotisation 2026 : [36 288]. */
export const largeCap2026 = chf(large2026);
/** Taux de la grande cotisation : [20 %]. */
export const largeCapRate2026 = percent(largeRate2026);
/** Grande cotisation 2027 : [36 864]. */
export const largeCap2027 = chf(large2027);

/** Cotisation puis rachat la même année, 2026 : 2 × petite cotisation, [14 516]. */
export const contributionAndBuyback2026 = chf(2 * small2026);
/** Idem en 2027 : [14 746]. */
export const contributionAndBuyback2027 = chf(2 * small2027);
/** Piège 1 : deux lacunes entières de 2026 partagées sous le plafond 2027, solde perdu : [7 143]. */
export const lostWhenSplit2027 = chf(2 * small2026 - small2027);

/**
 * Piège 4 et figure 2 : lacunes de l'exemple du texte, figées — 5 000 francs
 * pour la première année (montant d'exemple, pas une donnée), une petite
 * cotisation entière pour la suivante —, rachetées en 2027 sous la petite
 * cotisation 2027. À gauche, l'année entière la plus élevée ; à droite, le
 * plafond partagé entre les deux années, à parts égales, qui les clôt toutes
 * les deux.
 */
const pitfall4ExampleGap = 5000;
const pitfall4 = (() => {
	const gaps = [
		{ year: firstGap, gap: pitfall4ExampleGap },
		{ year: firstGap + 1, gap: small2026 },
	];
	const buybackYear = firstGap + 2;
	// À gauche : la répartition d'A1, par computePillar3aGaps, et non une règle recodée ici.
	const allocation = computePillar3aGaps({
		buybackYear,
		firstGapYear: { value: firstGap, sourceId: "opp3-art-7a" },
		lookbackYears: { value: lookback, sourceId: "opp3-art-7a" },
		buybackYearCap: { value: small2027, sourceId: "ofas-amounts-2027" },
		gapYears: gaps.map(({ year, gap }) => ({
			year,
			maxContribution: { value: small2026, sourceId: "ofas-pillar-3a-caps" },
			paidContribution: small2026 - gap,
			hadAvsIncome: true,
			alreadyBoughtBack: false,
		})),
		currentYearContributionPaidInFull: true,
		hasAvsIncomeInBuybackYear: true,
		receivedOldAgeBenefit: false,
	});
	const halves = [Math.ceil(small2027 / 2), Math.floor(small2027 / 2)];
	return {
		buybackYear,
		nextBuybackYear: buybackYear + 1,
		cap: small2027,
		whole: allocation.years.map(({ year, gap, proposedBuyback }) => ({ year, gap, bought: proposedBuyback })),
		split: gaps.map((entry, index) => ({ ...entry, bought: Math.min(entry.gap, halves[index]!) })),
	};
})();

/**
 * Exemple chiffré : le calcul d'A1, rejoué à la construction sur les entrées de
 * l'exemple du texte (montants ronds choisis pour l'exemple, barèmes 2026).
 * Personne seule sans enfant à Lausanne, revenus imposables cantonal 70 000 et
 * fédéral 72 000, 2 500 francs versés en 2025. Le relevé fait à l'écran d'A1
 * est figé par tests/content/article-values.test.ts.
 */
const example = (() => {
	const year = firstGap + 1;
	const lausanne = getMunicipalMultipliers()?.multipliers.find((entry) => entry.municipality === "Lausanne" && entry.canton === "VD");
	if (!lausanne) throw new Error("Lausanne absente des coefficients communaux.");
	const taxInput: TaxInput = {
		taxYear: year,
		canton: "VD",
		municipalityOfsId: lausanne.bfsId,
		maritalStatus: "single",
		children: 0,
		childrenAges: [],
		denomination: "none",
		cantonalTaxableIncome: 70_000,
		federalTaxableIncome: 72_000,
		taxableWealth: 0,
	};
	const cap = { value: small2026, sourceId: "ofas-pillar-3a-caps" };
	const result = computePillar3aBuyback({
		taxInput,
		scales: getTaxScales(taxInput),
		gaps: {
			buybackYear: year,
			firstGapYear: { value: firstGap, sourceId: "opp3-art-7a" },
			lookbackYears: { value: lookback, sourceId: "opp3-art-7a" },
			buybackYearCap: cap,
			gapYears: [{ year: firstGap, maxContribution: cap, paidContribution: 2_500, hadAvsIncome: true, alreadyBoughtBack: false }],
			currentYearContributionPaidInFull: true,
			hasAvsIncomeInBuybackYear: true,
			receivedOldAgeBenefit: false,
		},
	});
	const gap = result.gaps.years[0]!;
	return {
		gap: gap.gap,
		buyback: result.buybackAmount,
		cantonalSaving: result.cantonalAndMunicipalSaving,
		federalSaving: result.federalSaving,
		totalSaving: result.taxSaving,
		netCost: result.buybackAmount - result.taxSaving,
		lastBuybackYear: gap.lastBuybackYear,
	};
})();

/** Exemple : lacune de l'année, rachat possible, économies et coût net, relevés sur A1. */
export const exampleGap = chf(example.gap);
export const exampleBuyback = chf(example.buyback);
export const exampleCantonalSaving = chf(example.cantonalSaving);
export const exampleFederalSaving = chf(example.federalSaving);
export const exampleTotalSaving = chf(example.totalSaving);
export const exampleNetCost = chf(example.netCost);

/** Valeurs numériques, pour les composants de l'article (tableau, figures) et les tests. */
export const numbers = {
	firstGapYear: firstGap,
	lookbackYears: lookback,
	smallCap2026: small2026,
	smallCap2027: small2027,
	pitfall4,
	example,
	/** Année de calcul d'A1 (resolveTaxYear) : repère « année en cours » de la figure 1. */
	currentTaxYear: resolveTaxYear(PILLAR_3A_BUYBACK_ID).year,
} as const;

/** Montant formaté à la suisse, pour les composants de l'article. */
export const formatAmount = chf;
