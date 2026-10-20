/**
 * Valeurs de l'article « 3a ou rachat LPP »
 * (src/content/articles/3a-ou-rachat-lpp.mdx).
 *
 * Seul endroit où vit la logique de l'article : le texte MDX n'affiche que
 * des noms exportés ici, sans calcul (tests/content/articles.test.ts). Chaque
 * montant ou année passe par l'accesseur strict de src/data/read-value.ts :
 * année absente, valeur introuvable, undefined ou TODO, la construction échoue.
 * L'article est daté : l'année 2026 est fixée, jamais résolue (resolveTaxYear).
 *
 * Les deux exemples sont rejoués à la construction par les moteurs d'A2
 * (computePillar3aTaxSaving) et d'A3 (computeLppBuyback), sur des entrées
 * définies une seule fois ci-dessous. Le relevé fait à l'écran le 20.10.2026
 * est figé par tests/content/article-values-3a-or-lpp-buyback.test.ts.
 */
import { getFederalData, getMunicipalMultipliers } from "../../data";
import { federalNumber } from "../../data/read-value";
import { getTaxScales } from "../../data/tax-scales";
import { lppBuybackTexts } from "../../calculators/pension/lpp-buyback";
import { computeLppBuyback } from "../calculations/pension/lpp-buyback";
import { LOCK_PERIOD_ASSUMPTION_END, LOCK_PERIOD_ASSUMPTION_START } from "../calculations/pension/lpp-buyback-labels";
import { computePillar3aTaxSaving } from "../calculations/pension/pillar-3a-tax-saving";
import type { TaxInput } from "../calculations/tax";
import { formatChf, formatPercent } from "../format/chf";

/** Année des barèmes et des plafonds dont parle l'article. */
const YEAR = 2026;

const chf = formatChf;
/** Part de l'économie dans le montant versé, sans décimale, comme la carte résultat : « 30 % ». */
const share = (saving: number, amount: number): string => formatPercent(saving / amount, 0);
/** Écart signé, dit en mots : « + 1’314 », « − 12 » (signe moins typographique, charte § 3.1). */
const signed = (amount: number): string => (amount > 0 ? `+ ${chf(amount)}` : amount < 0 ? `− ${chf(-amount)}` : chf(0));

/** Valeur fédérale de l'année, avec l'acte qui la fixe, lue par l'accesseur strict. */
const sourced = (path: string): { value: number; sourceId: string } => {
	const value = federalNumber(YEAR, path);
	const node = path.split(".").reduce<unknown>((parent, key) => (parent as Record<string, unknown>)[key], getFederalData(YEAR));
	return { value, sourceId: (node as { sourceId: string }).sourceId };
};

const smallCap = sourced("pillar3a.smallContributionCap");
const largeCap = sourced("pillar3a.largeContributionCap");
const largeRate = sourced("pillar3a.largeContributionIncomeRate");
const lock = sourced("lppBuyback.lockPeriodYears");
const firstGap = federalNumber(YEAR, "pillar3a.buyback.firstGapYear");

