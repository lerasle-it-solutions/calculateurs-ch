/**
 * `lastmod` du sitemap (prompt SEO du 23.10.2026, étape 3) : la date du dernier
 * commit qui a touché les sources du contenu d'une page, jamais la date de
 * construction. Lu par astro.config.mjs (`serialize` de @astrojs/sitemap) et
 * vérifié par tests/seo/lastmod.test.ts et tests/seo/bing.test.ts.
 *
 * Les sources d'une page se trouvent en suivant ses imports depuis son fichier
 * de src/pages/. Comptent, parce qu'ils portent ce que la page affiche :
 *   - le fichier de la page elle-même ;
 *   - les définitions de src/calculators/ (périmètre, textes, FAQ, cas exemple) ;
 *   - les articles de src/content/ (le sien pour un guide, tous pour une page
 *     qui les liste) ;
 *   - les données de src/data/ (JSON et registre des sources), hors données
 *     compilées : le dépôt privé n'alimente aucune page publiée ;
 *   - les seules sections de premier niveau de src/i18n/fr.ts que la page lit
 *     (`fr.<section>`), datées par `git log -L`.
 * Ne comptent pas : l'habillage commun à toutes les pages (gabarits, en-tête,
 * pied de page, styles, logo), le code (src/lib/, src/components/) et les
 * autres pages. Une retouche de mise en page ne modifie pas le contenu.
 *
 * L'historique doit être complet : sur Cloudflare Pages, le dépôt est cloné en
 * profondeur réduite, et scripts/ensure-git-history.ts le complète avant la
 * construction. Sur un clone incomplet, `lastmodOf` refuse de dater plutôt
 * que de donner une date fausse.
 */
