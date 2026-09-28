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
		url: z.string().url().or(z.literal("")), // vide : pas encore relevée (R3)
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
 * - `averageRate` : le taux de la tranche s'applique au revenu entier, sans
 *   montant de base ;
 * - `interpolated` : le taux s'obtient par interpolation linéaire entre les
 *   seuils, puis s'applique au revenu entier, sans montant de base (barème
 *   continu, p. ex. Fribourg).
 */
export const SCALE_TYPES = ["marginal", "averageRate", "interpolated"] as const;

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
		if (table.scaleType !== "marginal" && !allBasesZero) {
			context.addIssue({
				code: z.ZodIssueCode.custom,
				message: `barème ${table.scaleType} avec un montant de base non nul`,
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

/**
 * Situations qui déterminent le barème de l'impôt fédéral direct (art. 36 LIFD) :
 * - `marriedCoupleLivingTogether` : époux vivant en ménage commun (al. 2) ;
 * - `livingWithSupportedDependants` : veufs, séparés, divorcés ou célibataires
 *   vivant en ménage commun avec des enfants ou des personnes nécessiteuses dont
 *   ils assument pour l'essentiel l'entretien (al. 2bis) ;
 * - `otherTaxpayer` : tout autre contribuable (al. 1).
 */
export const FEDERAL_TAX_SITUATIONS = [
	"marriedCoupleLivingTogether",
	"livingWithSupportedDependants",
	"otherTaxpayer",
] as const;

/**
 * Une table de l'art. 36 LIFD, telle que publiée par l'ordonnance sur la
 * progression à froid : impôt dû au seuil, puis montant ajouté par tranche
 * complète de `incrementStep` francs. `ratePercent` vaut `null` là où la table
 * publie « - ». Les deux dernières lignes encodent le taux maximal.
 */
const federalIncomeTaxScaleSchema = valueSchema(
	z
		.object({
			label: z.string().min(1), // intitulé du relevé, en français
			appliesTo: z.array(z.enum(FEDERAL_TAX_SITUATIONS)).min(1),
			scaleType: z.literal("marginal"),
			thresholdLabel: z.string().min(1),
			incrementStep: z.number().positive(),
			brackets: z
				.array(
					z
						.object({
							threshold: z.number(),
							baseAmount: z.number(),
							ratePercent: z.number().nullable(),
						})
						.strict(),
				)
				.min(2),
		})
		.strict(),
);

/**
 * Impôt fédéral direct (art. 36 LIFD). Tant qu'une valeur n'est pas relevée,
 * elle reste un `TODO` (R3).
 */
const directFederalTaxSchema = z
	.object({
		incomeTaxScales: z.union([z.array(federalIncomeTaxScaleSchema).min(1), todoSchema]),
		maximumRatePercent: z.union([valueSchema(z.number().positive()), todoSchema]),
		taxReductionPerDependant: z.union([valueSchema(z.number().nonnegative()), todoSchema]),
		minimumLeviedTax: z.union([valueSchema(z.number().nonnegative()), todoSchema]),
		taxRoundingToNearest: z.union([valueSchema(z.number().positive()), todoSchema]),
	})
	.strict();

export const federalDataSchema = z
	.object({
		year: z.number().int(),
		// Facultatif jusqu'au relevé des plafonds 3a (semaine 6).
		pillar3a: pillar3aSchema.optional(),
		directFederalTax: directFederalTaxSchema,
	})
	.passthrough();
export type FederalData = z.infer<typeof federalDataSchema>;

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
					coupleReduction: z
						.union([
							valueSchema(
								z
									.object({ reductionPercent: z.number().positive(), maximumAmount: z.number().positive() })
									.strict(),
							),
							todoSchema,
						])
						.optional(),
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
 * Réduction de l'impôt cantonal de base (Vaud, Genève). Elle ne touche que la
 * part cantonale : l'impôt communal se calcule sur l'impôt de base non réduit.
 */
const baseTaxReductionSchema = z
	.object({
		ratePercent: z.number().positive(),
		appliesTo: z.array(z.enum(["income", "wealth"])).min(1),
	})
	.strict();

/** Situations de ménage que distingue le moteur (`TaxInput`, sans concubinage). */
export const HOUSEHOLDS = ["single", "singleWithChildren", "married"] as const;

/**
 * Où s'applique le diviseur familial. Le type est déclaré par le mainteneur
 * dans le lecteur d'exports, jamais déduit ; ses paramètres sont des valeurs
 * sourcées, ou des `TODO` tant qu'ils ne sont pas relevés.
 * - `splittingIncludedInScale` : la table des ménages concernés intègre déjà le
 *   splitting (Fribourg) — le diviseur de l'export ne s'applique pas ;
 * - `separateScale` : une table distincte par situation (Jura) ;
 * - `divisorOnIncomeAndWealth` : le diviseur de chaque table s'applique au
 *   revenu et à la fortune des ménages listés (Neuchâtel) ;
 * - `familyQuotient` : diviseur du revenu variable selon la composition du
 *   ménage (Vaud) ;
 * - `taxReduction` : pas de diviseur, un abattement sur l'impôt des ménages
 *   listés et une déduction dégressive sur le revenu des autres (Valais).
 */
const familyQuotientCoefficientsSchema = z
	.object({
		single: z.number().positive(),
		singleWithChildren: z.number().positive(),
		married: z.number().positive(),
		perChild: z.number().nonnegative(),
	})
	.strict();

/**
 * La réduction obtenue par les parts d'enfants ne peut excéder celle obtenue
 * pour un enfant à `referenceTaxableIncome` francs de revenu imposable, montant
 * augmenté de `increasePerAdditionalChild` francs par enfant supplémentaire.
 */
const childReductionCapSchema = z
	.object({
		referenceTaxableIncome: z.number().positive(),
		increasePerAdditionalChild: z.number().nonnegative(),
	})
	.strict();

/**
 * Abattement sur l'impôt (Valais, art. 178 al. 3 let. a LF) : pourcentage de
 * l'impôt, borné par un minimum et un maximum ; bornes propres en cas d'autorité
 * parentale commune avec déduction sociale partagée par moitié.
 */
const taxReductionSchema = z
	.object({
		ratePercent: z.number().positive(),
		minimumAmount: z.number().nonnegative(),
		maximumAmount: z.number().positive(),
		sharedParentalAuthority: z
			.object({ minimumAmount: z.number().nonnegative(), maximumAmount: z.number().positive() })
			.strict(),
	})
	.strict();

/**
 * Déduction sur le revenu net imposable pour les contribuables sans abattement
 * (Valais, art. 178 al. 3 let. b LF) : `amount`, réduite de `reductionPerStep`
 * par tranche de `stepWidth` au-delà de `phaseOutFrom`, nulle dès `zeroFrom`.
 */
const phasedOutDeductionSchema = z
	.object({
		amount: z.number().positive(),
		phaseOutFrom: z.number().nonnegative(),
		reductionPerStep: z.number().positive(),
		stepWidth: z.number().positive(),
		zeroFrom: z.number().positive(),
	})
	.strict();

const familyModelSchema = z.discriminatedUnion("type", [
	z.object({ type: z.literal("splittingIncludedInScale"), sourceId: z.string().min(1) }).strict(),
	z.object({ type: z.literal("separateScale"), sourceId: z.string().min(1) }).strict(),
	z
		.object({
			type: z.literal("divisorOnIncomeAndWealth"),
			sourceId: z.string().min(1),
			households: z.union([valueSchema(z.array(z.enum(HOUSEHOLDS)).min(1)), todoSchema]),
		})
		.strict(),
	z
		.object({
			type: z.literal("familyQuotient"),
			sourceId: z.string().min(1),
			coefficients: z.union([valueSchema(familyQuotientCoefficientsSchema), todoSchema]),
			// Plafond de la réduction obtenue par les parts d'enfants (Vaud, art. 43 al. 3 LI)
			childReductionCap: z.union([valueSchema(childReductionCapSchema), todoSchema]).optional(),
		})
		.strict(),
	z
		.object({
			type: z.literal("taxReduction"),
			sourceId: z.string().min(1),
			households: z.union([valueSchema(z.array(z.enum(HOUSEHOLDS)).min(1)), todoSchema]),
			reduction: z.union([valueSchema(taxReductionSchema), todoSchema]),
			deductionWithoutReduction: z.union([valueSchema(phasedOutDeductionSchema), todoSchema]),
		})
		.strict(),
]);
export type FamilyModel = z.infer<typeof familyModelSchema>;
export const FAMILY_MODEL_TYPES = [
	"splittingIncludedInScale",
	"separateScale",
	"divisorOnIncomeAndWealth",
	"familyQuotient",
	"taxReduction",
] as const;

/**
 * Indexation du barème du revenu par déflation par étapes (Valais) : le barème
 * écrit est la base à 100 % ; le revenu déterminant pour le taux y est ramené en
 * divisant par 1 + `deflationStepPercent` % à chaque pas, puis par 1 + reste %.
 * `cantonalIndexPercent` vaut pour le canton ; l'indexation communale est une
 * donnée par commune (`communalScaleIndexation` dans
 * municipalities/multipliers.json), avec le même pas.
 */
const incomeScaleIndexationSchema = z
	.object({
		cantonalIndexPercent: z.number().min(100),
		deflationStepPercent: z.number().positive(),
	})
	.strict();

/**
 * Couverture partielle déclarée : le moteur ne reproduit pas le calculateur
 * officiel du canton. Il refuse alors le calcul plutôt que de rendre un
 * résultat faux, et le périmètre des calculateurs l'annonce avec un lien vers
 * le calculateur officiel du canton. Ce n'est pas une valeur sourcée : c'est
 * une décision du mainteneur, datée.
 */
export const cantonCoverageSchema = z
	.object({
		status: z.literal("partial"),
		// Ménages non couverts ; absent : le canton entier
		notCoveredHouseholds: z.array(z.enum(["single", "singleWithChildren", "married"])).min(1).optional(),
		note: z.string().min(1),
		declaredOn: isoDateSchema,
		officialCalculator: z.union([
			z.object({ label: z.string().min(1), url: z.string().url() }).strict(),
			todoSchema,
		]),
	})
	.strict();
export type CantonCoverage = z.infer<typeof cantonCoverageSchema>;

/**
 * Pas d'arrondi vers le bas de chaque assiette, en francs ; 1 = aucun arrondi.
 * Revenu et fortune se relèvent séparément : une loi peut énoncer l'un sans
 * l'autre.
 */
const taxBaseRoundingSchema = z
	.object({
		income: z.union([valueSchema(z.number().positive()), todoSchema]),
		wealth: z.union([valueSchema(z.number().positive()), todoSchema]),
		// Revenu déterminant pour le taux, après division (quotient familial) : Vaud, art. 46 al. 1 LI
		rateDeterminingIncome: valueSchema(z.number().positive()).optional(),
	})
	.strict();

/**
 * Charge fiscale maximale (Genève, art. 60 al. 1 LIPP) : impôts cantonaux et
 * communaux sur le revenu et la fortune plafonnés à un pourcentage du revenu
 * net imposable, le rendement net de la fortune étant compté au moins à un
 * pourcentage de la fortune nette.
 */
const maximumTaxBurdenSchema = z
	.object({
		percentOfNetTaxableIncome: z.number().positive(),
		minimumWealthYieldPercent: z.number().nonnegative(),
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
	"unreducedCantonalMultiplier", // part du coefficient cantonal hors réduction (Genève), null ailleurs
	"familyModel", // où s'applique le diviseur familial
	"taxBaseRounding", // arrondi des revenu et fortune imposables
	"incomeScaleIndexation", // application indexée du barème du revenu (Valais), null ailleurs
	"supplementaryWealthTax", // impôt supplémentaire sur la fortune (Genève), null ailleurs
	"taxCreditPerChild", // rabais d'impôt par enfant (Neuchâtel), null ailleurs
	"personalTax", // taxe personnelle forfaitaire, null si aucune
	"maximumTaxBurden", // charge fiscale maximale (Genève), null ailleurs
	"incomeTaxRounding", // arrondi de l'impôt sur le revenu (Valais), null ailleurs
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
		baseTaxReduction: z.union([valueSchema(baseTaxReductionSchema), todoSchema]).nullable(),
		unreducedCantonalMultiplier: z
			.union([valueSchema(z.object({ income: z.number(), wealth: z.number() }).strict()), todoSchema])
			.nullable(),
		familyModel: z.union([familyModelSchema, todoSchema]),
		taxBaseRounding: taxBaseRoundingSchema,
		incomeScaleIndexation: z.union([valueSchema(incomeScaleIndexationSchema), todoSchema]).nullable(),
		// Genève (art. 59 al. 2 LIPP) : barème distinct, sans centimes additionnels ni diminution
		supplementaryWealthTax: z.union([valueSchema(taxScaleTableSchema), todoSchema]).nullable(),
		taxCreditPerChild: z.union([valueSchema(z.number().nonnegative()), todoSchema]).nullable(),
		personalTax: z.union([valueSchema(z.number().nonnegative()), todoSchema]).nullable(),
		maximumTaxBurden: valueSchema(maximumTaxBurdenSchema).nullable(),
		// Pas de l'arrondi au plus proche de l'impôt sur le revenu selon le barème (Valais)
		incomeTaxRounding: valueSchema(z.number().positive()).nullable(),
		// Valais (art. 178 LF) : revenu et fortune ; la fortune reste TODO tant que l'export ne la livre pas
		communalScale: z
			.object({
				income: taxScaleSchema,
				// barème propre, TODO, ou renvoi au barème cantonal de la fortune (Valais, art. 179 LF)
				wealth: z.union([taxScaleSchema, todoSchema, valueSchema(z.literal("cantonalWealthTaxScale"))]),
			})
			.strict()
			.nullable(),
		deductions: valueSchema(z.array(deductionSchema).min(1)),
		otherDeductions: valueSchema(z.array(degressiveDeductionSchema).min(1)).optional(),
		realEstateGainsTax: todoSchema,
		imputedRentalValue: todoSchema,
		coverage: cantonCoverageSchema.optional(), // absente : aucune restriction déclarée
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
		// Indexation du barème communal propre (Valais, art. 178 LF), en % ; relevée à la main
		communalScaleIndexation: valueSchema(z.number().positive()).optional(),
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
