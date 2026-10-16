import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";

import { getCantonData } from "../../src/data";
import type { TaxInput } from "../../src/lib/calculations/tax";
import { taxScalesFromBundle, type TaxScalesBundle } from "../../src/lib/calculations/tax-scales-bundle";
import { coverageStatusOf, type CoverageTexts } from "../../src/lib/display/coverage";
import { applyResult, coverageOnly, type ResultDetail, type StatusLink } from "../../src/lib/display/result-card";

/**
 * Limite de couverture au moment du choix (revue UX du 16.10.2026) : dès que la
 * commune saisie est hors couverture, le message et le lien vers la calculette
 * du canton s'affichent sous le champ commune, et le statut dans la carte
 * résultat. La couverture est lue dans les données que la page embarque
 * (src/calculators/tax-coverage.ts, src/data/), jamais recopiée ici.
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
	{ calculator: "A3", page: "rachat-lpp", dataId: "lpp-buyback-data" },
];

const renderPage = async (page: string): Promise<string> => {
	const { default: Page } = await import(`../../src/pages/prevoyance/${page}.astro`);
	const container = await AstroContainer.create({ astroConfig: { site: "https://calculateurs.ch" } });
	return container.renderToString(Page, { request: new Request(`https://calculateurs.ch/prevoyance/${page}/`) });
};

const pageData = (html: string, dataId: string): PageData =>
	JSON.parse(html.match(new RegExp(`<script type="application/json" id="${dataId}">([\\s\\S]*?)</script>`))![1]!) as PageData;

/** Statut établi par le script de la page dès la commune choisie : personne seule, sans enfant. */
const statusFor = (data: PageData, municipality: string) => {
	const { ofsId, canton } = data.municipalities[municipality]!;
	return coverageStatusOf({ canton, maritalStatus: "single", children: 0 }, taxScalesFromBundle(data.bundle, ofsId), data.texts, data.officialCalculators);
};

const slot = (textContent = "") => ({ hidden: true, textContent });
/** Bloc sous le champ : le conteneur sert aussi d'emplacement du montant (ResultCard.astro). */
const fieldSlots = () => {
	const message = slot();
	return { value: message, message, messageText: slot(), messageLink: { ...slot(), href: "" } };
};
const applyFieldCoverage = (slots: ReturnType<typeof fieldSlots>, detail: ResultDetail) => applyResult(slots, coverageOnly(detail));
const cardSlots = () => ({ value: { ...slot("—"), hidden: false }, message: slot(), messageText: slot(), messageLink: { ...slot(), href: "" } });

const official = getCantonData("VS").coverage?.officialCalculator;
const officialUrl = official && "url" in official ? official.url : undefined;

describe.each(PAGES)("$calculator : couverture du Valais au choix de la commune", ({ page, dataId }) => {
	it("Brig-Glis, non couverte : message et lien sous le champ, statut dans la carte", async () => {
		const data = pageData(await renderPage(page), dataId);
		const status = statusFor(data, "Brig-Glis (VS)");
		expect(status?.kind).toBe("coverage");

		const field = fieldSlots();
		applyFieldCoverage(field, { value: "—", status });
		expect(field.message.hidden).toBe(false);
		expect(field.messageText.textContent).toBe(data.texts.outOfScopeMunicipality["Brig-Glis"]);
		expect(field.messageLink.hidden).toBe(false);
		expect(field.messageLink.href).toBe(officialUrl);

		const card = cardSlots();
		applyResult(card, { value: "—", status });
		expect(card.message.hidden).toBe(false);
		expect(card.messageText.textContent).toBe(field.messageText.textContent);
	});

	it("Sion, couverte : aucun message sous le champ, et un message précédent s'efface", async () => {
		const data = pageData(await renderPage(page), dataId);
		expect(statusFor(data, "Sion (VS)")).toBeNull();

		const field = fieldSlots();
		applyFieldCoverage(field, { value: "—", status: statusFor(data, "Brig-Glis (VS)") });
		applyFieldCoverage(field, { value: "—", status: statusFor(data, "Sion (VS)") });
		expect(field.message.hidden).toBe(true);
	});

	it("le champ commune porte le message, masqué au rendu et annoncé par aria-describedby", async () => {
		const html = await renderPage(page);
		const input = html.match(/<input\b[^>]*\bname="municipality"[^>]*>/)?.[0];
		expect(input).toBeDefined();
		const id = input!.match(/\sid="([^"]+)"/)![1]!;
		expect(input).toMatch(new RegExp(`aria-describedby="[^"]*\\b${id}-coverage\\b`));
		const after = html.slice(html.indexOf(input!));
		expect(after).toMatch(new RegExp(`<div\\b[^>]*id="${id}-coverage"[^>]*\\shidden`));
		expect(after.indexOf(`id="${id}-coverage"`)).toBeLessThan(after.indexOf("</form>"));
	});
});

describe("message sous le champ", () => {
	it("ignore les statuts qui ne relèvent pas de la couverture", () => {
		const field = fieldSlots();
		applyFieldCoverage(field, { value: "—", status: { text: "Saisie à corriger.", short: "À corriger" } });
		expect(field.message.hidden).toBe(true);
	});
});
