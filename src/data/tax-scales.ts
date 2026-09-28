/**
 * Assemble, pour un canton, une commune et une année, les barèmes et règles que
 * le moteur fiscal reçoit en argument (R2, § 10) : barèmes cantonaux,
 * coefficients cantonal, communal et paroissiaux, modèle familial, corrections
 * cantonales, barèmes et règles de l'impôt fédéral direct.
 *
 * Traduit les fichiers de données dans la forme du moteur : un `Value<T>`
 * devient `{ value, sourceId }`, un `TODO` devient `{ pending, sourceId }` —
 * le moteur le signale s'il en a besoin, sans jamais supposer de valeur.
 */
import { getCantonData, getFederalData, getMunicipalMultipliers } from "./index";
import { SOURCE_BY_CANTON } from "./sources";
import type { Todo, Value } from "./schema";
import type {
	ChurchDenomination,
	FamilyModel,
	FederalTaxScales,
	Household,
	Pending,
	ScaleTable,
	Sourced,
	SourcedOrPending,
	StepwiseDeflation,
	TaxInput,
	TaxScales,
} from "../lib/calculations/tax";

export type TaxScalesQuery = Pick<TaxInput, "taxYear" | "canton" | "municipalityOfsId">;

/**
 * « Sujet fiscal » des exports de l'AFC → ménages du moteur. Les tables pour
 * concubins ne s'appliquent à aucun ménage : `TaxInput` ne modélise pas le
 * concubinage. Un intitulé inconnu arrête l'assemblage.
 */
const TAXPAYER_GROUP_HOUSEHOLDS: Record<string, Household[]> = {
	Tous: ["single", "singleWithChildren", "married"],
	"Marié(e)": ["married"],
	"Personne vivant seule": ["single", "singleWithChildren"],
	"Personne vivant seule, sans enfant": ["single"],
	"Personne vivant seule, avec / sans enfant": ["single", "singleWithChildren"],
	"Personne vivant seule, avec enfant (en concubinage)": [],
	"Personne mariée / vivant seule, avec enfant": ["married", "singleWithChildren"],
	"Personne mariée / vivant seule, avec enfant (pas en concubinage)": ["married", "singleWithChildren"],
};

type DataScale = {
	taxpayerGroup: string;
	table: Value<{
		scaleType: ScaleTable["scaleType"];
		rateSplittingDivisor: number | null;
		brackets: ScaleTable["brackets"];
	}>;
};

const toTables = (scales: DataScale[], what: string): ScaleTable[] =>
	scales.map(({ taxpayerGroup, table }) => {
		const households = TAXPAYER_GROUP_HOUSEHOLDS[taxpayerGroup];
		if (households === undefined) {
			throw new Error(
				`${what} : sujet fiscal « ${taxpayerGroup} » inconnu — ajoute-le à TAXPAYER_GROUP_HOUSEHOLDS (src/data/tax-scales.ts).`,
			);
		}
		return {
			households,
			scaleType: table.value.scaleType,
			rateSplittingDivisor: table.value.rateSplittingDivisor,
			brackets: table.value.brackets,
			sourceId: table.sourceId,
		};
	});

const isTodo = (candidate: unknown): candidate is Todo =>
	typeof candidate === "object" && candidate !== null && "todo" in candidate;

const pending = (todo: Todo): Pending => ({ pending: todo.todo, sourceId: todo.sourceId });

const sourced = <T>(value: Value<T>): Sourced<T> => ({ value: value.value, sourceId: value.sourceId });

const sourcedOrPending = <T>(candidate: Value<T> | Todo): SourcedOrPending<T> =>
	isTodo(candidate) ? pending(candidate) : sourced(candidate);

const nullable = <T>(candidate: Value<T> | Todo | null): SourcedOrPending<T> | null =>
	candidate === null ? null : sourcedOrPending(candidate);

