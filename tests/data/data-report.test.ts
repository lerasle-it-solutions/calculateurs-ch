import { describe, expect, it } from "vitest";

import type { DataFile } from "../../src/data";
import { dataFreshnessReport, sourceFreshnessReport } from "../../src/lib/data-report";

/**
 * Rapport de fraîcheur de /donnees/ : un verifiedOn vide s'affiche « jamais
 * vérifiée », sans date ni échéance calculée, et ne fait pas planter le build.
 */
const now = new Date("2026-09-26T00:00:00Z");

const file: DataFile = {
	path: "municipalities/example.json",
	data: {
		verified: {
			value: 1,
			sourceId: "vd-municipal-multipliers",
			verifiedOn: "2026-09-24",
			effectiveFrom: "2026-01-01",
		},
		neverVerified: {
			value: 1,
			sourceId: "vd-la-2026",
			verifiedOn: "",
			effectiveFrom: "2026-01-01",
		},
	},
};

describe("rapport de fraîcheur", () => {
	it("une valeur jamais vérifiée n'a ni date ni échéance, et passe en tête", () => {
		const rows = dataFreshnessReport(now, [file]);

		expect(rows[0]?.path).toBe("neverVerified");
		expect(rows[0]?.verifiedOn).toBeNull();
		expect(rows[0]?.dueOn).toBeNull();
		expect(rows[0]?.overdue).toBe(false);
		expect(rows[1]?.dueOn).toBe("2027-09-24");
	});

	it("une source dont une valeur n'a jamais été vérifiée est signalée comme telle", () => {
		const neverVerifiedSource = sourceFreshnessReport(now, [file]).find(
			(row) => row.sourceId === "vd-la-2026",
		);

		expect(neverVerifiedSource?.oldestVerifiedOn).toBeNull();
		expect(neverVerifiedSource?.nextDueOn).toBeNull();
		expect(neverVerifiedSource?.neverVerifiedCount).toBe(1);
	});
});
