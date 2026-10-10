/**
 * Ce que la page d'A2 affiche pour un calcul : l'économie totale, ses deux
 * parts, le taux effectif, le montant déductible retenu et l'excédent éventuel,
 * les lignes de la trace mises en forme, et le message qui remplace le montant
 * quand aucun résultat n'est calculé — aucune déduction possible cette année,
 * ménage hors périmètre, donnée manquante. Sans DOM : la page l'applique, les
 * tests le vérifient.
 */
import { computePillar3aTaxSaving, type Pillar3aTaxSavingParams } from "../calculations/pension/pillar-3a-tax-saving";
import { MissingTaxDataError, PartialCoverageError } from "../calculations/tax";
import { formatSwissNumber } from "../format/chf";
import { formatChfAmount } from "./amounts";
import type { BreakdownRow, Pillar3aBuybackDisplayTexts } from "./pillar-3a-buyback";
import { coverageStatus } from "./coverage";
import type { ResultStatus, StatusLink } from "./result-card";

export type Pillar3aTaxSavingDisplayTexts = Pillar3aBuybackDisplayTexts & {
	/** Mention courte de la barre mobile quand aucune déduction n'est possible cette année. */
	blockedShort: string;
};

export type Pillar3aTaxSavingSummary = {
	cantonalAndMunicipalSaving: string;
	federalSaving: string;
	/** Économie ÷ montant déduit, « 27,5 % » ; un tiret sans déduction. */
	effectiveRate: string;
	deduction: string;
	/** Versement au-delà du plafond, non déductible ; `null` s'il n'y en a pas. */
	excess: string | null;
};

export type Pillar3aTaxSavingDisplay = {
	/** Économie totale ; un tiret quand aucune économie n'est calculée. */
	value: string;
	breakdown: BreakdownRow[];
	/** Parts de l'économie et montant déductible ; `null` sans résultat. */
	summary: Pillar3aTaxSavingSummary | null;
	/** Message qui remplace le montant dans la carte de résultat ; `null` quand un résultat est calculé. */
	status: ResultStatus | null;
};

export function displayPillar3aTaxSaving(
	params: Pillar3aTaxSavingParams,
	texts: Pillar3aTaxSavingDisplayTexts,
	officialCalculators: Record<string, StatusLink>,
): Pillar3aTaxSavingDisplay {
	try {
		const result = computePillar3aTaxSaving(params);
		const breakdown = result.breakdown.map((line) => ({
			label: line.label,
			detail: line.formula,
			amount: line.noAmount
				? "—"
				: line.unit === "CHF"
					? formatChfAmount(line.value)
					: `${formatSwissNumber(line.value, 2)}${line.unit ? ` ${line.unit}` : ""}`,
			note: line.assumption,
		}));
		if (result.blockedReason !== null) {
			return {
				value: "—",
				breakdown,
				summary: null,
				status: { text: result.blockedReason, short: texts.blockedShort },
			};
		}
		return {
			value: formatChfAmount(result.taxSaving),
			breakdown,
			summary: {
				cantonalAndMunicipalSaving: formatChfAmount(result.cantonalAndMunicipalSaving),
				federalSaving: formatChfAmount(result.federalSaving),
				effectiveRate: result.effectiveRate === null ? "—" : `${formatSwissNumber(result.effectiveRate * 100, 1)} %`,
				deduction: formatChfAmount(result.deduction),
				excess: result.excess > 0 ? formatChfAmount(result.excess) : null,
			},
			status: null,
		};
	} catch (error) {
		if (error instanceof PartialCoverageError) {
			return { value: "—", breakdown: [], summary: null, status: coverageStatus(error, texts, officialCalculators) };
		}
		if (error instanceof MissingTaxDataError) {
			return { value: "—", breakdown: [], summary: null, status: { text: texts.missingData, short: texts.missingDataShort } };
		}
		throw error;
	}
}
