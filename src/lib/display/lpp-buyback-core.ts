/**
 * Cœur de l'affichage d'A3 (décision n° 22), sans les lignes des tableaux « Et si »,
 * que met en forme lpp-buyback-tables.ts : le script de la page n'importe que ce
 * module. L'affichage complet est dans lpp-buyback.ts (construction, tests).
 *
 * Ce que la page d'A3 affiche pour un calcul : l'économie du rachat en une fois
 * et sa ventilation par impôt, la part non déduite, le tableau des scénarios
 * d'échelonnement, le calendrier du délai de blocage, la trace mise en forme,
 * et le message qui remplace le montant quand aucun résultat n'est calculé —
 * rachat refusé, ménage hors périmètre, donnée manquante. Sans DOM : la page
 * l'applique, les tests le vérifient.
 */
import { computeLppBuyback, type LockCalendarEntry, type LppBuybackParams, type LppBuybackScenario } from "../calculations/pension/lpp-buyback";
import { MissingTaxDataError, PartialCoverageError } from "../calculations/tax";
import type { BreakdownLine } from "../utils/breakdown";
import { formatSwissNumber } from "../format/chf";
import { formatChfAmount } from "./amounts";
import { coverageStatus, type CoverageTexts } from "./coverage";
import type { BreakdownRow } from "./pillar-3a-buyback";
import type { ResultStatus, StatusLink } from "./result-card";
import type { ResultFigures } from "./result-summary";

export type LppBuybackDisplayTexts = CoverageTexts & {
	missingData: string;
	missingDataShort: string;
	refusedShort: string;
	/** « {federal} » et « {cantonal} » remplacés par les montants non déduits. */
	notDeducted: string;
	/** Libellés des scénarios : « En une fois », « Sur {n} ans ». */
	single: string;
	spread: string;
};

export type LppBuybackScenarioRow = { label: string; tranches: string; total: string; difference: string; lock: string | null };
export type LppBuybackCalendarRow = { buybackYear: string; lockEnds: string; compatibleFrom: string; status: string | null };

export type LppBuybackDisplay = {
	/** Économie du rachat en une fois ; un tiret quand aucune économie n'est calculée. */
	value: string;
	breakdown: BreakdownRow[];
	/** Économie par impôt : cantonal, communal, fédéral direct ; `null` sans résultat. */
	summary: { cantonalTax: string; municipalTax: string; federalTax: string } | null;
	/** Phrase qui signale la part du rachat non déduite ; `null` s'il n'y en a pas. */
	notDeducted: string | null;
	scenarios: LppBuybackScenarioRow[];
	calendar: LppBuybackCalendarRow[];
	/** Message qui remplace le montant ; `null` quand un résultat est calculé. */
	status: ResultStatus | null;
	/** Montant racheté, économie du rachat en une fois et économie par impôt (résumé de la carte) ; `null` sans résultat. */
	figures: ResultFigures | null;
	/** Scénarios et calendrier bruts du moteur ; `null` sans résultat. */
	tables: LppBuybackTables | null;
};

const row = (line: BreakdownLine): BreakdownRow => ({
	label: line.label,
	detail: line.formula,
	amount: line.noAmount
		? "—"
		: line.unit === "CHF"
			? formatChfAmount(line.value)
			: `${formatSwissNumber(line.value, 2)}${line.unit ? ` ${line.unit}` : ""}`,
	...(line.qualifier ? { qualifier: line.qualifier } : {}),
	note: line.assumption,
});

/** Scénarios et calendrier tels que le moteur les calcule, mis en forme à part (lpp-buyback-tables.ts). */
export type LppBuybackTables = { scenarios: LppBuybackScenario[]; lockCalendar: LockCalendarEntry[] };

/**
 * Ce que le cœur d'A3 affiche (décision n° 22) : tout sauf les lignes des tableaux « Et si »,
 * remises brutes (`tables`) au module « visualisations », qui les met en forme.
 */
export type LppBuybackCoreDisplay = Omit<LppBuybackDisplay, "scenarios" | "calendar">;

const empty = (status: ResultStatus | null, breakdown: BreakdownRow[] = []): LppBuybackCoreDisplay => ({
	value: "—",
	breakdown,
	summary: null,
	notDeducted: null,
	tables: null,
	status,
	figures: null,
});

export function displayLppBuybackCore(
	params: LppBuybackParams,
	texts: LppBuybackDisplayTexts,
	officialCalculators: Record<string, StatusLink>,
): LppBuybackCoreDisplay {
	try {
		const result = computeLppBuyback(params);
		const single = result.singleBuyback;
		if (single === null) {
			return empty(
				{ text: result.refusals.map((refusal) => refusal.message).join(" "), short: texts.refusedShort },
				result.breakdown.map(row),
			);
		}
		const { federal, cantonal } = single.notDeducted;
		return {
			value: formatChfAmount(single.taxSaving),
			breakdown: result.breakdown.map(row),
			summary: {
				cantonalTax: formatChfAmount(single.componentSavings.cantonalTax),
				municipalTax: formatChfAmount(single.componentSavings.municipalTax),
				federalTax: formatChfAmount(single.componentSavings.federalTax),
			},
			notDeducted:
				federal > 0 || cantonal > 0
					? texts.notDeducted.replace("{federal}", formatChfAmount(federal)).replace("{cantonal}", formatChfAmount(cantonal))
					: null,
			tables: { scenarios: result.scenarios, lockCalendar: result.lockCalendar },
			status: null,
			figures: { paid: single.amount, saving: single.taxSaving, components: single.componentSavings },
		};
	} catch (error) {
		if (error instanceof PartialCoverageError) return empty(coverageStatus(error, texts, officialCalculators));
		if (error instanceof MissingTaxDataError) return empty({ text: texts.missingData, short: texts.missingDataShort });
		throw error;
	}
}
