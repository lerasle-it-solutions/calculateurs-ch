import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";

import ResultCard from "../../src/components/ui/ResultCard.astro";
import { exampleFormValues } from "../../src/calculators/field-values";
import { lppBuyback } from "../../src/calculators/pension/lpp-buyback";
import { lppBuybackPageData } from "../../src/calculators/pension/lpp-buyback-page-data";
import { pillar3aBuyback } from "../../src/calculators/pension/pillar-3a-buyback";
import { pillar3aBuybackPageData } from "../../src/calculators/pension/pillar-3a-buyback-page-data";
import { pillar3aTaxSaving } from "../../src/calculators/pension/pillar-3a-tax-saving";
import { pillar3aTaxSavingPageData } from "../../src/calculators/pension/pillar-3a-tax-saving-page-data";
import { getMunicipalMultipliers } from "../../src/data";
import { fr } from "../../src/i18n/fr";
import { classifyDisplayStatus, invalidInputStatus } from "../../src/lib/display/calculator-form";
import { readLppBuybackForm } from "../../src/lib/display/lpp-buyback-form";
import { readPillar3aBuybackForm } from "../../src/lib/display/pillar-3a-buyback-form";
import { readPillar3aTaxSavingForm } from "../../src/lib/display/pillar-3a-tax-saving-form";
import { applyResult, statusTone, type ResultStatus } from "../../src/lib/display/result-card";

/**
 * Typologie des messages qui remplacent le montant dans la carte
 * (docs/design-system.md § 4.4, arbitrage du 17.10.2026), pour chaque statut
 * émis par les trois calculateurs : donnée manquante en texte neutre, saisie
 * invalide en erreur, hors périmètre et condition légale non remplie en
 * avertissement renforcé, avec l'alternative ou la condition nommée.
 */
const a1 = exampleFormValues(pillar3aBuyback);
const a2 = exampleFormValues(pillar3aTaxSaving);
const a3 = exampleFormValues(lppBuyback);
const uncovered = (getMunicipalMultipliers()?.multipliers ?? []).find(
	(entry) => entry.canton === "VS" && entry.communalScaleIndexation === undefined,
)!.municipality;

const cases: { name: string; status: ResultStatus | null; tone: "neutral" | "error" | "warning"; link?: boolean }[] = [
	{ name: "commune inconnue (A1)", status: readPillar3aBuybackForm({ ...a1, municipality: "Atlantis" }, pillar3aBuybackPageData).status, tone: "error" },
	{ name: "commune hors périmètre (A1)", status: readPillar3aBuybackForm({ ...a1, municipality: uncovered }, pillar3aBuybackPageData).status, tone: "warning", link: true },
	{ name: "ménage hors périmètre (A2)", status: readPillar3aTaxSavingForm({ ...a2, municipality: "Sion", maritalStatus: "married" }, pillar3aTaxSavingPageData).status, tone: "warning", link: true },
	{ name: "commune hors périmètre (A3)", status: readLppBuybackForm({ ...a3, municipality: uncovered }, lppBuybackPageData).status, tone: "warning", link: true },
	{ name: "salaire brut à saisir (A3)", status: readLppBuybackForm(a3, lppBuybackPageData, { missing: "grossSalary" }).status, tone: "neutral" },
	{ name: "âge à saisir (A1)", status: readPillar3aBuybackForm(a1, pillar3aBuybackPageData, { missing: "age" }).status, tone: "neutral" },
	{ name: "âges des enfants à saisir (A2)", status: readPillar3aTaxSavingForm(a2, pillar3aTaxSavingPageData, { status: "Indiquez l'âge de chaque enfant." }).status, tone: "neutral" },
	{ name: "revenu de l'activité à saisir (A2)", status: readPillar3aTaxSavingForm({ ...a2, profile: "selfEmployedWithoutPension", affiliated: "no" }, pillar3aTaxSavingPageData).status, tone: "neutral" },
	{ name: "cotisation de l'année non versée (A1)", status: readPillar3aBuybackForm({ ...a1, currentYearContributionPaidInFull: "no" }, pillar3aBuybackPageData).status, tone: "warning" },
	{ name: "prestation de vieillesse perçue (A1)", status: readPillar3aBuybackForm({ ...a1, oldAgeBenefit: "yes" }, pillar3aBuybackPageData).status, tone: "warning", link: true },
	{ name: "aucun revenu soumis à l'AVS (A2)", status: readPillar3aTaxSavingForm({ ...a2, hasAvsIncome: "no" }, pillar3aTaxSavingPageData).status, tone: "warning" },
	{ name: "versement anticipé non remboursé (A3)", status: readLppBuybackForm({ ...a3, unrepaidHomeOwnershipWithdrawal: "yes" }, lppBuybackPageData).status, tone: "warning" },
	{ name: "champ numérique à corriger", status: invalidInputStatus(fr.numberField.cardStatus, fr.numberField.cardShort), tone: "error" },
	{
		name: "donnée communale non relevée",
		status: classifyDisplayStatus({ text: lppBuybackPageData.texts.missingData, short: "" }, lppBuybackPageData, "VS"),
		tone: "warning",
		link: true,
	},
];

