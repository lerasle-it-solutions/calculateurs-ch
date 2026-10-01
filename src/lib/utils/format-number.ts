/**
 * Nombres de la trace du calcul, format suisse romand. Un seul formateur par
 * nombre de décimales, partagé par les modules de calcul.
 */
const formats = new Map<number, Intl.NumberFormat>();

export const formatNumber = (value: number, maximumFractionDigits: number): string => {
	let format = formats.get(maximumFractionDigits);
	if (format === undefined) {
		format = new Intl.NumberFormat("fr-CH", { maximumFractionDigits });
		formats.set(maximumFractionDigits, format);
	}
	return format.format(value);
};
