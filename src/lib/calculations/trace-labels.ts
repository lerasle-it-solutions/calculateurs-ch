/**
 * Libellés fixes de la trace du calcul (R4) : libellés, hypothèses et mentions
 * sans valeur insérée, utilisés par le moteur fiscal et par A1.
 *
 * Côté Node (construction, tests), ce module sert tel quel. Dans le navigateur,
 * le plugin `browserTraceLabels` (src/lib/build/browser-trace-labels.ts) le
 * remplace par un module qui lit les mêmes chaînes dans le JSON de la page
 * (`TraceLabels.astro`) : le script ne les embarque pas, ce qui allège le
 * JavaScript de chaque calculateur. Les libellés qui insèrent une valeur
 * restent dans le code qui les compose.
 *
 * Une constante par libellé, exportée seule : le paquet du navigateur en
 * raccourcit le nom. Ajouter un libellé ici suffit, la page et le module du
 * navigateur suivent.
 */

// Moteur fiscal (tax.ts)
export const ZERO_BASE = "assiette nulle";
export const ZERO_RATE_INCOME = "revenu déterminant pour le taux nul";
export const FEDERAL_SITUATION_MARRIED = "époux vivant en ménage commun";
export const FEDERAL_SITUATION_WITH_DEPENDANTS = "contribuable veuf, séparé, divorcé ou célibataire vivant en ménage commun avec des enfants ou des personnes nécessiteuses dont il assume pour l'essentiel l'entretien";
export const FEDERAL_SITUATION_OTHER = "autre contribuable";
export const FEDERAL_SCALE = "Barème de l'impôt fédéral direct";
export const FEDERAL_MAXIMUM_RATE = "Taux maximal de l'impôt fédéral direct";
export const FEDERAL_REDUCTION_PER_DEPENDANT = "Réduction de l'impôt fédéral par enfant et par personne nécessiteuse";
export const FEDERAL_TAX_ROUNDING = "Arrondi de l'impôt fédéral direct";
export const FEDERAL_MINIMUM_LEVIED_TAX = "Montant minimal perçu de l'impôt fédéral direct";
export const SPOUSES_LIVE_TOGETHER = "Les époux vivent en ménage commun.";
export const FEDERAL_SCALE_APPLIED = "Barème de l'impôt fédéral direct applicable";
export const FEDERAL_TAX_PER_SCALE = "Impôt fédéral direct selon le barème";
export const FEDERAL_TAX_AFTER_REDUCTION = "Impôt fédéral direct après réduction pour enfants et personnes nécessiteuses";
export const REDUCTION_NOT_NEGATIVE = "La réduction ne rend pas l'impôt négatif.";
export const FEDERAL_TAX_ROUNDED = "Impôt fédéral direct arrondi";
export const FEDERAL_ROUNDING_ASSUMPTION = "Arrondi retenu d'après les cas de référence ; aucune base identifiée dans la LIFD.";
export const FEDERAL_TAX_NOT_LEVIED = "Impôt fédéral direct non perçu";
export const CANTONAL_INCOME_ROUNDING = "Arrondi du revenu imposable cantonal";
export const WEALTH_ROUNDING = "Arrondi de la fortune imposable";
export const CANTONAL_INCOME_RETAINED = "Revenu imposable cantonal retenu";
export const WEALTH_RETAINED = "Fortune imposable retenue";
export const CANTONAL_INCOME_SCALE = "Barème cantonal du revenu";
export const CANTONAL_WEALTH_SCALE = "Barème cantonal de la fortune";
export const CANTONAL_FAMILY_MODEL = "Modèle familial cantonal";
export const FAMILY_REDUCTION_HOUSEHOLDS = "Ménages ayant droit à l'abattement familial";
export const FAMILY_TAX_REDUCTION = "Abattement familial sur l'impôt";
export const SPLITTING_HOUSEHOLDS = "Ménages soumis au splitting";
export const FAMILY_QUOTIENT_COEFFICIENTS = "Coefficients du quotient familial";
export const FAMILY_QUOTIENT_CHILD_CAP = "Plafond de la réduction pour enfants du quotient familial";
export const FAMILY_DIVISOR = "Diviseur familial";
export const CANTONAL_INCOME_INDEXATION = "Indexation du barème cantonal du revenu";
export const FAMILY_REDUCTION_ASSUMPTION = "L'abattement porte sur l'impôt sur le revenu selon le barème, avant le coefficient ; autorité parentale commune non examinée.";
export const RATE_DETERMINING_INCOME = "Revenu déterminant pour le taux";
export const CANTONAL_TAX_NOUN = "impôt cantonal";
export const BASE_CANTONAL_INCOME_TAX = "Impôt cantonal de base sur le revenu";
export const CHILD_CAP_REFERENCE_ASSUMPTION = "La réduction de référence se calcule avec les parts du ménage du contribuable.";
export const CHILD_REDUCTION_CAP = "Plafond de la réduction pour enfants";
export const BASE_CANTONAL_INCOME_TAX_CAPPED = "Impôt cantonal de base sur le revenu, réduction pour enfants plafonnée";
export const CHILD_REDUCTION_CAP_SEVERAL = "Plafond de la réduction pour plusieurs enfants";
export const BASE_CANTONAL_WEALTH_TAX = "Impôt cantonal de base sur la fortune";
export const BASE_TAX_REDUCTION = "Réduction de l'impôt cantonal de base";
export const WEALTH_NOUN = "la fortune";
export const UNREDUCED_MULTIPLIER = "Part du coefficient cantonal hors réduction";
export const CANTONAL_TAX = "Impôt cantonal";
export const SUPPLEMENTARY_WEALTH_TAX = "Impôt supplémentaire sur la fortune";
export const SUPPLEMENTARY_WEALTH_TAX_ASSUMPTION = "Aucun coefficient ni réduction ne s'applique à cet impôt ; il s'ajoute à l'impôt cantonal.";
export const TAX_CREDIT_PER_CHILD = "Rabais d'impôt par enfant";
export const CANTONAL_INCOME_TAX_AFTER_CREDIT = "Impôt cantonal sur le revenu après rabais pour enfants";
export const TAX_CREDIT_ASSUMPTION = "Le rabais se déduit de l'impôt cantonal sur le revenu, coefficient cantonal appliqué, sans le rendre négatif ; chaque enfant déclaré y ouvre droit.";
export const MUNICIPAL_TAX = "Impôt communal";
export const MUNICIPAL_MULTIPLIER_ASSUMPTION = "Le coefficient communal s'applique à l'impôt cantonal de base non réduit.";
export const COMMUNAL_INCOME_SCALE = "Barème communal du revenu";
export const COMMUNAL_INCOME_INDEXATION = "Indexation du barème communal du revenu";
export const MUNICIPAL_TAX_NOUN = "impôt communal";
export const BASE_COMMUNAL_INCOME_TAX = "Impôt communal de base sur le revenu";
export const COMMUNAL_WEALTH_SCALE = "Barème communal de la fortune";
export const COMMUNAL_TAX_PER_SCALE = "Impôt communal selon le barème communal";
export const MAXIMUM_TAX_BURDEN = "Charge fiscale maximale";
export const MAXIMUM_TAX_BURDEN_ASSUMPTION = "Le revenu déterminant du plafond vaut au moins le revenu imposable ; en deçà, le plafond ne peut pas jouer.";
export const CHURCH_TAX = "Impôt paroissial";
export const CHURCH_MULTIPLIER_ASSUMPTION = "Le coefficient paroissial s'applique à l'impôt cantonal de base non réduit.";
export const PERSONAL_TAX = "Taxe personnelle";
export const FLAT_AMOUNT = "montant forfaitaire";
export const PERSONAL_TAX_ASSUMPTION = "Montant forfaitaire par contribuable ou par couple, sans examen des cas d'exemption.";
export const TOTAL_TAX = "Impôt total";
export const MARGINAL_RATE = "Taux marginal sur le revenu imposable";
export const TAX_SAVING = "Économie d'impôt";

// A1 — rachat rétroactif du pilier 3a (pension/pillar-3a-buyback.ts)
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
export const INCOME_ONLY_TOTALS_ASSUMPTION = "Montants arrondis au franc ; l'impôt sur la fortune ne change pas (hypothèse 6).";
export const NOTHING_TO_BUY_BACK = "aucun montant rachetable";
export const TAX_SAVING_CANTONAL_AND_MUNICIPAL = "Économie d'impôt, canton et commune";
export const TAX_SAVING_FEDERAL = "Économie d'impôt, Confédération";
