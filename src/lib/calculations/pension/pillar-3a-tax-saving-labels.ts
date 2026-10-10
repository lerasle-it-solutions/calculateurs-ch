/**
 * Libellés fixes de la trace d'A2, économie d'impôt d'une cotisation 3a (pillar-3a-tax-saving.ts). Même mécanisme que
 * ../trace-labels.ts : Node lit ce module tel quel, le navigateur les lit dans
 * le JSON de la page (src/lib/build/browser-trace-labels.ts).
 */

export const NO_DEDUCTION = "aucune déduction";
export const DEDUCTION_BLOCKED = "Aucune déduction possible cette année";
export const NO_AVS_INCOME = "Aucun revenu soumis à l'AVS cette année : aucune cotisation 3a n'est déductible (circulaire AFC n° 18a, ch. 3 et 5.1).";
export const AFTER_REFERENCE_AGE_BLOCKED = "Âge de référence atteint, sans activité lucrative ou depuis cinq ans ou plus : aucune cotisation 3a n'est déductible (art. 7 al. 3 OPP 3).";
export const AFTER_REFERENCE_AGE_ALLOWED = "Cotisation après l'âge de référence";
export const AFTER_REFERENCE_AGE_ASSUMPTION = "Activité lucrative exercée, moins de cinq ans après l'âge de référence : la cotisation reste possible (art. 7 al. 3 OPP 3). L'activité est à prouver chaque année (circulaire AFC n° 18a, ch. 3).";
export const REFERENCE_AGE_WORKING = "activité lucrative exercée, âge de référence atteint il y a moins de cinq ans";
export const CONTRIBUTOR_YOU = "vous";
export const CONTRIBUTOR_SPOUSE = "votre conjoint ou partenaire";
export const CAP_AFFILIATED_ASSUMPTION = "Affilié à une institution de prévoyance (art. 80 LPP), à titre obligatoire ou facultatif : « petite » cotisation (art. 7 al. 1 let. a OPP 3).";
export const CAP_NOT_AFFILIATED_ASSUMPTION = "Non affilié à un 2e pilier : une part du revenu de l'activité lucrative, au plus la « grande » cotisation (art. 7 al. 1 let. b OPP 3).";
export const EARNED_INCOME_ASSUMPTION = "Revenu de l'activité lucrative au sens de la circulaire AFC n° 18a, ch. 5.5 : salaire brut moins les cotisations AVS, AI, APG et AC ; pour un indépendant, résultat après rectifications fiscales, moins les cotisations AVS, AI et APG.";
export const NEGATIVE_EARNED_INCOME_ASSUMPTION = "Revenu de l'activité lucrative nul ou négatif : aucune déduction (circulaire AFC n° 18a, ch. 5.5).";
export const COUPLE_DEDUCTION_ASSUMPTION = "Chaque conjoint ou partenaire a sa propre déduction, selon sa propre affiliation (art. 7 al. 2 OPP 3) et ses propres conditions (circulaire AFC n° 18a, ch. 3 ; art. 7 al. 3 OPP 3) ; l'économie porte sur leur somme.";
export const TOTAL_DEDUCTION = "Déduction totale";
export const EFFECTIVE_RATE = "Économie rapportée au montant déduit";
export const EFFECTIVE_RATE_ASSUMPTION = "Taux effectif de ce versement : un résultat, pas une méthode. L'économie elle-même se calcule par différence de deux impôts.";
export const PERSON_YOU = "Vous";
export const PERSON_SPOUSE = "Votre conjoint ou partenaire";
export const INCOME_ONLY_TOTALS_ASSUMPTION = "Montants arrondis au franc ; l'impôt sur la fortune ne change pas.";
