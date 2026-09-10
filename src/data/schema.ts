/**
 * Couche de données — types et validation (CLAUDE.md § 1).
 *
 * La donnée est le produit (P1). Aucune valeur brute n'entre dans le dépôt sans
 * source (`sourceId`) ni date de vérification humaine (`verifiedOn`) : tout
 * chiffre est enveloppé dans `Value<T>`. Ce fichier ne contient que des types
 * et des schémas zod — aucune donnée.
 */
import { z } from "zod";

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

const taxBracketSchema = z
	.object({
		from: valueSchema(z.number()),
		rate: valueSchema(z.number()),
	})
	.passthrough();

const taxScaleSchema = z.array(taxBracketSchema);

/**
 * Clés obligatoires d'un fichier canton. Les 6 cantons romands doivent porter
 * exactement le même jeu de clés — vérifié par `tests/data/coverage.test.ts`.
 * Codes cantons : abréviations officielles (exception R5).
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
		canton: z.enum(["VD", "GE", "VS", "FR", "NE", "JU"]),
		year: z.number().int(),
		incomeTaxScale: taxScaleSchema,
		wealthTaxScale: taxScaleSchema,
		realEstateGainsTax: z.record(z.unknown()),
		capitalWithdrawalTax: z.record(z.unknown()),
		imputedRentalValue: z.record(z.unknown()),
	})
	.passthrough();
export type CantonData = z.infer<typeof cantonDataSchema>;
