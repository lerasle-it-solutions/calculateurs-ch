import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { gzipSync } from "node:zlib";

import { describe, expect, it } from "vitest";

import { DIST, htmlFiles } from "./dist-pages";

/**
 * Après la construction (`postbuild`) : poids des pages et du fichier de données
 * que chargent les pages qui calculent (étape 0 de l'accueil calculant, décision
 * n° 22 du 17.10.2026).
 *
 * - HTML de chaque page : au plus 30 000 octets transférés, mesurés en gzip
 *   (niveau par défaut, comme un serveur ; Cloudflare sert du brotli, plus
 *   petit). Le LCP sous 1,5 s en 4G simulée reste le critère final.
 * - Aucune page n'embarque les barèmes des communes (~555 000 octets avant).
 * - Fichier de données : un seul par année, pour tous les cantons — le nom ne
 *   dit rien de la saisie —, sous 600 000 octets bruts et 25 000 octets en
 *   gzip (niveau 9). Mesure du 17.10.2026 : 500 791 octets bruts, 20 917 en
 *   gzip, 14 760 en brotli.
 */
export const PAGE_BUDGETS = { htmlGzip: 30_000, dataRaw: 600_000, dataGzip: 25_000 } as const;

const DATA_DIR = join(DIST, "donnees/calcul");

/** Pages qui calculent : celles qui déclarent un fichier de données. */
const calculatingPages = () =>
	htmlFiles(DIST).flatMap((file) => {
		const html = readFileSync(file, "utf8");
		const url = html.match(/\sdata-tax-data="([^"]+)"/)?.[1];
		return url ? [{ page: `/${relative(DIST, file)}`, html, url }] : [];
	});

describe("poids des pages de calculateur et du fichier de données", () => {
	it("dist/ existe : le test tourne après la construction", () => {
		expect(existsSync(DIST)).toBe(true);
	});

	it("chaque calculateur publié, et l'accueil, chargent un fichier de données", () => {
		const pages = calculatingPages().map((entry) => entry.page);
		for (const page of ["/index.html", "/prevoyance/rachat-3a-retroactif/index.html", "/prevoyance/economie-impot-3a/index.html", "/prevoyance/rachat-lpp/index.html"]) {
			expect(pages).toContain(page);
		}
	});

	it("le HTML de chaque page reste sous 30 000 octets transférés (gzip)", () => {
		const over = htmlFiles(DIST)
			.map((file) => ({ page: `/${relative(DIST, file)}`, bytes: gzipSync(readFileSync(file)).length }))
			.filter(({ bytes }) => bytes > PAGE_BUDGETS.htmlGzip)
			.map(({ page, bytes }) => `${page} : ${bytes} octets en gzip`);
		expect(over, "HTML trop lourd").toEqual([]);
	});

	it("aucune page n'embarque les barèmes des communes", () => {
		const embedding = calculatingPages()
			.filter(({ html }) => /"municipalities":\[|"bundle":/.test(html))
			.map(({ page }) => page);
		expect(embedding).toEqual([]);
	});

	it("un seul fichier de données par année, le même pour toutes les pages", () => {
		const files = readdirSync(DATA_DIR);
		const years = files.map((name) => name.match(/^baremes-(\d{4})\.[0-9a-f]{10}\.json$/)?.[1]);
		expect(years.every(Boolean), files.join(", ")).toBe(true);
		expect(new Set(years).size).toBe(files.length);
		for (const { page, url } of calculatingPages()) {
			expect(existsSync(join(DIST, url)), `${page} → ${url}`).toBe(true);
		}
	});

	it("le fichier de données reste sous son plafond, brut et compressé", () => {
		const over = readdirSync(DATA_DIR).flatMap((name) => {
			const body = readFileSync(join(DATA_DIR, name));
			const gzip = gzipSync(body, { level: 9 }).length;
			return [
				...(body.length > PAGE_BUDGETS.dataRaw ? [`${name} : ${body.length} octets bruts`] : []),
				...(gzip > PAGE_BUDGETS.dataGzip ? [`${name} : ${gzip} octets en gzip`] : []),
			];
		});
		expect(over).toEqual([]);
	});
});
