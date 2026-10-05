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
		/** Marque textuelle de champ obligatoire (docs/design-system.md § 2.3). */
		requiredText: "(obligatoire)",
		/** Rubrique ou calculateur annoncé, sans page encore. */
		comingSoon: "En préparation",
		/** Valeur affichée tant qu'aucun résultat n'est disponible. */
		emptyValue: "—",
	},

	notFound: {
		/** Étiquette au-dessus du titre de la page 404. */
		eyebrow: "Erreur 404",
		title: "Cette page n'existe pas.",
		lead: "L'adresse est peut-être mal saisie, ou la page a été déplacée. Les calculateurs publiés sont accessibles depuis l'accueil.",
		home: "Retour à l'accueil",
		metaDescription: "La page demandée n'existe pas sur calculateurs.ch.",
	},

	home: {
		/** Lien d'action à la fin de chaque carte de famille. */
		familyCardAction: "Voir les calculateurs",
	},

	header: {
		familiesNavLabel: "Familles de calculateurs",
		/** Nom accessible du lien du logo vers l'accueil. */
		homeLabel: "calculateurs.ch — accueil",
		/** Bouton du menu replié, sous `md`. */
		menu: "Menu",
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
		privacy: "Politique de confidentialité",
		contact: "Contact",
		/** Titres des colonnes du pied de page. */
		calculatorsHeading: "Calculateurs",
		siteHeading: "Le site",
	},

	breadcrumb: {
		navLabel: "Fil d'Ariane",
		separator: "›",
	},

	scopeNotice: {
		forWhom: "Pour qui",
		notCovered: "Ce que ça ne couvre pas",
		assumptions: "Hypothèses retenues",
		/** Préfixe du premier titre d'un avertissement renforcé. */
		warningPrefix: "Attention : ",
	},

	/** Canton déclaré en couverture partielle par la couche de données. */
	partialCoverage: {
		notCoveredCase: (canton: string): string =>
			`${canton} : nos calculs ne reproduisent pas encore ceux du calculateur fiscal officiel du canton ; aucun résultat n'est affiché pour ce canton.`,
		useOfficialCalculator: "Utilisez le calculateur fiscal officiel du canton.",
		/** Couverture partielle limitée à certains ménages. */
		notCoveredHouseholdsCase: (canton: string, households: string): string =>
			`${canton}, ${households} : nos calculs ne reproduisent pas encore ceux du calculateur fiscal officiel du canton ; aucun résultat n'est affiché pour ces contribuables.`,
		/** Couverture limitée à certains ménages et aux communes dont le barème communal est relevé. */
		coveredHouseholdsAndMunicipalitiesCase: (canton: string, households: string, covered: string[]): string =>
			`${canton} : nous ne couvrons pour l'instant que ${households}, dans les communes suivantes : ${covered.join(", ")}. Pour les autres situations, utilisez la calculette officielle du canton.`,
		/** Ménages couverts, dans la phrase ci-dessus. */
		coveredHouseholds: {
			single: "les personnes seules sans enfant",
			singleWithChildren: "les personnes seules avec enfants",
			married: "les époux vivant en ménage commun",
		},
		households: {
			single: "personnes seules sans charge de famille",
			singleWithChildren:
				"personnes veuves, séparées, divorcées ou célibataires faisant ménage commun avec des enfants ou des personnes nécessiteuses",
			married: "époux vivant en ménage commun",
		},
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
		/** Rendu : « Barèmes 2026, jamais vérifiés. » */
		neverVerified: "jamais vérifiés",
	},

	relatedVariants: {
		title: "Variantes",
		navLabel: "Variantes de ce calculateur",
		/** Lien d'action à la fin de chaque carte de calculateur lié. */
		open: "Ouvrir le calculateur",
	},

	/**
	 * Annonce propre à chaque calculateur, rendue au build au-dessus du
	 * formulaire, quand l'année civile n'est pas encore relevée et que le
	 * calcul se fait sur une année antérieure (src/data/tax-years.ts).
	 */
	taxYearFallback: {
		pillar3aBuyback: (year: number, calendarYear: number): string =>
			`Ce calcul porte sur un rachat effectué en ${year} : les barèmes de ${calendarYear} ne sont pas encore relevés.`,
	},

	calculator: {
		faqTitle: "Questions fréquentes",
		/** Lien de la barre de résultat mobile vers le détail du calcul. */
		seeBreakdown: "Voir le détail",
	},

	dataPage: {
		/** Méta-description de /donnees/, 155 caractères au plus. */
		metaDescription:
			"Chaque source officielle utilisée sur le site, avec sa date de vérification et sa prochaine relecture.",
		title: "Données et sources",
		lead: "Chaque source officielle utilisée sur le site, le nombre de valeurs qu'elle alimente et l'échéance de sa prochaine relecture. Cette page est générée depuis la couche de données : elle ne peut pas mentir sur son propre état.",
		summary: (tracked: number, overdue: number): string =>
			`${tracked} source${tracked > 1 ? "s" : ""}, dont ${overdue} en retard.`,
		columnSource: "Source",
		columnAuthority: "Autorité",
		columnCadence: "Cadence",
		columnTracked: "Valeurs suivies",
		columnVerifiedOn: "Vérification la plus ancienne",
		columnDueOn: "Prochaine échéance",
		overdue: "En retard",
		neverVerified: "Jamais vérifiée",
		sourceUnknown: "source non enregistrée",
		empty:
			"Aucune valeur chiffrée n'est encore publiée. Cette page se remplira à mesure que les barèmes entrent dans la couche de données, chacun avec sa source et sa date de vérification.",
		cadence: {
			annual: "Annuelle",
			biennial: "Biennale",
			quarterly: "Trimestrielle",
			monthly: "Mensuelle",
			irregular: "Irrégulière",
			event: "Événementielle",
		},
		collectionTools: {
			heading: "Outils de collecte",
			intro:
				"Ces outils ont servi à relever les valeurs ; la source juridique de chacune reste l'acte officiel cité dans le tableau ci-dessus. Les conditions d'usage d'un outil s'appliquent aux données qu'il a fournies.",
			collectedValues: (count: number): string => `${count} valeur${count > 1 ? "s" : ""} relevée${count > 1 ? "s" : ""}`,
		},
		municipalCsv: {
			heading: "Détail communal",
			intro: (count: number): string =>
				`Les coefficients communaux (${count} communes) ne sont pas listés ligne par ligne ici — ce tableau reste lisible quel que soit le nombre de communes. Le détail complet, avec la source et la date de vérification de chaque valeur, est disponible en CSV.`,
			downloadLabel: "Télécharger les coefficients communaux (CSV)",
			unitCaveat:
				"Les coefficients sont repris tels que reçus de l'AFC ; leur unité (points d'indice, centimes additionnels…) reste à confirmer auprès du droit fiscal cantonal avant usage dans un calculateur — voir la méthodologie.",
		},
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
		/** Préfixes des messages d'état (docs/design-system.md § 2.6). */
		sentPrefix: "Envoyé : ",
		failedPrefix: "Erreur : ",
		sent: "Demande envoyée. Le partenaire vous recontacte directement.",
		failed:
			"L'envoi a échoué. Réessayez plus tard — votre résultat reste affiché ci-dessus.",
	},
} as const;
