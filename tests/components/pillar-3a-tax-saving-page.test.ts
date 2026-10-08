import { readFileSync } from "node:fs";

import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";

import { pillar3aBuyback } from "../../src/calculators/pension/pillar-3a-buyback";
import { pillar3aTaxSaving, pillar3aTaxSavingTexts } from "../../src/calculators/pension/pillar-3a-tax-saving";

/**
 * Pages d'A1 et d'A2 : rappels systématiques du résultat d'A2 (imposition au
 * retrait, A4 et A3 annoncés sans lien, règles 5 et 8), liens statiques entre
 * A1 et A2, correction de l'entrée notCovered n° 4 et de la FAQ 8 d'A1, lien
 * depuis l'article 1.
 */
const render = async (page: string, path: string): Promise<string> => {
	const { default: Page } = await import(`../../src/pages/prevoyance/${page}.astro`);
	const container = await AstroContainer.create({ astroConfig: { site: "https://calculateurs.ch" } });
	return container.renderToString(Page, { request: new Request(`https://calculateurs.ch${path}`) });
};

const decode = (html: string): string => html.replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"');

describe("page d'A2", () => {
	it("chaque résultat rappelle l'imposition au retrait, le 31 décembre et l'année de cessation ; A4 et A3 annoncés sans lien", async () => {
		const html = decode(await render("economie-impot-3a", pillar3aTaxSaving.slug));
		for (const reminder of pillar3aTaxSavingTexts.reminders) expect(html).toContain(reminder);
		expect(html).toMatch(/imposé à son retrait/);
		expect(html).toMatch(/retrait en capital LPP\/3a est en préparation/);
		expect(html).toMatch(/rachat LPP\./);
		// Aucun lien vers un calculateur qui n'existe pas encore
		expect(html).not.toMatch(/href="\/prevoyance\/(rachat-lpp|retrait-capital-lpp-3a)\/"/);
		// Rappels dans le bloc du résultat, sous la carte
		const result = html.slice(html.indexOf("data-result-card"), html.indexOf("detail-du-calcul"));
		expect(result).toContain(pillar3aTaxSavingTexts.reminders[0]!);
	});

	it("renvoie à A1 par un lien statique", async () => {
		const html = await render("economie-impot-3a", pillar3aTaxSaving.slug);
		expect(html).toContain(`href="${pillar3aBuyback.slug}"`);
	});
});

describe("page d'A1", () => {
	it("lien statique vers A2", async () => {
		const html = await render("rachat-3a-retroactif", pillar3aBuyback.slug);
		expect(html).toContain(`href="${pillar3aTaxSaving.slug}"`);
	});

	it("rachat des non-affiliés : pas encore couvert, s'adresser à sa fondation ou à son assurance 3a", () => {
		const entry = pillar3aBuyback.scope.notCovered[3]!;
		expect(entry.case).toMatch(/non affiliées.*pas encore couvert/);
		expect(entry.alternative).toEqual({ label: "Adressez-vous à votre fondation ou à votre assurance 3a." });
		const faq = pillar3aBuyback.faq[7]!;
		expect(faq.answer).toMatch(/ne couvre pas encore ce rachat : adressez-vous à votre fondation ou à votre assurance 3a\.$/);
		expect(faq.answer).not.toMatch(/A2/);
	});
});

describe("article 1", () => {
	it("la section « Calculez votre propre lacune » renvoie à A2", () => {
		const source = readFileSync(new URL("../../src/content/articles/rachat-3a-retroactif.mdx", import.meta.url), "utf8");
		const section = source.slice(source.indexOf("## Calculez votre propre lacune"));
		expect(section).toContain(`](${pillar3aTaxSaving.slug})`);
	});
});
