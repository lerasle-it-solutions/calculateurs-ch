import { describe, expect, it } from "vitest";

import {
	EXAMPLE_REFERENCE_PATH,
	PRIVATE_REFERENCE_PATH,
	caseLabel,
	privateReferenceFileExists,
	readReferenceFile,
	type ReferenceCase,
} from "./reference-file";

/**
 * Intégrité du fichier de cas de référence (relevés manuels contre le
 * calculateur de l'AFC). Aucun import de src/, aucune dépendance au moteur de
 * calcul : ce test vérifie la cohérence interne du fichier, pas l'exactitude du
 * moteur.
 *
 * Lit le fichier privé s'il a été injecté, sinon les deux cas fictifs des
 * fixtures. Les contrôles propres au vrai relevé (nombre de cas, cantons, taux)
 * ne portent que sur le fichier privé.
 */
const isPrivate = privateReferenceFileExists();
const file = readReferenceFile(isPrivate ? PRIVATE_REFERENCE_PATH : EXAMPLE_REFERENCE_PATH);
const fileName = isPrivate
	? "private/canton-references.json"
	: "fixtures/canton-references.example.json";

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
	if (typeof value === "object") {
		return Object.entries(value as Record<string, unknown>).flatMap(
			([key, entry]) => findNullPaths(entry, path ? `${path}.${key}` : key),
		);
	}
	return [];
}

const isFiniteNumber = (value: unknown): value is number =>
	typeof value === "number" && Number.isFinite(value);

describe(`intégrité de ${fileName}`, () => {
	it("le fichier contient des cas et leurs id sont uniques", () => {
		expect(cases.length, "aucun cas dans le fichier").toBeGreaterThan(0);

		const ids = cases.map((referenceCase) => referenceCase.id);
		const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
		expect(duplicates, `id en double : ${duplicates.join(", ")}`).toEqual([]);
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
				nullPaths,
				`${label} : valeur(s) nulle(s) sur ${nullPaths.join(", ")}`,
			).toEqual([]);
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

describe.runIf(isPrivate)("intégrité du relevé réel (fichier privé uniquement)", () => {
	it("le relevé compte 18 cas", () => {
		expect(cases.length, `18 cas attendus, ${cases.length} trouvés`).toBe(18);
	});

	it("les six cantons romands (VD, GE, VS, FR, NE, JU) sont représentés", () => {
		const cantonsPresent = new Set(
			cases.map((referenceCase) => referenceCase.municipality?.canton),
		);
		const missing = REQUIRED_ROMANDE_CANTONS.filter(
			(canton) => !cantonsPresent.has(canton),
		);
		expect(missing, `aucun cas pour le(s) canton(s) : ${missing.join(", ")}`).toEqual([]);
	});

	it("36 taux marginaux sont renseignés (revenu et fortune, pour chacun des 18 cas)", () => {
		const missing: string[] = [];
		cases.forEach((referenceCase, index) => {
			const label = caseLabel(referenceCase, index);
			const marginalRate = referenceCase.estvMarginalRate;
			if (!isFiniteNumber(marginalRate?.incomeRatePercent)) {
				missing.push(`${label} : estvMarginalRate.incomeRatePercent`);
			}
			if (!isFiniteNumber(marginalRate?.wealthRatePercent)) {
				missing.push(`${label} : estvMarginalRate.wealthRatePercent`);
			}
		});
		const filled = cases.length * 2 - missing.length;

		expect(missing, `taux marginaux non renseignés :\n${missing.join("\n")}`).toEqual([]);
		expect(filled, `36 taux marginaux attendus, ${filled} renseignés`).toBe(36);
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
});
