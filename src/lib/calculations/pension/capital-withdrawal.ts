/**
 * Retrait en capital de la prévoyance (A4) : impôt sur les prestations en
 * capital du 2e pilier et du pilier 3a, et échelonnement des retraits.
 *
 * Fonction pure : barèmes, coefficients, règles de dérivation et bornes LPP
 * arrivent par `scales` (R2), assemblé par `getCapitalWithdrawalScales`
 * (src/data/capital-withdrawal-scales.ts). Le moteur ne teste jamais le code du
 * canton : le modèle de l'impôt cantonal (barème propre, fraction du barème du
 * revenu, taux d'une rente équivalente) et les coefficients qui s'y appliquent
 * sont des données.
 *
 * Règles (chacune citée dans la trace, ou marquée « méthode ») :
 * - imposition séparée, impôt annuel entier (art. 38 al. 1 et 1bis LIFD, art. 11 al. 3 LHID) ;
 * - prestations d'une même année additionnées (loi cantonale quand elle le dit, méthode ailleurs) ;
 * - IFD au cinquième du barème de l'art. 36 al. 1 (art. 38 al. 2 LIFD), sans déduction sociale (al. 3) ;
 * - une tranche 3a, un compte entier (circulaire AFC n° 18a, ch. 6.2.a) ;
 * - capital LPP en trois étapes au plus, premier retrait partiel d'au moins 20 % (art. 13a al. 2 et 3 LPP).
 *
 * v1 : personnes seules sans enfant. Une valeur encore à relever (R3) fait lever
 * `MissingTaxDataError` avec la liste complète, jamais un résultat supposé.
 */
import type { BreakdownLine } from "../../utils/breakdown";
import { formatNumber } from "../../utils/format-number";
import {
	assertTaxCoverage,
	evaluateDeflatedScale,
	evaluateFederalScale,
	evaluateScale,
	MissingTaxDataError,
	OutOfScopeError,
	roundToNearest,
	type MissingItem,
	type ScaleTable,
	type Sourced,
	type SourcedOrPending,
	type StepwiseDeflation,
	type TaxInput,
	type TaxScales,
} from "../tax";
import * as labels from "./capital-withdrawal-labels";

/** Nombres d'années civiles comparés. */
export const SCENARIO_TRANCHE_COUNTS = [1, 2, 3, 4] as const;
/** Méthode : premier pas de la répartition du capital LPP entre ses étapes, 1/50 du capital. */
const LPP_FIRST_STEP_DIVISOR = 50;
/** Méthode : déplacements au plus par taille de pas. */
const LPP_MOVES_PER_STEP = 200;
/** Méthode : placements des comptes 3a et des étapes LPP repris pour la répartition fine. */
const REFINED_CANDIDATES = 5;
/** Méthode : au-delà, la comparaison de tous les calendriers devient trop coûteuse. */
export const MAX_PILLAR_3A_ACCOUNTS = 5;

// --- Entrées ------------------------------------------------------------------------

export type Pillar = "lpp" | "pillar3a";

/** Une prestation en capital : le capital LPP d'une étape, ou un compte 3a entier. */
export type CapitalWithdrawalEntry = { pillar: Pillar; amount: number; year: number };

export type Sex = "male" | "female";

export type CapitalWithdrawalInput = {
	/** Année des barèmes, appliqués à toutes les années du calendrier. */
	taxYear: number;
	canton: TaxInput["canton"];
	municipalityOfsId: number;
	maritalStatus: TaxInput["maritalStatus"];
	children: number;
	denomination: TaxInput["denomination"];
	/** Le calendrier envisagé : montants en francs entiers, années civiles. */
	withdrawals: CapitalWithdrawalEntry[];
	/**
	 * Canton qui convertit le capital en rente (Valais) : sexe, et âge révolu
	 * `age` au versement de l'année `ageYear`.
	 */
	annuityProfile?: { sex: Sex; age: number; ageYear: number };
};

export type CapitalWithdrawalOptions = {
	/** Impôt minimal de l'IFD (art. 36 al. 3 LIFD) appliqué au capital ; non par défaut. */
	applyFederalMinimumLeviedTax?: boolean;
	/**
	 * Barème communal propre (Valais) : la borne du taux cantonal s'applique-t-elle
	 * au taux communal de base ? Sans réponse, le calcul est refusé (R3).
	 */
	communalRateBounds?: "sameAsCantonal" | "none";
};

// --- Barèmes et règles reçus en argument --------------------------------------------

/** Rente viagère annuelle pour `capitalAmount` CHF de capital, par âge révolu et par sexe. */
export type AnnuityConversion = { capitalAmount: number; rows: { age: number; male: number; female: number }[] };

/** Comment le canton calcule l'impôt de base sur le capital. */
export type CapitalTaxModel =
	| {
			/** Barème propre aux prestations en capital (Fribourg, Jura). */
			type: "ownScale";
			tables: ScaleTable[];
	  }
	| {
			/** Fraction de l'impôt du barème du revenu, avec un taux minimal éventuel (Vaud, Genève, Neuchâtel). */
			type: "incomeScaleFraction";
			factor: Sourced<number>;
			minimumRatePercent: Sourced<number> | null;
	  }
	| {
			/** Taux d'une prestation périodique équivalente, borné (Valais). */
			type: "periodicBenefitRate";
			minimumRatePercent: Sourced<number>;
			maximumRatePercent: Sourced<number>;
			conversion: Sourced<AnnuityConversion>;
	  };

/** Coefficients appliqués à l'impôt de base sur le capital : `true`, celui du revenu s'applique. */
export type CapitalWithdrawalMultipliers = {
	cantonal: SourcedOrPending<boolean>;
	communal: SourcedOrPending<boolean>;
	church: SourcedOrPending<boolean>;
	/** `null` : le canton n'a pas de réduction de l'impôt de base. */
	baseTaxReduction: SourcedOrPending<boolean> | null;
};

