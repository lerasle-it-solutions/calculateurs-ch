/**
 * Économie d'impôt d'une cotisation 3a ordinaire (OPP 3, RS 831.461.3, art. 7 ;
 * circulaire AFC n° 18a). Fiche A2 validée par le mainteneur le 07.10.2026.
 *
 * Fonction pure : plafonds, taux et identifiants de source arrivent en
 * paramètres (R2). Pour chaque personne, le plafond dépend de l'affiliation à
 * un 2e pilier, pas du statut ; le montant versé au-delà est ramené au plafond.
 * L'économie se calcule sur la somme des déductions, par différence de deux
 * impôts (`computeIncomeTaxSaving`), jamais au taux marginal.
 */
import type { BreakdownLine } from "../../utils/breakdown";
import { formatNumber } from "../../utils/format-number";
import { assertTaxCoverage, type TaxInput, type TaxScales } from "../tax";
import * as labels from "./pillar-3a-tax-saving-labels";
import { computeIncomeTaxSaving } from "./income-tax-saving";

/** Une valeur relevée, avec l'acte qui la fixe. */
export type Sourced<T> = { value: T; sourceId: string };

/** Une personne qui cotise : vous, et votre conjoint ou partenaire pour un couple. */
export type Pillar3aContributor = {
	/** Affiliée à une institution de prévoyance au sens de l'art. 80 LPP, à titre obligatoire ou facultatif. */
	affiliated: boolean;
	/** Revenu de l'activité lucrative (circulaire 18a, ch. 5.5) ; seulement pour une personne non affiliée. */
	earnedIncome: number | null;
	/** Montant versé au pilier 3a pour l'année. */
	contribution: number;
};

export type Pillar3aTaxSavingParams = {
	/** Situation du ménage, revenus imposables avant la déduction 3a calculée ici. */
	taxInput: TaxInput;
	scales: TaxScales;
	/** « Petite » cotisation (art. 7 al. 1 let. a OPP 3). */
	smallContributionCap: Sourced<number>;
	/** « Grande » cotisation (art. 7 al. 1 let. b OPP 3). */
	largeContributionCap: Sourced<number>;
	/** Part du revenu de l'activité lucrative, pour une personne non affiliée (art. 7 al. 1 let. b OPP 3). */
	largeContributionIncomeRate: Sourced<number>;
	/** Revenu soumis à l'AVS l'année du versement, y compris un revenu de remplacement (règle 3). */
	hasAvsIncome: boolean;
	/** Âge de référence AVS atteint (règle 4). */
	reachedReferenceAge: boolean;
	/** Activité lucrative encore exercée, l'âge de référence atteint il y a moins de cinq ans (règle 4). */
	workingWithinFiveYearsOfReferenceAge: boolean;
	/** Une personne, ou deux pour un couple marié ou lié par un partenariat enregistré (règle 6). */
	contributors: Pillar3aContributor[];
	/** Actes qui fondent les règles : l'OPP 3 et la circulaire AFC n° 18a, identifiants du registre. */
	ruleSources: { ordinance: string; circular: string };
};

export type Pillar3aContributorResult = {
	/** Plafond de la déduction de cette personne. */
	cap: number;
	contribution: number;
	/** Montant déductible retenu : le versement, ramené au plafond. */
	deductible: number;
	/** Versement au-delà du plafond : non déductible, à rembourser par la fondation (règle 7). */
	excess: number;
};

export type Pillar3aTaxSavingResult = {
	/** Motif qui exclut toute déduction cette année (règles 3 et 4) ; `null` sinon. */
	blockedReason: string | null;
	contributors: Pillar3aContributorResult[];
	/** Somme des montants déductibles, retranchée des deux revenus imposables. */
	deduction: number;
	/** Somme des excédents. */
	excess: number;
	/** Impôt sur le revenu avant moins après la déduction, composantes arrondies au franc. */
	taxSaving: number;
	cantonalAndMunicipalSaving: number;
	federalSaving: number;
	/** Économie ÷ montant déduit ; `null` sans déduction. */
	effectiveRate: number | null;
	breakdown: BreakdownLine[];
};

const fmt = (value: number): string => formatNumber(value, 2);

/** Arrondi au centime : évite le bruit binaire d'un produit (0,2 × 12 345). */
const toCents = (value: number): number => Math.round(value * 100) / 100;

/** Motif qui exclut toute déduction cette année, dans l'ordre des règles 3 et 4 de la fiche. */
const blockingReasonOf = (params: Pillar3aTaxSavingParams): string | null => {
	if (!params.hasAvsIncome) return labels.NO_AVS_INCOME;
	if (params.reachedReferenceAge && !params.workingWithinFiveYearsOfReferenceAge) return labels.AFTER_REFERENCE_AGE_BLOCKED;
	return null;
};

/**
 * Calcul complet : conditions de l'année, plafond et montant déductible de
 * chaque personne, puis économie d'impôt sur leur somme. Un ménage hors du
 * périmètre du moteur fiscal lève `PartialCoverageError` avant tout autre
 * examen. Sans déduction, l'impôt n'est pas calculé et l'économie est nulle.
 */
