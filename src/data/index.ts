/**
 * Accès typé à la couche de données, avec résolution par année (CLAUDE.md § 10).
 *
 * Les fichiers JSON de `federal/` et `cantons/` sont découverts automatiquement.
 * Les fonctions `getFederalData` / `getCantonData` valident à la volée contre les
 * schémas zod et n'exposent que des données conformes. Les helpers `allDataFiles`
 * / `eachValue` / `cantonFiles` donnent un accès brut, utilisé par les tests.
 */
import {
	cantonDataSchema,
	federalDataSchema,
	municipalMultipliersDataSchema,
	type CantonData,
	type FederalData,
	type MunicipalMultipliersData,
	type Value,
} from "./schema";

type RawModule = { default: unknown };

const federalModules = import.meta.glob<RawModule>("./federal/*.json", {
	eager: true,
});
const cantonModules = import.meta.glob<RawModule>("./cantons/*.json", {
	eager: true,
});
const municipalityModules = import.meta.glob<RawModule>(
	"./municipalities/*.json",
	{ eager: true },
);

const toPath = (globKey: string): string => globKey.replace(/^\.\//, "");

const cantonCodeFromPath = (path: string): string =>
	(path.match(/([a-z]{2})\.json$/i)?.[1] ?? "").toUpperCase();

export interface DataFile {
	/** Chemin relatif à `src/data/`, p. ex. « federal/2026.json ». */
	path: string;
	data: unknown;
}

export interface CantonFile {
	/** Code canton déduit du nom de fichier. */
	code: string;
	path: string;
	data: unknown;
}

/** Tous les fichiers de données, sans validation. */
export const allDataFiles = (): DataFile[] =>
	[
		...Object.entries(federalModules),
		...Object.entries(cantonModules),
		...Object.entries(municipalityModules),
	].map(([key, mod]) => ({ path: toPath(key), data: mod.default }));

/** Les fichiers cantonaux, sans validation. */
export const cantonFiles = (): CantonFile[] =>
	Object.entries(cantonModules).map(([key, mod]) => {
		const path = toPath(key);
		return { code: cantonCodeFromPath(path), path, data: mod.default };
	});

/** Vrai si `x` a la forme d'un `Value<T>`. */
const isValue = (x: unknown): x is Value<unknown> =>
	typeof x === "object" &&
	x !== null &&
	"value" in x &&
	"sourceId" in x &&
	"verifiedOn" in x &&
	"effectiveFrom" in x;

/**
 * Parcourt récursivement une structure de données et invoque `visit` sur chaque
 * `Value<T>` rencontré, y compris ceux imbriqués dans un `value`.
 */
export const eachValue = (
	data: unknown,
	visit: (value: Value<unknown>, path: string) => void,
	path = "",
): void => {
	if (isValue(data)) {
		visit(data, path || "(racine)");
		eachValue(data.value, visit, `${path}.value`);
		return;
	}
	if (Array.isArray(data)) {
		data.forEach((item, index) => eachValue(item, visit, `${path}[${index}]`));
		return;
	}
	if (typeof data === "object" && data !== null) {
		for (const [key, child] of Object.entries(data)) {
			eachValue(child, visit, path ? `${path}.${key}` : key);
		}
	}
};

// --- Accès validé, avec mémoïsation paresseuse -----------------------------

let federalByYear: Map<number, FederalData> | null = null;
let cantonByCode: Map<string, CantonData> | null = null;

const loadFederal = (): Map<number, FederalData> => {
	if (federalByYear) return federalByYear;
	federalByYear = new Map();
	for (const mod of Object.values(federalModules)) {
		const parsed = federalDataSchema.parse(mod.default);
		federalByYear.set(parsed.year, parsed);
	}
	return federalByYear;
};

const loadCantons = (): Map<string, CantonData> => {
	if (cantonByCode) return cantonByCode;
	cantonByCode = new Map();
	for (const [key, mod] of Object.entries(cantonModules)) {
		const parsed = cantonDataSchema.parse(mod.default);
		cantonByCode.set(
			cantonCodeFromPath(toPath(key)) || parsed.canton,
			parsed,
		);
	}
	return cantonByCode;
};

/** Années fédérales disponibles, croissantes. */
export const availableFederalYears = (): number[] =>
	[...loadFederal().keys()].sort((a, b) => a - b);

/** Codes cantons disponibles, triés. */
export const availableCantons = (): string[] =>
	[...loadCantons().keys()].sort();

/**
 * Résout l'année fiscale applicable : l'année demandée si elle existe, sinon la
 * plus récente année disponible qui la précède.
 */
export const getFederalData = (year: number): FederalData => {
	const table = loadFederal();
	const exact = table.get(year);
	if (exact) return exact;

	const fallback = [...table.keys()]
		.filter((available) => available < year)
		.sort((a, b) => b - a)[0];

	if (fallback === undefined) {
		throw new Error(
			`Aucune donnée fédérale disponible pour ${year} ou une année antérieure.`,
		);
	}
	return table.get(fallback) as FederalData;
};

/** Données d'un canton romand par son code (VD, GE, VS, FR, NE, JU). */
export const getCantonData = (code: string): CantonData => {
	const data = loadCantons().get(code.toUpperCase());
	if (!data) {
		throw new Error(`Aucune donnée pour le canton « ${code} ».`);
	}
	return data;
};

let municipalMultipliers: MunicipalMultipliersData | null | undefined;

/**
 * Les coefficients communaux, si le fichier a déjà été importé
 * (voir `scripts/import-estv-tax-data.ts`). `undefined` tant qu'il n'existe pas.
 */
export const getMunicipalMultipliers = (): MunicipalMultipliersData | undefined => {
	if (municipalMultipliers !== undefined) return municipalMultipliers ?? undefined;
	const [mod] = Object.values(municipalityModules);
	municipalMultipliers = mod ? municipalMultipliersDataSchema.parse(mod.default) : null;
	return municipalMultipliers ?? undefined;
};
