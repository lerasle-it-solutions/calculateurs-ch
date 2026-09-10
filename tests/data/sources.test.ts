import { describe, expect, it } from "vitest";

import { allDataFiles, eachValue } from "../../src/data";
import { SOURCES } from "../../src/data/sources";
import { sourceEntrySchema } from "../../src/data/schema";

describe("registre des sources", () => {
	it("chaque entrée de SOURCES respecte le schéma", () => {
		for (const [id, entry] of Object.entries(SOURCES)) {
			const result = sourceEntrySchema.safeParse(entry);
			expect(result.success, `${id} : ${result.error?.message}`).toBe(true);
		}
	});

	it("tout sourceId référencé dans les données existe dans SOURCES", () => {
		const known = new Set(Object.keys(SOURCES));

		for (const file of allDataFiles()) {
			eachValue(file.data, (value, path) => {
				expect(
					known.has(value.sourceId),
					`${file.path} → ${path} : source « ${value.sourceId} » absente de SOURCES`,
				).toBe(true);
			});
		}
	});
});
