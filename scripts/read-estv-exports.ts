#!/usr/bin/env -S npx tsx
/**
 * Lit les exports xlsx du module « Rechercher des données de base » de l'AFC,
 * téléchargés à la main dans imports/estv/{année}/{ct}/, et produit
 * src/data/cantons/{ct}.json et src/data/municipalities/multipliers.json.
 *
 * Usage : npm run read:estv-exports -- 2026
 *
 * Aucun accès réseau : l'AFC réserve le simulateur à son interface web. Matrice
 * des exports et marche à suivre : scripts/README.md.
 *
 * Fail-closed : les six cantons sont lus, compris et validés en mémoire contre
 * les schémas de src/data/schema.ts. Toutes les anomalies sont listées ; s'il
 * y en a une seule, rien n'est écrit nulle part.
 *
 * Les identifiants de source viennent exclusivement de SOURCE_BY_CANTON
 * (src/data/sources.ts). Une source dont verifiedOn est vide est refusée.
 * Les règles de dérivation des prestations en capital sont lues dans
 * src/data/cantons/capital-withdrawal-derivation.json, jamais réécrit ici.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import readXlsxFile from "read-excel-file/node";

import {
	CANTON_CODES,
	CAPITAL_WITHDRAWAL_DERIVATION_FILE,
	capitalWithdrawalDerivationFileSchema,
	cantonDataSchema,
	municipalMultipliersDataSchema,
	todoSchema,
	type CantonData,
	type FamilyModel,
	type MunicipalMultipliersData,
	type SCALE_TYPES,
	type Todo,
	type Value,
} from "../src/data/schema";
import { SOURCE_BY_CANTON, SOURCES, type SourceId } from "../src/data/sources";
import { bracketsFromWidths, roundPublished as roundRate, type Bracket } from "./estv-scale-conversion";

type CantonCode = (typeof CANTON_CODES)[number];
type Role = keyof (typeof SOURCE_BY_CANTON)[CantonCode];
type Row = unknown[];
type ScaleType = (typeof SCALE_TYPES)[number];
type TaxScale = CantonData["incomeTaxScale"];

const yearArg = process.argv[2];
if (!yearArg || !/^\d{4}$/.test(yearArg)) {
	console.error("Usage : npm run read:estv-exports -- <année>  (p. ex. 2026)");
	process.exit(1);
}
const YEAR = Number(yearArg);
const TODAY = new Date().toISOString().slice(0, 10);
const EFFECTIVE_FROM = `${YEAR}-01-01`;
const COLLECTED_FROM: SourceId = "estv-base-data-module";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const EXPORTS_DIR = join(ROOT, "imports", "estv", String(YEAR));
const DATA_DIR = join(ROOT, "src", "data");

/** Seule absence normale hors barèmes de capital dérivés : autres-deductions à Vaud. */
const OTHER_DEDUCTIONS_ABSENT: readonly CantonCode[] = ["VD"];

/**
 * Famille de chaque table de barème, déclarée par le mainteneur table par
 * table — jamais déduite des données, jamais posée pour un canton entier : le
 * type appartient à la table. Une table lue sans déclaration, ou une
 * déclaration sans table, est une anomalie bloquante.
 */
type ScaleKey = "cantonal.income" | "cantonal.wealth" | "cantonal.capital" | "communal.income" | "communal.wealth";
const DECLARED_SCALE_TYPES: Record<CantonCode, Partial<Record<ScaleKey, ScaleType>>> = {
	VD: { "cantonal.income": "marginal", "cantonal.wealth": "marginal" },
	GE: { "cantonal.income": "marginal", "cantonal.wealth": "marginal" },
	VS: { "cantonal.income": "interpolated", "communal.income": "interpolated", "cantonal.wealth": "marginal" },
	FR: { "cantonal.income": "interpolated", "cantonal.wealth": "marginal", "cantonal.capital": "marginal" },
	NE: { "cantonal.income": "marginal", "cantonal.wealth": "marginal" },
	JU: { "cantonal.income": "marginal", "cantonal.wealth": "marginal", "cantonal.capital": "marginal" },
};
const usedScaleDeclarations = new Set<string>();

/** Valais, fortune communale : l'art. 178 LF la couvre, l'export ne la livre pas (encore). */
const COMMUNAL_WEALTH_TODO =
	"L'art. 178 LF couvre la fortune, mais l'export du module ne la livre pas. À relever dans la loi ou auprès du Service cantonal des contributions avant tout calcul de fortune valaisanne au niveau communal.";

