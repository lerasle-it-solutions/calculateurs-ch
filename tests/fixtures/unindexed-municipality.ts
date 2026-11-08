import { fileURLToPath } from "node:url";

import { vi } from "vitest";

import type { MunicipalMultipliersData } from "../../src/data/schema";
import type { TaxScales } from "../../src/lib/calculations/tax";

/**
 * Fixture partagée (décision du mainteneur du 7.11.2026) : Brig-Glis sans
 * indexation communale. Depuis le relevé du 7.11.2026, chaque commune valaisanne
 * a la sienne ; la règle « indexation du barème communal non relevée → commune
 * hors périmètre, message de la commune, lien vers la calculette du canton »
 * reste vérifiée sur cette commune, privée de son indexation dans les seuls
 * tests. Les tests de composants et de couverture passent par
 * `withUnindexedMunicipality`, les tests de moteur par `unindexedScales`, sans
 * mock. tests/fixtures/unindexed-municipality.test.ts vérifie que la fixture
 * est bien hors périmètre : aucun test ne passe à vide.
 */
export const UNINDEXED = { municipality: "Brig-Glis", ofsId: 6002, canton: "VS" } as const;

/** Libellé de la commune dans le champ commune (homonymes suivis de leur canton). */
export const UNINDEXED_FIELD_VALUE = `${UNINDEXED.municipality} (${UNINDEXED.canton})`;

const DATA_INDEX = fileURLToPath(new URL("../../src/data/index.ts", import.meta.url));

/** Coefficients communaux réels, sans l'indexation de la commune de la fixture. */
export const withoutIndexation = (data: MunicipalMultipliersData): MunicipalMultipliersData => ({
	...data,
	multipliers: data.multipliers.map((entry) => {
		if (entry.bfsId !== UNINDEXED.ofsId) return entry;
		const { communalScaleIndexation: _removed, ...rest } = entry;
		return rest;
	}),
});

/**
 * Charge des modules sur les données de la fixture : `load` importe
 * dynamiquement ce qu'il teste (page, définition, données de page) et s'en sert
 * avant de rendre la main. Sans mock : le registre des modules est vidé, une
 * instance neuve de la couche de données est chargée et la commune y perd son
 * indexation ; tout ce que `load` importe lit cette instance, jetée ensuite. Les
 * modules importés en tête du fichier de test gardent les données réelles (le
 * test de la fixture le vérifie).
 */
export async function withUnindexedMunicipality<T>(load: () => Promise<T>): Promise<T> {
	vi.resetModules();
	try {
		const data: typeof import("../../src/data/index") = await import(/* @vite-ignore */ DATA_INDEX);
		const commune = data.getMunicipalMultipliers()?.multipliers.find((entry) => entry.bfsId === UNINDEXED.ofsId);
		if (commune?.municipality !== UNINDEXED.municipality || commune.communalScaleIndexation === undefined) {
			throw new Error(`Fixture : ${UNINDEXED.municipality} (OFS ${UNINDEXED.ofsId}) introuvable ou déjà sans indexation dans une instance neuve des données.`);
		}
		delete commune.communalScaleIndexation;
		return await load();
	} finally {
		vi.resetModules();
	}
}

/**
 * Données d'une page rendue sur la fixture, réunies comme le fait le navigateur
 * (tests/setup/rendered-page-data.ts) : le JSON de la page et le fichier de
 * données qu'elle déclare, tous deux tirés de la fixture. `renderHtml` importe
 * la page dynamiquement.
 */
export const fixturePageData = <T>(renderHtml: () => Promise<string>, dataId: string): Promise<T> =>
	withUnindexedMunicipality(async () => {
		const { renderedPageData } = await import("../setup/rendered-page-data");
		return renderedPageData<T>(await renderHtml(), dataId);
	});

/**
 * Barèmes fictifs, pour les tests de moteur : ceux de la commune, avec
 * l'indexation communale à relever et la commune hors périmètre, comme les
 * assemble src/data/tax-scales.ts quand l'indexation manque (contrôlé par le
 * test de la fixture).
 */
export function unindexedScales(scales: TaxScales): TaxScales {
	if (scales.municipality.model !== "communalScale") throw new Error("Barème communal propre attendu (Valais).");
	const commune = `${UNINDEXED.municipality} (OFS ${UNINDEXED.ofsId})`;
	return {
		...scales,
		municipality: {
			...scales.municipality,
			incomeScaleIndexation: { pending: `Indexation du barème communal de ${commune} : à relever.`, sourceId: "vs-municipal-multipliers" },
		},
		coverage: {
			status: "partial",
			note: `Indexation du barème communal de ${commune} non relevée : la commune n'est pas couverte.`,
			notCoveredHouseholds: null,
			municipality: UNINDEXED.municipality,
		},
	};
}
