/**
 * Règles du contrôle de production (scripts/smoke-check.ts), sans réseau :
 * testées par tests/scripts/smoke-rules.test.ts.
 */
export const SITE = "https://calculateurs.ch";

/** Agent utilisateur de Bingbot, tel que Bing le publie. */
export const BINGBOT_USER_AGENT = "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)";

const ENTITIES: Record<string, string> = { "&amp;": "&", "&#39;": "'", "&#x27;": "'", "&apos;": "'", "&quot;": '"', "&nbsp;": " " };
export const decode = (text: string): string => text.replace(/&(?:amp|#39|#x27|apos|quot|nbsp);/g, (entity) => ENTITIES[entity] ?? entity);

export const locs = (xml: string): string[] => [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((match) => decode(match[1]!));

export const canonicalOf = (html: string): string | null => {
	const tag = html.match(/<link\b[^>]*\brel=["']canonical["'][^>]*>/)?.[0];
	return tag?.match(/\bhref=["']([^"']*)["']/)?.[1] ?? null;
};

export const h1Of = (html: string): string | null => {
	const inner = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1];
	return inner === undefined ? null : decode(inner.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
};

export type Variant = { label: string; url: string; single: boolean };

/**
 * Variantes d'une URL canonique qui doivent y rediriger : www, http et sans
 * slash final, chacune seule (`single`, en un seul saut exigé), puis leurs
 * combinaisons (signalées si elles font plus d'un saut).
 */
export const redirectVariants = (canonical: string): Variant[] => {
	const url = new URL(canonical);
	const www = (target: URL) => Object.assign(new URL(target), { hostname: `www.${url.hostname}` });
	const http = (target: URL) => Object.assign(new URL(target), { protocol: "http:" });
	const noSlash = (target: URL) => Object.assign(new URL(target), { pathname: target.pathname.replace(/\/$/, "") });
	const hasSlashVariant = url.pathname !== "/";
	const variants: Variant[] = [
		{ label: "www", url: www(url).href, single: true },
		{ label: "http", url: http(url).href, single: true },
		...(hasSlashVariant ? [{ label: "sans slash final", url: noSlash(url).href, single: true }] : []),
		{ label: "http et www", url: http(www(url)).href, single: false },
		...(hasSlashVariant
			? [
					{ label: "www sans slash final", url: noSlash(www(url)).href, single: false },
					{ label: "http sans slash final", url: noSlash(http(url)).href, single: false },
				]
			: []),
	];
	return variants;
};

/** Une redirection permanente (301 ou 308), directement vers l'URL canonique. */
export const checkRedirect = (response: { status: number; location: string | null }, canonical: string, requested: string = canonical): string[] => {
	const problems: string[] = [];
	if (response.status !== 301 && response.status !== 308) problems.push(`statut ${response.status}, attendu 301 ou 308`);
	const target = response.location === null ? null : new URL(response.location, requested).href;
	if (target !== canonical) problems.push(`redirige vers ${target ?? "rien"} au lieu de ${canonical}`);
	return problems;
};

/** Une URL inexistante : statut 404 et page 404 du site (noindex, canonical /404/). */
export const checkNotFound = (response: { status: number; body: string }): string[] => {
	const problems: string[] = [];
	if (response.status !== 404) problems.push(`statut ${response.status}, attendu 404`);
	if (canonicalOf(response.body) !== `${SITE}/404/` || !/<meta name="robots" content="[^"]*noindex/.test(response.body)) problems.push("ce n'est pas la page 404 du site");
	return problems;
};

/**
 * Page de défi Cloudflare (vérification de navigateur, Turnstile) au lieu du
 * contenu. Le script « JavaScript Detections » (/cdn-cgi/challenge-platform/scripts/jsd/)
 * que Cloudflare injecte dans chaque page servie n'en est pas une.
 */
export const isChallenge = (response: { status: number; headers: Headers; body: string }): boolean =>
	response.headers.get("cf-mitigated") === "challenge" ||
	/\/cdn-cgi\/challenge-platform\/h\/|<title>Just a moment\.\.\.<\/title>|window\._cf_chl_opt|Attention Required! \| Cloudflare/i.test(response.body);
