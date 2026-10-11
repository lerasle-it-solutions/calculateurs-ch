/**
 * Estimateur du revenu imposable : du salaire brut aux deux revenus imposables,
 * cantonal et fédéral (W08, prompt B1, décisions des 07, 10 et 11.10.2026).
 *
 * Chaîne : salaire brut − AVS, AI, APG − AC − LAA non professionnelle −
 * cotisation LPP = revenu net du travail, pour chaque personne qui travaille ;
 * puis, pour la Confédération et pour le canton, chacun selon ses propres
 * règles : − frais professionnels forfaitaires − primes d'assurance
 * − déductions pour enfants − déduction pour couple ou personne seule
 * − déduction pour double revenu = revenu imposable.
 *
 * Fonction pure : taux, plafonds et déductions arrivent en argument (R2), déjà
 * normalisés par src/data/gross-to-taxable.ts. Trois montants sont des
 * paramètres de l'utilisateur, avec une valeur par défaut déclarée comme
 * hypothèse : la cotisation LPP (minimum légal), le taux LAA non professionnel
 * et les primes d'assurance (ceux de la chaîne du calculateur de l'AFC).
 */
import type { BreakdownLine } from "../utils/breakdown";
import { formatNumber } from "../utils/format-number";
import * as labels from "./gross-to-taxable-labels";

/** Une valeur relevée, avec l'acte qui la fixe. */
export type Sourced<T> = { value: T; sourceId: string };

/** Taux en fraction, borné ; `rate` vaut `null` pour un montant fixe (le maximum). */
export type BoundedRate = { rate: number | null; minimum: number; maximum: number };

export type SocialInsuranceRules = {
	oldAgeSurvivorsRate: Sourced<number>;
	disabilityRate: Sourced<number>;
	incomeCompensationRate: Sourced<number>;
	unemploymentRate: Sourced<number>;
	/** Gain maximal assuré LAA : plafonne l'AC et la prime LAA non professionnelle. */
	accidentMaximumInsuredEarnings: Sourced<number>;
	occupationalPension: {
		entryThreshold: Sourced<number>;
		coordinationDeduction: Sourced<number>;
		upperSalaryLimit: Sourced<number>;
		minimumCoordinatedSalary: Sourced<number>;
		ageCredits: Sourced<{ fromAge: number; toAge: number; rate: number }[]>;
	};
};

/** Montant d'un enfant selon son rang (1 = aîné) et son âge ; `additive` s'ajoute au montant de base. */
export type ChildDeductionRule = {
	fromRank: number;
	toRank: number | null;
	fromAge: number;
	toAge: number | null;
	amount: Sourced<number>;
	additive: boolean;
	/** Hypothèse de lecture de la règle, déclarée dans la trace. */
	assumption?: string;
};

/**
 * Plafond de la déduction des primes : selon l'état civil et les cotisations au
 * 2e pilier ou au 3a, avec un supplément par enfant.
 */
export type InsurancePremiumCaps = {
	single: { withPension: Sourced<number>; withoutPension: Sourced<number> };
	married: { bothWithPension: Sourced<number>; oneWithoutPension: Sourced<number>; bothWithoutPension: Sourced<number> };
	perChild: Sourced<number>;
};

/** Règles de déduction d'une autorité fiscale (canton ou Confédération), normalisées. */
export type DeductionRules = {
	authority: "federal" | "canton";
	professionalExpenses: Sourced<BoundedRate>;
	insurancePremiums: InsurancePremiumCaps;
	children: ChildDeductionRule[];
	marriedCouple: Sourced<number> | null;
	singleWithoutChildren: Sourced<number> | null;
	singleWithChildren: Sourced<number> | null;
	/** `null` : aucune déduction pour double revenu. */
	dualIncome: Sourced<BoundedRate> | null;
};

export type GrossToTaxableData = {
	socialInsurance: SocialInsuranceRules;
	federal: DeductionRules;
	cantonal: DeductionRules;
};

/**
 * Règles de plusieurs cantons, embarquées par une page : celles d'un canton
 * s'en extraient par `rulesFor`. `averagePremiums` porte les défauts publics des
 * primes d'assurance (prime moyenne du canton, par adulte et par enfant).
 */
export type GrossToTaxableRuleSet = {
	year: number;
	socialInsurance: SocialInsuranceRules;
	federal: DeductionRules;
	cantonal: Partial<Record<string, DeductionRules>>;
	averagePremiums: Partial<Record<string, Sourced<{ adult: number; child: number }>>>;
};

