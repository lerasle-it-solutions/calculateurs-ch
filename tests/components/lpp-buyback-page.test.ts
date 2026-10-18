import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";

import { lppBuyback, lppBuybackLockPeriod, lppBuybackTexts, lppBuybackYear } from "../../src/calculators/pension/lpp-buyback";
import { getCantonData, getMunicipalMultipliers } from "../../src/data";
import { getTaxScales } from "../../src/data/tax-scales";
import { ROMANDE_CANTONS } from "../../src/calculators/cantons";
import { taxDataFileJson, taxDataFileUrl } from "../../src/calculators/tax-data-file";
import type { TaxInput } from "../../src/lib/calculations/tax";
import { formatChfAmount } from "../../src/lib/display/amounts";
import { displayLppBuyback, type LppBuybackDisplayTexts } from "../../src/lib/display/lpp-buyback";

/**
 * A3 — définition et page (W09, prompt 4a) : textes de la fiche corrigée du
 * 12.10.2026, délai de blocage tiré des données, avertissements toujours
 * affichés, tableaux des scénarios et du délai.
 */
const lock = lppBuybackLockPeriod.value;

const decode = (html: string): string => html.replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"');
const render = async (): Promise<string> => {
	const { default: Page } = await import("../../src/pages/prevoyance/rachat-lpp.astro");
	const container = await AstroContainer.create({ astroConfig: { site: "https://calculateurs.ch" } });
	return decode(await container.renderToString(Page, { request: new Request(`https://calculateurs.ch${lppBuyback.slug}`) }));
};

describe("définition d'A3", () => {
	it("reprend la fiche : URL, méta-description, 8 hypothèses, 9 questions, variantes A1, A2 et A4", () => {
		expect(lppBuyback.id).toBe("pension.lpp-buyback");
		expect(lppBuyback.slug).toBe("/prevoyance/rachat-lpp/");
		expect(lppBuyback.metaDescription).toBe(
			// Texte de la fiche, typographie de docs/editorial-style.md § 3.3 (18.10.2026)
			"Rachat LPP\u202f: estimez l’économie d’impôt d’un rachat dans votre caisse de pension, en une fois ou échelonné, et vérifiez le délai de blocage.",
		);
		expect(lppBuyback.scope.assumptions).toHaveLength(8);
		expect(lppBuyback.faq).toHaveLength(9);
		expect(lppBuyback.variants).toEqual(["pension.pillar-3a-buyback", "pension.pillar-3a-tax-saving", "pension.capital-withdrawal"]);
		for (const id of ["fedlex-lpp", "fedlex-opp2", "fedlex-lifd", "fedlex-lhid", "atf-142-ii-399", "estv-base-data-module"]) {
			expect(lppBuyback.sourceIds, id).toContain(id);
		}
	});

	it("les six entrées fixes de « ne couvre pas », avec leurs alternatives", () => {
		const cases = lppBuyback.scope.notCovered;
		const of = (start: string) => cases.find((entry) => entry.case.startsWith(start))?.alternative;
		expect(of("Calcul du potentiel de rachat")).toEqual({ label: "Le certificat de prévoyance annuel, ou une demande écrite à la caisse." });
		expect(of("Imposition du capital à la sortie")).toEqual({
			// Texte réécrit le 18.10.2026 (docs/editorial-style.md), même renvoi
			label: "Le calculateur du retrait en capital LPP/3a est en préparation. D’ici là, voyez la méthodologie.",
			url: "/methodologie/#rachat-lpp",
		});
		expect(of("Rachat consécutif à un divorce")).toBeDefined();
		expect(of("Personnes imposées à la source")).toEqual({ label: "Renseignez-vous auprès de l’administration fiscale de votre canton." });
		expect(of("Comparaison entre un rachat LPP et un versement 3a")).toBe("pension.pillar-3a-tax-saving");
		expect(of("Rendement du capital racheté")).toEqual({ label: "Le certificat de prévoyance, ou une simulation demandée à la caisse." });
	});

	it("le délai de blocage vient des données partout ; « 24 ans » et « cinq ans » restent dans la phrase de leur article", () => {
		const all = JSON.stringify([lppBuyback, lppBuybackTexts]);
		expect(all).not.toMatch(/trois ans/);
		expect(lppBuyback.scope.assumptions[5]).toContain(`dans les ${lock} ans`);
		expect(lppBuyback.faq[2]!.answer).toContain(`délai de blocage de ${lock} ans`);
		expect(lppBuyback.faq[3]!.question).toContain(`dans les ${lock} ans`);
		expect(lppBuybackTexts.warnings[0]!.title).toBe(`Délai de blocage de ${lock} ans.`);
		expect(lppBuybackTexts.calendar.classes.join(" ")).toContain(`au moins ${lock + 1} années`);
		expect(lppBuyback.scope.assumptions[0]).toMatch(/depuis 24 ans, [^;]*\(art\. 60a al\. 2\)/);
		expect(lppBuyback.scope.assumptions[0]).toMatch(/pendant cinq ans, [^;]*\(art\. 60b\)/);
		expect(lppBuyback.faq[5]!.answer).toMatch(/24 ans[^.]*\(art\. 60a (al\. 2 et 3 )?OPP 2\)/);
	});
});

