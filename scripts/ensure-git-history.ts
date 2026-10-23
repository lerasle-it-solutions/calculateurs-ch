#!/usr/bin/env -S npx tsx
/**
 * Complète l'historique git avant la construction (`prebuild`) : le `lastmod`
 * du sitemap est la date du dernier commit des sources de chaque page
 * (src/lib/seo/lastmod.ts), et Cloudflare Pages clone le dépôt en profondeur
 * réduite. Un clone complet ne change rien.
 *
 * Production (CF_PAGES=1) : si l'historique ne peut pas être complété, la
 * construction échoue, plutôt que de publier des dates fausses. Hors
 * production : avertissement, la construction s'arrêtera à la datation.
 */
import { execFileSync } from "node:child_process";

const isProduction = process.env.CF_PAGES === "1";
const git = (...args: string[]): string => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

const fail = (message: string): void => {
	if (isProduction) {
		console.error(`\n✗ [ensure-git-history] ${message}\n`);
		process.exit(1);
	}
	console.warn(`\n⚠ [ensure-git-history] ${message}\n`);
};

let shallow: string;
try {
	shallow = git("rev-parse", "--is-shallow-repository");
} catch {
	fail("Pas de dépôt git : le lastmod du sitemap ne peut pas être daté.");
	process.exit(process.exitCode ?? 0);
}

if (shallow === "true") {
	try {
		git("fetch", "--unshallow", "--quiet", "--no-tags");
	} catch {
		// Message de git volontairement omis : il peut contenir l'URL distante.
		fail("Historique git incomplet et `git fetch --unshallow` en échec.");
	}
	if (git("rev-parse", "--is-shallow-repository") === "true") fail("L'historique git reste incomplet après `git fetch --unshallow`.");
	else console.log("[ensure-git-history] Historique git complété.");
}
