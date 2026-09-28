/**
 * Moteur fiscal : impôt sur le revenu et la fortune des six cantons romands,
 * impôt communal et paroissial, impôt fédéral direct.
 *
 * Contrat : CLAUDE.md § « Contrat du moteur fiscal » et docs/plan/engine.md.
 * Aucun import de `src/data/` : barèmes, coefficients et règles arrivent par
 * `scales`, assemblé par `getTaxScales` (src/data/tax-scales.ts). Le moteur ne
 * teste jamais le code du canton : chaque particularité cantonale est une
 * donnée de `scales` (type de barème, modèle familial, modèle communal…).
 *
 * Une valeur encore à relever (R3) arrive sous forme `Pending`. Le moteur
 * poursuit le calcul pour recenser toutes celles dont le cas a besoin, puis
 * lève `MissingTaxDataError` avec la liste complète : jamais de résultat
 * partiel, jamais de valeur supposée.
 */
import type { BreakdownLine } from "../utils/breakdown";

export type TaxInput = {
	taxYear: number;
	canton: "VD" | "GE" | "VS" | "FR" | "NE" | "JU";
	municipalityOfsId: number;
	maritalStatus: "single" | "married";
	children: number;
	childrenAges: number[]; // certaines déductions en dépendent
	denomination: "none" | "protestant" | "catholic" | "christianCatholic";
	federalTaxableIncome: number;
	cantonalTaxableIncome: number;
	taxableWealth: number;
	/**
	 * Enfants et personnes nécessiteuses qui vivent en ménage commun avec le
	 * contribuable et dont il assume pour l'essentiel l'entretien (art. 36
	 * al. 2bis LIFD). Absent : les `children` enfants, aucune personne
	 * nécessiteuse — hypothèse inscrite dans la trace.
	 */
	supportedHouseholdMembers?: { children: number; needyPersons: number };
};

// --- Barèmes et règles reçus en argument --------------------------------------

/** Situation de ménage, déduite de `TaxInput` (le concubinage n'est pas modélisé). */
export type Household = "single" | "singleWithChildren" | "married";

/** Une valeur relevée, avec l'acte qui la fixe. */
export type Sourced<T> = { value: T; sourceId: string };

/** Une valeur encore à relever (R3) : le moteur ne peut pas l'utiliser. */
export type Pending = { pending: string; sourceId: string | null };

export type SourcedOrPending<T> = Sourced<T> | Pending;

export type ScaleType = "marginal" | "averageRate" | "interpolated";

export type Bracket = { threshold: number; ratePercent: number; baseAmount: number };

export type ScaleTable = {
	/** Ménages auxquels la table s'applique. */
	households: Household[];
	/**
	 * - `marginal` : base + (assiette − seuil) × taux ;
	 * - `averageRate` : taux de la tranche × assiette entière ;
	 * - `interpolated` : taux interpolé linéairement entre les seuils × assiette entière.
	 */
	scaleType: ScaleType;
	/** Diviseur publié avec la table ; son usage dépend du modèle familial. */
	rateSplittingDivisor: number | null;
	brackets: Bracket[];
	sourceId: string;
};

export type FamilyQuotientCoefficients = {
	single: number;
	singleWithChildren: number;
	married: number;
	perChild: number;
};

/** Où s'applique le diviseur familial (voir src/data/schema.ts). */
export type FamilyModel =
	| { type: "splittingIncludedInScale"; sourceId: string }
	| { type: "separateScale"; sourceId: string }
	| { type: "divisorOnIncomeAndWealth"; sourceId: string; households: SourcedOrPending<Household[]> }
	| { type: "familyQuotient"; sourceId: string; coefficients: SourcedOrPending<FamilyQuotientCoefficients> };

export type ChurchDenomination = Exclude<TaxInput["denomination"], "none">;

type ByTax<T> = { income: T; wealth: T };

export type MunicipalModel =
	| {
			/** Coefficient communal appliqué à l'impôt cantonal de base. */
			model: "multiplierOnBaseTax";
			multiplier: ByTax<Sourced<number>>;
	  }
	| {
			/** Barème communal propre, puis coefficient communal (Valais). */
			model: "communalScale";
			income: ScaleTable[];
			wealth: ScaleTable[] | Pending;
			incomeScaleIndexation: SourcedOrPending<number> | null;
			multiplier: ByTax<Sourced<number>>;
	  };

