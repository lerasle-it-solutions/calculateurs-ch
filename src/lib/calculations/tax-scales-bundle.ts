/**
 * Barèmes transmis à une page de calculateur, pour un calcul dans le navigateur
 * sans y embarquer la couche de données : un jeu complet de `TaxScales` par
 * canton, et pour chaque commune les seules valeurs qui lui sont propres.
 *
 * Fonction pure : le paquet est construit à la compilation par
 * `getTaxScalesBundle` (src/data/tax-scales.ts) et passé en argument.
 */
import type { MunicipalModel, PartialCoverage, Sourced, SourcedOrPending, StepwiseDeflation, TaxInput, TaxScales } from "./tax";

type ByTax<T> = { income: T; wealth: T };

/** Valeurs propres à une commune. */
export type MunicipalityScales = {
	ofsId: number;
	name: string;
	canton: TaxInput["canton"];
	multiplier: ByTax<Sourced<number>>;
	church: TaxScales["church"];
	/** Indexation du barème communal propre (Valais) ; `null` sans barème communal. */
	communalIndexation: SourcedOrPending<StepwiseDeflation> | null;
	/** Couverture partielle de la commune : celle du canton, ou la commune entière. */
	coverage: PartialCoverage | null;
};

export type TaxScalesBundle = {
	taxYear: number;
	/** Barèmes d'une commune de chaque canton ; la part communale est remplacée à la lecture. */
	cantons: Partial<Record<TaxInput["canton"], TaxScales>>;
	municipalities: MunicipalityScales[];
};

/** Barèmes d'une commune, reconstitués à partir du paquet. */
export function taxScalesFromBundle(bundle: TaxScalesBundle, ofsId: number): TaxScales {
	const municipality = bundle.municipalities.find((entry) => entry.ofsId === ofsId);
	if (!municipality) throw new Error(`Commune ${ofsId} inconnue.`);
	const base = bundle.cantons[municipality.canton];
	if (!base) throw new Error(`Canton ${municipality.canton} inconnu.`);
	const model: MunicipalModel =
		base.municipality.model === "communalScale"
			? {
					...base.municipality,
					multiplier: municipality.multiplier,
					incomeScaleIndexation: municipality.communalIndexation,
				}
			: { model: "multiplierOnBaseTax", multiplier: municipality.multiplier };
	return { ...base, municipality: model, church: municipality.church, coverage: municipality.coverage };
}
