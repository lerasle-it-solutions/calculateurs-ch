import { describe, expect, it } from "vitest";

import { FOLD_VIEWPORTS, foldTargets, foldVerdict } from "../../scripts/fold-rules";

/**
 * Règles du garde-fou du premier écran (`npm run fold`, arbitrage du
 * mainteneur, 23.10.2026) : sur un calculateur, le premier champ au-dessus de
 * la barre mobile ; sur l'accueil, le montant de l'exemple dans l'écran.
 */
describe("FOLD_VIEWPORTS", () => {
	it("bloque à 375 × 667 ; à 320 × 568, signale sans faire échouer (design system § 4.1, 23.10.2026)", () => {
		expect(FOLD_VIEWPORTS).toEqual([
			{ width: 375, height: 667, blocking: true },
			{ width: 320, height: 568, blocking: false },
		]);
	});
});

describe("foldTargets", () => {
	const calculator = '<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebApplication","name":"A"}</script>';
	it("l'accueil pour son montant, chaque page de calculateur pour son premier champ", () => {
		const targets = foldTargets([
			{ url: "https://calculateurs.ch/", html: calculator },
			{ url: "https://calculateurs.ch/prevoyance/rachat-lpp/", html: calculator },
			{ url: "https://calculateurs.ch/guides/", html: "<h1>Guides</h1>" },
		]);
		expect(targets).toEqual([
			{ path: "/", kind: "amount" },
			{ path: "/prevoyance/rachat-lpp/", kind: "firstField" },
		]);
	});
});

describe("foldVerdict", () => {
	it("passe si l'élément tient entre le haut de l'écran et la limite (barre mobile ou bas de l'écran)", () => {
		expect(foldVerdict({ top: 528, bottom: 548 }, 594)).toBe(true);
		expect(foldVerdict({ top: 574, bottom: 594 }, 594)).toBe(true);
	});

	it("échoue si l'élément passe sous la limite, ou s'il manque", () => {
		expect(foldVerdict({ top: 582, bottom: 602 }, 575)).toBe(false);
		expect(foldVerdict({ top: 634, bottom: 673 }, 667)).toBe(false);
		expect(foldVerdict({ top: -10, bottom: 20 }, 667)).toBe(false);
		expect(foldVerdict(null, 667)).toBe(false);
	});
});
