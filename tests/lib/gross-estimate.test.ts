import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";

import { getFederalData } from "../../src/data";
import { getGrossToTaxableRuleSet } from "../../src/data/gross-to-taxable";
import { estimateTaxableIncome, legalMinimumPensionContribution, rulesFor } from "../../src/lib/calculations/gross-to-taxable";
import * as labels from "../../src/lib/calculations/gross-to-taxable-labels";
import { computeEstimate, estimateDefaults, type EstimateInput } from "../../src/lib/display/gross-estimate";

/**
 * Mode « salaire brut » des calculateurs (W08, prompt B2, décisions du
 * 11.10.2026) : défauts publics de l'estimateur (prime moyenne du canton, LAA
 * nulle, LPP au minimum légal), aucune valeur tirée du calculateur de l'AFC ;
 * revenu diminué de la cotisation ordinaire pour A1, non diminué pour A2.
 */
const YEAR = 2026;
const CANTONS = ["VD", "GE", "VS", "FR", "NE", "JU"] as const;
const ruleSet = getGrossToTaxableRuleSet(YEAR, CANTONS);
const premiums = getFederalData(YEAR).averageHealthInsurancePremiums as Record<string, { value: { adult: number; child: number } }>;
const smallCap = getFederalData(YEAR).pillar3a.smallContributionCap;

const single = (canton: string, overrides: Partial<EstimateInput> = {}): EstimateInput => ({
	canton,
	married: false,
	childrenAges: [],
	persons: [{ grossSalary: 80_000, age: 35, pensionContribution: null }],
	premiums: null,
	accidentRatePercent: null,
	...overrides,
});

describe("défauts publics de l'estimateur", () => {
	it.each(CANTONS)("%s : prime moyenne du canton par adulte et par enfant, LAA nulle, LPP au minimum légal", (canton) => {
		const defaults = estimateDefaults(ruleSet, canton, [{ grossSalary: 80_000, age: 35 }]);
		expect(defaults.premiums).toEqual({ perAdult: premiums[canton]!.value.adult, perChild: premiums[canton]!.value.child });
		expect(defaults.accidentRatePercent).toBe(0);
		expect(defaults.pensionContributions).toEqual([
			legalMinimumPensionContribution(80_000, 35, ruleSet.socialInsurance.occupationalPension).contribution,
		]);
	});

	it("la page n'embarque que les primes moyennes de l'ordonnance du DFI, aucune valeur tirée de l'AFC", () => {
		for (const canton of CANTONS) {
			expect(ruleSet.averagePremiums[canton]).toEqual({
				value: { adult: premiums[canton]!.value.adult, child: premiums[canton]!.value.child },
				sourceId: "dfi-average-health-premiums",
			});
		}
		expect(JSON.stringify(ruleSet)).not.toMatch(/nonOccupationalAccidentRate|perAdult/);
	});

	it("les défauts sont déclarés comme hypothèses dans la trace", () => {
		const notes = computeEstimate(single("VD"), ruleSet, null).rows.map((row) => row.note ?? "");
		expect(notes).toContain(labels.PREMIUMS_PUBLIC_DEFAULT);
		expect(notes).toContain(labels.ACCIDENT_RATE_PUBLIC_DEFAULT);
		expect(notes.some((note) => note.startsWith(labels.LPP_DEFAULT_ASSUMPTION_START))).toBe(true);
		expect(notes).toContain(labels.NO_TRANSPORT_MEALS_CHILDCARE);
	});

	it("des valeurs saisies remplacent les défauts et sont déclarées comme telles", () => {
		const input = single("VD", {
			premiums: { perAdult: 5_000, perChild: 1_000 },
			accidentRatePercent: 1.2,
			persons: [{ grossSalary: 80_000, age: 35, pensionContribution: 4_000 }],
		});
		const estimate = computeEstimate(input, ruleSet, null);
		const reference = estimateTaxableIncome(
			{
				maritalStatus: "single",
				childrenAges: [],
				earners: [{ grossSalary: 80_000, age: 35, occupationalPensionContribution: 4_000 }],
				nonOccupationalAccidentRate: { value: 0.012, assumption: labels.USER_VALUE },
				insurancePremiums: { perAdult: 5_000, perChild: 1_000, assumption: labels.USER_VALUE },
			},
			rulesFor(ruleSet, "VD"),
		);
		expect(estimate.federalTaxableIncome).toBe(reference.federalTaxableIncome);
		expect(estimate.cantonalTaxableIncome).toBe(reference.cantonalTaxableIncome);
		expect(estimate.rows.filter((row) => row.note === labels.USER_VALUE).length).toBeGreaterThanOrEqual(4);
	});

	it("Fribourg : le montant minimal par enfant est déclaré dans la trace", () => {
		const input = single("FR", { childrenAges: [5] });
		expect(computeEstimate(input, ruleSet, null).rows.some((row) => row.note === labels.FR_CHILD_MINIMUM)).toBe(true);
	});
});

