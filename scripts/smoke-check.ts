#!/usr/bin/env -S npx tsx
/**
 * Contrôle du site servi, lancé à la main après une mise en ligne (`npm run smoke`).
 *
 * Lit le sitemap de production, charge chaque URL et échoue si :
 *   - la réponse n'est pas 200 ;
 *   - le canonical de la page n'est pas son URL ;
 *   - le H1 est celui de l'accueil sur une autre page.
 *
 * Origine : en production, /donnees/ et /methodologie/ ont servi une ancienne
 * accueil (canonical https://calculateurs.ch/) alors que dist/ était juste
 * (tests/build/canonical.test.ts le vérifie avant la mise en ligne).
 *
 * Usage : `npm run smoke` contrôle https://calculateurs.ch ; `npm run smoke --
 * https://<déploiement>.pages.dev` charge les pages depuis une autre origine, en
 * comparant toujours le canonical à l'URL de production. Aucune dépendance :
 * fetch natif de Node.js.
 */
const SITE = "https://calculateurs.ch";
const origin = (process.argv[2] ?? SITE).replace(/\/+$/, "");

const ENTITIES: Record<string, string> = { "&amp;": "&", "&#39;": "'", "&#x27;": "'", "&apos;": "'", "&quot;": '"', "&nbsp;": " " };
const decode = (text: string): string => text.replace(/&(?:amp|#39|#x27|apos|quot|nbsp);/g, (entity) => ENTITIES[entity] ?? entity);

const locs = (xml: string): string[] => [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((match) => decode(match[1]));

const canonicalOf = (html: string): string | null => {
	const tag = html.match(/<link\b[^>]*\brel=["']canonical["'][^>]*>/)?.[0];
	return tag?.match(/\bhref=["']([^"']*)["']/)?.[1] ?? null;
};

const h1Of = (html: string): string | null => {
	const inner = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1];
	return inner === undefined ? null : decode(inner.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
};

/** URL de production → URL chargée (identique sauf si une autre origine est passée). */
const served = (url: string): string => url.replace(SITE, origin);

const fetchText = async (url: string): Promise<{ status: number; text: string }> => {
	const response = await fetch(url, { redirect: "manual" });
	return { status: response.status, text: await response.text() };
};

const main = async (): Promise<number> => {
	const index = await fetchText(served(`${SITE}/sitemap-index.xml`));
	if (index.status !== 200) {
		console.error(`Sitemap introuvable (${index.status}) : ${served(`${SITE}/sitemap-index.xml`)}`);
		return 1;
	}
	const sitemaps = locs(index.text);
	const urls = (await Promise.all(sitemaps.map(async (sitemap) => locs((await fetchText(served(sitemap))).text)))).flat();
	if (urls.length === 0) {
		console.error("Le sitemap ne liste aucune URL.");
		return 1;
	}

	const home = await fetchText(served(`${SITE}/`));
	const homeH1 = h1Of(home.text);

	const failures: string[] = [];
	for (const url of urls) {
		const { status, text } = await fetchText(served(url));
		const problems: string[] = [];
		if (status !== 200) problems.push(`statut ${status}`);
		const canonical = canonicalOf(text);
		if (canonical !== url) problems.push(`canonical ${canonical ?? "absent"}`);
		const h1 = h1Of(text);
		if (url !== `${SITE}/` && homeH1 !== null && h1 === homeH1) problems.push(`H1 de l'accueil (« ${h1} »)`);
		console.log(`${problems.length === 0 ? "ok    " : "ÉCHEC "} ${served(url)}${problems.length === 0 ? "" : ` — ${problems.join(" ; ")}`}`);
		if (problems.length > 0) failures.push(url);
	}

	console.log(`\n${urls.length - failures.length} / ${urls.length} pages conformes.`);
	return failures.length === 0 ? 0 : 1;
};

process.exitCode = await main();
