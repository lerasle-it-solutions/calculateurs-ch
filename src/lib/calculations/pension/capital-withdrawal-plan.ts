/**
 * Retrait en capital de la prévoyance (A4), cœur du calcul : l'impôt sur les
 * prestations en capital d'un calendrier de retraits saisi, année par année,
 * avec sa trace. La comparaison des échelonnements est dans
 * capital-withdrawal-scenarios.ts, chargé à la demande dans le navigateur
 * (décision n° 22) ; capital-withdrawal.ts réunit les deux.
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
import type { MissingItem, ScaleTable, Sourced, SourcedOrPending, StepwiseDeflation, TaxInput, TaxScales } from "../tax";
// Évaluation des barèmes seule, sans le calcul de l'impôt sur le revenu (budget JavaScript)
import {
	assertTaxCoverage,
	evaluateDeflatedScale,
	evaluateFederalScale,
	evaluateScale,
	MissingTaxDataError,
	OutOfScopeError,
	roundToNearest,
} from "../tax-scale";
import * as labels from "./capital-withdrawal-labels";

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
};

// --- Barèmes et règles reçus en argument --------------------------------------------

/**
 * Stade où s'applique une borne du taux : au taux de base lu sur le barème,
 * avant le coefficient, ou au taux effectif, impôt après coefficient rapporté au
 * capital. Une règle par borne, la même pour l'impôt cantonal et l'impôt communal.
 */
export type RateBoundStage = "baseRate" | "effectiveRate";
export type RateBounds = { minimum: RateBoundStage; maximum: RateBoundStage };

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
			/** Stade de chaque borne ; à relever, le calcul est refusé (R3). */
			rateBounds: SourcedOrPending<RateBounds>;
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

export type CapitalWithdrawalRefusal = {
	reason: "tooManyLppSteps" | "firstLppWithdrawalTooSmall";
	/** Motif en français, avec son article. */
	message: string;
};

// --- Outils -------------------------------------------------------------------------

const fmt = (value: number): string => formatNumber(value, 4);
export const fmtChf = (value: number): string => formatNumber(value, 2);

export type Line = (entry: BreakdownLine) => void;

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

type PeriodicModel = Extract<CapitalTaxModel, { type: "periodicBenefitRate" }>;

/** Hypothèse de la trace : le stade de chaque borne, tel que les données le fixent. */
const boundsAssumption = (bounds: RateBounds): string =>
	`${bounds.minimum === "baseRate" ? labels.MINIMUM_ON_BASE_RATE : labels.MINIMUM_ON_EFFECTIVE_RATE} ; ${
		bounds.maximum === "baseRate" ? labels.MAXIMUM_ON_BASE_RATE : labels.MAXIMUM_ON_EFFECTIVE_RATE
	}`;

/** Taux de base lu sur la rente, borné aux bornes que les données placent avant le coefficient. */
const boundBaseRate = (model: PeriodicModel, bounds: Sourced<RateBounds>, ratePercent: number, label: string, line: Line): number => {
	const minimum = bounds.value.minimum === "baseRate" ? model.minimumRatePercent.value : null;
	const maximum = bounds.value.maximum === "baseRate" ? model.maximumRatePercent.value : null;
	const bounded = clamp(ratePercent, minimum ?? -Infinity, maximum ?? Infinity);
	const range =
		minimum !== null && maximum !== null
			? `borné entre ${fmt(minimum)} % et ${fmt(maximum)} %`
			: minimum !== null
				? `au moins ${fmt(minimum)} %`
				: maximum !== null
					? `au plus ${fmt(maximum)} %`
					: "sans borne avant le coefficient";
	line({
		label,
		operands: { ratePercent, minimumRatePercent: minimum ?? 0, maximumRatePercent: maximum ?? 0 },
		formula: `${fmt(ratePercent)} %, ${range}`,
		value: bounded,
		unit: "%",
		sourceId: bounds.sourceId,
		assumption: boundsAssumption(bounds.value),
	});
	return bounded;
};

