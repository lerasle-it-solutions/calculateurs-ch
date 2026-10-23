import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

import { fr } from "../../src/i18n/fr";
import { visibleBlocks } from "../../src/lib/build/visible-text";
import { ORGANIZATION_ID, WEBSITE_ID } from "../../src/lib/seo/entities";
import { lastmodOf } from "../../src/lib/seo/lastmod";
import { checkMeta, headingJumps, isW3cDatetime, repeatsTitle } from "../../src/lib/seo/meta-rules";
import { DIST, htmlFiles, publicPath } from "../build/dist-pages";

/**
 * Après la construction (`postbuild`) : ce que Bing et Copilot lisent de chaque
 * page de dist/ (prompt SEO du 23.10.2026, étapes 2 à 5).
 *
 * - balises : title et méta-description uniques, sous les limites dures de Bing
 *   (70 et 160 caractères), écarts aux cibles (moins de 60, de 120 à 150)
 *   signalés sans bloquer ; un seul H1, aucun saut de niveau ; langue fr-CH ;
 *   canonical absolu sur l'apex ; aucune directive qui restreint l'extrait ;
 *   `alt` sur chaque image, titre accessible sur chaque SVG porteur de sens ;
 * - sitemap : exactement les pages indexables, `lastmod` daté du dernier commit
 *   de leurs sources (src/lib/seo/lastmod.ts), sans changefreq ni priority ;
 * - robots.txt : ligne Sitemap, rien de bloqué ;
 * - liens internes : directement sur l'URL canonique, slash final compris ;
 * - JSON-LD : syntaxe, types schema.org connus, et rien qui ne soit sur la page.
 */
const SITE = "https://calculateurs.ch";

type Page = { path: string; url: string; html: string; indexable: boolean };
let pages: Page[];
let indexable: Page[];

/** Écarts non bloquants : sur stderr, que Vitest affiche même quand le test passe (la console des tests ne l'est pas). */
const report = (message: string): void => {
	process.stderr.write(`\n${message}\n`);
};

const isNoindex = (html: string): boolean => /<meta\b[^>]*name="robots"[^>]*content="[^"]*noindex/i.test(html);

beforeAll(() => {
	pages = htmlFiles(DIST).map((file) => {
		const html = readFileSync(file, "utf8");
		const path = publicPath(file);
		return { path, url: `${SITE}${path}`, html, indexable: !isNoindex(html) };
	});
	indexable = pages.filter((page) => page.indexable);
});

const decode = (text: string): string =>
	text.replace(/&(#x[0-9a-f]+|#[0-9]+|amp|lt|gt|quot|apos|nbsp);/gi, (entity, code: string) => {
		if (code[0] === "#") return String.fromCodePoint(code[1] === "x" ? Number.parseInt(code.slice(2), 16) : Number.parseInt(code.slice(1), 10));
		return ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " } as Record<string, string>)[code.toLowerCase()] ?? entity;
	});
/** Espaces de toute sorte (insécables, fine) ramenées à une espace ordinaire. */
const squash = (text: string): string => text.replace(/\s+/g, " ").trim();
const textOf = (html: string): string => squash(decode(html.replace(/<[^>]+>/g, " ")));

const titleOf = (html: string): string => decode(html.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "");
const descriptionOf = (html: string): string | undefined => {
	const content = html.match(/<meta\b[^>]*name="description"[^>]*content="([^"]*)"/)?.[1];
	return content === undefined ? undefined : decode(content);
};
/** Texte que lit le visiteur : le corps de la page, hors balises de <head>. */
const visibleText = (html: string): string =>
	squash(
		visibleBlocks(html)
			.filter((block) => block.tag !== "@meta" && block.tag !== "title")
			.map((block) => block.text)
			.join(" "),
	);