export const rulesFor = (ruleSet: GrossToTaxableRuleSet, canton: string): GrossToTaxableData => {
	const cantonal = ruleSet.cantonal[canton];
	if (!cantonal) throw new Error(`Déductions du canton ${canton} absentes.`);
	return { socialInsurance: ruleSet.socialInsurance, federal: ruleSet.federal, cantonal };
};

/** Une personne qui travaille. */
export type Earner = {
	grossSalary: number;
	age: number;
	/** Cotisation LPP de la fiche de salaire ; absente : minimum légal par défaut. */
	occupationalPensionContribution?: number;
};

/**
 * Paramètre de l'utilisateur, avec l'hypothèse à déclarer dans la trace : celle
 * de la valeur par défaut, ou « valeur saisie ».
 */
export type WithAssumption<T> = T & { assumption: string };

export type GrossToTaxableParams = {
	maritalStatus: "single" | "married";
	/** Âge de chaque enfant, de l'aîné au cadet. */
	childrenAges: number[];
	/** Une personne, ou deux pour un couple marié (la seconde peut avoir un salaire nul). */
	earners: Earner[];
	/** Taux LAA non professionnel, en fraction du salaire jusqu'au gain maximal assuré. */
	nonOccupationalAccidentRate: WithAssumption<{ value: number }>;
	/** Primes d'assurance maladie et accidents payées dans l'année, par adulte et par enfant. */
	insurancePremiums: WithAssumption<{ perAdult: number; perChild: number }>;
};

export type EarnerResult = {
	grossSalary: number;
	oldAgeSurvivors: number;
	disability: number;
	incomeCompensation: number;
	unemployment: number;
	nonOccupationalAccident: number;
	occupationalPension: number;
	netEarnedIncome: number;
};

export type GrossToTaxableResult = {
	earners: EarnerResult[];
	federalTaxableIncome: number;
	cantonalTaxableIncome: number;
	isEstimate: true;
	breakdown: BreakdownLine[];
};

const fmt = (value: number): string => formatNumber(value, 2);
const percent = (rate: number): string => `${formatNumber(rate * 100, 4)} %`;
const toFranc = (value: number): number => Math.round(value);
const clamp = (value: number, bounds: BoundedRate): number => Math.min(Math.max(value, bounds.minimum), bounds.maximum);

/** Cotisation LPP du salarié au minimum légal : moitié de la bonification de l'art. 16 sur le salaire coordonné. */
export function legalMinimumPensionContribution(
	grossSalary: number,
	age: number,
	pension: SocialInsuranceRules["occupationalPension"],
): { contribution: number; coordinatedSalary: number; rate: number } {
	if (grossSalary <= pension.entryThreshold.value) return { contribution: 0, coordinatedSalary: 0, rate: 0 };
	const credit = pension.ageCredits.value.find((entry) => age >= entry.fromAge && age <= entry.toAge);
	const coordinatedSalary = Math.max(
		Math.min(grossSalary, pension.upperSalaryLimit.value) - pension.coordinationDeduction.value,
		pension.minimumCoordinatedSalary.value,
	);
	const rate = credit?.rate ?? 0;
	return { contribution: toFranc((coordinatedSalary * rate) / 2), coordinatedSalary, rate };
}

const childAmount = (
	rules: ChildDeductionRule[],
	rank: number,
	age: number,
): { amount: number; sourceIds: string[]; assumptions: string[] } => {
	const applies = (rule: ChildDeductionRule) =>
		rank >= rule.fromRank &&
		(rule.toRank === null || rank <= rule.toRank) &&
		age >= rule.fromAge &&
		(rule.toAge === null || age <= rule.toAge);
	const base = rules.find((rule) => !rule.additive && applies(rule));
	const additive = rules.filter((rule) => rule.additive && applies(rule));
	const matched = [...(base ? [base] : []), ...additive];
	return {
		amount: matched.reduce((sum, rule) => sum + rule.amount.value, 0),
		sourceIds: matched.map((rule) => rule.amount.sourceId),
		assumptions: matched.flatMap((rule) => (rule.assumption ? [rule.assumption] : [])),
	};
};

