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
import { formatSwissNumber } from "../lib/format/chf";

const SITE_NAME = "calculateurs.ch";

export const fr = {
	site: {
		name: SITE_NAME,
		/** Balise title d'une page hors calculateur : « <nom> · calculateurs.ch » (docs/editorial-style.md § 3.1). */
		pageTitle: (name: string): string => `${name} · ${SITE_NAME}`,
		baseline: "Calculateurs suisses romands qui affichent leurs sources.",
		/** Adresse de contact, toujours affichée en clair dans son lien mailto: (pied de page, pages légales). */
		contactEmail: "contact@calculateurs.ch",
		/** Dépôt public du code source (adresse déjà publiée : mentions légales, méthodologie). */
		repositoryUrl: "https://github.com/lerasle-it-solutions/calculateurs-ch",
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
		/**
		 * Valeur par défaut d'une carte sans résultat (page sans cas exemple, démonstration) : vide,
		 * jamais un tiret (docs/editorial-style.md § 3.1). Les calculateurs publiés passent toujours le
		 * résultat de leur cas exemple, calculé au build (docs/design-system.md § 4.2).
		 */
		emptyValue: "",
	},

	notFound: {
		/** Étiquette au-dessus du titre de la page 404. */
		eyebrow: "Erreur 404",
		title: "Cette page n’existe pas.",
		lead: "L’adresse est peut-être mal saisie, ou la page a été déplacée. Les calculateurs publiés sont accessibles depuis l’accueil.",
		home: "Retour à l’accueil",
		metaDescription: "La page demandée n’existe pas sur calculateurs.ch.",
	},

	home: {
		/** Balise title de l'accueil, moins de 60 caractères (docs/editorial-style.md § 5). */
		metaTitle: "Calculs d’impôt sourcés en Suisse romande · calculateurs.ch",
		/** 155 caractères au plus. */
		metaDescription:
			"Des calculateurs d’impôt et de prévoyance pour la Suisse romande, dont chaque chiffre est sourcé et daté. Aucun compte, aucun cookie de suivi.",
		heroTitle: "Combien votre 3e pilier vous fait-il économiser d’impôt ?",
		heroLead: "Indiquez votre commune, votre revenu imposable et votre versement. Le calcul se fait dans votre navigateur.",
		/** Libellés courts des trois champs du héros. */
		heroMunicipality: "Commune de domicile",
		heroIncome: "Revenu imposable",
		heroContribution: (year: number): string => `Montant versé au 3a en ${year}`,
		refine: "Affiner avec ma situation complète",
		/**
		 * Compte à rebours, du 1er octobre à la date limite. `deadline` : la date lue dans les données,
		 * formatée au build (« 31 décembre ») ; « {days} » est remplacé dans le navigateur.
		 */
		countdown: (year: number, deadline: string): string =>
			`Il reste {days} jours pour verser votre 3a ${year}, et le versement doit être crédité au plus tard le ${deadline}. Comptez quelques jours ouvrables pour que le virement soit crédité.`,
		/** Le jour de la date limite. */
		countdownLastDay: (year: number): string => `Dernier jour pour que votre versement 3a ${year} soit crédité.`,
		proofHeading: "Les données",
		proofCantons: (count: number): string => `${count} cantons romands`,
		proofMunicipalities: (count: number): string => `${formatSwissNumber(count)} communes`,
		proofVerified: "Barèmes vérifiés le",
		proofSource: "Code source ouvert",
		calculatorsHeading: "Les calculateurs",
		/** Résultat type d'une carte, calculé au build sur le cas exemple. */
		typicalResult: (municipality: string, income: string, saving: string): string => `${municipality}, ${income} : ${saving} d’impôt en moins`,
		openCalculator: "Calculer",
		whyHeading: "Comment ces chiffres sont calculés",
		why: [
			{
				title: "Calculé deux fois, jamais au taux marginal",
				text: "Votre impôt est calculé deux fois, avant et après la déduction. L’économie affichée est la différence entre les deux, jamais un taux marginal multiplié par votre versement.",
			},
			{
				title: "Chaque montant sourcé et daté",
				text: "Les barèmes, les coefficients et les plafonds viennent des textes officiels. Chaque valeur porte sa date de vérification, publiée sur la page des données.",
			},
			{
				title: "Rien ne quitte votre navigateur",
				text: "Le calcul se fait sur votre appareil, sans compte ni cookie de suivi. Vos saisies ne sont envoyées nulle part.",
			},
		],
		guideHeading: "Le guide",
		guideAction: "Lire le guide",
		/** Lien d'action à la fin de chaque carte de famille. */
		familyCardAction: "Voir les calculateurs",
		/** Seule ligne des familles sans calculateur publié, libellés de `fr.family`. Aucune date promise. */
		comingSoon: (families: string[]) =>
			`Prochainement : ${families.map((family) => family.toLocaleLowerCase("fr-CH")).join(", ")}.`,
	},

	header: {
		navLabel: "Navigation principale",
		/** Nom accessible du lien du logo vers l'accueil. */
		homeLabel: "Accueil de calculateurs.ch",
		/** Sous `md`, bouton du menu replié (<details>), qui contient les entrées et la pastille. */
		menu: "Menu",
		/** Trois entrées (docs/design-system.md § 2.4, révisé le 17.10.2026). */
		calculators: "Calculateurs",
		guides: "Guides",
		methodology: "Méthodologie",
		/** Pastille liée à /donnees/ : date de vérification du site, jamais « à jour ». */
		verified: "Sources vérifiées le",
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
		repository: "Code source sur GitHub",
		verified: "Sources vérifiées le",
		/** Courriel prérempli avec l'URL de la page, composé au build : aucune saisie du calculateur. */
		reportError: "Signaler une erreur",
		reportSubject: "Erreur sur calculateurs.ch",
		reportBody: (url: string): string => `Page concernée : ${url}\n\nCe qui me semble faux :\n`,
		/** Ligne d'identité de l'éditeur (texte du mainteneur, 17.10.2026). */
		publisher: "Édité par Lerasle IT Solutions, Epalinges (VD). Les calculs ne dépendent d’aucune banque, assurance ni autre prestataire.",
		methodology: "Méthodologie",
		data: "Données et sources",
		legal: "Mentions légales",
		privacy: "Politique de confidentialité",
		/** Titres des colonnes du pied de page. */
		calculatorsHeading: "Calculateurs",
		siteHeading: "Le site",
	},

	breadcrumb: {
		navLabel: "Fil d’Ariane",
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
		/** Ligne de périmètre : cantons déclarés en couverture partielle, liés au détail (§ 4.1). */
		scopeLine: (cantons: string[]): string => `${cantons.join(", ")} : couverture partielle.`,
		/** Préfixe du message de couverture sous le champ commune (avertissement renforcé, § 2.6). */
		fieldPrefix: "Attention :",
		notCoveredCase: (canton: string): string =>
			`${canton} : nos calculs ne reproduisent pas encore ceux du calculateur fiscal officiel du canton, et aucun résultat n’est donc affiché pour ce canton.`,
		useOfficialCalculator: "Utilisez le calculateur fiscal officiel du canton.",
		/** Couverture partielle limitée à certains ménages. */
		notCoveredHouseholdsCase: (canton: string, households: string): string =>
			`${canton}, ${households} : nos calculs ne reproduisent pas encore ceux du calculateur fiscal officiel du canton, et aucun résultat n’est donc affiché pour ces contribuables.`,
		/** Couverture limitée à certains ménages et aux communes dont le barème communal est relevé. */
		coveredHouseholdsAndMunicipalitiesCase: (canton: string, households: string, covered: string[]): string =>
			`${canton} : nous ne couvrons pour l’instant que ${households}, et seulement dans ${covered.length > 1 ? "les communes de" : "la commune de"} ${covered.join(", ")}. Pour les autres situations, utilisez la calculette officielle du canton.`,
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
		empty: "Le détail du calcul s’affiche dès que la carte résultat donne un montant.",
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
			`Ce calcul porte sur un rachat effectué en ${year} : les barèmes de ${calendarYear} ne sont pas encore relevés.`,
		pillar3aTaxSaving: (year: number, calendarYear: number): string =>
			`Ce calcul porte sur un versement effectué en ${year} : les barèmes de ${calendarYear} ne sont pas encore relevés.`,
		lppBuyback: (year: number, calendarYear: number): string =>
			`Ce calcul porte sur un rachat effectué en ${year} : les barèmes de ${calendarYear} ne sont pas encore relevés.`,
	},

	familyPage: {
		/** Page de famille : chapeau et méta-description (155 caractères au plus), une entrée par famille publiée. */
		pension: {
			metaDescription: "Calculateurs du 3e pilier et du 2e pilier pour la Suisse romande, avec la source et la date de chaque chiffre.",
			lead: "Des calculateurs pour votre 3e pilier et votre caisse de pension, en Suisse romande. Chaque chiffre vient d’une source officielle, datée.",
		},
		guidesHeading: "Guides",
		/** Lien d'action à la fin de chaque carte de guide. */
		readGuide: "Lire le guide",
	},

	article: {
		/** Avant la date de mise à jour, en tête d'article. */
		updatedOn: "Mis à jour le",
		readingTime: (minutes: number): string => `Lecture : ${minutes} minutes`,
		sourcesHeading: "Sources officielles",
		/** Réserve en fin d'article, datée de sa mise à jour. */
		disclaimer: (date: string): string =>
			`Cet article décrit le droit en vigueur au ${date}. Il ne constitue pas un conseil fiscal ou financier personnalisé.`,
	},

	/** Deux chemins en tête du formulaire (docs/design-system.md § 4.3). */
	incomePath: {
		legend: "Votre point de départ",
		gross: "Je pars de mon salaire brut",
		taxable: "Je connais mon revenu imposable",
		/** Estimateur sans données pour l'année de calcul : chemin brut désactivé (arbitrage du 17.10.2026). */
		grossUnavailable: (year: number): string =>
			`L’estimation depuis le salaire brut n’est pas encore disponible pour ${year} : partez de votre revenu imposable.`,
		/** Bandeau du cas exemple : lien vers le chemin brut. */
		exampleGrossLink: "ou partez de votre salaire brut",
		/** Revenu fédéral pré-rempli depuis le cantonal, lien qui le déplie. */
		federalSame: "Revenu imposable fédéral : identique au cantonal.",
		federalDifferent: "Différent ?",
		/** Déplié : le lien replie le champ, le fédéral reprend le cantonal. */
		federalSameLink: "Identique au cantonal ?",
		federalAssumedLabel: "Revenu imposable fédéral",
		federalAssumed: "Supposé égal au revenu imposable cantonal ; dépliez « Différent ? » pour le saisir.",
		grossSalaryMissing: "Saisissez votre salaire brut.",
		/** Carte résultat, donnée manquante (§ 4.4) : commune ou revenu imposable vide. */
		municipalityMissing: "Indiquez votre commune de domicile.",
		taxableIncomeMissing: "Indiquez votre revenu imposable.",
		inputMissingShort: "Saisie à compléter, voir le message",
		ageMissing: "Saisissez votre âge.",
		grossMissingShort: "Salaire brut à saisir, voir le message",
	},

	/** Saisie des nombres (NumberField, docs/design-system.md § 2.3) : messages sous le champ, préfixés « Erreur : ». */
	numberField: {
		errorPrefix: "Erreur :",
		invalid: "saisissez un nombre, par exemple 70’000.",
		min: (min: string): string => `indiquez au moins ${min}.`,
		max: (max: string): string => `indiquez au plus ${max}.`,
		step: (step: string): string => (step === "1" ? "indiquez un nombre entier." : `indiquez un multiple de ${step}.`),
		/** Les mêmes, en gabarits (« {n} » : la borne), rendus une fois sur le formulaire. */
		get templates() {
			return { invalid: this.invalid, min: this.min("{n}"), max: this.max("{n}"), step: this.step("{n}"), integer: this.step("1") };
		},
		/** Carte et barre mobile quand un champ est à corriger. */
		cardStatus: "Corrigez la saisie signalée sous le champ.",
		cardShort: "Saisie à corriger, voir le message",
	},

	/** Profils de questions oui/non, conditions d'éligibilité, enfants, bouton du maximum (§ 4.3). */
	form: {
		conditionMet: "remplie",
		conditionNotMet: "non remplie",
		eligibilityHeading: "Conditions d’éligibilité",
		/** « {amount} » : plafond retenu par le moteur, formaté. */
		depositMaximum: (amount: string): string => `Verser le maximum (${amount} CHF)`,
	},

	/** Mode « salaire brut » des calculateurs (estimateur du revenu imposable, W08 B2). */
	grossEstimator: {
		intro:
			"Vos revenus imposables seront estimés depuis votre salaire brut, avec les hypothèses détaillées dans le calcul. Le résultat devient une estimation.",
		grossSalary: "Salaire brut annuel",
		grossSalaryHint: "Avant toute déduction.",
		age: "Âge",
		pensionContribution: "Cotisation LPP annuelle",
		spouseGrossSalary: "Salaire brut annuel de votre conjoint ou partenaire",
		spouseAge: "Âge de votre conjoint ou partenaire",
		spousePensionContribution: "Cotisation LPP annuelle de votre conjoint ou partenaire",
		pensionHint: (upperSalaryLimit: string): string =>
			`Reportez le montant de votre fiche de salaire. Le minimum légal est souvent dépassé, surtout au-delà de ${upperSalaryLimit} CHF de salaire.`,
		premiumsPerAdult: "Primes d’assurance maladie et accidents payées dans l’année, par adulte",
		premiumsPerChild: "Primes d’assurance maladie et accidents payées dans l’année, par enfant",
		premiumsHint: "Montant figurant sur vos polices ou votre attestation de primes.",
		accidentRate: "Taux de l’assurance-accidents non professionnelle",
		accidentRateHint: "Taux figurant sur votre fiche de salaire.",
		/** Mention sous le résultat quand les revenus imposables sont estimés. */
		resultNote: "Estimation depuis le salaire brut",
	},

	calculator: {
		faqTitle: "Questions fréquentes",
		/** Bandeau du cas exemple (docs/design-system.md § 4.2) : « Exemple : <label>. Remplacez par vos chiffres, ou partez de votre salaire brut. » */
		examplePrefix: "Exemple :",
		/** Ligne de périmètre → détail replié (§ 4.1, P5). */
		assumptionsLink: "Ce que ce calcul suppose",
		assumptionsSummary: "Ce que ce calcul suppose",
		/** Introduction du calculateur, dans « Ce que ce calcul suppose ». */
		introHeading: "Le calcul en bref",
		/** Points de vigilance sous la carte (§ 4.1, bloc 5). */
		vigilanceHeading: "Points de vigilance",
		/** Texte complet d'un point de vigilance, replié. */
		vigilanceMore: "En savoir plus",
		/** Préfixe d'un avertissement renforcé (§ 2.6). */
		warningPrefix: "Attention :",
		exampleReplace: "Remplacez par vos chiffres",
		/** Lien de la barre de résultat mobile vers le détail du calcul. */
		seeBreakdown: "Voir le détail",
		/** Échec du chargement du calcul (cœur ou fichier de données) : message neutre dans la carte. */
		loadFailed: "Le calcul n’a pas pu se charger. Vérifiez votre connexion, puis réessayez.",
		loadRetry: "Réessayer",
		/** Même échec, dans la barre de résultat mobile. */
		loadFailedShort: "Calcul indisponible",
	},

	guidesPage: {
		title: `Guides · ${SITE_NAME}`,
		heading: "Guides",
		lead: "Les règles derrière chaque calcul, expliquées et sourcées, avec un exemple chiffré.",
		/** 155 caractères au plus. */
		metaDescription: "Guides de prévoyance et de fiscalité pour la Suisse romande : les règles derrière chaque calculateur, expliquées et sourcées.",
	},

	/** Sous le chiffre de la carte et sous la carte (docs/design-system.md § 4.4). */
	resultSummary: {
		/** « {share} » : « 26 % ». Suit le montant. */
		share: "soit {share} de votre versement",
		netCost: "votre versement de {paid} ne vous coûte que {netCost} cette année",
		/** Somme saisie au-delà du montant retenu (plafond 3a) : la phrase nomme sa base. */
		shareCapped: "soit {share} du montant déductible ({paid})",
		netCostCapped: "la part déductible de votre versement ne vous coûte que {netCost} cette année",
		/** Barre de résultat mobile. */
		barNetCost: "coût net {netCost}",
		/** Lignes de la trace. */
		shareLabel: "Économie rapportée au montant déductible",
		netCostLabel: "Coût net du montant déductible cette année",
		componentsHeading: "Économie par impôt",
		components: {
			cantonalTax: "Impôt cantonal",
			municipalTax: "Impôt communal",
			churchTax: "Impôt paroissial",
			personalTax: "Taxe personnelle",
			federalTax: "Impôt fédéral direct",
		},
	},

	dataPage: {
		/** Méta-description de /donnees/, 155 caractères au plus. */
		metaDescription:
			"Chaque source officielle utilisée sur le site, avec sa date de vérification et sa prochaine relecture.",
		title: "Données et sources",
		lead: "Chaque source officielle utilisée sur le site, le nombre de valeurs qu’elle alimente et l’échéance de sa prochaine relecture. Cette page est générée depuis la couche de données, si bien qu’elle ne peut pas mentir sur son propre état.",
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
			"Aucune valeur chiffrée n’est encore publiée. Cette page se remplira à mesure que les barèmes entrent dans la couche de données, chacun avec sa source et sa date de vérification.",
		cadence: {
			annual: "Annuelle",
			biennial: "Biennale",
			quarterly: "Trimestrielle",
			monthly: "Mensuelle",
			irregular: "Irrégulière",
			event: "Événementielle",
		},
		ruleSources: {
			heading: "Sources des règles",
			intro:
				"Ces sources fondent une règle de calcul, qu’il s’agisse d’un plafond, d’une condition ou d’une méthode, sans fournir de valeur chiffrée. Elles ne figurent donc pas dans le tableau ci-dessus.",
			verifiedOn: "vérifiée le",
		},
		collectionTools: {
			heading: "Outils de collecte",
			intro:
				"Ces outils ont servi à relever les valeurs, mais la source juridique de chacune reste l’acte officiel cité dans le tableau ci-dessus. Les conditions d’usage d’un outil s’appliquent aux données qu’il a fournies.",
			collectedValues: (count: number): string => `${formatSwissNumber(count)} valeur${count > 1 ? "s" : ""} relevée${count > 1 ? "s" : ""}`,
		},
		municipalCsv: {
			heading: "Détail communal",
			intro: (count: number): string =>
				`Les coefficients communaux (${formatSwissNumber(count)} communes) ne sont pas listés ligne par ligne ici, pour que ce tableau reste lisible quel que soit le nombre de communes. Le détail complet, avec la source et la date de vérification de chaque valeur, est disponible en CSV.`,
			downloadLabel: "Télécharger les coefficients communaux (CSV)",
			unitCaveat:
				"Les coefficients sont repris tels que reçus de l’AFC. Leur unité (points d’indice, centimes additionnels…) reste à confirmer auprès du droit fiscal cantonal avant tout usage dans un calculateur, comme l’explique la méthodologie.",
		},
	},

	leadForm: {
		heading: (partner: string): string => `Être mis en relation avec ${partner}`,
		name: "Nom et prénom",
		email: "Adresse e-mail",
		phone: "Téléphone",
		consent: (partner: string): string =>
			`J’accepte que mes coordonnées soient transmises à ${partner} dans le seul but indiqué ci-dessus. Aucune autre transmission, aucune revente.`,
		submit: "Envoyer la demande",
		sending: "Envoi en cours…",
		/** Préfixes des messages d'état (docs/design-system.md § 2.6). */
		sentPrefix: "Envoyé : ",
		failedPrefix: "Erreur : ",
		sent: "Demande envoyée. Le partenaire vous recontacte directement.",
		failed:
			"L’envoi a échoué. Réessayez plus tard, votre résultat reste affiché ci-dessus.",
	},
} as const;
