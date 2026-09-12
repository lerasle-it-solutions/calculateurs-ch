/**
 * Couche de données — types et validation (CLAUDE.md § 1).
 *
 * La donnée est le produit (P1). Aucune valeur brute n'entre dans le dépôt sans
 * source (`sourceId`) ni date de vérification humaine (`verifiedOn`) : tout
 * chiffre est enveloppé dans `Value<T>`. Ce fichier ne contient que des types
 * et des schémas zod — aucune donnée.
 */
import { z } from "zod";

/**
 * Âge maximal d'une valeur avant re-vérification obligatoire (CLAUDE.md P2,
 * décision 6). Au-delà, `tests/data/freshness.test.ts` échoue le build.
 */
export const DATA_FRESHNESS_LIMIT_MONTHS = 12;

/** Date ISO 8601, forme AAAA-MM-JJ. */
export const isoDateSchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, "date ISO 8601 attendue (AAAA-MM-JJ)");

/**
 * Le type central (CLAUDE.md § 1.1 et « Le type central »).
 * `note` : nuance ou réserve documentée, mentionnée au § 1.1.
 */
export type Value<T> = {
	value: T;
	unit?: string;
	sourceId: string; // clé dans sources.ts
	verifiedOn: string; // ISO 8601 — date de vérification humaine
	effectiveFrom: string; // ISO 8601
	note?: string;
};

/** Schéma d'un `Value<T>`, paramétré par le schéma de la valeur enveloppée. */
export const valueSchema = <T extends z.ZodTypeAny>(inner: T) =>
	z
		.object({
			value: inner,
			unit: z.string().min(1).optional(),
			sourceId: z.string().min(1),
			verifiedOn: isoDateSchema,
			effectiveFrom: isoDateSchema,
			note: z.string().min(1).optional(),
		})
		.strict();

// ---------------------------------------------------------------------------
// Registre des sources (CLAUDE.md § 1.2)
// ---------------------------------------------------------------------------

export const sourceCadenceSchema = z.enum([
	"annual",
	"quarterly",
	"monthly",
	"irregular",
]);
export type SourceCadence = z.infer<typeof sourceCadenceSchema>;

export const sourceEntrySchema = z
	.object({
		name: z.string().min(1), // FRANÇAIS — nom propre (voir § Convention de nommage)
		url: z.string().url(),
		authority: z.string().min(1), // FRANÇAIS — nom propre
		cadence: sourceCadenceSchema,
	})
	.strict();
export type SourceEntry = z.infer<typeof sourceEntrySchema>;

// ---------------------------------------------------------------------------
// Fichiers fédéraux — src/data/federal/AAAA.json (CLAUDE.md § 1.1)
// ---------------------------------------------------------------------------

const pillar3aSchema = z
	.object({
		employeeCapWithLpp: valueSchema(z.number()),
		retroactiveBuyback: z
			.object({
				firstBuybackableGap: valueSchema(z.number()),
				windowYears: valueSchema(z.number()),
			})
			.passthrough(),
	})
	.passthrough();

export const federalDataSchema = z
	.object({
		year: z.number().int(),
		pillar3a: pillar3aSchema,
	})
	.passthrough();
export type FederalData = z.infer<typeof federalDataSchema>;

// ---------------------------------------------------------------------------
// Fichiers cantonaux — src/data/cantons/xx.json (CLAUDE.md § 1, structure)
// ---------------------------------------------------------------------------

/**
 * Codes des 6 cantons romands — abréviations officielles (exception R5).
 * Dupliqué délibérément avec `calculators/cantons.ts` (qui porte en plus les
 * noms affichés) : `src/data/` ne dépend jamais de `src/calculators/` (§ 10).
 */
export const CANTON_CODES = ["VD", "GE", "VS", "FR", "NE", "JU"] as const;

/** Palier d'un barème : seuil et taux marginal, tous deux sourcés. */
const taxBracketSchema = z
	.object({
		from: valueSchema(z.number()), // seuil inférieur du palier
		rate: valueSchema(z.number()), // taux marginal applicable au palier
	})
	.passthrough();

