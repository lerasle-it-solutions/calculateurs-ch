/**
 * Libellés fixes de la trace d'A4, retrait en capital (capital-withdrawal.ts). Même mécanisme que
 * ../trace-labels.ts : Node lit ce module tel quel ; le navigateur les lira dans le JSON de la page
 * une fois le module déclaré à src/lib/build/browser-trace-labels.ts.
 */

export const SEPARATE_TAXATION = "Imposition séparée du capital";
export const SEPARATE_TAXATION_ASSUMPTION =
	"Le capital de prévoyance est imposé séparément des autres revenus, par un impôt annuel entier fixé pour l'année où il est acquis (art. 38 al. 1 et 1bis LIFD, art. 11 al. 3 LHID). Les déductions sociales ne s'appliquent pas (art. 38 al. 3 LIFD).";
export const PILLAR_3A_ACCOUNT = "Une tranche 3a, un compte 3a entier";
export const PILLAR_3A_ACCOUNT_ASSUMPTION =
	"Le premier retrait rend imposable tout le capital du compte (circulaire AFC n° 18a, ch. 6.2.a). Pour échelonner le pilier 3a, il faut plusieurs comptes.";
export const WITHDRAWAL_WINDOW = "Fenêtre de retrait";
export const WITHDRAWAL_WINDOW_ASSUMPTION =
	"Méthode. Les années du calendrier sont supposées dans la fenêtre de l'art. 3 al. 1 OPP 3 pour le pilier 3a, et admises par le règlement de la caisse pour le capital LPP.";
export const LPP_STEPS = "Étapes du retrait du capital LPP";
export const LPP_STEPS_ASSUMPTION =
	"Une étape regroupe tous les retraits en capital d'une même année civile (art. 13a al. 2 LPP). Le règlement de votre caisse peut admettre un premier retrait plus faible (art. 13a al. 3 LPP) ou imposer un retrait total : vérifiez-le.";
export const SAME_YEAR_TOTAL = "Prestations en capital de l'année, additionnées";
export const SAME_YEAR_TOTAL_LAW = "Règle de la loi cantonale : les prestations en capital d'une même année civile s'additionnent, 2e et 3e piliers compris.";
export const SAME_YEAR_TOTAL_METHOD =
	"Méthode. Aucun article ne le dit en toutes lettres : l'addition découle de l'impôt annuel entier fixé par année fiscale (art. 38 al. 1 et 1bis LIFD).";
export const EXEMPT_TOTAL = "Total de l'année exonéré";
export const CANTONAL_CAPITAL_SCALE = "Impôt cantonal de base, barème des prestations en capital";
export const INCOME_SCALE_ON_CAPITAL = "Impôt du barème du revenu, calculé sur le capital";
export const INCOME_SCALE_ON_CAPITAL_ASSUMPTION = "Barème d'une personne seule, sans diviseur familial.";
export const BASE_TAX_FRACTION = "Impôt cantonal de base, fraction du barème du revenu";
export const BASE_TAX_MINIMUM_RATE = "Impôt cantonal de base, au taux minimal";
export const ANNUITY_AGE = "Âge retenu pour la conversion en rente";
export const ANNUITY_AGE_ASSUMPTION = "Méthode, à confirmer. Âge révolu au versement, augmenté d'un an par année civile.";
export const ANNUITY_FACTOR = "Rente viagère pour le capital de référence";
export const EQUIVALENT_ANNUITY = "Rente annuelle équivalente";
export const RATE_DETERMINING_ANNUITY = "Rente déterminante pour le taux";
export const CANTONAL_RATE_ON_ANNUITY = "Taux du barème cantonal du revenu, lu sur la rente";
export const COMMUNAL_RATE_ON_ANNUITY = "Taux du barème communal, lu sur la rente";
export const BOUNDED_RATE = "Taux retenu, borné";
export const UNBOUNDED_COMMUNAL_RATE = "Taux communal retenu, sans borne";
export const UNBOUNDED_COMMUNAL_RATE_ASSUMPTION = "Variante sans borne sur le taux communal de base : les relevés de Sion trancheront.";
export const BOUNDED_COMMUNAL_RATE_ASSUMPTION = "Variante avec la borne du taux cantonal sur le taux communal de base : les relevés de Sion trancheront.";
export const BASE_TAX_AT_RATE = "Impôt cantonal de base, capital au taux retenu";
export const COMMUNAL_BASE_TAX_AT_RATE = "Impôt communal de base, capital au taux retenu";
export const CANTONAL_TAX = "Impôt cantonal";
export const CANTONAL_TAX_FIXED_RATES = "Taux fixes : le coefficient cantonal annuel ne s'applique pas.";
export const MUNICIPAL_TAX = "Impôt communal";
export const MUNICIPAL_TAX_NOT_LEVIED = "Pas d'impôt communal sur le capital.";
export const CHURCH_TAX = "Impôt paroissial";
export const CHURCH_TAX_NOT_LEVIED = "Pas d'impôt paroissial sur le capital.";
export const FEDERAL_SCALE = "Impôt fédéral selon le barème de l'art. 36 al. 1 LIFD, sur le capital";
export const FEDERAL_FIFTH = "Impôt fédéral direct sur le capital, cinquième du barème";
export const FEDERAL_FIFTH_ASSUMPTION = "Personne seule (art. 36 al. 1 LIFD), sans déduction sociale (art. 38 al. 3 LIFD).";
export const FEDERAL_ROUNDED = "Impôt fédéral direct arrondi";
export const FEDERAL_ROUNDING_METHOD = "Méthode, à confirmer par les relevés. Même arrondi que l'impôt sur le revenu.";
export const FEDERAL_MINIMUM_APPLIED = "Impôt fédéral non perçu sous le montant minimal";
export const FEDERAL_MINIMUM_OPTION =
	"Option retenue pour ce calcul. L'art. 38 al. 2 LIFD ne renvoie pas à l'art. 36 al. 3 ; le relevé de Lausanne à 20 000 CHF tranchera.";
export const YEAR_TOTAL = "Impôt sur le capital de l'année";
export const YEAR_TOTAL_ASSUMPTION = "Méthode. Chaque impôt est arrondi au franc avant l'addition.";
export const SCENARIO = "Retrait en";
export const SCENARIO_ASSUMPTION =
	"Méthode. Années civiles successives à partir de la première année de votre calendrier, barèmes de l'année de calcul pour chaque année. Pour chaque nombre d'années, le calendrier qui coûte le moins d'impôt, comptes 3a entiers et capital LPP réparti au franc près entre ses étapes.";
export const SCENARIO_IMPOSSIBLE = "impossible";
export const OPTIMAL_CALENDAR = "Calendrier optimal";
export const STAGGERING_SAVING = "Économie de l'échelonnement, par rapport à un retrait en une fois";
export const PLAN_EXTRA_TAX = "Impôt de votre calendrier, au-delà du calendrier optimal";
export const HOUSEHOLD_NOT_COVERED =
	"Ce calcul couvre les personnes seules sans enfant. Pour un couple, les retraits des deux époux d'une même année s'additionnent ; pour une famille, des règles cantonales propres s'appliquent.";
