import { describe, expect, it } from "vitest";

import { contentHash, ledgerProblems, mainText, updateLedger, zurichIso, type Ledger } from "../../src/lib/seo/content-lastmod";

/**
 * `lastmod` par empreinte de contenu (arbitrage du mainteneur, 23.10.2026) :
 * le hachage du texte visible de <main> date la page ; seo/lastmod.json garde,
 * par URL, l'empreinte et la date de son dernier changement.
 */
const page = (main: string, chrome = "<header><nav>Menu</nav></header>") =>
	`<!doctype html><html><head><title>T</title><meta name="description" content="D"></head><body>${chrome}<main id="main">${main}</main><footer>Sources vérifiées le 20.10.2026</footer></body></html>`;

describe("mainText et contentHash", () => {
	it("ne lit que le texte visible de <main>", () => {
		const html = page('<h1>Rachat LPP</h1><p hidden>caché</p><script>var x = "script";</script><p>Texte <a href="/x/">lié</a>.</p>');
		expect(mainText(html)).toBe("Rachat LPP\nTexte lié.");
	});

	it("ignore l'habillage, les attributs techniques et les espaces", () => {
		const a = page("<h1>Titre</h1><p>Un  paragraphe.</p>");
		const b = page('<h1 class="text-title">Titre</h1>\n<p data-x="1">Un paragraphe.</p>', "<header><nav>Autre menu</nav></header>");
		expect(contentHash(a)).toBe(contentHash(b));
		expect(contentHash(a)).toMatch(/^[0-9a-f]{64}$/);
	});

	it("change dès qu'un mot visible change", () => {
		expect(contentHash(page("<p>Un paragraphe.</p>"))).not.toBe(contentHash(page("<p>Un autre paragraphe.</p>")));
	});

	it("refuse une page sans <main> unique", () => {
		expect(() => mainText("<html><body><p>x</p></body></html>")).toThrow();
	});
});

describe("updateLedger", () => {
	const ledger: Ledger = {
		"https://calculateurs.ch/": { hash: "a", lastmod: "2026-10-20T10:35:25+02:00" },
		"https://calculateurs.ch/guides/": { hash: "b", lastmod: "2026-10-18T09:00:00+02:00" },
		"https://calculateurs.ch/ancienne/": { hash: "c", lastmod: "2026-10-01T09:00:00+02:00" },
	};
	const now = "2026-10-23T11:00:00+02:00";

	it("garde la date d'une empreinte inchangée, date les nouvelles et les changées, retire les disparues", () => {
		const result = updateLedger(ledger, { "https://calculateurs.ch/": "a", "https://calculateurs.ch/guides/": "B", "https://calculateurs.ch/donnees/": "d" }, now);
		expect(result.ledger).toEqual({
			"https://calculateurs.ch/": { hash: "a", lastmod: "2026-10-20T10:35:25+02:00" },
			"https://calculateurs.ch/donnees/": { hash: "d", lastmod: now },
			"https://calculateurs.ch/guides/": { hash: "B", lastmod: now },
		});
		expect(result.changed).toEqual(["https://calculateurs.ch/donnees/", "https://calculateurs.ch/guides/"]);
		expect(result.removed).toEqual(["https://calculateurs.ch/ancienne/"]);
		expect(Object.keys(result.ledger)).toEqual([...Object.keys(result.ledger)].sort());
	});

	it("ne change rien quand toutes les empreintes sont égales", () => {
		const hashes = Object.fromEntries(Object.entries(ledger).map(([url, entry]) => [url, entry.hash]));
		const result = updateLedger(ledger, hashes, now);
		expect(result.changed).toEqual([]);
		expect(result.ledger).toEqual(ledger);
	});
});

describe("ledgerProblems", () => {
	it("nomme chaque URL absente, périmée ou en trop", () => {
		const ledger: Ledger = {
			"https://calculateurs.ch/": { hash: "a", lastmod: "2026-10-20T10:35:25+02:00" },
			"https://calculateurs.ch/ancienne/": { hash: "c", lastmod: "2026-10-01T09:00:00+02:00" },
		};
		expect(ledgerProblems(ledger, { "https://calculateurs.ch/": "a" })).toEqual(["https://calculateurs.ch/ancienne/ : n'est plus une page indexable"]);
		expect(ledgerProblems(ledger, { "https://calculateurs.ch/": "z", "https://calculateurs.ch/ancienne/": "c", "https://calculateurs.ch/neuve/": "n" })).toEqual([
			"https://calculateurs.ch/ : contenu modifié depuis le 2026-10-20T10:35:25+02:00",
			"https://calculateurs.ch/neuve/ : absente",
		]);
	});
});

describe("zurichIso", () => {
	it("date ISO 8601 à la seconde, avec le fuseau de Zurich, été comme hiver", () => {
		expect(zurichIso(new Date("2026-10-23T09:15:30.456Z"))).toBe("2026-10-23T11:15:30+02:00");
		expect(zurichIso(new Date("2026-12-01T08:00:00Z"))).toBe("2026-12-01T09:00:00+01:00");
	});
});
