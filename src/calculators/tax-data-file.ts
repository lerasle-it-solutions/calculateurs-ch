/**
 * Fichier de données des calculateurs fiscaux (src/lib/display/tax-data.ts),
 * construit à la compilation (R2 : lu dans src/data/, jamais tapé) : un par
 * année de calcul, pour tous les cantons que le moteur couvre, servi par
 * src/pages/donnees/calcul/[fichier].ts sous un nom haché, en cache immuable
 * (public/_headers).
 */
import { createHash } from "node:crypto";

import { getGrossToTaxableRuleSet } from "../data/gross-to-taxable";
import { getTaxScalesBundle } from "../data/tax-scales";
import { allTraceLabels } from "../lib/build/browser-trace-labels";
import type { TaxDataFile } from "../lib/display/tax-data";
import type { CantonCode } from "./cantons";
import { taxEngineCoverage } from "./tax-coverage";

/** Dossier public des fichiers de données. FRANÇAIS : c'est une URL. */
const DIRECTORY = "/donnees/calcul/";

const cache = new Map<number, { file: TaxDataFile; json: string; name: string }>();

const build = (taxYear: number) => {
	const cached = cache.get(taxYear);
	if (cached) return cached;
	const cantons = taxEngineCoverage().cantonsCovered as CantonCode[];
	const file: TaxDataFile = {
		taxYear,
		bundle: getTaxScalesBundle(taxYear, cantons),
		// Chemin « salaire brut » : seulement si l'estimateur a ses données pour l'année
		estimator: (() => {
			try {
				return getGrossToTaxableRuleSet(taxYear, cantons);
			} catch {
				return null;
			}
		})(),
		traceLabels: allTraceLabels(),
	};
	const json = JSON.stringify(file);
	const hash = createHash("sha256").update(json).digest("hex").slice(0, 10);
	const entry = { file, json, name: `baremes-${taxYear}.${hash}.json` };
	cache.set(taxYear, entry);
	return entry;
};

/** Contenu du fichier de données d'une année. */
export const taxDataFile = (taxYear: number): TaxDataFile => build(taxYear).file;
/** Corps servi, tel quel. */
export const taxDataFileJson = (taxYear: number): string => build(taxYear).json;
/** Nom haché : il change avec le contenu, le fichier se met en cache sans limite. */
export const taxDataFileName = (taxYear: number): string => build(taxYear).name;
/** Adresse publique du fichier de données d'une année. */
export const taxDataFileUrl = (taxYear: number): string => `${DIRECTORY}${taxDataFileName(taxYear)}`;
