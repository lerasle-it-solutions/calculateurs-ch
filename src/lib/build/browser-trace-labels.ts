/**
 * Libellés fixes de la trace, générés à la construction pour le navigateur.
 *
 * Côté Node, les modules de libellés (`src/lib/calculations/trace-labels.ts`
 * pour le moteur, un module par calculateur) servent tels quels : le moteur, la
 * construction et les tests lisent les mêmes chaînes. Pour le navigateur, le
 * plugin `browserTraceLabels` remplace chacun par un module virtuel qui lit ses
 * chaînes, par position, dans un `<script type="application/json">` de la page.
 * Ni le script ni le HTML ne les portent : ils sont dans le fichier de données
 * de l'année (`traceLabels`, src/calculators/tax-data-file.ts), et le chargeur
 * de la page (src/lib/display/first-interaction.ts) crée ces éléments avant
 * d'importer le cœur, dont les modules les lisent dès leur évaluation.
 *
 * Un module par calculateur : les libellés propres à A1 restent dans le paquet
 * d'A1, ceux d'A2 dans celui d'A2, et seuls ceux du moteur passent par le
 * morceau que les deux pages partagent.
 *
 * L'ordre commun aux deux côtés est celui des clés de l'espace de noms du
 * module, triées : la page et le module virtuel le tirent du même import.
 */
import { fileURLToPath } from "node:url";

import type { Plugin } from "vite";

import * as grossToTaxableLabels from "../calculations/gross-to-taxable-labels";
import * as lppBuybackLabels from "../calculations/pension/lpp-buyback-labels";
import * as pillar3aBuybackLabels from "../calculations/pension/pillar-3a-buyback-labels";
import * as pillar3aTaxSavingLabels from "../calculations/pension/pillar-3a-tax-saving-labels";
import * as engineLabels from "../calculations/trace-labels";

/** Modules de libellés : fichier source (relatif à ce module) et espace de noms. */
const TRACE_LABEL_MODULES = {
	engine: { file: "../calculations/trace-labels.ts", labels: engineLabels },
	"pillar-3a-buyback": { file: "../calculations/pension/pillar-3a-buyback-labels.ts", labels: pillar3aBuybackLabels },
	"pillar-3a-tax-saving": { file: "../calculations/pension/pillar-3a-tax-saving-labels.ts", labels: pillar3aTaxSavingLabels },
	"gross-to-taxable": { file: "../calculations/gross-to-taxable-labels.ts", labels: grossToTaxableLabels },
	"lpp-buyback": { file: "../calculations/pension/lpp-buyback-labels.ts", labels: lppBuybackLabels },
} as const;

export type TraceLabelModule = keyof typeof TRACE_LABEL_MODULES;

/** Identifiant de l'élément `<script type="application/json">` qui porte les libellés du moteur. */
export const TRACE_LABELS_ELEMENT_ID = "trace-labels";

/** Identifiant de l'élément qui porte les libellés d'un module. */
export const traceLabelsElementId = (module: TraceLabelModule = "engine"): string =>
	module === "engine" ? TRACE_LABELS_ELEMENT_ID : `${TRACE_LABELS_ELEMENT_ID}-${module}`;

const VIRTUAL_PREFIX = "\0browser-trace-labels:";
const files = new Map(
	(Object.keys(TRACE_LABEL_MODULES) as TraceLabelModule[]).map((module) => [
		fileURLToPath(new URL(TRACE_LABEL_MODULES[module].file, import.meta.url)),
		module,
	]),
);

const labelsOf = (module: TraceLabelModule): Record<string, string> =>
	TRACE_LABEL_MODULES[module].labels as Record<string, string>;
const names = (module: TraceLabelModule): string[] => Object.keys(labelsOf(module)).sort();

/** Libellés d'un module dans l'ordre où le module du navigateur les lit. */
export const traceLabelValues = (module: TraceLabelModule = "engine"): string[] =>
	names(module).map((name) => labelsOf(module)[name]!);

/** Libellés de tous les modules, par identifiant d'élément : ce que le fichier de données transmet. */
export const allTraceLabels = (): Record<string, string[]> =>
	Object.fromEntries((Object.keys(TRACE_LABEL_MODULES) as TraceLabelModule[]).map((module) => [traceLabelsElementId(module), traceLabelValues(module)]));

/**
 * Source du module qui remplace un module de libellés dans le navigateur. Une
 * page lit la quasi-totalité des libellés des modules qu'elle importe : un accès
 * direct par position, le plus court, suffit.
 */
export const browserTraceLabelsModule = (module: TraceLabelModule = "engine"): string =>
	[
		`const labels = JSON.parse(document.getElementById(${JSON.stringify(traceLabelsElementId(module))}).textContent);`,
		...names(module).map((name, index) => `export const ${name} = labels[${index}];`),
	].join("\n");

/** Plugin Vite : les modules de libellés sont remplacés dans le seul environnement client. */
export function browserTraceLabels(): Plugin {
	return {
		name: "calculateurs:browser-trace-labels",
		enforce: "pre",
		async resolveId(source, importer, options) {
			if (!source.endsWith("labels") || this.environment?.config.consumer !== "client") return null;
			const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
			const module = resolved ? files.get(resolved.id) : undefined;
			return module ? `${VIRTUAL_PREFIX}${module}` : null;
		},
		load(id) {
			if (!id.startsWith(VIRTUAL_PREFIX)) return null;
			return browserTraceLabelsModule(id.slice(VIRTUAL_PREFIX.length) as TraceLabelModule);
		},
	};
}