export type CapitalWithdrawalScales = {
	/** Barèmes du revenu, coefficients, modèle communal, IFD et couverture (src/data/tax-scales.ts). */
	tax: TaxScales;
	model: CapitalTaxModel;
	multipliers: CapitalWithdrawalMultipliers;
	/** Total de l'année exonéré sous `exemptBelow` ; `null` si la loi ne le prévoit pas. */
	exemption: Sourced<{ exemptBelow: number }> | null;
	/** Loi cantonale qui additionne les prestations d'une même année ; `null` : méthode. */
	aggregation: Sourced<"calendarYear"> | null;
	/** Part des barèmes de l'art. 36 LIFD (art. 38 al. 2 LIFD). */
	federalScaleFactor: Sourced<number>;
	lpp: { maximumSteps: Sourced<number>; minimumFirstPartialPercent: Sourced<number> };
	/** Sources des règles sans valeur chiffrée, citées dans la trace. */
	ruleSources: { separateTaxation: string; pillar3aAccount: string; withdrawalWindow: string };
};

// --- Résultats ----------------------------------------------------------------------

/** L'impôt d'une année civile, chaque impôt arrondi au franc. */
export type CapitalWithdrawalYear = {
	year: number;
	withdrawals: CapitalWithdrawalEntry[];
	total: number;
	federalTax: number;
	cantonalTax: number;
	municipalTax: number;
	churchTax: number;
	totalTax: number;
};

export type CapitalWithdrawalCalendar = { years: CapitalWithdrawalYear[]; totalTax: number };

export type CapitalWithdrawalScenario =
	| ({ trancheCount: number; feasible: true } & CapitalWithdrawalCalendar)
	| { trancheCount: number; feasible: false; reason: string };

export type FeasibleScenario = Extract<CapitalWithdrawalScenario, { feasible: true }>;

export type CapitalWithdrawalRefusal = {
	reason: "tooManyLppSteps" | "firstLppWithdrawalTooSmall";
	/** Motif en français, avec son article. */
	message: string;
};

export type CapitalWithdrawalResult = {
	/** Vide si le calendrier envisagé respecte l'art. 13a LPP ; sinon, `plan` vaut `null`. */
	refusals: CapitalWithdrawalRefusal[];
	plan: CapitalWithdrawalCalendar | null;
	/** Un scénario par nombre d'années de `SCENARIO_TRANCHE_COUNTS`. */
	scenarios: CapitalWithdrawalScenario[];
	/** Le scénario le moins imposé ; à égalité, celui qui a le moins d'années. */
	optimal: FeasibleScenario;
	/** Retrait en une fois moins le scénario optimal. */
	staggeringSaving: number;
	/** Calendrier envisagé moins le scénario optimal ; `null` si le calendrier est refusé. */
	planExtraTax: number | null;
	breakdown: BreakdownLine[];
};

// --- Outils -------------------------------------------------------------------------

const fmt = (value: number): string => formatNumber(value, 4);
const fmtChf = (value: number): string => formatNumber(value, 2);

type Line = (entry: BreakdownLine) => void;

const isPending = <T>(candidate: SourcedOrPending<T>): candidate is Extract<SourcedOrPending<T>, { pending: string }> =>
	"pending" in candidate;

const singleTable = (tables: ScaleTable[], what: string): ScaleTable => {
	const matching = tables.filter((table) => table.households.includes("single"));
	if (matching.length !== 1) throw new Error(`${what} : ${matching.length} table(s) pour une personne seule.`);
	return matching[0]!;
};

/** Taux moyen, en %, d'un barème lu à `amount`, après déflation par étapes s'il y a lieu. */
const rateOn = (
	table: ScaleTable,
	amount: number,
	deflation: Sourced<StepwiseDeflation> | undefined,
): { ratePercent: number; formula: string } => {
	if (amount <= 0) return { ratePercent: 0, formula: "rente nulle : taux nul" };
	if (deflation) {
		const deflated = evaluateDeflatedScale(table, amount, deflation.value);
		return { ratePercent: deflated.ratePercent, formula: `taux lu au revenu déflaté ${fmt(deflated.rateIncome)}, ${fmt(deflated.ratePercent)} %` };
	}
	const scale = evaluateScale(table, amount);
	return { ratePercent: (scale.tax / amount) * 100, formula: `[${scale.formula}] / ${fmt(amount)}` };
};

const clamp = (value: number, minimum: number, maximum: number): number => Math.min(maximum, Math.max(minimum, value));

const assertWholeFrancs = (name: string, value: number): void => {
	if (!Number.isInteger(value) || value <= 0) throw new Error(`${name} invalide : ${value} (francs entiers positifs attendus).`);
};

// --- L'impôt d'une année ------------------------------------------------------------

type Context = {
	input: CapitalWithdrawalInput;
	scales: CapitalWithdrawalScales;
	options: CapitalWithdrawalOptions;
	need: <T>(item: SourcedOrPending<T>, label: string) => Sourced<T> | undefined;
};

type YearAmounts = Omit<CapitalWithdrawalYear, "year" | "withdrawals" | "total">;

const ZERO: YearAmounts = { federalTax: 0, cantonalTax: 0, municipalTax: 0, churchTax: 0, totalTax: 0 };

/** Taux de base du Valais : rente équivalente au capital, taux du barème lu sur la rente. */
const annuityRateIncome = (
	ctx: Context,
	model: Extract<CapitalTaxModel, { type: "periodicBenefitRate" }>,
	year: number,
	total: number,
	line: Line,
): number | undefined => {
	const profile = ctx.input.annuityProfile;
	if (profile === undefined) {
		throw new OutOfScopeError("Âge et sexe requis : l'impôt sur le capital se calcule au taux d'une rente équivalente.");
	}
	const age = profile.age + (year - profile.ageYear);
	const row = model.conversion.value.rows.find((candidate) => candidate.age === age);
	if (row === undefined) throw new OutOfScopeError(`Âge ${age} absent du tableau de conversion en rentes.`);
	line({
		label: labels.ANNUITY_AGE,
		operands: { age: profile.age, ageYear: profile.ageYear, year },
		formula: `${profile.age} + (${year} − ${profile.ageYear})`,
		value: age,
		unit: "ans",
		sourceId: null,
		assumption: labels.ANNUITY_AGE_ASSUMPTION,
	});
	const factor = row[profile.sex];
	const { capitalAmount } = model.conversion.value;
	line({
		label: labels.ANNUITY_FACTOR,
		operands: { age, capitalAmount },
		formula: `${profile.sex === "male" ? "homme" : "femme"}, ${age} ans, pour ${fmt(capitalAmount)} CHF de capital`,
		value: factor,
		unit: "CHF",
		sourceId: model.conversion.sourceId,
	});
	const annuity = (total * factor) / capitalAmount;
	line({
		label: labels.EQUIVALENT_ANNUITY,
		operands: { total, factor, capitalAmount },
		formula: `${fmt(total)} × ${fmt(factor)} / ${fmt(capitalAmount)}`,
		value: annuity,
		unit: "CHF",
		sourceId: model.conversion.sourceId,
	});
	const step = ctx.need(ctx.scales.tax.taxBaseRounding.income, "Arrondi du revenu déterminant pour le taux");
	if (!step) return undefined;
	const rateIncome = Math.floor(annuity / step.value) * step.value;
	line({
		label: labels.RATE_DETERMINING_ANNUITY,
		operands: { annuity, step: step.value },
		formula: `${fmt(annuity)} arrondi à ${fmt(step.value)} CHF inférieurs`,
		value: rateIncome,
		unit: "CHF",
		sourceId: step.sourceId,
	});
	return rateIncome;
};

