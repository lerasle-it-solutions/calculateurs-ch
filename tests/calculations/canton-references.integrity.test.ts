import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

/**
 * Intégrité du fichier de cas de référence (relevés manuels contre le
 * calculateur de l'AFC). Ce test ne lit que canton-references.json : aucun
 * import de src/, aucune dépendance au moteur de calcul. Il vérifie la
 * cohérence interne du fichier, pas l'exactitude du moteur.
 */
const JSON_PATH = new URL("./canton-references.json", import.meta.url);

interface ReferenceCase {
	id: unknown;
	label?: unknown;
	municipality?: { name?: unknown; canton?: unknown; ofsId?: unknown };
	taxpayer?: unknown;
	grossInput?: { grossIncome?: unknown } & Record<string, unknown>;
	estvIntermediate?: unknown;
	engineInput?: unknown;
	expected?: {
		cantonalTax?: unknown;
		municipalTax?: unknown;
		personalTax?: unknown;
		federalTax?: unknown;
		churchTax?: unknown;
		totalTax?: unknown;
	};
	estvMarginalRate?: { incomeRatePercent?: unknown; wealthRatePercent?: unknown };
	estvAverageRateOnGrossPercent?: unknown;
}

interface ReferenceFile {
	meta?: { taxYear?: unknown; tolerance?: { relative?: unknown } };
	cases?: ReferenceCase[];
}

const raw = readFileSync(JSON_PATH, "utf-8");
const file = JSON.parse(raw) as ReferenceFile;

const meta = file.meta ?? {};
const cases = file.cases ?? [];

const REQUIRED_ROMANDE_CANTONS = ["VD", "GE", "VS", "FR", "NE", "JU"];
const REQUIRED_NON_NULL_KEYS = [
	"taxpayer",
	"grossInput",
	"estvIntermediate",
	"engineInput",
	"expected",
] as const;

/** Liste, en notation pointée, tous les chemins dont la valeur est `null`. */
function findNullPaths(value: unknown, path: string): string[] {
	if (value === null) {
		return [path];
	}
	if (Array.isArray(value)) {
		return value.flatMap((item, index) =>
			findNullPaths(item, `${path}[${index}]`),
		);
	}
	if (value !== null && typeof value === "object") {
		return Object.entries(value as Record<string, unknown>).flatMap(
			([key, entry]) => findNullPaths(entry, path ? `${path}.${key}` : key),
		);
	}
	return [];
}

function caseLabel(referenceCase: ReferenceCase, index: number): string {
	const id = typeof referenceCase.id === "string" ? referenceCase.id : null;
	return id ?? `cases[${index}]`;
}

