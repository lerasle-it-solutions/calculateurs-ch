import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";

import DataFreshness from "../../src/components/ui/DataFreshness.astro";

/** Texte visible, balises retirées et espaces normalisés. */
const visibleText = (html: string): string =>
	html
		.replace(/<[^>]*>/g, "")
		.replace(/\s+/g, " ")
		.trim();

describe("DataFreshness", () => {
	it("affiche la date de vérification formatée", async () => {
		const container = await AstroContainer.create();
		const html = await container.renderToString(DataFreshness, {
			props: { referenceYear: 2026, verifiedOn: "2026-01-08" },
		});

		expect(visibleText(html)).toBe("Barèmes 2026, vérifiés le 08.01.2026.");
		expect(html).toContain('datetime="2026-01-08"');
	});

	it("une valeur jamais vérifiée affiche « jamais vérifiés », sans date", async () => {
		const container = await AstroContainer.create();
		const html = await container.renderToString(DataFreshness, {
			props: { referenceYear: 2026, verifiedOn: "" },
		});

		expect(visibleText(html)).toBe("Barèmes 2026, jamais vérifiés.");
		expect(html).not.toContain('datetime=""');
	});
});
