/**
 * Compte à rebours du versement 3a de l'accueil, calculé dans le navigateur :
 * jours restants jusqu'à la date limite incluse, dans la fenêtre d'affichage
 * de l'année ; `null` hors fenêtre. Dates locales, à minuit ; « MM-JJ ». La
 * date limite vient des données (src/calculators/home.ts). Sans DOM.
 */
export function countdownDays(today: Date, deadline: string, startsOn: string): number | null {
	const year = today.getFullYear();
	const at = (monthDay: string) => new Date(year, Number(monthDay.slice(0, 2)) - 1, Number(monthDay.slice(3, 5)));
	const day = new Date(year, today.getMonth(), today.getDate());
	if (day < at(startsOn) || day > at(deadline)) return null;
	return Math.round((at(deadline).getTime() - day.getTime()) / 86_400_000) + 1;
}

/**
 * Phrase du compte à rebours : jours restants (« {days} » remplacé), ou, le jour
 * de la date limite, celle du dernier jour ; `null` hors fenêtre (masqué).
 */
export function countdownMessage(today: Date, deadline: string, startsOn: string, templates: { days: string; lastDay: string }): string | null {
	const days = countdownDays(today, deadline, startsOn);
	return days === null ? null : days === 1 ? templates.lastDay : templates.days.replace("{days}", String(days));
}
