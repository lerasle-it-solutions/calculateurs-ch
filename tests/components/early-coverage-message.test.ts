import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";

import { getCantonData } from "../../src/data";
import type { TaxInput } from "../../src/lib/calculations/tax";
import { taxScalesFromBundle, type TaxScalesBundle } from "../../src/lib/calculations/tax-scales-bundle";
import { coverageStatusOf, type CoverageTexts } from "../../src/lib/display/coverage";
import type { StatusLink } from "../../src/lib/display/result-card";

/**
 * Message hors périmètre affiché tôt, dans A1 et A2 : dès le canton, la commune
 * et l'état civil (nombre d'enfants à sa valeur par défaut, 0), sans aucun
 * revenu, le message de couverture et le lien officiel sont établis à partir des
 * seules données que la page embarque. Un retour à un cas couvert l'efface.
 */
type PageData = {
	bundle: TaxScalesBundle;
	municipalities: Record<string, { ofsId: number; canton: TaxInput["canton"] }>;
	officialCalculators: Record<string, StatusLink>;
	texts: CoverageTexts;
};

const PAGES = [
	{ calculator: "A1", page: "rachat-3a-retroactif", dataId: "pillar3a-data" },
	{ calculator: "A2", page: "economie-impot-3a", dataId: "pillar3a-saving-data" },
];

const renderPageData = async (page: string, dataId: string): Promise<PageData> => {
	const { default: Page } = await import(`../../src/pages/prevoyance/${page}.astro`);
	const container = await AstroContainer.create({ astroConfig: { site: "https://calculateurs.ch" } });
	const html = await container.renderToString(Page, { request: new Request(`https://calculateurs.ch/prevoyance/${page}/`) });
	const json = html.match(new RegExp(`<script type="application/json" id="${dataId}">([\\s\\S]*?)</script>`))?.[1];
	expect(json, `${page} : données absentes`).toBeDefined();
	return JSON.parse(json!) as PageData;
};

/** Ce que le script de la page établit avec canton, commune et état civil seulement. */
const earlyStatus = (data: PageData, municipality: string, maritalStatus: TaxInput["maritalStatus"]) => {
	const { ofsId, canton } = data.municipalities[municipality]!;
	return coverageStatusOf({ canton, maritalStatus, children: 0 }, taxScalesFromBundle(data.bundle, ofsId), data.texts, data.officialCalculators);
};

const official = getCantonData("VS").coverage?.officialCalculator;
const officialUrl = official && "url" in official ? official.url : undefined;

describe.each(PAGES)("$calculator : message hors périmètre sans les revenus", ({ page, dataId }) => {
	it("Sion, couple marié : message du canton et lien officiel", async () => {
		const data = await renderPageData(page, dataId);
		const status = earlyStatus(data, "Sion (VS)", "married");
		expect(status?.text).toBe(data.texts.outOfScope.VS);
		expect(status?.link?.url).toBe(officialUrl);
		expect(status?.short).toBe(data.texts.outOfScopeShort);
	});

	it("Brig-Glis, personne seule : message de la commune et lien officiel", async () => {
		const data = await renderPageData(page, dataId);
		const status = earlyStatus(data, "Brig-Glis (VS)", "single");
		expect(status?.text).toBe(data.texts.outOfScopeMunicipality["Brig-Glis"]);
		expect(status?.text).toContain("Brig-Glis");
		expect(status?.link?.url).toBe(officialUrl);
	});

	it("retour à un cas couvert : plus de message (Sion, personne seule ; Lausanne, couple)", async () => {
		const data = await renderPageData(page, dataId);
		expect(earlyStatus(data, "Sion (VS)", "single")).toBeNull();
		expect(earlyStatus(data, "Lausanne (VD)", "married")).toBeNull();
	});
});
