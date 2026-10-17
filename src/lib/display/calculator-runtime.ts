/**
 * Cœur à la demande d'une page de calculateur fiscal (CLAUDE.md § 3, décision
 * n° 21), chargé dès la première interaction avec le formulaire
 * (first-interaction.ts). Le premier résultat, celui du cas exemple, est rendu
 * à la construction : la page n'a besoin d'aucun JavaScript pour l'afficher.
 *
 * Le module relie les vues du résultat à l'évènement `calc:update`
 * (result-views.ts), anime le formulaire du § 4.3 de docs/design-system.md —
 * montants tolérants formatés pendant la frappe et validés, deux chemins,
 * revenu fédéral repris du cantonal, un champ par enfant, profils, bouton du
 * maximum, conditions d'éligibilité, champs conditionnels — puis recalcule à
 * chaque saisie avec la lecture du formulaire propre au calculateur (`read`,
 * sans DOM). Il ne contient aucune formule. Les textes affichés viennent du
 * HTML rendu au build (attributs `data-*`), jamais du script.
 */
import type { GrossToTaxableRuleSet, Sourced } from "../calculations/gross-to-taxable";
import { formatNumberTyping, numberError } from "../format/amount-input";
import { formatChf } from "../format/chf";
import { familyOf, invalidInputStatus, municipalityKey, type EstimateReading, type FormOutcome, type FormValues, type HouseholdPageData } from "./calculator-form";
import type { EstimatorReading, Household } from "./gross-estimator-ui";
import { eligibilityState, type EligibilityItem } from "./eligibility";
import { attachResultViews } from "./result-views";

export type CalculatorRuntime<D extends HouseholdPageData, T> = {
	/** Identifiant du `<script type="application/json">` des données de la page. */
	dataId: string;
	read: (values: FormValues, data: D, estimate: EstimateReading) => FormOutcome<T>;
	/** Cotisation 3a ordinaire retranchée des revenus estimés (A1) ; absente, revenus non diminués. */
	ordinaryContribution?: (data: D) => Sourced<number>;
	/** Compléments du résultat propres au calculateur (ventilation, tableaux). */
	show?: (shown: T | null, data: D) => void;
};

type Input = HTMLInputElement;

/** Valide un champ numérique affiché : message « Erreur : … » sous le champ (NumberField). */
const validate = (input: Input): void => {
	const { min, max, step } = input.dataset;
	const bounds = { min: min ? +min : undefined, max: max ? +max : undefined, step: step ? +step : undefined };
	const error = input.closest("[hidden]") ? null : numberError(input.value, bounds);
	input.toggleAttribute("aria-invalid", error !== null);
	const message = document.getElementById(`${input.id}-error`);
	if (!message) return;
	message.hidden = error === null;
	message.querySelector("[data-field-error-text]")!.textContent = error ? (input.dataset[`error${error[0]!.toUpperCase()}${error.slice(1)}`] ?? "") : "";
};

