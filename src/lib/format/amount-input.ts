/**
 * Saisie tolérante des nombres (docs/design-system.md § 2.3) : NumberField est
 * un `<input type="text" inputmode="decimal">`, que `type="number"` ne
 * permettait pas (il n'affiche pas l'apostrophe). Ce module lit les formes
 * suisses courantes, valide bornes et pas à la place du navigateur, et formate
 * un montant pendant la frappe sans déplacer le curseur.
 *
 * Sans DOM : la construction lit les saisies du cas exemple, le navigateur
 * celles du visiteur, avec le même code.
 */
import { THOUSANDS_SEPARATOR } from "./chf";

/** Séparateurs de milliers acceptés : apostrophes droite et typographique, espaces ordinaire, insécable et fine insécable. */
const GROUPING = /['’   ]/g;

/** Nombre partiel : signe, chiffres et séparateurs de milliers, au plus une partie décimale. */
const PARTIAL = /^-?[\d'’   ]*(?:[.,]\d*)?$/;

/** Nombre saisi ; `null` si la saisie est vide, `NaN` si elle n'est pas un nombre. */
export function parseNumber(text: string): number | null {
	const trimmed = text.trim();
	if (trimmed === "") return null;
	const compact = trimmed.replace(GROUPING, "");
	return /^-?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(compact) ? Number(compact.replace(",", ".")) : Number.NaN;
}

export type NumberConstraints = { min?: number; max?: number; step?: number };
export type NumberError = "invalid" | "min" | "max" | "step";

/**
 * Erreur d'une saisie, ou `null` si elle est vide ou conforme. Le pas part du
 * minimum, comme l'attribut `step` natif.
 */
export function numberError(text: string, { min, max, step }: NumberConstraints): NumberError | null {
	const value = parseNumber(text);
	if (value === null) return null;
	if (Number.isNaN(value)) return "invalid";
	if (min !== undefined && value < min) return "min";
	if (max !== undefined && value > max) return "max";
	if (step !== undefined && step > 0) {
		const steps = (value - (min ?? 0)) / step;
		if (Math.abs(steps - Math.round(steps)) > 1e-9) return "step";
	}
	return null;
}

/** Signe, chiffre ou séparateur décimal : ce qui compte pour placer le curseur. */
const significant = (char: string) => /[-\d.,]/.test(char);

/**
 * Saisie reformatée pendant la frappe : milliers groupés par l'apostrophe
 * typographique si `grouping` (montant), le curseur placé après le même chiffre
 * qu'avant. Une saisie qui n'est pas un nombre partiel reste intacte : le
 * message d'erreur du champ la signale.
 */
export function formatNumberTyping(text: string, caret: number, grouping: boolean): { text: string; caret: number } {
	if (!grouping || !PARTIAL.test(text)) return { text, caret };
	const before = [...text.slice(0, caret)].filter(significant).length;
	const compact = text.replace(GROUPING, "");
	const [, sign = "", integer = "", fraction = ""] = compact.match(/^(-?)(\d*)([.,]\d*)?$/) ?? [];
	const formatted = sign + integer.replace(/\B(?=(\d{3})+(?!\d))/g, THOUSANDS_SEPARATOR) + fraction;
	let position = 0;
	for (let seen = 0; position < formatted.length && seen < before; position++) {
		if (significant(formatted[position]!)) seen++;
	}
	return { text: formatted, caret: position };
}
