/**
 * Conversion des barèmes exportés en largeurs de tranches (colonne « Pour les
 * prochains CHF », Jura) vers la forme commune : seuils cumulés et montants de
 * base. Le moteur ne connaît jamais le format d'un export.
 */

/** Largeur sentinelle de l'export : dernière tranche, sans borne supérieure. */
export const OPEN_ENDED_WIDTH = 9_999_999_999;

export type WidthRow = { width: number; ratePercent: number };
export type Bracket = { threshold: number; ratePercent: number; baseAmount: number };

/**
 * Arrondi à huit décimales, pour les taux comme pour les montants calculés. Il
 * ne vise que les artefacts de virgule flottante (0,1 + 0,2 = 0,30000000000000004),
 * jamais la précision publiée : l'AFC publie au plus cinq décimales, et une
 * largeur entière × un taux à cinq décimales / 100 en compte au plus sept.
 */
export const ROUNDING_DECIMALS = 8;
const ROUNDING_FACTOR = 10 ** ROUNDING_DECIMALS;
export const roundPublished = (value: number): number => Math.round(value * ROUNDING_FACTOR) / ROUNDING_FACTOR;

/**
 * Chaque tranche commence où finit la précédente ; son montant de base est
 * l'impôt cumulé des tranches précédentes. La dernière ligne doit porter la
 * largeur sentinelle.
 */
export const bracketsFromWidths = (rows: readonly WidthRow[]): Bracket[] => {
	if (rows.length === 0) throw new Error("barème vide");
	rows.forEach((row, index) => {
		const isLast = index === rows.length - 1;
		if (isLast && row.width !== OPEN_ENDED_WIDTH) {
			throw new Error(`dernière tranche de largeur ${row.width}, ${OPEN_ENDED_WIDTH} attendue`);
		}
		if (!isLast && (row.width === OPEN_ENDED_WIDTH || row.width <= 0)) {
			throw new Error(`largeur de tranche invalide en ligne ${index + 1} : ${row.width}`);
		}
	});

	let threshold = 0;
	let baseAmount = 0;
	return rows.map((row) => {
		const bracket = { threshold, ratePercent: row.ratePercent, baseAmount: roundPublished(baseAmount) };
		threshold += row.width;
		baseAmount += (row.width * row.ratePercent) / 100;
		return bracket;
	});
};