/** Impôt cantonal de base sur le total de l'année, et rente déterminante s'il y en a une. */
const cantonalBaseTax = (
	ctx: Context,
	year: number,
	total: number,
	line: Line,
): { base: number; rateIncome: number | null } | undefined => {
	const { scales } = ctx;
	const exemption = scales.exemption;
	if (exemption && total < exemption.value.exemptBelow) {
		line({
			label: labels.EXEMPT_TOTAL,
			operands: { total, exemptBelow: exemption.value.exemptBelow },
			formula: `${fmt(total)} < ${fmt(exemption.value.exemptBelow)} : impôt cantonal de base nul`,
			value: 0,
			unit: "CHF",
			sourceId: exemption.sourceId,
		});
		return { base: 0, rateIncome: null };
	}
	const model = scales.model;
	switch (model.type) {
		case "ownScale": {
			const table = singleTable(model.tables, labels.CANTONAL_CAPITAL_SCALE);
			const scale = evaluateScale(table, total);
			line({ label: labels.CANTONAL_CAPITAL_SCALE, operands: { total }, formula: scale.formula, value: scale.tax, unit: "CHF", sourceId: table.sourceId });
			return { base: scale.tax, rateIncome: null };
		}
		case "incomeScaleFraction": {
			const tax = scales.tax;
			if (tax.canton.incomeScaleIndexation !== null) throw new Error("Fraction d'un barème indexé : non prévue.");
			const family = tax.familyModel;
			if (!("pending" in family)) {
				if (family.type === "familyQuotient") {
					const coefficients = ctx.need(family.coefficients, "Coefficients du quotient familial");
					if (!coefficients) return undefined;
					if (coefficients.value.single !== 1) throw new OutOfScopeError("Quotient familial d'une personne seule différent de 1 : non prévu.");
				} else if (family.type === "divisorOnIncomeAndWealth") {
					const households = ctx.need(family.households, "Ménages au revenu divisé");
					if (!households) return undefined;
					if (households.value.includes("single")) throw new OutOfScopeError("Diviseur familial d'une personne seule : non prévu.");
				}
			}
			const table = singleTable(tax.canton.income, labels.INCOME_SCALE_ON_CAPITAL);
			const scale = evaluateScale(table, total);
			line({
				label: labels.INCOME_SCALE_ON_CAPITAL,
				operands: { total },
				formula: scale.formula,
				value: scale.tax,
				unit: "CHF",
				sourceId: table.sourceId,
				assumption: labels.INCOME_SCALE_ON_CAPITAL_ASSUMPTION,
			});
			const fraction = scale.tax * model.factor.value;
			line({
				label: labels.BASE_TAX_FRACTION,
				operands: { scaleTax: scale.tax, factor: model.factor.value },
				formula: `${fmt(scale.tax)} × ${fmt(model.factor.value)}`,
				value: fraction,
				unit: "CHF",
				sourceId: model.factor.sourceId,
			});
			const minimum = model.minimumRatePercent;
			if (minimum && fraction < (total * minimum.value) / 100) {
				const floor = (total * minimum.value) / 100;
				line({
					label: labels.BASE_TAX_MINIMUM_RATE,
					operands: { total, minimumRatePercent: minimum.value, fraction },
					formula: `${fmt(fraction)} < ${fmt(total)} × ${fmt(minimum.value)} % : ${fmt(floor)}`,
					value: floor,
					unit: "CHF",
					sourceId: minimum.sourceId,
				});
				return { base: floor, rateIncome: null };
			}
			return { base: fraction, rateIncome: null };
		}
		case "periodicBenefitRate": {
			const rateIncome = annuityRateIncome(ctx, model, year, total, line);
			const deflation =
				scales.tax.canton.incomeScaleIndexation === null
					? undefined
					: ctx.need(scales.tax.canton.incomeScaleIndexation, "Indexation du barème cantonal du revenu");
			if (rateIncome === undefined || (scales.tax.canton.incomeScaleIndexation !== null && !deflation)) return undefined;
			const table = singleTable(scales.tax.canton.income, labels.CANTONAL_RATE_ON_ANNUITY);
			const rate = rateOn(table, rateIncome, deflation);
			line({ label: labels.CANTONAL_RATE_ON_ANNUITY, operands: { rateIncome }, formula: rate.formula, value: rate.ratePercent, unit: "%", sourceId: table.sourceId });
			const bounded = clamp(rate.ratePercent, model.minimumRatePercent.value, model.maximumRatePercent.value);
			line({
				label: labels.BOUNDED_RATE,
				operands: { ratePercent: rate.ratePercent, minimumRatePercent: model.minimumRatePercent.value, maximumRatePercent: model.maximumRatePercent.value },
				formula: `${fmt(rate.ratePercent)} % borné entre ${fmt(model.minimumRatePercent.value)} % et ${fmt(model.maximumRatePercent.value)} %`,
				value: bounded,
				unit: "%",
				sourceId: model.maximumRatePercent.sourceId,
			});
			const rounding = scales.tax.canton.incomeTaxRounding;
			const raw = (total * bounded) / 100;
			const base = rounding ? roundToNearest(raw, rounding.value) : raw;
			line({
				label: labels.BASE_TAX_AT_RATE,
				operands: { total, ratePercent: bounded },
				formula: `${fmt(total)} × ${fmt(bounded)} %${rounding ? `, arrondi à ${fmt(rounding.value)} CHF le plus proche` : ""}`,
				value: base,
				unit: "CHF",
				sourceId: rounding?.sourceId ?? model.maximumRatePercent.sourceId,
			});
			return { base, rateIncome };
		}
	}
};

