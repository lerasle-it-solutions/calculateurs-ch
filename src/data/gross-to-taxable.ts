/**
 * Règles de l'estimateur du revenu imposable, normalisées pour
 * src/lib/calculations/gross-to-taxable.ts : cotisations sociales et
 * déductions de l'IFD (federal/{année}.json), déductions cantonales
 * (cantons/xx.json, collectées par le module de l'AFC, source : la loi
 * cantonale).
 *
 * Les déductions cantonales sont lues par leur libellé exact dans l'export de
 * l'AFC : un libellé absent arrête la construction plutôt que de supposer une
 * valeur (R3). Décisions du 10.10.2026 : déductions cantonales reprises telles
 * quelles, déduction pour couple absente (GE, VS, FR, NE) traitée comme nulle ;
 * du 11.10.2026 : au Valais, « propres enfants à charge » s'ajoute à la
 * déduction selon l'âge.
 */
import type {
	BoundedRate,
	ChildDeductionRule,
	DeductionRules,
	GrossToTaxableData,
	GrossToTaxableRuleSet,
	InsurancePremiumCaps,
	Sourced,
	SocialInsuranceRules,
} from "../lib/calculations/gross-to-taxable";
import * as labels from "../lib/calculations/gross-to-taxable-labels";
import { getCantonData, getFederalData } from "./index";
import type { CantonData } from "./schema";

type CantonCode = "VD" | "GE" | "VS" | "FR" | "NE" | "JU";
type Field = "amount" | "maximum" | "minimum";

const isTodo = (value: unknown): value is { todo: string } => typeof value === "object" && value !== null && "todo" in value;

const sourced = <T>(value: { value: T; sourceId: string }): Sourced<T> => ({ value: value.value, sourceId: value.sourceId });

/** Lecteur des déductions d'un canton, par libellé exact de l'export de l'AFC. */
const cantonReader = (canton: CantonCode, data: CantonData) => {
	const sourceId = data.deductions.sourceId;
	const entries = new Map(data.deductions.value.map((entry) => [entry.name, entry]));
	const entry = (name: string) => {
		const found = entries.get(name);
		if (!found) throw new Error(`${canton} : déduction « ${name} » absente de cantons/${canton.toLowerCase()}.json.`);
		return found;
	};
	return {
		amount: (name: string, field: Field = "maximum"): Sourced<number> => ({ value: entry(name)[field], sourceId }),
		rate: (name: string): Sourced<BoundedRate> => {
			const { percent, minimum, maximum } = entry(name);
			return { value: { rate: percent > 0 ? percent / 100 : null, minimum, maximum }, sourceId };
		},
	};
};

const everyChild = (amount: Sourced<number>, additive = false): ChildDeductionRule => ({
	fromRank: 1,
	toRank: null,
	fromAge: 0,
	toAge: null,
	amount,
	additive,
});
const byAge = (fromAge: number, toAge: number | null, amount: Sourced<number>): ChildDeductionRule => ({
	fromRank: 1,
	toRank: null,
	fromAge,
	toAge,
	amount,
	additive: false,
});
const byRank = (fromRank: number, toRank: number | null, amount: Sourced<number>, additive = false): ChildDeductionRule => ({
	fromRank,
	toRank,
	fromAge: 0,
	toAge: null,
	amount,
	additive,
});

/** Plafonds sans distinction selon les cotisations au 2e pilier ou au 3a. */
const sameCaps = (single: Sourced<number>, married: Sourced<number>, perChild: Sourced<number>): InsurancePremiumCaps => ({
	single: { withPension: single, withoutPension: single },
	married: { bothWithPension: married, oneWithoutPension: married, bothWithoutPension: married },
	perChild,
});

const PREMIUMS_WITH = "Déduction des primes d'assurance et des intérêts de l'épargne, personnes";

