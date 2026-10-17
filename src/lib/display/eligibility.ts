/**
 * Liste des conditions d'éligibilité « remplie / non remplie »
 * (docs/design-system.md § 4.3), règle unique de tous les calculateurs : en
 * profil courant, le libellé du profil tient lieu de liste, aucune liste ne
 * s'affiche. La liste s'affiche quand le visiteur choisit « Autre situation »,
 * ou dès qu'une condition n'est pas remplie, et nomme alors la condition qui
 * bloque. Sans DOM : le Shell l'applique au build, le cœur à chaque saisie.
 */
type Condition = { field: string; value: string };

export type EligibilityItem = {
	/** Condition, dite en mots. FRANÇAIS. */
	label: string;
	/** Remplie si l'une de ces réponses est donnée. */
	anyOf: Condition[];
	/** Groupe de profils qui affirme cette condition ; « Autre situation » y affiche la liste. */
	profile?: string;
	/** Condition affichée seulement si ces réponses sont données (conjoint : état civil). */
	shownWhen?: Condition[];
};

export function eligibilityState(
	items: EligibilityItem[],
	values: Record<string, string | undefined>,
): { visible: boolean; items: { shown: boolean; met: boolean }[] } {
	const states = items.map((item) => ({
		shown: (item.shownWhen ?? []).every((condition) => values[condition.field] === condition.value),
		met: item.anyOf.some((condition) => values[condition.field] === condition.value),
	}));
	const visible = items.some(
		(item, index) => states[index]!.shown && (!states[index]!.met || (item.profile !== undefined && values[item.profile] === "other")),
	);
	return { visible, items: states };
}