/** Note portée par le coefficient cantonal d'un canton, là où l'export s'écarte du texte légal. */
const CANTONAL_MULTIPLIER_NOTES: Partial<Record<CantonCode, string>> = {
	GE: "Coefficient publié : la part soumise à la diminution de la LDIRPP. Le centime supplémentaire de l'art. 2 LCACant, qui y échappe selon les cas de référence, est porté par unreducedCantonalMultiplier.",
};

const SCALE_HEADER_FIXED = ["Canton-Id", "Canton", "Type d'impôt", "Sujet fiscal", "Autorité fiscale"];
const WIDTH_COLUMN = "Pour les prochains CHF";
const SCALE_AUTHORITIES = ["Canton", "Commune"] as const;
const SCALE_TAX_TYPES = {
	income: "Impôt sur le revenu",
	wealth: "Impôt sur la fortune",
	capital: "Prestation en capital de la prévoyance professionnelle",
} as const;
type ScaleKind = keyof typeof SCALE_TAX_TYPES;
const CHURCH_COLUMNS = ["Église réformée", "Église catholique-romaine", "Église catholique-chrétienne"];
const MULTIPLIER_BLOCK = ["Canton", "Commune", ...CHURCH_COLUMNS];
const MULTIPLIER_GROUP_ROW = [
	null, null, null, null,
	"Impôt sur le revenu", null, null, null, null,
	"Impôt sur la fortune", null, null, null, null,
	"Bénéfice", null, null,
	"Capital", null, null,
];
const MULTIPLIER_HEADER = [
	"Canton-Id", "Canton", "OFS-Id", "Commune",
	...MULTIPLIER_BLOCK, ...MULTIPLIER_BLOCK,
	"Canton", "Commune", "Église", "Canton", "Commune", "Église",
];
const DEDUCTION_HEADER = ["Canton-Id", "Canton", "Type d'impôt", "Déduction", "Montant", "Pour cent", "Minimum", "Maximum"];
const OTHER_DEDUCTION_HEADER = ["Canton-Id", "Canton", "Type d'impôt", "Nom", "Autorité fiscale", "Revenu net / Fortune nette CHF", "Déduction CHF"];

// --- Anomalies ------------------------------------------------------------------

const anomalies: string[] = [];
/** Remarques non bloquantes, affichées en fin de lecture. */
const remarks: string[] = [];
const flag = (canton: string, message: string): void => {
	anomalies.push(`${canton} — ${message}`);
};
const hasAnomaly = (canton: string): boolean => anomalies.some((anomaly) => anomaly.startsWith(`${canton} — `));

// --- Lecture et normalisation --------------------------------------------------

const sameRow = (actual: Row, expected: readonly unknown[]): boolean =>
	actual.length === expected.length && expected.every((cell, index) => actual[index] === cell);

const asText = (cell: unknown): string | null =>
	typeof cell === "string" && cell.trim() !== "" ? cell.trim() : null;

const asNumber = (cell: unknown): number | null => {
	if (typeof cell === "number" && Number.isFinite(cell)) return cell;
	if (typeof cell === "string" && cell.trim() !== "" && Number.isFinite(Number(cell))) {
		return Number(cell);
	}
	return null;
};

type ExportSheet = { file: string; header: Row; before: Row[]; rows: Row[] };

/** Lit un export : un seul onglet, en-tête sur la ligne « Canton-Id », année de la 2e ligne. */
const readExport = async (canton: CantonCode, name: string): Promise<ExportSheet | null> => {
	const path = join(EXPORTS_DIR, canton.toLowerCase(), `${name}.xlsx`);
	const file = relative(ROOT, path);
	const sheets = await readXlsxFile(path);
	if (sheets.length !== 1) {
		flag(canton, `${file} : ${sheets.length} onglets, un seul attendu`);
		return null;
	}
	const data = sheets[0]!.data as Row[];
	const headerIndex = data.findIndex((row) => row[0] === "Canton-Id");
	if (headerIndex === -1) {
		flag(canton, `${file} : en-tête introuvable (aucune ligne commençant par « Canton-Id »)`);
		return null;
	}
	const exportYear = asNumber(data[1]?.[0]);
	if (exportYear !== YEAR) {
		flag(canton, `${file} : année des métadonnées « ${data[1]?.[0]} », ${YEAR} attendue`);
	}
	const rows = data
		.slice(headerIndex + 1)
		.filter((row) => row.some((cell) => cell !== null && cell !== ""));
	for (const [index, row] of rows.entries()) {
		if (row[1] !== canton) {
			flag(canton, `${file}, ligne ${index + 1} : canton « ${row[1]} »`);
		}
	}
	return { file, header: data[headerIndex]!, before: data.slice(0, headerIndex), rows };
};