/** Impôt cantonal : coefficient annuel et réduction de l'impôt de base, si les données les appliquent au capital. */
const cantonalTaxOf = (ctx: Context, base: number, line: Line): number | undefined => {
	const { scales } = ctx;
	const applies = ctx.need(scales.multipliers.cantonal, "Coefficient cantonal sur l'impôt sur le capital");
	const reductionApplies =
		scales.multipliers.baseTaxReduction === null
			? undefined
			: ctx.need(scales.multipliers.baseTaxReduction, "Réduction de l'impôt de base sur l'impôt sur le capital");
	if (!applies || (scales.multipliers.baseTaxReduction !== null && !reductionApplies)) return undefined;
	if (!applies.value) {
		line({ label: labels.CANTONAL_TAX, operands: { base }, formula: fmt(base), value: base, unit: "CHF", sourceId: applies.sourceId, assumption: labels.CANTONAL_TAX_FIXED_RATES });
		return base;
	}
	const canton = scales.tax.canton;
	let reductionFactor = 1;
	if (reductionApplies?.value) {
		if (canton.baseTaxReduction === null) throw new Error("Réduction de l'impôt de base appliquée au capital sans réduction relevée.");
		const reduction = ctx.need(canton.baseTaxReduction, "Réduction de l'impôt de base");
		if (!reduction) return undefined;
		if (reduction.value.appliesTo.includes("income")) reductionFactor = 1 - reduction.value.ratePercent / 100;
	}
	const unreduced = canton.unreducedMultiplier === null ? undefined : ctx.need(canton.unreducedMultiplier, "Part du coefficient cantonal hors réduction");
	if (canton.unreducedMultiplier !== null && !unreduced) return undefined;
	const multiplier = canton.multiplier.income.value;
	const unreducedPercent = unreduced?.value.income ?? 0;
	const cantonalTax = (base * reductionFactor * multiplier) / 100 + (base * unreducedPercent) / 100;
	line({
		label: labels.CANTONAL_TAX,
		operands: { base, reductionFactor, multiplierPercent: multiplier, unreducedMultiplierPercent: unreducedPercent },
		formula: `${fmt(base)} × ${fmt(reductionFactor)} × ${fmt(multiplier)} %${unreduced ? ` + ${fmt(base)} × ${fmt(unreducedPercent)} %` : ""}`,
		value: cantonalTax,
		unit: "CHF",
		sourceId: canton.multiplier.income.sourceId,
	});
	return cantonalTax;
};

const municipalTaxOf = (
	ctx: Context,
	total: number,
	base: number,
	rateIncome: number | null,
	line: Line,
): number | undefined => {
	const { scales } = ctx;
	const applies = ctx.need(scales.multipliers.communal, "Coefficient communal sur l'impôt sur le capital");
	if (!applies) return undefined;
	if (!applies.value) {
		line({ label: labels.MUNICIPAL_TAX, operands: {}, formula: labels.MUNICIPAL_TAX_NOT_LEVIED, value: 0, unit: "CHF", sourceId: applies.sourceId });
		return 0;
	}
	const municipality = scales.tax.municipality;
	if (municipality.model === "multiplierOnBaseTax") {
		const multiplier = municipality.multiplier.income;
		const municipalTax = (base * multiplier.value) / 100;
		line({
			label: labels.MUNICIPAL_TAX,
			operands: { base, multiplierPercent: multiplier.value },
			formula: `${fmt(base)} × ${fmt(multiplier.value)} %`,
			value: municipalTax,
			unit: "CHF",
			sourceId: multiplier.sourceId,
		});
		return municipalTax;
	}
	// Barème communal propre : taux lu sur la même rente que le taux cantonal (« sur les mêmes bases »)
	const model = scales.model;
	if (model.type !== "periodicBenefitRate") throw new Error("Barème communal propre sans rente équivalente : non prévu.");
	if (ctx.options.communalRateBounds === undefined) {
		ctx.need(
			{ pending: "Borne du taux cantonal appliquée ou non au taux communal de base : à trancher par les relevés AFC de Sion.", sourceId: null },
			"Borne du taux communal de base",
		);
		return undefined;
	}
	if (rateIncome === null) return 0; // total exonéré : aucun impôt de base
	const deflation =
		municipality.incomeScaleIndexation === null ? undefined : ctx.need(municipality.incomeScaleIndexation, "Indexation du barème communal");
	if (municipality.incomeScaleIndexation !== null && !deflation) return undefined;
	const table = singleTable(municipality.income, labels.COMMUNAL_RATE_ON_ANNUITY);
	const rate = rateOn(table, rateIncome, deflation);
	line({ label: labels.COMMUNAL_RATE_ON_ANNUITY, operands: { rateIncome }, formula: rate.formula, value: rate.ratePercent, unit: "%", sourceId: table.sourceId });
	const bounded =
		ctx.options.communalRateBounds === "sameAsCantonal"
			? clamp(rate.ratePercent, model.minimumRatePercent.value, model.maximumRatePercent.value)
			: rate.ratePercent;
	line({
		label: ctx.options.communalRateBounds === "sameAsCantonal" ? labels.BOUNDED_RATE : labels.UNBOUNDED_COMMUNAL_RATE,
		operands: { ratePercent: rate.ratePercent },
		formula:
			ctx.options.communalRateBounds === "sameAsCantonal"
				? `${fmt(rate.ratePercent)} % borné entre ${fmt(model.minimumRatePercent.value)} % et ${fmt(model.maximumRatePercent.value)} %`
				: `${fmt(rate.ratePercent)} %`,
		value: bounded,
		unit: "%",
		sourceId: ctx.options.communalRateBounds === "sameAsCantonal" ? model.maximumRatePercent.sourceId : table.sourceId,
		assumption:
			ctx.options.communalRateBounds === "sameAsCantonal" ? labels.BOUNDED_COMMUNAL_RATE_ASSUMPTION : labels.UNBOUNDED_COMMUNAL_RATE_ASSUMPTION,
	});
	const rounding = scales.tax.canton.incomeTaxRounding;
	const round = (value: number): number => (rounding ? roundToNearest(value, rounding.value) : value);
	const communalBase = round((total * bounded) / 100);
	line({
		label: labels.COMMUNAL_BASE_TAX_AT_RATE,
		operands: { total, ratePercent: bounded },
		formula: `${fmt(total)} × ${fmt(bounded)} %${rounding ? `, arrondi à ${fmt(rounding.value)} CHF le plus proche` : ""}`,
		value: communalBase,
		unit: "CHF",
		sourceId: rounding?.sourceId ?? table.sourceId,
	});
	const multiplier = municipality.multiplier.income;
	const municipalTax = round((communalBase * multiplier.value) / 100);
	line({
		label: labels.MUNICIPAL_TAX,
		operands: { communalBase, multiplierPercent: multiplier.value },
		formula: `${fmt(communalBase)} × ${fmt(multiplier.value)} %`,
		value: municipalTax,
		unit: "CHF",
		sourceId: multiplier.sourceId,
	});
	return municipalTax;
};

