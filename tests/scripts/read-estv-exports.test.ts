import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

/**
 * L'AFC réserve le simulateur à son interface web : le lecteur d'exports ne
 * fait aucun accès réseau. Le test échoue si son code en contient la trace.
 */
const READER_FILES = ["read-estv-exports.ts", "estv-scale-conversion.ts"];

describe("lecteur d'exports de l'AFC", () => {
	it("ne contient ni fetch, ni axios, ni http", () => {
		for (const file of READER_FILES) {
			const source = readFileSync(new URL(`../../scripts/${file}`, import.meta.url), "utf8");
			for (const forbidden of ["fetch", "axios", "http"]) {
				expect(
					source.toLowerCase().includes(forbidden),
					`scripts/${file} contient « ${forbidden} » : aucun accès réseau n'est autorisé`,
				).toBe(false);
			}
		}
	});
});
