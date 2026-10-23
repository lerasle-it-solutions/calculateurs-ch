#!/usr/bin/env -S npx tsx
/**
 * Contrôle du site servi, lancé à la main après une mise en ligne (`npm run smoke`).
 *
 * Échoue si :
 *   - robots.txt ou l'index du sitemap ne répond pas 200, ou robots.txt ne
 *     déclare pas l'index du sitemap ;
 *   - une URL du sitemap ne répond pas 200, ou son canonical n'est pas son URL,
 *     ou son H1 est celui de l'accueil sur une autre page ;
 *   - la variante www, http ou sans slash final d'une URL du sitemap ne
 *     redirige pas en un seul saut (301 ou 308) vers l'URL canonique ;
 *   - une URL inexistante ne répond pas 404 avec la page 404 du site ;
 *   - une réponse servie à l'agent utilisateur de Bingbot est une page de défi
 *     Cloudflare.
 * Signale sans échouer les combinaisons (http et www, www ou http sans slash
 * final) qui font plus d'un saut : elles relèvent des règles de Cloudflare.
 *
 * Origine : en production, /donnees/ et /methodologie/ ont servi une ancienne
 * accueil (canonical https://calculateurs.ch/) alors que dist/ était juste
 * (tests/build/canonical.test.ts le vérifie avant la mise en ligne) ; prompt
 * SEO du 23.10.2026 pour les redirections, la 404 et Bingbot.
 *
 * Usage : `npm run smoke` contrôle https://calculateurs.ch ; `npm run smoke --
 * https://<déploiement>.pages.dev` charge les pages depuis une autre origine, en
 * comparant toujours le canonical à l'URL de production (les redirections et
 * Bingbot ne sont alors pas contrôlés : ils dépendent du domaine). Aucune
 * dépendance : fetch natif de Node.js.
 */
import { BINGBOT_USER_AGENT, canonicalOf, checkNotFound, checkRedirect, h1Of, isChallenge, locs, redirectVariants, SITE } from "./smoke-rules";

const servedOrigin = (process.argv[2] ?? SITE).replace(/\/+$/, "");
const onProduction = servedOrigin === SITE;

/** URL de production → URL chargée (identique sauf si une autre origine est passée). */
const served = (url: string): string => url.replace(SITE, servedOrigin);

type Fetched = { status: number; text: string; headers: Headers; location: string | null };
const fetchPage = async (url: string, userAgent?: string): Promise<Fetched> => {
	const response = await fetch(url, { redirect: "manual", ...(userAgent ? { headers: { "user-agent": userAgent } } : {}) });
	return { status: response.status, text: await response.text(), headers: response.headers, location: response.headers.get("location") };
};

const failures: string[] = [];
const warnings: string[] = [];
const report = (ok: boolean, label: string, problems: string[] = []) => {
	console.log(`${ok ? "ok    " : "ÉCHEC "} ${label}${problems.length === 0 ? "" : ` : ${problems.join(" ; ")}`}`);
	if (!ok) failures.push(label);
};

const main = async (): Promise<number> => {
	console.log("— robots.txt et sitemap");
	const robots = await fetchPage(served(`${SITE}/robots.txt`));
	const robotsProblems = [
		...(robots.status === 200 ? [] : [`statut ${robots.status}`]),
		...(/^Sitemap:\s*https:\/\/calculateurs\.ch\/sitemap-index\.xml\s*$/m.test(robots.text) ? [] : ["ligne Sitemap absente"]),
	];
	report(robotsProblems.length === 0, served(`${SITE}/robots.txt`), robotsProblems);

	const index = await fetchPage(served(`${SITE}/sitemap-index.xml`));
	report(index.status === 200, served(`${SITE}/sitemap-index.xml`), index.status === 200 ? [] : [`statut ${index.status}`]);
	if (index.status !== 200) return 1;
	const sitemaps = locs(index.text);
	const urls: string[] = [];
	for (const sitemap of sitemaps) {
		const page = await fetchPage(served(sitemap));
		report(page.status === 200, served(sitemap), page.status === 200 ? [] : [`statut ${page.status}`]);
		urls.push(...locs(page.text));
	}
	if (urls.length === 0) {
		console.error("Le sitemap ne liste aucune URL.");
		return 1;
	}

	console.log("\n— pages du sitemap");
	const homeH1 = h1Of((await fetchPage(served(`${SITE}/`))).text);
	for (const url of urls) {
		const { status, text } = await fetchPage(served(url));
		const problems: string[] = [];
		if (status !== 200) problems.push(`statut ${status}`);
		const canonical = canonicalOf(text);
		if (canonical !== url) problems.push(`canonical ${canonical ?? "absent"}`);
		const h1 = h1Of(text);
		if (url !== `${SITE}/` && homeH1 !== null && h1 === homeH1) problems.push(`H1 de l'accueil (« ${h1} »)`);
		report(problems.length === 0, served(url), problems);
	}

	console.log("\n— URL inexistante");
	const missing = served(`${SITE}/page-inexistante-${Date.now()}/`);
	const notFound = await fetchPage(missing);
	const notFoundProblems = checkNotFound({ status: notFound.status, body: notFound.text });
	report(notFoundProblems.length === 0, missing, notFoundProblems);

	if (onProduction) {
		console.log("\n— redirections vers l'URL canonique");
		for (const url of urls) {
			for (const variant of redirectVariants(url)) {
				const response = await fetchPage(variant.url);
				const problems = checkRedirect(response, url, variant.url);
				if (variant.single) report(problems.length === 0, `${variant.label} : ${variant.url}`, problems);
				else if (problems.length > 0) {
					warnings.push(`${variant.label} : ${variant.url} : ${problems.join(" ; ")}`);
				}
			}
		}

		console.log("\n— agent utilisateur de Bingbot");
		for (const url of [`${SITE}/robots.txt`, `${SITE}/sitemap-index.xml`, ...urls]) {
			const response = await fetchPage(url, BINGBOT_USER_AGENT);
			const problems = [
				...(response.status === 200 ? [] : [`statut ${response.status}`]),
				...(isChallenge({ status: response.status, headers: response.headers, body: response.text }) ? ["page de défi Cloudflare"] : []),
			];
			report(problems.length === 0, `Bingbot : ${url}`, problems);
		}
	}

	if (warnings.length > 0) console.log(`\nSignalé (règles Cloudflare, sans échec) :\n  ${warnings.join("\n  ")}`);
	console.log(`\n${failures.length === 0 ? "Aucun échec." : `${failures.length} échec(s).`}`);
	return failures.length === 0 ? 0 : 1;
};

process.exitCode = await main();