const churchTaxOf = (ctx: Context, base: number, line: Line): number | undefined => {
	const denomination = ctx.input.denomination;
	if (denomination === "none") return 0;
	const applies = ctx.need(ctx.scales.multipliers.church, "Coefficient paroissial sur l'impôt sur le capital");
	if (!applies) return undefined;
	if (!applies.value) {
		line({ label: labels.CHURCH_TAX, operands: {}, formula: labels.CHURCH_TAX_NOT_LEVIED, value: 0, unit: "CHF", sourceId: applies.sourceId });
		return 0;
	}
	const multiplier = ctx.scales.tax.church.income[denomination];
	const churchTax = (base * multiplier.value) / 100;
	line({
		label: labels.CHURCH_TAX,
		operands: { base, multiplierPercent: multiplier.value },
		formula: `${fmt(base)} × ${fmt(multiplier.value)} %`,
		value: churchTax,
		unit: "CHF",
		sourceId: multiplier.sourceId,
	});
	return churchTax;
};

const federalTaxOf = (ctx: Context, total: number, line: Line): number | undefined => {
	const federal = ctx.scales.tax.federal;
	let tables: Exclude<TaxScales["federal"]["income"], { pending: string }> | undefined;
	if ("pending" in federal.income) ctx.need(federal.income, "Barème de l'IFD");
	else tables = federal.income;
	const maximumRate = ctx.need(federal.maximumRatePercent, "Taux maximal de l'IFD");
	const rounding = ctx.need(federal.taxRoundingToNearest, "Arrondi de l'IFD");
	const minimum = ctx.options.applyFederalMinimumLeviedTax ? ctx.need(federal.minimumLeviedTax, "Montant minimal perçu de l'IFD") : undefined;
	if (!tables || !maximumRate || !rounding || (ctx.options.applyFederalMinimumLeviedTax && !minimum)) return undefined;
	const matching = tables.filter((table) => table.appliesTo.includes("otherTaxpayer"));
	if (matching.length !== 1) throw new Error(`Barème IFD : ${matching.length} table(s) pour une personne seule.`);
	const table = matching[0]!;
	const scale = evaluateFederalScale(table, total, maximumRate.value);
	line({ label: labels.FEDERAL_SCALE, operands: { total }, formula: scale.formula, value: scale.tax, unit: "CHF", sourceId: table.sourceId });
	const factor = ctx.scales.federalScaleFactor;
	const fifth = scale.tax * factor.value;
	line({
		label: labels.FEDERAL_FIFTH,
		operands: { scaleTax: scale.tax, factor: factor.value },
		formula: `${fmt(scale.tax)} × ${fmt(factor.value)}`,
		value: fifth,
		unit: "CHF",
		sourceId: factor.sourceId,
		assumption: labels.FEDERAL_FIFTH_ASSUMPTION,
	});
	let federalTax = Math.round(fifth / rounding.value) * rounding.value;
	line({
		label: labels.FEDERAL_ROUNDED,
		operands: { federalTax: fifth, step: rounding.value },
		formula: `${fmt(fifth)} arrondi à ${fmt(rounding.value)} CHF le plus proche`,
		value: federalTax,
		unit: "CHF",
		sourceId: rounding.sourceId,
		assumption: labels.FEDERAL_ROUNDING_METHOD,
	});
	if (minimum && federalTax > 0 && federalTax < minimum.value) {
		line({
			label: labels.FEDERAL_MINIMUM_APPLIED,
			operands: { federalTax, minimumLeviedTax: minimum.value },
			formula: `${fmt(federalTax)} < ${fmt(minimum.value)} : montant non perçu`,
			value: 0,
			unit: "CHF",
			sourceId: minimum.sourceId,
			assumption: labels.FEDERAL_MINIMUM_OPTION,
		});
		federalTax = 0;
	}
	return federalTax;
};

