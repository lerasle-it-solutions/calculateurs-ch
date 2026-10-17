/**
 * Accueil calculant : tout ce que la page d'accueil affiche de chiffré,
 * calculé au build depuis les données et le moteur (R2, R3) — héros sur le cas
 * exemple d'A2, compte à rebours du versement 3a, bande de preuves, résultat
 * type de chaque calculateur publié. Aucun montant tapé.
 */
import { getMunicipalMultipliers } from "../data";
import type { FormOutcome } from "../lib/display/calculator-form";
import { readPillar3aTaxSavingForm } from "../lib/display/pillar-3a-tax-saving-form";
import { countdownDays as countdown } from "../lib/display/countdown";
import { encodeShareState } from "../lib/display/share-state";
import { fr } from "../i18n/fr";
import { formatChf } from "../lib/format/chf";
import { allCalculators, isPublished } from "./catalog";
import { exampleOutcome } from "./example-outcomes";
import { exampleFormValues } from "./field-values";
import { pillar3aTaxSaving, pillar3aTaxSavingYear } from "./pension/pillar-3a-tax-saving";
import { pillar3aTaxSavingPageData } from "./pension/pillar-3a-tax-saving-page-data";
import { siteVerifiedOn } from "./site-verification";
import { pillar3aContributionDeadline, type ContributionDeadline } from "./contribution-deadline";
import type { CalculatorDefinition } from "./types";

/** Champs du héros, ceux d'A2 : commune, revenu imposable, montant versé. */
export const HERO_FIELDS = ["municipality", "cantonalTaxableIncome", "contribution"] as const;

/**
 * Saisies du héros : celles du cas exemple d'A2 pour ses trois champs ; le
 * revenu fédéral de l'exemple, s'il diffère, suit en champ masqué tant que le
 * revenu cantonal n'est pas modifié (src/lib/display/home-page.ts). Le reste
 * vaut les réponses par défaut d'A2 : personne seule, salariée, affiliée.
 */
export function heroValues(): Record<string, string> {
	const example = exampleFormValues(pillar3aTaxSaving);
	const values: Record<string, string> = Object.fromEntries(HERO_FIELDS.map((name) => [name, example[name] ?? ""]));
	if (example.federalTaxableIncome && example.federalTaxableIncome !== example.cantonalTaxableIncome) {
		values.federalTaxableIncome = example.federalTaxableIncome;
		values.federalDiffers = "yes";
	}
	return values;
}

/** Résultat du héros, calculé au build sur ses seules saisies, comme le navigateur le recalcule. */
export const heroOutcome = (): FormOutcome<unknown> => readPillar3aTaxSavingForm(heroValues(), pillar3aTaxSavingPageData);

/** Lien « Affiner avec ma situation complète » : le calculateur, saisies dans le fragment. */
export const refineUrl = (): string => `${pillar3aTaxSaving.slug}${encodeShareState(heroValues())}`;

/** Fenêtre d'affichage du compte à rebours : du 1er octobre à la date limite (choix éditorial, pas une valeur légale). */
export const COUNTDOWN_STARTS_ON = "10-01";

/** Date limite du versement 3a de l'année de calcul d'A2 (src/calculators/contribution-deadline.ts) ; `null` tant qu'elle n'est pas relevée (R3) : le compte à rebours ne s'affiche pas. */
export const contributionDeadline = (): ContributionDeadline | null => pillar3aContributionDeadline(pillar3aTaxSavingYear);

/** Jours restants (src/lib/display/countdown.ts), fenêtre de l'accueil par défaut. */
export const countdownDays = (today: Date, deadline: string, startsOn: string = COUNTDOWN_STARTS_ON): number | null =>
	countdown(today, deadline, startsOn);

const published = (): CalculatorDefinition[] => allCalculators.filter(isPublished);

/** Bande de preuves : cantons et communes couverts par les calculateurs publiés, vérification des barèmes. */
export function proofFigures(): { cantons: number; municipalities: number; verifiedOn: string } {
	const cantons = new Set(published().flatMap((definition) => definition.scope.cantonsCovered));
	const municipalities = (getMunicipalMultipliers()?.multipliers ?? []).filter((entry) => cantons.has(entry.canton)).length;
	return { cantons: cantons.size, municipalities, verifiedOn: siteVerifiedOn() };
}

/** Carte d'un calculateur publié : sa question, et son résultat type calculé sur son cas exemple. */
export type CalculatorCard = { id: string; slug: string; title: string; question: string; typical: string | null };

export function calculatorCards(): CalculatorCard[] {
	return published().map((definition) => {
		const outcome = exampleOutcome(definition.id);
		const { municipality, cantonalTaxableIncome } = definition.example.values;
		const income = Number(cantonalTaxableIncome);
		return {
			id: definition.id,
			slug: definition.slug,
			title: definition.title,
			question: definition.question ?? definition.title,
			typical:
				outcome.status === null && municipality && Number.isFinite(income)
					? fr.home.typicalResult(municipality, `${formatChf(income)} CHF`, outcome.value)
					: null,
		};
	});
}
