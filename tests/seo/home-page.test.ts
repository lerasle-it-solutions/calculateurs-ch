import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { beforeAll, describe, expect, it } from "vitest";

import { allCalculators, isPublished } from "../../src/calculators/catalog";
import { exampleOutcome } from "../../src/calculators/example-outcomes";
import { exampleFormValues } from "../../src/calculators/field-values";
import { COUNTDOWN_STARTS_ON, contributionDeadline, countdownDays, heroOutcome, proofFigures, refineUrl } from "../../src/calculators/home";
import { PILLAR_3A_TAX_SAVING_ID, pillar3aTaxSaving } from "../../src/calculators/pension/pillar-3a-tax-saving";
import { formatVerificationDate, siteVerifiedOn } from "../../src/calculators/site-verification";
import { fr } from "../../src/i18n/fr";
import { countdownMessage } from "../../src/lib/display/countdown";
import { decodeShareState } from "../../src/lib/display/share-state";
import { formatNumberTyping } from "../../src/lib/format/amount-input";
import { decodeEntities, renderAllPages } from "./site-pages";

/**
 * Accueil calculant (prompt UX du 17.10.2026) : héros sur le cas exemple d'A2,
 * calculé au build ; bande de preuves et cartes chiffrées depuis les données et
 * le moteur, jamais tapées (R3).
 */
let home: string;
beforeAll(async () => {
	home = (await renderAllPages()).find((page) => page.route === "/")!.html;
});
const text = (html: string) => decodeEntities(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
/** Espaces, insécables compris, ramenés à une espace ordinaire : comme dans `text`. */
const plain = (value: string) => value.replace(/\s+/g, " ");
const block = (attribute: string) => home.match(new RegExp(`<(section|div)\\b[^>]*\\s${attribute}[\\s\\S]*?</\\1>`))?.[0] ?? "";

describe("héros", () => {
	it("H1 et trois champs pré-remplis avec le cas exemple d'A2", () => {
		expect(text(home.match(/<h1\b[\s\S]*?<\/h1>/)![0])).toBe(fr.home.heroTitle);
		const example = exampleFormValues(pillar3aTaxSaving);
		const valueOf = (name: string) => home.match(new RegExp(`<input\\b[^>]*\\sname="${name}"[^>]*>`))?.[0].match(/\svalue="([^"]*)"/)?.[1];
		expect(decodeEntities(valueOf("municipality")!)).toBe(example.municipality);
		for (const name of ["cantonalTaxableIncome", "contribution"]) {
			expect(decodeEntities(valueOf(name)!)).toBe(formatNumberTyping(example[name]!, example[name]!.length, true).text);
		}
	});

	it("la carte affiche le montant du cas exemple d'A2, calculé au build", () => {
		expect(heroOutcome().value).toBe(exampleOutcome(PILLAR_3A_TAX_SAVING_ID).value);
		expect(text(home.match(/<output\b[\s\S]*?<\/output>/)![0])).toContain(plain(heroOutcome().value));
	});

	it("un seul bouton, vers le calculateur, saisies dans le fragment", () => {
		const href = decodeEntities(home.match(/<a\b[^>]*\sdata-refine[^>]*\shref="([^"]+)"|<a\b[^>]*\shref="([^"]+)"[^>]*\sdata-refine/)!.slice(1).find(Boolean)!);
		expect(href).toBe(refineUrl());
		expect(href.startsWith(`${pillar3aTaxSaving.slug}#`)).toBe(true);
		expect(decodeShareState(href.slice(href.indexOf("#")))?.municipality).toBe(exampleFormValues(pillar3aTaxSaving).municipality);
	});

	it("le moteur se charge à la première interaction : le héros déclare le fichier de données", () => {
		expect(home).toMatch(/data-calculator-root[^>]*data-tax-data="\/donnees\/calcul\/baremes-\d{4}\.[0-9a-f]{10}\.json"/);
	});
});