export type TaxScales = {
	canton: {
		income: ScaleTable[];
		wealth: ScaleTable[];
		/** Coefficient cantonal, en %. */
		multiplier: ByTax<Sourced<number>>;
		/** Réduction de l'impôt de base, sur la seule part cantonale. */
		baseTaxReduction: SourcedOrPending<{ ratePercent: number; appliesTo: ("income" | "wealth")[] }> | null;
		/** Part du coefficient cantonal calculée sur l'impôt de base non réduit, en %. */
		unreducedMultiplier: SourcedOrPending<ByTax<number>> | null;
		/** Facteur appliqué aux seuils du barème du revenu. */
		incomeScaleIndexation: SourcedOrPending<number> | null;
		/** Impôt supplémentaire sur la fortune, forme arrêtée au relevé. */
		supplementaryWealthTax: Pending | null;
		/** Rabais d'impôt par enfant, déduit de l'impôt cantonal. */
		taxCreditPerChild: SourcedOrPending<number> | null;
	};
	municipality: MunicipalModel;
	/** Coefficients paroissiaux de la commune, en %. */
	church: ByTax<Record<ChurchDenomination, Sourced<number>>>;
	familyModel: FamilyModel | Pending;
	/** Arrondi vers le bas des assiettes cantonales, en francs. */
	taxBaseRounding: SourcedOrPending<{ incomeStep: number; wealthStep: number }>;
	personalTax: SourcedOrPending<number> | null;
	federal: FederalTaxScales;
};

/** Situation qui détermine le barème de l'impôt fédéral direct (art. 36 LIFD). */
export type FederalTaxSituation = "marriedCoupleLivingTogether" | "livingWithSupportedDependants" | "otherTaxpayer";

/** `ratePercent` vaut `null` là où la table publie « - » : aucun montant par tranche. */
export type FederalBracket = { threshold: number; baseAmount: number; ratePercent: number | null };

export type FederalScaleTable = {
	label: string;
	/** Situations auxquelles la table s'applique. */
	appliesTo: FederalTaxSituation[];
	/** Le taux s'applique par tranche complète de `incrementStep` francs au-delà du seuil. */
	incrementStep: number;
	/** Les deux dernières lignes encodent le taux maximal. */
	brackets: FederalBracket[];
	sourceId: string;
};

export type FederalTaxScales = {
	income: FederalScaleTable[] | Pending;
	/** Taux maximal, appliqué au revenu entier à partir du dernier seuil, en %. */
	maximumRatePercent: SourcedOrPending<number>;
	/** Réduction de l'impôt par enfant et par personne nécessiteuse. */
	taxReductionPerDependant: SourcedOrPending<number>;
	/** Montant d'impôt en dessous duquel l'impôt n'est pas perçu. */
	minimumLeviedTax: SourcedOrPending<number>;
	/** Pas de l'arrondi de l'impôt, au plus proche, en francs. */
	taxRoundingToNearest: SourcedOrPending<number>;
};

// --- Résultats -----------------------------------------------------------------

export type TaxResult = {
	baseCantonalIncomeTax: number;
	baseCantonalWealthTax: number;
	cantonalTax: number;
	municipalTax: number;
	churchTax: number;
	personalTax: number;
	federalTax: number;
	totalTax: number;
	/** (impôts cantonal, communal et paroissial) / revenu imposable cantonal, en %. */
	averageRateOnCantonalTaxableIncome: number;
	breakdown: BreakdownLine[];
};

export type FederalTaxResult = {
	federalTax: number;
	breakdown: BreakdownLine[];
};

export type MarginalRateResult = {
	/** Impôt supplémentaire sur 100 CHF ajoutés aux deux revenus imposables, en %. */
	marginalRatePercent: number;
	breakdown: BreakdownLine[];
};

export type TaxSavingResult = {
	totalTaxBefore: number;
	totalTaxAfter: number;
	/** `totalTaxBefore − totalTaxAfter`, jamais un taux marginal × un montant. */
	taxSaving: number;
	breakdown: BreakdownLine[];
};

export type MissingItem = { label: string; todo: string; sourceId: string | null };

/** Le calcul demande des valeurs encore à relever (R3). */
export class MissingTaxDataError extends Error {
	readonly missing: MissingItem[];

	constructor(missing: MissingItem[]) {
		super(
			`Valeurs à relever avant de pouvoir calculer ce cas :\n${missing
				.map((item) => `· ${item.label} — ${item.todo} (source : ${item.sourceId ?? "à inscrire au registre"})`)
				.join("\n")}`,
		);
		this.name = "MissingTaxDataError";
		this.missing = missing;
	}
}

// --- Évaluation d'un barème -----------------------------------------------------

const numberFormat = new Intl.NumberFormat("fr-CH", { maximumFractionDigits: 4 });
const fmt = (value: number): string => numberFormat.format(value);

const bracketIndex = (brackets: Pick<Bracket, "threshold">[], amount: number): number => {
	let index = 0;
	for (let i = 0; i < brackets.length; i++) {
		if (brackets[i]!.threshold <= amount) index = i;
		else break;
	}
	return index;
};

/**
 * Taux et impôt d'un barème pour une assiette. `lookupFactor` indexe les seuils
 * pour la seule lecture du taux : il n'a de sens que pour un barème à taux.
 */
