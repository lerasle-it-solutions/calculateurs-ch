/**
 * Libellés fixes de la trace d'A1, rachat rétroactif du pilier 3a (pillar-3a-buyback.ts). Même mécanisme que
 * ../trace-labels.ts : Node lit ce module tel quel, le navigateur les lit dans
 * le JSON de la page (src/lib/build/browser-trace-labels.ts).
 */

export const OLD_AGE_BENEFIT_RECEIVED = "Une prestation de vieillesse a été perçue : aucun rachat n'est possible (art. 7a al. 4 OPP 3).";
export const BUYBACK_GAP_YEARS = "Années de lacune rachetables";
export const GAPS_BEFORE_FIRST_YEAR = "Les lacunes antérieures à la première année de lacune rachetable ne le sont jamais (disposition transitoire).";
export const AGE_LIMIT_NOT_EXAMINED = "Limite d'âge non examinée";
export const AGE_LIMIT_REFERENCE = "art. 7a al. 5 OPP 3, qui renvoie à l'art. 7 al. 3 : non traité par ce calcul";
export const AGE_LIMIT_ASSUMPTION = "La limite d'âge du rachat doit être vérifiée à part.";
export const BUYBACK_BLOCKED = "Rachat impossible l'année du rachat";
export const NOT_BUYABLE = "non rachetable";
export const LAST_YEAR_FILLED_WHOLE = "Dernière année de rachat de cette lacune : comblée en priorité, entière.";
export const YEAR_FILLED_WHOLE = "Année comblée entièrement : ensemble d'années entières le plus élevé sous le plafond restant, les années qui expirent le plus tôt en priorité à égalité.";
export const CAP_ON_YEAR_TOTAL = "Le plafond s'applique au total des rachats de l'année, et non à chaque lacune (art. 7a al. 2 OPP 3).";
export const NOTHING_TO_BUY_BACK = "aucun montant rachetable";
export const INCOME_ONLY_TOTALS_ASSUMPTION = "Montants arrondis au franc ; l'impôt sur la fortune ne change pas (hypothèse 6).";
