/**
 * A4 — script de la page, chargé à la première interaction (first-interaction.ts) :
 * le cœur calcule l'impôt du calendrier saisi. Les tableaux (impôt par année,
 * échelonnement) sont hors du cœur, dans le module « échelonnement »
 * (capital-withdrawal-visuals.ts, décision n° 22) : il se charge quand leur
 * section approche de l'écran, ou au premier recalcul qui suit une saisie ou la
 * restauration d'un état partagé. Jusque-là, les tableaux rendus au build restent
 * affichés.
 *
 * Deux compléments propres à A4, hors du code commun des calculateurs : le
 * canton de la commune saisie, dans un champ caché `canton`, dont dépend
 * l'affichage de l'âge et du sexe (Valais) ; les règles du retrait en capital du
 * fichier de données, ajoutées aux données de la page.
 */
import type { GrossToTaxableRuleSet } from "../calculations/gross-to-taxable";
import { municipalityKey } from "./calculator-form";
import { startCalculator } from "./calculator-runtime";
import { hydratePageData, type HouseholdPagePart, type TaxDataFile } from "./tax-data";
import { readCapitalWithdrawalForm, type CapitalWithdrawalCoreDisplay, type CapitalWithdrawalPageData } from "./capital-withdrawal-core";
import type { CapitalWithdrawalTableTexts } from "./capital-withdrawal-tables";
import { SHARE_PREFIX } from "./share-state";

const DATA_ID = "capital-withdrawal-data";

export const start = (clicked: Element | null, file: TaxDataFile): void => {
	const form = document.querySelector<HTMLFormElement>("[data-calculator]")!;
	const resultBlock = document.getElementById("capital-withdrawal-result")!;
	// Canton de la commune saisie, lu par les conditions d'affichage `canton` (shownWhen), avant chaque recalcul
	const { municipalities } = hydratePageData(JSON.parse(document.getElementById(DATA_ID)!.textContent!) as HouseholdPagePart, file);
	const canton = form.appendChild(Object.assign(document.createElement("input"), { type: "hidden", name: "canton" }));
	const syncCanton = (): boolean => {
		const key = municipalityKey((form.elements.namedItem("municipality") as HTMLInputElement).value, municipalities);
		const next = key === null ? "" : municipalities[key]!.canton;
		const changed = canton.value !== next;
		canton.value = next;
		return changed;
	};
	for (const type of ["input", "change"]) form.addEventListener(type, syncCanton, true);
	syncCanton();

	let latest: CapitalWithdrawalCoreDisplay | null = null;
	let visuals: ((shown: CapitalWithdrawalCoreDisplay | null) => void) | undefined;
	let texts: CapitalWithdrawalTableTexts | undefined;
	let loading = false;
	const loadVisuals = () => {
		if (loading) return;
		loading = true;
		void import("./capital-withdrawal-visuals").then((module) => (visuals = (shown) => module.show(shown, texts!))(latest));
	};
	const observer = new IntersectionObserver((entries) => entries.some((entry) => entry.isIntersecting) && loadVisuals(), { rootMargin: "0px 0px 50%" });
	observer.observe(resultBlock);
	// Premier calcul du cœur : celui de l'exemple, déjà rendu au build — sauf état partagé restauré
	let first = !location.hash.startsWith(SHARE_PREFIX);
	startCalculator<CapitalWithdrawalPageData & { estimator: GrossToTaxableRuleSet | null; municipalityOptions: string[] }, CapitalWithdrawalCoreDisplay>(
		{
			dataId: DATA_ID,
			read: (values, data) => readCapitalWithdrawalForm(values, { ...data, capitalWithdrawal: file.capitalWithdrawal }),
			show: (shown, data) => {
				// Commune restaurée d'un état partagé, sans saisie : un recalcul avec son canton
				if (syncCanton()) queueMicrotask(() => form.dispatchEvent(new Event("input")));
				texts = data.tableTexts;
				resultBlock.hidden = shown === null;
				latest = shown;
				if (visuals) visuals(shown);
				else if (!first) loadVisuals();
				first = false;
			},
		},
		clicked,
		file,
	);
};
