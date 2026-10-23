#!/usr/bin/env -S npx tsx
/**
 * Garde-fou du premier écran (`npm run fold`, après `npm run build`).
 *
 * Sert dist/ en local, ouvre chaque page dans le Chromium de Playwright, en
 * mobile à 375 × 667 et à 320 × 568, et échoue si :
 *   - sur une page de calculateur, le premier champ du formulaire n'est pas
 *     entièrement visible au-dessus de la barre de résultat mobile ;
 *   - sur l'accueil, le montant du cas exemple n'est pas entièrement visible.
 * Critère du design system, § 4.1 (arbitrage du mainteneur, 23.10.2026).
 *
 * Ne tourne pas au build Cloudflare : Playwright est une dépendance de
 * développement, sans navigateur installé là-bas. À lancer avant une mise en
 * ligne (docs/plan/checklist.md) et par `/ux-check`. Première fois :
 * `npx playwright install chromium`.
 */
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

import { indexablePages } from "../src/lib/seo/content-lastmod";
import { FOLD_VIEWPORTS, foldTargets, foldVerdict, type FoldKind } from "./fold-rules";

const DIST = fileURLToPath(new URL("../dist/", import.meta.url));
if (!existsSync(DIST)) {
	console.error("✗ [fold] dist/ est absent : lancez d'abord npm run build.");
	process.exit(1);
}

const TYPES: Record<string, string> = {
	".html": "text/html; charset=utf-8",
	".js": "text/javascript",
	".css": "text/css",
	".json": "application/json",
	".svg": "image/svg+xml",
	".png": "image/png",
	".ico": "image/x-icon",
	".woff2": "font/woff2",
	".woff": "font/woff",
	".csv": "text/csv; charset=utf-8",
	".xml": "application/xml",
	".txt": "text/plain; charset=utf-8",
};

/** Serveur statique de dist/ : « /a/ » sert « a/index.html », comme Cloudflare Pages. */
const server = createServer((request, response) => {
	const path = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
	let file = normalize(join(DIST, path));
	if (!file.startsWith(DIST)) {
		response.writeHead(403).end();
		return;
	}
	if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
	if (!existsSync(file)) {
		response.writeHead(404, { "content-type": TYPES[".html"] });
		createReadStream(join(DIST, "404.html")).pipe(response);
		return;
	}
	response.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
	createReadStream(file).pipe(response);
});
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

/** Mesure dans la page : boîte de l'élément visé et limite basse (barre mobile visible, sinon bas de l'écran). */
const measure = (kind: FoldKind) => {
	const visible = (element: Element) => {
		const style = getComputedStyle(element);
		return style.display !== "none" && style.visibility !== "hidden" && element.getClientRects().length > 0;
	};
	const target =
		kind === "amount"
			? document.querySelector("main [data-result-value]")
			: [...document.querySelectorAll("main form[data-calculator] :is(input:not([type=hidden]), select, textarea)")].find(visible);
	const bar = [...document.querySelectorAll("[data-result-card]")].find((element) => getComputedStyle(element).position === "fixed" && visible(element));
	const limit = bar ? bar.getBoundingClientRect().top : window.innerHeight;
	const box = target && visible(target) ? target.getBoundingClientRect() : null;
	return {
		label: target ? (target.getAttribute("name") ?? target.textContent?.trim() ?? "") : "",
		box: box ? { top: Math.round(box.top), bottom: Math.round(box.bottom) } : null,
		limit: Math.round(limit),
		bar: Boolean(bar),
	};
};

const targets = foldTargets(indexablePages(DIST));
const browser = await chromium.launch();
const failures: string[] = [];
try {
	for (const viewport of FOLD_VIEWPORTS) {
		const context = await browser.newContext({ viewport, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "fr-CH" });
		// tsx (esbuild) ajoute un appel à `__name` dans les fonctions transmises à la page
		await context.addInitScript({ content: "globalThis.__name = (target) => target;" });
		const page = await context.newPage();
		console.log(`— ${viewport.width} × ${viewport.height}`);
		for (const { path, kind } of targets) {
			await page.goto(`${origin}${path}`, { waitUntil: "load" });
			await page.evaluate(() => document.fonts.ready);
			const result = await page.evaluate(measure, kind);
			const ok = foldVerdict(result.box, result.limit);
			const what = kind === "amount" ? "montant de l'exemple" : `premier champ (${result.label})`;
			const where = result.box ? `${result.box.top} → ${result.box.bottom} px` : "introuvable";
			const limit = `${result.bar ? "barre mobile" : "bas de l'écran"} à ${result.limit} px`;
			console.log(`${ok ? "ok    " : "ÉCHEC "} ${path} : ${what} ${where}, ${limit}`);
			if (!ok) failures.push(`${viewport.width} × ${viewport.height} ${path}`);
		}
		await context.close();
	}
} finally {
	await browser.close();
	server.close();
}

console.log(failures.length === 0 ? "\nPremier écran conforme sur toutes les pages mesurées." : `\n${failures.length} échec(s) :\n  ${failures.join("\n  ")}`);
process.exitCode = failures.length === 0 ? 0 : 1;
