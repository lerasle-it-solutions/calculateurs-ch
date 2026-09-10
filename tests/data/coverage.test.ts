import { describe, expect, it } from "vitest";

import { cantonFiles } from "../../src/data";
import { REQUIRED_CANTON_KEYS } from "../../src/data/schema";
import { ROMANDE_CANTONS } from "../../src/calculators/cantons";

/**
 * Couverture cantonale (CLAUDE.md § 1.3, décision 2 : 6 cantons romands).
 * Les fichiers cantons présents doivent porter le même jeu de clés obligatoires.
 * L'absence d'un canton n'échoue pas le build — elle est signalée en `todo`.
 */
describe("couverture cantonale", () => {
	const romandeCodes = ROMANDE_CANTONS.map((canton) => canton.code);
	const present = cantonFiles();

	it("chaque fichier canton porte un code romand (VD, GE, VS, FR, NE, JU)", () => {
		for (const file of present) {
			expect(
				romandeCodes,
				`${file.path} : « ${file.code} » n'est pas un canton romand`,
			).toContain(file.code);
		}
	});

	it("tous les fichiers cantons présents portent les mêmes clés obligatoires", () => {
		for (const file of present) {
			const keys = Object.keys(file.data as Record<string, unknown>);
			for (const required of REQUIRED_CANTON_KEYS) {
				expect(
					keys,
					`${file.code} : clé obligatoire « ${required} » manquante`,
				).toContain(required);
			}
		}
	});

	const missing = romandeCodes.filter(
		(code) => !present.some((file) => file.code === code),
	);
	if (missing.length > 0) {
		it.todo(`couvrir les cantons romands manquants : ${missing.join(", ")}`);
	}
});
