/**
 * Libellés fixes de la trace, générés à la construction pour le navigateur.
 *
 * Côté Node, `src/lib/calculations/trace-labels.ts` sert tel quel : le moteur,
 * la construction et les tests lisent les mêmes chaînes. Pour le navigateur, le
 * plugin `browserTraceLabels` remplace ce module par un module virtuel qui lit
 * les chaînes, par position, dans le JSON que la page embarque
 * (`TraceLabels.astro`). Le script d'un calculateur n'embarque plus ses
 * libellés, la page les porte une fois.
 *
 * L'ordre commun aux deux côtés est celui des clés de l'espace de noms du
 * module, triées : la page et le module virtuel le tirent du même import.
 */
import { fileURLToPath } from "node:url";

import type { Plugin } from "vite";

import * as labels from "../calculations/trace-labels";

/** Identifiant de l'élément `<script type="application/json">` qui porte les libellés. */
export const TRACE_LABELS_ELEMENT_ID = "trace-labels";

const LABELS_FILE = fileURLToPath(new URL("../calculations/trace-labels.ts", import.meta.url));
const VIRTUAL_ID = "\0browser-trace-labels";

const names = (): string[] => Object.keys(labels).sort();

/** Libellés dans l'ordre où le module du navigateur les lit. */
export const traceLabelValues = (): string[] =>
	names().map((name) => (labels as Record<string, string>)[name]!);

/** Source du module qui remplace `trace-labels.ts` dans le navigateur. */
export const browserTraceLabelsModule = (): string =>
	[
		`const labels = JSON.parse(document.getElementById(${JSON.stringify(TRACE_LABELS_ELEMENT_ID)}).textContent);`,
		...names().map((name, index) => `export const ${name} = labels[${index}];`),
	].join("\n");

/** Plugin Vite : `trace-labels.ts` est remplacé dans le seul environnement client. */
export function browserTraceLabels(): Plugin {
	return {
		name: "calculateurs:browser-trace-labels",
		enforce: "pre",
		async resolveId(source, importer, options) {
			if (!source.endsWith("trace-labels") || this.environment?.config.consumer !== "client") return null;
			const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
			return resolved?.id === LABELS_FILE ? VIRTUAL_ID : null;
		},
		load(id) {
			return id === VIRTUAL_ID ? browserTraceLabelsModule() : null;
		},
	};
}