/** Lit un nombre ; toute cellule non numérique est une anomalie. */
const numberAt = (canton: string, sheet: ExportSheet, row: Row, column: number): number => {
	const value = asNumber(row[column]);
	if (value === null) {
		flag(canton, `${sheet.file} : valeur non numérique « ${row[column]} » en colonne « ${sheet.header[column]} »`);
		return Number.NaN;
	}
	return value;
};

// --- Sources -------------------------------------------------------------------

/** Signale une source jamais vérifiée ; vrai si elle peut alimenter la production. */
const isVerified = (canton: CantonCode, sourceId: string, role: string): boolean => {
	const source = SOURCES.find((entry) => entry.id === sourceId);
	if (source?.verifiedOn === "") {
		flag(canton, `la source « ${sourceId} » (${role}) n'a jamais été vérifiée (verifiedOn vide) : elle ne peut pas alimenter la production`);
		return false;
	}
	return true;
};

/** Identifiant du rôle, ou `null` avec une anomalie si le rôle est vide ou non vérifié. */
const sourceFor = (canton: CantonCode, role: Role, usage: string): SourceId | null => {
	const sourceId = SOURCE_BY_CANTON[canton][role] as SourceId | null;
	if (sourceId === null) {
		flag(canton, `rôle « ${role} » vide dans SOURCE_BY_CANTON, alors qu'il est nécessaire pour ${usage}`);
		return null;
	}
	return isVerified(canton, sourceId, role) ? sourceId : null;
};

const collected = <T>(value: T, sourceId: SourceId | null, note?: string): Value<T> => ({
	value,
	sourceId: sourceId ?? "",
	verifiedOn: TODAY,
	effectiveFrom: EFFECTIVE_FROM,
	collectedFrom: COLLECTED_FROM,
	...(note ? { note } : {}),
});

// --- Barèmes -------------------------------------------------------------------

type ReadScales = { Canton: TaxScale; Commune: TaxScale };

/**
 * Lit un barème, en deux formats : seuils (8 colonnes) ou largeurs de tranches
 * (7 colonnes, « Pour les prochains CHF »), converties en seuils. Groupé par
 * (sujet fiscal, autorité fiscale).
 */
