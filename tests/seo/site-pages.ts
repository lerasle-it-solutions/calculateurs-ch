/**
 * Rendu de toutes les pages du site par le conteneur d'Astro, sans dépendre
 * d'un `dist/` construit (et peut-être périmé) : chaque test SEO part de la
 * même liste de pages et des mêmes routes valides.
 */
import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { getContainerRenderer as mdxRenderer } from "@astrojs/mdx/container-renderer";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { loadRenderers } from "astro:container";

const PAGES_PREFIX = "../../src/pages";
const PUBLIC_DIR = fileURLToPath(new URL("../../public/", import.meta.url));

type PageModule = {
	default: Parameters<AstroContainer["renderToString"]>[0];
	getStaticPaths?: () => Promise<{ params: Record<string, string>; props?: Record<string, unknown> }[]>;
};
const pageModules = import.meta.glob<PageModule>("../../src/pages/**/*.astro");
const endpointModules = import.meta.glob("../../src/pages/**/*.ts");

/** « ../../src/pages/prevoyance/index.astro » → « /prevoyance/ » ; « 404.astro » → « /404/ ». */
export const routeOf = (modulePath: string): string => {
	const path = modulePath.slice(PAGES_PREFIX.length).replace(/\.astro$/, "").replace(/\/index$/, "");
	return path === "" ? "/" : `${path}/`;
};

/** Fichiers servis tels quels : public/ et routes non HTML (src/pages/**\/*.ts). */
const walk = (dir: string): string[] =>
	readdirSync(dir).flatMap((entry) => {
		const path = join(dir, entry);
		return statSync(path).isDirectory() ? walk(path) : [`/${relative(PUBLIC_DIR, path)}`];
	});
export const staticFiles: string[] = [
	...walk(PUBLIC_DIR),
	...Object.keys(endpointModules).map((path) => path.slice(PAGES_PREFIX.length).replace(/\.ts$/, "")),
];

/** « /prevoyance/guides/[slug]/ » + { slug: "x" } → « /prevoyance/guides/x/ ». */
const fill = (route: string, params: Record<string, string>): string =>
	route.replace(/\[(\w+)\]/g, (_, name: string) => params[name] ?? `[${name}]`);

/** Chaque page à rendre : une par fichier, une par jeu de paramètres pour une route dynamique. */
const pagesToRender = async (): Promise<{ route: string; Page: PageModule["default"]; params?: Record<string, string>; props?: Record<string, unknown> }[]> => {
	const out = [];
	for (const [path, load] of Object.entries(pageModules)) {
		const module = await load();
		const route = routeOf(path);
		if (!route.includes("[")) {
			out.push({ route, Page: module.default });
			continue;
		}
		for (const { params, props } of (await module.getStaticPaths?.()) ?? []) {
			out.push({ route: fill(route, params), Page: module.default, params, props });
		}
	}
	return out;
};

let routes: Promise<string[]> | undefined;
/** Routes des pages du site, routes dynamiques résolues. */
export const pageRoutes = (): Promise<string[]> => {
	routes ??= pagesToRender().then((pages) => pages.map((page) => page.route));
	return routes;
};

export type RenderedPage = { route: string; html: string };

let rendered: Promise<RenderedPage[]> | undefined;

/** Toutes les pages, rendues une seule fois par fichier de test. */
export const renderAllPages = (): Promise<RenderedPage[]> => {
	rendered ??= (async () => {
		// Le rendu MDX des articles (collection `articles`) demande son moteur de rendu.
		const renderers = await loadRenderers([mdxRenderer()]);
		const container = await AstroContainer.create({ astroConfig: { site: "https://calculateurs.ch" }, renderers });
		const pages: RenderedPage[] = [];
		for (const { route, Page, params, props } of await pagesToRender()) {
			const html = await container.renderToString(Page, {
				request: new Request(`https://calculateurs.ch${route}`),
				...(params ? { params } : {}),
				...(props ? { props } : {}),
			});
			pages.push({ route, html });
		}
		return pages;
	})();
	return rendered;
};

const ENTITIES: Record<string, string> = { "&amp;": "&", "&#39;": "'", "&quot;": '"', "&lt;": "<", "&gt;": ">", "&nbsp;": " " };
export const decodeEntities = (text: string): string =>
	text.replace(/&(?:amp|#39|quot|lt|gt|nbsp);/g, (entity) => ENTITIES[entity] ?? entity);

export const isNoindex = (html: string): boolean => /<meta name="robots" content="[^"]*noindex/.test(html);
