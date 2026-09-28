import { existsSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { getTaxScales } from "../../src/data/tax-scales";
import { evaluateDeflatedScale, roundToNearest } from "../../src/lib/calculations/tax";

/**
 * Barème cantonal valaisan du revenu contre la table officielle du SCC à
 * l'indice 173 (barème annexé de l'art. 32 al. 2 LF), de 8 800 à 401 700 CHF.
 * La table vit dans le dépôt privé (R6) : sans elle, la suite est ignorée avec
 * un message explicite, jamais silencieusement verte. Le moteur implémente la
 * formule ; la table n'est qu'un oracle. Ce fichier et la table sont en lecture
 * seule (R7).
 */
const TABLE_PATH = new URL("./private/vs-cantonal-income-table-2026.json", import.meta.url);
const hasTable = existsSync(TABLE_PATH);
const MISSING_MESSAGE =
	"ignoré : tests/calculations/private/vs-cantonal-income-table-2026.json absent — lancer `npm run test` avec DATA_REPO_TOKEN pour injecter la table privée";
if (!hasTable) console.warn(`\n⚠ Barème valaisan non vérifié — ${MISSING_MESSAGE}\n`);

type OracleFile = { meta: { taxYear: number; indexPercent: number }; rows: [number, number, number][] };
const oracle: OracleFile = hasTable ? JSON.parse(readFileSync(TABLE_PATH, "utf-8")) : { meta: { taxYear: 0, indexPercent: 0 }, rows: [] };

describe.skipIf(!hasTable)(
	hasTable ? "barème cantonal valaisan du revenu contre la table officielle à l'indice 173" : `barème cantonal valaisan — ${MISSING_MESSAGE}`,
	() => {
		it("reproduit le taux affiché et l'impôt de chaque ligne", () => {
			const scales = getTaxScales({ taxYear: oracle.meta.taxYear, canton: "VS", municipalityOfsId: 6266 });
			const deflation = scales.canton.incomeScaleIndexation;
			const rounding = scales.canton.incomeTaxRounding;
			expect(deflation !== null && "value" in deflation, "indexation valaisanne absente des données").toBe(true);
			expect(rounding, "arrondi de l'impôt valaisan absent des données").not.toBeNull();
			if (deflation === null || !("value" in deflation) || rounding === null) return;
			expect(deflation.value.indexPercent, "la table est à l'indice 173").toBe(oracle.meta.indexPercent);

			const table = scales.canton.income[0]!;
			const gaps: string[] = [];
			for (const [income, displayedRate, tax] of oracle.rows) {
				const result = evaluateDeflatedScale(table, income, deflation.value);
				const rate = roundToNearest(result.ratePercent, 0.0001);
				const amount = roundToNearest(result.tax, rounding.value);
				if (rate !== displayedRate || amount !== tax) {
					gaps.push(`${income} : taux ${displayedRate} attendu, ${rate} obtenu · impôt ${tax} attendu, ${amount} obtenu`);
				}
			}
			expect(oracle.rows.length).toBeGreaterThan(3_000);
			expect(gaps, `\n${gaps.length} ligne(s) en écart :\n${gaps.slice(0, 10).join("\n")}\n`).toEqual([]);
		});
	},
);
