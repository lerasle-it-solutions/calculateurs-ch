/**
 * Cœur de l'affichage d'A4 (décision n° 22) : du formulaire à l'impôt du
 * calendrier saisi, avec sa trace, ou au message qui remplace le montant.
 * La comparaison des échelonnements est hors du cœur, dans le module
 * capital-withdrawal-visuals.ts, qui reçoit les entrées du moteur (`engine`).
 *
 * Sans DOM : la construction l'exécute sur le cas exemple, le script de la page
 * à chaque saisie, les tests le vérifient.
 *
 * Ordre des messages (P5) : commune, puis ménage (couples et familles hors
 * périmètre de la v1, avant toute saisie de montant), puis montants et années,
 * puis âge et sexe là où le canton en a besoin.
 */
import { capitalWithdrawalScalesFromBundle, type CapitalWithdrawalBundle } from "../calculations/pension/capital-withdrawal-bundle";
import {
	computeCapitalWithdrawalPlan,
	type CapitalWithdrawalEntry,
	type CapitalWithdrawalInput,
	type CapitalWithdrawalOptions,
	type CapitalWithdrawalScales,
} from "../calculations/pension/capital-withdrawal-plan";
import { MissingTaxDataError, OutOfScopeError, PartialCoverageError } from "../calculations/tax-scale";
import { taxScalesFromBundle } from "../calculations/tax-scales-bundle";
import { formatSwissNumber } from "../format/chf";
import type { BreakdownLine } from "../utils/breakdown";
import { formatChfAmount } from "./amounts";
import { amountOf, emptyOutcome, familyOf, invalidInputStatus, missingInputStatus, municipalityKey, type FormOutcome, type FormValues, type HouseholdPageData } from "./calculator-form";
import { coverageStatus, coverageStatusOf, type CoverageTexts } from "./coverage";
import type { BreakdownRow } from "./pillar-3a-buyback";
import type { CapitalWithdrawalTableTexts } from "./capital-withdrawal-tables";
import type { ResultStatus } from "./result-card";

/**
 * Options du moteur tant que les relevés de l'AFC ne les ont pas tranchées
 * (docs/plan/W11-W12.md, point 5) : pas d'impôt minimal de l'IFD sur le
 * capital ; borne du taux communal valaisan non choisie, le Valais est donc
 * refusé avec une donnée manquante.
 */
export const CAPITAL_WITHDRAWAL_OPTIONS: CapitalWithdrawalOptions = {};

export type CapitalWithdrawalDisplayTexts = CoverageTexts & {
	missingData: string;
	missingDataShort: string;
	refusedShort: string;
	householdNotCovered: string;
	householdNotCoveredShort: string;
	capitalMissing: string;
	profileMissing: string;
};

export type CapitalWithdrawalPageData = HouseholdPageData & {
	taxYear: number;
	capitalWithdrawal: CapitalWithdrawalBundle | null;
	texts: CapitalWithdrawalDisplayTexts;
	/** Libellés des tableaux du module « échelonnement ». */
	tableTexts: CapitalWithdrawalTableTexts;
};

/** Ce que le cœur affiche ; `engine` : les entrées du moteur, pour le module de l'échelonnement. */
export type CapitalWithdrawalCoreDisplay = {
	engine: { input: CapitalWithdrawalInput; scales: CapitalWithdrawalScales };
};

const row = (line: BreakdownLine): BreakdownRow => ({
	label: line.label,
	detail: line.formula,
	// Étape sans montant : case vide, jamais un tiret (docs/editorial-style.md § 3.1)
	amount: line.noAmount
		? ""
		: line.unit === "CHF"
			? formatChfAmount(line.value)
			: `${formatSwissNumber(line.value, 2)}${line.unit ? ` ${line.unit}` : ""}`,
	...(line.qualifier ? { qualifier: line.qualifier } : {}),
	note: line.assumption,
});

/** Montant entier positif saisi, `null` si le champ est vide, `NaN` s'il est illisible. */
const optionalAmount = (text: string | undefined): number | null => ((text ?? "").trim() === "" ? null : amountOf(text));

/** Prestations du calendrier saisi, ou le champ qui manque. */
function readWithdrawals(values: FormValues): CapitalWithdrawalEntry[] | "missing" | "invalid" {
	const entries: CapitalWithdrawalEntry[] = [];
	const add = (pillar: CapitalWithdrawalEntry["pillar"], amountText: string | undefined, yearText: string | undefined) => {
		const amount = optionalAmount(amountText);
		if (amount === null || amount === 0) return "skip";
		const year = optionalAmount(yearText);
		if (year === null) return "missing";
		if (!Number.isFinite(amount) || amount < 0 || !Number.isInteger(year!)) return "invalid";
		entries.push({ pillar, amount: Math.round(amount), year: year! });
		return "ok";
	};
	const results = [add("lpp", values.lppCapital, values.lppWithdrawalYear)];
	const count = amountOf(values.pillar3aAccounts);
	const accounts = Number.isInteger(count) && count > 0 ? count : 0;
	for (let n = 1; n <= accounts; n++) results.push(add("pillar3a", values[`pillar3aAmount${n}`], values[`pillar3aYear${n}`]));
	if (results.includes("invalid")) return "invalid";
	if (results.includes("missing") || entries.length === 0) return "missing";
	return entries;
}

