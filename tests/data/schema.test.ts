import { describe, expect, it } from "vitest";

import { allDataFiles } from "../../src/data";
import {
	cantonDataSchema,
	federalDataSchema,
	valueSchema,
} from "../../src/data/schema";
import { z } from "zod";

describe("conformité de schéma des fichiers de données", () => {
	const files = allDataFiles();

	it("le schéma Value<T> accepte une entrée bien formée et rejette les clés inconnues", () => {
		const wrapped = valueSchema(z.number());
		expect(
			wrapped.safeParse({
				value: 7258,
				unit: "CHF",
				sourceId: "ofas-pillar-3a-caps",
				verifiedOn: "2026-01-08",
				effectiveFrom: "2026-01-01",
			}).success,
		).toBe(true);
		expect(
			wrapped.safeParse({
				value: 7258,
				sourceId: "x",
				verifedOn: "2026-01-08", // faute de frappe
				effectiveFrom: "2026-01-01",
			}).success,
		).toBe(false);
	});

	it("chaque fichier de src/data/ valide le schéma correspondant à son emplacement", () => {
		for (const file of files) {
			if (file.path.startsWith("federal/")) {
				const result = federalDataSchema.safeParse(file.data);
				expect(result.success, `${file.path} : ${result.error?.message}`).toBe(
					true,
				);
			} else if (file.path.startsWith("cantons/")) {
				const result = cantonDataSchema.safeParse(file.data);
				expect(result.success, `${file.path} : ${result.error?.message}`).toBe(
					true,
				);
			}
		}
	});
});
