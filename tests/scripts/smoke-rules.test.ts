import { describe, expect, it } from "vitest";

import { BINGBOT_USER_AGENT, checkNotFound, checkRedirect, isChallenge, redirectVariants } from "../../scripts/smoke-rules";

/**
 * Règles du contrôle de production (`npm run smoke`, prompt SEO du 23.10.2026,
 * étape 4) : variantes d'une URL canonique, redirection en un seul saut,
 * page 404, page de défi Cloudflare.
 */
describe("redirectVariants", () => {
	it("www, http et sans slash final : les trois variantes simples, puis les combinaisons", () => {
		const variants = redirectVariants("https://calculateurs.ch/prevoyance/rachat-lpp/");
		expect(variants.filter((variant) => variant.single).map((variant) => [variant.label, variant.url])).toEqual([
			["www", "https://www.calculateurs.ch/prevoyance/rachat-lpp/"],
			["http", "http://calculateurs.ch/prevoyance/rachat-lpp/"],
			["sans slash final", "https://calculateurs.ch/prevoyance/rachat-lpp"],
		]);
		expect(variants.filter((variant) => !variant.single).map((variant) => variant.url)).toEqual([
			"http://www.calculateurs.ch/prevoyance/rachat-lpp/",
			"https://www.calculateurs.ch/prevoyance/rachat-lpp",
			"http://calculateurs.ch/prevoyance/rachat-lpp",
		]);
	});

	it("l'accueil n'a pas de variante sans slash final", () => {
		expect(redirectVariants("https://calculateurs.ch/").map((variant) => variant.url)).toEqual([
			"https://www.calculateurs.ch/",
			"http://calculateurs.ch/",
			"http://www.calculateurs.ch/",
		]);
	});
});

describe("checkRedirect", () => {
	const canonical = "https://calculateurs.ch/prevoyance/";

	it("accepte 301 ou 308 directement vers l'URL canonique", () => {
		expect(checkRedirect({ status: 301, location: canonical }, canonical)).toEqual([]);
		expect(checkRedirect({ status: 308, location: "/prevoyance/" }, canonical, "https://calculateurs.ch/prevoyance")).toEqual([]);
	});

	it("refuse un autre statut, une cible intermédiaire ou l'absence de redirection", () => {
		expect(checkRedirect({ status: 302, location: canonical }, canonical)).toHaveLength(1);
		expect(checkRedirect({ status: 301, location: "https://calculateurs.ch/prevoyance" }, canonical)).toHaveLength(1);
		expect(checkRedirect({ status: 200, location: null }, canonical)).toHaveLength(2);
	});
});

describe("checkNotFound", () => {
	it("exige le statut 404 et la page 404 du site", () => {
		const page = '<html><head><meta name="robots" content="noindex, nofollow"><link rel="canonical" href="https://calculateurs.ch/404/"></head><body><h1>Page introuvable</h1></body></html>';
		expect(checkNotFound({ status: 404, body: page })).toEqual([]);
		expect(checkNotFound({ status: 200, body: page })).toHaveLength(1);
		expect(checkNotFound({ status: 404, body: "<html><body>Not found</body></html>" })).toHaveLength(1);
	});
});

describe("isChallenge", () => {
	it("reconnaît une page de défi Cloudflare", () => {
		expect(isChallenge({ status: 403, headers: new Headers({ "cf-mitigated": "challenge" }), body: "" })).toBe(true);
		expect(isChallenge({ status: 503, headers: new Headers(), body: "<title>Just a moment...</title>" })).toBe(true);
		expect(isChallenge({ status: 200, headers: new Headers(), body: '<script src="/cdn-cgi/challenge-platform/h/b/orchestrate/jsch/v1"></script>' })).toBe(true);
		expect(isChallenge({ status: 200, headers: new Headers(), body: "<h1>Rachat LPP</h1>" })).toBe(false);
		// Script « JavaScript Detections » injecté par Cloudflare dans chaque page : pas un défi
		const detections = "<h1>Rachat LPP</h1><script>a.src='/cdn-cgi/challenge-platform/scripts/jsd/main.js';</script>";
		expect(isChallenge({ status: 200, headers: new Headers(), body: detections })).toBe(false);
	});

	it("se présente comme Bingbot", () => {
		expect(BINGBOT_USER_AGENT).toMatch(/bingbot\/2\.0/);
	});
});
