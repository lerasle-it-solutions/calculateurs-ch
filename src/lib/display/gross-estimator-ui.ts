/**
 * Mode « salaire brut » d'un calculateur, chargé à la demande (import() à
 * chemin fixe, budget propre, CLAUDE.md § 3) quand le visiteur ouvre le bloc
 * `[data-estimator]` du formulaire.
 *
 * Préremplit la cotisation LPP, les primes et le taux LAA avec leurs défauts
 * publics tant que le visiteur ne les a pas modifiés, affiche les champs du
 * conjoint pour un couple, et reporte les revenus imposables estimés dans les
 * champs du formulaire, en lecture seule pendant que le mode est ouvert.
 */
import type { GrossToTaxableRuleSet, Sourced } from "../calculations/gross-to-taxable";
import * as labels from "../calculations/gross-to-taxable-labels";
import { computeEstimate, estimateDefaults, type Estimate } from "./gross-estimate";

export type Household = { canton: string; married: boolean; children: number; childrenAges: number[] };
export type EstimatorReading = Estimate | { status: string } | null;

export function attachEstimator(
	form: HTMLFormElement,
	ruleSet: GrossToTaxableRuleSet,
	ordinaryContribution: Sourced<number> | null,
): (household: Household) => EstimatorReading {
	const box = form.querySelector<HTMLDetailsElement>("[data-estimator]")!;
	const input = (name: string) => form.elements.namedItem(name) as HTMLInputElement | null;
	const taxable = [input("cantonalTaxableIncome"), input("federalTaxableIncome")];
	const edited = new Set<string>();
	box.addEventListener("input", (event) => edited.add((event.target as HTMLInputElement).name));
	const lock = () => taxable.forEach((field) => field && (field.readOnly = box.open));
	box.addEventListener("toggle", lock);
	lock();

	const number = (name: string): number | null => {
		const value = input(name)?.value ?? "";
		return value === "" || !Number.isFinite(Number(value)) ? null : Number(value);
	};
	const fill = (name: string, value: number) => {
		const field = input(name);
		if (field && !edited.has(name)) field.value = String(value);
	};
	const typed = (name: string) => (edited.has(name) ? number(name) : null);

	return (household) => {
		for (const block of box.querySelectorAll<HTMLElement>("[data-spouse]")) block.hidden = !household.married;
		const prefixes = household.married ? ["", "spouse"] : [""];
		const key = (prefix: string, name: string) => (prefix ? `${prefix}${name[0]!.toUpperCase()}${name.slice(1)}` : name);
		const persons = prefixes.map((prefix) => ({ grossSalary: number(key(prefix, "grossSalary")), age: number(key(prefix, "age")) }));
		if (persons.some((person) => person.grossSalary === null || person.grossSalary < 0 || person.age === null)) return null;
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
		if (taxable[0]) taxable[0].value = String(estimate.cantonalTaxableIncome);
		if (taxable[1]) taxable[1].value = String(estimate.federalTaxableIncome);
		return estimate;
	};
}
