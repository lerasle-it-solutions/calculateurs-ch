import { existsSync, readFileSync } from "node:fs";
import { relative, sep } from "node:path";

import { describe, expect, it } from "vitest";

import { DIST, htmlFiles, publicPath } from "./dist-pages";

/**
 * Après la construction (`postbuild`) : chaque page de dist/ porte un seul
 * canonical, et il désigne le chemin de la page elle-même. Origine : en
 * production, /donnees/ et /methodologie/ ont servi une ancienne accueil
 * (canonical https://calculateurs.ch/) ; ce test écarte une cause côté dépôt,
 * scripts/smoke-check.ts contrôle le site servi.
 */
const SITE = "https://calculateurs.ch";

const canonicals = (html: string): string[] =>
	[...html.matchAll(/<link\b[^>]*\brel=["']canonical["'][^>]*>/g)].map((tag) => tag[0].match(/\bhref=["']([^"']*)["']/)?.[1] ?? "");

describe("canonical des pages construites", () => {
	it("le chemin public se déduit du fichier", () => {
		expect(publicPath(`${DIST}index.html`)).toBe("/");
		expect(publicPath(`${DIST}donnees${sep}index.html`)).toBe("/donnees/");
		expect(publicPath(`${DIST}404.html`)).toBe("/404/");
	});

	it("dist/ existe : le test tourne après la construction", () => {
		expect(existsSync(DIST)).toBe(true);
	});

	it("chaque page porte un seul canonical, égal à son propre chemin", () => {
		const offenders = htmlFiles(DIST).flatMap((file) => {
			const expected = `${SITE}${publicPath(file)}`;
			const found = canonicals(readFileSync(file, "utf8"));
			return found.length === 1 && found[0] === expected ? [] : [`${relative(DIST, file)} : attendu ${expected}, trouvé ${JSON.stringify(found)}`];
		});
		expect(offenders).toEqual([]);
	});
});
