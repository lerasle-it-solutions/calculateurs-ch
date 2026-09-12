#!/usr/bin/env -S npx tsx
/**
 * Importe, depuis le calculateur d'impôt de l'Administration fédérale des
 * contributions (swisstaxcalculator.estv.admin.ch), pour une année donnée et
 * pour les 6 cantons romands (VD, GE, VS, FR, NE, JU) :
 *
 *   - le barème d'impôt cantonal sur le revenu       → cantons/{ct}.json  (incomeTaxScale)
 *   - le barème d'impôt cantonal sur les prestations
 *     en capital (2e/3e pilier)                      → cantons/{ct}.json  (capitalWithdrawalTax)
 *   - les déductions principales                      → cantons/{ct}.json  (mainDeductions)
 *   - les coefficients / centimes additionnels
 *     communaux                                       → municipalities/multipliers.json
 *
 * Usage :
 *   npm run import:estv-tax-data -- 2026
 *   tsx scripts/import-estv-tax-data.ts 2026
 *
 * OUTIL DE MAINTENANCE MANUELLE. Ne s'exécute jamais depuis le site en
 * production : il n'est importé par rien dans src/, ne tourne dans aucune
 * étape de build ni de déploiement, et refuse de démarrer si l'environnement
 * ressemble à un build de production (voir la garde ci-dessous).
 *
 * Forme des requêtes reprise de deux outils publics qui documentent cette
 * API non officielle :
 *   - https://github.com/gendx/fetch-ch-tax-rates (Rust — endpoints et schéma
 *     de réponse ; base de l'implémentation ci-dessous)
 *   - https://github.com/devbrains-com/swisstaxcalculator (TypeScript — mêmes
 *     endpoints, import au build)
 * L'URL de base, les 3 endpoints et le schéma de réponse ont été confirmés en
 * interrogeant l'API en direct pendant l'écriture de ce script.
 *
 * ⚠️ Licence des données : le README de gendx/fetch-ch-tax-rates signale que
 * les conditions d'utilisation par défaut de la Confédération exigent
 * l'accord écrit préalable du détenteur des droits pour la réédition de ce
 * jeu de données (pas de licence open data explicite). Avant de publier des
 * chiffres importés par ce script sur calculateurs.ch, vérifie ce point —
 * ce script ne préjuge pas de la réponse. C'est pour cette raison précise
 * qu'il ne propose et n'écrit JAMAIS la réponse brute de l'AFC nulle part :
 * il ne persiste que les valeurs qu'il a lui-même transformées, filtrées aux
 * 6 cantons romands et enveloppées dans `Value<T>` — jamais un export complet
 * ou tel-quel du jeu de données ESTV. Le site n'offre pas non plus de
 * téléchargement de cet export brut ; le seul CSV public (coefficients
 * communaux, sur `/donnees/`) ne contient que les deux champs transformés que
 * ce script écrit, pas les autres champs de la réponse d'origine.
 *
 * Chaque requête porte un User-Agent identifiant ce script et un contact
 * joignable (voir `USER_AGENT` ci-dessous) — jamais une identité de navigateur.
 *
 * Fail-closed, comme demandé :
 *   - toute réponse HTTP non 200, non JSON, ou qui ne respecte pas le schéma
 *     attendu (champ inconnu, type inattendu, formule au lieu d'une table de
 *     paliers, jeton de format inconnu) interrompt tout le script : AUCUN
 *     fichier n'est écrit, pour aucun canton ;
 *   - un canton sans fichier `cantons/{ct}.json` préexistant est ignoré (avec
 *     un message clair) plutôt que d'écrire un fichier incomplet : ce script
 *     ne couvre que 3 des 5 clés obligatoires d'un fichier canton
 *     (wealthTaxScale, realEstateGainsTax et imputedRentalValue restent hors
 *     de son périmètre) ;
 *   - une catégorie absente de la réponse pour un canton donné laisse la clé
 *     correspondante inchangée dans le fichier existant, avec un message.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

import {
	CANTON_CODES,
	cantonDataSchema,
	municipalMultipliersDataSchema,
	type CantonData,
} from "../src/data/schema";

// ---------------------------------------------------------------------------
// Garde : jamais depuis le site en production.
// ---------------------------------------------------------------------------
if (process.env.CF_PAGES || process.env.NODE_ENV === "production") {
	console.error(
		"[import-estv-tax-data] refus de s'exécuter : l'environnement ressemble à un build de production (CF_PAGES ou NODE_ENV=production). Ce script est un outil de maintenance manuelle uniquement.",
	);
	process.exit(1);
}

// ---------------------------------------------------------------------------
// Argument : l'année à importer. Jamais de valeur par défaut devinée (R3).
// ---------------------------------------------------------------------------
const yearArg = process.argv[2];
if (!yearArg || !/^\d{4}$/.test(yearArg)) {
	console.error(
		"Usage : tsx scripts/import-estv-tax-data.ts <année>  (p. ex. 2026)",
	);
	process.exit(1);
}
const YEAR = Number(yearArg);

const SOURCE_ID = "estv-swisstaxcalculator";
const TODAY_ISO = new Date().toISOString().slice(0, 10);
const EFFECTIVE_FROM = `${YEAR}-01-01`;

const scriptDir = dirname(fileURLToPath(import.meta.url));
const dataDir = join(scriptDir, "..", "src", "data");

console.log(
	"⚠️  Rappel de licence : ce jeu de données ESTV n'est pas explicitement sous\n" +
		"   licence ouverte (voir l'en-tête de ce fichier). Vérifie les conditions\n" +
		"   d'utilisation avant de publier les valeurs importées.\n",
);

// ---------------------------------------------------------------------------
// Schéma de la réponse brute de l'API ESTV (confirmé en interrogeant l'API en
// direct — voir l'en-tête). .strict() partout : un champ imprévu doit
// arrêter le script, pas être ignoré silencieusement.
// ---------------------------------------------------------------------------

const BASE_URL =
	"https://swisstaxcalculator.estv.admin.ch/delegate/ost-integration/v1/lg-proxy/operation/c3b67379_ESTV";

// Identifie ce script auprès de l'AFC, avec un contact joignable — plutôt que
// de se faire passer pour un navigateur. Mets à jour l'adresse si elle change.
const USER_AGENT = "calculateurs.ch-import-estv-tax-data/1.0 (+contact@calculateurs.ch)";

// Identifiants numériques repris de gendx/fetch-ch-tax-rates et confirmés en
// direct : leur signification exacte n'est pas documentée publiquement par
// l'AFC. 99 pour les coefficients, 88 pour les barèmes et déductions.
const RATES_TAX_GROUP_ID = 99;
const SCALES_TAX_GROUP_ID = 88;

const locationSchema = z
	.object({
		TaxLocationID: z.number(),
		ZipCode: z.string(),
		BfsID: z.number().int(),
		CantonID: z.number().int(),
		BfsName: z.string(),
		City: z.string(),
		Canton: z.string(),
	})
	.strict();

const rateRowSchema = z
	.object({
		Location: locationSchema,
		CapitalTaxRateCanton: z.number(),
		CapitalTaxRateChurch: z.number(),
		CapitalTaxRateCity: z.number(),
		FortuneRateCanton: z.number(),
		FortuneRateChrist: z.number(),
		FortuneRateCity: z.number(),
		FortuneRateProtestant: z.number(),
		FortuneRateRoman: z.number(),
		IncomeRateCanton: z.number(),
		IncomeRateChrist: z.number(),
		IncomeRateCity: z.number(),
		IncomeRateProtestant: z.number(),
		IncomeRateRoman: z.number(),
		ProfitTaxRateCanton: z.number(),
		ProfitTaxRateChurch: z.number(),
		ProfitTaxRateCity: z.number(),
	})
	.strict();
const ratesResponseSchema = z.object({ response: z.array(rateRowSchema) }).strict();

const TARGETS = ["BUND", "GEMEINDE", "KANTON", "KIRCHE"] as const;
const TAX_TYPES = [
	"EINKOMMENSSTEUER",
	"ERBSCHAFT",
	"GEWINNSTEUER",
	"KAPITALSTEUER",
	"VERMOEGENSSTEUER",
	"VORSORGESTEUER",
] as const;
const DEDUCTION_FORMAT_TOKENS = [
	"MAXIMUM",
	"MINIMUM",
	"PERCENT",
	"STANDARDIZED",
] as const;
type DeductionFormatToken = (typeof DEDUCTION_FORMAT_TOKENS)[number];

const scaleEntrySchema = z
	.object({
		Formula: z.string(),
		Taxes: z.number(),
		Percent: z.number(),
		Amount: z.number(),
	})
	.strict();

const scaleRowSchema = z
	.object({
		Location: locationSchema,
		Group: z.string(), // liste séparée par des virgules
		Splitting: z.number(),
		TableType: z.string(),
		Target: z.enum(TARGETS),
		TaxType: z.enum(TAX_TYPES),
		Table: z.array(scaleEntrySchema),
	})
	.strict();
const scalesResponseSchema = z.object({ response: z.array(scaleRowSchema) }).strict();

const deductionNameSchema = z
	.object({ ID: z.string(), DE: z.string(), EN: z.string(), FR: z.string(), IT: z.string() })
	.strict();

const deductionEntrySchema = z
	.object({
		Minimum: z.number(),
		Maximum: z.number(),
		Format: z.string(), // liste séparée par des virgules
		Percent: z.number(),
		Amount: z.number(),
		Name: deductionNameSchema,
	})
	.strict();

const deductionRowSchema = z
	.object({
		Location: locationSchema,
		Target: z.enum(TARGETS),
		TaxType: z.enum(TAX_TYPES),
		Table: z.array(deductionEntrySchema),
	})
	.strict();
const deductionsResponseSchema = z
	.object({ response: z.array(deductionRowSchema) })
	.strict();

type ScaleRow = z.infer<typeof scaleRowSchema>;
type DeductionRow = z.infer<typeof deductionRowSchema>;
type DeductionEntry = z.infer<typeof deductionEntrySchema>;

// ---------------------------------------------------------------------------
// « Il n'écrit rien s'il ne comprend pas une réponse : il journalise et
// s'arrête. » — toute erreur de ce type est une UnderstandingError.
// ---------------------------------------------------------------------------
class UnderstandingError extends Error {}

const isRomandeCanton = (
	canton: string,
): canton is (typeof CANTON_CODES)[number] =>
	(CANTON_CODES as readonly string[]).includes(canton);

async function fetchEndpoint<T>(
	operation: string,
	taxGroupId: number,
	schema: z.ZodType<T>,
	label: string,
): Promise<T> {
	const url = `${BASE_URL}/${operation}`;
	console.log(`→ ${label} : POST ${url} (TaxYear=${YEAR}, TaxGroupID=${taxGroupId})`);

	let response: Response;
	try {
		response = await fetch(url, {
			method: "POST",
			headers: {
				"content-type": "application/json",
				"user-agent": USER_AGENT,
			},
			body: JSON.stringify({ TaxYear: YEAR, TaxGroupID: taxGroupId }),
		});
	} catch (cause) {
		throw new UnderstandingError(
			`${label} : requête impossible — ${(cause as Error).message}`,
		);
	}

	if (!response.ok) {
		throw new UnderstandingError(
			`${label} : HTTP ${response.status} ${response.statusText}`,
		);
	}

	const text = await response.text();
	let raw: unknown;
	try {
		raw = JSON.parse(text);
	} catch {
		throw new UnderstandingError(
			`${label} : réponse non JSON (${text.slice(0, 200)}…)`,
		);
	}

	const result = schema.safeParse(raw);
	if (!result.success) {
		const issues = result.error.issues
			.slice(0, 5)
			.map((issue) => `${issue.path.join(".") || "(racine)"} : ${issue.message}`)
			.join(" | ");
		throw new UnderstandingError(
			`${label} : la réponse ne correspond pas au schéma attendu — ${issues}`,
		);
	}

	console.log(`  ✓ ${label} : réponse comprise (${text.length} octets)`);
	return result.data;
}

/** Un `Value<T>` prêt à écrire, sourcé sur cet import. */
function wrap<T>(value: T, note?: string) {
	return {
		value,
		sourceId: SOURCE_ID,
		verifiedOn: TODAY_ISO,
		effectiveFrom: EFFECTIVE_FROM,
		...(note ? { note } : {}),
	};
}

