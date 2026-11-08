import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";

import { exampleFormValues } from "../../src/calculators/field-values";
import { capitalWithdrawal, capitalWithdrawalTexts, capitalWithdrawalYear } from "../../src/calculators/pension/capital-withdrawal";
import { capitalWithdrawalPageData } from "../../src/calculators/pension/capital-withdrawal-page-data";
import { lppBuyback } from "../../src/calculators/pension/lpp-buyback";
import { getFederalData, sourceRegistry } from "../../src/data";
import { readCapitalWithdrawalForm } from "../../src/lib/display/capital-withdrawal-core";
import { checkMeta, repeatsTitle } from "../../src/lib/seo/meta-rules";

/**
 * A4 — définition et page (W11, 7.11.2026) : v1 pour les personnes seules sans
 * enfant, bornes légales lues dans les données, page construite sur le cas
 * exemple, refus propres quand une valeur est à relever, comparaison des
 * échelonnements hors du cœur. Les montants ne sont pas comparés ici aux
 * relevés de l'AFC (tests/calculations/capital-withdrawal-references.engine.test.ts).
 */
const federal = getFederalData(capitalWithdrawalYear);
const lock = federal.lppBuyback!.lockPeriodYears.value;
const steps = federal.capitalWithdrawal!.lppMaximumSteps.value;
const firstPartial = federal.capitalWithdrawal!.lppMinimumFirstPartialPercent.value;

const decode = (html: string): string => html.replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"');
const render = async (): Promise<string> => {
	const { default: Page } = await import("../../src/pages/prevoyance/retrait-capital-lpp-3a.astro");
	const container = await AstroContainer.create({ astroConfig: { site: "https://calculateurs.ch" } });
	return decode(await container.renderToString(Page, { request: new Request(`https://calculateurs.ch${capitalWithdrawal.slug}`) }));
};

/** Le formulaire de l'exemple, saisies remplacées. */
const read = (overrides: Record<string, string>) =>
	readCapitalWithdrawalForm({ ...exampleFormValues(capitalWithdrawal), ...overrides }, capitalWithdrawalPageData);

describe("définition d'A4", () => {
	it("URL de CLAUDE.md § 7, variantes A3 et A2, sources du retrait en capital au registre", () => {
		expect(capitalWithdrawal.id).toBe("pension.capital-withdrawal");
		expect(capitalWithdrawal.slug).toBe("/prevoyance/retrait-capital-lpp-3a/");
		expect(capitalWithdrawal.variants).toEqual(["pension.lpp-buyback", "pension.pillar-3a-tax-saving"]);
		for (const id of ["fedlex-lifd", "fedlex-lhid", "fedlex-lpp", "opp3-art-7a", "afc-circular-18a", "estv-capital-annuity-conversion", "estv-capital-benefits-dossier-2025"]) {
			expect(capitalWithdrawal.sourceIds, id).toContain(id);
			expect(sourceRegistry().has(id), id).toBe(true);
		}
		expect(capitalWithdrawal.sourceIds).not.toContain("estv-tax-calculator");
	});

	it("méta-description aux cibles de Bing, sans reprendre le title", () => {
		expect(checkMeta(capitalWithdrawal.metaTitle, capitalWithdrawal.metaDescription)).toEqual({ errors: [], warnings: [] });
		expect(repeatsTitle(capitalWithdrawal.metaTitle, capitalWithdrawal.metaDescription)).toBe(false);
	});

	it("couples et familles hors périmètre, avec l'addition des retraits des époux et ses articles", () => {
		const couples = capitalWithdrawal.scope.notCovered.find((entry) => entry.case.startsWith("Couples mariés et familles"));
		expect(couples?.case).toContain("Les retraits des deux époux d’une même année s’additionnent");
		expect(couples?.case).toContain("art. 9 al. 1 LIFD");
		expect(couples?.case).toContain("art. 3 al. 3 LHID");
		expect(couples?.alternative).toBeDefined();
	});

	it("bornes légales lues dans les données : délai de blocage, étapes LPP, premier retrait partiel", () => {
		const all = JSON.stringify([capitalWithdrawal, capitalWithdrawalTexts]);
		expect(all).not.toMatch(/trois ans|trois étapes/);
		const vigilance = capitalWithdrawal.vigilance!;
		expect(vigilance[1]!.summary).toContain(`dans les ${lock} ans`);
		expect(vigilance[3]!.summary).toContain(`${steps} étapes au plus, la première d’au moins ${firstPartial} %`);
		expect(capitalWithdrawalTexts.scenarios.rules).toContain(`${steps} étapes au plus`);
	});

	it("avertissement renforcé de la décision irréversible, et rachat LPP récent lié à A3", () => {
		const [irreversible, buyback] = capitalWithdrawal.vigilance!;
		expect(irreversible!.level).toBe("warning");
		expect(irreversible!.summary).toMatch(/ne se défait pas/);
		expect(irreversible!.summary).toMatch(/professionnel/);
		expect(buyback!.level).toBe("warning");
		expect(buyback!.text).toContain("art. 79b al. 3 LPP");
		expect(buyback!.link?.url).toBe(lppBuyback.slug);
	});
});