/**
 * Impôt après coefficient, borné aux bornes que les données placent sur le taux
 * effectif : `total` × taux minimal au moins, `total` × taux maximal au plus.
 * Sans effet hors du modèle de la rente équivalente.
 */
const boundEffectiveRate = (ctx: Context, total: number, tax: number, label: string, line: Line): number => {
	const model = ctx.scales.model;
	if (model.type !== "periodicBenefitRate" || isPending(model.rateBounds)) return tax;
	const bounds = model.rateBounds;
	const floor = bounds.value.minimum === "effectiveRate" ? (total * model.minimumRatePercent.value) / 100 : null;
	const ceiling = bounds.value.maximum === "effectiveRate" ? (total * model.maximumRatePercent.value) / 100 : null;
	if (floor === null && ceiling === null) return tax;
	const bounded = clamp(tax, floor ?? -Infinity, ceiling ?? Infinity);
	const parts = [
		...(floor === null ? [] : [`au moins ${fmt(total)} × ${fmt(model.minimumRatePercent.value)} % = ${fmt(floor)}`]),
		...(ceiling === null ? [] : [`au plus ${fmt(total)} × ${fmt(model.maximumRatePercent.value)} % = ${fmt(ceiling)}`]),
	];
	line({
		label,
		operands: { tax, total, floor: floor ?? 0, ceiling: ceiling ?? 0 },
		formula: `${fmt(tax)}, ${parts.join(", ")}`,
		value: bounded,
		unit: "CHF",
		sourceId: bounds.sourceId,
		assumption: boundsAssumption(bounds.value),
	});
	return bounded;
};

