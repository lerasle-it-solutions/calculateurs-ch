import { describe, expect, it } from "vitest";

import { pillar3aBuybackYear } from "../../src/calculators/pension/pillar-3a-buyback";
import { taxDataFileJson } from "../../src/calculators/tax-data-file";
import {
	browserTraceLabelsModule,
	TRACE_LABELS_ELEMENT_ID,
	traceLabelValues,
	traceLabelsElementId,
} from "../../src/lib/build/browser-trace-labels";
import * as labels from "../../src/lib/calculations/trace-labels";

/**
 * Libellés fixes de la trace générés à la construction : le module que reçoit
 * le navigateur, lu sur le JSON que le chargeur de la page tire du fichier de
 * données (src/lib/display/first-interaction.ts), rend exactement les chaînes
 * du module Node, sous les mêmes noms.
 */

/** Exécute le module du navigateur sur le JSON donné et renvoie ses exportations. */
const runBrowserModule = (json: string): Record<string, unknown> => {
	const body = browserTraceLabelsModule().replace(/^export const /gm, "exports.");
	const document = { getElementById: (id: string) => (id === TRACE_LABELS_ELEMENT_ID ? { textContent: json } : null) };
	const exports: Record<string, unknown> = {};
	new Function("document", "exports", body)(document, exports);
	return exports;
};

describe("libellés de la trace dans le navigateur", () => {
	it("le fichier de données porte les libellés de chaque module, dans l'ordre du module du navigateur", () => {
		const { traceLabels } = JSON.parse(taxDataFileJson(pillar3aBuybackYear)) as { traceLabels: Record<string, string[]> };
		expect(traceLabels[TRACE_LABELS_ELEMENT_ID]).toEqual(traceLabelValues());
		for (const module of ["pillar-3a-buyback", "pillar-3a-tax-saving", "lpp-buyback", "gross-to-taxable"] as const) {
			expect(traceLabels[traceLabelsElementId(module)]).toEqual(traceLabelValues(module));
		}
	});

	it("le module du navigateur rend chaque libellé du module Node, sous le même nom", () => {
		const browser = runBrowserModule(JSON.stringify(traceLabelValues()));
		expect(browser).toEqual({ ...labels });
	});
});
