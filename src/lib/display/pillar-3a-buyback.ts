/**
 * Ce que la page d'A1 affiche pour un calcul : le résultat, les lignes de la
 * trace mises en forme, et le message d'état — ménage hors périmètre, avec le
 * lien vers la calculette officielle du canton, ou données manquantes. Sans
 * DOM : la page l'applique, les tests le vérifient.
 */
import { computePillar3aBuyback, type Pillar3aBuybackParams } from "../calculations/pension/pillar-3a-buyback";
import { MissingTaxDataError, PartialCoverageError } from "../calculations/tax";
import { formatChf, formatSwissNumber } from "../format/chf";
import type { ResultStatus, StatusLink } from "./result-card";

export type { StatusLink };

export type BreakdownRow = { label: string; detail?: string; amount: string; qualifier?: string; note?: string };

export type Pillar3aBuybackDisplayTexts = {
	/** Ménage non couvert, par code de canton. */
	outOfScope: Record<string, string>;
	/** Commune non couverte, par nom de commune. */
	outOfScopeMunicipality: Record<string, string>;
	missingData: string;
	/** Mentions courtes de la barre de résultat mobile. */
	outOfScopeShort: string;
	missingDataShort: string;
};

export type Pillar3aBuybackDisplay = {
	/** Résultat affiché ; un tiret quand aucune économie n'est calculée. */
	value: string;
	breakdown: BreakdownRow[];
	/** Message qui remplace le montant dans la carte de résultat ; `null` quand un résultat est calculé. */
	status: ResultStatus | null;
};

/**
 * Montant affiché dans le navigateur : le formateur de la construction
 * (src/lib/format/chf.ts), unité après le nombre, « 12’346 CHF ». Sans Intl,
 * le séparateur ne dépend pas du navigateur.
 */
export const formatChfAmount = (value: number): string => `${formatChf(value)}\u00a0CHF`;

export function displayPillar3aBuyback(
	params: Pillar3aBuybackParams,
	texts: Pillar3aBuybackDisplayTexts,
	officialCalculators: Record<string, StatusLink>,
): Pillar3aBuybackDisplay {
	try {
		const result = computePillar3aBuyback(params);
		return {
			value: formatChfAmount(result.taxSaving),
			breakdown: result.breakdown.map((line) => ({
				label: line.label,
				detail: line.formula,
				amount: line.noAmount
					? "—"
					: line.unit === "CHF"
						? formatChfAmount(line.value)
						: `${formatSwissNumber(line.value, 2)}${line.unit ? ` ${line.unit}` : ""}`,
				qualifier: line.qualifier,
				note: line.assumption,
			})),
			status: null,
		};
	} catch (error) {
		if (error instanceof PartialCoverageError) {
			const text =
				error.municipality !== null ? texts.outOfScopeMunicipality[error.municipality] : texts.outOfScope[error.canton];
			return {
				value: "—",
				breakdown: [],
				status: { text: text ?? "", short: texts.outOfScopeShort, link: officialCalculators[error.canton] },
			};
		}
		if (error instanceof MissingTaxDataError) {
			return { value: "—", breakdown: [], status: { text: texts.missingData, short: texts.missingDataShort } };
		}
		throw error;
	}
}
