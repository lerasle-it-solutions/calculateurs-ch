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
