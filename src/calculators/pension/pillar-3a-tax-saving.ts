/**
 * A2 — Économie d'impôt d'un versement 3a.
 *
 * Fiche validée par le mainteneur le 07.10.2026, après confrontation à l'art. 7
 * OPP 3 et à la circulaire AFC n° 18a ; elle remplace celle du catalogue v2.
 * Toute valeur chiffrée vient des données (R2) : année fiscale, « petite » et
 * « grande » cotisation, part du revenu des personnes non affiliées. Une seule
 * année de calcul pour l'instant (décision du 05.10.2026).
 */
import { getFederalData } from "../../data";
import { resolveTaxYear } from "../../data/tax-years";
import { formatChf, formatPercent } from "../../lib/format/chf";
import { municipalityOptions } from "../municipalities";
import { taxEngineCoverage } from "../tax-coverage";
import { taxEngineSourceIds } from "../tax-engine-sources";
import type { CalculatorDefinition, FieldDefinition } from "../types";
import { PILLAR_3A_BUYBACK_ID, pillar3aBuybackTexts } from "./pillar-3a-buyback";

export const PILLAR_3A_TAX_SAVING_ID = "pension.pillar-3a-tax-saving";

/**
 * Année de calcul : l'année civile de la construction si toutes les données
 * d'A2 sont relevées pour elle, sinon la plus récente année complète qui la
 * précède (src/data/tax-years.ts).
 */
export const pillar3aTaxSavingTaxYear = resolveTaxYear(PILLAR_3A_TAX_SAVING_ID);
export const pillar3aTaxSavingYear = pillar3aTaxSavingTaxYear.year;

const pillar3a = getFederalData(pillar3aTaxSavingYear).pillar3a;
const smallCap = pillar3a.smallContributionCap.value;
const largeCap = pillar3a.largeContributionCap.value;
const largeRate = pillar3a.largeContributionIncomeRate.value;
const year = pillar3aTaxSavingYear;

// Montants rendus à la construction (introduction, aides, FAQ) : formateur unique du site.
const chf = formatChf;
const percent = (rate: number): string => formatPercent(rate);

export const pillar3aTaxSavingIntro: string[] = [
	`Votre versement au pilier 3a se déduit de votre revenu imposable, pour l'impôt fédéral comme pour l'impôt cantonal et communal. Le plafond dépend de votre affiliation à un 2e pilier, pas de votre statut : affilié à une caisse de pension, vous déduisez au plus la « petite » cotisation, ${chf(smallCap)} CHF en ${year} ; sans caisse de pension, ${percent(largeRate)} du revenu de votre activité lucrative, au plus ${chf(largeCap)} CHF.`,
	"Ce calculateur calcule votre impôt deux fois, avant et après la déduction, et affiche la différence exacte, étape par étape.",
];

/** Sources du moteur fiscal, puis celles du pilier 3a (fiche A2, § Sources). */
const sourceIds = [
	...new Set([
		...taxEngineSourceIds(pillar3aTaxSavingYear),
		"opp3-art-7a",
		"ofas-pillar-3a-caps",
		"ofas-amounts-2027",
		"afc-circular-18a",
	]),
];

const yesNo = [
	{ value: "yes", label: "Oui" },
	{ value: "no", label: "Non" },
];

const coverage = taxEngineCoverage();


/** Cas exemple : saisies de scénario, fictives (§ 4.2) ; le versement est le plafond de l'année, lu dans les données. */
const EXAMPLE = { cantonalTaxableIncome: 70_000, federalTaxableIncome: 72_000 };

const taxableIncomeHint =
	"Partez du revenu imposable de votre dernière décision de taxation et ajoutez-y la déduction 3a qui y figure, s'il y en a une : le calcul porte sur le revenu avant cette déduction.";
const avsIncomeHint = "Salaire, revenu d'indépendant ou revenu de remplacement, comme les indemnités de chômage.";
const affiliationHint =
	"Affilié à une caisse de pension, à titre obligatoire ou facultatif. Après l'âge de référence, une personne qui touche une rente de sa caisse et n'y est plus assurée n'est plus affiliée ; si elle y reste assurée, même sans cotiser, elle l'est encore.";
const earnedIncomeHint =
	"Seulement sans caisse de pension. Salarié : salaire brut moins les cotisations AVS, AI, APG et AC. Indépendant : résultat après rectifications fiscales, moins les cotisations AVS, AI et APG.";