const readScale = (canton: CantonCode, sheet: ExportSheet, kind: ScaleKind): ReadScales => {
	const empty: ReadScales = { Canton: [], Commune: [] };
	const header = sheet.header;
	const isWidthFormat = sameRow(header, [...SCALE_HEADER_FIXED, WIDTH_COLUMN, "En plus %"]);
	const isThresholdFormat =
		sameRow(header, [...SCALE_HEADER_FIXED, header[5], "En plus %", "Montant de base CHF"]) &&
		asText(header[5]) !== null &&
		header[5] !== WIDTH_COLUMN;
	if (!isWidthFormat && !isThresholdFormat) {
		flag(canton, `${sheet.file} : structure inconnue — en-tête ${JSON.stringify(header)}`);
		return empty;
	}

	const divisorRow = sheet.before.find((row) => row[0] === "Montant du diviseur");
	const divisor = divisorRow ? asNumber(divisorRow[2]) : null;
	if (divisor === null) {
		flag(canton, `${sheet.file} : « Montant du diviseur » introuvable dans les métadonnées`);
	}
	const taxTypes = new Set(sheet.rows.map((row) => row[2]));
	if (taxTypes.size !== 1 || !taxTypes.has(SCALE_TAX_TYPES[kind])) {
		flag(canton, `${sheet.file} : types d'impôt ${JSON.stringify([...taxTypes])}, « ${SCALE_TAX_TYPES[kind]} » attendu`);
	}

	const groups = new Map<string, { group: string; authority: (typeof SCALE_AUTHORITIES)[number]; rows: Row[] }>();
	for (const row of sheet.rows) {
		const group = asText(row[3]);
		const authority = SCALE_AUTHORITIES.find((candidate) => candidate === row[4]);
		if (group === null || authority === undefined) {
			flag(canton, `${sheet.file} : sujet fiscal « ${row[3]} » ou autorité fiscale « ${row[4]} » non reconnus (Canton ou Commune attendues)`);
			continue;
		}
		const key = `${group}\u0000${authority}`;
		const entry = groups.get(key) ?? { group, authority, rows: [] };
		entry.rows.push(row);
		groups.set(key, entry);
	}

	const scales: ReadScales = { Canton: [], Commune: [] };
	for (const { group, authority, rows } of groups.values()) {
		const label = `${sheet.file}, « ${group} » (${authority})`;
		let brackets: Bracket[];
		if (isWidthFormat) {
			try {
				brackets = bracketsFromWidths(
					rows.map((row) => ({
						width: numberAt(canton, sheet, row, 5),
						ratePercent: roundRate(numberAt(canton, sheet, row, 6)),
					})),
				);
			} catch (error) {
				flag(canton, `${label} : conversion des largeurs de tranches impossible — ${(error as Error).message}`);
				continue;
			}
		} else {
			brackets = rows.map((row) => ({
				threshold: numberAt(canton, sheet, row, 5),
				ratePercent: roundRate(numberAt(canton, sheet, row, 6)),
				baseAmount: numberAt(canton, sheet, row, 7),
			}));
		}
		if (brackets.some((bracket, index) => index > 0 && bracket.threshold < brackets[index - 1]!.threshold)) {
			flag(canton, `${label} : seuils non croissants`);
		}

		const scaleKey = `${authority === "Canton" ? "cantonal" : "communal"}.${kind}` as ScaleKey;
		const table = `${canton} ${scaleKey}`;
		const scaleType = DECLARED_SCALE_TYPES[canton][scaleKey];
		const allBasesZero = brackets.every((bracket) => bracket.baseAmount === 0);
		if (scaleType === undefined) {
			flag(canton, `${label} : type de barème (scaleType) non déclaré pour la table « ${table} » — montants de base ${allBasesZero ? "tous nuls" : "non nuls"}. Le type appartient à la table, jamais au canton : déclare-le dans DECLARED_SCALE_TYPES.`);
			continue;
		}
		usedScaleDeclarations.add(table);
		if (scaleType === "marginal" && allBasesZero) {
			flag(canton, `${label} : table « ${table} » déclarée marginal, mais tous ses montants de base valent 0`);
		}
		if (scaleType !== "marginal" && !allBasesZero) {
			flag(canton, `${label} : table « ${table} » déclarée ${scaleType}, mais certains de ses montants de base sont non nuls`);
		}

		const role: Role =
			authority === "Commune" ? "communalScale" : kind === "income" ? "incomeScale" : kind === "wealth" ? "wealthScale" : "capitalScale";
		const sourceId = sourceFor(canton, role, `le barème ${label}`);
		scales[authority].push({
			taxpayerGroup: group,
			table: collected(
				{
					scaleType,
					thresholdLabel: String(header[5]),
					rateSplittingDivisor: divisor === 0 ? null : divisor ?? Number.NaN,
					brackets,
				},
				sourceId,
				isWidthFormat
					? 'derivedFrom: "bracketWidths" — seuils et montants de base calculés à la lecture, par cumul des largeurs de tranches de l\'export.'
					: undefined,
			),
		});
	}
	return scales;
};

// --- Coefficients --------------------------------------------------------------

type MunicipalEntry = MunicipalMultipliersData["multipliers"][number];

const readMultipliers = (
	canton: CantonCode,
	sheet: ExportSheet,
): { cantonal: { income: number; wealth: number } | null; municipalities: MunicipalEntry[] } => {
	const groupRow = sheet.before[sheet.before.length - 1] ?? [];
	if (!sameRow(groupRow, MULTIPLIER_GROUP_ROW) || !sameRow(sheet.header, MULTIPLIER_HEADER)) {
		flag(canton, `${sheet.file} : en-têtes modifiés — ${JSON.stringify(groupRow)} / ${JSON.stringify(sheet.header)}`);
		return { cantonal: null, municipalities: [] };
	}

	const municipalSource = sourceFor(canton, "municipalMultipliers", "les coefficients communaux");
	const churchRole: Role = SOURCE_BY_CANTON[canton].churchMultipliers === null ? "municipalMultipliers" : "churchMultipliers";
	const churchSource = sourceFor(canton, churchRole, "les coefficients paroissiaux");

	const block = (row: Row, start: number) => ({
		municipal: collected(roundRate(numberAt(canton, sheet, row, start + 1)), municipalSource),
		church: {
			protestant: collected(roundRate(numberAt(canton, sheet, row, start + 2)), churchSource),
			catholic: collected(roundRate(numberAt(canton, sheet, row, start + 3)), churchSource),
			christianCatholic: collected(roundRate(numberAt(canton, sheet, row, start + 4)), churchSource),
		},
	});

	const seen = new Set<number>();
	const cantonalIncome = new Set<number>();
	const cantonalWealth = new Set<number>();
	const municipalities: MunicipalEntry[] = [];
	for (const row of sheet.rows) {
		const bfsId = asNumber(row[2]);
		const name = asText(row[3]);
		if (bfsId === null || !Number.isInteger(bfsId) || name === null) {
			flag(canton, `${sheet.file} : commune sans numéro OFS entier ou sans nom — ${JSON.stringify(row.slice(0, 4))}`);
			continue;
		}
		if (seen.has(bfsId)) flag(canton, `${sheet.file} : numéro OFS ${bfsId} en double`);
		seen.add(bfsId);
		cantonalIncome.add(roundRate(numberAt(canton, sheet, row, 4)));
		cantonalWealth.add(roundRate(numberAt(canton, sheet, row, 9)));
		municipalities.push({ bfsId, municipality: name, canton, income: block(row, 4), wealth: block(row, 9) });
	}

	if (cantonalIncome.size !== 1 || cantonalWealth.size !== 1) {
		flag(canton, `${sheet.file} : coefficient cantonal différent selon les communes — revenu ${JSON.stringify([...cantonalIncome])}, fortune ${JSON.stringify([...cantonalWealth])}`);
		return { cantonal: null, municipalities };
	}
	return {
		cantonal: { income: [...cantonalIncome][0]!, wealth: [...cantonalWealth][0]! },
		municipalities,
	};
};

