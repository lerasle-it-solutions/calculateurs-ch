import { describe, expect, it } from "vitest";

import { pillar3aContributionDeadline } from "../../src/calculators/contribution-deadline";
import { pillar3aTaxSaving, pillar3aTaxSavingTexts, pillar3aTaxSavingYear } from "../../src/calculators/pension/pillar-3a-tax-saving";
import { getFederalData } from "../../src/data";
import { renderAllPages } from "../seo/site-pages";

/**
 * Date limite du versement 3a (R2) : A2 et /methodologie/ la lisent dans les
 * données et la formatent au build, jamais écrite dans le texte. Non relevée,
 * les phrases qui la citent ne s'affichent pas (R3). Le guide, article daté,
 * garde son texte (CLAUDE.md § 6).
 */
const year = pillar3aTaxSavingYear;
const entry = getFederalData(year).pillar3aContributionDeadline;
const recorded = entry !== undefined && !("todo" in entry);

describe("date limite du versement 3a", () => {
	it("lue dans les données de l'année et formatée en toutes lettres", () => {
		const deadline = pillar3aContributionDeadline(year);
		if (!recorded) return expect(deadline).toBeNull();
		const [month, day] = entry.value.split("-").map(Number) as [number, number];
		expect(deadline).toMatchObject({ monthDay: entry.value, sourceId: entry.sourceId, year });
		expect(deadline!.label).toBe(new Intl.DateTimeFormat("fr-CH", { day: "numeric", month: "long" }).format(new Date(year, month - 1, day)));
	});

	it("une année sans date relevée : aucune date", () => {
		const other = getFederalData(year + 1).pillar3aContributionDeadline;
		if (other === undefined || "todo" in other) expect(pillar3aContributionDeadline(year + 1)).toBeNull();
	});

	it("A2 (rappel, FAQ) et /methodologie/ citent la date des données, et seulement elle", async () => {
		const deadline = pillar3aContributionDeadline(year);
		const faq = pillar3aTaxSaving.faq.find((item) => item.question.startsWith("Jusqu'à quand"));
		const methodology = (await renderAllPages()).find((page) => page.route === "/methodologie/")!.html.replace(/\s+/g, " ");
		if (!deadline) {
			expect(faq).toBeUndefined();
			expect(methodology).not.toContain("au plus tard le");
			return;
		}
		const phrase = `au plus tard le ${deadline.label}`;
		expect(pillar3aTaxSavingTexts.reminders.some((reminder) => reminder.includes(phrase))).toBe(true);
		expect(faq?.answer).toContain(phrase);
		expect(methodology).toContain(phrase);
	});
});
