import { describe, expect, it } from "vitest";

import { getTaxScales } from "../../src/data/tax-scales";
import {
	PartialCoverageError,
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
	type DeltaCase,
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
 * Ce fichier et le fichier de référence sont en lecture seule (R7). Seule
 * exception, décidée par le mainteneur le 30.09.2026 : les deux listes
 * ci-dessous, cas hors périmètre et divergences connues de l'oracle, dont
 * chaque entrée est vérifiée par le test lui-même.
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

/**
 * Cas hors du périmètre déclaré du moteur. Le test vérifie que le moteur les
 * refuse, avec son message explicite ; leurs valeurs attendues restent dans le
 * fichier de référence pour le jour où la couverture sera étendue. Si le moteur
 * les calcule de nouveau, le test échoue : l'entrée est à retirer.
 */
const OUT_OF_SCOPE_CASES: Readonly<Record<string, string>> = {
	"case-10":
		"Valais : ménage ayant droit à l'abattement de l'art. 32 al. 3 let. a LF, exclu par coverage.notCoveredHouseholds",
};

/**
 * Divergences connues de l'oracle : le taux marginal affiché par l'AFC est
 * démenti par l'économie réelle d'un cas différentiel. Une entrée ne vaut que
 * si au moins un cas différentiel de même `baseCaseId` existe et passe ; sinon
 * le test échoue. L'écart de pente reste affiché, sans faire échouer le test.
 */
const KNOWN_MARGINAL_RATE_DIVERGENCES: Readonly<Record<string, string>> = {
	"case-03": "taux marginal affiché par l'AFC démenti par l'économie réelle",
	"case-06": "taux marginal affiché par l'AFC démenti par l'économie réelle",
	"case-08": "taux marginal affiché par l'AFC démenti par l'économie réelle",
};

const idOf = (referenceCase: ReferenceCase): string =>
	typeof referenceCase.id === "string" ? referenceCase.id : "";

const points = (n: number): string =>
	`${n.toLocaleString("fr-CH", { maximumFractionDigits: 2 })} point(s)`;

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

/** Le moteur doit refuser ce cas comme hors périmètre, avec son message explicite. */
const expectOutOfScope = (label: string, compute: () => unknown): void => {
	let error: unknown;
	try {
		compute();
	} catch (thrown) {
		error = thrown;
	}
	expect(
		error instanceof PartialCoverageError,
		`\n${label} : le moteur ne signale plus ce cas comme hors périmètre — le retirer de OUT_OF_SCOPE_CASES et vérifier ses valeurs attendues\n`,
	).toBe(true);
	expect((error as Error).message).toMatch(/couverture partielle pour ce ménage/);
};

/** Économie d'un cas différentiel contre sa valeur attendue. */
const deltaCaseCheck = (deltaCase: DeltaCase, index: number): { id: string; passes: boolean; description: string } => {
	const id = typeof deltaCase.id === "string" ? deltaCase.id : `marginalRateCases.cases[${index}]`;
	const baseCase = cases.find((c) => c.id === deltaCase.baseCaseId);
	const deduction = deltaCase.buybackAmount;
	if (!baseCase || typeof deduction !== "number" || !Number.isFinite(deduction)) {
		return { id, passes: false, description: `${id} : cas de base ou montant de rachat invalide` };
	}
	const input = toTaxInput(baseCase);
	const { taxSaving } = computeTaxSavingOnDeduction(input, scalesFor(input), deduction);
	const expected = Number(deltaCase.expected?.taxSaving);
	const allowed = Math.abs(expected) * TAX_SAVING_RELATIVE_TOLERANCE;
	return {
		id,
		passes: Math.abs(taxSaving - expected) <= allowed,
		description: describeGap(id, "taxSaving", expected, taxSaving, chf(allowed)),
	};
};

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
				const outOfScope = OUT_OF_SCOPE_CASES[idOf(referenceCase)];

				if (outOfScope !== undefined) {
					it(`${label} — hors périmètre : ${outOfScope}`, () => {
						const input = toTaxInput(referenceCase);
						expectOutOfScope(label, () => computeIncomeAndWealthTax(input, scalesFor(input)));
					});
					return;
				}

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
			it("les listes d'exceptions ne visent que des cas existants", () => {
				const ids = new Set(cases.map(idOf));
				for (const id of [...Object.keys(OUT_OF_SCOPE_CASES), ...Object.keys(KNOWN_MARGINAL_RATE_DIVERGENCES)]) {
					expect(ids.has(id), `${id} figure dans une liste d'exceptions mais pas dans le fichier de référence`).toBe(true);
				}
			});

			cases.forEach((referenceCase, index) => {
				const label = caseLabel(referenceCase, index);
				const id = idOf(referenceCase);
				const outOfScope = OUT_OF_SCOPE_CASES[id];
				const knownDivergence = KNOWN_MARGINAL_RATE_DIVERGENCES[id];

				if (outOfScope !== undefined) {
					it(`${label} — hors périmètre : ${outOfScope}`, () => {
						const input = toTaxInput(referenceCase);
						expectOutOfScope(label, () => computeMarginalRate(input, scalesFor(input)));
					});
					return;
				}

				it(knownDivergence === undefined ? label : `${label} — divergence connue de l'oracle`, () => {
					const input = toTaxInput(referenceCase);
					const { marginalRatePercent } = computeMarginalRate(input, scalesFor(input));
					const expected = Number(referenceCase.estvMarginalRate?.incomeRatePercent);
					const gap = marginalRatePercent - expected;
					const gapText = `${label} · taux marginal sur le revenu : attendu ${percent(expected)}, obtenu ${percent(marginalRatePercent)}, écart ${signed(gap, points)}, tolérance ${MARGINAL_RATE_TOLERANCE_POINTS.toLocaleString("fr-CH")} point`;

					if (knownDivergence === undefined) {
						expect(Math.abs(gap) <= MARGINAL_RATE_TOLERANCE_POINTS, `\n${gapText}\n`).toBe(true);
						return;
					}

					// La divergence ne vaut que si l'économie réelle d'un cas différentiel la dément.
					const justifications = deltaCases
						.map((deltaCase, deltaIndex) => ({ deltaCase, deltaIndex }))
						.filter(({ deltaCase }) => deltaCase.baseCaseId === id)
						.map(({ deltaCase, deltaIndex }) => deltaCaseCheck(deltaCase, deltaIndex));
					expect(
						justifications.length > 0,
						`\n${label} : aucun cas différentiel de baseCaseId « ${id} » — la divergence n'est pas justifiée, retirer ce cas de KNOWN_MARGINAL_RATE_DIVERGENCES\n`,
					).toBe(true);
					const failing = justifications.filter((check) => !check.passes);
					expect(
						failing,
						`\n${label} : le cas différentiel qui justifie la divergence ne passe pas :\n${failing.map((check) => check.description).join("\n")}\n`,
					).toEqual([]);

					const by = justifications.map((check) => check.id).join(", ");
					console.warn(
						Math.abs(gap) <= MARGINAL_RATE_TOLERANCE_POINTS
							? `ℹ ${gapText} — divergence résorbée : retirer ${id} de KNOWN_MARGINAL_RATE_DIVERGENCES`
							: `⚠ ${gapText} — divergence connue de l'oracle (${knownDivergence}), démentie par ${by}`,
					);
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