// --- Déductions ----------------------------------------------------------------

const readDeductions = (canton: CantonCode, sheet: ExportSheet, sourceId: SourceId | null): CantonData["deductions"] => {
	if (!sameRow(sheet.header, DEDUCTION_HEADER)) {
		flag(canton, `${sheet.file} : en-tête modifié — ${JSON.stringify(sheet.header)}`);
	}
	return collected(
		sheet.rows.map((row) => ({
			taxType: asText(row[2]) ?? "",
			name: asText(row[3]) ?? "",
			amount: numberAt(canton, sheet, row, 4),
			percent: roundRate(numberAt(canton, sheet, row, 5)),
			minimum: numberAt(canton, sheet, row, 6),
			maximum: numberAt(canton, sheet, row, 7),
		})),
		sourceId,
	);
};

const readOtherDeductions = (
	canton: CantonCode,
	sheet: ExportSheet,
	sourceId: SourceId | null,
): NonNullable<CantonData["otherDeductions"]> => {
	if (!sameRow(sheet.header, OTHER_DEDUCTION_HEADER)) {
		flag(canton, `${sheet.file} : en-tête modifié — ${JSON.stringify(sheet.header)}`);
	}
	const groups = new Map<string, { taxType: string; name: string; authority: string; steps: { threshold: number; amount: number }[] }>();
	for (const row of sheet.rows) {
		const taxType = asText(row[2]) ?? "";
		const name = asText(row[3]) ?? "";
		const authority = asText(row[4]) ?? "";
		const key = `${taxType}\u0000${name}`;
		const group = groups.get(key) ?? { taxType, name, authority, steps: [] };
		if (group.authority !== authority) {
			flag(canton, `${sheet.file} : « ${name} » porte plusieurs autorités fiscales`);
		}
		group.steps.push({ threshold: numberAt(canton, sheet, row, 5), amount: numberAt(canton, sheet, row, 6) });
		groups.set(key, group);
	}
	return collected(
		[...groups.values()].map((group) => ({
			...group,
			thresholdLabel: String(sheet.header[5]),
			steps: group.steps.sort((a, b) => a.threshold - b.threshold),
		})),
		sourceId,
	);
};

// --- Règles de dérivation des prestations en capital (fichier maintenu à la main) --

const loadCapitalWithdrawalDerivation = () => {
	const path = join(DATA_DIR, CAPITAL_WITHDRAWAL_DERIVATION_FILE);
	if (!existsSync(path)) {
		flag("prestations en capital", `${relative(ROOT, path)} introuvable`);
		return {};
	}
	const parsed = capitalWithdrawalDerivationFileSchema.safeParse(JSON.parse(readFileSync(path, "utf8")));
	if (!parsed.success) {
		flag("prestations en capital", `${relative(ROOT, path)} non conforme au schéma — ${parsed.error.issues.map((issue) => `${issue.path.join(".")} : ${issue.message}`).join(" | ")}`);
		return {};
	}
	for (const [canton, rule] of Object.entries(parsed.data.cantons) as [CantonCode, NonNullable<(typeof parsed.data.cantons)[CantonCode]>][]) {
		const taxLaw = SOURCE_BY_CANTON[canton].taxLaw;
		for (const [field, value] of Object.entries(rule)) {
			if (typeof value !== "object") continue;
			if (value.sourceId !== taxLaw) {
				flag(canton, `${CAPITAL_WITHDRAWAL_DERIVATION_FILE} → ${field} : sourceId « ${value.sourceId} », « ${taxLaw} » (rôle taxLaw) attendu`);
				continue;
			}
			isVerified(canton, taxLaw, `${CAPITAL_WITHDRAWAL_DERIVATION_FILE} → ${field}`);
		}
	}
	return parsed.data.cantons;
};

