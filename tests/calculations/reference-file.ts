import { existsSync, readFileSync } from "node:fs";

/**
 * Accès en lecture seule au fichier de cas de référence (docs/plan/engine.md
 * § 3.6). Le vrai fichier contient des résultats du calculateur de l'AFC : il
 * vit dans le dépôt privé et n'est présent qu'après `fetch-private-data.ts`.
 * Aucun code n'écrit dans ces fichiers (R7).
 */
export const PRIVATE_REFERENCE_PATH = new URL(
	"./private/canton-references.json",
	import.meta.url,
);
export const EXAMPLE_REFERENCE_PATH = new URL(
	"./fixtures/canton-references.example.json",
	import.meta.url,
);

export interface ReferenceCase {
	id: unknown;
	profileId?: unknown;
	label?: unknown;
	municipality?: { name?: unknown; canton?: unknown; ofsId?: unknown };
	taxpayer?: {
		maritalStatus?: unknown;
		age?: unknown;
		children?: unknown;
		childrenAges?: unknown;
		denomination?: unknown;
	};
	grossInput?: { grossIncome?: unknown } & Record<string, unknown>;
	estvIntermediate?: unknown;
	engineInput?: {
		federalTaxableIncome?: unknown;
		cantonalTaxableIncome?: unknown;
		taxableWealth?: unknown;
	};
	expected?: {
		cantonalTax?: unknown;
		municipalTax?: unknown;
		personalTax?: unknown;
		federalTax?: unknown;
		churchTax?: unknown;
		totalTax?: unknown;
	};
	estvMarginalRate?: { incomeRatePercent?: unknown; wealthRatePercent?: unknown };
	estvAverageRateOnGrossPercent?: unknown;
}

export interface DeltaCase {
	id?: unknown;
	municipality?: { name?: unknown; canton?: unknown; ofsId?: unknown };
	baseCaseId?: unknown;
	buybackAmount?: unknown;
	expected?: {
		totalTaxBefore?: unknown;
		totalTaxAfter?: unknown;
		taxSaving?: unknown;
		effectiveSavingRatePercent?: unknown;
	};
}

export interface ReferenceFile {
	meta?: {
		taxYear?: unknown;
		tolerance?: { relative?: unknown; absoluteFloorChf?: unknown };
		marginalRateCases?: { cases?: DeltaCase[] };
	};
	cases?: ReferenceCase[];
}

export const readReferenceFile = (path: URL): ReferenceFile =>
	JSON.parse(readFileSync(path, "utf-8")) as ReferenceFile;

export const privateReferenceFileExists = (): boolean =>
	existsSync(PRIVATE_REFERENCE_PATH);

export const caseLabel = (referenceCase: ReferenceCase, index: number): string => {
	const id = typeof referenceCase.id === "string" ? referenceCase.id : `cases[${index}]`;
	return typeof referenceCase.label === "string"
		? `${id} (${referenceCase.label})`
		: id;
};
