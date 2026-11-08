import { existsSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { getCapitalWithdrawalBundle, getCapitalWithdrawalScales } from "../../src/data/capital-withdrawal-scales";
import { getTaxScalesBundle } from "../../src/data/tax-scales";
import { capitalWithdrawalScalesFromBundle } from "../../src/lib/calculations/pension/capital-withdrawal-bundle";
import {
	computeCapitalWithdrawalPlan,
	type CapitalWithdrawalInput,
	type CapitalWithdrawalScales,
	type CapitalWithdrawalYear,
} from "../../src/lib/calculations/pension/capital-withdrawal-plan";
import type { TaxInput } from "../../src/lib/calculations/tax";
import { CAPITAL_WITHDRAWAL_OPTIONS } from "../../src/lib/display/capital-withdrawal-core";

/**
 * A4, retrait en capital, contre les relevés manuels du calculateur de l'AFC
 * (module « prestations en capital »), dans le dépôt privé (R6) : écart d'au
 * plus `meta.tolerance.relative` avec un plancher de `absoluteFloorChf` sur les
 * impôts fédéral, cantonal, communal et le total, impôt paroissial exact. Le
 * moteur tourne avec les options de la page, sur les barèmes de la construction
 * et sur ceux que le navigateur reconstitue à partir du fichier de données.
 *
 * Ce fichier et le fichier de référence sont en lecture seule (R7). Seule
 * exception, décidée par le mainteneur le 8.11.2026 : la liste des écarts
 * expliqués ci-dessous, dont chaque entrée est vérifiée par le test lui-même.
 */
const PATH = new URL("./private/capital-withdrawal-references.json", import.meta.url);
const hasPrivateFile = existsSync(PATH);
if (!hasPrivateFile) {
	console.warn("\n⚠ A4 non vérifié : tests/calculations/private/capital-withdrawal-references.json absent (DATA_REPO_TOKEN).\n");
}

type Taxes = Pick<CapitalWithdrawalYear, "federalTax" | "cantonalTax" | "municipalTax" | "churchTax" | "totalTax">;
type ReferenceCase = {
	id: string;
	municipality: { name: string; canton: TaxInput["canton"]; ofsId: number };
	taxpayer: { maritalStatus: TaxInput["maritalStatus"]; children: number; denomination: TaxInput["denomination"]; age?: number; sex?: "male" | "female" };
	input: { capitalAmount: number; withdrawalYear: number };
	expected: Taxes;
};
type ReferenceFile = {
	meta: { taxYear: number; tolerance: { relative: number; appliesTo: (keyof Taxes)[]; exactMatch: (keyof Taxes)[]; absoluteFloorChf: number } };
	cases: ReferenceCase[];
};

const file: ReferenceFile | null = hasPrivateFile ? (JSON.parse(readFileSync(PATH, "utf-8")) as ReferenceFile) : null;
const cases = file?.cases ?? [];

/**
 * Écarts expliqués : l'AFC s'écarte de la loi, le moteur suit la loi. Chaque
 * cas est sorti de la vérification à 1 % ; le test vérifie que l'écart existe
 * toujours (sinon l'entrée est à retirer) et que le moteur rend la valeur
 * légale, calculée d'après la loi citée.
 */
const EXPLAINED_DEVIATIONS: Readonly<Record<string, { law: string; legal: Pick<Taxes, "cantonalTax" | "municipalTax"> }>> = {
	"cw-fribourg-10000": {
		law: "Art. 39 al. 4 LICD : n'est exonéré que ce qui est « inférieur à 10'000 francs ». 10 000 CHF tout juste sont imposables.",
		legal: { cantonalTax: 100, municipalTax: 80 },
	},
	"cw-fribourg-10001": {
		law: "Art. 39 al. 4 LICD : n'est exonéré que ce qui est « inférieur à 10'000 francs ». 10 001 CHF sont imposables.",
		legal: { cantonalTax: 100, municipalTax: 80 },
	},
};

const inputOf = (referenceCase: ReferenceCase, taxYear: number): CapitalWithdrawalInput => {
	const { municipality, taxpayer, input } = referenceCase;
	return {
		taxYear,
		canton: municipality.canton,
		municipalityOfsId: municipality.ofsId,
		maritalStatus: taxpayer.maritalStatus,
		children: taxpayer.children,
		denomination: taxpayer.denomination,
		// Une seule prestation : le module de l'AFC ne distingue pas le 2e et le 3e pilier
		withdrawals: [{ pillar: "lpp", amount: input.capitalAmount, year: input.withdrawalYear }],
		...(taxpayer.age !== undefined && taxpayer.sex !== undefined
			? { annuityProfile: { sex: taxpayer.sex, age: taxpayer.age, ageYear: input.withdrawalYear } }
			: {}),
	};
};

const taxesOf = (input: CapitalWithdrawalInput, scales: CapitalWithdrawalScales): Taxes => {
	const { plan, refusals } = computeCapitalWithdrawalPlan(input, scales, CAPITAL_WITHDRAWAL_OPTIONS);
	expect(refusals).toEqual([]);
	const { federalTax, cantonalTax, municipalTax, churchTax, totalTax } = plan!.years[0]!;
	return { federalTax, cantonalTax, municipalTax, churchTax, totalTax };
};

/** Barèmes du navigateur : les deux fichiers de données de l'année, passés par JSON comme à la page. */
const browserScales = (taxYear: number, canton: TaxInput["canton"], ofsId: number): CapitalWithdrawalScales => {
	const tax = JSON.parse(JSON.stringify(getTaxScalesBundle(taxYear, [canton])));
	const capital = JSON.parse(JSON.stringify(getCapitalWithdrawalBundle(taxYear, [canton])));
	return capitalWithdrawalScalesFromBundle(capital, tax, ofsId);
};

const withinTolerance = (meta: ReferenceFile["meta"], field: keyof Taxes, expected: number, obtained: number): boolean =>
	meta.tolerance.exactMatch.includes(field)
		? obtained === expected
		: Math.abs(obtained - expected) <= Math.max(Math.abs(expected) * meta.tolerance.relative, meta.tolerance.absoluteFloorChf);

describe.skipIf(!hasPrivateFile)("A4 contre les relevés de l'AFC", () => {
	const meta = file!.meta;

	it("tolérance du fichier : 1 %, plancher 1 CHF, impôt paroissial exact", () => {
		expect(meta.tolerance.relative).toBe(0.01);
		expect(meta.tolerance.absoluteFloorChf).toBe(1);
		expect(meta.tolerance.appliesTo.sort()).toEqual(["cantonalTax", "federalTax", "municipalTax", "totalTax"]);
		expect(meta.tolerance.exactMatch).toEqual(["churchTax"]);
	});

	it("chaque écart expliqué désigne un cas du fichier", () => {
		const ids = new Set(cases.map((referenceCase) => referenceCase.id));
		for (const id of Object.keys(EXPLAINED_DEVIATIONS)) expect(ids.has(id), id).toBe(true);
	});

	const checked = cases.filter((referenceCase) => !(referenceCase.id in EXPLAINED_DEVIATIONS));

	it.each(checked.map((referenceCase) => [referenceCase.id, referenceCase] as const))("%s : écart dans la tolérance", (_, referenceCase) => {
		const input = inputOf(referenceCase, meta.taxYear);
		const obtained = taxesOf(input, getCapitalWithdrawalScales({ taxYear: meta.taxYear, canton: input.canton, municipalityOfsId: input.municipalityOfsId }));
		const fields = [...meta.tolerance.appliesTo, ...meta.tolerance.exactMatch];
		const failures = fields
			.filter((field) => !withinTolerance(meta, field, referenceCase.expected[field], obtained[field]))
			.map((field) => `${field} : attendu ${referenceCase.expected[field]}, obtenu ${obtained[field]}`);
		expect(failures, referenceCase.id).toEqual([]);
		// Le navigateur calcule la même chose
		expect(taxesOf(input, browserScales(meta.taxYear, input.canton, input.municipalityOfsId))).toEqual(obtained);
	});

	it.each(Object.entries(EXPLAINED_DEVIATIONS))("%s : écart expliqué, le moteur rend la valeur légale", (id, deviation) => {
		const referenceCase = cases.find((candidate) => candidate.id === id)!;
		const input = inputOf(referenceCase, meta.taxYear);
		const obtained = taxesOf(input, getCapitalWithdrawalScales({ taxYear: meta.taxYear, canton: input.canton, municipalityOfsId: input.municipalityOfsId }));
		expect(obtained.cantonalTax, deviation.law).toBe(deviation.legal.cantonalTax);
		expect(obtained.municipalTax, deviation.law).toBe(deviation.legal.municipalTax);
		// L'écart existe toujours : sinon, l'entrée est à retirer de la liste
		expect(withinTolerance(meta, "totalTax", referenceCase.expected.totalTax, obtained.totalTax), `${id} : l'écart a disparu`).toBe(false);
	});

	it("cw-sion-300000-f60 : le tableau de conversion change l'impôt selon l'âge et le sexe", () => {
		const male = cases.find((candidate) => candidate.id === "cw-sion-300000")!;
		const female = cases.find((candidate) => candidate.id === "cw-sion-300000-f60")!;
		expect(female.taxpayer).toMatchObject({ age: 60, sex: "female" });
		expect(female.input.capitalAmount).toBe(male.input.capitalAmount);
		const scalesOf = (referenceCase: ReferenceCase) =>
			getCapitalWithdrawalScales({ taxYear: meta.taxYear, canton: referenceCase.municipality.canton, municipalityOfsId: referenceCase.municipality.ofsId });
		const obtainedMale = taxesOf(inputOf(male, meta.taxYear), scalesOf(male));
		const obtainedFemale = taxesOf(inputOf(female, meta.taxYear), scalesOf(female));
		// Même sens d'écart que l'AFC, chacun dans la tolérance (vérifiée ci-dessus)
		expect(Math.sign(obtainedFemale.totalTax - obtainedMale.totalTax)).toBe(Math.sign(female.expected.totalTax - male.expected.totalTax));
		expect(obtainedFemale.totalTax).not.toBe(obtainedMale.totalTax);
	});
});
