import { describe, expect, it } from "vitest";

import { exampleOutcome } from "../../src/calculators/example-outcomes";
import { LPP_BUYBACK_ID } from "../../src/calculators/pension/lpp-buyback";
import { PILLAR_3A_BUYBACK_ID } from "../../src/calculators/pension/pillar-3a-buyback";
import { PILLAR_3A_TAX_SAVING_ID } from "../../src/calculators/pension/pillar-3a-tax-saving";
import { fr } from "../../src/i18n/fr";
import { formatChfAmount } from "../../src/lib/display/amounts";
import { fillSummary, resultSummary, summaryRows, type ResultFigures } from "../../src/lib/display/result-summary";
import { exampleFormValues } from "../../src/calculators/field-values";
import { pillar3aTaxSaving } from "../../src/calculators/pension/pillar-3a-tax-saving";
import { pillar3aTaxSavingPageData } from "../../src/calculators/pension/pillar-3a-tax-saving-page-data";
import { readPillar3aTaxSavingForm } from "../../src/lib/display/pillar-3a-tax-saving-form";
import { parseNumber } from "../../src/lib/format/amount-input";

/**
 * Carte résultat, § 4.4 de docs/design-system.md : sous le chiffre, la part du
 * montant versé et le coût net de l'année ; sous la carte, une ligne par impôt
 * que le moteur calcule séparément, jamais de ligne à zéro. Montants fictifs :
 * la fonction met en forme, elle ne calcule aucun impôt.
 */
const figures = (overrides: Partial<ResultFigures> = {}): ResultFigures => ({
	paid: 7_258,
	saving: 1_865,
	components: { cantonalTax: 800, municipalTax: 600, churchTax: 0, personalTax: 0, federalTax: 465 },
	...overrides,
});

describe("résumé du résultat", () => {
	it("part du versement arrondie au pour cent, coût net en francs", () => {
		const summary = resultSummary(figures())!;
		expect(summary.paid).toBe(formatChfAmount(7_258));
		expect(summary.share).toBe("26 %");
		expect(summary.netCost).toBe(formatChfAmount(7_258 - 1_865));
	});

	it("une ligne par impôt, dans l'ordre cantonal, communal, paroissial, taxe personnelle, fédéral ; jamais à zéro", () => {
		expect(resultSummary(figures())!.components.map((row) => row.key)).toEqual(["cantonalTax", "municipalTax", "federalTax"]);
		const withChurch = resultSummary(figures({ components: { cantonalTax: 1, municipalTax: 2, churchTax: 3, personalTax: 0, federalTax: 4 } }))!;
		expect(withChurch.components.map((row) => row.key)).toEqual(["cantonalTax", "municipalTax", "churchTax", "federalTax"]);
		expect(withChurch.components.map((row) => row.amount)).toEqual([1, 2, 3, 4].map(formatChfAmount));
	});

	it("sans montant versé, aucun résumé", () => {
		expect(resultSummary(figures({ paid: 0, saving: 0 }))).toBeNull();
	});

	it("la trace porte la part et le coût net, avec l'opération effectuée (R4)", () => {
		const rows = summaryRows(figures(), { shareLabel: "Part", netCostLabel: "Coût net" });
		expect(rows.map((row) => row.label)).toEqual(["Part", "Coût net"]);
		expect(rows[0]!.amount).toBe("26 %");
		expect(rows[1]!.detail).toContain("−");
		expect(rows[1]!.amount).toBe(formatChfAmount(5_393));
	});
});

describe.each([
	{ calculator: "A1", id: PILLAR_3A_BUYBACK_ID },
	{ calculator: "A2", id: PILLAR_3A_TAX_SAVING_ID },
	{ calculator: "A3", id: LPP_BUYBACK_ID },
])("$calculator : cas exemple", ({ id }) => {
	const outcome = exampleOutcome(id);
	const amount = (text: string) => parseNumber(text.replace(/\s*CHF$/, ""))!;

	it("le résumé suit le montant calculé par le moteur", () => {
		const summary = outcome.summary!;
		expect(summary).toBeDefined();
		expect(amount(summary.paid) - amount(outcome.value)).toBe(amount(summary.netCost));
		expect(summary.components.length).toBeGreaterThanOrEqual(3);
		const total = summary.components.reduce((sum, row) => sum + amount(row.amount), 0);
		expect(total).toBe(amount(outcome.value));
	});

	it("la trace se termine par la part du versement et le coût net", () => {
		expect(outcome.breakdown.slice(-2).map((row) => row.label)).toEqual([fr.resultSummary.shareLabel, fr.resultSummary.netCostLabel]);
	});
});

describe("base de la part et du coût net : le montant retenu par le moteur (arbitrage du 17.10.2026)", () => {
	const cap = pillar3aTaxSavingPageData.smallContributionCap.value;
	const sentences = (summary: NonNullable<ReturnType<typeof resultSummary>>) =>
		[summary.capped ? fr.resultSummary.shareCapped : fr.resultSummary.share, summary.capped ? fr.resultSummary.netCostCapped : fr.resultSummary.netCost].map((template) => fillSummary(template, summary));

	it("versement égal au montant déductible : phrases simples", () => {
		const summary = readPillar3aTaxSavingForm(exampleFormValues(pillar3aTaxSaving), pillar3aTaxSavingPageData).summary!;
		expect(summary.capped).toBe(false);
		expect(sentences(summary)[0]).toBe(`soit ${summary.share} de votre versement`);
	});

	it("versement au-delà du plafond : la base est le montant déductible, et la phrase la nomme", () => {
		const values = { ...exampleFormValues(pillar3aTaxSaving), contribution: String(cap + 3_000) };
		const outcome = readPillar3aTaxSavingForm(values, pillar3aTaxSavingPageData);
		const summary = outcome.summary!;
		expect(summary.capped).toBe(true);
		expect(summary.paid).toBe(formatChfAmount(cap));
		const amount = (text: string) => parseNumber(text.replace(/\s*CHF$/, ""))!;
		expect(amount(summary.netCost)).toBe(cap - amount(outcome.value));
		const [share, netCost] = sentences(summary);
		expect(share).toBe(`soit ${summary.share} du montant déductible (${formatChfAmount(cap)})`);
		expect(netCost).toBe(`la part déductible de votre versement ne vous coûte que ${summary.netCost} cette année`);
	});
});
