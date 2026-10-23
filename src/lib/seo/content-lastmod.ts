/**
 * `lastmod` du sitemap par empreinte de contenu (arbitrage du mainteneur,
 * 23.10.2026) : une page change quand le texte visible de son <main> change,
 * et seulement alors. L'habillage commun (en-tête, pied de page), le balisage
 * et le code n'y entrent pas.
 *
 * seo/lastmod.json garde, par URL, l'empreinte (SHA-256 du texte visible de
 * <main> dans dist/) et la date de son dernier changement. `npm run lastmod`
 * (scripts/lastmod.ts) le met à jour après une construction ; astro.config.mjs
 * le lit pour le sitemap ; tests/seo/bing.test.ts fait échouer la construction
 * s'il n'est pas à jour. La construction ne dépend ni de l'historique git ni
 * de sa propre date.
 */
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { visibleBlocks } from "../build/visible-text";

export const SITE = "https://calculateurs.ch";
export const LEDGER_FILE = fileURLToPath(new URL("../../../seo/lastmod.json", import.meta.url));

export type LedgerEntry = { hash: string; lastmod: string };
export type Ledger = Record<string, LedgerEntry>;

/** Texte visible de l'unique <main> de la page, un bloc par ligne, espaces normalisées. */
export const mainText = (html: string): string => {
	const mains = [...html.matchAll(/<main\b[^>]*>([\s\S]*?)<\/main>/g)];
	if (mains.length !== 1) throw new Error(`${mains.length} éléments <main> au lieu d'un`);
	return visibleBlocks(mains[0]![1]!)
		.map((block) => block.text.replace(/\s+/g, " ").trim())
		.filter(Boolean)
		.join("\n");
};

/** Empreinte SHA-256 (hexadécimale) du texte visible de <main>. */
export const contentHash = (html: string): string => createHash("sha256").update(mainText(html)).digest("hex");

const sortKeys = (ledger: Ledger): Ledger => Object.fromEntries(Object.entries(ledger).sort(([a], [b]) => a.localeCompare(b)));

/**
 * Nouvelle version du registre : une empreinte inchangée garde sa date, une
 * empreinte nouvelle ou changée prend `now`, une URL disparue est retirée.
 */
export const updateLedger = (ledger: Ledger, hashes: Record<string, string>, now: string): { ledger: Ledger; changed: string[]; removed: string[] } => {
	const next: Ledger = {};
	const changed: string[] = [];
	for (const [url, hash] of Object.entries(hashes)) {
		const previous = ledger[url];
		if (previous && previous.hash === hash) next[url] = previous;
		else {
			next[url] = { hash, lastmod: now };
			changed.push(url);
		}
	}
	const removed = Object.keys(ledger).filter((url) => !(url in hashes));
	return { ledger: sortKeys(next), changed: changed.sort(), removed: removed.sort() };
};

/** Écarts entre le registre et les empreintes de dist/ ; vide si le registre est à jour. */
export const ledgerProblems = (ledger: Ledger, hashes: Record<string, string>): string[] =>
	[...new Set([...Object.keys(ledger), ...Object.keys(hashes)])].sort().flatMap((url) => {
		const entry = ledger[url];
		const hash = hashes[url];
		if (hash === undefined) return [`${url} : n'est plus une page indexable`];
		if (entry === undefined) return [`${url} : absente`];
		return entry.hash === hash ? [] : [`${url} : contenu modifié depuis le ${entry.lastmod}`];
	});

/** Date ISO 8601 à la seconde, à l'heure de Zurich, avec son décalage (+01:00 ou +02:00). */
export const zurichIso = (date: Date): string => {
	const parts = Object.fromEntries(
		new Intl.DateTimeFormat("en-CA", {
			timeZone: "Europe/Zurich",
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
			hourCycle: "h23",
			timeZoneName: "longOffset",
		})
			.formatToParts(date)
			.map((part) => [part.type, part.value]),
	);
	const offset = parts.timeZoneName === "GMT" ? "+00:00" : parts.timeZoneName!.replace("GMT", "");
	return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${offset}`;
};

/** Pages indexables de dist/ (sans noindex), par URL absolue, avec leur HTML. */
export const indexablePages = (dist: string): { url: string; html: string }[] => {
	const walk = (dir: string): string[] =>
		readdirSync(dir).flatMap((entry) => {
			const path = join(dir, entry);
			return statSync(path).isDirectory() ? walk(path) : path.endsWith(".html") ? [path] : [];
		});
	return walk(dist)
		.map((file) => {
			const parts = relative(dist, file).split(sep);
			const last = parts.pop()!;
			if (last !== "index.html") parts.push(last.replace(/\.html$/, ""));
			return { url: `${SITE}/${parts.length === 0 ? "" : `${parts.join("/")}/`}`, html: readFileSync(file, "utf8") };
		})
		.filter((page) => !/<meta\b[^>]*name="robots"[^>]*content="[^"]*noindex/i.test(page.html))
		.sort((a, b) => a.url.localeCompare(b.url));
};

/** Empreinte de chaque page indexable de dist/. */
export const distHashes = (dist: string): Record<string, string> =>
	Object.fromEntries(indexablePages(dist).map((page) => [page.url, contentHash(page.html)]));

export const readLedger = (file: string = LEDGER_FILE): Ledger => (existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as Ledger) : {});

export const writeLedger = (ledger: Ledger, file: string = LEDGER_FILE): void => {
	writeFileSync(file, `${JSON.stringify(sortKeys(ledger), null, "\t")}\n`);
};