/**
 * Un barème n'est jamais une liste plate de paliers : il varie selon le statut
 * (seul·e, marié·e, avec enfants…) et le niveau (canton, commune, église).
 * Une table par combinaison statut × niveau — forme confirmée à la lecture des
 * exports réels de swisstaxcalculator.estv.admin.ch (voir
 * scripts/import-estv-tax-data.ts).
 */
const taxScaleTableSchema = z
	.object({
		target: z.enum(["BUND", "KANTON", "GEMEINDE", "KIRCHE"]),
		/** Statuts concernés, p. ex. ["VERHEIRATET"] ou ["LEDIG_ALLEINE", "LEDIG_MIT_KINDER"]. */
		group: z.array(z.string().min(1)).min(1),
		splitting: z.number(),
		brackets: z.array(taxBracketSchema).min(1),
		/** Convention de calcul ESTV d'origine (BUND, FREIBURG, ZUERICH…) — traçabilité. */
		tableType: z.string().optional(),
	})
	.passthrough();

const taxScaleSchema = z.array(taxScaleTableSchema);

/** Une déduction principale, avec son libellé officiel multilingue. */
const deductionEntrySchema = z
	.object({
		id: z.string().min(1),
		target: z.enum(["BUND", "KANTON", "GEMEINDE", "KIRCHE"]),
		minimum: valueSchema(z.number()),
		maximum: valueSchema(z.number()),
		percent: valueSchema(z.number()),
		amount: valueSchema(z.number()),
		format: z.array(z.enum(["MAXIMUM", "MINIMUM", "PERCENT", "STANDARDIZED"])),
		name: z
			.object({
				de: z.string(),
				en: z.string(),
				fr: z.string(), // FRANÇAIS — libellé officiel
				it: z.string(),
			})
			.strict(),
	})
	.passthrough();

/**
 * Clés obligatoires d'un fichier canton. Les 6 cantons romands doivent porter
 * exactement le même jeu de clés — vérifié par `tests/data/coverage.test.ts`.
 * `mainDeductions` est un complément optionnel (pas une clé obligatoire) :
 * alimenté par `scripts/import-estv-tax-data.ts`, absent tant qu'il n'a pas
 * encore été importé.
 */
export const REQUIRED_CANTON_KEYS = [
	"canton",
	"year",
	"incomeTaxScale", // barème revenu
	"wealthTaxScale", // barème fortune
	"realEstateGainsTax", // gains immobiliers
	"capitalWithdrawalTax", // prestation en capital
	"imputedRentalValue", // valeur locative
] as const;

export const cantonDataSchema = z
	.object({
		canton: z.enum(CANTON_CODES),
		year: z.number().int(),
		incomeTaxScale: taxScaleSchema,
		wealthTaxScale: taxScaleSchema,
		realEstateGainsTax: z.record(z.unknown()),
		capitalWithdrawalTax: taxScaleSchema,
		imputedRentalValue: z.record(z.unknown()),
		mainDeductions: z.array(deductionEntrySchema).optional(),
	})
	.passthrough();
export type CantonData = z.infer<typeof cantonDataSchema>;

// ---------------------------------------------------------------------------
// Coefficients communaux — src/data/municipalities/multipliers.json
// ---------------------------------------------------------------------------

const municipalMultiplierEntrySchema = z
	.object({
		bfsId: z.number().int(),
		municipality: z.string().min(1), // nom officiel de la commune
		canton: z.enum(CANTON_CODES),
		cantonalMultiplier: valueSchema(z.number()),
		municipalMultiplier: valueSchema(z.number()), // coefficient communal
	})
	.passthrough();

export const municipalMultipliersDataSchema = z
	.object({
		year: z.number().int(),
		multipliers: z.array(municipalMultiplierEntrySchema),
	})
	.passthrough();
export type MunicipalMultipliersData = z.infer<
	typeof municipalMultipliersDataSchema
>;
