// Why: every calculator page must stay under 30,000 bytes of startup JavaScript
// (CLAUDE.md § 3). Vite wraps each dynamic import() in its preload helper
// (~1,350 bytes), which preloads the imported chunk's JS and CSS dependencies.
// This plugin removes that helper and calls the loader directly. It is only safe
// because our dynamic imports have no CSS of their own and their JS dependencies
// are already loaded by the page; the build fails if either assumption breaks.
// Re-check this plugin (helper id, export name, checks) on every Vite or Astro
// upgrade.

/**
 * `import()` direct dans le navigateur, sans le helper de préchargement de Vite.
 *
 * Vite enveloppe chaque `import()` dans `__vitePreload`, qui insère des
 * `<link rel="modulepreload">` pour les dépendances du module chargé à la
 * demande, et charge ses feuilles de style. Sur nos pages, ces dépendances (le
 * moteur, le formateur) sont déjà chargées par le script de la page : le
 * préchargement n'apporte rien, mais ses quelque 1 300 octets comptaient dans le
 * budget de démarrage de chaque page qui charge un module à la demande.
 * `build.modulePreload: false` ne suffit pas : Vite garde l'appel et le helper,
 * avec une liste vide.
 *
 * Le plugin remplace donc le module du helper par un appel direct du chargeur.
 * Un échec de chargement rejette la promesse, comme avec le helper ; seul
 * l'événement `vite:preloadError`, qu'aucune page n'écoute, n'est plus émis.
 *
 * La construction échoue si le helper n'a pas été trouvé alors que le paquet
 * du navigateur contient des `import()`, si le helper d'origine y figure
 * encore, ou si un module chargé à la demande importe une feuille de style.
 */
import type { Plugin } from "vite";

/** Identifiant du module virtuel du helper dans Vite (`preloadHelperId`). */
export const VITE_PRELOAD_HELPER_ID = "\0vite/preload-helper.js";

/** Remplaçant du helper : même export, chargement direct. */
export const DIRECT_PRELOAD_HELPER = "export const __vitePreload = (load) => load();";

/** Chaîne propre au helper d'origine : sa présence dans un morceau signale qu'il n'a pas été remplacé. */
const ORIGINAL_HELPER_MARKER = "vite:preloadError";

/** Ce que les vérifications lisent d'un morceau du paquet du navigateur. */
export type BundleChunk = {
	code: string;
	imports: readonly string[];
	dynamicImports: readonly string[];
	importedCss: readonly string[];
};

/**
 * Problèmes qui rendent le chargement direct incorrect, en messages prêts à
 * afficher ; liste vide si tout va bien.
 */
export const directImportProblems = (chunks: Record<string, BundleChunk>, helperReplaced: boolean): string[] => {
	const problems: string[] = [];
	const importers = Object.entries(chunks).filter(([, chunk]) => chunk.dynamicImports.length > 0);
	if (importers.length > 0 && !helperReplaced) {
		problems.push(
			`le helper de préchargement de Vite (${JSON.stringify(VITE_PRELOAD_HELPER_ID)}) n'a pas été trouvé, alors que des import() figurent dans ${importers.map(([file]) => file).join(", ")} : Vite ou Astro l'a sans doute renommé.`,
		);
	}
	for (const [file, chunk] of Object.entries(chunks)) {
		if (chunk.code.includes(ORIGINAL_HELPER_MARKER)) {
			problems.push(`${file} contient encore le helper de préchargement d'origine de Vite.`);
		}
	}
	for (const [importer, chunk] of importers) {
		for (const target of chunk.dynamicImports) {
			const seen = new Set<string>();
			const visit = (file: string): void => {
				if (seen.has(file) || !chunks[file]) return;
				seen.add(file);
				for (const css of chunks[file].importedCss) {
					problems.push(
						`${importer} charge ${target} à la demande, qui dépend de la feuille de style ${css} (via ${file}) : sans le helper, elle ne serait pas chargée.`,
					);
				}
				chunks[file].imports.forEach(visit);
			};
			visit(target);
		}
	}
	return problems;
};

export const directDynamicImport = (): Plugin => {
	const replaced = new Set<string>();
	return {
		name: "calculateurs:direct-dynamic-import",
		apply: "build",
		enforce: "pre",
		load(id) {
			if (id !== VITE_PRELOAD_HELPER_ID) return undefined;
			replaced.add(this.environment.name);
			return DIRECT_PRELOAD_HELPER;
		},
		generateBundle(_options, bundle) {
			if (this.environment.config.consumer !== "client") return;
			const chunks: Record<string, BundleChunk> = {};
			for (const [file, output] of Object.entries(bundle)) {
				if (output.type !== "chunk") continue;
				chunks[file] = {
					code: output.code,
					imports: output.imports,
					dynamicImports: output.dynamicImports,
					importedCss: [...(output.viteMetadata?.importedCss ?? [])],
				};
			}
			const problems = directImportProblems(chunks, replaced.has(this.environment.name));
			if (problems.length > 0) {
				this.error(`[direct-dynamic-import] chargement direct des import() impossible :\n- ${problems.join("\n- ")}`);
			}
		},
	};
};