describe("page d'A3", () => {
	it("cinq avertissements toujours rendus, tableaux des scénarios et du délai, mode « salaire brut » après le revenu fédéral", async () => {
		const html = await render();
		for (const warning of lppBuybackTexts.warnings) {
			expect(html).toContain(warning.title);
			expect(html).toContain(warning.text);
		}
		expect(html).toContain('id="lpp-buyback-scenarios"');
		expect(html).toContain('id="lpp-buyback-calendar"');
		const form = html.slice(html.indexOf("<form"), html.indexOf("</form>"));
		expect(form.indexOf('name="federalTaxableIncome"')).toBeLessThan(form.indexOf("data-estimator"));
		// Libellés de la trace : dans le fichier de données que la page déclare (src/lib/build/browser-trace-labels.ts)
		expect(html).toContain(`data-tax-data="${taxDataFileUrl(lppBuybackYear)}"`);
		expect((JSON.parse(taxDataFileJson(lppBuybackYear)) as { traceLabels: Record<string, string[]> }).traceLabels).toHaveProperty("trace-labels-lpp-buyback");
		// Avertissements hors de la carte : visibles sans résultat
		const warnings = html.slice(html.indexOf('id="lpp-buyback-warnings"') - 200);
		expect(warnings).not.toMatch(/^[^>]*hidden/);
	});
});

describe("affichage d'A3", () => {
	const ofsId = (getMunicipalMultipliers()?.multipliers ?? []).find((entry) => entry.municipality === "Lausanne" && entry.canton === "VD")!.bfsId;
	const taxInput: TaxInput = {
		taxYear: lppBuybackYear,
		canton: "VD",
		municipalityOfsId: ofsId,
		maritalStatus: "single",
		children: 0,
		childrenAges: [],
		denomination: "none",
		federalTaxableIncome: 120_000,
		cantonalTaxableIncome: 117_000,
		taxableWealth: 0,
	};
	const texts: LppBuybackDisplayTexts = {
		outOfScope: Object.fromEntries(ROMANDE_CANTONS.map((canton) => [canton.code, lppBuybackTexts.outOfScope(canton.name)])),
		outOfScopeMunicipality: {},
		outOfScopeShort: lppBuybackTexts.outOfScopeShort,
		missingData: lppBuybackTexts.missingData,
		missingDataShort: lppBuybackTexts.missingDataShort,
		refusedShort: lppBuybackTexts.refusedShort,
		notDeducted: lppBuybackTexts.notDeducted,
		single: lppBuybackTexts.scenarios.single,
		spread: lppBuybackTexts.scenarios.spread,
	};
	const official = { VS: getCantonData("VS").coverage!.officialCalculator as { label: string; url: string } };
	const show = (overrides: { amount?: number; withdrawal?: number | null; unrepaid?: boolean } = {}) =>
		displayLppBuyback(
			{
				taxInput,
				scales: getTaxScales({ taxYear: lppBuybackYear, canton: "VD", municipalityOfsId: ofsId }),
				buybackPotential: 50_000,
				amount: overrides.amount ?? 20_000,
				unrepaidHomeOwnershipWithdrawal: overrides.unrepaid ?? false,
				plannedCapitalWithdrawalYear: overrides.withdrawal ?? null,
				lockPeriodYears: { value: lppBuybackLockPeriod.value, sourceId: lppBuybackLockPeriod.sourceId },
			},
			texts,
			official,
		);

	it("ventilation par impôt, cinq scénarios, calendrier sans classe faute d'année de retrait", () => {
		const shown = show();
		expect(shown.status).toBeNull();
		expect(Object.keys(shown.summary!)).toEqual(["cantonalTax", "municipalTax", "federalTax"]);
		expect(shown.scenarios.map((scenario) => scenario.label)).toEqual(["En une fois", "Sur 2 ans", "Sur 3 ans", "Sur 4 ans", "Sur 5 ans"]);
		expect(shown.scenarios[0]!.difference).toBe(formatChfAmount(0));
		expect(shown.calendar.every((entry) => entry.status === null)).toBe(true);
		expect(shown.calendar[0]).toMatchObject({ buybackYear: String(lppBuybackYear), lockEnds: String(lppBuybackYear + lock) });
	});

	it("retrait deux ans après la dernière tranche : « dans le délai » pour cette tranche", () => {
		const lastYear = lppBuybackYear + 4;
		const shown = show({ withdrawal: lastYear + 2 });
		expect(shown.calendar.at(-1)!.status).toBe("dans le délai");
		expect(shown.scenarios.at(-1)!.lock).toBe("dans le délai");
		expect(shown.calendar[0]!.status).toBe("compatible");
	});

	it("refus : message de l'art. 79b al. 3 LPP à la place du montant, aucun tableau", () => {
		const shown = show({ unrepaid: true });
		expect(shown.value).toBe("—");
		expect(shown.status?.text).toMatch(/art\. 79b al\. 3 LPP.*art\. 60d OPP 2/);
		expect(shown.scenarios).toEqual([]);
		expect(shown.calendar).toEqual([]);
	});
});