describe("sens du revenu estimé", () => {
	it("A2 : revenus imposables non diminués, aucune ligne de cotisation ordinaire", () => {
		const estimate = computeEstimate(single("VD"), ruleSet, null);
		const direct = estimateTaxableIncome(
			{
				maritalStatus: "single",
				childrenAges: [],
				earners: [{ grossSalary: 80_000, age: 35 }],
				nonOccupationalAccidentRate: { value: 0, assumption: labels.ACCIDENT_RATE_PUBLIC_DEFAULT },
				insurancePremiums: { perAdult: premiums.VD!.value.adult, perChild: premiums.VD!.value.child, assumption: labels.PREMIUMS_PUBLIC_DEFAULT },
			},
			rulesFor(ruleSet, "VD"),
		);
		expect(estimate.federalTaxableIncome).toBe(direct.federalTaxableIncome);
		expect(estimate.cantonalTaxableIncome).toBe(direct.cantonalTaxableIncome);
		expect(estimate.rows.some((row) => row.label === labels.ORDINARY_CONTRIBUTION)).toBe(false);
	});

	it("A1 : les deux revenus sont diminués de la cotisation ordinaire de l'année, ligne et source dans la trace", () => {
		const without = computeEstimate(single("VD"), ruleSet, null);
		const estimate = computeEstimate(single("VD"), ruleSet, { value: smallCap.value, sourceId: smallCap.sourceId });
		expect(estimate.federalTaxableIncome).toBe(without.federalTaxableIncome - smallCap.value);
		expect(estimate.cantonalTaxableIncome).toBe(without.cantonalTaxableIncome - smallCap.value);
		const line = estimate.rows.find((row) => row.label === labels.ORDINARY_CONTRIBUTION)!;
		expect(line.note).toBe(labels.ORDINARY_CONTRIBUTION_ASSUMPTION);
		expect(line.note).toMatch(/art\. 7 al\. 1 let\. a OPP 3/);
	});
});

describe("pages : bloc « salaire brut » dans le formulaire", () => {
	const render = async (page: string) => {
		const { default: Page } = await import(`../../src/pages/prevoyance/${page}.astro`);
		const container = await AstroContainer.create({ astroConfig: { site: "https://calculateurs.ch" } });
		return container.renderToString(Page, { request: new Request(`https://calculateurs.ch/prevoyance/${page}/`) });
	};

	it.each(["rachat-3a-retroactif", "economie-impot-3a"])("%s : le bloc suit le revenu imposable fédéral, dans le formulaire", async (page) => {
		const html = await render(page);
		const form = html.slice(html.indexOf("<form"), html.indexOf("</form>"));
		expect(form).toContain("data-estimator");
		expect(form.indexOf('name="federalTaxableIncome"')).toBeLessThan(form.indexOf("data-estimator"));
		expect(html.replace(/&#39;/g, "'")).toContain("Je ne connais pas mon revenu imposable — l'estimer depuis mon salaire brut");
		expect(html).toContain('id="trace-labels-gross-to-taxable"');
	});
});
