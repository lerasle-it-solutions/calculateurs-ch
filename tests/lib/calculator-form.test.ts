import { describe, expect, it } from "vitest";

import { exampleFormValues } from "../../src/calculators/field-values";
import { municipalityLabels } from "../../src/calculators/municipalities";
import { lppBuyback } from "../../src/calculators/pension/lpp-buyback";
import { lppBuybackPageData } from "../../src/calculators/pension/lpp-buyback-page-data";
import { pillar3aBuyback, pillar3aBuybackYear, pillar3aGapYears } from "../../src/calculators/pension/pillar-3a-buyback";
import { pillar3aBuybackPageData } from "../../src/calculators/pension/pillar-3a-buyback-page-data";
import { pillar3aTaxSaving } from "../../src/calculators/pension/pillar-3a-tax-saving";
import { pillar3aTaxSavingPageData } from "../../src/calculators/pension/pillar-3a-tax-saving-page-data";
import { familyOf, municipalityKey, readHousehold } from "../../src/lib/display/calculator-form";
import { readLppBuybackForm } from "../../src/lib/display/lpp-buyback-form";
import { readPillar3aBuybackForm } from "../../src/lib/display/pillar-3a-buyback-form";
import { readPillar3aTaxSavingForm } from "../../src/lib/display/pillar-3a-tax-saving-form";

/**
 * Formulaire des calculateurs (docs/design-system.md § 4.3), parties sans DOM :
 * un seul champ commune, montants saisis à la suisse, revenu fédéral repris du
 * cantonal tant qu'il n'est pas distingué, un champ par enfant, chemin du
 * salaire brut, condition qui bloque le rachat d'A1, profils d'A2.
 */
const lppValues = exampleFormValues(lppBuyback);

describe("un seul champ commune", () => {
	it("une commune s'affiche seule ; un homonyme porte son canton entre parenthèses", () => {
		const labels = municipalityLabels([
			{ municipality: "Lausanne", canton: "VD" },
			{ municipality: "Corcelles", canton: "VD" },
			{ municipality: "Corcelles", canton: "NE" },
		]);
		expect([...labels.values()]).toEqual(["Lausanne", "Corcelles (VD)", "Corcelles (NE)"]);
	});

	it("le libellé saisi retrouve la commune et son canton ; un libellé ambigu ou inconnu, aucune", () => {
		const municipalities = { "Lausanne (VD)": 1, "Corcelles (VD)": 2, "Corcelles (NE)": 3 };
		expect(municipalityKey("Lausanne", municipalities)).toBe("Lausanne (VD)");
		expect(municipalityKey("Corcelles (NE)", municipalities)).toBe("Corcelles (NE)");
		expect(municipalityKey("Corcelles", municipalities)).toBeNull();
		expect(municipalityKey("Atlantis", municipalities)).toBeNull();
	});

	it("le moteur reçoit le canton déduit de la commune", () => {
		const household = readHousehold({ ...lppValues, municipality: "Lausanne" }, lppBuybackPageData, 2026, undefined);
		expect("taxInput" in household && household.taxInput.canton).toBe("VD");
	});
});

describe("montants saisis à la suisse", () => {
	it("70'000, 70’000, 70 000 et 70000 donnent le même résultat", () => {
		const results = ["70'000", "70’000", "70 000", "70000"].map(
			(text) => readLppBuybackForm({ ...lppValues, cantonalTaxableIncome: text, federalTaxableIncome: text }, lppBuybackPageData).value,
		);
		expect(new Set(results).size).toBe(1);
		expect(results[0]).not.toBe("—");
	});

	it("une saisie illisible ne calcule rien", () => {
		expect(readLppBuybackForm({ ...lppValues, buybackAmount: "abc" }, lppBuybackPageData).value).toBe("—");
	});
});

describe("revenu imposable fédéral repris du cantonal", () => {
	it("tant que « différent ? » est replié, le fédéral égale le cantonal, hypothèse inscrite dans la trace", () => {
		const outcome = readLppBuybackForm({ ...lppValues, federalDiffers: "no", federalTaxableIncome: "999" }, lppBuybackPageData);
		const same = readLppBuybackForm({ ...lppValues, federalTaxableIncome: lppValues.cantonalTaxableIncome! }, lppBuybackPageData);
		expect(outcome.value).toBe(same.value);
		expect(outcome.breakdown[0]!.note).toBe(lppBuybackPageData.texts.federalAssumed);
	});

	it("déplié, le fédéral saisi est retenu, sans hypothèse", () => {
		const outcome = readLppBuybackForm({ ...lppValues, federalDiffers: "yes" }, lppBuybackPageData);
		expect(outcome.breakdown.some((row) => row.note === lppBuybackPageData.texts.federalAssumed)).toBe(false);
	});
});

