import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";

import {
	browserTraceLabelsModule,
	TRACE_LABELS_ELEMENT_ID,
	traceLabelValues,
} from "../../src/lib/build/browser-trace-labels";
import * as labels from "../../src/lib/calculations/trace-labels";

/**
 * Libellés fixes de la trace générés à la construction : le module que reçoit
 * le navigateur, lu sur le JSON de la page, rend exactement les chaînes du
 * module Node, sous les mêmes noms.
 */
const renderA1 = async (): Promise<string> => {
	const { default: Page } = await import("../../src/pages/prevoyance/rachat-3a-retroactif.astro");
	const container = await AstroContainer.create({ astroConfig: { site: "https://calculateurs.ch" } });
	return container.renderToString(Page, {
		request: new Request("https://calculateurs.ch/prevoyance/rachat-3a-retroactif/"),
	});
};

/** Exécute le module du navigateur sur le JSON donné et renvoie ses exportations. */
const runBrowserModule = (json: string): Record<string, unknown> => {
	const body = browserTraceLabelsModule().replace(/^export const /gm, "exports.");
	const document = { getElementById: (id: string) => (id === TRACE_LABELS_ELEMENT_ID ? { textContent: json } : null) };
	const exports: Record<string, unknown> = {};
	new Function("document", "exports", body)(document, exports);
	return exports;
};

describe("libellés de la trace dans le navigateur", () => {
	it("la page d'A1 embarque les libellés dans l'ordre du module du navigateur", async () => {
		const html = await renderA1();
		const json = html.match(
			new RegExp(`<script type="application/json" id="${TRACE_LABELS_ELEMENT_ID}">([\\s\\S]*?)</script>`),
		)?.[1];
		expect(json, "libellés absents de la page").toBeDefined();
		expect(JSON.parse(json!)).toEqual(traceLabelValues());
	});

	it("le module du navigateur rend chaque libellé du module Node, sous le même nom", () => {
		const browser = runBrowserModule(JSON.stringify(traceLabelValues()));
		expect(browser).toEqual({ ...labels });
	});
});
