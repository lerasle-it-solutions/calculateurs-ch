/**
 * Ce que la carte résultat dit sous le chiffre (docs/design-system.md § 4.4) :
 * la part du montant retenu par le moteur (montant déductible, jamais la somme
 * saisie, arbitrage du 17.10.2026) que représente l'économie, le coût net de l'année,
 * et la décomposition par impôt — une ligne par impôt que le moteur calcule
 * séparément, jamais de ligne à zéro. Mise en forme seulement : économie et
 * composantes viennent du moteur (`computeTaxSavingOnDeduction`, décision
 * n° 11) ; part et coût net entrent dans la trace (R4). Sans DOM.
 */
import { formatSwissNumber } from "../format/chf";
import { formatChfAmount } from "./amounts";
import type { BreakdownRow } from "./pillar-3a-buyback";

/** Impôts dans l'ordre d'affichage : canton, commune, paroisse, taxe personnelle, Confédération. */
export const TAX_COMPONENTS = ["cantonalTax", "municipalTax", "churchTax", "personalTax", "federalTax"] as const;
export type TaxComponent = (typeof TAX_COMPONENTS)[number];

/**
 * Chiffres du moteur : montant retenu (déduit), économie, économie par impôt au franc ;
 * `entered`, la somme saisie quand elle peut différer du montant retenu (plafond 3a).
 */
export type ResultFigures = { paid: number; saving: number; components: Record<TaxComponent, number>; entered?: number };

export type ResultSummary = {
	/** Montant retenu par le moteur : la base de la part et du coût net. */
	paid: string;
	/** Vrai si la somme saisie dépasse le montant retenu : la phrase nomme alors sa base. */
	capped: boolean;
	/** « 26 % ». */
	share: string;
	netCost: string;
	components: { key: TaxComponent; amount: string }[];
};

export type SummaryTexts = { shareLabel: string; netCostLabel: string };

const percent = (figures: ResultFigures) => `${formatSwissNumber((figures.saving / figures.paid) * 100)} %`;

/** Résumé d'un résultat ; `null` sans montant versé. */
export function resultSummary(figures: ResultFigures): ResultSummary | null {
	if (!(figures.paid > 0)) return null;
	return {
		paid: formatChfAmount(figures.paid),
		capped: figures.entered !== undefined && figures.entered !== figures.paid,
		share: percent(figures),
		netCost: formatChfAmount(figures.paid - figures.saving),
		components: TAX_COMPONENTS.filter((key) => figures.components[key] !== 0).map((key) => ({ key, amount: formatChfAmount(figures.components[key]) })),
	};
}

/** Phrase de la carte : « {share} », « {paid} », « {netCost} » remplacés par le résumé. */
export const fillSummary = (template: string, summary: ResultSummary): string =>
	template.replace(/\{(share|paid|netCost)\}/g, (_, key: "share" | "paid" | "netCost") => summary[key]);

/** Lignes de la trace : part du versement, puis coût net de l'année, avec l'opération effectuée. */
export function summaryRows(figures: ResultFigures, texts: SummaryTexts): BreakdownRow[] {
	if (!(figures.paid > 0)) return [];
	const chf = (value: number) => formatSwissNumber(value);
	return [
		{ label: texts.shareLabel, detail: `${chf(figures.saving)} ÷ ${chf(figures.paid)}`, amount: percent(figures) },
		{ label: texts.netCostLabel, detail: `${chf(figures.paid)} − ${chf(figures.saving)}`, amount: formatChfAmount(figures.paid - figures.saving) },
	];
}