/** Libellés des champs d'une personne : vous, ou votre conjoint ou partenaire (règles 1 à 4, conditions personnelles). */
const CONTRIBUTOR_LABELS = {
	you: {
		hasAvsIncome: `Avez-vous un revenu soumis à l'AVS en ${year} ?`,
		reachedReferenceAge: "Avez-vous atteint l'âge de référence AVS ?",
		workingAfterReferenceAge:
			"Exercez-vous encore une activité lucrative, et avez-vous atteint l'âge de référence il y a moins de cinq ans ?",
		affiliated: "Êtes-vous affilié à une caisse de pension (2e pilier) ?",
		earnedIncome: `Revenu de votre activité lucrative en ${year}`,
		contribution: `Montant versé au pilier 3a en ${year}`,
	},
	spouse: {
		hasAvsIncome: `Votre conjoint ou partenaire a-t-il un revenu soumis à l'AVS en ${year} ?`,
		reachedReferenceAge: "Votre conjoint ou partenaire a-t-il atteint l'âge de référence AVS ?",
		workingAfterReferenceAge:
			"Votre conjoint ou partenaire exerce-t-il encore une activité lucrative, et a-t-il atteint l'âge de référence il y a moins de cinq ans ?",
		affiliated: "Votre conjoint ou partenaire est-il affilié à une caisse de pension (2e pilier) ?",
		earnedIncome: `Revenu de l'activité lucrative de votre conjoint ou partenaire en ${year}`,
		contribution: `Montant versé au pilier 3a par votre conjoint ou partenaire en ${year}`,
	},
};

/** Légende et pastilles des profils de chaque personne (§ 4.3) ; celles du conjoint ou partenaire le nomment. */
const PROFILE_LABELS = {
	you: {
		legend: "Votre situation",
		employeeWithPension: "Salarié avec caisse de pension, avant l'âge de référence",
		selfEmployedWithoutPension: "Indépendant sans caisse de pension",
		other: "Autre situation",
	},
	spouse: {
		legend: "Situation de votre conjoint ou partenaire",
		employeeWithPension: "Conjoint ou partenaire salarié avec caisse de pension, avant l'âge de référence",
		selfEmployedWithoutPension: "Conjoint ou partenaire indépendant sans caisse de pension",
		other: "Autre situation du conjoint ou partenaire",
	},
};

/** Nom d'un champ de personne : « affiliated » pour vous, « spouseAffiliated » pour le conjoint ou partenaire. */
export const contributorFieldName = (person: "you" | "spouse", field: string): string =>
	person === "you" ? field : `spouse${field[0]!.toUpperCase()}${field.slice(1)}`;

/** Champs d'une personne qui cotise, dans l'ordre des règles de la fiche. */
const contributorFields = (person: "you" | "spouse"): FieldDefinition[] => {
	const label = CONTRIBUTOR_LABELS[person];
	const name = (field: keyof typeof label) => contributorFieldName(person, field);
	// Champs du conjoint ou partenaire : seulement pour un couple
	const couple = person === "spouse" ? [{ field: "maritalStatus", value: "married" }] : [];
	return [
		{ kind: "select", name: name("hasAvsIncome"), label: label.hasAvsIncome, options: yesNo, defaultValue: "yes", hint: avsIncomeHint, required: true, shownWhen: couple },
		{ kind: "select", name: name("reachedReferenceAge"), label: label.reachedReferenceAge, options: yesNo, defaultValue: "no", required: true, shownWhen: couple },
		{
			kind: "select",
			name: name("workingAfterReferenceAge"),
			label: label.workingAfterReferenceAge,
			options: yesNo,
			defaultValue: "yes",
			required: true,
			shownWhen: [...couple, { field: name("reachedReferenceAge"), value: "yes" }],
		},
		{ kind: "select", name: name("affiliated"), label: label.affiliated, options: yesNo, defaultValue: "yes", hint: affiliationHint, required: true, shownWhen: couple },
		{
			kind: "number",
			name: name("earnedIncome"),
			label: label.earnedIncome,
			unit: "CHF",
			step: 1,
			hint: earnedIncomeHint,
			shownWhen: [...couple, { field: name("affiliated"), value: "no" }],
		},
		{ kind: "number", name: name("contribution"), label: label.contribution, unit: "CHF", min: 0, step: 1, required: true, shownWhen: couple, maximumButton: true },
	];
};