const cantonalRules = (canton: CantonCode, data: CantonData): DeductionRules => {
	const read = cantonReader(canton, data);
	const professionalExpenses = read.rate("Déduction forfaitaire pour autres frais professionnels");
	const dual = read.rate("Déduction pour couple à deux revenus");
	const dualIncome: Sourced<BoundedRate> = { ...dual, value: { ...dual.value, minimum: dual.value.rate === null ? 0 : dual.value.minimum } };
	const base = { authority: "canton" as const, professionalExpenses, dualIncome };

	switch (canton) {
		case "VD":
			return {
				...base,
				insurancePremiums: sameCaps(
					read.amount("Déduction des primes d'assurance, personnes célibataires"),
					read.amount("Déduction des primes d'assurance, personnes mariées"),
					read.amount("Déduction des primes d'assurance, enfant"),
				),
				children: [byAge(0, 17, read.amount("Déduction pour les enfants mineurs"))],
				marriedCouple: read.amount("Déduction pour personnes mariées"),
				singleWithoutChildren: null,
				singleWithChildren: read.amount("Déduction pour les personnes célibataires avec enfants"),
			};
		case "GE": {
			// Primes LAMal jusqu'à la prime moyenne cantonale, par adulte et par enfant mineur
			const adult = read.amount("Caisse maladie Prime moyenne adulte");
			return {
				...base,
				insurancePremiums: sameCaps(
					adult,
					{ value: 2 * adult.value, sourceId: adult.sourceId },
					read.amount("Caisse maladie Prime moyenne Mineurs"),
				),
				children: [everyChild(read.amount("Déduction pour enfants", "amount"))],
				marriedCouple: null,
				singleWithoutChildren: null,
				singleWithChildren: null,
			};
		}
		case "VS":
			return {
				...base,
				insurancePremiums: {
					single: {
						withPension: read.amount(`${PREMIUMS_WITH} célibataires avec cotisations pilier 2/3a`),
						withoutPension: read.amount(`${PREMIUMS_WITH} célibataires sans cotisations pilier 2/3a`),
					},
					married: {
						bothWithPension: read.amount(`${PREMIUMS_WITH} mariées avec cotisations pilier 2/3a`),
						oneWithoutPension: read.amount(`${PREMIUMS_WITH} mariées avec cotisations pilier 2/3a`),
						bothWithoutPension: read.amount(`${PREMIUMS_WITH} mariées sans cotisations pilier 2/3a`),
					},
					perChild: read.amount(`${PREMIUMS_WITH.replace(", personnes", ", enfant")}`),
				},
				children: [
					byAge(0, 6, read.amount("Déduction pour enfant, âge inférieur à 7 ans", "amount")),
					byAge(7, 16, read.amount("Déduction pour enfant, âge entre 7 et 16 ans", "amount")),
					byAge(17, null, read.amount("Déduction pour enfants, de 17 ans", "amount")),
					everyChild(read.amount("Déduction pour propres enfants à charge", "amount"), true),
					{ ...byRank(3, null, read.amount("Déduction supplémentaire pour enfants, dès 3 enfants", "amount"), true), assumption: labels.VS_THIRD_CHILD },
				],
				marriedCouple: null,
				singleWithoutChildren: null,
				singleWithChildren: null,
			};
		case "FR":
			return {
				...base,
				insurancePremiums: sameCaps(
					read.amount("Déduction des primes d'assurance maladie, personnes célibataires"),
					read.amount("Déduction des primes d'assurance maladie, personnes mariées"),
					read.amount("Déduction des primes d'assurance maladie, enfant mineur"),
				),
				children: [
					{ ...byRank(1, 2, read.amount("Déduction pour enfant, 1er et 2ème enfant", "minimum")), assumption: labels.FR_CHILD_MINIMUM },
					{ ...byRank(3, null, read.amount("Déduction enfants dès 3 enfants", "minimum")), assumption: labels.FR_CHILD_MINIMUM },
				],
				marriedCouple: null,
				singleWithoutChildren: null,
				singleWithChildren: null,
			};
		case "NE":
			return {
				...base,
				insurancePremiums: {
					single: {
						withPension: read.amount(`${PREMIUMS_WITH} célibataires avec cotisations pilier 2/3a`),
						withoutPension: read.amount(`${PREMIUMS_WITH} célibataires sans cotisations pilier 2/3a`),
					},
					married: {
						bothWithPension: read.amount(`${PREMIUMS_WITH} mariées avec cotisations pilier 2/3a`),
						oneWithoutPension: read.amount(`${PREMIUMS_WITH} mariées avec cotisations pilier 2/3a`),
						bothWithoutPension: read.amount(`${PREMIUMS_WITH} mariées sans cotisations pilier 2/3a`),
					},
					perChild: read.amount(`${PREMIUMS_WITH.replace(", personnes", ", enfant")}`),
				},
				children: [
					byAge(0, 3, read.amount("Déduction pour enfant, âge inférieur à 4 ans", "amount")),
					byAge(4, 13, read.amount("Déduction pour enfant, âge entre 4 et 13 ans", "amount")),
					byAge(14, null, read.amount("Déduction pour enfant de plus de 14 ans", "amount")),
				],
				marriedCouple: null,
				singleWithoutChildren: null,
				singleWithChildren: null,
			};
		case "JU":
			return {
				...base,
				insurancePremiums: {
					single: {
						withPension: read.amount(`${PREMIUMS_WITH} célibataires avec cotisations pilier 2/3a`),
						withoutPension: read.amount(`${PREMIUMS_WITH} célibataires sans cotisations pilier 2/3a`),
					},
					married: {
						bothWithPension: read.amount(`${PREMIUMS_WITH} mariées, les deux avec des cotisations au pilier 2/3a`),
						oneWithoutPension: read.amount(`${PREMIUMS_WITH} mariées, une personne sans cotisations pilier 2/3a`),
						bothWithoutPension: read.amount(`${PREMIUMS_WITH} mariées, les deux sans des cotisations au pilier 2/3a`),
					},
					perChild: read.amount(`${PREMIUMS_WITH.replace(", personnes", ", enfant")} mineur`),
				},
				children: [
					byRank(1, 2, read.amount("Déduction pour enfant, 1er et 2ème enfant", "amount")),
					byRank(3, null, read.amount("Déduction enfants dès 3 enfants", "amount")),
				],
				marriedCouple: read.amount("Déduction pour personnes mariées", "amount"),
				singleWithoutChildren: read.amount("Déduction pour contribuables célibataires", "amount"),
				singleWithChildren: read.amount("Déduction pour famille monoparentale", "amount"),
			};
	}
};

