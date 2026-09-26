import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import type { CalculatorDefinition } from "../../src/calculators/types";
import { allDataFiles, allSources, eachValue, sourceRegistry } from "../../src/data";
import { sourceSchema } from "../../src/data/schema";
import { ESTV_BASE_DATA_ATTRIBUTION, SOURCE_BY_CANTON } from "../../src/data/sources";
import { dataFreshnessReport } from "../../src/lib/data-report";

/**
 * Registre des sources (docs/plan/sources.md § 2.7, CLAUDE.md § 1.3). Porte sur
 * le registre fusionné — public + privé — tel qu'il est construit pour le site.
 */
const SRC_DIR = fileURLToPath(new URL("../../src/", import.meta.url));

/** Fichiers d'un dossier de src/, récursivement, filtrés par extension. */
const sourceFiles = (directory: string, extensions: string[]): string[] =>
	readdirSync(join(SRC_DIR, directory), { recursive: true, encoding: "utf8" })
		.filter((file) => extensions.some((extension) => file.endsWith(extension)))
		.map((file) => join(directory, file));

const calculatorModules = import.meta.glob<Record<string, unknown>>(
	"../../src/calculators/**/*.ts",
	{ eager: true },
);

const isCalculatorDefinition = (
	candidate: unknown,
): candidate is CalculatorDefinition =>
	typeof candidate === "object" &&
	candidate !== null &&
	"id" in candidate &&
	"family" in candidate &&
	"sourceIds" in candidate &&
	Array.isArray(candidate.sourceIds);

describe("registre des sources", () => {
	const known = new Set(allSources().map((source) => source.id));

	it("chaque source du registre fusionné respecte le schéma", () => {
		for (const source of allSources()) {
			const result = sourceSchema.safeParse(source);
			expect(
				result.success,
				`${source.id} : ${result.error?.issues.map((issue) => `${issue.path.join(".")} — ${issue.message}`).join(" | ")}`,
			).toBe(true);
		}
	});

	it("les identifiants de source sont uniques", () => {
		const seen = new Set<string>();
		for (const source of allSources()) {
			expect(seen.has(source.id), `« ${source.id} » déclaré deux fois`).toBe(false);
			seen.add(source.id);
		}
		expect(() => sourceRegistry()).not.toThrow();
	});

	it("toute source requiresAttribution possède un attributionText", () => {
		for (const source of allSources()) {
			if (!source.requiresAttribution) continue;
			expect(
				Boolean(source.attributionText?.trim()),
				`${source.id} : requiresAttribution vaut true, mais attributionText est vide`,
			).toBe(true);
		}
	});

	it("tout attributionText reprend mot pour mot la formule d'attribution de l'AFC", () => {
		for (const source of allSources()) {
			if (source.attributionText === undefined) continue;
			expect(
				source.attributionText,
				`${source.id} : attributionText diffère de ESTV_BASE_DATA_ATTRIBUTION`,
			).toBe(ESTV_BASE_DATA_ATTRIBUTION);
		}
	});

	it("aucune source n'est orpheline : chacune déclare au moins un usage", () => {
		for (const source of allSources()) {
			expect(
				source.usedBy.length,
				`${source.id} : usedBy est vide — aucun calculateur ni module ne l'utilise`,
			).toBeGreaterThan(0);
		}
	});

	it("le collectedFrom d'une source désigne une source du registre", () => {
		for (const source of allSources()) {
			if (source.collectedFrom === undefined) continue;
			expect(
				known.has(source.collectedFrom),
				`${source.id} : collectedFrom « ${source.collectedFrom} » absent du registre`,
			).toBe(true);
		}
	});

	it("tout sourceId et tout collectedFrom des données de src/data/ existent au registre", () => {
		for (const file of allDataFiles()) {
			eachValue(file.data, (value, path) => {
				expect(
					known.has(value.sourceId),
					`${file.path} → ${path} : sourceId « ${value.sourceId} » absent du registre`,
				).toBe(true);
				if (value.collectedFrom !== undefined) {
					expect(
						known.has(value.collectedFrom),
						`${file.path} → ${path} : collectedFrom « ${value.collectedFrom} » absent du registre`,
					).toBe(true);
				}
			});
		}
	});

	it("une source non vérifiée (verifiedOn vide) n'alimente aucune valeur de src/data/", () => {
		const unverified = new Set(
			allSources()
				.filter((source) => source.verifiedOn === "")
				.map((source) => source.id),
		);
		for (const file of allDataFiles()) {
			eachValue(file.data, (value, path) => {
				expect(
					unverified.has(value.sourceId),
					`${file.path} → ${path} : la source « ${value.sourceId} » n'a jamais été vérifiée — inutilisable en production (R3)`,
				).toBe(false);
			});
		}
	});

	it("tout sourceId déclaré par une CalculatorDefinition existe au registre", () => {
		for (const [file, exports] of Object.entries(calculatorModules)) {
			for (const candidate of Object.values(exports)) {
				if (!isCalculatorDefinition(candidate)) continue;
				for (const sourceId of candidate.sourceIds) {
					expect(
						known.has(sourceId),
						`${file} → ${candidate.id} : sourceId « ${sourceId} » absent du registre`,
					).toBe(true);
				}
			}
		}
	});

	it("tout sourceId écrit en dur dans le code de calcul (lignes de breakdown) existe au registre", () => {
		// Les sourceId dynamiques d'une breakdown viennent des Value<T> des
		// barèmes, déjà couverts ci-dessus ; restent les identifiants littéraux.
		const literalSourceId = /sourceId\s*[:=]\s*(["'`])([^"'`$\n]+)\1/g;
		for (const file of sourceFiles("lib", [".ts"])) {
			const content = readFileSync(join(SRC_DIR, file), "utf8");
			for (const match of content.matchAll(literalSourceId)) {
				const sourceId = match[2] as string;
				expect(
					known.has(sourceId),
					`src/${file} : sourceId « ${sourceId} » absent du registre`,
				).toBe(true);
			}
		}
	});

	it("aucune source de nature reference-tool n'est rendue sur une page publique", () => {
		for (const row of dataFreshnessReport()) {
			expect(
				row.source?.nature,
				`${row.file} → ${row.path} : la source « ${row.sourceId} » est un outil de référence et figure dans le rapport public`,
			).not.toBe("reference-tool");
		}

		// Les pages n'accèdent jamais au registre brut : elles passent par
		// src/lib/, qui écarte les sources reference-tool.
		const rawRegistryAccess =
			/\b(sourceRegistry|allSources|PRIVATE_SOURCES)\b|from\s+["'][^"']*data\/(sources|private)\b/;
		const renderedFiles = ["pages", "components", "layouts"].flatMap((directory) =>
			sourceFiles(directory, [".astro", ".ts"]),
		);
		for (const file of renderedFiles) {
			const content = readFileSync(join(SRC_DIR, file), "utf8");
			expect(
				rawRegistryAccess.test(content),
				`src/${file} accède directement au registre des sources : passer par src/lib/ pour écarter les sources reference-tool`,
			).toBe(false);
		}
	});

	it("SOURCE_BY_CANTON ne désigne que des sources du registre", () => {
		for (const [canton, roles] of Object.entries(SOURCE_BY_CANTON)) {
			for (const [role, sourceId] of Object.entries(roles)) {
				if (sourceId === null) continue;
				expect(
					known.has(sourceId),
					`${canton} → ${role} : « ${sourceId} » absent du registre`,
				).toBe(true);
			}
		}
	});
});