const fields: FieldDefinition[] = [
	{
		kind: "municipality",
		name: "municipality",
		label: "Commune de domicile",
		// Un seul champ commune : le canton est déduit, les homonymes portent le leur (§ 4.3)
		options: municipalityOptions(coverage.cantonsCovered),
		hint: "Commencez à saisir le nom de la commune ; le canton en est déduit.",
		required: true,
	},
	{
		kind: "select",
		name: "maritalStatus",
		label: "État civil",
		options: [
			{ value: "single", label: "Célibataire, veuf, divorcé ou séparé" },
			{ value: "married", label: "Marié ou lié par un partenariat enregistré" },
		],
		defaultValue: "single",
		required: true,
	},
	{ kind: "number", name: "children", label: "Nombre d'enfants", min: 0, step: 1, defaultValue: 0, required: true },
	{ kind: "childAges", name: "childrenAges", label: "Âge des enfants", countField: "children", itemLabel: "Âge de l'enfant {n}" },
	{
		kind: "number",
		name: "cantonalTaxableIncome",
		label: "Revenu imposable cantonal",
		unit: "CHF",
		min: 0,
		step: 1,
		hint: taxableIncomeHint,
		required: true,
		incomePath: true,
	},
	{
		kind: "number",
		name: "federalTaxableIncome",
		label: "Revenu imposable fédéral",
		unit: "CHF",
		min: 0,
		step: 1,
		hint: taxableIncomeHint,
		required: true,
		incomePath: true,
		sameAs: "cantonalTaxableIncome",
	},
	...contributorFields("you"),
	...contributorFields("spouse"),
];

/**
 * Rappels affichés avec chaque résultat (règles 5 et 8, imposition au retrait,
 * A4 sans lien) : points de vigilance de la page, en avertissement renforcé,
 * chacun pouvant coûter la déduction ou de l'argent (arbitrage du 17.10.2026).
 */
const reminders = [
	"Le capital 3a sera imposé à son retrait, séparément de vos autres revenus et à taux réduit : l'économie affichée n'en tient pas compte. Le calculateur du retrait en capital LPP/3a est en préparation.",
	`Pour être déductible en ${year}, le versement doit être crédité sur votre compte ou votre police 3a au plus tard le 31 décembre (circulaire AFC n° 18a, ch. 5.1).`,
	"L'année où vous cessez votre activité lucrative, la cotisation entière reste déductible, à condition d'être versée avant la fin de l'activité (art. 7 al. 4 OPP 3).",
];

