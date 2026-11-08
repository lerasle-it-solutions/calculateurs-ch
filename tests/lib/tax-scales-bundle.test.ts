import { describe, expect, it } from "vitest";

import { pillar3aBuybackYear } from "../../src/calculators/pension/pillar-3a-buyback";
import { taxEngineCoverage } from "../../src/calculators/tax-coverage";
import { getMunicipalMultipliers } from "../../src/data";
import { getTaxScales, getTaxScalesBundle } from "../../src/data/tax-scales";
import { CHURCH_ORDER, taxScalesFromBundle, type TaxScalesBundle } from "../../src/lib/calculations/tax-scales-bundle";
import type { TaxInput } from "../../src/lib/calculations/tax";

/**
 * Paquet de barèmes factorisé (décision du mainteneur du 7.11.2026) : ce que le
 * navigateur reconstitue est exactement ce que rend `getTaxScales`, pour chaque
 * commune, après le passage par JSON que fait le fichier de données. Les valeurs
 * des coefficients et leurs sources sont celles de multipliers.json. Le paquet
 * ne transmet ni `verifiedOn` ni `effectiveFrom`, pas plus qu'avant la
 * factorisation : ces dates restent dans src/data/ et sur /donnees/.
 */
const year = pillar3aBuybackYear;
const cantons = taxEngineCoverage().cantonsCovered as TaxInput["canton"][];
const bundle = JSON.parse(JSON.stringify(getTaxScalesBundle(year, cantons))) as TaxScalesBundle;
const communes = (getMunicipalMultipliers()?.multipliers ?? []).filter((entry) => cantons.includes(entry.canton));

describe("paquet de barèmes factorisé", () => {
	it("chaque commune : taxScalesFromBundle rend exactement getTaxScales", () => {
		expect(communes.length).toBeGreaterThan(600);
		for (const entry of communes) {
			const expected = getTaxScales({ taxYear: year, canton: entry.canton, municipalityOfsId: entry.bfsId });
			expect(taxScalesFromBundle(bundle, entry.bfsId), `${entry.municipality} (${entry.bfsId})`).toEqual(expected);
		}
	});

	it("coefficients communaux et paroissiaux : valeur et sourceId de multipliers.json, commune par commune", () => {
		for (const entry of communes) {
			const scales = taxScalesFromBundle(bundle, entry.bfsId);
			for (const tax of ["income", "wealth"] as const) {
				expect(scales.municipality.multiplier[tax]).toEqual({ value: entry[tax].municipal.value, sourceId: entry[tax].municipal.sourceId });
				for (const denomination of CHURCH_ORDER) {
					const source = entry[tax].church[denomination];
					expect(scales.church[tax][denomination]).toEqual({ value: source.value, sourceId: source.sourceId });
				}
			}
		}
	});

	it("les communes gardent l'ordre des données, celui de la liste du champ commune", () => {
		expect(bundle.municipalities.map((entry) => entry.ofsId)).toEqual(communes.map((entry) => entry.bfsId));
	});

	it("aucune date de vérification ni d'entrée en vigueur dans le paquet, comme avant", () => {
		const json = JSON.stringify(bundle);
		expect(json).not.toContain("verifiedOn");
		expect(json).not.toContain("effectiveFrom");
	});
});