// --- Clés hors exports : TODO, sans écraser une valeur déjà relevée -------------

const NON_EXPORT_KEYS = [
	"baseTaxReduction",
	"unreducedCantonalMultiplier",
	"taxBaseRounding",
	"incomeScaleIndexation",
	"supplementaryWealthTax",
	"taxCreditPerChild",
	"personalTax",
	"realEstateGainsTax",
	"imputedRentalValue",
] as const;

const todo = (text: string, sourceId: SourceId | null): Todo => ({ todo: text, sourceId });
const isTodo = (candidate: unknown): boolean => todoSchema.safeParse(candidate).success;

/**
 * Modèle familial de chaque canton, déclaré par le mainteneur — jamais déduit
 * des exports. Les paramètres restent des TODO jusqu'au relevé ; un canton dont
 * le modèle n'est pas encore tranché porte un TODO entier.
 */
const DECLARED_FAMILY_MODELS: Record<CantonCode, FamilyModel | Todo> = {
	VD: {
		type: "familyQuotient",
		sourceId: "vd-li",
		coefficients: todo("Coefficients du quotient familial (personne seule, famille monoparentale, couple marié, part par enfant) : à relever dans la LI.", "vd-li"),
	},
	GE: todo("Modèle familial genevois : taux applicable aux couples mariés et aux familles monoparentales, et assiettes concernées (revenu, fortune).", "ge-lipp"),
	VS: todo("Modèle familial valaisan : traitement des couples mariés (rabais d'impôt) et des familles monoparentales.", "vs-lf"),
	FR: { type: "splittingIncludedInScale", sourceId: "fr-licd" },
	NE: {
		type: "divisorOnIncomeAndWealth",
		sourceId: "ne-lcdir",
		households: todo("Ménages auxquels s'applique le splitting (couples mariés ; familles monoparentales ?), sur le revenu et la fortune.", "ne-lcdir"),
	},
	JU: { type: "separateScale", sourceId: "ju-li" },
};

const nonExportDefaults = (canton: CantonCode) => {
	const reduction = SOURCE_BY_CANTON[canton].baseTaxReduction;
	const taxLaw = SOURCE_BY_CANTON[canton].taxLaw;
	return {
		baseTaxReduction:
			reduction === null
				? null
				: todo("Réduction de l'impôt cantonal de base (taux et impôts concernés : revenu, fortune) : absente des exports de l'AFC, à relever dans l'acte.", reduction),
		unreducedCantonalMultiplier:
			canton === "GE"
				? todo("Centime additionnel cantonal qui échappe à la diminution de la LDIRPP (revenu et fortune) : à identifier et relever dans l'acte.", "ge-lcacant")
				: null,
		taxBaseRounding: todo("Arrondi des revenu et fortune imposables (pas en francs, 1 si aucun) : à relever dans la loi.", taxLaw),
		incomeScaleIndexation:
			canton === "VS"
				? todo("Application du barème du revenu, cantonal et communal : les cas de référence ne sont reproduits qu'en indexant les seuils de l'export. Mécanisme et facteurs à relever.", "vs-lf")
				: null,
		supplementaryWealthTax:
			canton === "GE" ? todo("Impôt supplémentaire sur la fortune, sans centimes additionnels : barème à relever.", "ge-lipp") : null,
		taxCreditPerChild:
			canton === "NE" ? todo("Rabais d'impôt par enfant, déduit de l'impôt cantonal : montant à relever.", "ne-lcdir") : null,
		personalTax:
			canton === "VS" || canton === "GE"
				? todo("Taxe personnelle forfaitaire : montant et acte à relever, source à inscrire au registre.", null)
				: null,
		realEstateGainsTax: todo("Impôt sur les gains immobiliers : source à inscrire au registre, valeurs à relever.", null),
		imputedRentalValue: todo("Valeur locative : source à inscrire au registre, méthode à relever.", null),
	};
};

/** Garde une valeur déjà relevée à la main dans le fichier existant ; sinon, la valeur par défaut. */
const keepManualValues = (path: string, defaults: ReturnType<typeof nonExportDefaults>) => {
	if (!existsSync(path)) return defaults;
	const existing = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
	const merged: Record<string, unknown> = { ...defaults };
	for (const key of NON_EXPORT_KEYS) {
		const current = existing[key];
		if (current !== undefined && current !== null && !isTodo(current)) {
			merged[key] = current;
		}
	}
	return merged as typeof defaults;
};