describe("lecture du formulaire", () => {
	it("le cas exemple rend un impôt et la trace, et laisse au module la comparaison", () => {
		const outcome = read({});
		expect(outcome.status).toBeNull();
		expect(outcome.value).toMatch(/^\d[\d’]* CHF$/);
		expect(outcome.breakdown.length).toBeGreaterThan(0);
		expect(outcome.shown?.engine.input.withdrawals).toHaveLength(2);
	});

	it("un couple ou une famille reçoit le message de couverture avant toute saisie de montant (P5)", () => {
		const cases: Record<string, string>[] = [{ maritalStatus: "married" }, { children: "1" }, { maritalStatus: "married", lppCapital: "" }];
		for (const overrides of cases) {
			const outcome = read(overrides);
			expect(outcome.value).toBe("—");
			expect(outcome.status?.kind).toBe("exclusion");
			expect(outcome.status?.text).toContain("les retraits des deux époux d’une même année s’additionnent");
		}
	});

	it("Fribourg, Genève et le Valais, relevés AFC du 8.11.2026 intégrés : un montant et sa trace", () => {
		const cases: Record<string, string>[] = [{ municipality: "Fribourg" }, { municipality: "Genève" }, { municipality: "Sion", sex: "male", age: "65" }];
		for (const overrides of cases) {
			const outcome = read(overrides);
			expect(outcome.status, overrides.municipality).toBeNull();
			expect(outcome.value, overrides.municipality).not.toBe("—");
			expect(outcome.breakdown.length, overrides.municipality).toBeGreaterThan(0);
		}
	});

	it("une valeur encore à relever : refus propre, donnée manquante, sans chiffre (R3)", () => {
		// Valais privé du stade des bornes du taux, dans le fichier de données de la page
		const bundle = capitalWithdrawalPageData.capitalWithdrawal!;
		const valais = bundle.cantons.VS!;
		if (valais.model.type !== "periodicBenefitRate") throw new Error("Modèle valaisan attendu.");
		const data = {
			...capitalWithdrawalPageData,
			capitalWithdrawal: { ...bundle, cantons: { ...bundle.cantons, VS: { ...valais, model: { ...valais.model, rateBounds: { pending: "fictif", sourceId: null } } } } },
		};
		const outcome = readCapitalWithdrawalForm({ ...exampleFormValues(capitalWithdrawal), municipality: "Sion", sex: "male", age: "65" }, data);
		expect(outcome.value).toBe("—");
		expect(outcome.status?.text).toBe(capitalWithdrawalTexts.missingData);
		expect(outcome.breakdown).toEqual([]);
	});

	it("Valais : l'âge et le sexe sont demandés avant le calcul", () => {
		expect(read({ municipality: "Sion" }).status?.text).toBe(capitalWithdrawalTexts.profileMissing);
	});

	it("sans capital LPP ni compte 3a, un texte neutre le demande", () => {
		const outcome = read({ lppCapital: "", pillar3aAccounts: "0" });
		expect(outcome.status).toEqual({ text: capitalWithdrawalTexts.capitalMissing, short: expect.any(String), kind: "missing" });
	});
});

describe("page d'A4", () => {
	it("rend le montant du cas exemple, les deux tableaux et le calendrier le moins imposé", async () => {
		const html = await render();
		expect(html).toContain(read({}).value);
		expect(html).toContain('id="capital-withdrawal-years"');
		expect(html).toContain('id="capital-withdrawal-scenarios"');
		expect(html).toMatch(/id="capital-withdrawal-optimal"[^>]*>Calendrier le moins imposé/);
	});

	it("âge et sexe masqués hors du Valais, affichés quand la commune est valaisanne", async () => {
		const html = await render();
		for (const name of ["sex", "age"]) {
			const field = html.indexOf(`name="${name}"`);
			// Bloc conditionnel du champ : la dernière condition d'affichage avant lui
			const start = html.lastIndexOf("data-shown-when", field);
			const wrapper = html.slice(start, html.indexOf(">", start));
			expect(wrapper, name).toContain(JSON.stringify([["canton", "VS"]]));
			expect(wrapper, name).toMatch(/\shidden/);
		}
	});

	it("lien vers A3 depuis le point de vigilance du rachat récent, et variantes", async () => {
		const html = await render();
		expect(html).toContain(`href="${lppBuyback.slug}"`);
	});

});