export function estimateTaxableIncome(params: GrossToTaxableParams, data: GrossToTaxableData): GrossToTaxableResult {
	const married = params.maritalStatus === "married";
	if (params.earners.length !== (married ? 2 : 1)) {
		throw new Error(`${married ? 2 : 1} personne(s) attendue(s), ${params.earners.length} reçue(s).`);
	}
	for (const earner of params.earners) {
		if (!Number.isFinite(earner.grossSalary) || earner.grossSalary < 0) throw new Error(`Salaire brut invalide : ${earner.grossSalary}.`);
	}
	const social = data.socialInsurance;
	const pension = social.occupationalPension;
	const breakdown: BreakdownLine[] = [];
	const line = (entry: BreakdownLine): void => {
		breakdown.push(entry);
	};
	const who = (index: number) => (married ? `, ${index === 0 ? "personne 1" : "personne 2"}` : "");

	// 1. Revenu net du travail de chaque personne
	const earners = params.earners.map((earner, index): EarnerResult => {
		const gross = earner.grossSalary;
		const capped = Math.min(gross, social.accidentMaximumInsuredEarnings.value);
		const contribution = (label: string, base: number, rate: Sourced<number>, note?: string) => {
			const value = toFranc(base * rate.value);
			line({
				label: `${label}${who(index)}`,
				operands: { base, rate: rate.value },
				formula: `${fmt(base)} × ${percent(rate.value)}`,
				value,
				unit: "CHF",
				sourceId: rate.sourceId,
				...(note ? { assumption: note } : {}),
			});
			return value;
		};
		line({ label: `${labels.GROSS_SALARY}${who(index)}`, operands: { gross }, formula: "saisi", value: gross, unit: "CHF", sourceId: null });
		const oldAgeSurvivors = contribution(labels.OLD_AGE_SURVIVORS, gross, social.oldAgeSurvivorsRate);
		const disability = contribution(labels.DISABILITY, gross, social.disabilityRate);
		const incomeCompensation = contribution(labels.INCOME_COMPENSATION, gross, social.incomeCompensationRate);
		const unemployment = contribution(labels.UNEMPLOYMENT, capped, social.unemploymentRate);
		const accidentRate = params.nonOccupationalAccidentRate;
		const nonOccupationalAccident = toFranc(capped * accidentRate.value);
		line({
			label: `${labels.NON_OCCUPATIONAL_ACCIDENT}${who(index)}`,
			operands: { base: capped, rate: accidentRate.value },
			formula: `${fmt(capped)} × ${percent(accidentRate.value)}`,
			value: nonOccupationalAccident,
			unit: "CHF",
			sourceId: social.accidentMaximumInsuredEarnings.sourceId,
			assumption: accidentRate.assumption,
		});
		const legal = legalMinimumPensionContribution(gross, earner.age, pension);
		const given = earner.occupationalPensionContribution;
		const occupationalPension = given ?? legal.contribution;
		line({
			label: `${labels.OCCUPATIONAL_PENSION}${who(index)}`,
			operands: { coordinatedSalary: legal.coordinatedSalary, rate: legal.rate },
			formula: given !== undefined ? "saisie" : `${fmt(legal.coordinatedSalary)} × ${percent(legal.rate)} ÷ 2`,
			value: occupationalPension,
			unit: "CHF",
			sourceId: given !== undefined ? null : pension.ageCredits.sourceId,
			assumption:
				given !== undefined
					? labels.USER_VALUE
					: `${labels.LPP_DEFAULT_ASSUMPTION_START} ${fmt(pension.upperSalaryLimit.value)} ${labels.LPP_DEFAULT_ASSUMPTION_END}`,
		});
		const netEarnedIncome =
			gross - oldAgeSurvivors - disability - incomeCompensation - unemployment - nonOccupationalAccident - occupationalPension;
		line({
			label: `${labels.NET_EARNED_INCOME}${who(index)}`,
			operands: { gross, oldAgeSurvivors, disability, incomeCompensation, unemployment, nonOccupationalAccident, occupationalPension },
			formula: `${fmt(gross)} − ${[oldAgeSurvivors, disability, incomeCompensation, unemployment, nonOccupationalAccident, occupationalPension].map(fmt).join(" − ")}`,
			value: netEarnedIncome,
			unit: "CHF",
			sourceId: null,
		});
		return { grossSalary: gross, oldAgeSurvivors, disability, incomeCompensation, unemployment, nonOccupationalAccident, occupationalPension, netEarnedIncome };
	});

	// 2. Revenu imposable selon les règles de chaque autorité
	const withPension = earners.map((earner) => earner.occupationalPension > 0);
	const children = params.childrenAges.length;
	const adults = married ? 2 : 1;
	const premiumsPaid = adults * params.insurancePremiums.perAdult + children * params.insurancePremiums.perChild;

	const taxable = (rules: DeductionRules): number => {
		const scope = rules.authority === "federal" ? labels.FEDERAL : labels.CANTON;
		const deductionLine = (label: string, value: number, formula: string, sourceId: string | null, assumption?: string) =>
			line({
				label: `${label}, ${scope}`,
				operands: { value },
				formula,
				value,
				unit: "CHF",
				sourceId,
				...(assumption ? { assumption } : {}),
			});

		// Frais professionnels, par personne, sur le revenu net du travail
		const expenses = earners.map((earner) =>
			earner.netEarnedIncome > 0 ? clamp(toFranc(earner.netEarnedIncome * (rules.professionalExpenses.value.rate ?? 0)), rules.professionalExpenses.value) : 0,
		);
		const totalExpenses = expenses.reduce((sum, value) => sum + value, 0);
		const bounds = rules.professionalExpenses.value;
		deductionLine(
			labels.PROFESSIONAL_EXPENSES,
			totalExpenses,
			expenses.map((value, index) => `${percent(bounds.rate ?? 0)} de ${fmt(earners[index]!.netEarnedIncome)}, entre ${fmt(bounds.minimum)} et ${fmt(bounds.maximum)} : ${fmt(value)}`).join(" ; "),
			rules.professionalExpenses.sourceId,
			labels.NO_TRANSPORT_MEALS_CHILDCARE,
		);

		// Primes d'assurance, plafonnées pour le ménage
		const caps = rules.insurancePremiums;
		const base = married
			? withPension.every(Boolean)
				? caps.married.bothWithPension
				: withPension.some(Boolean)
					? caps.married.oneWithoutPension
					: caps.married.bothWithoutPension
			: withPension[0]
				? caps.single.withPension
				: caps.single.withoutPension;
		const cap = base.value + children * caps.perChild.value;
		const premiums = Math.min(premiumsPaid, cap);
		deductionLine(
			labels.INSURANCE_PREMIUMS,
			premiums,
			`min(primes ${fmt(premiumsPaid)} ; plafond ${fmt(base.value)}${children > 0 ? ` + ${children} × ${fmt(caps.perChild.value)}` : ""})`,
			base.sourceId,
			params.insurancePremiums.assumption,
		);

		// Enfants, selon leur rang et leur âge
		const perChild = params.childrenAges.map((age, index) => childAmount(rules.children, index + 1, age));
		const childrenTotal = perChild.reduce((sum, entry) => sum + entry.amount, 0);
		if (children > 0) {
			deductionLine(
				labels.CHILDREN,
				childrenTotal,
				perChild.map((entry) => fmt(entry.amount)).join(" + ") || labels.NO_DEDUCTION_IN_DATA,
				perChild.flatMap((entry) => entry.sourceIds)[0] ?? null,
				[...new Set(perChild.flatMap((entry) => entry.assumptions))].join(" ") || undefined,
			);
		}

		// Couple marié, personne seule, famille monoparentale
		const status = married ? rules.marriedCouple : children > 0 ? rules.singleWithChildren : rules.singleWithoutChildren;
		const statusLabel = married ? labels.MARRIED_COUPLE : children > 0 ? labels.SINGLE_PARENT : labels.SINGLE_TAXPAYER;
		const statusAmount = status?.value ?? 0;
		if (married || status) {
			deductionLine(statusLabel, statusAmount, status ? fmt(statusAmount) : labels.NO_DEDUCTION_IN_DATA, status?.sourceId ?? null);
		}

		// Double revenu : les deux conjoints ont un revenu du travail
		let dual = 0;
		if (married && rules.dualIncome && earners.every((earner) => earner.netEarnedIncome > 0)) {
			const products = earners.map((earner, index) => earner.netEarnedIncome - expenses[index]!);
			const lower = Math.min(...products);
			const rule = rules.dualIncome.value;
			dual = rule.rate === null ? rule.maximum : clamp(toFranc(lower * rule.rate), rule);
			deductionLine(
				labels.DUAL_INCOME,
				dual,
				rule.rate === null ? fmt(rule.maximum) : `${percent(rule.rate)} de ${fmt(lower)}, entre ${fmt(rule.minimum)} et ${fmt(rule.maximum)}`,
				rules.dualIncome.sourceId,
			);
		}

		const net = earners.reduce((sum, earner) => sum + earner.netEarnedIncome, 0);
		const result = Math.max(0, net - totalExpenses - premiums - childrenTotal - statusAmount - dual);
		line({
			label: rules.authority === "federal" ? labels.FEDERAL_TAXABLE_INCOME : labels.CANTONAL_TAXABLE_INCOME,
			operands: { net, totalExpenses, premiums, childrenTotal, statusAmount, dual },
			formula: `${fmt(net)} − ${[totalExpenses, premiums, childrenTotal, statusAmount, dual].map(fmt).join(" − ")}`,
			value: result,
			unit: "CHF",
			sourceId: null,
			assumption: labels.ESTIMATE,
		});
		return result;
	};

	const federalTaxableIncome = taxable(data.federal);
	const cantonalTaxableIncome = taxable(data.cantonal);
	return { earners, federalTaxableIncome, cantonalTaxableIncome, isEstimate: true, breakdown };
}