export function evaluateScale(
	table: Pick<ScaleTable, "scaleType" | "brackets">,
	amount: number,
	lookupFactor = 1,
): { tax: number; formula: string } {
	if (amount <= 0) return { tax: 0, formula: "assiette nulle" };
	const { brackets } = table;

	if (table.scaleType === "marginal") {
		if (lookupFactor !== 1) {
			throw new Error("Indexation des seuils non définie pour un barème marginal.");
		}
		const bracket = brackets[bracketIndex(brackets, amount)]!;
		const tax = bracket.baseAmount + ((amount - bracket.threshold) * bracket.ratePercent) / 100;
		return {
			tax,
			formula: `${fmt(bracket.baseAmount)} + (${fmt(amount)} − ${fmt(bracket.threshold)}) × ${fmt(bracket.ratePercent)} %`,
		};
	}

	const lookup = amount / lookupFactor;
	const index = bracketIndex(brackets, lookup);
	const bracket = brackets[index]!;
	const next = brackets[index + 1];
	const lookupText = lookupFactor === 1 ? "" : ` (taux lu à ${fmt(amount)} / ${fmt(lookupFactor)} = ${fmt(lookup)})`;

	if (table.scaleType === "averageRate" || next === undefined || next.threshold === bracket.threshold) {
		return {
			tax: (amount * bracket.ratePercent) / 100,
			formula: `${fmt(amount)} × ${fmt(bracket.ratePercent)} %${lookupText}`,
		};
	}

	const ratePercent =
		bracket.ratePercent +
		((lookup - bracket.threshold) * (next.ratePercent - bracket.ratePercent)) / (next.threshold - bracket.threshold);
	return {
		tax: (amount * ratePercent) / 100,
		formula: `${fmt(amount)} × ${fmt(ratePercent)} %, taux interpolé entre ${fmt(bracket.threshold)} (${fmt(bracket.ratePercent)} %) et ${fmt(next.threshold)} (${fmt(next.ratePercent)} %)${lookupText}`,
	};
}

/** Impôt au taux du revenu divisé : diviseur × barème(assiette / diviseur). */
const evaluateWithDivisor = (
	table: ScaleTable,
	amount: number,
	divisor: number,
	lookupFactor: number,
): { tax: number; formula: string } => {
	if (divisor === 1) return evaluateScale(table, amount, lookupFactor);
	const divided = evaluateScale(table, amount / divisor, lookupFactor);
	return {
		tax: divided.tax * divisor,
		formula: `${fmt(divisor)} × [${divided.formula}], assiette ${fmt(amount)} / ${fmt(divisor)}`,
	};
};

/**
 * Impôt selon une table de l'art. 36 LIFD : montant dû au seuil de la ligne,
 * plus le taux par tranche complète de `incrementStep` francs au-delà. Dès le
 * seuil de la dernière ligne, le taux maximal s'applique au revenu entier, sans
 * calcul par tranche ; la dernière ligne doit en être la traduction exacte.
 */
export function evaluateFederalScale(
	table: Pick<FederalScaleTable, "incrementStep" | "brackets">,
	amount: number,
	maximumRatePercent: number,
): { tax: number; formula: string } {
	const { brackets, incrementStep } = table;
	const first = brackets[0]!;
	const capRow = brackets[brackets.length - 1]!;
	if (
		capRow.ratePercent !== maximumRatePercent ||
		Math.abs(capRow.baseAmount - (capRow.threshold * maximumRatePercent) / 100) > 0.005
	) {
		throw new Error(
			`Barème fédéral : la dernière ligne (${fmt(capRow.threshold)} ; ${fmt(capRow.baseAmount)} ; ${fmt(capRow.ratePercent ?? Number.NaN)} %) ne traduit pas le taux maximal de ${fmt(maximumRatePercent)} %.`,
		);
	}
	if (amount <= 0) return { tax: 0, formula: "assiette nulle" };
	if (amount >= capRow.threshold) {
		return {
			tax: (amount * maximumRatePercent) / 100,
			formula: `${fmt(amount)} × ${fmt(maximumRatePercent)} %, taux maximal sur le revenu entier dès ${fmt(capRow.threshold)}`,
		};
	}
	if (amount < first.threshold) {
		return { tax: first.baseAmount, formula: `jusqu'à ${fmt(first.threshold)} : ${fmt(first.baseAmount)}` };
	}
	const bracket = brackets[bracketIndex(brackets, amount)]!;
	const steps = Math.floor((amount - bracket.threshold) / incrementStep);
	if (bracket.ratePercent === null) {
		return {
			tax: bracket.baseAmount,
			formula: `${fmt(bracket.baseAmount)}, sans montant par tranche au-delà de ${fmt(bracket.threshold)}`,
		};
	}
	const perStep = (incrementStep * bracket.ratePercent) / 100;
	return {
		tax: bracket.baseAmount + steps * perStep,
		formula: `${fmt(bracket.baseAmount)} + ${steps} × ${fmt(perStep)} (tranches complètes de ${fmt(incrementStep)} au-delà de ${fmt(bracket.threshold)})`,
	};
}

