/**
 * A3 — script de la page, chargé à la première interaction (first-interaction.ts).
 * Les tableaux « Et si » (échelonnement, délai de blocage) sont hors du cœur, dans
 * le module « visualisations » (lpp-buyback-visuals.ts, décision n° 22) : il se
 * charge quand leur section approche de l'écran, ou au premier recalcul qui suit
 * une saisie ou la restauration d'un état partagé. Jusque-là, les tableaux rendus
 * au build restent affichés.
 */
import type { GrossToTaxableRuleSet } from "../calculations/gross-to-taxable";
import { startCalculator } from "./calculator-runtime";
import type { TaxDataFile } from "./tax-data";
import { readLppBuybackFormWith, type LppBuybackPageData } from "./lpp-buyback-form-core";
import { displayLppBuybackCore, type LppBuybackCoreDisplay } from "./lpp-buyback-core";
import { SHARE_PREFIX } from "./share-state";

export const start = (clicked: Element | null, file: TaxDataFile): void => {
	const resultBlock = document.getElementById("lpp-buyback-result")!;
	const notDeducted = document.getElementById("lpp-buyback-not-deducted")!;
	let latest: LppBuybackCoreDisplay | null = null;
	let visuals: ((shown: LppBuybackCoreDisplay | null) => void) | undefined;
	let texts: { single: string; spread: string } | undefined;
	let loading = false;
	const loadVisuals = () => {
		if (loading) return;
		loading = true;
		void import("./lpp-buyback-visuals").then((module) => (visuals = (shown) => module.show(shown, texts!))(latest));
	};
	const observer = new IntersectionObserver((entries) => entries.some((entry) => entry.isIntersecting) && loadVisuals(), { rootMargin: "0px 0px 50%" });
	observer.observe(document.getElementById("lpp-buyback-scenarios")!);
	// Premier calcul du cœur : celui de l'exemple, déjà rendu au build — sauf état partagé restauré
	let first = !location.hash.startsWith(SHARE_PREFIX);
	startCalculator<LppBuybackPageData & { estimator: GrossToTaxableRuleSet | null; municipalityOptions: string[] }, LppBuybackCoreDisplay>({
		dataId: "lpp-buyback-data",
		read: (values, data, estimate) => readLppBuybackFormWith(values, data, estimate, displayLppBuybackCore),
		show: (shown, data) => {
			texts = data.texts;
			resultBlock.hidden = shown === null;
			notDeducted.hidden = !shown?.notDeducted;
			notDeducted.textContent = shown?.notDeducted ?? "";
			latest = shown;
			if (visuals) visuals(shown);
			else if (!first) loadVisuals();
			first = false;
		},
	}, clicked, file);
};