/** Les quatre impôts d'une année sur le total `total`, chacun arrondi au franc. */
const yearTax = (ctx: Context, year: number, total: number, line: Line): YearAmounts | undefined => {
	// Chaque étape s'exécute même si une précédente manque : toutes les valeurs à relever sont recensées
	const cantonal = cantonalBaseTax(ctx, year, total, line);
	const base = cantonal?.base ?? 0;
	const cantonalTax = cantonalTaxOf(ctx, base, line);
	const municipalTax = municipalTaxOf(ctx, total, base, cantonal?.rateIncome ?? null, line);
	const churchTax = churchTaxOf(ctx, base, line);
	const federalTax = federalTaxOf(ctx, total, line);
	if (!cantonal || cantonalTax === undefined || municipalTax === undefined || churchTax === undefined || federalTax === undefined) {
		return undefined;
	}
	const rounded = {
		federalTax: Math.round(federalTax),
		cantonalTax: Math.round(cantonalTax),
		municipalTax: Math.round(municipalTax),
		churchTax: Math.round(churchTax),
	};
	const totalTax = rounded.federalTax + rounded.cantonalTax + rounded.municipalTax + rounded.churchTax;
	line({
		label: `${labels.YEAR_TOTAL} ${year}`,
		operands: rounded,
		formula: `${fmtChf(rounded.cantonalTax)} + ${fmtChf(rounded.municipalTax)} + ${fmtChf(rounded.churchTax)} + ${fmtChf(rounded.federalTax)}`,
		value: totalTax,
		unit: "CHF",
		sourceId: null,
		assumption: labels.YEAR_TOTAL_ASSUMPTION,
	});
	return { ...rounded, totalTax };
};

// --- Calendriers --------------------------------------------------------------------

const groupByYear = (withdrawals: CapitalWithdrawalEntry[]): Map<number, CapitalWithdrawalEntry[]> => {
	const byYear = new Map<number, CapitalWithdrawalEntry[]>();
	for (const entry of [...withdrawals].sort((a, b) => a.year - b.year)) {
		byYear.set(entry.year, [...(byYear.get(entry.year) ?? []), entry]);
	}
	return byYear;
};

/** Refus de l'art. 13a al. 2 et 3 LPP pour un calendrier donné. */
const lppRefusals = (withdrawals: CapitalWithdrawalEntry[], lpp: CapitalWithdrawalScales["lpp"]): CapitalWithdrawalRefusal[] => {
	const lppYears = groupByYear(withdrawals.filter((entry) => entry.pillar === "lpp"));
	const refusals: CapitalWithdrawalRefusal[] = [];
	if (lppYears.size > lpp.maximumSteps.value) {
		refusals.push({
			reason: "tooManyLppSteps",
			message: `Le capital LPP se retire en ${lpp.maximumSteps.value} étapes au plus, une étape regroupant les retraits d'une même année civile (art. 13a al. 2 LPP). Votre calendrier en prévoit ${lppYears.size}.`,
		});
	}
	if (lppYears.size > 1) {
		const lppTotal = withdrawals.filter((entry) => entry.pillar === "lpp").reduce((sum, entry) => sum + entry.amount, 0);
		const first = [...lppYears.values()][0]!.reduce((sum, entry) => sum + entry.amount, 0);
		const minimum = lpp.minimumFirstPartialPercent.value;
		if (first * 100 < lppTotal * minimum) {
			refusals.push({
				reason: "firstLppWithdrawalTooSmall",
				message: `Le premier retrait partiel du capital LPP représente au moins ${minimum} % du capital (art. 13a al. 3 LPP), sauf si le règlement de votre caisse admet moins. Le vôtre en représente ${formatNumber((first / lppTotal) * 100, 1)} %.`,
			});
		}
	}
	return refusals;
};

type Evaluator = (year: number, total: number) => YearAmounts;

/** Calendrier chiffré, chaque année avec ses prestations. */
const calendarOf = (withdrawals: CapitalWithdrawalEntry[], evaluate: Evaluator): CapitalWithdrawalCalendar => {
	const years = [...groupByYear(withdrawals)].map(([year, entries]) => {
		const total = entries.reduce((sum, entry) => sum + entry.amount, 0);
		return { year, withdrawals: entries, total, ...evaluate(year, total) };
	});
	return { years, totalTax: years.reduce((sum, year) => sum + year.totalTax, 0) };
};

/** Montant minimal de la première étape LPP, en francs entiers (art. 13a al. 3 LPP). */
const minimumFirstPart = (lppTotal: number, lpp: CapitalWithdrawalScales["lpp"]): number =>
	Math.ceil((lppTotal * lpp.minimumFirstPartialPercent.value) / 100);

/** Parts égales en francs entiers, la première relevée au minimum légal s'il le faut, la dernière absorbant le reste. */
const equalLppSplit = (lppTotal: number, count: number, minimumFirst: number): number[] => {
	if (count === 1) return [lppTotal];
	const first = Math.max(minimumFirst, Math.floor(lppTotal / count));
	const other = Math.floor((lppTotal - first) / (count - 1));
	const parts = [first, ...Array.from({ length: count - 1 }, () => other)];
	parts[count - 1] = lppTotal - parts.slice(0, -1).reduce((sum, part) => sum + part, 0);
	return parts;
};

/**
 * Meilleure répartition du capital LPP entre les années `lppYears` (croissantes),
 * les comptes 3a étant déjà placés : on part de parts égales, puis on déplace des
 * montants d'une année à l'autre tant que l'impôt baisse, par pas de 1/`LPP_FIRST_STEP_DIVISOR`
 * du capital, puis dix fois plus fins, jusqu'au franc. Méthode.
 */
const bestLppSplit = (
	lppTotal: number,
	lppYears: number[],
	baseByYear: Map<number, number>,
	minimumFirst: number,
	evaluate: Evaluator,
): number[] => {
	const parts = equalLppSplit(lppTotal, lppYears.length, minimumFirst);
	if (lppYears.length === 1) return parts;
	const minimum = lppYears.map((_, index) => (index === 0 ? minimumFirst : 1));
	const costAt = (index: number, amount: number): number =>
		evaluate(lppYears[index]!, (baseByYear.get(lppYears[index]!) ?? 0) + amount).totalTax;
	for (let step = Math.max(1, Math.floor(lppTotal / LPP_FIRST_STEP_DIVISOR)); ; step = Math.max(1, Math.floor(step / 10))) {
		for (let improved = true, guard = 0; improved && guard < LPP_MOVES_PER_STEP; guard++) {
			improved = false;
			for (let from = 0; from < parts.length; from++) {
				if (parts[from]! - step < minimum[from]!) continue;
				for (let to = 0; to < parts.length; to++) {
					if (to === from) continue;
					const change =
						costAt(from, parts[from]! - step) + costAt(to, parts[to]! + step) - costAt(from, parts[from]!) - costAt(to, parts[to]!);
					if (change < 0) {
						parts[from]! -= step;
						parts[to]! += step;
						improved = true;
					}
				}
			}
		}
		if (step === 1) break;
	}
	return parts;
};