/** Taux de base du Valais : rente équivalente au capital, taux du barème lu sur la rente. */
const annuityRateIncome = (
	ctx: Context,
	model: PeriodicModel,
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
	const step = ctx.need(ctx.scales.tax.taxBaseRounding.income, labels.NEED_ANNUITY_ROUNDING);
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
					const coefficients = ctx.need(family.coefficients, labels.NEED_FAMILY_QUOTIENT);
					if (!coefficients) return undefined;
					if (coefficients.value.single !== 1) throw new OutOfScopeError("Quotient familial d'une personne seule différent de 1 : non prévu.");
				} else if (family.type === "divisorOnIncomeAndWealth") {
					const households = ctx.need(family.households, labels.NEED_DIVISOR_HOUSEHOLDS);
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
					: ctx.need(scales.tax.canton.incomeScaleIndexation, labels.NEED_CANTONAL_INDEXATION);
			if (rateIncome === undefined || (scales.tax.canton.incomeScaleIndexation !== null && !deflation)) return undefined;
			const bounds = ctx.need(model.rateBounds, labels.NEED_RATE_BOUNDS);
			if (!bounds) return undefined;
			const table = singleTable(scales.tax.canton.income, labels.CANTONAL_RATE_ON_ANNUITY);
			const rate = rateOn(table, rateIncome, deflation);
			line({ label: labels.CANTONAL_RATE_ON_ANNUITY, operands: { rateIncome }, formula: rate.formula, value: rate.ratePercent, unit: "%", sourceId: table.sourceId });
			const bounded = boundBaseRate(model, bounds, rate.ratePercent, labels.BOUNDED_RATE, line);
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
const cantonalTaxOf = (ctx: Context, total: number, base: number, line: Line): number | undefined => {
	const { scales } = ctx;
	const applies = ctx.need(scales.multipliers.cantonal, labels.NEED_CANTONAL_MULTIPLIER);
	const reductionApplies =
		scales.multipliers.baseTaxReduction === null
			? undefined
			: ctx.need(scales.multipliers.baseTaxReduction, labels.NEED_REDUCTION_APPLIES);
	if (!applies || (scales.multipliers.baseTaxReduction !== null && !reductionApplies)) return undefined;
	if (!applies.value) {
		line({ label: labels.CANTONAL_TAX, operands: { base }, formula: fmt(base), value: base, unit: "CHF", sourceId: applies.sourceId, assumption: labels.CANTONAL_TAX_FIXED_RATES });
		return base;
	}
	const canton = scales.tax.canton;
	let reductionFactor = 1;
	if (reductionApplies?.value) {
		if (canton.baseTaxReduction === null) throw new Error("Réduction de l'impôt de base appliquée au capital sans réduction relevée.");
		const reduction = ctx.need(canton.baseTaxReduction, labels.NEED_BASE_TAX_REDUCTION);
		if (!reduction) return undefined;
		if (reduction.value.appliesTo.includes("income")) reductionFactor = 1 - reduction.value.ratePercent / 100;
	}
	const unreduced = canton.unreducedMultiplier === null ? undefined : ctx.need(canton.unreducedMultiplier, labels.NEED_UNREDUCED_MULTIPLIER);
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
	return boundEffectiveRate(ctx, total, cantonalTax, labels.CANTONAL_TAX_EFFECTIVE_BOUND, line);
};

const municipalTaxOf = (
	ctx: Context,
	total: number,
	base: number,
	rateIncome: number | null,
	line: Line,
): number | undefined => {
	const { scales } = ctx;
	const applies = ctx.need(scales.multipliers.communal, labels.NEED_COMMUNAL_MULTIPLIER);
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
		return boundEffectiveRate(ctx, total, municipalTax, labels.MUNICIPAL_TAX_EFFECTIVE_BOUND, line);
	}
	// Barème communal propre : taux lu sur la même rente que le taux cantonal (« sur les mêmes bases »)
	const model = scales.model;
	if (model.type !== "periodicBenefitRate") throw new Error("Barème communal propre sans rente équivalente : non prévu.");
	const bounds = ctx.need(model.rateBounds, labels.NEED_RATE_BOUNDS);
	if (!bounds) return undefined;
	if (rateIncome === null) return 0; // total exonéré : aucun impôt de base
	const deflation =
		municipality.incomeScaleIndexation === null ? undefined : ctx.need(municipality.incomeScaleIndexation, labels.NEED_COMMUNAL_INDEXATION);
	if (municipality.incomeScaleIndexation !== null && !deflation) return undefined;
	const table = singleTable(municipality.income, labels.COMMUNAL_RATE_ON_ANNUITY);
	const rate = rateOn(table, rateIncome, deflation);
	line({ label: labels.COMMUNAL_RATE_ON_ANNUITY, operands: { rateIncome }, formula: rate.formula, value: rate.ratePercent, unit: "%", sourceId: table.sourceId });
	const bounded = boundBaseRate(model, bounds, rate.ratePercent, labels.COMMUNAL_BOUNDED_RATE, line);
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
	return boundEffectiveRate(ctx, total, municipalTax, labels.MUNICIPAL_TAX_EFFECTIVE_BOUND, line);
};