const jsonLdBlocks = (html: string): string[] =>
	[...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((match) => match[1]!);
type Node = Record<string, unknown>;
/** Chaque objet d'un JSON-LD, à toute profondeur. */
const nodesOf = (value: unknown): Node[] => {
	if (Array.isArray(value)) return value.flatMap(nodesOf);
	if (value === null || typeof value !== "object") return [];
	return [value as Node, ...Object.values(value).flatMap(nodesOf)];
};
const schemasOf = (html: string): Node[] => jsonLdBlocks(html).map((block) => JSON.parse(block) as Node);

describe("balises de chaque page indexable", () => {
	it("dist/ contient des pages indexables", () => {
		expect(indexable.length).toBeGreaterThan(5);
		expect(indexable.map((page) => page.path)).toContain("/");
	});

	it("title et méta-description sous les limites dures de Bing ; écarts aux cibles signalés", () => {
		const errors: string[] = [];
		const warnings: string[] = [];
		for (const page of pages) {
			const description = descriptionOf(page.html);
			if (description === undefined) {
				errors.push(`${page.path} : méta-description absente`);
				continue;
			}
			const title = titleOf(page.html);
			if (/\b(?:undefined|null|NaN)\b/.test(`${title} ${description}`)) errors.push(`${page.path} : valeur manquante dans « ${title} » / « ${description} »`);
			const result = checkMeta(title, description);
			errors.push(...result.errors.map((message) => `${page.path} : ${message}`));
			if (page.indexable) warnings.push(...result.warnings.map((message) => `${page.path} : ${message}`));
		}
		if (warnings.length > 0) report(`Écarts aux cibles SEO (non bloquants) :\n  ${warnings.join("\n  ")}`);
		expect(errors).toEqual([]);
	});

	it("title et méta-description uniques ; une description qui répète le title est signalée", () => {
		const titles = indexable.map((page) => titleOf(page.html));
		const descriptions = indexable.map((page) => descriptionOf(page.html)!);
		expect(titles.filter((title, index) => titles.indexOf(title) !== index), "title en double").toEqual([]);
		expect(descriptions.filter((text, index) => descriptions.indexOf(text) !== index), "méta-description en double").toEqual([]);
		// Cible, pas limite dure : signalée sans bloquer, comme les longueurs cibles
		const repeating = indexable.filter((page) => repeatsTitle(titleOf(page.html), descriptionOf(page.html)!));
		if (repeating.length > 0) report(`Méta-descriptions qui reprennent le title (non bloquant) :\n  ${repeating.map((page) => `${page.path} : ${titleOf(page.html)} / ${descriptionOf(page.html)}`).join("\n  ")}`);
	});

	it("un seul H1 et aucun saut de niveau de titre", () => {
		const offenders = indexable.flatMap((page) => {
			const levels = [...page.html.matchAll(/<h([1-6])\b/g)].map((match) => Number(match[1]));
			const h1 = levels.filter((level) => level === 1).length;
			return [
				...(h1 === 1 ? [] : [`${page.path} : ${h1} H1`]),
				...headingJumps(levels).map((jump) => `${page.path} : ${jump}`),
			];
		});
		expect(offenders).toEqual([]);
	});

	it("langue fr-CH déclarée par <html lang> et par content-language", () => {
		const offenders = pages.filter(
			(page) =>
				!/<html\b[^>]*\blang="fr-CH"/.test(page.html) ||
				!/<meta\b[^>]*http-equiv="content-language"[^>]*content="fr-CH"/i.test(page.html),
		);
		expect(offenders.map((page) => page.path)).toEqual([]);
	});

	it("canonical absolu, https, sur l'apex, égal à l'URL servie", () => {
		const offenders = indexable.filter((page) => {
			const tags = [...page.html.matchAll(/<link\b[^>]*rel="canonical"[^>]*>/g)];
			return tags.length !== 1 || tags[0]![0].match(/href="([^"]*)"/)?.[1] !== page.url;
		});
		expect(offenders.map((page) => page.path)).toEqual([]);
	});

	it("aucune directive qui réduit l'usage par Bing et Copilot", () => {
		const restrictive = /noarchive|nocache|nosnippet|max-snippet:\s*0|notranslate|noimageindex/i;
		const offenders = indexable.filter((page) => {
			const directives = [...page.html.matchAll(/<meta\b[^>]*name="(?:robots|bingbot|msnbot)"[^>]*content="([^"]*)"/gi)].map((match) => match[1]!);
			return directives.some((content) => restrictive.test(content)) || /\sdata-nosnippet\b/.test(page.html);
		});
		expect(offenders.map((page) => page.path)).toEqual([]);
		const headers = join(DIST, "_headers");
		if (existsSync(headers)) expect(readFileSync(headers, "utf8")).not.toMatch(/x-robots-tag/i);
	});

	it("chaque <img> a un alt ; chaque SVG est décoratif ou porte un titre accessible", () => {
		const offenders = indexable.flatMap((page) => {
			const images = [...page.html.matchAll(/<img\b[^>]*>/g)].filter((tag) => !/\salt=/.test(tag[0])).map((tag) => `${page.path} : ${tag[0]}`);
			const svgs = [...page.html.matchAll(/<svg\b[^>]*>([\s\S]*?)<\/svg>/g)].filter(([svg, inner]) => {
				const open = svg.match(/<svg\b[^>]*>/)![0];
				if (/\saria-hidden="true"/.test(open)) return false;
				if (/\saria-label="[^"]+"/.test(open) || /^\s*<title>[^<]+<\/title>/.test(inner!)) return false;
				const ids = open.match(/\saria-labelledby="([^"]+)"/)?.[1]?.split(/\s+/) ?? [];
				const labelled = ids.length > 0 && ids.every((id) => textOf(page.html.match(new RegExp(`<[a-z]+\\b[^>]*\\sid="${id}"[^>]*>([\\s\\S]*?)</`))?.[1] ?? "") !== "");
				return !(labelled && /\srole="img"/.test(open));
			});
			return [...images, ...svgs.map(([svg]) => `${page.path} : ${svg.slice(0, 120)}`)];
		});
		expect(offenders).toEqual([]);
	});
});