function toScaleTable(row: ScaleRow) {
	return {
		target: row.Target,
		group: row.Group.split(",").filter(Boolean),
		splitting: row.Splitting,
		tableType: row.TableType || undefined,
		brackets: row.Table.map((entry) => ({
			from: wrap(entry.Amount),
			rate: wrap(
				entry.Percent,
				`Impôt cumulé à ce palier selon l'export ESTV : ${entry.Taxes}.`,
			),
		})),
	};
}

function toDeduction(row: DeductionRow, entry: DeductionEntry) {
	// Les jetons de `Format` ont déjà été validés contre DEDUCTION_FORMAT_TOKENS
	// dans la passe de compréhension sémantique, avant tout appel à cette fonction.
	const format = entry.Format.split(",").filter(Boolean) as DeductionFormatToken[];
	return {
		id: entry.Name.ID,
		target: row.Target,
		minimum: wrap(entry.Minimum),
		maximum: wrap(entry.Maximum),
		percent: wrap(entry.Percent),
		amount: wrap(entry.Amount),
		format,
		name: {
			de: entry.Name.DE,
			en: entry.Name.EN,
			fr: entry.Name.FR,
			it: entry.Name.IT,
		},
	};
}

async function main() {
	let rates: z.infer<typeof ratesResponseSchema>;
	let scales: z.infer<typeof scalesResponseSchema>;
	let deductions: z.infer<typeof deductionsResponseSchema>;

	try {
		rates = await fetchEndpoint(
			"API_exportManySimpleRates",
			RATES_TAX_GROUP_ID,
			ratesResponseSchema,
			"coefficients communaux",
		);
		scales = await fetchEndpoint(
			"API_exportManyTaxScales",
			SCALES_TAX_GROUP_ID,
			scalesResponseSchema,
			"barèmes (revenu, prestations en capital)",
		);
		deductions = await fetchEndpoint(
			"API_exportManyDeductions",
			SCALES_TAX_GROUP_ID,
			deductionsResponseSchema,
			"déductions principales",
		);
	} catch (error) {
		if (error instanceof UnderstandingError) {
			console.error(`\n✗ Réponse non comprise — aucun fichier n'est écrit.\n  ${error.message}`);
			process.exit(1);
		}
		throw error;
	}

	if (
		rates.response.length === 0 ||
		scales.response.length === 0 ||
		deductions.response.length === 0
	) {
		console.error(
			"\n✗ Une réponse est vide alors qu'elle ne devrait pas l'être — aucun fichier n'est écrit.",
		);
		process.exit(1);
	}

	// ---- Passe de compréhension sémantique -----------------------------
	// Limitée à ce que le script utilise réellement : les 6 cantons romands, et
	// pour les barèmes, les deux TaxType qui nous intéressent (revenu,
	// prestations en capital). L'export ESTV couvre les 26 cantons et tous les
	// types d'impôt (dont des barèmes exprimés par formule, p. ex. l'impôt sur
	// le bénéfice de certains cantons) : une formule qu'on n'utilise de toute
	// façon pas ne doit pas bloquer l'import de ce qu'on comprend.
	const relevantTaxTypes = new Set(["EINKOMMENSSTEUER", "VORSORGESTEUER"]);
	for (const row of scales.response) {
		if (
			!isRomandeCanton(row.Location.Canton) ||
			row.Target !== "KANTON" ||
			!relevantTaxTypes.has(row.TaxType)
		) {
			continue;
		}
		const withFormula = row.Table.find((entry) => entry.Formula !== "");
		if (withFormula) {
			console.error(
				`\n✗ ${row.Location.Canton} — ${row.TaxType}/${row.Target} : palier exprimé par une formule ("${withFormula.Formula}"), non gérée par ce script — aucun fichier n'est écrit.`,
			);
			process.exit(1);
		}
	}
	for (const row of deductions.response) {
		if (!isRomandeCanton(row.Location.Canton)) continue;
		for (const entry of row.Table) {
			const tokens = entry.Format.split(",").filter(Boolean);
			const unknown = tokens.find(
				(token) => !(DEDUCTION_FORMAT_TOKENS as readonly string[]).includes(token),
			);
			if (unknown) {
				console.error(
					`\n✗ ${row.Location.Canton} — déduction « ${entry.Name.ID} » : jeton de format inconnu « ${unknown} » — aucun fichier n'est écrit.`,
				);
				process.exit(1);
			}
		}
	}

	// ---- Plan de canton, entièrement en mémoire avant toute écriture -------
	const cantonWrites: { path: string; data: CantonData }[] = [];
	const skippedCantons: string[] = [];
	const notices: string[] = [];

	for (const canton of CANTON_CODES) {
		const path = join(dataDir, "cantons", `${canton.toLowerCase()}.json`);

		if (!existsSync(path)) {
			notices.push(
				`… canton ${canton} : aucun fichier ${path.replace(`${dataDir}/`, "src/data/")} existant — ignoré. Ce script ne couvre que 3 des 5 clés obligatoires (wealthTaxScale, realEstateGainsTax et imputedRentalValue restent à créer manuellement) ; créez d'abord un fichier canton complet.`,
			);
			skippedCantons.push(canton);
			continue;
		}

		let base: unknown;
		try {
			base = JSON.parse(readFileSync(path, "utf8"));
		} catch (cause) {
			console.error(
				`\n✗ canton ${canton} : ${path} n'est pas un JSON valide — aucun fichier n'est écrit.\n  ${(cause as Error).message}`,
			);
			process.exit(1);
		}
		const parsedBase = cantonDataSchema.safeParse(base);
		if (!parsedBase.success) {
			console.error(
				`\n✗ canton ${canton} : ${path} ne respecte pas le schéma canton — aucun fichier n'est écrit.\n  ${parsedBase.error.issues.map((issue) => issue.message).join(" | ")}`,
			);
			process.exit(1);
		}

		const next: CantonData = { ...parsedBase.data, canton, year: YEAR };

		const incomeRows = scales.response.filter(
			(row) =>
				row.Location.Canton === canton &&
				row.TaxType === "EINKOMMENSSTEUER" &&
				row.Target === "KANTON",
		);
		if (incomeRows.length === 0) {
			notices.push(
				`… canton ${canton} : aucun barème cantonal du revenu (EINKOMMENSSTEUER/KANTON) dans la réponse — incomeTaxScale laissé inchangé.`,
			);
		} else {
			next.incomeTaxScale = incomeRows.map(toScaleTable);
		}

		const capitalRows = scales.response.filter(
			(row) =>
				row.Location.Canton === canton &&
				row.TaxType === "VORSORGESTEUER" &&
				row.Target === "KANTON",
		);
		if (capitalRows.length === 0) {
			notices.push(
				`… canton ${canton} : aucun barème de prestations en capital (VORSORGESTEUER/KANTON) dans la réponse pour ce TaxGroupID — capitalWithdrawalTax laissé inchangé.`,
			);
		} else {
			next.capitalWithdrawalTax = capitalRows.map(toScaleTable);
		}

		const deductionRows = deductions.response.filter(
			(row) => row.Location.Canton === canton,
		);
		if (deductionRows.length === 0) {
			notices.push(
				`… canton ${canton} : aucune déduction dans la réponse — mainDeductions laissé inchangé.`,
			);
		} else {
			next.mainDeductions = deductionRows.flatMap((row) =>
				row.Table.map((entry) => toDeduction(row, entry)),
			);
		}

		const validated = cantonDataSchema.safeParse(next);
		if (!validated.success) {
			console.error(
				`\n✗ canton ${canton} : le résultat fusionné ne respecte pas le schéma canton — aucun fichier n'est écrit.\n  ${validated.error.issues.map((issue) => issue.message).join(" | ")}`,
			);
			process.exit(1);
		}
		cantonWrites.push({ path, data: validated.data });
	}

	// ---- Coefficients communaux, pour les communes des 6 cantons romands ---
	const multiplierEntries = rates.response
		.filter((row) => isRomandeCanton(row.Location.Canton))
		.map((row) => ({
			bfsId: row.Location.BfsID,
			municipality: row.Location.City,
			canton: row.Location.Canton,
			cantonalMultiplier: wrap(
				row.IncomeRateCanton,
				"Index ESTV tel que reçu — unité (points d'indice, centimes additionnels…) à confirmer auprès du droit fiscal cantonal avant usage.",
			),
			municipalMultiplier: wrap(
				row.IncomeRateCity,
				"Index ESTV tel que reçu — unité (points d'indice, centimes additionnels…) à confirmer auprès du droit fiscal cantonal avant usage.",
			),
		}));

	if (multiplierEntries.length === 0) {
		console.error(
			"\n✗ aucun coefficient communal trouvé pour les 6 cantons romands — aucun fichier n'est écrit.",
		);
		process.exit(1);
	}

	const multipliersResult = municipalMultipliersDataSchema.safeParse({
		year: YEAR,
		multipliers: multiplierEntries,
	});
	if (!multipliersResult.success) {
		console.error(
			`\n✗ coefficients communaux : résultat non conforme au schéma — aucun fichier n'est écrit.\n  ${multipliersResult.error.issues.map((issue) => issue.message).join(" | ")}`,
		);
		process.exit(1);
	}

	// ---- Écriture — seulement maintenant que tout, pour tous les cantons,
	// a été compris et validé. --------------------------------------------
	for (const { path, data } of cantonWrites) {
		writeFileSync(path, `${JSON.stringify(data, null, "\t")}\n`);
		console.log(`✓ écrit ${path}`);
	}

	const multipliersPath = join(dataDir, "municipalities", "multipliers.json");
	mkdirSync(dirname(multipliersPath), { recursive: true });
	writeFileSync(
		multipliersPath,
		`${JSON.stringify(multipliersResult.data, null, "\t")}\n`,
	);
	console.log(`✓ écrit ${multipliersPath}`);

	for (const notice of notices) console.log(notice);
	if (skippedCantons.length > 0) {
		console.log(
			`\nCantons non écrits, fichier de base absent : ${skippedCantons.join(", ")}.`,
		);
	}

	console.log(
		"\nRappel : sourceId, verifiedOn et effectiveFrom ont été posés automatiquement.\n" +
			"Relis les notes ajoutées sur les coefficients communaux avant de les exposer dans un calculateur.",
	);
}

main().catch((error) => {
	console.error("\n✗ Erreur inattendue — aucun fichier n'est garanti écrit correctement.");
	console.error(error);
	process.exit(1);
});