type Candidate = { lppYears: number[]; assignment: number[]; baseByYear: Map<number, number>; quickTax: number };

/** Le calendrier le moins imposé sur `count` années civiles successives, ou le motif de son impossibilité. */
const bestScenario = (
	count: number,
	firstYear: number,
	lppTotal: number,
	accounts: number[],
	lpp: CapitalWithdrawalScales["lpp"],
	evaluate: Evaluator,
): CapitalWithdrawalScenario => {
	const maximumYears = accounts.length + (lppTotal > 0 ? lpp.maximumSteps.value : 0);
	if (count > maximumYears) {
		return {
			trancheCount: count,
			feasible: false,
			reason: `${count} années demandent au moins ${count} étapes : vous avez ${accounts.length} compte(s) 3a${lppTotal > 0 ? ` et un capital LPP retiré en ${lpp.maximumSteps.value} étapes au plus (art. 13a al. 2 LPP)` : ""}.`,
		};
	}
	const years = Array.from({ length: count }, (_, index) => firstYear + index);
	const minimumFirst = minimumFirstPart(lppTotal, lpp);
	const lppSubsets: number[][] = [];
	if (lppTotal > 0) {
		for (let mask = 1; mask < 1 << count; mask++) {
			const subset = years.filter((_, index) => mask & (1 << index));
			if (subset.length <= lpp.maximumSteps.value && (subset.length === 1 || minimumFirst + subset.length - 1 <= lppTotal)) {
				lppSubsets.push(subset);
			}
		}
	} else lppSubsets.push([]);

	const withdrawalsOf = (candidate: Candidate, parts: number[]): CapitalWithdrawalEntry[] => [
		...parts.map((amount, index) => ({ pillar: "lpp" as const, amount, year: candidate.lppYears[index]! })),
		...accounts.map((amount, index) => ({ pillar: "pillar3a" as const, amount, year: years[candidate.assignment[index]!]! })),
	];

	// 1. Tous les placements des comptes 3a et des étapes LPP, chiffrés avec des parts LPP égales
	const candidates: Candidate[] = [];
	const combinations = count ** accounts.length;
	for (let combination = 0; combination < combinations; combination++) {
		const assignment: number[] = [];
		for (let index = 0, rest = combination; index < accounts.length; index++, rest = Math.floor(rest / count)) assignment.push(rest % count);
		const baseByYear = new Map<number, number>();
		assignment.forEach((yearIndex, index) => baseByYear.set(years[yearIndex]!, (baseByYear.get(years[yearIndex]!) ?? 0) + accounts[index]!));
		for (const lppYears of lppSubsets) {
			if (!years.every((year) => baseByYear.has(year) || lppYears.includes(year))) continue;
			const candidate: Candidate = { lppYears, assignment, baseByYear, quickTax: 0 };
			const parts = lppTotal > 0 ? equalLppSplit(lppTotal, lppYears.length, minimumFirst) : [];
			candidate.quickTax = calendarOf(withdrawalsOf(candidate, parts), evaluate).totalTax;
			candidates.push(candidate);
		}
	}
	if (candidates.length === 0) {
		return { trancheCount: count, feasible: false, reason: `Aucun calendrier sur ${count} années ne respecte l'art. 13a LPP avec ces montants.` };
	}

	// 2. Répartition fine du capital LPP pour les meilleurs placements seulement
	candidates.sort((a, b) => a.quickTax - b.quickTax);
	let best: CapitalWithdrawalCalendar | null = null;
	for (const candidate of candidates.slice(0, REFINED_CANDIDATES)) {
		const parts = lppTotal > 0 ? bestLppSplit(lppTotal, candidate.lppYears, candidate.baseByYear, minimumFirst, evaluate) : [];
		const calendar = calendarOf(withdrawalsOf(candidate, parts), evaluate);
		if (best === null || calendar.totalTax < best.totalTax) best = calendar;
	}
	return { trancheCount: count, feasible: true, ...best! };
};

const describeCalendar = (calendar: CapitalWithdrawalCalendar): string =>
	calendar.years
		.map(
			(year) =>
				`${year.year} : ${year.withdrawals.map((entry) => `${entry.pillar === "lpp" ? "LPP" : "3a"} ${fmtChf(entry.amount)}`).join(" + ")}, impôt ${fmtChf(year.totalTax)}`,
		)
		.join(" ; ");

// --- Le calcul ----------------------------------------------------------------------