describe("compte à rebours", () => {
	it("absent tant que la date limite n'est pas relevée dans les données (R3)", () => {
		if (contributionDeadline() === null) expect(home).not.toContain("data-countdown");
		else expect(home).toContain("data-countdown");
	});

	it("rendu masqué au build, gabarit et source tirés de la date fournie (valeur fictive du test)", async () => {
		const { default: Countdown } = await import("../../src/components/home/Countdown.astro");
		const container = await AstroContainer.create();
		const html = await container.renderToString(Countdown, { props: { deadline: { monthDay: "12-20", sourceId: "afc-circular-18a", year: 2030 }, startsOn: "10-01" } });
		expect(html).toMatch(/<p\b[^>]*data-countdown[^>]*hidden/);
		expect(decodeEntities(html)).toContain(fr.home.countdown(2030, "20 décembre"));
		expect(html).toContain('data-deadline="12-20"');
	});

	it("30 décembre, 31 décembre, 1er janvier : jours restants avec le conseil, dernier jour, puis masqué", () => {
		const deadline = contributionDeadline() ?? { monthDay: "12-31", year: 2026 };
		const templates = { days: fr.home.countdown(deadline.year, "31 décembre"), lastDay: fr.home.countdownLastDay(deadline.year) };
		const message = (date: Date) => countdownMessage(date, deadline.monthDay, COUNTDOWN_STARTS_ON, templates);
		const december30 = message(new Date(deadline.year, 11, 30, 9));
		expect(december30).toBe(templates.days.replace("{days}", "2"));
		expect(december30).toMatch(/Comptez quelques jours ouvrables pour que le virement soit crédité\.$/);
		expect(message(new Date(deadline.year, 11, 31, 9))).toBe(`Dernier jour pour que votre versement 3a ${deadline.year} soit crédité.`);
		expect(message(new Date(deadline.year + 1, 0, 1, 9))).toBeNull();
	});

	it("du 1er octobre à la date limite incluse, jours comptés dans le navigateur", () => {
		expect(countdownDays(new Date(2026, 8, 30), "12-31")).toBeNull();
		expect(countdownDays(new Date(2026, 9, 1), "12-31")).toBe(92);
		expect(countdownDays(new Date(2026, 11, 31, 23, 0), "12-31")).toBe(1);
		expect(countdownDays(new Date(2027, 0, 1), "12-31")).toBeNull();
	});
});

describe("bande de preuves", () => {
	it("cantons, communes et date de vérification calculés au build, lien vers le code source", () => {
		const proof = text(block("data-home-proof"));
		const figures = proofFigures();
		expect(proof).toContain(plain(fr.home.proofCantons(figures.cantons)));
		expect(proof).toContain(plain(fr.home.proofMunicipalities(figures.municipalities)));
		expect(proof).toContain(formatVerificationDate(siteVerifiedOn()));
		expect(proof).not.toMatch(/à jour|garanti/i);
		expect(block("data-home-proof")).toContain(`href="${fr.site.repositoryUrl}"`);
	});
});

describe("cartes des calculateurs", () => {
	it("chaque calculateur publié : sa question et son résultat type, calculé sur son cas exemple", () => {
		const cards = text(block('id="calculateurs"'));
		for (const definition of allCalculators.filter(isPublished)) {
			expect(definition.question, definition.id).toBeDefined();
			expect(cards).toContain(plain(definition.question!));
			expect(cards).toContain(plain(exampleOutcome(definition.id).value));
		}
	});
});

describe("pourquoi ces chiffres sont justes, guide", () => {
	it("trois colonnes", () => {
		expect([...block("data-home-why").matchAll(/<h3\b/g)]).toHaveLength(3);
	});

	it("le guide mis en avant, avec sa date de mise à jour et sa durée de lecture", () => {
		const guide = block("data-home-guide");
		expect(guide).toMatch(/<time datetime="\d{4}-\d{2}-\d{2}"/);
		expect(text(guide)).toMatch(/\d+ min/);
	});
});
