/**
 * Économie d'impôt sur le revenu d'une déduction du pilier 3a, commune à A1
 * (rachat rétroactif) et A2 (cotisation ordinaire).
 *
 * Par différence de deux impôts totaux, la déduction retranchée des deux
 * revenus imposables (`computeTaxSavingOnDeduction`), jamais par taux marginal.
 * Totaux et économie se calculent sur les composantes arrondies au franc,
 * telles qu'affichées ; l'impôt sur la fortune, inchangé, est omis. Sans
 * déduction, l'impôt n'est pas calculé et l'économie est nulle.
 */
import type { BreakdownLine } from "../../utils/breakdown";
import { formatNumber } from "../../utils/format-number";
import { computeTaxSavingOnDeduction, type TaxInput, type TaxResult, type TaxScales } from "../tax";
import * as labels from "../trace-labels";

export type IncomeTaxSaving = {
	/** Impôt sur le revenu avant moins après la déduction, composantes arrondies au franc. */
	taxSaving: number;
	/** Part cantonale, communale et paroissiale de l'économie. */
	cantonalAndMunicipalSaving: number;
	/** Part de l'impôt fédéral direct. */
	federalSaving: number;
	/** Trace : impôts avant et après la déduction, puis l'économie et ses deux parts. */
	breakdown: BreakdownLine[];
};

const fmt = (value: number): string => formatNumber(value, 2);

const TAX_COMPONENTS = ["cantonalTax", "municipalTax", "churchTax", "personalTax", "federalTax"] as const;

/**
 * Composantes de l'impôt sur le revenu, chacune arrondie au franc comme dans la
 * trace affichée, et leur somme ; sans calcul d'impôt, des zéros.
 */
const roundedIncomeTax = (tax: TaxResult | undefined) => {
	const components = Object.fromEntries(TAX_COMPONENTS.map((key) => [key, Math.round(tax?.[key] ?? 0)]));
	return { components, total: Object.values(components).reduce((sum, amount) => sum + amount, 0) };
};

/**
 * Textes propres au calculateur : `noDeduction`, la formule de la ligne
 * « Économie d'impôt » quand la déduction est nulle (« aucun montant
 * rachetable », « aucune déduction ») ; `incomeOnlyTotals`, l'hypothèse des
 * totaux sur le seul impôt sur le revenu, qui renvoie à la liste d'hypothèses
 * du calculateur.
 */
export type IncomeTaxSavingTexts = { noDeduction: string; incomeOnlyTotals: string };

export function computeIncomeTaxSaving(
	taxInput: TaxInput,
	scales: TaxScales,
	deduction: number,
	texts: IncomeTaxSavingTexts,
): IncomeTaxSaving {
	const saving = deduction > 0 ? computeTaxSavingOnDeduction(taxInput, scales, deduction) : undefined;
	const before = roundedIncomeTax(saving?.before);
	const after = roundedIncomeTax(saving?.after);
	const taxSaving = before.total - after.total;
	const federalBefore = before.components.federalTax!;
	const federalAfter = after.components.federalTax!;
	const federalSaving = federalBefore - federalAfter;
	const cantonalAndMunicipalSaving = taxSaving - federalSaving;

	const lines: BreakdownLine[] = [];
	for (const line of saving?.breakdown ?? []) {
		// Impôt sur une fortune nulle : sans objet, la fortune n'est pas saisie
		if (line.formula === labels.ZERO_BASE && line.label.includes("fortune")) continue;
		if (line.label === labels.TAX_SAVING) continue;
		if (line.label.startsWith(labels.TOTAL_TAX)) {
			const { components, total } = line.label === labels.TOTAL_TAX ? before : after;
			lines.push({
				label: `Impôt sur le revenu (hors impôt sur la fortune)${line.label.slice(labels.TOTAL_TAX.length)}`,
				operands: components,
				formula: Object.values(components).map(fmt).join(" + "),
				value: total,
				unit: "CHF",
				sourceId: null,
				assumption: texts.incomeOnlyTotals,
			});
		} else lines.push(line);
	}

	return {
		taxSaving,
		cantonalAndMunicipalSaving,
		federalSaving,
		breakdown: [
			...lines,
			{
				label: labels.TAX_SAVING,
				operands: { totalTaxBefore: before.total, totalTaxAfter: after.total, deduction },
				formula: saving ? `${fmt(before.total)} − ${fmt(after.total)}` : texts.noDeduction,
				value: taxSaving,
				unit: "CHF",
				sourceId: null,
			},
			...(saving
				? [
						{
							label: labels.TAX_SAVING_CANTONAL_AND_MUNICIPAL,
							operands: { taxSaving, federalSaving },
							formula: `${fmt(taxSaving)} − ${fmt(federalSaving)}`,
							value: cantonalAndMunicipalSaving,
							unit: "CHF",
							sourceId: null,
						},
						{
							label: labels.TAX_SAVING_FEDERAL,
							operands: { federalTaxBefore: federalBefore, federalTaxAfter: federalAfter },
							formula: `${fmt(federalBefore)} − ${fmt(federalAfter)}`,
							value: federalSaving,
							unit: "CHF",
							sourceId: null,
						},
					]
				: []),
		],
	};
}
