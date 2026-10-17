/**
 * Validation des saisies déclarées par une définition — son cas exemple
 * (docs/design-system.md § 4.2) — contre ses propres champs : un exemple qui ne
 * passerait pas la validation du formulaire ne peut pas entrer dans le dépôt.
 */
import { numberError } from "../lib/format/amount-input";
import { ROMANDE_CANTONS } from "./cantons";
import type { CalculatorDefinition, FieldDefinition } from "./types";

/** Erreur d'une saisie brute pour un champ, ou `null` si elle est acceptée. Une saisie vide est acceptée ici. */
export function fieldValueError(field: FieldDefinition, raw: string): string | null {
	if (raw === "") return null;
	switch (field.kind) {
		case "number":
			return numberError(raw, field);
		case "select":
			return field.options.some((option) => option.value === raw) ? null : "choix absent de la liste";
		case "municipality":
			return field.options.some((option) => option.value === raw) ? null : "commune absente de la liste";
		case "canton":
			return ROMANDE_CANTONS.some((canton) => canton.code === raw) ? null : "canton inconnu";
		case "text":
			return null;
	}
}

/**
 * Saisies du formulaire au chargement : la valeur par défaut de chaque champ,
 * remplacée par celle du cas exemple. C'est ce que le formulaire rendu contient,
 * donc ce que la construction lit pour calculer le résultat de l'exemple.
 */
export function exampleFormValues(definition: CalculatorDefinition): Record<string, string> {
	const defaults = definition.fields.flatMap((field) => (field.defaultValue === undefined ? [] : [[field.name, String(field.defaultValue)]]));
	return { ...Object.fromEntries(defaults), ...definition.example.values };
}

/** Problèmes du cas exemple d'une définition, en messages « champ : problème » ; liste vide s'il est valide. */
export function exampleProblems(definition: CalculatorDefinition): string[] {
	const { values } = definition.example;
	const fields = new Map(definition.fields.map((field) => [field.name, field]));
	const groups = new Map((definition.profiles ?? []).map((group) => [group.name, group]));
	const problems: string[] = [];
	for (const [name, raw] of Object.entries(values)) {
		const field = fields.get(name);
		const group = groups.get(name);
		const error = field
			? fieldValueError(field, raw)
			: group
				? group.profiles.some((profile) => profile.value === raw) || raw === "other"
					? null
					: "profil inconnu"
				: "champ inconnu";
		if (error) problems.push(`${name} : ${error}`);
	}
	const valueOf = (name: string) => values[name] ?? fields.get(name)?.defaultValue?.toString() ?? "";
	for (const field of definition.fields) {
		const shown = (field.shownWhen ?? []).every((condition) => valueOf(condition.field) === condition.value);
		if (field.required && shown && valueOf(field.name) === "") problems.push(`${field.name} : obligatoire`);
	}
	return problems;
}
