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
	/**
	 * Champ affiché seulement si toutes ces conditions sont remplies (réponses
	 * d'autres champs) ; masqué, il n'est ni exigé ni lu.
	 */
	shownWhen?: { field: string; value: string }[];
};

export type NumberFieldDefinition = FieldBase & {
	kind: "number";
	/** Unité affichée en suffixe : « CHF », « % », « ans »… FRANÇAIS/symbole. Un montant « CHF » se formate à la suisse pendant la frappe. */
	unit?: string;
	min?: number;
	max?: number;
	step?: number;
	defaultValue?: number;
	/** Revenu imposable : champ du chemin « Je connais mon revenu imposable » (§ 4.3). */
	incomePath?: true;
	/**
	 * Pré-rempli depuis ce champ, et masqué derrière un lien « différent ? » qui
	 * le déplie (revenu fédéral repris du cantonal, § 4.3). Replié, il vaut l'autre
	 * champ, hypothèse inscrite dans la trace (R4).
	 */
	sameAs?: string;
	/** Bouton « Verser le maximum (<plafond>) » à côté du champ ; le plafond vient du moteur (§ 4.3). */
	maximumButton?: true;
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

/** Commune : autocomplétion native. `value` identifie la commune, `label` l'affiche. */
export type MunicipalityFieldDefinition = FieldBase & {
	kind: "municipality";
	options: { value: string; label?: string }[];
	defaultValue?: string;
};

/** Texte libre court, p. ex. une liste d'âges. */
export type TextFieldDefinition = FieldBase & {
	kind: "text";
	/** Clavier proposé sur mobile. */
	inputMode?: "text" | "numeric";
	placeholder?: string;
	defaultValue?: string;
};

/** Âges des enfants : un champ par enfant, généré depuis le champ du nombre d'enfants (§ 4.3). */
export type ChildAgesFieldDefinition = FieldBase & {
	kind: "childAges";
	/** Champ du nombre d'enfants. */
	countField: string;
	/** Libellé de chaque champ, « {n} » remplacé par le rang de l'enfant. FRANÇAIS. */
	itemLabel: string;
};

export type FieldDefinition =
	| NumberFieldDefinition
	| ChildAgesFieldDefinition
	| SelectFieldDefinition
	| CantonFieldDefinition
	| MunicipalityFieldDefinition
	| TextFieldDefinition;

/**
 * Alternative hors du site, libellé FRANÇAIS : un lien, ou un simple conseil
 * sans lien quand aucune adresse ne vaut pour tous les cas.
 */
export type ExternalAlternative = { label: string; url?: string };

/**
 * Cas exemple (docs/design-system.md § 4.2) : la page s'ouvre pré-remplie sur
 * ce profil fictif, et son résultat est calculé à la construction.
 *
 * Exception à R2 : ces saisies de scénario ne sont pas des valeurs au sens de
 * R2 et n'ont pas de `Value<T>`. Elles ne reprennent jamais une valeur légale
 * (plafond, taux, seuil) : celle-ci est lue dans les données au moment de
 * déclarer l'exemple, jamais tapée.
 */
export type CalculatorExample = {
	/** Description d'une ligne, FRANÇAIS, après « Exemple : » dans le bandeau. */
	label: string;
	/** Saisies, par nom de champ, telles qu'un visiteur les taperait. */
	values: Record<string, string>;
};

/**
 * Profils qui pré-remplissent un groupe de questions oui/non (§ 4.3) : des
 * pastilles, plus « Autre situation », qui déplie les questions détaillées.
 */
export type ProfileGroup = {
	/** Nom du groupe de boutons radio. Anglais, camelCase. */
	name: string;
	/** Légende du groupe. FRANÇAIS. */
	legend: string;
	/** Questions oui/non que les profils remplissent, par nom de champ. */
	fields: string[];
	/** Profils, le premier par défaut ; `values` donne la réponse de chaque question. */
	profiles: { value: string; label: string; values: Record<string, string> }[];
	/** Libellé de la pastille qui déplie les questions détaillées. FRANÇAIS. */
	otherLabel: string;
	/** Groupe affiché seulement si ce champ a cette valeur (conjoint : état civil). */
	shownWhen?: { field: string; value: string };
};

/**
 * Point de vigilance (§ 4.1, bloc 5), sous la carte résultat. `warning` :
 * avertissement renforcé, réservé à ce qui peut faire perdre la déduction ou
 * de l'argent ; `info` : avis informatif pour le reste (arbitrage du 17.10.2026).
 */
export type VigilancePoint = {
	level: "warning" | "info";
	/** Titre en gras, une phrase courte. FRANÇAIS. */
	title?: string;
	text: string;
	items?: string[];
};

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
	/** Une phrase, FRANÇAIS, sous le titre : ce que le visiteur obtient (§ 4.1, bloc 2). */
	promise: string;
	/** Une phrase, FRANÇAIS, au-dessus du formulaire : pour qui, cantons, année (§ 4.1, bloc 3). */
	scopeLine: string;
	/** Cas exemple, obligatoire (§ 4.2, décision n° 18). */
	example: CalculatorExample;
	/** Groupes de questions oui/non pré-remplis par profil (§ 4.3). */
	profiles?: ProfileGroup[];
	/** Points de vigilance, toujours affichés sous la carte résultat (§ 4.1). */
	vigilance?: VigilancePoint[];
	/**
	 * Conditions d'éligibilité, en liste de contrôle « remplie / non remplie »
	 * sous la carte (§ 4.3) : remplie quand `field` vaut `value`.
	 */
	eligibility?: { field: string; value: string; label: string }[];

	scope: {
		/** FRANÇAIS → bandeau, bloc « Pour qui ». */
		forWhom: string[];
		/** FRANÇAIS → bandeau, bloc « Ce que ça ne couvre pas ». */
		notCovered: {
			case: string;
			/**
			 * id d'un autre calculateur, lien externe — p. ex. le calculateur
			 * officiel d'un canton en couverture partielle —, ou conseil sans lien.
			 */
			alternative?: string | ExternalAlternative;
		}[];
		/** FRANÇAIS → bandeau + page méthodologie. */
		assumptions: string[];
		/** Codes officiels : VD, GE, VS, FR, NE, JU. */
		cantonsCovered: string[];
		/**
		 * Noms des cantons en couverture partielle (src/calculators/tax-coverage.ts),
		 * annoncés dans la ligne de périmètre, avant le formulaire (P5).
		 */
		partialCantons?: string[];
		referenceYear: number;
	};

	fields: FieldDefinition[];
	/** Chemin dans `lib/calculations/`. */
	engine: string;
	/** Identifiants du registre des sources : alimente /methodologie/ et le test d'attribution. */
	sourceIds: string[];
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
