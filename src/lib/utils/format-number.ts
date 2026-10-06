/**
 * Nombres de la trace du calcul, format suisse romand : le formateur unique de
 * src/lib/format/chf.ts, apostrophe typographique imposée, sans Intl. La trace
 * se lit donc de la même façon dans tous les navigateurs et à la construction.
 */
import { formatSwissNumber } from "../format/chf";

export const formatNumber = (value: number, maximumFractionDigits: number): string =>
	formatSwissNumber(value, maximumFractionDigits);