export function computePillar3aTaxSaving(params: Pillar3aTaxSavingParams): Pillar3aTaxSavingResult {
	assertTaxCoverage(params.taxInput, params.scales);
	const expected = params.taxInput.maritalStatus === "married" ? 2 : 1;
	if (params.contributors.length !== expected) {
		throw new Error(`${expected} personne(s) attendue(s), ${params.contributors.length} reçue(s).`);
	}
	const { ordinance, circular } = params.ruleSources;
	const small = params.smallContributionCap;
	const large = params.largeContributionCap;
	const rate = params.largeContributionIncomeRate;
	const couple = expected === 2;
	const breakdown: BreakdownLine[] = [];
	const line = (entry: BreakdownLine): void => {
		breakdown.push(entry);
	};

	// Règles 3 et 4 : conditions de l'année
	const blockedReason = blockingReasonOf(params);
	if (blockedReason !== null) {
		line({
			label: labels.DEDUCTION_BLOCKED,
			operands: {},
			formula: blockedReason,
			value: 0,
			unit: "CHF",
			sourceId: params.hasAvsIncome ? ordinance : circular,
		});
	} else if (params.reachedReferenceAge) {
		line({
			label: labels.AFTER_REFERENCE_AGE_ALLOWED,
			operands: {},
			formula: labels.REFERENCE_AGE_WORKING,
			value: 0,
			noAmount: true,
			sourceId: ordinance,
			assumption: labels.AFTER_REFERENCE_AGE_ASSUMPTION,
		});
	}

	// Règles 1, 2 et 7 : plafond et montant déductible de chaque personne
	const contributors = params.contributors.map((contributor, index): Pillar3aContributorResult => {
		if (!Number.isFinite(contributor.contribution) || contributor.contribution < 0) {
			throw new Error(`Versement invalide : ${contributor.contribution}.`);
		}
		const who = couple ? `, ${index === 0 ? labels.CONTRIBUTOR_YOU : labels.CONTRIBUTOR_SPOUSE}` : "";
		let cap = 0;
		if (blockedReason !== null) {
			cap = 0;
		} else if (contributor.affiliated) {
			cap = small.value;
			line({
				label: `Plafond de la déduction${who}`,
				operands: { smallContributionCap: small.value },
				formula: `« petite » cotisation : ${fmt(small.value)}`,
				value: cap,
				unit: "CHF",
				sourceId: small.sourceId,
				assumption: labels.CAP_AFFILIATED_ASSUMPTION,
			});
		} else {
			const income = contributor.earnedIncome ?? 0;
			if (!Number.isFinite(income)) throw new Error(`Revenu de l'activité lucrative invalide : ${income}.`);
			line({
				label: `Revenu de l'activité lucrative${who}`,
				operands: { earnedIncome: income },
				formula: "saisi",
				value: income,
				unit: "CHF",
				sourceId: circular,
				assumption: income > 0 ? labels.EARNED_INCOME_ASSUMPTION : labels.NEGATIVE_EARNED_INCOME_ASSUMPTION,
			});
			if (income > 0) {
				const share = toCents(income * rate.value);
				cap = Math.min(share, large.value);
				line({
					label: `Plafond de la déduction${who}`,
					operands: { earnedIncome: income, rate: rate.value, largeContributionCap: large.value },
					formula: `min(${fmt(income)} × ${fmt(rate.value * 100)} % ; « grande » cotisation ${fmt(large.value)})`,
					value: cap,
					unit: "CHF",
					sourceId: share <= large.value ? rate.sourceId : large.sourceId,
					assumption: labels.CAP_NOT_AFFILIATED_ASSUMPTION,
				});
			}
		}
		const deductible = Math.min(contributor.contribution, cap);
		const excess = toCents(contributor.contribution - deductible);
		if (blockedReason === null) {
			line({
				label: `Montant déductible retenu${who}`,
				operands: { contribution: contributor.contribution, cap },
				formula: `min(versement ${fmt(contributor.contribution)} ; plafond ${fmt(cap)})`,
				value: deductible,
				unit: "CHF",
				sourceId: circular,
				...(excess > 0
					? {
							assumption: `Versement supérieur au plafond : l'excédent de ${fmt(excess)} CHF n'est pas déductible et doit être remboursé par la fondation (circulaire AFC n° 18a, ch. 9.1).`,
						}
					: {}),
			});
		}
		return { cap, contribution: contributor.contribution, deductible, excess };
	});

	// Règle 6 : la déduction d'un couple est la somme des deux
	const deduction = toCents(contributors.reduce((sum, contributor) => sum + contributor.deductible, 0));
	if (couple && blockedReason === null) {
		line({
			label: labels.TOTAL_DEDUCTION,
			operands: Object.fromEntries(contributors.map((contributor, index) => [`deductible${index + 1}`, contributor.deductible])),
			formula: contributors.map((contributor) => fmt(contributor.deductible)).join(" + "),
			value: deduction,
			unit: "CHF",
			sourceId: ordinance,
			assumption: labels.COUPLE_DEDUCTION_ASSUMPTION,
		});
	}

	const saving = computeIncomeTaxSaving(params.taxInput, params.scales, deduction, labels.NO_DEDUCTION);
	const effectiveRate = deduction > 0 ? saving.taxSaving / deduction : null;

	return {
		blockedReason,
		contributors,
		deduction,
		excess: toCents(contributors.reduce((sum, contributor) => sum + contributor.excess, 0)),
		taxSaving: saving.taxSaving,
		cantonalAndMunicipalSaving: saving.cantonalAndMunicipalSaving,
		federalSaving: saving.federalSaving,
		effectiveRate,
		breakdown: [
			...breakdown,
			...saving.breakdown,
			...(effectiveRate !== null
				? [
						{
							label: labels.EFFECTIVE_RATE,
							operands: { taxSaving: saving.taxSaving, deduction },
							formula: `${fmt(saving.taxSaving)} ÷ ${fmt(deduction)}`,
							value: effectiveRate * 100,
							unit: "%",
							sourceId: null,
							assumption: labels.EFFECTIVE_RATE_ASSUMPTION,
						},
					]
				: []),
		],
	};
}
