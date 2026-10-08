/**
 * Année fiscale de calcul d'un calculateur (accès aux données, aucune formule).
 *
 * L'année de calcul n'est jamais « la dernière année présente dans les
 * données » : c'est l'année civile en cours à la date de construction, si toutes
 * les données que lit le calculateur sont complètes pour elle, sinon la plus
 * récente année complète qui la précède. Jamais une année future, même
 * complète. Les fonctions de calcul reçoivent ensuite cette année en argument
 * (CLAUDE.md § 10).
 */
import { availableCantons, availableFederalYears, getCantonData, getFederalData, getMunicipalMultipliers } from "./index";
import type { CantonData, FederalData, MunicipalMultipliersData } from "./schema";
import { TAX_ENGINE_CANTONAL_KEYS } from "./tax-scales";

/** Ce qu'un calculateur lit dans src/data/, pour une année donnée. */
export type DataRequirement = {
	federal: readonly (keyof FederalData)[];
	/** Clés lues dans chaque fichier cantonal ; chaque canton doit porter l'année. */
	cantonal: readonly (keyof CantonData)[];
	/** Coefficients communaux de l'année. */
	municipalMultipliers: boolean;
};

/** Besoins en données de chaque calculateur, par identifiant. */
export const CALCULATOR_DATA_REQUIREMENTS: Readonly<Record<string, DataRequirement>> = {
	"pension.pillar-3a-buyback": {
		federal: ["pillar3a", "directFederalTax"],
		cantonal: TAX_ENGINE_CANTONAL_KEYS,
		municipalMultipliers: true,
	},
	"pension.pillar-3a-tax-saving": {
		federal: ["pillar3a", "directFederalTax"],
		cantonal: TAX_ENGINE_CANTONAL_KEYS,
		municipalMultipliers: true,
	},
};

/** Les données parmi lesquelles chercher, en argument pour rester testable. */
export type TaxYearData = {
	federal: ReadonlyMap<number, FederalData>;
	cantons: readonly CantonData[];
	municipalMultipliers?: MunicipalMultipliersData;
};

/** Chemins des TODO contenus dans une valeur des données. */
const todoPaths = (candidate: unknown, path: string): string[] => {
	if (candidate === null || typeof candidate !== "object") return [];
	if ("todo" in candidate) return [path];
	return Object.entries(candidate).flatMap(([key, child]) => todoPaths(child, `${path}.${key}`));
};

/**
 * Ce qui manque pour calculer en `year` : rien si l'année est disponible.
 * Fonction pure, sur les données reçues.
 */
export function missingDataForYear(year: number, requirement: DataRequirement, data: TaxYearData): string[] {
	const missing: string[] = [];
	const federal = data.federal.get(year);
	if (federal === undefined || federal.year !== year) missing.push(`données fédérales ${year} absentes`);
	else for (const key of requirement.federal) missing.push(...todoPaths(federal[key], `federal/${year}.${key}`));

	if (requirement.cantonal.length > 0) {
		if (data.cantons.length === 0) missing.push("aucun fichier cantonal");
		for (const canton of data.cantons) {
			if (canton.year !== year) {
				missing.push(`canton ${canton.canton} : données ${canton.year}, pas ${year}`);
				continue;
			}
			for (const key of requirement.cantonal) missing.push(...todoPaths(canton[key], `cantons/${canton.canton}.${key}`));
		}
	}

	if (requirement.municipalMultipliers) {
		const multipliers = data.municipalMultipliers;
		if (multipliers === undefined) missing.push("coefficients communaux absents");
		else if (multipliers.year !== year) missing.push(`coefficients communaux : données ${multipliers.year}, pas ${year}`);
		else missing.push(...todoPaths(multipliers.multipliers, "municipalities/multipliers"));
	}
	return missing;
}

/** Années où rien ne manque, croissantes. */
export function availableTaxYears(requirement: DataRequirement, data: TaxYearData): number[] {
	const candidates = new Set([...data.federal.keys(), ...data.cantons.map((canton) => canton.year)]);
	return [...candidates].filter((year) => missingDataForYear(year, requirement, data).length === 0).sort((a, b) => a - b);
}

export type TaxYearResolution = {
	/** Année de calcul. */
	year: number;
	/** Vrai si l'année civile en cours n'est pas disponible : le calcul se fait sur une année antérieure. */
	isFallback: boolean;
	/** Année civile de `today`, en Suisse. */
	calendarYear: number;
};

/** Année civile en Suisse : le build peut tourner en UTC, une heure avant minuit. */
const swissCalendarYear = (today: Date): number =>
	Number(new Intl.DateTimeFormat("fr-CH", { timeZone: "Europe/Zurich", year: "numeric" }).format(today));

/** L'année civile de `today` si elle est disponible, sinon la plus récente qui la précède. */
export function resolveYear(available: readonly number[], today: Date): TaxYearResolution {
	const calendarYear = swissCalendarYear(today);
	const candidates = available.filter((year) => year <= calendarYear);
	if (candidates.length === 0) {
		throw new Error(`Aucune année disponible en ${calendarYear} ou avant (années complètes : ${available.join(", ") || "aucune"}).`);
	}
	const year = Math.max(...candidates);
	return { year, isFallback: year !== calendarYear, calendarYear };
}

const requirementOf = (calculatorId: string): DataRequirement => {
	const requirement = CALCULATOR_DATA_REQUIREMENTS[calculatorId];
	if (requirement === undefined) throw new Error(`Besoins en données inconnus pour le calculateur « ${calculatorId} ».`);
	return requirement;
};

/** Les données réelles de src/data/. */
export const siteTaxYearData = (): TaxYearData => ({
	federal: new Map(availableFederalYears().map((year) => [year, getFederalData(year)])),
	cantons: availableCantons().map(getCantonData),
	municipalMultipliers: getMunicipalMultipliers(),
});

/** Années pour lesquelles toutes les valeurs que lit ce calculateur sont relevées. */
export const getAvailableTaxYears = (calculatorId: string): number[] =>
	availableTaxYears(requirementOf(calculatorId), siteTaxYearData());

/**
 * Année de calcul d'un calculateur. `today` vaut par défaut la date de
 * construction ; il est injectable pour les tests.
 */
export const resolveTaxYear = (calculatorId: string, today: Date = new Date()): TaxYearResolution =>
	resolveYear(getAvailableTaxYears(calculatorId), today);
