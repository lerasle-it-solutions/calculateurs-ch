#!/usr/bin/env -S npx tsx
/**
 * Met à jour seo/lastmod.json depuis dist/ (`npm run lastmod`, après `npm run build`).
 *
 * Pour chaque page indexable de dist/, calcule l'empreinte du texte visible de
 * <main> (src/lib/seo/content-lastmod.ts). Une empreinte inchangée garde sa
 * date ; une page nouvelle ou dont le texte a changé prend la date et l'heure
 * courantes, à l'heure de Zurich ; une page disparue est retirée. Le sitemap
 * lit ce fichier à la construction suivante : reconstruire, puis commiter le
 * fichier avec le changement de contenu.
 *
 * Seul compte le texte visible de <main>. Une méta-description, un title, un
 * JSON-LD, l'en-tête ou le pied de page modifiés ne sont pas un changement de
 * contenu et ne redatent pas la page ; le balisage ou le style non plus, tant
 * que le texte et son ordre restent les mêmes.
 */
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { distHashes, readLedger, updateLedger, writeLedger, zurichIso } from "../src/lib/seo/content-lastmod";

const DIST = fileURLToPath(new URL("../dist/", import.meta.url));

if (!existsSync(DIST)) {
	console.error("✗ [lastmod] dist/ est absent : lancez d'abord npm run build.");
	process.exit(1);
}

const { ledger, changed, removed } = updateLedger(readLedger(), distHashes(DIST), zurichIso(new Date()));
writeLedger(ledger);

if (changed.length === 0 && removed.length === 0) {
	console.log("[lastmod] seo/lastmod.json est à jour : aucun contenu modifié.");
} else {
	for (const url of changed) console.log(`[lastmod] daté ${ledger[url]!.lastmod} : ${url}`);
	for (const url of removed) console.log(`[lastmod] retiré : ${url}`);
	console.log("[lastmod] Reconstruisez (npm run build) pour que le sitemap reprenne ces dates, et commitez seo/lastmod.json.");
}
