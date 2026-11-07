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
 * - Fichier propre à un calculateur (décision du mainteneur du 7.11.2026,
 *   src/calculators/calculator-data-file.ts) : identique pour tous les
 *   visiteurs, chargé par la seule page de son calculateur, sous 100 000 octets
 *   bruts et 10 000 octets en gzip (niveau 9), plafond proposé le 7.11.2026, à
 *   valider avec CLAUDE.md § 3. Mesure du 7.11.2026 pour A4 : 11 582 octets
 *   bruts, 3 384 en gzip.
 */
export const PAGE_BUDGETS = { htmlGzip: 30_000, dataRaw: 600_000, dataGzip: 25_000, calculatorDataRaw: 100_000, calculatorDataGzip: 10_000 } as const;

/** Fichier commun de l'année ; fichier propre à un calculateur (préfixe français, c'est une URL). */
const ANNUAL_FILE = /^baremes-(\d{4})\.[0-9a-f]{10}\.json$/;
const CALCULATOR_FILE = /^([a-z0-9-]+)-(\d{4})\.[0-9a-f]{10}\.json$/;

const DATA_DIR = join(DIST, "donnees/calcul");

/** Pages qui calculent : celles qui déclarent un fichier de données. */
const calculatingPages = () =>
	htmlFiles(DIST).flatMap((file) => {
		const html = readFileSync(file, "utf8");
		const url = html.match(/\sdata-tax-data="([^"]+)"/)?.[1];
		const own = html.match(/\sdata-calculator-data="([^"]+)"/)?.[1];
		return url ? [{ page: `/${relative(DIST, file)}`, html, url, own }] : [];
	});

describe("poids des pages de calculateur et du fichier de données", () => {
	it("dist/ existe : le test tourne après la construction", () => {
		expect(existsSync(DIST)).toBe(true);
	});

	it("chaque calculateur publié, et l'accueil, chargent un fichier de données", () => {
		const pages = calculatingPages().map((entry) => entry.page);
		for (const page of [
			"/index.html",
			"/prevoyance/rachat-3a-retroactif/index.html",
			"/prevoyance/economie-impot-3a/index.html",
			"/prevoyance/rachat-lpp/index.html",
			"/prevoyance/retrait-capital-lpp-3a/index.html",
		]) {
			expect(pages).toContain(page);
		}
	});

	it("A4 charge en plus son fichier propre, et lui seul le charge", () => {
		const owners = calculatingPages().filter((entry) => entry.own !== undefined);
		expect(owners.map((entry) => entry.page)).toEqual(["/prevoyance/retrait-capital-lpp-3a/index.html"]);
		const own = owners[0]!.own!;
		expect(own).toMatch(/^\/donnees\/calcul\/retrait-capital-\d{4}\.[0-9a-f]{10}\.json$/);
		expect(existsSync(join(DIST, own))).toBe(true);
		// Les règles du retrait en capital et les libellés de sa trace ne sont plus dans le fichier commun
		const annual = readFileSync(join(DIST, owners[0]!.url), "utf8");
		expect(annual).not.toContain('"capitalWithdrawal"');
		expect(annual).not.toContain("trace-labels-capital-withdrawal");
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

	it("un seul fichier commun par année, le même pour toutes les pages ; les autres sont propres à un calculateur", () => {
		const files = readdirSync(DATA_DIR);
		const annual = files.filter((name) => ANNUAL_FILE.test(name));
		const years = annual.map((name) => name.match(ANNUAL_FILE)![1]);
		expect(new Set(years).size).toBe(annual.length);
		const others = files.filter((name) => !ANNUAL_FILE.test(name));
		expect(others.every((name) => CALCULATOR_FILE.test(name)), others.join(", ")).toBe(true);
		// Chaque fichier propre est chargé par une seule page
		for (const name of others) {
			const loaders = calculatingPages().filter((entry) => entry.own === `/donnees/calcul/${name}`);
			expect(loaders.length, name).toBe(1);
		}
		for (const { page, url } of calculatingPages()) {
			expect(existsSync(join(DIST, url)), `${page} → ${url}`).toBe(true);
		}
	});

	it("le fichier de données reste sous son plafond, brut et compressé", () => {
		const over = readdirSync(DATA_DIR).flatMap((name) => {
			const body = readFileSync(join(DATA_DIR, name));
			const gzip = gzipSync(body, { level: 9 }).length;
			const [raw, compressed] = ANNUAL_FILE.test(name)
				? [PAGE_BUDGETS.dataRaw, PAGE_BUDGETS.dataGzip]
				: [PAGE_BUDGETS.calculatorDataRaw, PAGE_BUDGETS.calculatorDataGzip];
			return [
				...(body.length > raw ? [`${name} : ${body.length} octets bruts`] : []),
				...(gzip > compressed ? [`${name} : ${gzip} octets en gzip`] : []),
			];
		});
		expect(over).toEqual([]);
	});
});
