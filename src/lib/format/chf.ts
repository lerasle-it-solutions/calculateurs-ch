/**
 * Formateur suisse unique des nombres et montants, à la construction et dans
 * le navigateur.
 *
 * Le séparateur de milliers est imposé ici, l'apostrophe typographique
 * « ’ » (7’373, 36’864), sans passer par Intl : selon la version de son ICU,
 * Node sépare les milliers en fr-CH par une apostrophe droite (Node 24) ou par
 * une espace fine (Node 22). La virgule décimale suit l'usage fr-CH d'Intl
 * (« 1,8 »).
 *
 * Sert aussi dans le navigateur (affichage et trace d'A1), décision de l'étape 0
 * de W08 : la même chaîne à la construction et à l'écran, quel que soit le
 * navigateur.
 */

/** Séparateur de milliers : apostrophe typographique. */
export const THOUSANDS_SEPARATOR = "’";

/** Nombre à la suisse, au plus `maximumFractionDigits` décimales, zéros finaux retirés. */
export function formatSwissNumber(value: number, maximumFractionDigits = 0): string {
	if (!Number.isFinite(value)) throw new Error(`Nombre attendu, obtenu ${value}.`);
	const factor = 10 ** maximumFractionDigits;
	const rounded = Math.round(Math.abs(value) * factor) / factor;
	const [integer = "0", fraction = ""] = rounded.toFixed(maximumFractionDigits).split(".");
	const decimals = fraction.replace(/0+$/, "");
	const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, THOUSANDS_SEPARATOR);
	const sign = value < 0 && rounded !== 0 ? "-" : "";
	return `${sign}${grouped}${decimals ? `,${decimals}` : ""}`;
}

/** Montant en francs, arrondi au franc : 7’373. */
export const formatChf = (value: number): string => formatSwissNumber(value, 0);

/** Taux en pour-cent, espace insécable avant « % » : 0,2 → 20 %. */
export const formatPercent = (rate: number, maximumFractionDigits = 2): string =>
	`${formatSwissNumber(rate * 100, maximumFractionDigits)} %`;
