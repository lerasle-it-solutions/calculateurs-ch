/**
 * Date limite du versement 3a d'une année (circulaire AFC n° 18a, ch. 5.1),
 * lue dans les données (R2) et formatée au build (« 31 décembre »). `null` tant
 * qu'elle n'est pas relevée pour l'année (R3) : les phrases qui la citent ne
 * s'affichent pas. Utilisée par A2, /methodologie/ et le compte à rebours de
 * l'accueil ; un article daté garde le texte de sa date (CLAUDE.md § 6).
 */
import { getFederalData } from "../data";

export type ContributionDeadline = {
	/** MM-JJ, tel que relevé. */
	monthDay: string;
	sourceId: string;
	year: number;
	/** Jour et mois en toutes lettres, p. ex. « 31 décembre ». */
	label: string;
};

const dayMonth = new Intl.DateTimeFormat("fr-CH", { day: "numeric", month: "long" });

export function pillar3aContributionDeadline(year: number): ContributionDeadline | null {
	const entry = getFederalData(year).pillar3aContributionDeadline;
	if (entry === undefined || "todo" in entry) return null;
	const [month, day] = entry.value.split("-").map(Number) as [number, number];
	return { monthDay: entry.value, sourceId: entry.sourceId, year, label: dayMonth.format(new Date(year, month - 1, day)) };
}
