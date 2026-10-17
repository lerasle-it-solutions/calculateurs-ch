/**
 * Interactivité d'une page de calculateur fiscal, chargée à la demande à la
 * première interaction avec le formulaire (first-interaction.ts ; script à la
 * demande au sens de CLAUDE.md § 3, budget propre). Le premier résultat, celui
 * du cas exemple, est rendu à la construction : la page n'a besoin d'aucun
 * JavaScript pour l'afficher.
 *
 * Le module relie les vues du résultat à l'évènement `calc:update`
 * (result-views.ts), puis recalcule à chaque saisie avec la lecture du
 * formulaire propre au calculateur (`read`, sans DOM). Il ne contient aucune
 * formule.
 */
import type { GrossToTaxableRuleSet, Sourced } from "../calculations/gross-to-taxable";
import { familyOf, type EstimateReading, type FormOutcome, type FormValues, type HouseholdPageData } from "./calculator-form";
import type { EstimatorReading, Household } from "./gross-estimator-ui";
import { attachResultViews } from "./result-views";

export type CalculatorRuntime<D extends HouseholdPageData, T> = {
	/** Identifiant du `<script type="application/json">` des données de la page. */
	dataId: string;
	read: (values: FormValues, data: D, estimate: EstimateReading) => FormOutcome<T>;
	/** Cotisation 3a ordinaire retranchée des revenus estimés (A1) ; absente, revenus non diminués. */
	ordinaryContribution?: (data: D) => Sourced<number>;
	/** Avant chaque lecture : champs affichés selon les réponses. */
	beforeRead?: (values: FormValues, form: HTMLFormElement) => void;
	/** Compléments du résultat propres au calculateur (ventilation, tableaux). */
	show?: (shown: T | null, data: D) => void;
};

export function startCalculator<D extends HouseholdPageData & { estimator: GrossToTaxableRuleSet | null }, T>(
	runtime: CalculatorRuntime<D, T>,
): void {
	const form = document.querySelector<HTMLFormElement>("[data-calculator]");
	const dataElement = document.getElementById(runtime.dataId);
	if (!form || !dataElement) return;
	const data = JSON.parse(dataElement.textContent ?? "{}") as D;
	attachResultViews();

	// Mode « salaire brut » : l'estimateur se charge à la demande, à la première ouverture du bloc
	const estimatorBox = form.querySelector<HTMLDetailsElement>("[data-estimator]");
	let estimator: ((household: Household) => EstimatorReading) | undefined;

	const update = () => {
		const values = Object.fromEntries(new FormData(form)) as FormValues;
		runtime.beforeRead?.(values, form);
		const family = familyOf(values);
		const canton = data.municipalities[values.municipality ?? ""]?.canton;
		const estimate: EstimateReading = estimatorBox?.open
			? estimator && canton
				? estimator({ canton, married: family.maritalStatus === "married", children: family.children, childrenAges: family.childrenAges })
				: null
			: undefined;
		const outcome = runtime.read(values, data, estimate);
		runtime.show?.(outcome.shown, data);
		document.dispatchEvent(
			new CustomEvent("calc:update", {
				detail: { value: outcome.value, breakdown: outcome.breakdown, status: outcome.status, note: outcome.note },
			}),
		);
	};

	estimatorBox?.addEventListener("toggle", async () => {
		if (estimatorBox.open && !estimator && data.estimator) {
			const ordinary = runtime.ordinaryContribution?.(data) ?? null;
			estimator = (await import("./gross-estimator-ui")).attachEstimator(form, data.estimator, ordinary);
		}
		update();
	});
	form.addEventListener("input", update);
	form.addEventListener("change", update);
	update();
}