const churchTaxOf = (ctx: Context, base: number, line: Line): number | undefined => {
	const denomination = ctx.input.denomination;
	if (denomination === "none") return 0;
	const applies = ctx.need(ctx.scales.multipliers.church, labels.NEED_CHURCH_MULTIPLIER);
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
	if ("pending" in federal.income) ctx.need(federal.income, labels.NEED_FEDERAL_SCALE);
	else tables = federal.income;
	const maximumRate = ctx.need(federal.maximumRatePercent, labels.NEED_FEDERAL_MAXIMUM_RATE);
	const rounding = ctx.need(federal.taxRoundingToNearest, labels.NEED_FEDERAL_ROUNDING);
	const minimum = ctx.options.applyFederalMinimumLeviedTax ? ctx.need(federal.minimumLeviedTax, labels.NEED_FEDERAL_MINIMUM) : undefined;
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
	const cantonalTax = cantonalTaxOf(ctx, total, base, line);
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

export const groupByYear = (withdrawals: CapitalWithdrawalEntry[]): Map<number, CapitalWithdrawalEntry[]> => {
	const byYear = new Map<number, CapitalWithdrawalEntry[]>();
	for (const entry of [...withdrawals].sort((a, b) => a.year - b.year)) {
		byYear.set(entry.year, [...(byYear.get(entry.year) ?? []), entry]);
	}
	return byYear;
};

/** Refus de l'art. 13a al. 2 et 3 LPP pour un calendrier donné. */
export const lppRefusals = (withdrawals: CapitalWithdrawalEntry[], lpp: CapitalWithdrawalScales["lpp"]): CapitalWithdrawalRefusal[] => {
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

export type Evaluator = (year: number, total: number) => YearAmounts;

/** Calendrier chiffré, chaque année avec ses prestations. */
export const calendarOf = (withdrawals: CapitalWithdrawalEntry[], evaluate: Evaluator): CapitalWithdrawalCalendar => {
	const years = [...groupByYear(withdrawals)].map(([year, entries]) => {
		const total = entries.reduce((sum, entry) => sum + entry.amount, 0);
		return { year, withdrawals: entries, total, ...evaluate(year, total) };
	});
	return { years, totalTax: years.reduce((sum, year) => sum + year.totalTax, 0) };
};


// --- Préparation et calendrier saisi -------------------------------------------------

/** Ce que le cœur et la comparaison partagent : entrées validées, évaluation d'une année, trace d'un calendrier. */
export type PreparedCapitalWithdrawal = {
	evaluate: Evaluator;
	/** Comptes 3a, un montant par compte. */
	accounts: number[];
	lppTotal: number;
	firstYear: number;
	/** Calendrier chiffré, chaque année tracée dans `line`. */
	traced: (withdrawals: CapitalWithdrawalEntry[], line: Line) => CapitalWithdrawalCalendar;
};

/**
 * Valide les entrées, refuse un ménage ou une commune hors périmètre, recense
 * toutes les valeurs à relever sur une année complète, avant tout chiffre (R3),
 * et prépare l'évaluation mémorisée d'une année.
 */
export function prepareCapitalWithdrawal(
	input: CapitalWithdrawalInput,
	scales: CapitalWithdrawalScales,
	options: CapitalWithdrawalOptions = {},
): PreparedCapitalWithdrawal {
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
	const traced = (withdrawals: CapitalWithdrawalEntry[], line: Line): CapitalWithdrawalCalendar => {
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
	return { evaluate, accounts, lppTotal, firstYear, traced };
}

export type CapitalWithdrawalPlanResult = {
	/** Vide si le calendrier respecte l'art. 13a LPP ; sinon, `plan` vaut `null`. */
	refusals: CapitalWithdrawalRefusal[];
	plan: CapitalWithdrawalCalendar | null;
	breakdown: BreakdownLine[];
};

/** L'impôt du calendrier saisi, avec la trace des règles et de chaque année. */
export function computeCapitalWithdrawalPlan(
	input: CapitalWithdrawalInput,
	scales: CapitalWithdrawalScales,
	options: CapitalWithdrawalOptions = {},
): CapitalWithdrawalPlanResult {
	const prepared = prepareCapitalWithdrawal(input, scales, options);
	const breakdown: BreakdownLine[] = [];
	const line: Line = (entry) => breakdown.push(entry);
	line({ label: labels.SEPARATE_TAXATION, operands: {}, formula: "", value: 0, noAmount: true, sourceId: scales.ruleSources.separateTaxation, assumption: labels.SEPARATE_TAXATION_ASSUMPTION });
	line({ label: labels.PILLAR_3A_ACCOUNT, operands: { accounts: prepared.accounts.length }, formula: `${prepared.accounts.length} compte(s) 3a`, value: prepared.accounts.length, noAmount: true, sourceId: scales.ruleSources.pillar3aAccount, assumption: labels.PILLAR_3A_ACCOUNT_ASSUMPTION });
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
	const refusals = lppRefusals(input.withdrawals, scales.lpp);
	const plan = refusals.length === 0 ? prepared.traced(input.withdrawals, line) : null;
	return { refusals, plan, breakdown };
}
