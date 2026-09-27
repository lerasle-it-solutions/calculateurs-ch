/**
 * Une ligne de la trace du calcul (R4), rendue par `CalculationBreakdown.astro`.
 *
 * Chaque étape porte un libellé lisible par un contribuable, l'opération
 * réellement effectuée avec ses opérandes, le résultat intermédiaire, la source
 * de la valeur appliquée et, le cas échéant, l'hypothèse retenue.
 */
export interface BreakdownLine {
	/** Libellé français, p. ex. « Impôt cantonal de base sur le revenu ». */
	label: string;
	/** Opérandes de l'étape, nommés. */
	operands: Record<string, number>;
	/** Calcul réellement effectué, p. ex. « 12 345 × 1,24 ». */
	formula: string;
	/** Résultat intermédiaire. */
	value: number;
	unit?: string;
	/** Identifiant présent dans le registre des sources. */
	sourceId: string;
	/** Hypothèse retenue pour cette étape, s'il y en a une. */
	assumption?: string;
}
