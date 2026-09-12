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

export interface SourceReportRow {
	sourceId: string;
	/** Entrée du registre, si `sourceId` y figure. */
	source?: SourceEntry;
	/** Nombre de valeurs que cette source alimente, quel que soit leur nombre. */
	trackedValues: number;
	/** ISO 8601 — vérification la plus ancienne parmi ces valeurs. */
	oldestVerifiedOn: string;
	/** ISO 8601 — échéance la plus proche parmi ces valeurs. */
	nextDueOn: string;
	overdueCount: number;
}

/**
 * Une ligne par SOURCE (pas par valeur) : le nombre de valeurs qu'elle alimente
 * reste invisible dans le décompte de lignes de la page. Une source qui
 * alimente 700 communes ou 3 plafonds fédéraux occupe la même unique ligne —
 * c'est ce qui garde `/donnees/` lisible quelle que soit la taille d'un jeu de
 * données en amont (voir le détail communal, exporté en CSV à part).
 */
export const sourceFreshnessReport = (now: Date = new Date()): SourceReportRow[] => {
	const bySource = new Map<string, SourceReportRow>();

	for (const value of dataFreshnessReport(now)) {
		const existing = bySource.get(value.sourceId);
		if (!existing) {
			bySource.set(value.sourceId, {
				sourceId: value.sourceId,
				source: value.source,
				trackedValues: 1,
				oldestVerifiedOn: value.verifiedOn,
				nextDueOn: value.dueOn,
				overdueCount: value.overdue ? 1 : 0,
			});
			continue;
		}
		existing.trackedValues += 1;
		if (value.verifiedOn < existing.oldestVerifiedOn) {
			existing.oldestVerifiedOn = value.verifiedOn;
		}
		if (value.dueOn < existing.nextDueOn) {
			existing.nextDueOn = value.dueOn;
		}
		if (value.overdue) existing.overdueCount += 1;
	}

	return [...bySource.values()].sort((a, b) => a.nextDueOn.localeCompare(b.nextDueOn));
};
