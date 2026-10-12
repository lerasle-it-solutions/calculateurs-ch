/**
 * Ce que la page d'A3 affiche pour un calcul : l'économie du rachat en une fois
 * et sa ventilation par impôt, la part non déduite, le tableau des scénarios
 * d'échelonnement, le calendrier du délai de blocage, la trace mise en forme,
 * et le message qui remplace le montant quand aucun résultat n'est calculé —
 * rachat refusé, ménage hors périmètre, donnée manquante. Sans DOM : la page
 * l'applique, les tests le vérifient.
 */
import { computeLppBuyback, LOCK_STATUS_LABELS, type LockStatus, type LppBuybackParams } from "../calculations/pension/lpp-buyback";
import { MissingTaxDataError, PartialCoverageError } from "../calculations/tax";
import type { BreakdownLine } from "../utils/breakdown";
import { formatSwissNumber } from "../format/chf";
import { formatChfAmount } from "./amounts";
import { coverageStatus, type CoverageTexts } from "./coverage";
import type { BreakdownRow } from "./pillar-3a-buyback";
import type { ResultStatus, StatusLink } from "./result-card";

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
};

/** Ordre de gravité des classes : la plus grave d'un scénario est affichée. */
const SEVERITY: LockStatus[] = ["compatible", "checkExactDate", "withinLockPeriod"];

/** Écart signé, dit en mots et non par la couleur : « + 295 CHF », « – 12 CHF ». */
const signedChf = (amount: number): string =>
	amount > 0 ? `+ ${formatChfAmount(amount)}` : amount < 0 ? `– ${formatChfAmount(-amount)}` : formatChfAmount(0);

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

const empty = (status: ResultStatus | null, breakdown: BreakdownRow[] = []): LppBuybackDisplay => ({
	value: "—",
	breakdown,
	summary: null,
	notDeducted: null,
	scenarios: [],
	calendar: [],
	status,
});

export function displayLppBuyback(
	params: LppBuybackParams,
	texts: LppBuybackDisplayTexts,
	officialCalculators: Record<string, StatusLink>,
): LppBuybackDisplay {
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
			scenarios: result.scenarios.map((scenario) => {
				const statuses = scenario.tranches.flatMap((tranche) => (tranche.lockStatus ? [tranche.lockStatus] : []));
				const worst = statuses.length > 0 ? SEVERITY[Math.max(...statuses.map((status) => SEVERITY.indexOf(status)))]! : null;
				return {
					label: scenario.trancheCount === 1 ? texts.single : texts.spread.replace("{n}", String(scenario.trancheCount)),
					tranches: scenario.tranches.map((tranche) => formatChfAmount(tranche.amount)).join(" + "),
					total: formatChfAmount(scenario.totalSaving),
					difference: signedChf(scenario.differenceFromSingleBuyback),
					lock: worst ? LOCK_STATUS_LABELS[worst] : null,
				};
			}),
			calendar: result.lockCalendar.map((entry) => ({
				buybackYear: String(entry.buybackYear),
				lockEnds: String(entry.lockEndsYear),
				compatibleFrom: String(entry.lockEndsYear + 1),
				status: entry.status ? LOCK_STATUS_LABELS[entry.status] : null,
			})),
			status: null,
		};
	} catch (error) {
		if (error instanceof PartialCoverageError) return empty(coverageStatus(error, texts, officialCalculators));
		if (error instanceof MissingTaxDataError) return empty({ text: texts.missingData, short: texts.missingDataShort });
		throw error;
	}
}
