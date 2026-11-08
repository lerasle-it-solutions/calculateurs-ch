/**
 * Fichier de données propre à un calculateur (décision du mainteneur du
 * 7.11.2026, docs/plan/W11-W12.md, point 7) : ce dont un seul calculateur a
 * besoin, hors du fichier commun de l'année (src/calculators/tax-data-file.ts),
 * que chargent toutes les pages. Construit à la compilation (R2 : lu dans
 * src/data/), servi par src/pages/donnees/calcul/[fichier].ts sous un nom haché,
 * en cache immuable (public/_headers).
 *
 * Il est identique pour tous les visiteurs, ne dépend d'aucune saisie et n'est
 * chargé que par la page de son calculateur, avec le fichier commun, à la
 * première interaction (src/lib/display/first-interaction.ts) : le demander ne
 * révèle rien de ce que le visiteur saisit.
 */
import { createHash } from "node:crypto";

import { getCapitalWithdrawalBundle } from "../data/capital-withdrawal-scales";
import { calculatorTraceLabels } from "../lib/build/browser-trace-labels";
import type { CapitalWithdrawalBundle } from "../lib/calculations/pension/capital-withdrawal-bundle";
import type { CantonCode } from "./cantons";
import { taxEngineCoverage } from "./tax-coverage";

/** Dossier public des fichiers de données. FRANÇAIS : c'est une URL. */
const DIRECTORY = "/donnees/calcul/";

/** Fichier propre au retrait en capital (A4) : règles de l'année par canton, tableau de conversion en rentes compris. */
export type CapitalWithdrawalDataFile = {
	calculator: "pension.capital-withdrawal";
	taxYear: number;
	capitalWithdrawal: CapitalWithdrawalBundle | null;
	/** Libellés fixes de la trace d'A4, comme ceux du fichier commun (browser-trace-labels.ts). */
	traceLabels: Record<string, string[]>;
};

export type CalculatorDataFile = CapitalWithdrawalDataFile;

/** Calculateurs qui ont un fichier propre : préfixe du nom (FRANÇAIS, c'est une URL) et contenu. */
const CALCULATOR_FILES: Record<string, { prefix: string; build: (taxYear: number) => CalculatorDataFile }> = {
	"pension.capital-withdrawal": {
		prefix: "retrait-capital",
		build: (taxYear) => ({
			calculator: "pension.capital-withdrawal",
			taxYear,
			capitalWithdrawal: getCapitalWithdrawalBundle(taxYear, taxEngineCoverage().cantonsCovered as CantonCode[]),
			traceLabels: calculatorTraceLabels("pension.capital-withdrawal"),
		}),
	},
};

const cache = new Map<string, { file: CalculatorDataFile; json: string; name: string }>();

const build = (calculatorId: string, taxYear: number) => {
	const key = `${calculatorId}:${taxYear}`;
	const cached = cache.get(key);
	if (cached) return cached;
	const spec = CALCULATOR_FILES[calculatorId];
	if (!spec) throw new Error(`Aucun fichier de données propre au calculateur « ${calculatorId} ».`);
	const file = spec.build(taxYear);
	const json = JSON.stringify(file);
	const hash = createHash("sha256").update(json).digest("hex").slice(0, 10);
	const entry = { file, json, name: `${spec.prefix}-${taxYear}.${hash}.json` };
	cache.set(key, entry);
	return entry;
};

/** Vrai si le calculateur a un fichier de données propre. */
export const hasCalculatorDataFile = (calculatorId: string): boolean => calculatorId in CALCULATOR_FILES;
export const calculatorDataFile = (calculatorId: string, taxYear: number): CalculatorDataFile => build(calculatorId, taxYear).file;
export const calculatorDataFileJson = (calculatorId: string, taxYear: number): string => build(calculatorId, taxYear).json;
export const calculatorDataFileName = (calculatorId: string, taxYear: number): string => build(calculatorId, taxYear).name;
export const calculatorDataFileUrl = (calculatorId: string, taxYear: number): string => `${DIRECTORY}${calculatorDataFileName(calculatorId, taxYear)}`;
