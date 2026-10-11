/**
 * Libellés fixes de la trace de l'estimateur du revenu imposable
 * (gross-to-taxable.ts). Même mécanisme que ./trace-labels.ts : Node lit ce
 * module tel quel, le navigateur les lit dans le JSON de la page
 * (src/lib/build/browser-trace-labels.ts).
 */

export const GROSS_SALARY = "Salaire brut";
export const OLD_AGE_SURVIVORS = "Cotisation AVS";
export const DISABILITY = "Cotisation AI";
export const INCOME_COMPENSATION = "Cotisation APG";
export const UNEMPLOYMENT = "Cotisation à l'assurance-chômage";
export const NON_OCCUPATIONAL_ACCIDENT = "Prime de l'assurance-accidents non professionnelle";
export const OCCUPATIONAL_PENSION = "Cotisation à la prévoyance professionnelle (LPP)";
export const NET_EARNED_INCOME = "Revenu net du travail";
export const PROFESSIONAL_EXPENSES = "Frais professionnels forfaitaires";
export const INSURANCE_PREMIUMS = "Déduction des primes d'assurance";
export const CHILDREN = "Déductions pour enfants";
export const MARRIED_COUPLE = "Déduction pour couple marié";
export const SINGLE_TAXPAYER = "Déduction pour personne seule";
export const SINGLE_PARENT = "Déduction pour famille monoparentale";
export const DUAL_INCOME = "Déduction pour double revenu";
export const FEDERAL_TAXABLE_INCOME = "Revenu imposable fédéral estimé";
export const CANTONAL_TAXABLE_INCOME = "Revenu imposable cantonal estimé";
export const FEDERAL = "Confédération";
export const CANTON = "canton";

export const AFC_CHAIN_ASSUMPTION = "Valeur par défaut identique à celle du calculateur fédéral de l'AFC ; modifiable.";
export const USER_VALUE = "Valeur saisie.";
/** Hypothèse LPP par défaut, en deux parties autour du salaire maximal assuré, lu dans les données. */
export const LPP_DEFAULT_ASSUMPTION_START =
	"Minimum légal : moitié de la bonification de vieillesse de l'art. 16 LPP sur le salaire coordonné. Le minimum légal est souvent dépassé, surtout au-delà de";
export const LPP_DEFAULT_ASSUMPTION_END = "CHF de salaire : reportez le montant de votre fiche de salaire.";
export const NO_TRANSPORT_MEALS_CHILDCARE =
	"Aucuns frais de transport, de repas ni de garde ; frais professionnels forfaitaires pour une activité à plein temps sur toute l'année.";
export const NO_DEDUCTION_IN_DATA = "aucune déduction de ce type dans les données";
export const ESTIMATE = "Estimation : chaîne de déductions reproduite d'après celle du calculateur de l'AFC, avec les hypothèses déclarées.";
