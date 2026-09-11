/**
 * Rapport de fraîcheur de la couche de données.
 *
 * Parcourt tous les `Value<T>` du dépôt, y associe leur source et calcule
 * l'échéance de la prochaine relecture. Alimente la page publique `/donnees/`
 * (et, plus tard, `scripts/verify-data.ts`).
 */
import { allDataFiles, eachValue } from "../data";
import { SOURCES } from "../data/sources";
import { DATA_FRESHNESS_LIMIT_MONTHS, type SourceEntry } from "../data/schema";

export interface DataReportRow {
	/** Fichier d'origine, relatif à `src/data/`. */
	file: string;
	/** Chemin de la valeur dans le fichier, p. ex. « pillar3a.employeeCapWithLpp ». */
	path: string;
	value: unknown;
	unit?: string;
	sourceId: string;
	/** Entrée du registre, si `sourceId` y figure. */
	source?: SourceEntry;
	/** ISO 8601. */
	verifiedOn: string;
	/** ISO 8601 — date à laquelle la valeur doit être re-vérifiée. */
	dueOn: string;
	overdue: boolean;
}

/** Nombre de mois avant re-vérification selon la cadence de la source. */
const cadenceMonths: Record<SourceEntry["cadence"], number> = {
	monthly: 1,
	quarterly: 3,
	annual: 12,
	irregular: DATA_FRESHNESS_LIMIT_MONTHS,
};

const addMonths = (isoDate: string, months: number): string => {
	const date = new Date(`${isoDate}T00:00:00Z`);
	date.setUTCMonth(date.getUTCMonth() + months);
	return date.toISOString().slice(0, 10);
};

/**
 * Une ligne par valeur chiffrée du dépôt, triée par échéance croissante
 * (la plus urgente d'abord).
 */
export const dataFreshnessReport = (now: Date = new Date()): DataReportRow[] => {
	const registry = SOURCES as Record<string, SourceEntry | undefined>;
	const rows: DataReportRow[] = [];

	for (const file of allDataFiles()) {
		eachValue(file.data, (value, path) => {
			const source = registry[value.sourceId];
			const months = Math.min(
				source ? cadenceMonths[source.cadence] : DATA_FRESHNESS_LIMIT_MONTHS,
				DATA_FRESHNESS_LIMIT_MONTHS,
			);
			const dueOn = addMonths(value.verifiedOn, months);

			rows.push({
				file: file.path,
				path,
				value: value.value,
				unit: value.unit,
				sourceId: value.sourceId,
				source,
				verifiedOn: value.verifiedOn,
				dueOn,
				overdue: new Date(`${dueOn}T00:00:00Z`).getTime() < now.getTime(),
			});
		});
	}

	return rows.sort((a, b) => a.dueOn.localeCompare(b.dueOn));
};