/** Règles de l'estimateur pour une année et un canton. */
export function getGrossToTaxableData(year: number, canton: CantonCode): GrossToTaxableData {
	const federal = getFederalData(year);
	if (federal.year !== year) throw new Error(`Données fédérales pour ${federal.year}, estimation demandée pour ${year}.`);
	const social = federal.socialInsurance;
	const deductions = federal.directFederalTaxDeductions;
	if (social === undefined || isTodo(social)) throw new Error(`Cotisations sociales ${year} non relevées (federal/${year}.json).`);
	if (deductions === undefined || isTodo(deductions)) throw new Error(`Déductions IFD ${year} non relevées (federal/${year}.json).`);
	const cantonData = getCantonData(canton);
	if (cantonData.year !== year) throw new Error(`Déductions de ${canton} pour ${cantonData.year}, estimation demandée pour ${year}.`);

	const pension = social.occupationalPension;
	const socialInsurance: SocialInsuranceRules = {
		oldAgeSurvivorsRate: sourced(social.oldAgeSurvivorsEmployeeRate),
		disabilityRate: sourced(social.disabilityEmployeeRate),
		incomeCompensationRate: sourced(social.incomeCompensationEmployeeRate),
		unemploymentRate: sourced(social.unemploymentEmployeeRate),
		accidentMaximumInsuredEarnings: sourced(social.accidentMaximumInsuredEarnings),
		occupationalPension: {
			entryThreshold: sourced(pension.entryThreshold),
			coordinationDeduction: sourced(pension.coordinationDeduction),
			upperSalaryLimit: sourced(pension.upperSalaryLimit),
			minimumCoordinatedSalary: sourced(pension.minimumCoordinatedSalary),
			ageCredits: sourced(pension.ageCredits),
		},
	};

	// IFD : primes augmentées de moitié sans cotisation au 2e pilier ni au 3a (art. 33 al. 1bis let. a)
	const increase = deductions.insurancePremiumsIncreaseWithoutPensionContributions;
	const increased = (amount: { value: number; sourceId: string }): Sourced<number> => ({
		value: amount.value * (1 + increase.value),
		sourceId: increase.sourceId,
	});
	const married = sourced(deductions.insurancePremiumsMarriedMaximum);
	const single = sourced(deductions.insurancePremiumsOtherMaximum);
	const federalRules: DeductionRules = {
		authority: "federal",
		professionalExpenses: sourced(deductions.otherProfessionalExpenses),
		insurancePremiums: {
			single: { withPension: single, withoutPension: increased(single) },
			married: { bothWithPension: married, oneWithoutPension: married, bothWithoutPension: increased(married) },
			perChild: sourced(deductions.insurancePremiumsSupplementPerDependant),
		},
		children: [everyChild(sourced(deductions.perChild))],
		marriedCouple: sourced(deductions.marriedCouple),
		singleWithoutChildren: null,
		singleWithChildren: null,
		dualIncome: sourced(deductions.dualIncome),
	};

	return { socialInsurance, federal: federalRules, cantonal: cantonalRules(canton, cantonData) };
}

/** Règles de l'estimateur pour une page : Confédération, cantons couverts, primes moyennes par canton. */
export function getGrossToTaxableRuleSet(year: number, cantons: readonly CantonCode[]): GrossToTaxableRuleSet {
	const premiums = getFederalData(year).averageHealthInsurancePremiums;
	if (premiums === undefined || isTodo(premiums)) throw new Error(`Primes moyennes ${year} non relevées (federal/${year}.json).`);
	const byCanton = cantons.map((canton) => [canton, getGrossToTaxableData(year, canton)] as const);
	const [, first] = byCanton[0] ?? [];
	if (!first) throw new Error("Aucun canton demandé.");
	return {
		year,
		socialInsurance: first.socialInsurance,
		federal: first.federal,
		cantonal: Object.fromEntries(byCanton.map(([canton, data]) => [canton, data.cantonal])),
		averagePremiums: Object.fromEntries(
			cantons.map((canton) => {
				const entry = premiums[canton];
				return [canton, { value: { adult: entry.value.adult, child: entry.value.child }, sourceId: entry.sourceId }];
			}),
		),
	};
}