export function startCalculator<D extends HouseholdPageData & { estimator: GrossToTaxableRuleSet | null }, T>(
	runtime: CalculatorRuntime<D, T>,
	clicked: Element | null = null,
): void {
	const form = document.querySelector<HTMLFormElement>("[data-calculator]");
	const dataElement = document.getElementById(runtime.dataId);
	if (!form || !dataElement) return;
	const data = JSON.parse(dataElement.textContent ?? "{}") as D;
	attachResultViews();

	const field = (name: string) => form.elements.namedItem(name) as Input | null;
	const all = <E extends Element>(selector: string) => [...form.querySelectorAll<E>(selector)];
	const sameAs = all<HTMLDetailsElement>("[data-same-as]");
	/** Profil choisi : il donne la réponse de ses questions oui/non. */
	const applyProfile = (radio: Input) => {
		for (const [name, value] of Object.entries(JSON.parse(radio.dataset.profileValues!) as Record<string, string>)) {
			const select = field(name);
			if (select) select.value = value;
		}
	};

	// Chemin « salaire brut » : l'estimateur, module distinct, se charge à la première sélection du chemin
	let estimator: ((household: Household) => EstimatorReading) | undefined;
	let loadingEstimator = false;
	const path = () => (form.elements.namedItem("incomePath") as RadioNodeList | null)?.value || "taxable";

	const update = () => {
		const values = Object.fromEntries(new FormData(form)) as FormValues;
		// Revenu repris d'un autre champ tant que « différent ? » est replié
		for (const details of sameAs) values.federalDiffers = details.open ? "yes" : "no";
		// Champs conditionnels (shownWhen de la définition, profils) : affichés selon les réponses
		for (const block of all<HTMLElement>("[data-shown-when]")) {
			block.hidden = !(JSON.parse(block.dataset.shownWhen!) as [string, string][]).every(([name, value]) => values[name] === value);
		}
		for (const block of all<HTMLElement>("[data-path-block]")) block.hidden = block.dataset.pathBlock !== path();
		// Conditions d'éligibilité, dites en mots ; liste affichée selon la règle unique (§ 4.3)
		const list = document.querySelector<HTMLElement>("[data-eligibility]");
		if (list) {
			const rows = [...list.querySelectorAll<HTMLElement>("[data-eligibility-item]")];
			const state = eligibilityState(
				rows.map((row) => JSON.parse(row.dataset.eligibilityItem!) as EligibilityItem),
				values,
			);
			list.hidden = !state.visible;
			rows.forEach((row, index) => {
				row.hidden = !state.items[index]!.shown;
				row.querySelector("[data-condition-state]")!.textContent = state.items[index]!.met ? list.dataset.met! : list.dataset.notMet!;
			});
		}

		const family = familyOf(values);
		const key = municipalityKey(values.municipality ?? "", data.municipalities);
		const canton = key === null ? undefined : data.municipalities[key]?.canton;
		const reading =
			path() === "gross" && estimator && canton
				? estimator({ canton, married: family.maritalStatus === "married", children: family.children, childrenAges: family.childrenAges })
				: null;
		const estimate: EstimateReading = path() === "gross" ? (reading ?? { missing: "grossSalary" }) : undefined;

		// Un champ à corriger : son message sous le champ, et la carte le dit (jamais seulement sous le champ)
		const invalid = all<Input>("[data-number][aria-invalid]").some((input) => !input.closest("[hidden]"));
		const outcome: FormOutcome<T> = invalid
			? { value: "—", breakdown: [], status: invalidInputStatus(form.dataset.invalidText!, form.dataset.invalidShort!), note: null, shown: null }
			: runtime.read(values, data, estimate);
		runtime.show?.(outcome.shown, data);
		for (const button of all<HTMLButtonElement>("[data-maximum-for]")) {
			const maximum = outcome.maxima?.[button.dataset.maximumFor!] ?? null;
			button.hidden = !maximum;
			if (maximum) {
				button.dataset.value = String(maximum);
				button.textContent = button.dataset.label!.replace("{amount}", formatChf(maximum));
			}
		}
		document.dispatchEvent(
			new CustomEvent("calc:update", { detail: { value: outcome.value, breakdown: outcome.breakdown, status: outcome.status, note: outcome.note } }),
		);
	};

	/** Un champ par enfant, généré depuis le nombre d'enfants ; les âges déjà saisis sont gardés. */
	const syncChildAges = () => {
		for (const block of all<HTMLFieldSetElement>("[data-child-ages]")) {
			const list = block.querySelector<HTMLElement>("[data-child-ages-list]")!;
			const count = Number(field(block.dataset.countField!)?.value.trim() || 0);
			const wanted = Number.isInteger(count) && count > 0 ? count : 0;
			while (list.children.length > wanted) list.lastElementChild!.remove();
			const template = block.querySelector("template")!.innerHTML;
			while (list.children.length < wanted) list.insertAdjacentHTML("beforeend", template.replaceAll("__N__", String(list.children.length + 1)));
			block.hidden = wanted === 0;
		}
	};

	const switchPath = async (next: string) => {
		const radio = form.querySelector<Input>(`[name="incomePath"][value="${next}"]`);
		if (!radio || radio.disabled) return;
		radio.checked = true;
		document.querySelector("[data-example-banner]")?.remove();
		if (next === "gross") {
			// Jamais un chiffre d'exemple à côté de champs vides : les revenus saisis sont vidés (§ 4.2)
			for (const input of all<Input>("[data-path-block='taxable'] [data-number]")) input.value = "";
			if (!estimator && !loadingEstimator && data.estimator) {
				loadingEstimator = true;
				const ordinary = runtime.ordinaryContribution?.(data) ?? null;
				estimator = (await import("./gross-estimator-ui")).attachEstimator(form, data.estimator, ordinary);
			}
		}
		update();
	};

	form.addEventListener("input", (event) => {
		const input = event.target as Input;
		if (input.matches("[data-number]")) {
			// Formatage à la suisse pendant la frappe, le curseur après le même chiffre
			if ("grouping" in input.dataset && input.selectionStart !== null) {
				const next = formatNumberTyping(input.value, input.selectionStart, true);
				if (next.text !== input.value) {
					input.value = next.text;
					input.setSelectionRange(next.caret, next.caret);
				}
			}
			// Une erreur affichée s'efface dès que la saisie redevient valide
			if (input.hasAttribute("aria-invalid")) validate(input);
			// Revenu repris : tant que « différent ? » est replié, il suit l'autre champ
			for (const details of sameAs) {
				const copy = details.querySelector<Input>("[data-number]");
				if (copy && !details.open && input.name === details.dataset.sameAs) copy.value = input.value;
			}
		}
		if (input.name === "incomePath") return void switchPath(input.value);
		if (input.matches("[data-profile-values]")) applyProfile(input);
		syncChildAges();
		update();
	});
	// Bornes et pas validés à la sortie du champ, pas pendant la frappe
	form.addEventListener("change", (event) => {
		if ((event.target as Element).matches("[data-number]")) validate(event.target as Input);
		update();
	});
	for (const details of sameAs) {
		details.addEventListener("toggle", () => {
			const copy = details.querySelector<Input>("[data-number]");
			const source = field(details.dataset.sameAs!);
			if (copy && source && details.open && copy.value === "") copy.value = source.value;
			update();
		});
	}
	const onClick = (target: Element | null) => {
		const button = target?.closest<HTMLButtonElement>("button");
		if (!button || button.disabled) return;
		if (button.matches("[data-switch-gross]")) return void switchPath("gross");
		const input = button.matches("[data-maximum-for]") ? field(button.dataset.maximumFor!) : null;
		if (!input) return;
		const value = button.dataset.value!;
		input.value = formatNumberTyping(value, value.length, "grouping" in input.dataset).text;
		input.dispatchEvent(new Event("input", { bubbles: true }));
		validate(input);
	};
	document.querySelector("[data-calculator-root]")?.addEventListener("click", (event) => onClick(event.target as Element));
	// Le bandeau du cas exemple disparaît à la première saisie (§ 4.2)
	form.addEventListener("input", () => document.querySelector("[data-example-banner]")?.remove(), { once: true });

	// Saisies faites pendant le chargement du cœur : profil coché, chemin choisi, nombre d'enfants
	all<Input>("[data-profile-values]:checked").forEach(applyProfile);
	syncChildAges();
	if (path() === "gross") void switchPath("gross");
	else update();
	// Bouton pressé pendant le chargement du cœur
	onClick(clicked);
}