/** Typographie française d'un libellé repris d'un module de calcul : apostrophe typographique, espace fine avant « : ». */
const typeset = (text: string): string => text.replace(/'/g, "’").replace(/ ([:;?])/g, "\u202f$1");

const ofsId = (municipality: string, canton: string): number => {
	const entry = getMunicipalMultipliers()?.multipliers.find((m) => m.municipality === municipality && m.canton === canton);
	if (!entry) throw new Error(`${municipality} (${canton}) absente des coefficients communaux.`);
	return entry.bfsId;
};

/**
 * Entrées des deux exemples : montants ronds choisis pour l'exemple, pas des
 * données. Le montant de l'exemple 1 est la petite cotisation, lue dans les données.
 */
const INPUTS = {
	/** Personne seule sans enfant à Fribourg, affiliée à une caisse de pension. */
	example1: { municipality: "Fribourg", canton: "FR", cantonalTaxableIncome: 85_000, federalTaxableIncome: 88_000, buybackPotential: 50_000 },
	/** Couple marié avec deux enfants en ville de Genève ; une seule personne rachète. */
	example2: {
		municipality: "Genève",
		canton: "GE",
		children: 2,
		cantonalTaxableIncome: 150_000,
		federalTaxableIncome: 160_000,
		buybackPotential: 80_000,
		amount: 45_000,
		tranches: 3,
	},
} as const;

/** Exemple 1 : le même montant, versé au 3a (A2) ou racheté dans la caisse de pension (A3). */
const example1 = (() => {
	const input = INPUTS.example1;
	const taxInput: TaxInput = {
		taxYear: YEAR,
		canton: input.canton,
		municipalityOfsId: ofsId(input.municipality, input.canton),
		maritalStatus: "single",
		children: 0,
		childrenAges: [],
		denomination: "none",
		cantonalTaxableIncome: input.cantonalTaxableIncome,
		federalTaxableIncome: input.federalTaxableIncome,
		taxableWealth: 0,
	};
	const scales = getTaxScales(taxInput);
	const amount = smallCap.value;
	const pillar3a = computePillar3aTaxSaving({
		taxInput,
		scales,
		smallContributionCap: smallCap,
		largeContributionCap: largeCap,
		largeContributionIncomeRate: largeRate,
		contributors: [
			{ affiliated: true, earnedIncome: null, contribution: amount, hasAvsIncome: true, reachedReferenceAge: false, workingWithinFiveYearsOfReferenceAge: false },
		],
		ruleSources: { ordinance: "opp3-art-7a", circular: "afc-circular-18a" },
	});
	const lpp = computeLppBuyback({
		taxInput,
		scales,
		buybackPotential: input.buybackPotential,
		amount,
		unrepaidHomeOwnershipWithdrawal: false,
		plannedCapitalWithdrawalYear: null,
		lockPeriodYears: lock,
	});
	if (pillar3a.blockedReason !== null || lpp.singleBuyback === null) throw new Error("Exemple 1 : calcul refusé.");
	const single = lpp.singleBuyback;
	const figures = (deducted: number, saving: number, components: { cantonalTax: number; municipalTax: number; federalTax: number }) => ({
		deducted,
		cantonalTax: components.cantonalTax,
		municipalTax: components.municipalTax,
		federalTax: components.federalTax,
		totalSaving: saving,
		netCost: deducted - saving,
	});
	return {
		amount,
		pillar3a: figures(pillar3a.deduction, pillar3a.taxSaving, pillar3a.componentSavings),
		lpp: figures(single.amount, single.taxSaving, single.componentSavings),
	};
})();

/** Exemple 2 : un gros rachat, en une fois ou en tranches égales sur des années successives (A3). */
const example2 = (() => {
	const input = INPUTS.example2;
	const taxInput: TaxInput = {
		taxYear: YEAR,
		canton: input.canton,
		municipalityOfsId: ofsId(input.municipality, input.canton),
		maritalStatus: "married",
		children: input.children,
		childrenAges: [],
		denomination: "none",
		cantonalTaxableIncome: input.cantonalTaxableIncome,
		federalTaxableIncome: input.federalTaxableIncome,
		taxableWealth: 0,
	};
	const result = computeLppBuyback({
		taxInput,
		scales: getTaxScales(taxInput),
		buybackPotential: input.buybackPotential,
		amount: input.amount,
		unrepaidHomeOwnershipWithdrawal: false,
		plannedCapitalWithdrawalYear: null,
		lockPeriodYears: lock,
	});
	const scenario = result.scenarios.find((entry) => entry.trancheCount === input.tranches);
	if (result.singleBuyback === null || scenario === undefined) throw new Error("Exemple 2 : calcul refusé.");
	// Le texte dit « de plus » : un échelonnement qui ferait économiser moins arrête la construction
	if (scenario.differenceFromSingleBuyback <= 0) throw new Error("Exemple 2 : l'échelonnement n'économise pas davantage.");
	const single = result.singleBuyback;
	return {
		single: {
			year: single.year,
			cantonalTax: single.componentSavings.cantonalTax,
			municipalTax: single.componentSavings.municipalTax,
			federalTax: single.componentSavings.federalTax,
			totalSaving: single.taxSaving,
		},
		tranches: scenario.tranches.map((tranche) => ({ year: tranche.year, amount: tranche.amount, saving: tranche.taxSaving })),
		spreadSaving: scenario.totalSaving,
		difference: scenario.differenceFromSingleBuyback,
		lockCalendar: result.lockCalendar
			.filter((entry) => scenario.tranches.some((tranche) => tranche.year === entry.buybackYear))
			.map((entry) => ({ buybackYear: entry.buybackYear, lockEndsYear: entry.lockEndsYear, compatibleFrom: entry.lockEndsYear + 1 })),
	};
})();

// Plafonds et délai, 2026

/** Petite cotisation 2026 : [7’258]. */
export const smallCap2026 = chf(smallCap.value);
/** Grande cotisation 2026 : [36’288]. */
export const largeCap2026 = chf(largeCap.value);
/** Taux de la grande cotisation : [20 %]. */
export const largeCapRate2026 = formatPercent(largeRate.value);
/** Délai de blocage après un rachat, en années : [3]. */
export const lockYears = String(lock.value);
/** Première année de lacune 3a rachetable : [2025]. */
export const firstGapYear = String(firstGap);
/** Premier rachat 3a possible, l'année qui suit : [2026]. */
export const firstBuybackYear = String(firstGap + 1);

// Exemple 1

export const example1Municipality = INPUTS.example1.municipality;
export const example1CantonalIncome = chf(INPUTS.example1.cantonalTaxableIncome);
export const example1FederalIncome = chf(INPUTS.example1.federalTaxableIncome);
export const example1Potential = chf(INPUTS.example1.buybackPotential);
export const example1Amount = chf(example1.amount);
export const example1Pillar3aCantonal = chf(example1.pillar3a.cantonalTax);
export const example1Pillar3aMunicipal = chf(example1.pillar3a.municipalTax);
export const example1Pillar3aFederal = chf(example1.pillar3a.federalTax);
export const example1Pillar3aTotal = chf(example1.pillar3a.totalSaving);
export const example1Pillar3aNetCost = chf(example1.pillar3a.netCost);
export const example1LppCantonal = chf(example1.lpp.cantonalTax);
export const example1LppMunicipal = chf(example1.lpp.municipalTax);
export const example1LppFederal = chf(example1.lpp.federalTax);
export const example1LppTotal = chf(example1.lpp.totalSaving);
export const example1LppNetCost = chf(example1.lpp.netCost);
/** Part de l'économie dans le montant versé (A3, égale à celle d'A2) : [30 %]. */
export const example1Share = share(example1.lpp.totalSaving, example1.lpp.deducted);

// Exemple 2

export const example2Municipality = INPUTS.example2.municipality;
export const example2Children = String(INPUTS.example2.children);
export const example2CantonalIncome = chf(INPUTS.example2.cantonalTaxableIncome);
export const example2FederalIncome = chf(INPUTS.example2.federalTaxableIncome);
export const example2Potential = chf(INPUTS.example2.buybackPotential);
export const example2Amount = chf(INPUTS.example2.amount);
export const example2TrancheCount = String(INPUTS.example2.tranches);
export const example2Year = String(example2.single.year);
export const example2LastTrancheYear = String(example2.tranches.at(-1)!.year);
export const example2SingleCantonal = chf(example2.single.cantonalTax);
export const example2SingleMunicipal = chf(example2.single.municipalTax);
export const example2SingleFederal = chf(example2.single.federalTax);
export const example2SingleSaving = chf(example2.single.totalSaving);
/** Part de l'économie dans le montant racheté, en une fois : [32 %]. */
export const example2SingleShare = share(example2.single.totalSaving, INPUTS.example2.amount);
/** « 15’000 + 15’000 + 15’000 », comme le tableau d'A3. */
export const example2Tranches = example2.tranches.map((tranche) => chf(tranche.amount)).join(" + ");
/** Montant et économie d'une tranche : les tranches sont égales, l'économie aussi (revenu et barèmes constants). */
export const example2TrancheAmount = chf(example2.tranches[0]!.amount);
export const example2TrancheSaving = chf(example2.tranches[0]!.saving);
export const example2SpreadSaving = chf(example2.spreadSaving);
/** Part de l'économie dans le montant racheté, en tranches : [35 %]. */
export const example2SpreadShare = share(example2.spreadSaving, INPUTS.example2.amount);
export const example2Difference = signed(example2.difference);
/** Écart, sans signe, pour la phrase « … francs de plus » : [1’314]. */
export const example2DifferenceAmount = chf(example2.difference);
/** Calendrier du délai de blocage, une ligne par tranche. */
const calendarRow = (index: number) => example2.lockCalendar[index]!;
export const example2LockYear1 = String(calendarRow(0).buybackYear);
export const example2LockEnds1 = String(calendarRow(0).lockEndsYear);
export const example2CompatibleFrom1 = String(calendarRow(0).compatibleFrom);
export const example2LockYear2 = String(calendarRow(1).buybackYear);
export const example2LockEnds2 = String(calendarRow(1).lockEndsYear);
export const example2CompatibleFrom2 = String(calendarRow(1).compatibleFrom);
export const example2LockYear3 = String(calendarRow(2).buybackYear);
export const example2LockEnds3 = String(calendarRow(2).lockEndsYear);
export const example2CompatibleFrom3 = String(calendarRow(2).compatibleFrom);

// Libellés d'A3, repris tels quels : tableaux de l'échelonnement et du délai, hypothèse du délai

const { scenarios, calendar } = lppBuybackTexts;
export const scenarioColumn = scenarios.columns.scenario;
export const tranchesColumn = scenarios.columns.tranches;
export const totalColumn = scenarios.columns.total;
export const differenceColumn = scenarios.columns.difference;
export const singleLabel = scenarios.single;
export const spreadLabel = scenarios.spread.replace("{n}", String(INPUTS.example2.tranches));
export const buybackYearColumn = calendar.columns.buybackYear;
export const lockEndsColumn = calendar.columns.lockEnds;
export const compatibleFromColumn = calendar.columns.compatibleFrom;
/** Hypothèse du délai d'A3 : « Le calcul raisonne en années civiles. … si l'écart est de 3 ans, vérifiez la date exacte auprès de votre caisse. » */
export const lockAssumption = typeset(`${LOCK_PERIOD_ASSUMPTION_START}${lock.value}${LOCK_PERIOD_ASSUMPTION_END}`);

/** Valeurs numériques, pour les tests. */
export const numbers = { year: YEAR, example1, example2 } as const;
