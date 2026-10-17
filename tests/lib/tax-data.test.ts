import { describe, expect, it } from "vitest";

import { lppBuyback, lppBuybackTexts, lppBuybackYear } from "../../src/calculators/pension/lpp-buyback";
import { lppBuybackPageData, lppBuybackPagePart } from "../../src/calculators/pension/lpp-buyback-page-data";
import { pillar3aBuyback, pillar3aBuybackTexts, pillar3aBuybackYear } from "../../src/calculators/pension/pillar-3a-buyback";
import { pillar3aBuybackPageData, pillar3aBuybackPagePart } from "../../src/calculators/pension/pillar-3a-buyback-page-data";
import { pillar3aTaxSaving, pillar3aTaxSavingTexts, pillar3aTaxSavingYear } from "../../src/calculators/pension/pillar-3a-tax-saving";
import { pillar3aTaxSavingPageData, pillar3aTaxSavingPagePart } from "../../src/calculators/pension/pillar-3a-tax-saving-page-data";
import { pageDataJson } from "../../src/calculators/page-data";
import { taxDataFileJson, taxDataFileName, taxDataFileUrl } from "../../src/calculators/tax-data-file";
import { taxEngineCoverage } from "../../src/calculators/tax-coverage";
import { getMunicipalMultipliers } from "../../src/data";
import { getGrossToTaxableRuleSet } from "../../src/data/gross-to-taxable";
import { getTaxScalesBundle } from "../../src/data/tax-scales";
import { hydratePageData, type HouseholdPagePart, type TaxDataFile } from "../../src/lib/display/tax-data";

/**
 * Étape 0 de l'accueil calculant : les barèmes sortent du HTML. La page garde
 * sa partie propre en JSON, le fichier de données de l'année porte les barèmes
 * de toutes les communes. Réunies dans le navigateur, elles doivent redonner
 * exactement les données que la page embarquait : mêmes barèmes, mêmes
 * communes, mêmes messages. Aucune valeur attendue n'est recopiée : tout est
 * relu dans src/data/.
 */
const PAGES = [
	{ calculator: "A1", definition: pillar3aBuyback, year: pillar3aBuybackYear, texts: pillar3aBuybackTexts, part: pillar3aBuybackPagePart, data: pillar3aBuybackPageData },
	{ calculator: "A2", definition: pillar3aTaxSaving, year: pillar3aTaxSavingYear, texts: pillar3aTaxSavingTexts, part: pillar3aTaxSavingPagePart, data: pillar3aTaxSavingPageData },
	{ calculator: "A3", definition: lppBuyback, year: lppBuybackYear, texts: lppBuybackTexts, part: lppBuybackPagePart, data: lppBuybackPageData },
];

/** Ce que le navigateur reçoit : le JSON de la page et le corps du fichier de données. */
const received = (part: HouseholdPagePart, year: number) => ({
	page: JSON.parse(pageDataJson(part)) as HouseholdPagePart,
	file: JSON.parse(taxDataFileJson(year)) as TaxDataFile,
});

describe.each(PAGES)("$calculator : données de la page réunies dans le navigateur", ({ definition, year, texts, part, data }) => {
	it("le JSON de la page et le fichier de données redonnent les données de la construction", () => {
		const { page, file } = received(part, year);
		expect(hydratePageData(page, file)).toEqual(data);
	});

	it("barèmes, communes et messages : ceux que la page embarquait, relus dans src/data/", () => {
		const cantons = definition.scope.cantonsCovered as Parameters<typeof getTaxScalesBundle>[1];
		const bundle = getTaxScalesBundle(year, cantons);
		expect(data.bundle).toEqual(bundle);
		expect(data.municipalities).toEqual(
			Object.fromEntries(
				(getMunicipalMultipliers()?.multipliers ?? [])
					.filter((entry) => cantons.includes(entry.canton))
					.map((entry) => [`${entry.municipality} (${entry.canton})`, { ofsId: entry.bfsId, canton: entry.canton }]),
			),
		);
		expect(data.texts.outOfScopeMunicipality).toEqual(
			Object.fromEntries(
				bundle.municipalities.flatMap(({ coverage }) =>
					coverage?.municipality === undefined ? [] : [[coverage.municipality, texts.outOfScopeMunicipality(coverage.municipality)]],
				),
			),
		);
		const estimator = (() => {
			try {
				return getGrossToTaxableRuleSet(year, cantons);
			} catch {
				return null;
			}
		})();
		expect(data.estimator).toEqual(estimator);
	});

	it("la page ne porte ni barème, ni commune, ni règle de l'estimateur", () => {
		const json = pageDataJson(part);
		expect(Object.keys(JSON.parse(json))).not.toEqual(expect.arrayContaining(["bundle"]));
		for (const key of ["bundle", "municipalities", "estimator", "outOfScopeMunicipality\""]) expect(json).not.toContain(`"${key}`);
		expect(part.taxDataUrl).toBe(taxDataFileUrl(year));
	});
});

describe("fichier de données : un seul pour tous les cantons", () => {
	it("contient chaque canton couvert par le moteur, et chacune de ses communes", () => {
		const year = pillar3aTaxSavingYear;
		const file = JSON.parse(taxDataFileJson(year)) as TaxDataFile;
		const cantons = taxEngineCoverage().cantonsCovered;
		expect(Object.keys(file.bundle.cantons).sort()).toEqual([...cantons].sort());
		const expected = (getMunicipalMultipliers()?.multipliers ?? []).filter((entry) => (cantons as string[]).includes(entry.canton)).map((entry) => entry.bfsId);
		expect(file.bundle.municipalities.map((entry) => entry.ofsId)).toEqual(expected);
	});

	it("les trois calculateurs d'une même année demandent le même fichier", () => {
		const urls = new Map<number, Set<string>>();
		for (const { year, part } of PAGES) urls.set(year, (urls.get(year) ?? new Set()).add(part.taxDataUrl));
		for (const set of urls.values()) expect(set.size).toBe(1);
	});

	it("le nom est haché sur le contenu : il change si une donnée change", () => {
		const year = pillar3aTaxSavingYear;
		expect(taxDataFileName(year)).toMatch(new RegExp(`^baremes-${year}\\.[0-9a-f]{10}\\.json$`));
	});
});