export const pillar3aTaxSaving: CalculatorDefinition = {
	id: PILLAR_3A_TAX_SAVING_ID,
	family: "pension",
	slug: "/prevoyance/economie-impot-3a/",
	title: "Économie d'impôt d'un versement 3a",
	metaDescription:
		"Calculez l'impôt économisé grâce à votre versement au pilier 3a dans votre commune romande, selon votre affiliation à un 2e pilier.",
	promise: "L'impôt économisé par votre versement au pilier 3a.",
	scopeLine: `Personnes avec un revenu soumis à l'AVS, imposées au régime ordinaire en Suisse romande, versement en ${year}.`,
	example: {
		label: `personne seule à Lausanne, avec caisse de pension, revenu imposable de ${chf(EXAMPLE.cantonalTaxableIncome)} CHF, versement maximal`,
		values: {
			municipality: "Lausanne",
			maritalStatus: "single",
			children: "0",
			cantonalTaxableIncome: String(EXAMPLE.cantonalTaxableIncome),
			federalTaxableIncome: String(EXAMPLE.federalTaxableIncome),
			// Plafond de l'année, lu dans les données : jamais un montant tapé (§ 4.2)
			contribution: String(smallCap),
		},
	},

	scope: {
		forWhom: [
			"Personne domiciliée dans un canton romand, imposée au régime ordinaire, qui réalise un revenu soumis à l'AVS (salaire, revenu d'indépendant ou revenu de remplacement comme les indemnités de chômage) et veut connaître l'économie d'impôt de sa cotisation 3a ordinaire.",
		],
		notCovered: [
			{
				case: "Le rachat de lacunes des personnes affiliées à un 2e pilier.",
				alternative: PILLAR_3A_BUYBACK_ID,
			},
			{
				case: "Le rachat de lacunes des personnes non affiliées à un 2e pilier.",
				alternative: { label: "Adressez-vous à votre fondation ou à votre assurance 3a." },
			},
			{
				case: "L'imposition du capital à son retrait.",
				alternative: {
					label: "Elle est rappelée dans chaque résultat ; le calculateur du retrait en capital LPP/3a est en préparation.",
				},
			},
			{
				case: "Les personnes imposées à la source.",
				alternative: { label: "Adressez-vous à l'administration fiscale de votre canton de travail." },
			},
			{
				case: "Le passage d'une activité salariée à une activité indépendante, ou l'inverse, en cours d'année (circulaire AFC n° 18a, ch. 5.7 g).",
				alternative: { label: "Adressez-vous à votre fondation ou à votre assurance 3a." },
			},
			...coverage.notCovered,
			{
				case: "Le rendement du placement, la comparaison entre banque et assurance.",
				// La fiche n'y prévoit aucun renvoi ; le test des définitions exige une alternative : un conseil sans lien.
				alternative: { label: "Ce calculateur ne compare pas les placements." },
			},
		],
		assumptions: [
			"Les revenus imposables saisis s'entendent avant la déduction 3a calculée ici.",
			"L'impôt sur la fortune ne change pas.",
			`Barèmes et plafonds de l'année de calcul, ${year}.`,
			"L'économie est la différence entre l'impôt total (canton, commune et Confédération) avant et après la déduction, retranchée des deux revenus imposables ; jamais un taux marginal multiplié par le versement.",
			"Pour un couple marié ou lié par un partenariat enregistré, chacun a sa propre déduction, selon sa propre affiliation (art. 7 al. 2 OPP 3) et ses propres conditions : revenu soumis à l'AVS (circulaire AFC n° 18a, ch. 3), âge de référence (art. 7 al. 3 OPP 3). Celui qui ne les remplit pas n'a pas de déduction ; l'autre garde la sienne. L'économie porte sur leur somme.",
		],
		cantonsCovered: coverage.cantonsCovered,
		partialCantons: coverage.partialCantons,
		referenceYear: pillar3aTaxSavingYear,
	},

	fields,
	engine: "pension/pillar-3a-tax-saving",
	sourceIds,
	variants: [PILLAR_3A_BUYBACK_ID, "pension.lpp-buyback"],
	faq: [
		{
			question: "Quel montant puis-je déduire de mes impôts ?",
			answer: `Affilié à une caisse de pension, à titre obligatoire ou facultatif : au plus la « petite » cotisation, ${chf(smallCap)} CHF en ${year}. Sans caisse de pension : ${percent(largeRate)} du revenu de votre activité lucrative, au plus ${chf(largeCap)} CHF. C'est l'affiliation qui compte, pas le statut de salarié ou d'indépendant (art. 7 al. 1 OPP 3).`,
		},
		{
			question: "Je touche une rente de ma caisse de pension : suis-je encore affilié au 2e pilier ?",
			answer:
				"Si vous n'y êtes plus assuré, non : votre plafond est alors celui des personnes sans caisse de pension. Si vous y restez assuré, même sans cotiser, vous l'êtes encore (circulaire AFC n° 18a, ch. 5.7 f).",
		},
		{
			question: "Que se passe-t-il si j'ai versé plus que le plafond ?",
			answer:
				"L'excédent n'est pas déductible : le calculateur ramène le montant au plafond, et votre fondation doit vous rembourser la différence (circulaire AFC n° 18a, ch. 9.1).",
		},
		{
			question: "Jusqu'à quand puis-je verser des fonds sur mon pilier 3a ?",
			answer:
				"Le versement doit être crédité sur votre compte ou votre police 3a au plus tard le 31 décembre (circulaire AFC n° 18a, ch. 5.1). L'année où vous cessez votre activité lucrative, la cotisation entière reste déductible, à condition d'être versée avant la fin de l'activité (art. 7 al. 4 OPP 3 ; ch. 5.7 e).",
		},
		{
			question: "Puis-je encore cotiser au pilier 3a après l'âge de référence AVS ?",
			answer:
				"Oui, si vous exercez encore une activité lucrative, et au plus pendant cinq ans après l'âge de référence (art. 7 al. 3 OPP 3). L'activité doit être prouvée chaque année.",
		},
		{
			question: "Pourquoi ne pas simplement multiplier mon versement par mon taux marginal ?",
			answer:
				"Parce que la déduction peut faire changer de tranche de barème. Le calculateur calcule votre impôt deux fois, avant et après la déduction, et affiche la différence exacte.",
		},
	],

	profiles: (["you", "spouse"] as const).map((person) => {
		const name = (field: string) => contributorFieldName(person, field);
		return {
			name: name("profile"),
			legend: PROFILE_LABELS[person].legend,
			fields: ["hasAvsIncome", "reachedReferenceAge", "workingAfterReferenceAge", "affiliated"].map(name),
			profiles: [
				{
					value: "employeeWithPension",
					label: PROFILE_LABELS[person].employeeWithPension,
					values: { [name("hasAvsIncome")]: "yes", [name("reachedReferenceAge")]: "no", [name("affiliated")]: "yes" },
				},
				{
					value: "selfEmployedWithoutPension",
					label: PROFILE_LABELS[person].selfEmployedWithoutPension,
					values: { [name("hasAvsIncome")]: "yes", [name("reachedReferenceAge")]: "no", [name("affiliated")]: "no" },
				},
			],
			otherLabel: PROFILE_LABELS[person].other,
			...(person === "spouse" ? { shownWhen: { field: "maritalStatus", value: "married" } } : {}),
		};
	}),

	// Conditions de l'année, pour vous et pour le conjoint ou partenaire (règles 3 et 4)
	eligibility: (["you", "spouse"] as const).flatMap((person) => {
		const name = (field: string) => contributorFieldName(person, field);
		const couple = person === "spouse" ? { shownWhen: [{ field: "maritalStatus", value: "married" }] } : {};
		const who = person === "spouse" ? " (conjoint ou partenaire)" : "";
		return [
			{ label: `Revenu soumis à l'AVS en ${year}${who}`, anyOf: [{ field: name("hasAvsIncome"), value: "yes" }], profile: name("profile"), ...couple },
			{
				label: `Âge de référence AVS non atteint, ou activité lucrative poursuivie depuis moins de cinq ans${who}`,
				anyOf: [
					{ field: name("reachedReferenceAge"), value: "no" },
					{ field: name("workingAfterReferenceAge"), value: "yes" },
				],
				profile: name("profile"),
				...couple,
			},
		];
	}),

	// Une phrase visible chacun ; le premier rappel, plus long, garde son texte entier dans « En savoir plus »
	vigilance: [
		{
			level: "warning",
			summary: "Le capital 3a sera imposé à son retrait : l'économie affichée n'est pas un gain net.",
			text: reminders[0],
		},
		...reminders.slice(1).map((summary) => ({ level: "warning" as const, summary })),
	],

	monetization: { type: "none" },
};

