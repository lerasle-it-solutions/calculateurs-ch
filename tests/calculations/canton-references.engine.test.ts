import { describe, expect, it } from "vitest";

import { getTaxScales } from "../../src/data/tax-scales";
import {
	computeIncomeAndWealthTax,
	computeMarginalRate,
	computeTaxSavingOnDeduction,
	type TaxInput,
} from "../../src/lib/calculations/tax";
import {
	PRIVATE_REFERENCE_PATH,
	caseLabel,
	privateReferenceFileExists,
	readReferenceFile,
	type ReferenceCase,
	type ReferenceFile,
} from "./reference-file";

/**
 * Le moteur fiscal contre les cas de référence relevés sur le calculateur de
 * l'AFC (docs/plan/engine.md § 3.6). Lit uniquement le fichier privé : les
 * fixtures fictives ne valident jamais le moteur.
 *
 * Entrées du moteur : `engineInput`, `municipality`, `taxpayer` et
 * `meta.taxYear`. `grossInput` et `estvIntermediate` sont documentaires et ne
 * sont jamais passés au moteur.
 *
 * Ce fichier et le fichier de référence sont en lecture seule (R7).
 */
const hasPrivateFile = privateReferenceFileExists();

const MISSING_FILE_MESSAGE =
	"ignoré : tests/calculations/private/canton-references.json absent — lancer `npm run test` avec DATA_REPO_TOKEN pour injecter les références privées";

if (!hasPrivateFile) {
	console.warn(`\n⚠ Moteur fiscal non vérifié — ${MISSING_FILE_MESSAGE}\n`);
}

const file: ReferenceFile = hasPrivateFile
	? readReferenceFile(PRIVATE_REFERENCE_PATH)
	: {};
const cases = file.cases ?? [];
const deltaCases = file.meta?.marginalRateCases?.cases ?? [];
const taxYear = Number(file.meta?.taxYear);
const relativeTolerance = Number(file.meta?.tolerance?.relative);
const absoluteFloorChf = Number(file.meta?.tolerance?.absoluteFloorChf ?? 0);

/** Écart absolu admis pour les postes soumis à `meta.tolerance`. */
const toleranceFor = (expected: number): number =>
	Math.max(Math.abs(expected) * relativeTolerance, absoluteFloorChf);

const EXACT_TOLERANCE_CHF = 1; // personalTax et churchTax : à l'unité près
const MARGINAL_RATE_TOLERANCE_POINTS = 0.5;
const TAX_SAVING_RELATIVE_TOLERANCE = 0.01;

const chf = (amount: number): string =>
	`${amount.toLocaleString("fr-CH", { maximumFractionDigits: 2 })} CHF`;

const signed = (amount: number, format: (n: number) => string): string =>
	`${amount >= 0 ? "+" : "−"}${format(Math.abs(amount))}`;

const percent = (amount: number): string =>
	`${amount.toLocaleString("fr-CH", { maximumFractionDigits: 2 })} %`;

/** Une ligne d'écart lisible par un non-développeur. */
const describeGap = (
	label: string,
	field: string,
	expected: number,
	actual: number,
	allowed: string,
): string => {
	const gap = actual - expected;
	const gapPercent = expected === 0 ? Number.NaN : (gap / expected) * 100;
	const gapPercentText = Number.isFinite(gapPercent)
		? signed(gapPercent, percent)
		: "n.d.";
	return `${label} · ${field} : attendu ${chf(expected)}, obtenu ${chf(actual)}, écart ${signed(gap, chf)} (${gapPercentText}), tolérance ${allowed}`;
};

const toTaxInput = (referenceCase: ReferenceCase): TaxInput => {
	const { municipality, taxpayer, engineInput } = referenceCase;
	return {
		taxYear,
		canton: municipality?.canton as TaxInput["canton"],
		municipalityOfsId: Number(municipality?.ofsId),
		maritalStatus: taxpayer?.maritalStatus as TaxInput["maritalStatus"],
		children: Number(taxpayer?.children),
		childrenAges: Array.isArray(taxpayer?.childrenAges)
			? taxpayer.childrenAges.map(Number)
			: [],
		denomination: taxpayer?.denomination as TaxInput["denomination"],
		federalTaxableIncome: Number(engineInput?.federalTaxableIncome),
		cantonalTaxableIncome: Number(engineInput?.cantonalTaxableIncome),
		taxableWealth: Number(engineInput?.taxableWealth),
	};
};