describe("messages de la carte : un style par type", () => {
	it.each(cases)("$name", ({ status, tone, link }) => {
		expect(status).not.toBeNull();
		expect(status!.kind).toBeDefined();
		expect(statusTone(status!.kind)).toBe(tone);
		if (link) expect(status!.link?.url).toMatch(/^https?:/);
	});

	it("une condition légale non remplie est nommée par le motif du moteur", () => {
		const a3Refusal = cases.find((entry) => entry.name.startsWith("versement anticipé"))!.status!;
		expect(a3Refusal.kind).toBe("refusal");
		expect(a3Refusal.text).toMatch(/art\. 79b al\. 3 LPP/);
	});

	it("la carte rend le préfixe et le style du type, au build comme dans le navigateur", async () => {
		const container = await AstroContainer.create();
		const render = (status: ResultStatus) => container.renderToString(ResultCard, { props: { id: "r", for: "", label: "", status } });
		/** Attributs de style posés sur l'emplacement du message (pas les variantes de sa classe). */
		const tones = (html: string) => {
			const tag = html.match(/<span\b[^>]*\sdata-result-status[^>]*>/)![0];
			return ["data-warning", "data-error"].filter((name) => new RegExp(`\\s${name}(?=[\\s>="])`).test(tag));
		};
		expect(tones(await render({ text: "Hors périmètre.", short: "", kind: "coverage" }))).toEqual(["data-warning"]);
		const error = await render({ text: "Corrigez.", short: "", kind: "invalid" });
		expect(tones(error)).toEqual(["data-error"]);
		expect(error).toContain(fr.numberField.errorPrefix);
		expect(tones(await render({ text: "Saisissez votre salaire brut.", short: "", kind: "missing" }))).toEqual([]);

		// Dans le navigateur : les attributs suivent le statut publié
		const attributes = new Set<string>();
		const element = {
			hidden: true,
			textContent: "",
			toggleAttribute: (name: string, on: boolean) => void (on ? attributes.add(name) : attributes.delete(name)),
		};
		const slots = { value: { hidden: false, textContent: "" }, message: element as unknown as HTMLElement, messageText: { hidden: false, textContent: "" }, messageLink: null };
		applyResult(slots, { status: { text: "", short: "", kind: "refusal" } });
		expect([...attributes]).toEqual(["data-warning"]);
		applyResult(slots, { status: { text: "", short: "", kind: "invalid" } });
		expect([...attributes]).toEqual(["data-error"]);
		applyResult(slots, { status: { text: "", short: "", kind: "missing" } });
		expect([...attributes]).toEqual([]);
	});
});
