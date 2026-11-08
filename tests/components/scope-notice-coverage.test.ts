import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";

import CalculatorShell from "../../src/components/calculator/CalculatorShell.astro";
import { pillar3aBuyback } from "../../src/calculators/pension/pillar-3a-buyback";
import { taxEngineCoverage } from "../../src/calculators/tax-coverage";
import { fr } from "../../src/i18n/fr";
import { UNINDEXED, withUnindexedMunicipality } from "../fixtures/unindexed-municipality";

/**
 * Le périmètre est annoncé avant la saisie, jamais après (P5, docs/design-system.md
 * § 4.1, décision n° 19) : la ligne de périmètre, avant le formulaire, dit la
 * couverture partielle d'un canton déclaré — lue dans tax-coverage.ts — et renvoie
 * au détail « Ce que ce calcul suppose », placé sous le résultat, qui nomme les
 * communes valaisannes couvertes, déduites des données (indexation communale
 * relevée). Adaptation approuvée par le mainteneur le 17.10.2026.
 */
const visibleText = (html: string): string =>
	html
		.replace(/<[^>]*>/g, "")
		.replace(/&#39;/g, "'")
		.replace(/\s+/g, " ")
		.trim();

/** Rendu du Shell d'A1 : ligne de périmètre avant le formulaire, et texte de l'<aside> du détail « Ce que ce calcul suppose ». */
const renderShell = async (Shell: typeof CalculatorShell, definition: typeof pillar3aBuyback) => {
	const container = await AstroContainer.create();
	const html = await container.renderToString(Shell, {
		props: { definition, intro: "", resultLabel: "", verifiedOn: "2026-01-01" },
	});
	const detailsStart = html.indexOf('<details id="ce-que-ce-calcul-suppose"');
	const asideStart = html.indexOf("<aside", detailsStart);
	const asideEnd = html.indexOf("</aside>", asideStart);
	return { html, detailsStart, asideStart, asideEnd, notice: visibleText(html.slice(asideStart, asideEnd)) };
};

// Réécriture autorisée par le mainteneur le 7.11.2026 (R7) : deux cas, sans condition. Sur les données réelles,
// toutes les communes valaisannes ont leur indexation et le détail n'en dresse aucune liste ; sur la fixture
// partagée (tests/fixtures/unindexed-municipality.ts), une commune en manque et le détail nomme les communes couvertes.
describe("bandeau de périmètre d'A1, Valais", () => {
	it("la ligne de périmètre, avant le formulaire, annonce la couverture partielle et renvoie au détail, qui ne dresse aucune liste de communes valaisannes", async () => {
		const { html, detailsStart, asideStart, asideEnd, notice } = await renderShell(CalculatorShell, pillar3aBuyback);
		const formStart = html.indexOf("<form");
		// Ligne de périmètre avant le formulaire : couverture partielle lue dans tax-coverage.ts, lien vers le détail
		const partial = taxEngineCoverage().partialCantons;
		expect(partial).toContain("Valais");
		const scopeLine = visibleText(html.slice(0, formStart));
		expect(scopeLine).toContain(visibleText(pillar3aBuyback.scopeLine));
		// Même normalisation des blancs que la ligne lue dans la page (espace fine, 18.10.2026)
		expect(scopeLine).toContain(visibleText(fr.partialCoverage.scopeLine(partial)));
		expect(html.slice(0, formStart)).toContain('href="#ce-que-ce-calcul-suppose"');

		// Détail « Ce que ce calcul suppose » : l'<aside> est dans ce <details>, après la carte résultat
		expect(detailsStart).toBeGreaterThan(html.search(/<output\b[^>]*data-result-card/));
		expect(asideStart).toBeGreaterThan(detailsStart);
		expect(asideEnd).toBeLessThan(html.indexOf("</details>", detailsStart));

		expect(notice).toContain("Valais");
		expect(notice).not.toMatch(/dans (la commune|les communes) de/);
		expect(pillar3aBuyback.scope.notCovered).toHaveLength(6);
	});

	it("fixture, une commune valaisanne sans indexation : le détail nomme les communes valaisannes couvertes", async () => {
		const { notice, covered } = await withUnindexedMunicipality(async () => {
			const [{ default: Shell }, { pillar3aBuyback: definition }, { getMunicipalMultipliers }] = await Promise.all([
				import("../../src/components/calculator/CalculatorShell.astro"),
				import("../../src/calculators/pension/pillar-3a-buyback"),
				import("../../src/data"),
			]);
			const covered = (getMunicipalMultipliers()?.multipliers ?? [])
				.filter((entry) => entry.canton === "VS" && entry.communalScaleIndexation !== undefined)
				.map((entry) => entry.municipality);
			return { notice: (await renderShell(Shell, definition)).notice, covered };
		});
		expect(covered.length).toBeGreaterThan(0);
		expect(covered).not.toContain(UNINDEXED.municipality);
		expect(notice).toContain("Valais");
		for (const name of covered) expect(notice, `${name} absente du bandeau`).toContain(name);
		// Texte réécrit le 18.10.2026 (docs/editorial-style.md) : un seul deux-points, communes toujours nommées
		expect(notice).toContain("dans les communes de");
	});
});
