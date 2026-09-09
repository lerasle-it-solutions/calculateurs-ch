/**
 * Définition déclarative d'un calculateur (voir CLAUDE.md § 2).
 *
 * Le périmètre n'est pas du texte dans une page : c'est une donnée structurée
 * qui alimente le bandeau, les liens de variantes, la FAQ, le JSON-LD et les
 * tests. Un test vérifie que chaque calculateur déclare au moins une entrée
 * `notCovered` avec une alternative.
 */

/** Champ commun à tous les types de champ. */
type FieldBase = {
	/** Clé de l'état et attribut `name` de l'input. Anglais, camelCase. */
	name: string;
	/** Libellé affiché. FRANÇAIS. */
	label: string;
	/** Aide affichée sous le champ. FRANÇAIS. */
	hint?: string;
	required?: boolean;
};

export type NumberFieldDefinition = FieldBase & {
	kind: "number";
	/** Unité affichée en suffixe : « CHF », « % », « ans »… FRANÇAIS/symbole. */
	unit?: string;
	min?: number;
	max?: number;
	step?: number;
	defaultValue?: number;
};

export type SelectFieldDefinition = FieldBase & {
	kind: "select";
	/** `label` FRANÇAIS ; `value` stable, en anglais si c'est un code interne. */
	options: { value: string; label: string }[];
	defaultValue?: string;
};

export type CantonFieldDefinition = FieldBase & {
	kind: "canton";
	/** Code officiel : VD, GE, VS, FR, NE, JU. */
	defaultValue?: string;
};

export type FieldDefinition =
	| NumberFieldDefinition
	| SelectFieldDefinition
	| CantonFieldDefinition;

export type CalculatorDefinition = {
	/** « family.name » — ex. « pension.pillar-3a-buyback ». */
	id: string;
	family: "pension" | "property" | "energy" | "business";
	/**
	 * URL publique FRANÇAISE, indépendante du nom du fichier de page.
	 * Chemin absolu, barres incluses : « /prevoyance/rachat-3a-retroactif/ ».
	 */
	slug: string;
	/** FRANÇAIS — affiché. */
	title: string;
	/** FRANÇAIS — affiché. */
	metaDescription: string;

	scope: {
		/** FRANÇAIS → bandeau, bloc « Pour qui ». */
		forWhom: string[];
		/** FRANÇAIS → bandeau, bloc « Ce que ça ne couvre pas ». */
		notCovered: {
			case: string;
			/** id d'un autre calculateur. */
			alternative?: string;
		}[];
		/** FRANÇAIS → bandeau + page méthodologie. */
		assumptions: string[];
		/** Codes officiels : VD, GE, VS, FR, NE, JU. */
		cantonsCovered: string[];
		referenceYear: number;
	};

	fields: FieldDefinition[];
	/** Chemin dans `lib/calculations/`. */
	engine: string;
	/** ids de calculateurs liés. */
	variants: string[];
	/** FRANÇAIS. */
	faq: { question: string; answer: string }[];

	monetization?: {
		type: "lead" | "affiliate" | "none";
		partner?: string;
		/** Condition sur le résultat. */
		trigger?: string;
	};
};
