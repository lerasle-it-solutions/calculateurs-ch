import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { TRACE_LABELS_ELEMENT_ID, traceLabelValues } from "../../src/lib/build/browser-trace-labels";

/**
 * Après la construction (`postbuild`) : le script d'A1 n'embarque aucun libellé
 * fixe de la trace, la page les porte en JSON. Vérifie que le plugin
 * `browserTraceLabels` a bien remplacé le module dans le paquet du navigateur.
 */
const DIST = fileURLToPath(new URL("../../dist/", import.meta.url));
const A1 = join(DIST, "prevoyance/rachat-3a-retroactif/index.html");

const pageScripts = (html: string): string =>
	[...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)]
		.filter(([, attributes]) => !/application\/(ld\+)?json/.test(attributes!))
		.map(([, attributes, body]) => {
			const src = attributes!.match(/src="([^"]+)"/)?.[1];
			return src ? readFileSync(join(DIST, src), "utf8") : body!;
		})
		.join("\n");

describe("libellés de la trace hors du script d'A1", () => {
	it("la page porte les libellés en JSON", () => {
		const html = readFileSync(A1, "utf8");
		const json = html.match(new RegExp(`id="${TRACE_LABELS_ELEMENT_ID}">([\\s\\S]*?)</script>`))?.[1];
		expect(json, "libellés absents de la page").toBeDefined();
		expect(JSON.parse(json!)).toEqual(traceLabelValues());
	});

	it("aucun libellé fixe n'apparaît comme chaîne dans le JavaScript de la page", () => {
		const js = pageScripts(readFileSync(A1, "utf8"));
		expect(readdirSync(join(DIST, "_astro")).some((file) => file.endsWith(".js"))).toBe(true);
		const embedded = traceLabelValues().filter((label) =>
			["`", '"', "'"].some((quote) => js.includes(`${quote}${label}${quote}`)),
		);
		expect(embedded).toEqual([]);
	});
});
