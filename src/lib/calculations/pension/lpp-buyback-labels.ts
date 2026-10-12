/**
 * Libellés fixes de la trace d'A3, rachat dans la prévoyance professionnelle (lpp-buyback.ts). Même mécanisme que
 * ../trace-labels.ts : Node lit ce module tel quel ; le navigateur les lira dans
 * le JSON de la page une fois le module déclaré à src/lib/build/browser-trace-labels.ts.
 */

export const UNREPAID_HOME_OWNERSHIP_WITHDRAWAL =
	"Un versement anticipé pour la propriété du logement n'a pas été remboursé : aucun rachat facultatif n'est possible avant son remboursement (art. 79b al. 3 LPP). Exception : lorsque le remboursement n'est plus admis (art. 30d al. 3 let. a LPP), le règlement de la caisse peut permettre des rachats (art. 60d OPP 2). Interrogez votre caisse de pension.";
export const BUYBACK_AMOUNT = "Montant du rachat";
export const BUYBACK_AMOUNT_ASSUMPTION = "Montant envisagé, sous le potentiel de rachat indiqué par la caisse (art. 79b al. 1 LPP).";
export const NOTHING_TO_BUY_BACK = "aucun rachat";
export const INCOME_ONLY_TOTALS_ASSUMPTION = "Montants arrondis au franc ; l'impôt sur la fortune ne change pas.";
export const NOT_DEDUCTED = "Part du rachat non déduite";
export const SCENARIO_ASSUMPTION =
	"Tranches égales en francs entiers, la dernière absorbant le reste, versées des années successives à partir de l'année de calcul. Chaque tranche est calculée sur le revenu imposable et les barèmes de l'année de calcul : revenu, barèmes et potentiel sont supposés constants.";
export const SCENARIO_TOTAL = "Économie totale de l'échelonnement";
export const SCENARIO_DIFFERENCE = "Écart avec le rachat en une fois";
export const LOCK_PERIOD = "Délai de blocage des prestations en capital après un rachat";
/** Hypothèse de la ligne du délai, autour du délai des données (en années). */
export const LOCK_PERIOD_ASSUMPTION_START =
	"Le calcul raisonne en années civiles. Le délai se compte à partir de la date de chaque versement : si l'écart est de ";
export const LOCK_PERIOD_ASSUMPTION_END = " ans, vérifiez la date exacte auprès de votre caisse.";
export const NOT_DEDUCTED_ASSUMPTION =
	"Le calculateur ne fait pas descendre le revenu imposable sous zéro et ne compte aucune économie pour la part du rachat qui le dépasse ; le résultat signale cette part.";
export const LOCK_COMPATIBLE = "compatible";
export const LOCK_CHECK_EXACT_DATE = "à vérifier jour pour jour";
export const LOCK_WITHIN = "dans le délai";
