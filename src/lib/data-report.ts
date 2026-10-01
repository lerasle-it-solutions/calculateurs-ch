/**
 * Rapport de fraîcheur de la couche de données.
 *
 * Parcourt tous les `Value<T>` du dépôt, y associe leur source et calcule
 * l'échéance de la prochaine relecture. Alimente la page publique `/donnees/`
 * (et, plus tard, `scripts/verify-data.ts`).
 *
 * Un `verifiedOn` vide veut dire « jamais vérifiée » (R3) : la date et
 * l'échéance valent alors `null`, jamais une date calculée.
 */
import { allDataFiles, eachValue, sourceRegistry, type DataFile } from "../data";
import {
	DATA_FRESHNESS_LIMIT_MONTHS,
	type Source,
	type SourceCadence,
} from "../data/schema";

export interface DataReportRow {
	/** Fichier d'origine, relatif à `src/data/`. */
	file: string;
	/** Chemin de la valeur dans le fichier, p. ex. « pillar3a.employeeCapWithLpp ». */
	path: string;
	value: unknown;
	unit?: string;
	sourceId: string;
	/** Entrée du registre, si `sourceId` y figure. */
	source?: Source;
	/** ISO 8601 ; `null` si la valeur n'a jamais été vérifiée. */
	verifiedOn: string | null;
	/** ISO 8601 — date de re-vérification ; `null` si jamais vérifiée. */
	dueOn: string | null;
	overdue: boolean;
}

/** Nombre de mois avant re-vérification selon la cadence de la source. */
const cadenceMonths: Record<SourceCadence, number> = {
	monthly: 1,
	quarterly: 3,
	annual: 12,
	biennial: 24,
	irregular: DATA_FRESHNESS_LIMIT_MONTHS,
	event: DATA_FRESHNESS_LIMIT_MONTHS,
};

const addMonths = (isoDate: string, months: number): string => {
	const date = new Date(`${isoDate}T00:00:00Z`);
	date.setUTCMonth(date.getUTCMonth() + months);
	return date.toISOString().slice(0, 10);
};

/** Ordre d'urgence : une date absente (jamais vérifiée) passe avant toute date. */
const byUrgency = (a: string | null, b: string | null): number => {
	if (a === null || b === null) return (a === null ? 0 : 1) - (b === null ? 0 : 1);
	return a.localeCompare(b);
};

const mostUrgent = (a: string | null, b: string | null): string | null =>
	byUrgency(a, b) <= 0 ? a : b;

/**
 * Une ligne par valeur chiffrée du dépôt, triée par échéance croissante
 * (la plus urgente d'abord, les valeurs jamais vérifiées en tête). Les sources
 * `reference-tool` ne servent qu'aux tests et n'apparaissent jamais sur une
 * page publique : leurs valeurs sont écartées du rapport.
 */
export const dataFreshnessReport = (
	now: Date = new Date(),
	files: DataFile[] = allDataFiles(),
): DataReportRow[] => {
	const registry = sourceRegistry();
	const rows: DataReportRow[] = [];

	for (const file of files) {
		eachValue(file.data, (value, path) => {
			const source = registry.get(value.sourceId);
			if (source?.nature === "reference-tool") return;

			const verifiedOn = value.verifiedOn === "" ? null : value.verifiedOn;
			const months = Math.min(
				source ? cadenceMonths[source.cadence] : DATA_FRESHNESS_LIMIT_MONTHS,
				DATA_FRESHNESS_LIMIT_MONTHS,
			);
			const dueOn = verifiedOn === null ? null : addMonths(verifiedOn, months);

			rows.push({
				file: file.path,
				path,
				value: value.value,
				unit: value.unit,
				sourceId: value.sourceId,
				source,
				verifiedOn,
				dueOn,
				overdue:
					dueOn !== null && new Date(`${dueOn}T00:00:00Z`).getTime() < now.getTime(),
			});
		});
	}

	return rows.sort((a, b) => byUrgency(a.dueOn, b.dueOn));
};

export interface SourceReportRow {
	sourceId: string;
	/** Entrée du registre, si `sourceId` y figure. */
	source?: Source;
	/** Nombre de valeurs que cette source alimente, quel que soit leur nombre. */
	trackedValues: number;
	/** ISO 8601 — vérification la plus ancienne ; `null` si une valeur n'a jamais été vérifiée. */
	oldestVerifiedOn: string | null;
	/** ISO 8601 — échéance la plus proche ; `null` si une valeur n'a jamais été vérifiée. */
	nextDueOn: string | null;
	overdueCount: number;
	neverVerifiedCount: number;
}

/**
 * Une ligne par SOURCE (pas par valeur) : le nombre de valeurs qu'elle alimente
 * reste invisible dans le décompte de lignes de la page. Une source qui
 * alimente 700 communes ou 3 plafonds fédéraux occupe la même unique ligne —
 * c'est ce qui garde `/donnees/` lisible quelle que soit la taille d'un jeu de
 * données en amont (voir le détail communal, exporté en CSV à part).
 */
export const sourceFreshnessReport = (
	now: Date = new Date(),
	files: DataFile[] = allDataFiles(),
): SourceReportRow[] => {
	const bySource = new Map<string, SourceReportRow>();

	for (const value of dataFreshnessReport(now, files)) {
		const neverVerified = value.verifiedOn === null ? 1 : 0;
		const existing = bySource.get(value.sourceId);
		if (!existing) {
			bySource.set(value.sourceId, {
				sourceId: value.sourceId,
				source: value.source,
				trackedValues: 1,
				oldestVerifiedOn: value.verifiedOn,
				nextDueOn: value.dueOn,
				overdueCount: value.overdue ? 1 : 0,
				neverVerifiedCount: neverVerified,
			});
			continue;
		}
		existing.trackedValues += 1;
		existing.oldestVerifiedOn = mostUrgent(existing.oldestVerifiedOn, value.verifiedOn);
		existing.nextDueOn = mostUrgent(existing.nextDueOn, value.dueOn);
		if (value.overdue) existing.overdueCount += 1;
		existing.neverVerifiedCount += neverVerified;
	}

	return [...bySource.values()].sort((a, b) => byUrgency(a.nextDueOn, b.nextDueOn));
};

export interface CollectionToolRow {
	sourceId: string;
	/** Entrée du registre, si `sourceId` y figure. */
	source?: Source;
	/** Nombre de valeurs relevées avec cet outil. */
	collectedValues: number;
}

/**
 * Outils de collecte : les sources citées en `collectedFrom` (module de données
 * de base de l'AFC, notices du SCC…), distinctes des actes officiels qui
 * fondent les valeurs. Une ligne par outil, la plus utilisée d'abord. Les
 * sources `reference-tool` n'apparaissent jamais sur une page publique.
 */
export const collectionToolsReport = (files: DataFile[] = allDataFiles()): CollectionToolRow[] => {
	const registry = sourceRegistry();
	const byTool = new Map<string, CollectionToolRow>();

	for (const file of files) {
		eachValue(file.data, (value) => {
			if (value.collectedFrom === undefined) return;
			const source = registry.get(value.collectedFrom);
			if (source?.nature === "reference-tool") return;
			const row = byTool.get(value.collectedFrom) ?? { sourceId: value.collectedFrom, source, collectedValues: 0 };
			row.collectedValues += 1;
			byTool.set(value.collectedFrom, row);
		});
	}

	return [...byTool.values()].sort((a, b) => b.collectedValues - a.collectedValues);
};