export function computeCapitalWithdrawal(
	input: CapitalWithdrawalInput,
	scales: CapitalWithdrawalScales,
	options: CapitalWithdrawalOptions = {},
): CapitalWithdrawalResult {
	if (input.maritalStatus !== "single" || input.children !== 0) throw new OutOfScopeError(labels.HOUSEHOLD_NOT_COVERED);
	assertTaxCoverage(
		{
			taxYear: input.taxYear,
			canton: input.canton,
			municipalityOfsId: input.municipalityOfsId,
			maritalStatus: input.maritalStatus,
			children: input.children,
			childrenAges: [],
			denomination: input.denomination,
			federalTaxableIncome: 0,
			cantonalTaxableIncome: 0,
			taxableWealth: 0,
		},
		scales.tax,
	);
	if (input.withdrawals.length === 0) throw new Error("Aucune prestation en capital.");
	for (const entry of input.withdrawals) {
		assertWholeFrancs("Montant", entry.amount);
		if (!Number.isInteger(entry.year)) throw new Error(`Année invalide : ${entry.year}.`);
	}
	const accounts = input.withdrawals.filter((entry) => entry.pillar === "pillar3a").map((entry) => entry.amount);
	if (accounts.length > MAX_PILLAR_3A_ACCOUNTS) {
		throw new OutOfScopeError(`Plus de ${MAX_PILLAR_3A_ACCOUNTS} comptes 3a : le calculateur ne compare pas tous les calendriers.`);
	}
	const lppTotal = input.withdrawals.filter((entry) => entry.pillar === "lpp").reduce((sum, entry) => sum + entry.amount, 0);
	const firstYear = Math.min(...input.withdrawals.map((entry) => entry.year));
	const capitalTotal = input.withdrawals.reduce((sum, entry) => sum + entry.amount, 0);

	// Valeurs à relever : recensées sur une année complète, avant tout chiffre (R3)
	const missing: MissingItem[] = [];
	const ctx: Context = {
		input,
		scales,
		options,
		need: <T>(item: SourcedOrPending<T>, label: string): Sourced<T> | undefined => {
			if (isPending(item)) {
				if (!missing.some((entry) => entry.label === label)) missing.push({ label, todo: item.pending, sourceId: item.sourceId });
				return undefined;
			}
			return item as Sourced<T>;
		},
	};
	yearTax(ctx, firstYear, capitalTotal, () => {});
	if (missing.length > 0) throw new MissingTaxDataError(missing);

	const memo = new Map<string, YearAmounts>();
	const evaluate: Evaluator = (year, total) => {
		const key = `${year}:${total}`;
		let amounts = memo.get(key);
		if (amounts === undefined) {
			amounts = yearTax(ctx, year, total, () => {}) ?? ZERO;
			memo.set(key, amounts);
		}
		return amounts;
	};

	const breakdown: BreakdownLine[] = [];
	const line: Line = (entry) => breakdown.push(entry);

	// Règles
	line({ label: labels.SEPARATE_TAXATION, operands: {}, formula: "", value: 0, noAmount: true, sourceId: scales.ruleSources.separateTaxation, assumption: labels.SEPARATE_TAXATION_ASSUMPTION });
	line({ label: labels.PILLAR_3A_ACCOUNT, operands: { accounts: accounts.length }, formula: `${accounts.length} compte(s) 3a`, value: accounts.length, noAmount: true, sourceId: scales.ruleSources.pillar3aAccount, assumption: labels.PILLAR_3A_ACCOUNT_ASSUMPTION });
	line({ label: labels.WITHDRAWAL_WINDOW, operands: {}, formula: "", value: 0, noAmount: true, sourceId: scales.ruleSources.withdrawalWindow, assumption: labels.WITHDRAWAL_WINDOW_ASSUMPTION });
	line({
		label: labels.LPP_STEPS,
		operands: { maximumSteps: scales.lpp.maximumSteps.value, minimumFirstPartialPercent: scales.lpp.minimumFirstPartialPercent.value },
		formula: `${scales.lpp.maximumSteps.value} étapes au plus, premier retrait partiel d'au moins ${scales.lpp.minimumFirstPartialPercent.value} %`,
		value: scales.lpp.maximumSteps.value,
		noAmount: true,
		sourceId: scales.lpp.maximumSteps.sourceId,
		assumption: labels.LPP_STEPS_ASSUMPTION,
	});

	/** Calendrier chiffré avec la trace de chaque année. */
	const tracedCalendar = (withdrawals: CapitalWithdrawalEntry[]): CapitalWithdrawalCalendar => {
		for (const [year, entries] of groupByYear(withdrawals)) {
			const total = entries.reduce((sum, entry) => sum + entry.amount, 0);
			line({
				label: `${labels.SAME_YEAR_TOTAL} ${year}`,
				operands: { withdrawals: entries.length },
				formula: entries.map((entry) => `${entry.pillar === "lpp" ? "LPP" : "3a"} ${fmtChf(entry.amount)}`).join(" + "),
				value: total,
				unit: "CHF",
				sourceId: scales.aggregation?.sourceId ?? null,
				assumption: scales.aggregation ? labels.SAME_YEAR_TOTAL_LAW : labels.SAME_YEAR_TOTAL_METHOD,
			});
			yearTax(ctx, year, total, line);
		}
		return calendarOf(withdrawals, evaluate);
	};

	// Le calendrier envisagé
	const refusals = lppRefusals(input.withdrawals, scales.lpp);
	const plan = refusals.length === 0 ? tracedCalendar(input.withdrawals) : null;

	// Scénarios : 1 à 4 années
	const scenarios = SCENARIO_TRANCHE_COUNTS.map((count) => bestScenario(count, firstYear, lppTotal, accounts, scales.lpp, evaluate));
	for (const scenario of scenarios) {
		line({
			label: `${labels.SCENARIO} ${scenario.trancheCount} année(s)`,
			operands: { trancheCount: scenario.trancheCount },
			formula: scenario.feasible ? describeCalendar(scenario) : scenario.reason,
			value: scenario.feasible ? scenario.totalTax : 0,
			unit: "CHF",
			sourceId: null,
			assumption: labels.SCENARIO_ASSUMPTION,
			...(scenario.feasible ? {} : { noAmount: true, qualifier: labels.SCENARIO_IMPOSSIBLE }),
		});
	}
	const feasible = scenarios.filter((scenario): scenario is FeasibleScenario => scenario.feasible);
	const optimal = feasible.reduce((best, scenario) => (scenario.totalTax < best.totalTax ? scenario : best));
	const single = feasible.find((scenario) => scenario.trancheCount === 1)!;

	line({ label: labels.OPTIMAL_CALENDAR, operands: { trancheCount: optimal.trancheCount }, formula: describeCalendar(optimal), value: optimal.totalTax, unit: "CHF", sourceId: null });
	tracedCalendar(optimal.years.flatMap((year) => year.withdrawals));
	const staggeringSaving = single.totalTax - optimal.totalTax;
	line({
		label: labels.STAGGERING_SAVING,
		operands: { singleTax: single.totalTax, optimalTax: optimal.totalTax },
		formula: `${fmtChf(single.totalTax)} − ${fmtChf(optimal.totalTax)}`,
		value: staggeringSaving,
		unit: "CHF",
		sourceId: null,
	});
	const planExtraTax = plan === null ? null : plan.totalTax - optimal.totalTax;
	if (plan !== null) {
		line({
			label: labels.PLAN_EXTRA_TAX,
			operands: { planTax: plan.totalTax, optimalTax: optimal.totalTax },
			formula: `${fmtChf(plan.totalTax)} − ${fmtChf(optimal.totalTax)}`,
			value: planExtraTax!,
			unit: "CHF",
			sourceId: null,
		});
	}

	return { refusals, plan, scenarios, optimal, staggeringSaving, planExtraTax, breakdown };
}