export const householdOf = (input: Pick<TaxInput, "maritalStatus" | "children">): Household =>
	input.maritalStatus === "married" ? "married" : input.children > 0 ? "singleWithChildren" : "single";

const HOUSEHOLD_LABELS: Record<Household, string> = {
	single: "personne seule sans enfant",
	singleWithChildren: "famille monoparentale",
	married: "couple marié",
};

const selectTable = (tables: ScaleTable[], household: Household, what: string): ScaleTable => {
	const matching = tables.filter((table) => table.households.includes(household));
	if (matching.length !== 1) {
		throw new Error(
			`${what} : ${matching.length} table(s) pour un ménage « ${HOUSEHOLD_LABELS[household]} », une seule attendue.`,
		);
	}
	return matching[0]!;
};

const isPending = <T extends object>(candidate: T | Pending): candidate is Pending => "pending" in candidate;

type Need = <T>(item: SourcedOrPending<T>, label: string) => Sourced<T> | undefined;

/** La valeur si elle est relevée ; sinon, la note pour le rapport final et `undefined`. */
const needInto =
	(missing: MissingItem[]): Need =>
	<T>(item: SourcedOrPending<T>, label: string): Sourced<T> | undefined => {
		if (isPending(item)) {
			missing.push({ label, todo: item.pending, sourceId: item.sourceId });
			return undefined;
		}
		return item;
	};

// --- Impôt fédéral direct ----------------------------------------------------------

const FEDERAL_SITUATION_LABELS: Record<FederalTaxSituation, string> = {
	marriedCoupleLivingTogether: "époux vivant en ménage commun",
	livingWithSupportedDependants:
		"contribuable veuf, séparé, divorcé ou célibataire vivant en ménage commun avec des enfants ou des personnes nécessiteuses dont il assume pour l'essentiel l'entretien",
	otherTaxpayer: "autre contribuable",
};

/**
 * Impôt fédéral direct : choix du barème selon la situation (art. 36 al. 1, 2
 * et 2bis LIFD), barème avec taux maximal, réduction par enfant et par personne
 * nécessiteuse, arrondi, puis montant minimal perçu. Renvoie 0 si une valeur
 * manque : `need` l'a notée, l'appelant lève l'erreur.
 */