describe("intégrité de canton-references.json", () => {
	it("les 18 cas sont présents et leurs id sont uniques", () => {
		expect(cases.length, `18 cas attendus, ${cases.length} trouvés`).toBe(18);

		const ids = cases.map((referenceCase) => referenceCase.id);
		const uniqueIds = new Set(ids);
		expect(
			uniqueIds.size,
			`id en double parmi : ${ids.join(", ")}`,
		).toBe(ids.length);
	});

	it("chaque cas possède ses champs obligatoires, sans valeur nulle", () => {
		cases.forEach((referenceCase, index) => {
			const label = caseLabel(referenceCase, index);

			expect(
				Number.isInteger(referenceCase.municipality?.ofsId),
				`${label} : municipality.ofsId « ${referenceCase.municipality?.ofsId} » n'est pas un entier`,
			).toBe(true);

			for (const key of REQUIRED_NON_NULL_KEYS) {
				const value = referenceCase[key];
				expect(
					value !== undefined && value !== null && typeof value === "object",
					`${label} : champ obligatoire « ${key} » manquant`,
				).toBe(true);
			}

			const nullCheckKeys: (keyof ReferenceCase)[] = [
				"municipality",
				...REQUIRED_NON_NULL_KEYS,
			];
			const nullPaths = nullCheckKeys.flatMap((key) =>
				findNullPaths(referenceCase[key], key),
			);

			expect(
				nullPaths.length,
				`${label} : valeur(s) nulle(s) sur ${nullPaths.join(", ")}`,
			).toBe(0);
		});
	});

	it("expected.totalTax égale la somme cantonalTax + municipalTax + personalTax + federalTax + churchTax", () => {
		cases.forEach((referenceCase, index) => {
			const label = caseLabel(referenceCase, index);
			const expected = referenceCase.expected;
			const sum =
				Number(expected?.cantonalTax) +
				Number(expected?.municipalTax) +
				Number(expected?.personalTax) +
				Number(expected?.federalTax) +
				Number(expected?.churchTax);

			expect(
				sum,
				`${label} : la somme des composantes (${sum}) ne correspond pas à expected.totalTax (${expected?.totalTax})`,
			).toBe(expected?.totalTax);
		});
	});

	it("les six cantons romands (VD, GE, VS, FR, NE, JU) sont représentés", () => {
		const cantonsPresent = new Set(
			cases.map((referenceCase) => referenceCase.municipality?.canton),
		);

		for (const canton of REQUIRED_ROMANDE_CANTONS) {
			expect(
				cantonsPresent.has(canton),
				`aucun cas ne porte le canton « ${canton} »`,
			).toBe(true);
		}
	});

	it("chaque estvMarginalRate.incomeRatePercent et wealthRatePercent est renseigné", () => {
		cases.forEach((referenceCase, index) => {
			const label = caseLabel(referenceCase, index);
			const marginalRate = referenceCase.estvMarginalRate;

			expect(
				typeof marginalRate?.incomeRatePercent === "number" &&
					Number.isFinite(marginalRate.incomeRatePercent),
				`${label} : estvMarginalRate.incomeRatePercent « ${marginalRate?.incomeRatePercent} » n'est pas renseigné`,
			).toBe(true);

			expect(
				typeof marginalRate?.wealthRatePercent === "number" &&
					Number.isFinite(marginalRate.wealthRatePercent),
				`${label} : estvMarginalRate.wealthRatePercent « ${marginalRate?.wealthRatePercent} » n'est pas renseigné`,
			).toBe(true);
		});
	});

	it("estvAverageRateOnGrossPercent égale expected.totalTax / grossInput.grossIncome × 100 à 0,05 point près", () => {
		cases.forEach((referenceCase, index) => {
			const label = caseLabel(referenceCase, index);
			const totalTax = Number(referenceCase.expected?.totalTax);
			const grossIncome = Number(referenceCase.grossInput?.grossIncome);
			const recomputed = (totalTax / grossIncome) * 100;
			const declared = Number(referenceCase.estvAverageRateOnGrossPercent);
			const gap = Math.abs(recomputed - declared);

			expect(
				gap <= 0.05,
				`${label} : estvAverageRateOnGrossPercent déclaré ${declared} contre ${recomputed.toFixed(2)} recalculé (écart ${gap.toFixed(3)} > 0,05)`,
			).toBe(true);
		});
	});

	it("un ofsId donné correspond toujours au même nom de commune", () => {
		const namesByOfsId = new Map<number, { name: unknown; label: string }>();

		cases.forEach((referenceCase, index) => {
			const label = caseLabel(referenceCase, index);
			const ofsId = referenceCase.municipality?.ofsId;
			const name = referenceCase.municipality?.name;

			if (typeof ofsId !== "number") {
				return;
			}

			const previous = namesByOfsId.get(ofsId);
			if (previous === undefined) {
				namesByOfsId.set(ofsId, { name, label });
				return;
			}

			expect(
				name,
				`${label} : ofsId ${ofsId} porte le nom « ${name} », mais ${previous.label} lui donnait déjà « ${previous.name} »`,
			).toBe(previous.name);
		});
	});

	it("meta.tolerance.relative vaut 0.01 et meta.taxYear est un entier à quatre chiffres", () => {
		expect(
			meta.tolerance?.relative,
			`meta.tolerance.relative vaut « ${meta.tolerance?.relative} », attendu 0.01`,
		).toBe(0.01);

		const taxYear = meta.taxYear;
		expect(
			typeof taxYear === "number" &&
				Number.isInteger(taxYear) &&
				taxYear >= 1000 &&
				taxYear <= 9999,
			`meta.taxYear « ${taxYear} » n'est pas un entier à quatre chiffres`,
		).toBe(true);
	});
});
