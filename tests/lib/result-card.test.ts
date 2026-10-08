import { describe, expect, it } from "vitest";

import { applyResult, type ResultStatus } from "../../src/lib/display/result-card";

/**
 * Carte de résultat : un message (hors périmètre, donnée manquante, saisie à
 * corriger) remplace le montant dans la carte, avec son lien ; la barre mobile
 * affiche sa mention courte. Un résultat calculé efface le message.
 */
const slot = (textContent = "") => ({ hidden: false, textContent });

const card = () => {
	const messageLink = { ...slot(), hidden: true, href: "" };
	return { value: slot("—"), message: { ...slot(), hidden: true }, messageText: slot(), messageLink };
};

const bar = () => ({ value: slot("—"), message: { ...slot(), hidden: true }, messageText: null, messageLink: null });

const outOfScope: ResultStatus = {
	text: "Ce calculateur ne couvre pas encore la commune de Brig-Glis : … Utilisez la calculette du canton :",
	short: "Hors périmètre, voir le message",
	link: { label: "Calculette d'impôts du canton", url: "https://example.org/calculette" },
};

describe("carte de résultat", () => {
	it("un message remplace le montant dans la carte, avec son lien", () => {
		const slots = card();
		applyResult(slots, { value: "—", status: outOfScope });
		expect(slots.value.hidden).toBe(true);
		expect(slots.message.hidden).toBe(false);
		expect(slots.messageText.textContent).toBe(outOfScope.text);
		expect(slots.messageLink).toMatchObject({ hidden: false, textContent: outOfScope.link!.label, href: outOfScope.link!.url });
	});

	it("un message sans lien masque le lien", () => {
		const slots = card();
		applyResult(slots, { value: "—", status: outOfScope });
		applyResult(slots, { value: "—", status: { text: "Choisissez une commune dans la liste proposée.", short: "Commune à préciser" } });
		expect(slots.messageText.textContent).toBe("Choisissez une commune dans la liste proposée.");
		expect(slots.messageLink.hidden).toBe(true);
	});

	it("la barre mobile affiche la mention courte à la place du montant", () => {
		const slots = bar();
		applyResult(slots, { value: "—", status: outOfScope });
		expect(slots.value.hidden).toBe(true);
		expect(slots.message).toMatchObject({ hidden: false, textContent: "Hors périmètre, voir le message" });
	});

	it("un résultat calculé efface le message et rend le montant", () => {
		for (const slots of [card(), bar()]) {
			applyResult(slots, { value: "—", status: outOfScope });
			applyResult(slots, { value: "1’842 CHF", status: null });
			expect(slots.value).toMatchObject({ hidden: false, textContent: "1’842 CHF" });
			expect(slots.message.hidden).toBe(true);
		}
	});

	it("une carte sans emplacement de message ne change que le montant", () => {
		const slots = { value: slot("—"), message: null, messageText: null, messageLink: null };
		applyResult(slots, { value: "12’346 CHF", status: outOfScope });
		expect(slots.value).toEqual({ hidden: false, textContent: "12’346 CHF" });
	});
});
