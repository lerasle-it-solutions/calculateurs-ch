import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

/**
 * Version de Node de la construction : celle de .node-version. Sur Cloudflare
 * Pages (CF_PAGES=1), la construction échoue si elle tourne sur une autre
 * version — c'est ainsi que l'aperçu prouve qu'il a lu .node-version.
 * Localement, seule la version majeure doit concorder.
 */
const pinned = readFileSync(new URL("../../.node-version", import.meta.url), "utf8").trim();

describe("version de Node", () => {
	it(".node-version désigne une version 24.x complète", () => {
		expect(pinned).toMatch(/^24\.\d+\.\d+$/);
	});

	it("la construction tourne sur cette version (exacte sur Cloudflare, même majeure en local)", () => {
		if (process.env.CF_PAGES === "1") expect(process.versions.node).toBe(pinned);
		else expect(process.versions.node.split(".")[0]).toBe(pinned.split(".")[0]);
	});
});