const federalIncomeTax = (
	input: TaxInput,
	federal: FederalTaxScales,
	need: Need,
	line: (entry: BreakdownLine) => void,
): number => {
	const declared = input.supportedHouseholdMembers;
	if (
		declared !== undefined &&
		![declared.children, declared.needyPersons].every((count) => Number.isInteger(count) && count >= 0)
	) {
		throw new Error(
			`Personnes à charge en ménage commun invalides : ${declared.children} enfant(s), ${declared.needyPersons} personne(s) nécessiteuse(s).`,
		);
	}
	const children = declared?.children ?? input.children;
	const needyPersons = declared?.needyPersons ?? 0;
	const dependants = children + needyPersons;
	const situation: FederalTaxSituation =
		input.maritalStatus === "married"
			? "marriedCoupleLivingTogether"
			: dependants > 0
				? "livingWithSupportedDependants"
				: "otherTaxpayer";

	let tables: FederalScaleTable[] | undefined;
	if (isPending(federal.income)) need(federal.income, "Barème de l'impôt fédéral direct");
	else tables = federal.income;
	const maximumRate = need(federal.maximumRatePercent, "Taux maximal de l'impôt fédéral direct");
	const reductionPerDependant =
		dependants > 0
			? need(federal.taxReductionPerDependant, "Réduction de l'impôt fédéral par enfant et par personne nécessiteuse")
			: undefined;
	const rounding = need(federal.taxRoundingToNearest, "Arrondi de l'impôt fédéral direct");
	const minimum = need(federal.minimumLeviedTax, "Montant minimal perçu de l'impôt fédéral direct");
	if (!tables || !maximumRate || !rounding || !minimum || (dependants > 0 && !reductionPerDependant)) return 0;

	// Barème applicable
	const matching = tables.filter((table) => table.appliesTo.includes(situation));
	if (matching.length !== 1) {
		throw new Error(
			`Barème de l'impôt fédéral direct : ${matching.length} table(s) pour « ${FEDERAL_SITUATION_LABELS[situation]} », une seule attendue.`,
		);
	}
	const table = matching[0]!;
	const assumptions = [
		...(situation === "marriedCoupleLivingTogether" ? ["Les époux vivent en ménage commun."] : []),
		...(declared === undefined && children > 0
			? [
					`Les ${children} enfant(s) vivent en ménage commun avec le contribuable, qui assume pour l'essentiel leur entretien ; aucune personne nécessiteuse.`,
				]
			: []),
	];
	line({
		label: "Barème de l'impôt fédéral direct applicable",
		operands: { children, needyPersons },
		formula: `${FEDERAL_SITUATION_LABELS[situation]}, ${children} enfant(s) et ${needyPersons} personne(s) nécessiteuse(s) en ménage commun → ${table.label}`,
		value: dependants,
		sourceId: table.sourceId,
		...(assumptions.length > 0 ? { assumption: assumptions.join(" ") } : {}),
	});

	// Impôt selon le barème
	const scale = evaluateFederalScale(table, input.federalTaxableIncome, maximumRate.value);
	let federalTax = scale.tax;
	line({
		label: "Impôt fédéral direct selon le barème",
		operands: { federalTaxableIncome: input.federalTaxableIncome, maximumRatePercent: maximumRate.value },
		formula: scale.formula,
		value: scale.tax,
		unit: "CHF",
		sourceId: table.sourceId,
	});

	// Réduction par enfant et par personne nécessiteuse
	if (reductionPerDependant) {
		const before = federalTax;
		federalTax = Math.max(0, federalTax - reductionPerDependant.value * dependants);
		line({
			label: "Impôt fédéral direct après réduction pour enfants et personnes nécessiteuses",
			operands: { federalTax: before, reductionPerDependant: reductionPerDependant.value, dependants },
			formula: `max(0 ; ${fmt(before)} − ${fmt(reductionPerDependant.value)} × ${dependants})`,
			value: federalTax,
			unit: "CHF",
			sourceId: reductionPerDependant.sourceId,
			assumption: "La réduction ne rend pas l'impôt négatif.",
		});
	}

	// Arrondi
	const beforeRounding = federalTax;
	federalTax = Math.round(federalTax / rounding.value) * rounding.value;
	line({
		label: "Impôt fédéral direct arrondi",
		operands: { federalTax: beforeRounding, step: rounding.value },
		formula: `${fmt(beforeRounding)} arrondi à ${fmt(rounding.value)} CHF le plus proche`,
		value: federalTax,
		unit: "CHF",
		sourceId: rounding.sourceId,
		assumption: "Arrondi retenu d'après les cas de référence ; aucune base identifiée dans la LIFD.",
	});

	// Montant minimal perçu
	if (federalTax > 0 && federalTax < minimum.value) {
		const notLevied = federalTax;
		federalTax = 0;
		line({
			label: "Impôt fédéral direct non perçu",
			operands: { federalTax: notLevied, minimumLeviedTax: minimum.value },
			formula: `${fmt(notLevied)} < ${fmt(minimum.value)} : montant non perçu`,
			value: federalTax,
			unit: "CHF",
			sourceId: minimum.sourceId,
		});
	}

	return federalTax;
};

/** L'impôt fédéral direct seul, avec sa trace. */
export function computeFederalIncomeTax(input: TaxInput, federal: FederalTaxScales): FederalTaxResult {
	const missing: MissingItem[] = [];
	const breakdown: BreakdownLine[] = [];
	const federalTax = federalIncomeTax(input, federal, needInto(missing), (entry) => breakdown.push(entry));
	if (missing.length > 0) throw new MissingTaxDataError(missing);
	return { federalTax, breakdown };
}

// --- Le calcul -------------------------------------------------------------------

