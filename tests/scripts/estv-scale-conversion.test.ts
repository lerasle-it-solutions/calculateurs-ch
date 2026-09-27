import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import readXlsxFile from "read-excel-file/node";
import { describe, expect, it } from "vitest";

import {
	bracketsFromWidths,
	OPEN_ENDED_WIDTH,
	roundPublished,
	type Bracket,
} from "../../scripts/estv-scale-conversion";

/**
 * Barèmes jurassiens : l'export donne des largeurs de tranches (« Pour les
 * prochains CHF »), le lecteur les convertit en seuils cumulés. On reconstruit
 * les largeurs depuis les seuils et on doit retrouver l'export.
 */
const widthsFromBrackets = (brackets: readonly Bracket[]): number[] =>
	brackets.map((bracket, index) =>
		index === brackets.length - 1 ? OPEN_ENDED_WIDTH : brackets[index + 1]!.threshold - bracket.threshold,
	);

describe("conversion des largeurs de tranches en seuils", () => {
	it("cumule les largeurs en seuils et les impôts des tranches précédentes en montants de base", () => {
		const brackets = bracketsFromWidths([
			{ width: 1000, ratePercent: 0 },
			{ width: 2000, ratePercent: 1 },
			{ width: 3000, ratePercent: 2.5 },
			{ width: OPEN_ENDED_WIDTH, ratePercent: 3 },
		]);
		expect(brackets).toEqual([
			{ threshold: 0, ratePercent: 0, baseAmount: 0 },
			{ threshold: 1000, ratePercent: 1, baseAmount: 0 },
			{ threshold: 3000, ratePercent: 2.5, baseAmount: 20 },
			{ threshold: 6000, ratePercent: 3, baseAmount: 95 },
		]);
	});

	it("refuse un barème dont la dernière tranche n'est pas sans borne", () => {
		expect(() => bracketsFromWidths([{ width: 1000, ratePercent: 1 }])).toThrow();
		expect(() =>
			bracketsFromWidths([
				{ width: OPEN_ENDED_WIDTH, ratePercent: 1 },
				{ width: OPEN_ENDED_WIDTH, ratePercent: 2 },
			]),
		).toThrow();
	});

	const juExports = ["bareme-revenu", "bareme-capital"].map((name) =>
		fileURLToPath(new URL(`../../imports/estv/2026/ju/${name}.xlsx`, import.meta.url)),
	);
	const available = juExports.every((path) => existsSync(path));

	it.skipIf(!available)("retrouve les largeurs et les taux des exports jurassiens (exports locaux)", async () => {
		for (const path of juExports) {
			const data = (await readXlsxFile(path))[0]!.data as unknown[][];
			const header = data.findIndex((row) => row[0] === "Canton-Id");
			const groups = new Map<string, { width: number; ratePercent: number }[]>();
			for (const row of data.slice(header + 1).filter((cells) => cells.some((cell) => cell !== null))) {
				const rows = groups.get(String(row[3])) ?? [];
				rows.push({ width: Number(row[5]), ratePercent: roundPublished(Number(row[6])) });
				groups.set(String(row[3]), rows);
			}
			expect(groups.size, path).toBeGreaterThan(0);

			for (const [group, rows] of groups) {
				const brackets = bracketsFromWidths(rows);
				expect(widthsFromBrackets(brackets), `${path} — ${group} : largeurs`).toEqual(rows.map((row) => row.width));
				expect(brackets.map((bracket) => bracket.ratePercent), `${path} — ${group} : taux`).toEqual(
					rows.map((row) => row.ratePercent),
				);
				brackets.slice(1).forEach((bracket, index) => {
					const previous = brackets[index]!;
					const expected = previous.baseAmount + ((bracket.threshold - previous.threshold) * previous.ratePercent) / 100;
					expect(bracket.baseAmount, `${path} — ${group} : montant de base au seuil ${bracket.threshold}`).toBeCloseTo(expected, 6);
				});
			}
		}
	});

	const juRateExports = ["bareme-revenu", "bareme-fortune", "bareme-capital"].map((name) =>
		fileURLToPath(new URL(`../../imports/estv/2026/ju/${name}.xlsx`, import.meta.url)),
	);

	// L'arrondi ne vise que les artefacts de virgule flottante, jamais la précision publiée.
	it.skipIf(!juRateExports.every((path) => existsSync(path)))(
		"ne modifie aucun taux des exports jurassiens par l'arrondi (exports locaux)",
		async () => {
			let checked = 0;
			for (const path of juRateExports) {
				const data = (await readXlsxFile(path))[0]!.data as unknown[][];
				const header = data.findIndex((row) => row[0] === "Canton-Id");
				const rateColumn = data[header]!.indexOf("En plus %");
				expect(rateColumn, `${path} : colonne « En plus % »`).toBeGreaterThan(-1);
				for (const row of data.slice(header + 1).filter((cells) => cells.some((cell) => cell !== null))) {
					const rate = Number(row[rateColumn]);
					expect(roundPublished(rate), `${path} — « ${row[3]} » : taux ${rate}`).toBe(rate);
					checked += 1;
				}
			}
			expect(checked).toBeGreaterThan(0);
		},
	);
});