describe("sitemap et robots.txt", () => {
	const read = (name: string) => readFileSync(join(DIST, name), "utf8");
	const locs = (xml: string) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => decode(match[1]!));
	const urlEntries = () =>
		locs(read("sitemap-index.xml")).flatMap((sitemap) =>
			[...read(new URL(sitemap).pathname.slice(1)).matchAll(/<url>([\s\S]*?)<\/url>/g)].map((match) => ({
				loc: decode(match[1]!.match(/<loc>([^<]+)<\/loc>/)![1]!),
				lastmod: match[1]!.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1],
				body: match[1]!,
			})),
		);

	it("le sitemap liste exactement les pages indexables, chacune son propre canonical", () => {
		const listed = urlEntries().map((entry) => entry.loc);
		expect(listed.filter((loc, index) => listed.indexOf(loc) !== index), "URL en double").toEqual([]);
		expect([...listed].sort()).toEqual(indexable.map((page) => page.url).sort());
	});

	it("aucune page en noindex, ni la 404, dans le sitemap", () => {
		const listed = new Set(urlEntries().map((entry) => entry.loc));
		const leaked = pages.filter((page) => !page.indexable && listed.has(page.url));
		expect(leaked.map((page) => page.path)).toEqual([]);
		expect(listed.has(`${SITE}/404/`)).toBe(false);
	});

	it("lastmod en ISO 8601 avec heure et fuseau, sans changefreq ni priority", () => {
		const entries = urlEntries();
		expect(entries.filter((entry) => entry.lastmod === undefined || !isW3cDatetime(entry.lastmod)).map((entry) => `${entry.loc} : ${entry.lastmod}`)).toEqual([]);
		expect(entries.filter((entry) => /<(?:changefreq|priority)>/.test(entry.body)).map((entry) => entry.loc)).toEqual([]);
		const index = read("sitemap-index.xml");
		for (const [, value] of index.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)) expect(isW3cDatetime(value!), value).toBe(true);
	});

	it("lastmod égal au dernier commit des sources de la page, jamais à la date de construction", () => {
		const offenders = urlEntries().filter((entry) => new Date(entry.lastmod!).getTime() !== new Date(lastmodOf(new URL(entry.loc).pathname)).getTime());
		expect(offenders.map((entry) => `${entry.loc} : ${entry.lastmod} au lieu de ${lastmodOf(new URL(entry.loc).pathname)}`)).toEqual([]);
	});

	it("robots.txt déclare l'index du sitemap et ne bloque ni CSS, ni JS, ni données", () => {
		const robots = read("robots.txt");
		expect(robots).toMatch(/^Sitemap: https:\/\/calculateurs\.ch\/sitemap-index\.xml$/m);
		expect(existsSync(join(DIST, "sitemap-index.xml"))).toBe(true);
		const disallowed = [...robots.matchAll(/^Disallow:\s*(\S+)/gim)].map((match) => match[1]!);
		expect(disallowed).toEqual([]);
	});
});