export function computeIncomeAndWealthTax(input: TaxInput, scales: TaxScales): TaxResult {
	const missing: MissingItem[] = [];
	const breakdown: BreakdownLine[] = [];
	const need = needInto(missing);
	const line = (entry: BreakdownLine): void => {
		breakdown.push(entry);
	};

	const household = householdOf(input);
	const children = input.children;

	// 1. Arrondi des assiettes cantonales
	const rounding = need(scales.taxBaseRounding, "Arrondi des revenu et fortune imposables cantonaux");
	const incomeStep = rounding?.value.incomeStep ?? 1;
	const wealthStep = rounding?.value.wealthStep ?? 1;
	const cantonalIncome = Math.floor(input.cantonalTaxableIncome / incomeStep) * incomeStep;
	const wealth = Math.floor(input.taxableWealth / wealthStep) * wealthStep;
	if (rounding) {
		line({
			label: "Revenu imposable cantonal retenu",
			operands: { cantonalTaxableIncome: input.cantonalTaxableIncome, step: incomeStep },
			formula: `${fmt(input.cantonalTaxableIncome)} arrondi à ${fmt(incomeStep)} CHF inférieurs`,
			value: cantonalIncome,
			unit: "CHF",
			sourceId: rounding.sourceId,
		});
		line({
			label: "Fortune imposable retenue",
			operands: { taxableWealth: input.taxableWealth, step: wealthStep },
			formula: `${fmt(input.taxableWealth)} arrondi à ${fmt(wealthStep)} CHF inférieurs`,
			value: wealth,
			unit: "CHF",
			sourceId: rounding.sourceId,
		});
	}

	// 2. Tables et diviseurs selon le modèle familial
	const incomeTable = selectTable(scales.canton.income, household, "Barème cantonal du revenu");
	const wealthTable = selectTable(scales.canton.wealth, household, "Barème cantonal de la fortune");
	let incomeDivisor = 1;
	let wealthDivisor = 1;
	let familySourceId: string | null = null;
	let familyFormula = "";
	const familyModel = scales.familyModel;
	if (isPending(familyModel)) {
		missing.push({ label: "Modèle familial cantonal", todo: familyModel.pending, sourceId: familyModel.sourceId });
	} else {
		familySourceId = familyModel.sourceId;
		switch (familyModel.type) {
			case "splittingIncludedInScale":
			case "separateScale":
				break;
			case "divisorOnIncomeAndWealth": {
				const households = need(familyModel.households, "Ménages soumis au splitting");
				if (households?.value.includes(household)) {
					incomeDivisor = incomeTable.rateSplittingDivisor ?? 1;
					wealthDivisor = wealthTable.rateSplittingDivisor ?? 1;
					familyFormula = `diviseur ${fmt(incomeDivisor)} sur le revenu, ${fmt(wealthDivisor)} sur la fortune`;
				}
				break;
			}
			case "familyQuotient": {
				const coefficients = need(familyModel.coefficients, "Coefficients du quotient familial");
				if (coefficients) {
					const base = coefficients.value[household];
					const perChild = coefficients.value.perChild;
					incomeDivisor = base + perChild * children;
					familyFormula = `${fmt(base)} + ${fmt(perChild)} × ${children} enfant(s)`;
				}
				break;
			}
		}
		if (incomeDivisor !== 1 || wealthDivisor !== 1) {
			line({
				label: "Diviseur familial",
				operands: { incomeDivisor, wealthDivisor, children },
				formula: familyFormula,
				value: incomeDivisor,
				sourceId: familySourceId,
			});
		}
	}

	// 3. Impôt cantonal de base sur le revenu
	const cantonalIndexation =
		scales.canton.incomeScaleIndexation === null
			? undefined
			: need(scales.canton.incomeScaleIndexation, "Indexation du barème cantonal du revenu");
	const baseIncome = evaluateWithDivisor(incomeTable, cantonalIncome, incomeDivisor, cantonalIndexation?.value ?? 1);
	line({
		label: "Impôt cantonal de base sur le revenu",
		operands: { cantonalTaxableIncome: cantonalIncome, divisor: incomeDivisor },
		formula: baseIncome.formula,
		value: baseIncome.tax,
		unit: "CHF",
		sourceId: incomeTable.sourceId,
	});

	// 4. Impôt cantonal de base sur la fortune
	const baseWealth = evaluateWithDivisor(wealthTable, wealth, wealthDivisor, 1);
	line({
		label: "Impôt cantonal de base sur la fortune",
		operands: { taxableWealth: wealth, divisor: wealthDivisor },
		formula: baseWealth.formula,
		value: baseWealth.tax,
		unit: "CHF",
		sourceId: wealthTable.sourceId,
	});
	if (scales.canton.supplementaryWealthTax !== null && wealth > 0) {
		need(scales.canton.supplementaryWealthTax, "Impôt supplémentaire sur la fortune");
	}

	// 5. Corrections cantonales et impôt cantonal
	const reduction =
		scales.canton.baseTaxReduction === null
			? undefined
			: need(scales.canton.baseTaxReduction, "Réduction de l'impôt cantonal de base");
	const reductionFactor = (tax: "income" | "wealth"): number =>
		reduction?.value.appliesTo.includes(tax) ? 1 - reduction.value.ratePercent / 100 : 1;
	const multiplier = scales.canton.multiplier;
	let cantonalTax =
		(baseIncome.tax * reductionFactor("income") * multiplier.income.value) / 100 +
		(baseWealth.tax * reductionFactor("wealth") * multiplier.wealth.value) / 100;
	let cantonalFormula = `${fmt(baseIncome.tax)} × ${fmt(reductionFactor("income"))} × ${fmt(multiplier.income.value)} % + ${fmt(baseWealth.tax)} × ${fmt(reductionFactor("wealth"))} × ${fmt(multiplier.wealth.value)} %`;
	if (reduction) {
		line({
			label: "Réduction de l'impôt cantonal de base",
			operands: { ratePercent: reduction.value.ratePercent },
			formula: `${fmt(reduction.value.ratePercent)} % sur ${reduction.value.appliesTo.map((tax) => (tax === "income" ? "le revenu" : "la fortune")).join(" et ")}, part cantonale seulement`,
			value: reduction.value.ratePercent,
			unit: "%",
			sourceId: reduction.sourceId,
		});
	}
	if (scales.canton.unreducedMultiplier !== null) {
		const unreduced = need(scales.canton.unreducedMultiplier, "Part du coefficient cantonal hors réduction");
		if (unreduced) {
			cantonalTax +=
				(baseIncome.tax * unreduced.value.income) / 100 + (baseWealth.tax * unreduced.value.wealth) / 100;
			cantonalFormula += ` + ${fmt(baseIncome.tax)} × ${fmt(unreduced.value.income)} % + ${fmt(baseWealth.tax)} × ${fmt(unreduced.value.wealth)} % (hors réduction, source ${unreduced.sourceId})`;
		}
	}
	line({
		label: "Impôt cantonal",
		operands: {
			baseCantonalIncomeTax: baseIncome.tax,
			baseCantonalWealthTax: baseWealth.tax,
			incomeMultiplierPercent: multiplier.income.value,
			wealthMultiplierPercent: multiplier.wealth.value,
		},
		formula: cantonalFormula,
		value: cantonalTax,
		unit: "CHF",
		sourceId: multiplier.income.sourceId,
	});

	// 6. Rabais d'impôt par enfant
	if (scales.canton.taxCreditPerChild !== null && children > 0) {
		const credit = need(scales.canton.taxCreditPerChild, "Rabais d'impôt par enfant");
		if (credit) {
			const before = cantonalTax;
			cantonalTax = Math.max(0, cantonalTax - credit.value * children);
			line({
				label: "Impôt cantonal après rabais pour enfants",
				operands: { cantonalTax: before, creditPerChild: credit.value, children },
				formula: `max(0 ; ${fmt(before)} − ${fmt(credit.value)} × ${children})`,
				value: cantonalTax,
				unit: "CHF",
				sourceId: credit.sourceId,
				assumption: "Le rabais ne rend pas l'impôt négatif.",
			});
		}
	}

	// 7. Impôt communal
	let municipalTax: number;
	const municipality = scales.municipality;
	if (municipality.model === "multiplierOnBaseTax") {
		municipalTax =
			(baseIncome.tax * municipality.multiplier.income.value) / 100 +
			(baseWealth.tax * municipality.multiplier.wealth.value) / 100;
		line({
			label: "Impôt communal",
			operands: {
				incomeMultiplierPercent: municipality.multiplier.income.value,
				wealthMultiplierPercent: municipality.multiplier.wealth.value,
			},
			formula: `${fmt(baseIncome.tax)} × ${fmt(municipality.multiplier.income.value)} % + ${fmt(baseWealth.tax)} × ${fmt(municipality.multiplier.wealth.value)} %`,
			value: municipalTax,
			unit: "CHF",
			sourceId: municipality.multiplier.income.sourceId,
			assumption: "Le coefficient communal s'applique à l'impôt cantonal de base non réduit.",
		});
	} else {
		const communalIncomeTable = selectTable(municipality.income, household, "Barème communal du revenu");
		const communalIndexation =
			municipality.incomeScaleIndexation === null
				? undefined
				: need(municipality.incomeScaleIndexation, "Indexation du barème communal du revenu");
		const communalIncome = evaluateWithDivisor(
			communalIncomeTable,
			cantonalIncome,
			incomeDivisor,
			communalIndexation?.value ?? 1,
		);
		let communalWealthTax = 0;
		let communalWealthFormula = "";
		if (isPending(municipality.wealth)) {
			if (wealth > 0) need(municipality.wealth, "Barème communal de la fortune");
		} else {
			const communalWealth = evaluateWithDivisor(
				selectTable(municipality.wealth, household, "Barème communal de la fortune"),
				wealth,
				wealthDivisor,
				1,
			);
			communalWealthTax = communalWealth.tax;
			communalWealthFormula = communalWealth.formula;
		}
		municipalTax =
			(communalIncome.tax * municipality.multiplier.income.value) / 100 +
			(communalWealthTax * municipality.multiplier.wealth.value) / 100;
		line({
			label: "Impôt communal selon le barème communal",
			operands: {
				communalIncomeTax: communalIncome.tax,
				communalWealthTax,
				incomeMultiplierPercent: municipality.multiplier.income.value,
				wealthMultiplierPercent: municipality.multiplier.wealth.value,
			},
			formula: `[${communalIncome.formula}] × ${fmt(municipality.multiplier.income.value)} %${communalWealthFormula ? ` + [${communalWealthFormula}] × ${fmt(municipality.multiplier.wealth.value)} %` : ""}`,
			value: municipalTax,
			unit: "CHF",
			sourceId: communalIncomeTable.sourceId,
		});
	}

	// 8. Impôt paroissial
	let churchTax = 0;
	if (input.denomination !== "none") {
		const churchIncome = scales.church.income[input.denomination];
		const churchWealth = scales.church.wealth[input.denomination];
		churchTax = (baseIncome.tax * churchIncome.value) / 100 + (baseWealth.tax * churchWealth.value) / 100;
		line({
			label: "Impôt paroissial",
			operands: { incomeMultiplierPercent: churchIncome.value, wealthMultiplierPercent: churchWealth.value },
			formula: `${fmt(baseIncome.tax)} × ${fmt(churchIncome.value)} % + ${fmt(baseWealth.tax)} × ${fmt(churchWealth.value)} %`,
			value: churchTax,
			unit: "CHF",
			sourceId: churchIncome.sourceId,
			assumption: "Le coefficient paroissial s'applique à l'impôt cantonal de base non réduit.",
		});
	}

	// 9. Taxe personnelle
	let personalTax = 0;
	if (scales.personalTax !== null) {
		const flat = need(scales.personalTax, "Taxe personnelle");
		if (flat) {
			personalTax = flat.value;
			line({
				label: "Taxe personnelle",
				operands: {},
				formula: "montant forfaitaire",
				value: personalTax,
				unit: "CHF",
				sourceId: flat.sourceId,
			});
		}
	}

	// 10. Impôt fédéral direct
	const federalTax = federalIncomeTax(input, scales.federal, need, line);

	if (missing.length > 0) throw new MissingTaxDataError(missing);

	// 11. Total
	const totalTax = cantonalTax + municipalTax + churchTax + personalTax + federalTax;
	line({
		label: "Impôt total",
		operands: { cantonalTax, municipalTax, churchTax, personalTax, federalTax },
		formula: `${fmt(cantonalTax)} + ${fmt(municipalTax)} + ${fmt(churchTax)} + ${fmt(personalTax)} + ${fmt(federalTax)}`,
		value: totalTax,
		unit: "CHF",
		sourceId: null,
	});

	return {
		baseCantonalIncomeTax: baseIncome.tax,
		baseCantonalWealthTax: baseWealth.tax,
		cantonalTax,
		municipalTax,
		churchTax,
		personalTax,
		federalTax,
		totalTax,
		averageRateOnCantonalTaxableIncome:
			input.cantonalTaxableIncome > 0
				? ((cantonalTax + municipalTax + churchTax) / input.cantonalTaxableIncome) * 100
				: 0,
		breakdown,
	};
}

