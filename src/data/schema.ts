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
	sourceId: string; // acte officiel, présent dans le registre
	verifiedOn: string; // ISO 8601 — date de vérification humaine
	effectiveFrom: string; // ISO 8601
	collectedFrom?: string; // outil de collecte, distinct de la source
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
			collectedFrom: z.string().min(1).optional(),
			note: z.string().min(1).optional(),
		})
		.strict();

// ---------------------------------------------------------------------------
// Registre des sources (docs/plan/sources.md § 2.7)
// ---------------------------------------------------------------------------

/**
 * Une source du registre, telle que définie au § 2.7 du plan. Seul ajout :
 * `note`, qui porte les « particularités à coder » du relevé.
 */
export type Source = {
	id: string; // kebab-case anglais, stable, jamais renommé
	name: string; // nom officiel, en français
	authority: string; // autorité émettrice
	url: string; // page ou acte, pas un article de presse
	legalReference?: string; // « RS 831.461.3, art. 7a » — obligatoire pour un acte légal
	cadence: "annual" | "biennial" | "quarterly" | "monthly" | "irregular" | "event";
	verifiedOn: string; // ISO 8601 — date de la dernière consultation
	dataClass: "public" | "compiled";
	requiresAttribution: boolean;
	attributionText?: string; // obligatoire si requiresAttribution
	nature: "official" | "self-regulation" | "industry" | "association" | "reference-tool";
	usedBy: string[]; // identifiants de calculateurs, 'tax-engine', 'tests'
	collectedFrom?: string; // outil de collecte distinct de la source, ex. module de l'AFC
	note?: string;
};

export type SourceCadence = Source["cadence"];

export const sourceSchema: z.ZodType<Source> = z
	.object({
		id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "identifiant kebab-case attendu"),
		name: z.string().min(1),
		authority: z.string().min(1),
		url: z.string().url(),
		legalReference: z.string().min(1).optional(),
		cadence: z.enum(["annual", "biennial", "quarterly", "monthly", "irregular", "event"]),
		verifiedOn: isoDateSchema.or(z.literal("")), // vide : pas encore vérifiée à la source (R3)
		dataClass: z.enum(["public", "compiled"]),
		requiresAttribution: z.boolean(),
		attributionText: z.string().min(1).optional(),
		nature: z.enum(["official", "self-regulation", "industry", "association", "reference-tool"]),
		usedBy: z.array(z.string().min(1)),
		collectedFrom: z.string().min(1).optional(),
		note: z.string().min(1).optional(),
	})
	.strict()
	.superRefine((source, context) => {
		if (source.requiresAttribution && !source.attributionText) {
			context.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["attributionText"],
				message: "attributionText obligatoire quand requiresAttribution vaut true",
			});
		}
	});

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


/**
 * Valeur à relever (R3) : pas un `Value<T>`, donc jamais lue comme une donnée
 * ni comptée dans la fraîcheur. `sourceId` vaut `null` tant que la source
 * n'est pas inscrite au registre.
 */
export const todoSchema = z
	.object({
		todo: z.string().min(1),
		sourceId: z.string().min(1).nullable(),
	})
	.strict();
export type Todo = z.infer<typeof todoSchema>;

/**
 * Une table de barème lue dans les exports du module « Rechercher des données
 * de base » de l'AFC, pour un sujet fiscal, sous une forme unique quel que soit
 * le format de l'export. `scaleType` appartient à la table, jamais au canton —
 * un même canton peut combiner les deux familles (Fribourg : revenu à taux moyen,
 * fortune marginale). Il est déclaré table par table, jamais deviné :
 * - `marginal` : l'impôt vaut base + (assiette − seuil) × taux ;
 * - `averageRate` : le taux s'applique au revenu entier, sans montant de base.
 */
export const SCALE_TYPES = ["marginal", "averageRate"] as const;

const taxScaleTableSchema = z
	.object({
		scaleType: z.enum(SCALE_TYPES),
		thresholdLabel: z.string().min(1),
		rateSplittingDivisor: z.number().positive().nullable(),
		brackets: z
			.array(
				z
					.object({
						threshold: z.number(),
						ratePercent: z.number(),
						baseAmount: z.number(),
					})
					.strict(),
			)
			.min(1),
	})
	.strict()
	.superRefine((table, context) => {
		const allBasesZero = table.brackets.every((bracket) => bracket.baseAmount === 0);
		if (table.scaleType === "marginal" && allBasesZero) {
			context.addIssue({
				code: z.ZodIssueCode.custom,
				message: "barème marginal dont tous les montants de base valent 0",
			});
		}
		if (table.scaleType === "averageRate" && !allBasesZero) {
			context.addIssue({
				code: z.ZodIssueCode.custom,
				message: "barème à taux moyen avec un montant de base non nul",
			});
		}
	});

const taxScaleSchema = z
	.array(
		z
			.object({
				taxpayerGroup: z.string().min(1), // « Sujet fiscal » de l'export, en français
				table: valueSchema(taxScaleTableSchema),
			})
			.strict(),
	)
	.min(1);

/**
 * Règles de dérivation des prestations en capital, écrites à la main dans
 * src/data/cantons/capital-withdrawal-derivation.json : pour les cantons dont la
 * loi dérive ce barème de celui du revenu.
 */
