import { describe, expect, it } from "vitest";

import { pillar3aBuybackYear } from "../../../src/calculators/pension/pillar-3a-buyback";
import { getFederalData } from "../../../src/data";
import { getTaxScales, getTaxScalesBundle } from "../../../src/data/tax-scales";
import { computePillar3aBuyback } from "../../../src/lib/calculations/pension/pillar-3a-buyback";
import { taxScalesFromBundle } from "../../../src/lib/calculations/tax-scales-bundle";
import type { TaxInput } from "../../../src/lib/calculations/tax";
import {
	PRIVATE_REFERENCE_PATH,
	privateReferenceFileExists,
	readReferenceFile,
	type ReferenceCase,
	type ReferenceFile,
} from "../reference-file";

/**
 * Calcul complet d'A1 contre les cas différentiels de l'AFC : entrées du cas de
 * base, une lacune de l'année précédant le rachat, rien versé, rachat proposé
 * égal à la « petite » cotisation. Les entrées d'A1 ne comportent pas la
 * fortune : la retirer vérifie au passage que l'économie n'en dépend pas.
 * Lit uniquement le fichier privé ; en son absence, la suite est ignorée avec
 * un message explicite.
 */
const hasPrivateFile = privateReferenceFileExists();
const MISSING_FILE_MESSAGE =
	"ignoré : tests/calculations/private/canton-references.json absent — lancer `npm run test` avec DATA_REPO_TOKEN pour injecter les références privées";
if (!hasPrivateFile) console.warn(`\n⚠ A1 non vérifié — ${MISSING_FILE_MESSAGE}\n`);

const file: ReferenceFile = hasPrivateFile ? readReferenceFile(PRIVATE_REFERENCE_PATH) : {};
const cases = file.cases ?? [];
const deltaCases = file.meta?.marginalRateCases?.cases ?? [];
const relativeTolerance = Number(file.meta?.tolerance?.relative);
const absoluteFloorChf = Number(file.meta?.tolerance?.absoluteFloorChf ?? 0);

const pillar3a = getFederalData(pillar3aBuybackYear).pillar3a;
const sourced = (value: { value: number; sourceId: string }) => ({ value: value.value, sourceId: value.sourceId });
const small = sourced(pillar3a.smallContributionCap);

/** Les entrées d'A1 : celles du cas de base, sans la fortune. */
const a1TaxInput = (base: ReferenceCase): TaxInput => ({
	taxYear: Number(file.meta?.taxYear),
	canton: base.municipality?.canton as TaxInput["canton"],
	municipalityOfsId: Number(base.municipality?.ofsId),
	maritalStatus: base.taxpayer?.maritalStatus as TaxInput["maritalStatus"],
	children: Number(base.taxpayer?.children),
	childrenAges: Array.isArray(base.taxpayer?.childrenAges) ? base.taxpayer.childrenAges.map(Number) : [],
	denomination: "none",
	federalTaxableIncome: Number(base.engineInput?.federalTaxableIncome),
	cantonalTaxableIncome: Number(base.engineInput?.cantonalTaxableIncome),
	taxableWealth: 0,
});

const a1Gaps = (buybackAmount: number) => ({
	buybackYear: pillar3aBuybackYear,
	firstGapYear: sourced(pillar3a.buyback.firstGapYear),
	lookbackYears: sourced(pillar3a.buyback.lookbackYears),
	buybackYearCap: small,
	gapYears: [
		{ year: pillar3aBuybackYear - 1, maxContribution: small, paidContribution: small.value - buybackAmount, hadAvsIncome: true, alreadyBoughtBack: false },
	],
	currentYearContributionPaidInFull: true,
	hasAvsIncomeInBuybackYear: true,
	receivedOldAgeBenefit: false,
});

describe.skipIf(!hasPrivateFile)(
	hasPrivateFile ? "A1 contre les cas différentiels de l'AFC" : `A1 contre les cas différentiels de l'AFC — ${MISSING_FILE_MESSAGE}`,
	() => {
		it("les sept cas différentiels sont présents, chacun pour un rachat de la petite cotisation", () => {
			expect(deltaCases).toHaveLength(7);
			for (const deltaCase of deltaCases) expect(deltaCase.buybackAmount).toBe(small.value);
		});

		deltaCases.forEach((deltaCase, index) => {
			const id = typeof deltaCase.id === "string" ? deltaCase.id : `marginalRateCases.cases[${index}]`;

			it(`${id} : économie d'A1 égale à l'économie attendue, par getTaxScales comme par le paquet de la page`, () => {
				const base = cases.find((c) => c.id === deltaCase.baseCaseId);
				expect(base, `${id} : cas de base introuvable`).toBeDefined();
				const taxInput = a1TaxInput(base!);
				const buybackAmount = Number(deltaCase.buybackAmount);
				const expected = Number(deltaCase.expected?.taxSaving);
				const allowed = Math.max(Math.abs(expected) * relativeTolerance, absoluteFloorChf);

				const direct = computePillar3aBuyback({ taxInput, scales: getTaxScales(taxInput), gaps: a1Gaps(buybackAmount) });
				expect(direct.buybackAmount).toBe(buybackAmount);
				expect(
					Math.abs(direct.taxSaving - expected) <= allowed,
					`${id} : économie attendue ${expected}, obtenue ${direct.taxSaving.toFixed(2)}, tolérance ${allowed.toFixed(2)}`,
				).toBe(true);
				expect(direct.cantonalAndMunicipalSaving + direct.federalSaving).toBeCloseTo(direct.taxSaving, 6);

				const bundle = getTaxScalesBundle(pillar3aBuybackYear, [taxInput.canton]);
				const viaBundle = computePillar3aBuyback({
					taxInput,
					scales: taxScalesFromBundle(bundle, taxInput.municipalityOfsId),
					gaps: a1Gaps(buybackAmount),
				});
				expect(viaBundle.taxSaving).toBeCloseTo(direct.taxSaving, 6);
			});
		});
	},
);