const MARGINAL_STEP_CHF = 100;

/**
 * Impôt supplémentaire sur 100 CHF de revenu imposable ajoutés simultanément
 * aux deux bases, divisé par 100. Oracle de pente, jamais méthode de calcul
 * d'une économie.
 */
export function computeMarginalRate(input: TaxInput, scales: TaxScales): MarginalRateResult {
	const before = computeIncomeAndWealthTax(input, scales).totalTax;
	const after = computeIncomeAndWealthTax(
		{
			...input,
			federalTaxableIncome: input.federalTaxableIncome + MARGINAL_STEP_CHF,
			cantonalTaxableIncome: input.cantonalTaxableIncome + MARGINAL_STEP_CHF,
		},
		scales,
	).totalTax;
	const marginalRatePercent = ((after - before) / MARGINAL_STEP_CHF) * 100;
	return {
		marginalRatePercent,
		breakdown: [
			{
				label: "Taux marginal sur le revenu imposable",
				operands: { totalTaxBefore: before, totalTaxAfter: after, step: MARGINAL_STEP_CHF },
				formula: `(${fmt(after)} − ${fmt(before)}) / ${MARGINAL_STEP_CHF} × 100`,
				value: marginalRatePercent,
				unit: "%",
				sourceId: null,
				assumption: `${MARGINAL_STEP_CHF} CHF ajoutés au revenu imposable cantonal et au revenu imposable fédéral.`,
			},
		],
	};
}