/** Textes de la page propres à A2, en français. */
export const pillar3aTaxSavingTexts = {
	resultLabel: "Économie d'impôt",
	/** Guide de la famille (article 1, src/content/articles/rachat-3a-retroactif.mdx), lien prévu par la fiche. */
	guide: { label: "Comprendre le pilier 3a et son rachat rétroactif", url: "/prevoyance/guides/rachat-3a-retroactif/" },
	/** Réserve sous le résultat (checklist, point 13), l'année fiscale des données. */
	disclaimer: `Estimation indicative, établie d'après les barèmes ${year} et vos saisies. Elle ne constitue ni un conseil fiscal ni un conseil en prévoyance, et ne remplace pas votre décision de taxation.`,
	summary: {
		cantonalAndMunicipalSaving: "Canton et commune",
		federalSaving: "Confédération",
		effectiveRate: "Économie rapportée au montant déduit",
		deduction: "Montant déductible retenu",
	},
	/** Avertissement de la règle 7, « {amount} » remplacé par l'excédent. */
	excessWarning:
		"{amount} versés au-delà du plafond ne sont pas déductibles ; votre fondation doit vous les rembourser (circulaire AFC n° 18a, ch. 9.1).",
	/** Rappels affichés avec chaque résultat (règles 5 et 8, imposition au retrait, A4 sans lien), points de vigilance de la page. */
	reminders,
	outOfScope: pillar3aBuybackTexts.outOfScope,
	outOfScopeMunicipality: pillar3aBuybackTexts.outOfScopeMunicipality,
	missingData: pillar3aBuybackTexts.missingData,
	unknownMunicipality: pillar3aBuybackTexts.unknownMunicipality,
	outOfScopeShort: pillar3aBuybackTexts.outOfScopeShort,
	missingDataShort: pillar3aBuybackTexts.missingDataShort,
	inputShort: pillar3aBuybackTexts.inputShort,
	blockedShort: "Aucune déduction, voir le message",
	/** Le revenu de l'activité lucrative est requis sans caisse de pension. */
	earnedIncomeMissing: "Indiquez le revenu de l'activité lucrative de chaque personne sans caisse de pension.",
	earnedIncomeMissingShort: "Revenu à préciser, voir le message",
};
