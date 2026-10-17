import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { TRACE_LABELS_ELEMENT_ID, traceLabelValues } from "../../src/lib/build/browser-trace-labels";

/**
 * Après la construction (`postbuild`) : aucun script n'embarque de libellé
 * fixe de la trace ; le fichier de données que charge A1 les porte en JSON, et
 * le chargeur de la page les y lit. Vérifie que le plugin `browserTraceLabels`
 * a bien remplacé le module dans le paquet du navigateur.
 */
const DIST = fileURLToPath(new URL("../../dist/", import.meta.url));
const A1 = join(DIST, "prevoyance/rachat-3a-retroactif/index.html");

describe("libellés de la trace hors des scripts", () => {
	it("le fichier de données d'A1 porte les libellés en JSON", () => {
		const url = readFileSync(A1, "utf8").match(/\sdata-tax-data="([^"]+)"/)?.[1];
		expect(url, "fichier de données absent de la page").toBeDefined();
		const file = JSON.parse(readFileSync(join(DIST, url!), "utf8")) as { traceLabels: Record<string, string[]> };
		expect(file.traceLabels[TRACE_LABELS_ELEMENT_ID]).toEqual(traceLabelValues());
	});

	it("aucun libellé fixe n'apparaît comme chaîne dans le JavaScript construit", () => {
		const scripts = readdirSync(join(DIST, "_astro")).filter((file) => file.endsWith(".js"));
		expect(scripts.length).toBeGreaterThan(0);
		const js = scripts.map((file) => readFileSync(join(DIST, "_astro", file), "utf8")).join("\n");
		// Une chaîne que l'interface emploie aussi (src/i18n/fr.ts) peut figurer dans le script pour cette raison-là
		const interfaceText = readFileSync(fileURLToPath(new URL("../../src/i18n/fr.ts", import.meta.url)), "utf8");
		const embedded = traceLabelValues()
			.filter((label) => !interfaceText.includes(label))
			.filter((label) => ["`", '"', "'"].some((quote) => js.includes(`${quote}${label}${quote}`)));
		expect(embedded).toEqual([]);
	});
});