/**
 * Impôt total moins impôt total avec les deux revenus imposables diminués de
 * `deduction`.
 */
export function computeTaxSavingOnDeduction(
	input: TaxInput,
	scales: TaxScales,
	deduction: number,
): TaxSavingResult {
	if (!Number.isFinite(deduction) || deduction < 0) {
		throw new Error(`Déduction invalide : ${deduction}. Un montant positif ou nul est attendu.`);
	}
	const before = computeIncomeAndWealthTax(input, scales);
	const after = computeIncomeAndWealthTax(
		{
			...input,
			federalTaxableIncome: Math.max(0, input.federalTaxableIncome - deduction),
			cantonalTaxableIncome: Math.max(0, input.cantonalTaxableIncome - deduction),
		},
		scales,
	);
	const taxSaving = before.totalTax - after.totalTax;
	return {
		totalTaxBefore: before.totalTax,
		totalTaxAfter: after.totalTax,
		taxSaving,
		breakdown: [
			...before.breakdown,
			...after.breakdown.map((entry) => ({ ...entry, label: `${entry.label} (après déduction)` })),
			{
				label: "Économie d'impôt",
				operands: { totalTaxBefore: before.totalTax, totalTaxAfter: after.totalTax, deduction },
				formula: `${fmt(before.totalTax)} − ${fmt(after.totalTax)}`,
				value: taxSaving,
				unit: "CHF",
				sourceId: null,
				assumption: `Déduction de ${fmt(deduction)} CHF appliquée aux deux revenus imposables.`,
			},
		],
	};
}