/**
 * Modèle familial : la déclaration fait foi sur le type ; un paramètre déjà
 * relevé dans le fichier existant est gardé. Un modèle relevé à la main là où
 * la déclaration est un TODO est gardé tel quel.
 */
const keepFamilyModel = (canton: CantonCode, path: string): FamilyModel | Todo => {
	const declared = DECLARED_FAMILY_MODELS[canton];
	if (!existsSync(path)) return declared;
	const current = (JSON.parse(readFileSync(path, "utf8")) as { familyModel?: unknown }).familyModel;
	if (current === undefined || isTodo(current)) return declared;
	if (isTodo(declared)) return current as FamilyModel;
	const manual = current as Record<string, unknown>;
	if (manual.type !== (declared as FamilyModel).type) {
		flag(canton, `modèle familial « ${String(manual.type)} » dans ${relative(ROOT, path)}, mais « ${(declared as FamilyModel).type} » déclaré dans DECLARED_FAMILY_MODELS : lequel fait foi ?`);
		return declared;
	}
	const merged: Record<string, unknown> = { ...declared };
	for (const [key, value] of Object.entries(declared)) {
		if (isTodo(value) && manual[key] !== undefined && !isTodo(manual[key])) merged[key] = manual[key];
	}
	return merged as FamilyModel;
};

/**
 * Barème communal propre (Valais). Sans barème communal du revenu, aucun ; sans
 * barème communal de la fortune, la valeur relevée à la main est gardée, sinon
 * un TODO.
 */
const readCommunalScale = (
	canton: CantonCode,
	path: string,
	income: TaxScale,
	wealth: TaxScale,
): CantonData["communalScale"] => {
	if (income.length === 0) {
		if (wealth.length > 0) flag(canton, "barème communal de la fortune sans barème communal du revenu");
		return null;
	}
	if (wealth.length > 0) return { income, wealth };
	const existing = existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as { communalScale?: { wealth?: unknown } }) : {};
	const manual = existing.communalScale?.wealth;
	if (manual !== undefined && !todoSchema.safeParse(manual).success) {
		return { income, wealth: manual as TaxScale };
	}
	return { income, wealth: todo(COMMUNAL_WEALTH_TODO, SOURCE_BY_CANTON[canton].communalScale) };
};

// --- Un canton -----------------------------------------------------------------

const readCanton = async (
	canton: CantonCode,
	derivation: ReturnType<typeof loadCapitalWithdrawalDerivation>,
) => {
	const directory = join(EXPORTS_DIR, canton.toLowerCase());
	const capitalIsDerived = derivation[canton] !== undefined;
	const expected = ["coefficients", "bareme-revenu", "bareme-fortune", "deductions"];
	if (!capitalIsDerived) expected.push("bareme-capital");
	if (!OTHER_DEDUCTIONS_ABSENT.includes(canton)) expected.push("autres-deductions");

	for (const name of expected) {
		if (!existsSync(join(directory, `${name}.xlsx`))) {
			flag(canton, `export manquant : ${relative(ROOT, join(directory, `${name}.xlsx`))}`);
		}
	}
	if (capitalIsDerived && existsSync(join(directory, "bareme-capital.xlsx"))) {
		flag(canton, `bareme-capital.xlsx présent alors que ${CAPITAL_WITHDRAWAL_DERIVATION_FILE} dérive ce barème du revenu : lequel fait foi ?`);
	}
	if (anomalies.some((anomaly) => anomaly.startsWith(`${canton} — export manquant`))) return null;

	const sheets = new Map<string, ExportSheet | null>();
	for (const name of expected) sheets.set(name, await readExport(canton, name));
	const income = sheets.get("bareme-revenu");
	const wealth = sheets.get("bareme-fortune");
	const coefficients = sheets.get("coefficients");
	const deductions = sheets.get("deductions");
	if (!income || !wealth || !coefficients || !deductions) return null;

	const taxLawSource = sourceFor(canton, "taxLaw", "les déductions");
	const incomeScales = readScale(canton, income, "income");
	const wealthScales = readScale(canton, wealth, "wealth");
	if (wealthScales.Commune.length > 0) {
		remarks.push(`${canton} — ${wealth.file} : barème communal de la fortune livré par l'export, lu comme celui du revenu (découverte, pas une anomalie)`);
	}

	let capitalWithdrawalTax: CantonData["capitalWithdrawalTax"];
	if (capitalIsDerived) {
		capitalWithdrawalTax = { definedIn: CAPITAL_WITHDRAWAL_DERIVATION_FILE };
	} else {
		const capital = sheets.get("bareme-capital");
		const capitalScales = capital ? readScale(canton, capital, "capital") : { Canton: [], Commune: [] };
		if (capitalScales.Commune.length > 0) {
			flag(canton, `${capital?.file} : barème communal des prestations en capital, non prévu`);
		}
		capitalWithdrawalTax = capitalScales.Canton;
	}

	const multipliers = readMultipliers(canton, coefficients);
	const cantonalSource = sourceFor(canton, "cantonalMultiplier", "le coefficient cantonal");
	const cantonalNote = CANTONAL_MULTIPLIER_NOTES[canton];

	const otherDeductionsSheet = sheets.get("autres-deductions");
	const path = join(DATA_DIR, "cantons", `${canton.toLowerCase()}.json`);
	const data = {
		canton,
		year: YEAR,
		incomeTaxScale: incomeScales.Canton,
		wealthTaxScale: wealthScales.Canton,
		capitalWithdrawalTax,
		cantonalMultiplier: multipliers.cantonal && {
			income: collected(multipliers.cantonal.income, cantonalSource, cantonalNote),
			wealth: collected(multipliers.cantonal.wealth, cantonalSource, cantonalNote),
		},
		communalScale: readCommunalScale(canton, path, incomeScales.Commune, wealthScales.Commune),
		deductions: readDeductions(canton, deductions, taxLawSource),
		...(otherDeductionsSheet ? { otherDeductions: readOtherDeductions(canton, otherDeductionsSheet, taxLawSource) } : {}),
		...keepManualValues(path, nonExportDefaults(canton)),
		familyModel: keepFamilyModel(canton, path),
	};

	const result = { path, municipalities: multipliers.municipalities };
	if (hasAnomaly(canton)) return { ...result, data: null };
	const parsed = cantonDataSchema.safeParse(data);
	if (!parsed.success) {
		const issues = parsed.error.issues.slice(0, 5).map((issue) => `${issue.path.join(".")} : ${issue.message}`);
		flag(canton, `fichier cantonal non conforme au schéma — ${issues.join(" | ")}`);
		return { ...result, data: null };
	}
	return { ...result, data: parsed.data };
};