export function readCapitalWithdrawalForm(values: FormValues, data: CapitalWithdrawalPageData): FormOutcome<CapitalWithdrawalCoreDisplay> {
	const texts = data.texts;
	const key = municipalityKey(values.municipality ?? "", data.municipalities);
	const municipality = key === null ? undefined : data.municipalities[key];
	if (!municipality) {
		return emptyOutcome(
			values.municipality ? invalidInputStatus(texts.unknownMunicipality, texts.inputShort) : missingInputStatus(texts.municipalityMissing, data),
		);
	}
	// Couverture de la commune et du canton, puis ménage : avant toute saisie de montant (P5)
	const { maritalStatus, children } = familyOf(values);
	const taxScales = taxScalesFromBundle(data.bundle, municipality.ofsId);
	const coverage = coverageStatusOf(
		{ canton: municipality.canton, maritalStatus, children: Number.isFinite(children) ? children : 0 },
		taxScales,
		texts,
		data.officialCalculators,
	);
	if (coverage) return emptyOutcome(coverage);
	if (maritalStatus !== "single" || (Number.isFinite(children) && children > 0)) {
		return emptyOutcome({ text: texts.householdNotCovered, short: texts.householdNotCoveredShort, kind: "exclusion" });
	}
	if (data.capitalWithdrawal === null) return emptyOutcome({ text: texts.missingData, short: texts.missingDataShort, kind: "coverage" });

	const withdrawals = readWithdrawals(values);
	if (withdrawals === "invalid") return emptyOutcome();
	if (withdrawals === "missing") return emptyOutcome(missingInputStatus(texts.capitalMissing, data));

	const scales = capitalWithdrawalScalesFromBundle(data.capitalWithdrawal, data.bundle, municipality.ofsId);
	let annuityProfile: CapitalWithdrawalInput["annuityProfile"];
	if (scales.model.type === "periodicBenefitRate") {
		const age = amountOf(values.age);
		const sex = values.sex;
		if (!Number.isInteger(age) || (sex !== "male" && sex !== "female")) return emptyOutcome(missingInputStatus(texts.profileMissing, data));
		annuityProfile = { sex, age, ageYear: Math.min(...withdrawals.map((entry) => entry.year)) };
	}
	const input: CapitalWithdrawalInput = {
		taxYear: data.taxYear,
		canton: municipality.canton,
		municipalityOfsId: municipality.ofsId,
		maritalStatus: "single",
		children: 0,
		denomination: "none",
		withdrawals,
		...(annuityProfile ? { annuityProfile } : {}),
	};
	return displayCapitalWithdrawalCore(input, scales, data);
}

/** Impôt du calendrier saisi et sa trace, ou le message qui remplace le montant. */
export function displayCapitalWithdrawalCore(
	input: CapitalWithdrawalInput,
	scales: CapitalWithdrawalScales,
	data: Pick<CapitalWithdrawalPageData, "texts" | "officialCalculators">,
): FormOutcome<CapitalWithdrawalCoreDisplay> {
	const texts = data.texts;
	try {
		const result = computeCapitalWithdrawalPlan(input, scales, CAPITAL_WITHDRAWAL_OPTIONS);
		const breakdown = result.breakdown.map(row);
		if (result.plan === null) {
			const status: ResultStatus = { text: result.refusals.map((refusal) => refusal.message).join(" "), short: texts.refusedShort, kind: "refusal" };
			return { ...emptyOutcome(status), breakdown };
		}
		return {
			value: formatChfAmount(result.plan.totalTax),
			breakdown,
			status: null,
			note: null,
			shown: { engine: { input, scales } },
			summary: null,
		};
	} catch (error) {
		if (error instanceof PartialCoverageError) return emptyOutcome(coverageStatus(error, texts, data.officialCalculators));
		if (error instanceof MissingTaxDataError) {
			const link = data.officialCalculators[input.canton];
			return emptyOutcome({ text: texts.missingData, short: texts.missingDataShort, kind: "coverage", ...(link ? { link } : {}) });
		}
		if (error instanceof OutOfScopeError) return emptyOutcome({ text: error.message, short: texts.outOfScopeShort, kind: "exclusion" });
		throw error;
	}
}