export function getTaxScales(query: TaxScalesQuery): TaxScales {
	const canton = getCantonData(query.canton);
	if (canton.year !== query.taxYear) {
		throw new Error(
			`Données du canton ${query.canton} pour ${canton.year}, calcul demandé pour ${query.taxYear}.`,
		);
	}

	const municipality = getMunicipalMultipliers()?.multipliers.find(
		(entry) => entry.bfsId === query.municipalityOfsId,
	);
	if (!municipality || municipality.canton !== query.canton) {
		throw new Error(
			`Commune OFS ${query.municipalityOfsId} introuvable dans les coefficients communaux du canton ${query.canton}.`,
		);
	}

	const church = (tax: "income" | "wealth"): Record<ChurchDenomination, Sourced<number>> => ({
		protestant: sourced(municipality[tax].church.protestant),
		catholic: sourced(municipality[tax].church.catholic),
		christianCatholic: sourced(municipality[tax].church.christianCatholic),
	});
	const municipalMultiplier = {
		income: sourced(municipality.income.municipal),
		wealth: sourced(municipality.wealth.municipal),
	};

	// Indexation : déflation par étapes ; le pas vient du canton, le pourcentage du canton ou de la commune.
	const indexation = canton.incomeScaleIndexation;
	const cantonalIndexation: SourcedOrPending<StepwiseDeflation> | null =
		indexation === null
			? null
			: isTodo(indexation)
				? pending(indexation)
				: {
						value: { indexPercent: indexation.value.cantonalIndexPercent, stepPercent: indexation.value.deflationStepPercent },
						sourceId: indexation.sourceId,
					};
	const communalIndexation: SourcedOrPending<StepwiseDeflation> | null =
		indexation === null
			? null
			: isTodo(indexation)
				? pending(indexation)
				: municipality.communalScaleIndexation === undefined
					? {
							pending: `Indexation du barème communal de ${municipality.municipality} (OFS ${municipality.bfsId}) : à relever.`,
							sourceId: SOURCE_BY_CANTON[query.canton].municipalMultipliers,
						}
					: {
							value: {
								indexPercent: municipality.communalScaleIndexation.value,
								stepPercent: indexation.value.deflationStepPercent,
							},
							sourceId: municipality.communalScaleIndexation.sourceId,
						};

	const familyModel: FamilyModel | Pending = isTodo(canton.familyModel)
		? pending(canton.familyModel)
		: canton.familyModel.type === "divisorOnIncomeAndWealth"
			? { ...canton.familyModel, households: sourcedOrPending(canton.familyModel.households) }
			: canton.familyModel.type === "familyQuotient"
				? {
						type: "familyQuotient",
						sourceId: canton.familyModel.sourceId,
						coefficients: sourcedOrPending(canton.familyModel.coefficients),
						childReductionCap:
							canton.familyModel.childReductionCap === undefined
								? null
								: sourcedOrPending(canton.familyModel.childReductionCap),
					}
				: canton.familyModel.type === "taxReduction"
					? {
							type: "taxReduction",
							sourceId: canton.familyModel.sourceId,
							households: sourcedOrPending(canton.familyModel.households),
							reduction: sourcedOrPending(canton.familyModel.reduction),
							deductionWithoutReduction: sourcedOrPending(canton.familyModel.deductionWithoutReduction),
						}
					: canton.familyModel;

	const communal = canton.communalScale;

	return {
		canton: {
			income: toTables(canton.incomeTaxScale, `${query.canton}, barème du revenu`),
			wealth: toTables(canton.wealthTaxScale, `${query.canton}, barème de la fortune`),
			multiplier: {
				income: sourced(canton.cantonalMultiplier.income),
				wealth: sourced(canton.cantonalMultiplier.wealth),
			},
			baseTaxReduction: nullable(canton.baseTaxReduction),
			unreducedMultiplier: nullable(canton.unreducedCantonalMultiplier),
			incomeScaleIndexation: cantonalIndexation,
			supplementaryWealthTax: nullable(canton.supplementaryWealthTax),
			taxCreditPerChild: nullable(canton.taxCreditPerChild),
			maximumTaxBurden: canton.maximumTaxBurden === null ? null : sourced(canton.maximumTaxBurden),
			incomeTaxRounding: canton.incomeTaxRounding === null ? null : sourced(canton.incomeTaxRounding),
		},
		municipality:
			communal === null
				? { model: "multiplierOnBaseTax", multiplier: municipalMultiplier }
				: {
						model: "communalScale",
						income: toTables(communal.income, `${query.canton}, barème communal du revenu`),
						wealth: isTodo(communal.wealth)
							? pending(communal.wealth)
							: "value" in communal.wealth
								? // Renvoi au barème cantonal de la fortune (Valais, art. 179 LF)
									toTables(canton.wealthTaxScale, `${query.canton}, barème cantonal de la fortune`).map((table) => ({
										...table,
										sourceId: (communal.wealth as { sourceId: string }).sourceId,
									}))
								: toTables(communal.wealth, `${query.canton}, barème communal de la fortune`),
						incomeScaleIndexation: communalIndexation,
						multiplier: municipalMultiplier,
					},
		church: { income: church("income"), wealth: church("wealth") },
		familyModel,
		taxBaseRounding: {
			income: sourcedOrPending(canton.taxBaseRounding.income),
			wealth: sourcedOrPending(canton.taxBaseRounding.wealth),
			rateDeterminingIncome:
				canton.taxBaseRounding.rateDeterminingIncome === undefined
					? null
					: sourced(canton.taxBaseRounding.rateDeterminingIncome),
		},
		personalTax: nullable(canton.personalTax),
		federal: getFederalTaxScales(query.taxYear),
		coverage:
			canton.coverage === undefined
				? null
				: {
						status: canton.coverage.status,
						note: canton.coverage.note,
						notCoveredHouseholds: canton.coverage.notCoveredHouseholds ?? null,
					},
	};
}

/** Barèmes et règles de l'impôt fédéral direct d'une année (art. 36 LIFD). */
export function getFederalTaxScales(taxYear: number): FederalTaxScales {
	const federal = getFederalData(taxYear);
	if (federal.year !== taxYear) {
		throw new Error(`Données fédérales pour ${federal.year}, calcul demandé pour ${taxYear}.`);
	}
	const directFederalTax = federal.directFederalTax;
	const scales = directFederalTax.incomeTaxScales;

	return {
		income: isTodo(scales)
			? pending(scales)
			: scales.map((table) => ({
					label: table.value.label,
					appliesTo: table.value.appliesTo,
					incrementStep: table.value.incrementStep,
					brackets: table.value.brackets,
					sourceId: table.sourceId,
				})),
		maximumRatePercent: sourcedOrPending(directFederalTax.maximumRatePercent),
		taxReductionPerDependant: sourcedOrPending(directFederalTax.taxReductionPerDependant),
		minimumLeviedTax: sourcedOrPending(directFederalTax.minimumLeviedTax),
		taxRoundingToNearest: sourcedOrPending(directFederalTax.taxRoundingToNearest),
	};
}