const scalesFor = (input: TaxInput) =>
	getTaxScales({
		taxYear: input.taxYear,
		canton: input.canton,
		municipalityOfsId: input.municipalityOfsId,
	});

describe.skipIf(!hasPrivateFile)(
	hasPrivateFile
		? "moteur fiscal contre les cas de référence de l'AFC"
		: `moteur fiscal contre les cas de référence de l'AFC — ${MISSING_FILE_MESSAGE}`,
	() => {
		describe("suite niveau : impôt cantonal, communal, fédéral, paroissial, taxe personnelle et total", () => {
			const toleranceFields = ["cantonalTax", "municipalTax", "federalTax", "totalTax"] as const;
			const exactFields = ["personalTax", "churchTax"] as const;

			cases.forEach((referenceCase, index) => {
				const label = caseLabel(referenceCase, index);

				it(label, () => {
					const input = toTaxInput(referenceCase);
					const result = computeIncomeAndWealthTax(input, scalesFor(input));
					const gaps: string[] = [];

					for (const field of toleranceFields) {
						const expected = Number(referenceCase.expected?.[field]);
						const allowed = toleranceFor(expected);
						if (!(Math.abs(result[field] - expected) <= allowed)) {
							gaps.push(describeGap(label, field, expected, result[field], chf(allowed)));
						}
					}
					for (const field of exactFields) {
						const expected = Number(referenceCase.expected?.[field]);
						if (!(Math.abs(result[field] - expected) <= EXACT_TOLERANCE_CHF)) {
							gaps.push(describeGap(label, field, expected, result[field], chf(EXACT_TOLERANCE_CHF)));
						}
					}

					expect(gaps, `\n${gaps.join("\n")}\n`).toEqual([]);
				});
			});
		});

		describe("suite pente : taux marginal sur le revenu imposable", () => {
			cases.forEach((referenceCase, index) => {
				const label = caseLabel(referenceCase, index);

				it(label, () => {
					const input = toTaxInput(referenceCase);
					const { marginalRatePercent } = computeMarginalRate(input, scalesFor(input));
					const expected = Number(referenceCase.estvMarginalRate?.incomeRatePercent);
					const gap = marginalRatePercent - expected;

					expect(
						Math.abs(gap) <= MARGINAL_RATE_TOLERANCE_POINTS,
						`\n${label} · taux marginal sur le revenu : attendu ${percent(expected)}, obtenu ${percent(marginalRatePercent)}, écart ${signed(gap, (n) => `${n.toLocaleString("fr-CH", { maximumFractionDigits: 2 })} point(s)`)}, tolérance ${MARGINAL_RATE_TOLERANCE_POINTS.toLocaleString("fr-CH")} point\n`,
					).toBe(true);
				});
			});
		});

		describe("suite économie : économie d'impôt sur une déduction", () => {
			if (deltaCases.length === 0) {
				it.skip("ignorée : cas différentiels non encore relevés (meta.marginalRateCases.cases est vide)", () => {});
				return;
			}

			deltaCases.forEach((deltaCase, index) => {
				const id = typeof deltaCase.id === "string" ? deltaCase.id : `marginalRateCases.cases[${index}]`;

				it(id, () => {
					const baseIndex = cases.findIndex((c) => c.id === deltaCase.baseCaseId);
					expect(
						baseIndex,
						`${id} : baseCaseId « ${deltaCase.baseCaseId} » ne correspond à aucun cas de référence`,
					).toBeGreaterThanOrEqual(0);
					const baseCase = cases[baseIndex] as ReferenceCase;
					const label = `${id} (rachat sur ${caseLabel(baseCase, baseIndex)})`;

					const deduction = deltaCase.buybackAmount;
					expect(
						typeof deduction === "number" && Number.isFinite(deduction),
						`${label} : buybackAmount « ${deduction} » n'est pas un montant`,
					).toBe(true);

					const input = toTaxInput(baseCase);
					const { taxSaving } = computeTaxSavingOnDeduction(
						input,
						scalesFor(input),
						deduction as number,
					);
					const expected = Number(deltaCase.expected?.taxSaving);
					const allowed = Math.abs(expected) * TAX_SAVING_RELATIVE_TOLERANCE;

					expect(
						Math.abs(taxSaving - expected) <= allowed,
						`\n${describeGap(label, "taxSaving", expected, taxSaving, chf(allowed))}\n`,
					).toBe(true);
				});
			});
		});
	},
);
