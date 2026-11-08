/**
 * Règles du retrait en capital transmises au navigateur avec le fichier de
 * données de l'année (src/lib/display/tax-data.ts) : pour chaque canton, ce que
 * `CapitalWithdrawalScales` ajoute aux barèmes du moteur fiscal (modèle de
 * l'impôt cantonal, coefficients, exonération), et une seule fois pour tous les
 * cantons le facteur de l'IFD, les bornes LPP et les sources des règles. Les
 * barèmes eux-mêmes viennent du paquet du moteur fiscal (tax-scales-bundle.ts) :
 * rien n'est transmis deux fois. Le tableau de conversion en rentes voyage en
 * deux colonnes, homme et femme, indexées par l'âge (poids du fichier).
 *
 * Fonctions pures : le paquet est construit à la compilation par
 * `getCapitalWithdrawalBundle` (src/data/capital-withdrawal-scales.ts).
 */
import type { Sourced, TaxInput } from "../tax";
import { taxScalesFromBundle, type TaxScalesBundle } from "../tax-scales-bundle";
import type { AnnuityConversion, CapitalTaxModel, CapitalWithdrawalScales } from "./capital-withdrawal-plan";

/** Tableau de conversion en deux colonnes : rente de l'âge `i` à l'indice `i`. */
type CompactConversion = { capitalAmount: number; male: number[]; female: number[] };

type CompactModel =
	| Exclude<CapitalTaxModel, { type: "periodicBenefitRate" }>
	| (Omit<Extract<CapitalTaxModel, { type: "periodicBenefitRate" }>, "conversion"> & { conversion: Sourced<CompactConversion> });

type Shared = Pick<CapitalWithdrawalScales, "federalScaleFactor" | "lpp" | "ruleSources">;
type CantonRules = Omit<CapitalWithdrawalScales, "tax" | keyof Shared | "model"> & { model: CompactModel };

export type CapitalWithdrawalBundle = {
	taxYear: number;
	shared: Shared;
	cantons: Partial<Record<TaxInput["canton"], CantonRules>>;
};

/** Le paquet d'un jeu de règles complètes par canton, à la construction. */
export function packCapitalWithdrawalBundle(
	taxYear: number,
	rules: Partial<Record<TaxInput["canton"], Omit<CapitalWithdrawalScales, "tax">>>,
): CapitalWithdrawalBundle {
	const entries = Object.entries(rules) as [TaxInput["canton"], Omit<CapitalWithdrawalScales, "tax">][];
	const [, first] = entries[0]!;
	const cantons: CapitalWithdrawalBundle["cantons"] = {};
	for (const [canton, { federalScaleFactor: _, lpp: __, ruleSources: ___, model, ...rest }] of entries) {
		cantons[canton] = {
			...rest,
			model:
				model.type === "periodicBenefitRate"
					? {
							...model,
							conversion: {
								sourceId: model.conversion.sourceId,
								value: {
									capitalAmount: model.conversion.value.capitalAmount,
									male: model.conversion.value.rows.map((row) => row.male),
									female: model.conversion.value.rows.map((row) => row.female),
								},
							},
						}
					: model,
		};
	}
	return { taxYear, shared: { federalScaleFactor: first.federalScaleFactor, lpp: first.lpp, ruleSources: first.ruleSources }, cantons };
}

const unpackConversion = ({ capitalAmount, male, female }: CompactConversion): AnnuityConversion => ({
	capitalAmount,
	rows: male.map((value, age) => ({ age, male: value, female: female[age]! })),
});

/** Barèmes et règles du retrait en capital d'une commune, reconstitués à partir des deux paquets. */
export function capitalWithdrawalScalesFromBundle(
	capital: CapitalWithdrawalBundle,
	bundle: TaxScalesBundle,
	ofsId: number,
): CapitalWithdrawalScales {
	const tax = taxScalesFromBundle(bundle, ofsId);
	const canton = bundle.municipalities.find((entry) => entry.ofsId === ofsId)!.canton;
	const rules = capital.cantons[canton];
	if (!rules) throw new Error(`Retrait en capital : règles du canton ${canton} absentes.`);
	const model: CapitalTaxModel =
		rules.model.type === "periodicBenefitRate"
			? { ...rules.model, conversion: { sourceId: rules.model.conversion.sourceId, value: unpackConversion(rules.model.conversion.value) } }
			: rules.model;
	return { ...rules, ...capital.shared, model, tax };
}
