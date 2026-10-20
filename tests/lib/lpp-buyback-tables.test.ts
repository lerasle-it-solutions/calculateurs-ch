import { describe, expect, it } from "vitest";

import type { LppBuybackScenario } from "../../src/lib/calculations/pension/lpp-buyback";
import { lppBuybackTableRows } from "../../src/lib/display/lpp-buyback-tables";

/** Écart des scénarios d'A3 : signe dit en mots, moins typographique (docs/editorial-style.md § 3.1). */
describe("écart signé des scénarios d'A3", () => {
	const scenario = (differenceFromSingleBuyback: number): LppBuybackScenario => ({
		trancheCount: 2,
		tranches: [],
		totalSaving: 0,
		differenceFromSingleBuyback,
		breakdown: [],
	});
	const differences = (...values: number[]) =>
		lppBuybackTableRows({ scenarios: values.map(scenario), lockCalendar: [] }, { single: "En une fois", spread: "Sur {n} ans" }).scenarios.map(
			(row) => row.difference,
		);

	it("un écart négatif prend le signe moins typographique (U+2212), jamais un tiret", () => {
		expect(differences(1314, -12, 0)).toEqual(["+ 1’314 CHF", "− 12 CHF", "0 CHF"]);
		expect(differences(-12).join("")).not.toMatch(/[–—]/);
	});
});
