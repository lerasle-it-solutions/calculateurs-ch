import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";

import CalculatorShell from "../../src/components/calculator/CalculatorShell.astro";
import { pillar3aBuyback } from "../../src/calculators/pension/pillar-3a-buyback";
import { taxEngineCoverage } from "../../src/calculators/tax-coverage";
import { getMunicipalMultipliers } from "../../src/data";
import { fr } from "../../src/i18n/fr";

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

describe("bandeau de périmètre d'A1, Valais", () => {
	it("la ligne de périmètre, avant le formulaire, annonce la couverture partielle et renvoie au détail, qui nomme les communes valaisannes couvertes", async () => {
		const covered = (getMunicipalMultipliers()?.multipliers ?? [])
			.filter((entry) => entry.canton === "VS" && entry.communalScaleIndexation !== undefined)
			.map((entry) => entry.municipality);
		expect(covered.length).toBeGreaterThan(0);

		const container = await AstroContainer.create();
		const html = await container.renderToString(CalculatorShell, {
			props: { definition: pillar3aBuyback, intro: "", resultLabel: "", verifiedOn: "2026-01-01" },
		});
		const formStart = html.indexOf("<form");
		// Ligne de périmètre avant le formulaire : couverture partielle lue dans tax-coverage.ts, lien vers le détail
		const partial = taxEngineCoverage().partialCantons;
		expect(partial).toContain("Valais");
		const scopeLine = visibleText(html.slice(0, formStart));
		expect(scopeLine).toContain(visibleText(pillar3aBuyback.scopeLine));
		expect(scopeLine).toContain(fr.partialCoverage.scopeLine(partial));
		expect(html.slice(0, formStart)).toContain('href="#ce-que-ce-calcul-suppose"');

		// Détail « Ce que ce calcul suppose » : l'<aside> est dans ce <details>, après la carte résultat
		const detailsStart = html.indexOf('<details id="ce-que-ce-calcul-suppose"');
		const asideStart = html.indexOf("<aside", detailsStart);
		const asideEnd = html.indexOf("</aside>", asideStart);
		expect(detailsStart).toBeGreaterThan(html.search(/<output\b[^>]*data-result-card/));
		expect(asideStart).toBeGreaterThan(detailsStart);
		expect(asideEnd).toBeLessThan(html.indexOf("</details>", detailsStart));

		const notice = visibleText(html.slice(asideStart, asideEnd));
		expect(notice).toContain("Valais");
		for (const name of covered) expect(notice, `${name} absente du bandeau`).toContain(name);
		expect(notice).toContain("dans les communes suivantes");
		expect(pillar3aBuyback.scope.notCovered).toHaveLength(6);
	});
});
