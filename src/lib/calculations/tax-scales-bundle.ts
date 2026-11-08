/**
 * Barèmes transmis à une page de calculateur, pour un calcul dans le navigateur
 * sans y embarquer la couche de données : un jeu complet de `TaxScales` par
 * canton, et pour chaque commune les seules valeurs qui lui sont propres.
 *
 * Factorisé (décision du mainteneur du 7.11.2026) : ce qui se répète d'une
 * commune à l'autre d'un même canton est écrit une fois par canton
 * (`municipalSources`) — source des coefficients communaux, source des
 * coefficients paroissiaux, source et pas de l'indexation, couverture du
 * canton. Une commune garde ses nombres et, s'il y a lieu, ce qui la distingue
 * (indexation à relever, couverture propre). `taxScalesFromBundle` reconstitue
 * à l'identique ce que rend `getTaxScales` (tests/lib/tax-scales-bundle.test.ts).
 *
 * Fonction pure : le paquet est construit à la compilation par
 * `getTaxScalesBundle` (src/data/tax-scales.ts) et passé en argument.
 */
import type { ChurchDenomination, PartialCoverage, Sourced, SourcedOrPending, StepwiseDeflation, TaxInput, TaxScales } from "./tax";

/** Ordre des coefficients paroissiaux dans `church` : revenu puis fortune, dans cet ordre de confessions. */
export const CHURCH_ORDER: ChurchDenomination[] = ["protestant", "catholic", "christianCatholic"];

/** Valeurs propres à une commune. */
export type MunicipalityScales = {
	ofsId: number;
	name: string;
	canton: TaxInput["canton"];
	/** Coefficient communal, en % : revenu, fortune. */
	multiplier: [number, number];
	/** Coefficients paroissiaux, en % : revenu puis fortune, dans l'ordre de `CHURCH_ORDER`. */
	church: number[];
	/**
	 * Indexation du barème communal propre (Valais) : le pourcentage relevé (pas et
	 * source dans `municipalSources`), ou la valeur à relever ; absente sans barème communal.
	 */
	communalIndexation?: number | SourcedOrPending<StepwiseDeflation>;
	/** Couverture propre à la commune ; absente, celle du canton (`municipalSources`). */
	coverage?: PartialCoverage | null;
};

/** Ce que les communes d'un canton partagent. */
export type MunicipalSources = {
	multiplier: string;
	church: string;
	/** Source et pas de la déflation des indexations relevées (Valais). */
	indexation?: { sourceId: string; stepPercent: number };
	/** Couverture des communes qui n'ont pas la leur. */
	coverage: PartialCoverage | null;
};

export type TaxScalesBundle = {
	taxYear: number;
	/** Barèmes d'une commune de chaque canton ; la part communale est remplacée à la lecture. */
	cantons: Partial<Record<TaxInput["canton"], TaxScales>>;
	municipalSources: Partial<Record<TaxInput["canton"], MunicipalSources>>;
	municipalities: MunicipalityScales[];
};

/** Barèmes d'une commune, reconstitués à partir du paquet. */
export function taxScalesFromBundle(bundle: TaxScalesBundle, ofsId: number): TaxScales {
	const commune = bundle.municipalities.find((entry) => entry.ofsId === ofsId);
	const base = commune && bundle.cantons[commune.canton];
	const shared = commune && bundle.municipalSources[commune.canton];
	if (!base || !shared) throw new Error(`Commune ${ofsId} inconnue.`);
	const { multiplier: [income, wealth], church, communalIndexation: index, coverage } = commune!;
	const value = (amount: number, sourceId: string): Sourced<number> => ({ value: amount, sourceId });
	const multiplier = { income: value(income, shared.multiplier), wealth: value(wealth, shared.multiplier) };
	const churchOf = (offset: number) =>
		Object.fromEntries(CHURCH_ORDER.map((denomination, i) => [denomination, value(church[offset + i]!, shared.church)])) as TaxScales["church"]["income"];
	const step = shared.indexation;
	return {
		...base,
		municipality:
			base.municipality.model === "communalScale"
				? {
						...base.municipality,
						multiplier,
						incomeScaleIndexation:
							typeof index === "number" ? { value: { indexPercent: index, stepPercent: step!.stepPercent }, sourceId: step!.sourceId } : (index ?? null),
					}
				: { model: "multiplierOnBaseTax", multiplier },
		church: { income: churchOf(0), wealth: churchOf(3) },
		coverage: coverage === undefined ? shared.coverage : coverage,
	};
}