describe("un champ par enfant", () => {
	it("les âges sont lus dans un champ par enfant, jusqu'au nombre d'enfants", () => {
		expect(familyOf({ children: "2", childAge1: "4", childAge2: "9", childAge3: "12" }).childrenAges).toEqual([4, 9]);
		expect(familyOf({ children: "2", childAge1: "0", childAge2: "" }).childrenAges).toEqual([0]);
		expect(familyOf({}).children).toBe(0);
	});
});

describe("chemin du salaire brut", () => {
	it("sans salaire ni âge, la carte demande le salaire brut, jamais un chiffre", () => {
		const outcome = readLppBuybackForm({ ...lppValues, cantonalTaxableIncome: "", federalTaxableIncome: "" }, lppBuybackPageData, {
			missing: "grossSalary",
		});
		expect(outcome.value).toBe("—");
		expect(outcome.status?.text).toBe("Saisissez votre salaire brut.");
	});

	it("avec le salaire mais sans l'âge, la carte demande l'âge", () => {
		const outcome = readLppBuybackForm(lppValues, lppBuybackPageData, { missing: "age" });
		expect(outcome.status?.text).toBe(lppBuybackPageData.texts.ageMissing);
	});
});

describe("A1 : la carte nomme la condition qui bloque", () => {
	const values = exampleFormValues(pillar3aBuyback);

	it("cotisation de l'année non versée en entier : le motif du moteur remplace le montant", () => {
		const outcome = readPillar3aBuybackForm({ ...values, currentYearContributionPaidInFull: "no" }, pillar3aBuybackPageData);
		expect(outcome.value).toBe("—");
		expect(outcome.status?.text).toContain(`cotisation ordinaire de ${pillar3aBuybackYear}`);
		expect(outcome.status?.link).toBeUndefined();
	});

	it("prestation de vieillesse déjà perçue : exclusion, avec l'alternative déclarée dans notCovered", () => {
		const outcome = readPillar3aBuybackForm({ ...values, oldAgeBenefit: "yes" }, pillar3aBuybackPageData);
		const entry = pillar3aBuyback.scope.notCovered.find((item) => item.case.includes("prestation de vieillesse"))!;
		expect(outcome.status?.kind).toBe("exclusion");
		expect(outcome.status?.link).toEqual(entry.alternative);
	});

	it("conditions remplies : un montant", () => {
		expect(readPillar3aBuybackForm(values, pillar3aBuybackPageData).status).toBeNull();
	});
});

describe("A2 : profils et versement maximal", () => {
	it("le profil par défaut remplit les questions de la personne ; « indépendant » la déclare sans caisse de pension", () => {
		const values = exampleFormValues(pillar3aTaxSaving);
		expect(values).toMatchObject({ hasAvsIncome: "yes", reachedReferenceAge: "no", affiliated: "yes" });
		const selfEmployed = exampleFormValues({
			...pillar3aTaxSaving,
			example: { ...pillar3aTaxSaving.example, values: { ...pillar3aTaxSaving.example.values, profile: "selfEmployedWithoutPension" } },
		});
		expect(selfEmployed.affiliated).toBe("no");
	});

	it("le bouton du maximum reçoit le plafond retenu par le moteur pour chaque personne", () => {
		const values = exampleFormValues(pillar3aTaxSaving);
		const outcome = readPillar3aTaxSavingForm(values, pillar3aTaxSavingPageData);
		expect(outcome.maxima).toEqual({ contribution: pillar3aTaxSavingPageData.smallContributionCap.value });
	});
});

describe("A1 : profil « Je remplis les conditions »", () => {
	const group = pillar3aBuyback.profiles?.[0];

	it("deux profils : « Je remplis les conditions », par défaut, puis « Autre situation »", () => {
		expect(pillar3aBuyback.profiles).toHaveLength(1);
		expect(group!.profiles.map((profile) => profile.label)).toEqual(["Je remplis les conditions"]);
		expect(group!.otherLabel).toBe("Autre situation");
	});

	it("le libellé énumère ce que le profil affirme, années tirées de l'année de calcul", () => {
		const details = group!.profiles[0]!.details!.join(" ; ");
		for (const year of [...pillar3aGapYears, pillar3aBuybackYear]) expect(details).toContain(String(year));
		expect(details).toMatch(/cotisation \d{4} versée en entier/);
		expect(details).toMatch(/aucune prestation de vieillesse du 3a perçue/);
	});

	it("le profil répond à chaque question oui/non qu'il regroupe, et rend le résultat du guide", () => {
		const values = exampleFormValues(pillar3aBuyback);
		expect(values.profile).toBe(group!.profiles[0]!.value);
		for (const name of group!.fields) expect(values[name], name).toBe(group!.profiles[0]!.values[name]);
		expect(Object.keys(group!.profiles[0]!.values).sort()).toEqual([...group!.fields].sort());
		expect(readPillar3aBuybackForm(values, pillar3aBuybackPageData).status).toBeNull();
	});
});