export const CAPITAL_WITHDRAWAL_DERIVATION_FILE = "cantons/capital-withdrawal-derivation.json";

export const capitalWithdrawalDerivationFileSchema = z
	.object({
		$comment: z.string().optional(),
		cantons: z.record(
			z.enum(CANTON_CODES),
			z
				.object({
					derivedFrom: z.literal("incomeTaxScale"),
					factor: valueSchema(z.number()).optional(),
					minimumRatePercent: valueSchema(z.number()).optional(),
					maximumRatePercent: valueSchema(z.number()).optional(),
					coupleReduction: todoSchema.optional(),
				})
				.strict(),
		),
	})
	.strict();
export type CapitalWithdrawalDerivationFile = z.infer<typeof capitalWithdrawalDerivationFileSchema>;

/** Dans le fichier cantonal : renvoi au fichier des règles, pour les cantons sans barème exporté. */
const capitalWithdrawalReferenceSchema = z
	.object({ definedIn: z.literal(CAPITAL_WITHDRAWAL_DERIVATION_FILE) })
	.strict();

const deductionSchema = z
	.object({
		taxType: z.string().min(1),
		name: z.string().min(1), // libellé officiel, en français
		amount: z.number(),
		percent: z.number(),
		minimum: z.number(),
		maximum: z.number(),
	})
	.strict();

/** Déduction dégressive : montant par seuil de revenu net ou de fortune nette, seuils croissants. */
const degressiveDeductionSchema = z
	.object({
		taxType: z.string().min(1),
		name: z.string().min(1),
		authority: z.string().min(1),
		thresholdLabel: z.string().min(1),
		steps: z.array(z.object({ threshold: z.number(), amount: z.number() }).strict()).min(1),
	})
	.strict();

/**
 * Clés obligatoires d'un fichier canton. Les 6 cantons romands doivent porter
 * exactement le même jeu de clés — vérifié par `tests/data/coverage.test.ts`.
 * `otherDeductions` est facultative : Vaud n'a pas d'export « Autres déductions ».
 */
export const REQUIRED_CANTON_KEYS = [
	"canton",
	"year",
	"incomeTaxScale", // barème revenu
	"wealthTaxScale", // barème fortune
	"capitalWithdrawalTax", // prestation en capital
	"cantonalMultiplier", // coefficient cantonal ; 100 % s'il est neutre
	"baseTaxReduction", // réduction de l'impôt de base, null si aucune
	"communalScale", // barème communal propre (Valais), null ailleurs
	"deductions", // déductions
	"realEstateGainsTax", // gains immobiliers
	"imputedRentalValue", // valeur locative
] as const;

export const cantonDataSchema = z
	.object({
		canton: z.enum(CANTON_CODES),
		year: z.number().int(),
		incomeTaxScale: taxScaleSchema,
		wealthTaxScale: taxScaleSchema,
		capitalWithdrawalTax: z.union([taxScaleSchema, capitalWithdrawalReferenceSchema]),
		cantonalMultiplier: z
			.object({ income: valueSchema(z.number()), wealth: valueSchema(z.number()) })
			.strict(),
		baseTaxReduction: todoSchema.nullable(),
		// Valais (art. 178 LF) : revenu et fortune ; la fortune reste TODO tant que l'export ne la livre pas
		communalScale: z
			.object({ income: taxScaleSchema, wealth: z.union([taxScaleSchema, todoSchema]) })
			.strict()
			.nullable(),
		deductions: valueSchema(z.array(deductionSchema).min(1)),
		otherDeductions: valueSchema(z.array(degressiveDeductionSchema).min(1)).optional(),
		realEstateGainsTax: todoSchema,
		imputedRentalValue: todoSchema,
	})
	.strict();
export type CantonData = z.infer<typeof cantonDataSchema>;

// ---------------------------------------------------------------------------
// Coefficients communaux — src/data/municipalities/multipliers.json
// ---------------------------------------------------------------------------

/** Coefficients paroissiaux, clés alignées sur `denomination` du moteur. */
const churchMultipliersSchema = z
	.object({
		protestant: valueSchema(z.number()),
		catholic: valueSchema(z.number()),
		christianCatholic: valueSchema(z.number()),
	})
	.strict();

const multipliersByTaxSchema = z
	.object({
		municipal: valueSchema(z.number()), // coefficient communal, en %
		church: churchMultipliersSchema,
	})
	.strict();

/** Une commune, clé `bfsId` (numéro OFS). Le coefficient cantonal vit dans le fichier du canton. */
const municipalMultiplierEntrySchema = z
	.object({
		bfsId: z.number().int(),
		municipality: z.string().min(1), // nom officiel de la commune
		canton: z.enum(CANTON_CODES),
		income: multipliersByTaxSchema,
		wealth: multipliersByTaxSchema,
	})
	.strict();

export const municipalMultipliersDataSchema = z
	.object({
		year: z.number().int(),
		multipliers: z.array(municipalMultiplierEntrySchema),
	})
	.strict();
export type MunicipalMultipliersData = z.infer<
	typeof municipalMultipliersDataSchema
>;