import { execFileSync } from "node:child_process";
import { existsSync, globSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const FR_FILE = "src/i18n/fr.ts";
const ARTICLES_DIR = "src/content/articles";

/** Fichiers de contenu : leur dernier commit date la page. */
const COUNTED = [/^src\/calculators\//, /^src\/content\//, /^src\/data\/(?!private\/).+\.json$/, /^src\/data\/sources\.ts$/];
/** Habillage commun et fichiers hors contenu : ni comptés, ni suivis. */
const NOT_FOLLOWED = [
	/^src\/layouts\//,
	/^src\/components\/layout\/(?:Header|Footer)\.astro$/,
	/^src\/components\/seo\//,
	/^src\/styles\//,
	/^src\/assets\//,
	/^src\/data\/private\//,
	/^src\/pages\//,
	new RegExp(`^${FR_FILE.replace(/[./]/g, "\\$&")}$`),
];
const EXTENSIONS = [".ts", ".astro", ".mjs", ".js", ".mdx", ".json"];

const toRepo = (absolute: string): string => relative(ROOT, absolute).split("\\").join("/");
const isFile = (absolute: string): boolean => existsSync(absolute) && statSync(absolute).isFile();

/** Fichier désigné par un import relatif, extension implicite comprise. */
const resolveImport = (from: string, specifier: string): string | null => {
	const base = resolve(dirname(from), specifier.split("?")[0]!);
	const candidates = [
		base,
		...EXTENSIONS.map((extension) => `${base}${extension}`),
		...(base.endsWith(".js") ? [base.replace(/\.js$/, ".ts")] : []),
		join(base, "index.ts"),
		join(base, "index.astro"),
	];
	return candidates.find(isFile) ?? null;
};

type Dependencies = { files: string[]; usesCollections: boolean; frSections: string[] };

/** Imports d'un fichier : statiques, dynamiques et `import.meta.glob`, plus les sections de fr.ts qu'il lit. */
const dependenciesOf = (absolute: string): Dependencies => {
	const source = readFileSync(absolute, "utf8");
	const specifiers = [
		...[...source.matchAll(/\b(?:import|export)\s+(?:[^'"`;]*?\sfrom\s+)?["']([^"']+)["']/g)].map((match) => match[1]!),
		...[...source.matchAll(/\bimport\(\s*["']([^"']+)["']\s*\)/g)].map((match) => match[1]!),
	];
	const files = specifiers.filter((specifier) => specifier.startsWith(".")).flatMap((specifier) => resolveImport(absolute, specifier) ?? []);
	for (const [, argument] of source.matchAll(/import\.meta\.glob\b[\s\S]*?\(\s*(\[[^\]]*\]|["'][^"']+["'])/g)) {
		for (const [, pattern] of argument!.matchAll(/["']([^"']+)["']/g)) {
			if (pattern!.startsWith("!")) continue;
			files.push(...globSync(pattern!, { cwd: dirname(absolute) }).map((match) => resolve(dirname(absolute), match)).filter(isFile));
		}
	}
	return {
		files,
		usesCollections: specifiers.includes("astro:content"),
		frSections: [...source.matchAll(/\bfr\.(\w+)/g)].map((match) => match[1]!),
	};
};

/** Fichier de src/pages/ d'une route, et l'article d'un guide (route dynamique). */
const pageFilesOf = (route: string): { page: string; article?: string } => {
	if (!route.startsWith("/") || !route.endsWith("/")) throw new Error(`Route invalide : ${route}`);
	const path = route.slice(0, -1);
	for (const candidate of route === "/" ? ["src/pages/index.astro"] : [`src/pages${path}/index.astro`, `src/pages${path}.astro`]) {
		if (isFile(join(ROOT, candidate))) return { page: candidate };
	}
	const parent = `src/pages${path.slice(0, path.lastIndexOf("/"))}`;
	const slug = path.slice(path.lastIndexOf("/") + 1);
	const dynamic = existsSync(join(ROOT, parent)) ? readdirSync(join(ROOT, parent)).find((entry) => /^\[\w+\]\.astro$/.test(entry)) : undefined;
	const article = `${ARTICLES_DIR}/${slug}.mdx`;
	if (dynamic && isFile(join(ROOT, article))) return { page: `${parent}/${dynamic}`, article };
	throw new Error(`Aucune page ne sert la route ${route}`);
};

export type PageSources = { files: string[]; frSections: string[] };

const sourcesCache = new Map<string, PageSources>();

/** Sources du contenu d'une page : fichiers comptés et sections de fr.ts lues. */
export const pageSources = (route: string): PageSources => {
	const cached = sourcesCache.get(route);
	if (cached) return cached;
	const { page, article } = pageFilesOf(route);
	const counted = new Set<string>([page, ...(article ? [article] : [])]);
	const sections = new Set<string>();
	const seen = new Set<string>();
	let listsArticles = false;
	const queue = [join(ROOT, page), ...(article ? [join(ROOT, article)] : [])];
	while (queue.length > 0) {
		const absolute = queue.shift()!;
		if (seen.has(absolute)) continue;
		seen.add(absolute);
		const dependencies = dependenciesOf(absolute);
		dependencies.frSections.forEach((section) => sections.add(section));
		// Un guide ne dépend que de son article ; une autre page qui lit la collection les liste tous.
		if (dependencies.usesCollections && !(article && toRepo(absolute) === page)) listsArticles = true;
		for (const file of dependencies.files) {
			const repoPath = toRepo(file);
			if (repoPath.startsWith("..") || repoPath.includes("node_modules/") || NOT_FOLLOWED.some((rule) => rule.test(repoPath))) continue;
			if (COUNTED.some((rule) => rule.test(repoPath))) counted.add(repoPath);
			queue.push(file);
		}
	}
	if (listsArticles) {
		for (const entry of readdirSync(join(ROOT, ARTICLES_DIR))) if (entry.endsWith(".mdx")) counted.add(`${ARTICLES_DIR}/${entry}`);
	}
	const known = frSectionRanges(readFileSync(join(ROOT, FR_FILE), "utf8"));
	const result = { files: [...counted].sort(), frSections: [...sections].filter((section) => section in known).sort() };
	sourcesCache.set(route, result);
	return result;
};

/** Lignes (à partir de 1) de chaque section de premier niveau de fr.ts : `\tsection: {` … `\t},`. */
export const frSectionRanges = (source: string): Record<string, [number, number]> => {
	const ranges: Record<string, [number, number]> = {};
	const lines = source.split("\n");
	let open: { name: string; start: number } | null = null;
	lines.forEach((line, index) => {
		const start = /^\t(\w+): \{\s*$/.exec(line);
		if (!open && start) open = { name: start[1]!, start: index + 1 };
		else if (open && /^\t\},?\s*$/.test(line)) {
			ranges[open.name] = [open.start, index + 1];
			open = null;
		}
	});
	return ranges;
};

const git = (args: string[]): string => execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).trim();

let historyChecked = false;
const assertFullHistory = (): void => {
	if (historyChecked) return;
	if (git(["rev-parse", "--is-shallow-repository"]) === "true") {
		throw new Error("Historique git incomplet (clone superficiel) : lastmod impossible à dater. Lancer scripts/ensure-git-history.ts avant la construction.");
	}
	historyChecked = true;
};

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/;
const sectionDates = new Map<string, string | null>();

/** Dernier commit qui a touché une section de fr.ts, dans sa version de HEAD. */
const sectionDate = (section: string, ranges: Record<string, [number, number]>): string | null => {
	if (!sectionDates.has(section)) {
		const [start, end] = ranges[section]!;
		const output = git(["log", "-1", "--format=%x00%cI", "-L", `${start},${end}:${FR_FILE}`]);
		sectionDates.set(section, output.split("\n").map((line) => line.replace(/^\0/, "")).find((line) => ISO.test(line)) ?? null);
	}
	return sectionDates.get(section)!;
};

const lastmodCache = new Map<string, string>();

/** `lastmod` d'une route : date ISO 8601 du dernier commit de ses sources, avec le fuseau du commit. */
export const lastmodOf = (route: string): string => {
	const cached = lastmodCache.get(route);
	if (cached) return cached;
	assertFullHistory();
	const { files, frSections } = pageSources(route);
	const ranges = frSectionRanges(git(["show", `HEAD:${FR_FILE}`]));
	const dates = [
		git(["log", "-1", "--format=%cI", "--", ...files]),
		...frSections.filter((section) => section in ranges).map((section) => sectionDate(section, ranges)),
	].filter((date): date is string => typeof date === "string" && ISO.test(date));
	if (dates.length === 0) throw new Error(`Aucun commit ne date les sources de ${route}`);
	const latest = dates.reduce((a, b) => (new Date(b).getTime() > new Date(a).getTime() ? b : a));
	lastmodCache.set(route, latest);
	return latest;
};
