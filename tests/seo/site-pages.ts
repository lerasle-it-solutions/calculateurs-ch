/**
 * Rendu de toutes les pages du site par le conteneur d'Astro, sans dépendre
 * d'un `dist/` construit (et peut-être périmé) : chaque test SEO part de la
 * même liste de pages et des mêmes routes valides.
 */
import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { experimental_AstroContainer as AstroContainer } from "astro/container";

const PAGES_PREFIX = "../../src/pages";
const PUBLIC_DIR = fileURLToPath(new URL("../../public/", import.meta.url));

const pageModules = import.meta.glob<{ default: Parameters<AstroContainer["renderToString"]>[0] }>("../../src/pages/**/*.astro");
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

export const pageRoutes: string[] = Object.keys(pageModules).map(routeOf);

export type RenderedPage = { route: string; html: string };

let rendered: Promise<RenderedPage[]> | undefined;

/** Toutes les pages, rendues une seule fois par fichier de test. */
export const renderAllPages = (): Promise<RenderedPage[]> => {
	rendered ??= (async () => {
		const container = await AstroContainer.create({ astroConfig: { site: "https://calculateurs.ch" } });
		const pages: RenderedPage[] = [];
		for (const [path, load] of Object.entries(pageModules)) {
			const route = routeOf(path);
			const { default: Page } = await load();
			const html = await container.renderToString(Page, {
				request: new Request(`https://calculateurs.ch${route}`),
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