// --- Exécution -------------------------------------------------------------------

if (!existsSync(EXPORTS_DIR)) {
	console.error(`✗ Dossier des exports introuvable : ${relative(ROOT, EXPORTS_DIR)}`);
	process.exit(1);
}

const derivation = loadCapitalWithdrawalDerivation();
const results = [];
for (const canton of CANTON_CODES) results.push(await readCanton(canton, derivation));

for (const canton of CANTON_CODES) {
	if (hasAnomaly(canton)) continue;
	for (const scaleKey of Object.keys(DECLARED_SCALE_TYPES[canton])) {
		if (!usedScaleDeclarations.has(`${canton} ${scaleKey}`)) {
			flag(canton, `table « ${canton} ${scaleKey} » déclarée dans DECLARED_SCALE_TYPES, mais absente des exports`);
		}
	}
}

const municipalities = results
	.flatMap((result) => result?.municipalities ?? [])
	.sort((a, b) => CANTON_CODES.indexOf(a.canton) - CANTON_CODES.indexOf(b.canton) || a.bfsId - b.bfsId);
const multipliersFile = municipalMultipliersDataSchema.safeParse({ year: YEAR, multipliers: municipalities });
if (!multipliersFile.success) {
	const issues = multipliersFile.error.issues.slice(0, 5).map((issue) => `${issue.path.join(".")} : ${issue.message}`);
	flag("coefficients communaux", `fichier non conforme au schéma — ${issues.join(" | ")}`);
}

console.log(
	`\nCommunes lues : ${CANTON_CODES.map((canton) => `${canton} ${municipalities.filter((entry) => entry.canton === canton).length}`).join(" · ")} — total ${municipalities.length}`,
);

for (const remark of remarks) console.log(`  ℹ ${remark}`);

if (anomalies.length > 0) {
	console.error(`\n✗ ${anomalies.length} anomalie(s) — aucun fichier n'est écrit :`);
	for (const anomaly of anomalies) console.error(`  · ${anomaly}`);
	process.exit(1);
}

for (const result of results) {
	if (!result?.data) continue;
	mkdirSync(dirname(result.path), { recursive: true });
	writeFileSync(result.path, `${JSON.stringify(result.data, null, "\t")}\n`);
	console.log(`✓ écrit ${relative(ROOT, result.path)}`);
}
const multipliersPath = join(DATA_DIR, "municipalities", "multipliers.json");
mkdirSync(dirname(multipliersPath), { recursive: true });
writeFileSync(multipliersPath, `${JSON.stringify(multipliersFile.data, null, "\t")}\n`);
console.log(`✓ écrit ${relative(ROOT, multipliersPath)} (${municipalities.length} communes)`);
