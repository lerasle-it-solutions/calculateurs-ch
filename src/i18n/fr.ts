/**
 * Chaînes d'interface — français.
 *
 * Règle (CLAUDE.md R5 / § 8) : les clés sont en anglais, camelCase ; les valeurs
 * sont en français, casse phrase. Toute chaîne affichée à l'utilisateur passe
 * par ce fichier. Les textes propres à un calculateur (titre, intro, FAQ,
 * libellés de champs) vivent dans sa `CalculatorDefinition`, pas ici.
 *
 * Le routage multilingue n'est pas construit (décision 7) : un seul fichier,
 * importé directement.
 */
export const fr = {
	site: {
		name: "calculateurs.ch",
		baseline: "Calculateurs suisses romands qui affichent leurs sources.",
	},

	common: {
		home: "Accueil",
		skipToContent: "Aller au contenu principal",
		/** Marque de champ obligatoire, accolée au libellé. */
		requiredMark: " *",
		/** Valeur affichée tant qu'aucun résultat n'est disponible. */
		emptyValue: "—",
	},

	header: {
		familiesNavLabel: "Familles de calculateurs",
	},

	/** Libellés des familles. Les segments d'URL vivent dans calculators/families.ts. */
	family: {
		pension: "Prévoyance",
		property: "Immobilier",
		energy: "Énergie",
		business: "Entreprise",
	},

	footer: {
		navLabel: "Pied de page",
		methodology: "Méthodologie",
		data: "Données et sources",
		legal: "Mentions légales",
		contact: "Contact",
	},

	breadcrumb: {
		navLabel: "Fil d'Ariane",
		separator: "/",
	},

	scopeNotice: {
		forWhom: "Pour qui",
		notCovered: "Ce que ça ne couvre pas",
		assumptions: "Hypothèses retenues",
	},

	breakdown: {
		summary: "Voir le calcul ligne par ligne",
		stepColumn: "Étape",
		amountColumn: "Montant",
		empty: "Renseignez les champs pour voir le détail du calcul.",
	},

	dataFreshness: {
		/** Rendu : « Barèmes 2026, vérifiés le 08.01.2026. » */
		scalesLabel: "Barèmes",
		verifiedLabel: "vérifiés le",
	},

	relatedVariants: {
		title: "Variantes",
		navLabel: "Variantes de ce calculateur",
	},

	calculator: {
		faqTitle: "Questions fréquentes",
	},

	dataPage: {
		title: "Données et sources",
		lead: "Chaque valeur chiffrée utilisée sur le site, avec sa source officielle, sa date de vérification et l'échéance de sa prochaine relecture. Cette page est générée depuis la couche de données : elle ne peut pas mentir sur son propre état.",
		summary: (tracked: number, overdue: number): string =>
			`${tracked} valeur${tracked > 1 ? "s" : ""} suivie${tracked > 1 ? "s" : ""}, dont ${overdue} en retard.`,
		columnName: "Donnée",
		columnValue: "Valeur",
		columnSource: "Source",
		columnVerifiedOn: "Vérifié le",
		columnDueOn: "Prochaine échéance",
		overdue: "En retard",
		sourceUnknown: "source non enregistrée",
		empty:
			"Aucune valeur chiffrée n'est encore publiée. Cette page se remplira à mesure que les barèmes entrent dans la couche de données, chacun avec sa source et sa date de vérification.",
	},

	leadForm: {
		heading: (partner: string): string => `Être mis en relation avec ${partner}`,
		name: "Nom et prénom",
		email: "Adresse e-mail",
		phone: "Téléphone",
		consent: (partner: string): string =>
			`J'accepte que mes coordonnées soient transmises à ${partner} dans le seul but indiqué ci-dessus. Aucune autre transmission, aucune revente.`,
		submit: "Envoyer la demande",
		sending: "Envoi en cours…",
		sent: "Demande envoyée. Le partenaire vous recontacte directement.",
		failed:
			"L'envoi a échoué. Réessayez plus tard — votre résultat reste affiché ci-dessus.",
	},
} as const;