describe("liens internes", () => {
	/** Cible d'un lien interne dans dist/ : une page servie telle quelle, ou un fichier. */
	const servedDirectly = (path: string): boolean => {
		if (/\.[a-z0-9]+$/i.test(path)) return existsSync(join(DIST, decodeURI(path)));
		return path.endsWith("/") && existsSync(join(DIST, decodeURI(path), "index.html"));
	};

	it("chaque lien interne pointe directement sur l'URL canonique, sans redirection ni 404", () => {
		const offenders = pages.flatMap((page) =>
			[...page.html.matchAll(/<a\b[^>]*\shref="([^"]+)"/g)].flatMap(([, raw]) => {
				const href = decode(raw!);
				const absolute = href.match(/^https?:\/\/(?:www\.)?calculateurs\.ch(\/[^?#]*)?/i);
				if (absolute) {
					const path = absolute[1] ?? "";
					return href.startsWith(`${SITE}/`) && servedDirectly(path) ? [] : [`${page.path} → ${href}`];
				}
				if (!href.startsWith("/") || href.startsWith("//")) return [];
				const path = href.split(/[?#]/)[0]!;
				return servedDirectly(path) ? [] : [`${page.path} → ${href}`];
			}),
		);
		expect(offenders).toEqual([]);
	});
});

describe("données structurées", () => {
	const KNOWN_TYPES = new Set([
		"WebSite", "Organization", "PostalAddress", "ImageObject", "WebApplication", "FAQPage", "Question", "Answer",
		"BreadcrumbList", "ListItem", "Article",
	]);
	const REQUIRED: Record<string, string[]> = {
		WebSite: ["@id", "name", "url", "inLanguage", "publisher"],
		WebApplication: ["name", "description", "url", "applicationCategory", "operatingSystem", "publisher"],
		FAQPage: ["mainEntity"],
		Question: ["name", "acceptedAnswer"],
		Answer: ["text"],
		BreadcrumbList: ["itemListElement"],
		ListItem: ["position", "name", "item"],
		Article: ["headline", "url", "dateModified", "author", "publisher"],
	};
	/** Propriétés textuelles qui affirment un contenu : elles doivent se lire sur la page. */
	const CONTENT_PROPERTIES = ["name", "headline", "description", "text", "addressLocality"];

	it("chaque JSON-LD est un JSON valide, en contexte schema.org, de types connus et complets", () => {
		const offenders: string[] = [];
		for (const page of pages) {
			for (const block of jsonLdBlocks(page.html)) {
				let schema: Node;
				try {
					schema = JSON.parse(block) as Node;
				} catch {
					offenders.push(`${page.path} : JSON invalide`);
					continue;
				}
				if (schema["@context"] !== "https://schema.org") offenders.push(`${page.path} : @context ${String(schema["@context"])}`);
				for (const node of nodesOf(schema)) {
					const type = node["@type"];
					if (type === undefined) continue;
					if (typeof type !== "string" || !KNOWN_TYPES.has(type)) {
						offenders.push(`${page.path} : type ${JSON.stringify(type)}`);
						continue;
					}
					const isReference = node["@id"] !== undefined && Object.keys(node).every((key) => ["@id", "@type", "name"].includes(key));
					if (isReference) continue;
					for (const key of REQUIRED[type] ?? []) if (node[key] === undefined) offenders.push(`${page.path} : ${type} sans ${key}`);
				}
			}
		}
		expect(offenders).toEqual([]);
	});

	it("rien dans un JSON-LD qui ne se lise sur la page", () => {
		const offenders: string[] = [];
		for (const page of indexable) {
			const visible = visibleText(page.html);
			const times = new Set([...page.html.matchAll(/<time\b[^>]*datetime="([^"]+)"/g)].map((match) => match[1]!));
			for (const node of schemasOf(page.html).flatMap(nodesOf)) {
				for (const key of CONTENT_PROPERTIES) {
					const value = node[key];
					if (typeof value === "string" && !visible.includes(squash(value))) offenders.push(`${page.path} : ${String(node["@type"])}.${key} « ${value.slice(0, 80)} » absent de la page`);
				}
				for (const key of ["datePublished", "dateModified"]) {
					const value = node[key];
					if (typeof value === "string" && !times.has(value)) offenders.push(`${page.path} : ${key} ${value} sans <time datetime> visible`);
				}
				for (const key of ["url", "item", "logo"]) {
					const value = node[key];
					if (typeof value === "string" && !value.startsWith(`${SITE}/`)) offenders.push(`${page.path} : ${key} ${value} hors de l'apex`);
				}
			}
		}
		expect(offenders).toEqual([]);
	});

	it("la FAQ du JSON-LD est identique aux questions et réponses affichées, dans le même ordre", () => {
		const pagesWithFaq = indexable.filter((page) => schemasOf(page.html).some((schema) => schema["@type"] === "FAQPage"));
		expect(pagesWithFaq.length).toBeGreaterThan(0);
		for (const page of pagesWithFaq) {
			const faq = schemasOf(page.html).find((schema) => schema["@type"] === "FAQPage")!;
			const declared = (faq.mainEntity as Node[]).map((question) => [squash(question.name as string), squash((question.acceptedAnswer as Node).text as string)]);
			const heading = page.html.indexOf(`>${fr.calculator.faqTitle}</h2>`);
			expect(heading, `${page.path} : section FAQ visible`).toBeGreaterThan(0);
			const section = page.html.slice(heading, page.html.indexOf("</section>", heading));
			const shown = [...section.matchAll(/<details\b[^>]*>\s*<summary\b[^>]*>([\s\S]*?)<\/summary>\s*<p\b[^>]*>([\s\S]*?)<\/p>\s*<\/details>/g)].map(([, question, answer]) => [textOf(question!), textOf(answer!)]);
			expect(declared, page.path).toEqual(shown);
		}
	});

	it("le fil d'Ariane du JSON-LD reprend le fil affiché, URL comprises", () => {
		for (const page of indexable) {
			const breadcrumb = schemasOf(page.html).find((schema) => schema["@type"] === "BreadcrumbList");
			if (!breadcrumb) continue;
			const nav = page.html.match(new RegExp(`<nav\\b[^>]*aria-label="${fr.breadcrumb.navLabel}"[\\s\\S]*?</nav>`))![0];
			const shown = [...nav.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)].map(([, item]) => {
				const href = item!.match(/href="([^"]+)"/)?.[1];
				return [textOf(item!.replace(/<span aria-hidden="true">[\s\S]*?<\/span>/, "")), href ? new URL(decode(href), SITE).href : page.url];
			});
			const declared = (breadcrumb.itemListElement as Node[]).map((item) => [squash(item.name as string), item.item]);
			expect(declared, page.path).toEqual(shown);
		}
	});

	it("l'accueil déclare le site et son éditeur ; les autres pages y renvoient comme publisher", () => {
		const home = pages.find((page) => page.path === "/")!;
		const nodes = schemasOf(home.html).flatMap(nodesOf);
		const website = nodes.find((node) => node["@type"] === "WebSite" && node["@id"] === WEBSITE_ID);
		const organization = nodes.find((node) => node["@type"] === "Organization" && node["@id"] === ORGANIZATION_ID && node.logo !== undefined);
		expect(website?.url).toBe(`${SITE}/`);
		expect((website?.publisher as Node | undefined)?.["@id"]).toBe(ORGANIZATION_ID);
		expect(organization?.name).toBe(fr.footer.publisherName);
		expect(organization?.url).toBe(`${SITE}/`);
		expect(((organization?.address as Node | undefined)?.addressLocality)).toBe(fr.footer.publisherLocality);
		const logo = typeof organization?.logo === "string" ? organization.logo : ((organization?.logo as Node | undefined)?.url as string);
		expect(existsSync(join(DIST, new URL(logo).pathname))).toBe(true);

		const publishers = indexable
			.filter((page) => page.path !== "/")
			.flatMap((page) => schemasOf(page.html).flatMap(nodesOf).filter((node) => node.publisher !== undefined).map((node) => ({ page, publisher: node.publisher as Node })));
		expect(publishers.length).toBeGreaterThan(0);
		expect(publishers.filter(({ publisher }) => publisher["@id"] !== ORGANIZATION_ID).map(({ page }) => page.path)).toEqual([]);
	});
});
