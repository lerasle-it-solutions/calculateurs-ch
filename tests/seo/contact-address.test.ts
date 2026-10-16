import { beforeAll, describe, expect, it } from "vitest";

import { fr } from "../../src/i18n/fr";
import { decodeEntities, renderAllPages, type RenderedPage } from "./site-pages";

/**
 * L'adresse de contact s'affiche en clair, dans un lien `mailto:` dont le texte
 * est l'adresse : lisible et utilisable sans JavaScript, dans le pied de page et
 * dans la politique de confidentialité. Origine : le lien « Contact » passait
 * par /cdn-cgi/l/email-protection (réécriture de Cloudflare, revue UX du
 * 16.10.2026).
 */
const address = fr.site.contactEmail;
let pages: RenderedPage[];
beforeAll(async () => {
	pages = await renderAllPages();
});

/** Liens `mailto:` d'un fragment : cible et texte visible. */
const mailtoLinks = (html: string): { target: string; text: string }[] =>
	[...html.matchAll(/<a\b[^>]*\shref="mailto:([^"?]+)[^"]*"[^>]*>([\s\S]*?)<\/a>/g)].map((match) => ({
		target: decodeEntities(match[1]!),
		text: decodeEntities(match[2]!.replace(/<[^>]+>/g, "")).trim(),
	}));

const plainLink = { target: address, text: address };

describe("adresse de contact", () => {
	it("le pied de page affiche l'adresse en clair, en lien mailto:", () => {
		const footer = pages.find((page) => page.route === "/")!.html.match(/<footer[\s\S]*?<\/footer>/)?.[0] ?? "";
		expect(mailtoLinks(footer)).toContainEqual(plainLink);
	});

	it("la politique de confidentialité affiche l'adresse en clair, en lien mailto:", () => {
		const policy = pages.find((page) => page.route === "/politique-de-confidentialite/")!.html;
		const main = policy.match(/<main[\s\S]*?<\/main>/)?.[0] ?? "";
		expect(mailtoLinks(main)).toContainEqual(plainLink);
	});

	it("aucun lien mailto: du site ne cache l'adresse derrière un libellé", () => {
		const hidden = pages.flatMap(({ route, html }) =>
			mailtoLinks(html)
				.filter((link) => link.text !== link.target)
				.map((link) => `${route} : « ${link.text} » → ${link.target}`),
		);
		expect(hidden).toEqual([]);
	});
});
