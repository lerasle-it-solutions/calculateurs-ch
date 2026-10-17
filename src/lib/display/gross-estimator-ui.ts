/**
 * Chemin « Je pars de mon salaire brut » d'un calculateur, module à la demande
 * distinct (import() à chemin fixe, CLAUDE.md § 3, décision n° 21), chargé
 * par le cœur à la première sélection du chemin.
 *
 * Préremplit la cotisation LPP, les primes et le taux LAA avec leurs défauts
 * publics tant que le visiteur ne les a pas modifiés, affiche les champs du
 * conjoint pour un couple, et reporte les revenus imposables estimés dans les
 * champs du chemin « revenu imposable », masqués sur ce chemin. Tant que le
 * salaire ou l'âge manque, il dit lequel (la carte le demande, § 4.2).
 */
import type { GrossToTaxableRuleSet, Sourced } from "../calculations/gross-to-taxable";
import * as labels from "../calculations/gross-to-taxable-labels";
import { formatNumberTyping, parseNumber } from "../format/amount-input";
import { computeEstimate, estimateDefaults, type Estimate } from "./gross-estimate";

export type Household = { canton: string; married: boolean; children: number; childrenAges: number[] };
export type EstimatorReading = Estimate | { status: string } | { missing: "grossSalary" | "age" };

export function attachEstimator(
	form: HTMLFormElement,
	ruleSet: GrossToTaxableRuleSet,
	ordinaryContribution: Sourced<number> | null,
): (household: Household) => EstimatorReading {
	const box = form.querySelector<HTMLElement>("[data-estimator]")!;
	const input = (name: string) => form.elements.namedItem(name) as HTMLInputElement | null;
	const taxable = [input("cantonalTaxableIncome"), input("federalTaxableIncome")];
	const edited = new Set<string>();
	box.addEventListener("input", (event) => edited.add((event.target as HTMLInputElement).name));

	const number = (name: string): number | null => {
		const value = parseNumber(input(name)?.value ?? "");
		return value === null || !Number.isFinite(value) ? null : value;
	};
	/** Valeur écrite dans un champ, mise en forme comme pendant la frappe. */
	const write = (field: HTMLInputElement | null, value: number) => {
		if (field) field.value = formatNumberTyping(String(value), String(value).length, "grouping" in field.dataset).text;
	};
	const fill = (name: string, value: number) => {
		if (!edited.has(name)) write(input(name), value);
	};
	const typed = (name: string) => (edited.has(name) ? number(name) : null);

	return (household) => {
		for (const block of box.querySelectorAll<HTMLElement>("[data-spouse]")) block.hidden = !household.married;
		const prefixes = household.married ? ["", "spouse"] : [""];
		const key = (prefix: string, name: string) => (prefix ? `${prefix}${name[0]!.toUpperCase()}${name.slice(1)}` : name);
		const persons = prefixes.map((prefix) => ({ grossSalary: number(key(prefix, "grossSalary")), age: number(key(prefix, "age")) }));
		if (persons.some((person) => person.grossSalary === null || person.grossSalary < 0)) return { missing: "grossSalary" };
		if (persons.some((person) => person.age === null)) return { missing: "age" };
		if (household.childrenAges.length !== household.children) return { status: labels.CHILDREN_AGES_MISSING };

		const known = persons as { grossSalary: number; age: number }[];
		const defaults = estimateDefaults(ruleSet, household.canton, known);
		prefixes.forEach((prefix, index) => fill(key(prefix, "pensionContribution"), defaults.pensionContributions[index]!));
		fill("premiumsPerAdult", defaults.premiums.perAdult);
		fill("premiumsPerChild", defaults.premiums.perChild);
		fill("accidentRate", defaults.accidentRatePercent);

		const premiumsEdited = edited.has("premiumsPerAdult") || edited.has("premiumsPerChild");
		const estimate = computeEstimate(
			{
				canton: household.canton,
				married: household.married,
				childrenAges: household.childrenAges,
				persons: known.map((person, index) => ({ ...person, pensionContribution: typed(key(prefixes[index]!, "pensionContribution")) })),
				premiums: premiumsEdited
					? { perAdult: number("premiumsPerAdult") ?? defaults.premiums.perAdult, perChild: number("premiumsPerChild") ?? defaults.premiums.perChild }
					: null,
				accidentRatePercent: typed("accidentRate"),
			},
			ruleSet,
			ordinaryContribution,
		);
		write(taxable[0] ?? null, estimate.cantonalTaxableIncome);
		write(taxable[1] ?? null, estimate.federalTaxableIncome);
		return estimate;
	};
}
