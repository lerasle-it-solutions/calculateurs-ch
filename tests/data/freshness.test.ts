import { describe, expect, it } from "vitest";

import { allDataFiles, eachValue } from "../../src/data";
import { DATA_FRESHNESS_LIMIT_MONTHS } from "../../src/data/schema";

/**
 * Fraîcheur des données (CLAUDE.md P2, décision 6). Ce test échoue le build si
 * une valeur n'a pas été re-vérifiée à sa source depuis plus de 12 mois. Le seul
 * défaut fatal du site serait d'afficher un chiffre périmé avec assurance.
 */
const MAX_AGE_MONTHS = DATA_FRESHNESS_LIMIT_MONTHS;

describe("fraîcheur des données", () => {
	const now = new Date();
	const cutoff = new Date(
		now.getFullYear(),
		now.getMonth() - MAX_AGE_MONTHS,
		now.getDate(),
	);

	it(`aucune valeur vérifiée il y a plus de ${MAX_AGE_MONTHS} mois`, () => {
		for (const file of allDataFiles()) {
			eachValue(file.data, (value, path) => {
				const verified = new Date(value.verifiedOn);
				expect(
					Number.isNaN(verified.getTime()),
					`${file.path} → ${path} : verifiedOn « ${value.verifiedOn} » n'est pas une date`,
				).toBe(false);
				expect(
					verified.getTime() >= cutoff.getTime(),
					`${file.path} → ${path} : vérifié le ${value.verifiedOn}, soit plus de ${MAX_AGE_MONTHS} mois — à relever à la source`,
				).toBe(true);
			});
		}
	});
});
