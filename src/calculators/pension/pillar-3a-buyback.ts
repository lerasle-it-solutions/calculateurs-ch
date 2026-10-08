/**
 * A1 — Rachat rétroactif du pilier 3a.
 *
 * Fiche validée par le mainteneur le 01.10.2026 ; elle remplace celle du
 * catalogue v2. Toute valeur chiffrée vient des données (R2) : année fiscale,
 * plafonds, première année de lacune rachetable, délai de rachat. Les années de
 * lacune sont toutes supposées avec 2e pilier, donc plafonnées à la « petite »
 * cotisation.
 */
import { getFederalData, getMunicipalMultipliers, sourceRegistry } from "../../data";
import { resolveTaxYear } from "../../data/tax-years";
import { formatChf, formatPercent } from "../../lib/format/chf";
import { taxEngineCoverage } from "../tax-coverage";
import { taxEngineSourceIds } from "../tax-engine-sources";
import type { CalculatorDefinition, FieldDefinition } from "../types";

export const PILLAR_3A_BUYBACK_ID = "pension.pillar-3a-buyback";

/**
 * Année du rachat et de calcul : l'année civile de la construction si toutes
 * les données d'A1 sont relevées pour elle, sinon la plus récente année
 * complète qui la précède (src/data/tax-years.ts).
 */
export const pillar3aBuybackTaxYear = resolveTaxYear(PILLAR_3A_BUYBACK_ID);
export const pillar3aBuybackYear = pillar3aBuybackTaxYear.year;

const pillar3a = getFederalData(pillar3aBuybackYear).pillar3a;
const firstGapYear = pillar3a.buyback.firstGapYear.value;
const lookbackYears = pillar3a.buyback.lookbackYears.value;
const smallCap = pillar3a.smallContributionCap.value;
const largeCap = pillar3a.largeContributionCap.value;
const largeRate = pillar3a.largeContributionIncomeRate.value;
/** Première année où un rachat est possible : celle qui suit la première année de lacune. */
const firstBuybackYear = firstGapYear + 1;

// Montants rendus à la construction (introduction, FAQ) : formateur unique du site.
const chf = formatChf;
const percent = (rate: number): string => formatPercent(rate);

/** Années de lacune proposées à la saisie pour l'année du rachat. */
export const pillar3aGapYears: number[] = Array.from(
	{ length: Math.max(0, pillar3aBuybackYear - Math.max(firstGapYear, pillar3aBuybackYear - lookbackYears)) },
	(_, index) => Math.max(firstGapYear, pillar3aBuybackYear - lookbackYears) + index,
);

export const pillar3aBuybackIntro: string[] = [
	`Depuis ${firstBuybackYear}, il est possible pour la première fois de rattraper des versements manqués au pilier 3a, mais seulement pour les années à partir de ${firstGapYear}. Une année où vous n'avez pas versé le maximum peut être rachetée pendant ${lookbackYears} ans, et le rachat se déduit de votre revenu imposable, comme une cotisation ordinaire.`,
	`Chaque année, vous pouvez racheter au total jusqu'à la « petite » cotisation 3a de l'année (${chf(smallCap)} CHF en ${pillar3aBuybackYear}), en plus de votre cotisation ordinaire, qui doit avoir été versée en entier. Cette limite vaut aussi pour les indépendants sans 2e pilier. Il faut en outre avoir eu un revenu soumis à l'AVS l'année de la lacune et l'année du rachat. Le rachat se demande par écrit à votre fondation ou à votre assurance, qui doit l'autoriser avant que vous ne versiez.`,
	"Ce calculateur indique, année par année, ce que vous pouvez encore racheter, jusqu'à quand, et l'impôt que vous économiseriez.",
];

const opp3 = sourceRegistry().get("opp3-art-7a");
if (!opp3) throw new Error("Source opp3-art-7a absente du registre.");
const opp3Link = { label: "Le texte de l'OPP 3 sur Fedlex", url: opp3.url };

/** Sources du moteur fiscal, puis celles du pilier 3a. */
const sourceIds = [...new Set([...taxEngineSourceIds(pillar3aBuybackYear), "opp3-art-7a", "ofas-pillar-3a-caps"])];

const yesNo = [
	{ value: "yes", label: "Oui" },
	{ value: "no", label: "Non" },
];

const coverage = taxEngineCoverage();

const municipalityOptions = (getMunicipalMultipliers()?.multipliers ?? [])
	.filter((entry) => coverage.cantonsCovered.includes(entry.canton))
	.map((entry) => ({ value: `${entry.municipality} (${entry.canton})` }));

const taxableIncomeHint = "Il figure sur votre dernière décision de taxation, ligne revenu imposable.";

const fields: FieldDefinition[] = [
	{ kind: "canton", name: "canton", label: "Canton de domicile", required: true },
	{
		kind: "municipality",
		name: "municipality",
		label: "Commune de domicile",
		options: municipalityOptions,
		hint: "Commencez à saisir le nom de la commune.",
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
	{
		kind: "text",
		name: "childrenAges",
		label: "Âge des enfants",
		inputMode: "numeric",
		placeholder: "4, 9",
		hint: "Séparés par une virgule.",
	},
	{
		kind: "number",
		name: "cantonalTaxableIncome",
		label: "Revenu imposable cantonal",
		unit: "CHF",
		min: 0,
		step: 100,
		hint: taxableIncomeHint,
		required: true,
	},
	{
		kind: "number",
		name: "federalTaxableIncome",
		label: "Revenu imposable fédéral",
		unit: "CHF",
		min: 0,
		step: 100,
		hint: taxableIncomeHint,
		required: true,
	},
	...pillar3aGapYears.flatMap((year): FieldDefinition[] => [
		{
			kind: "number",
			name: `paidContribution${year}`,
			label: `Versement 3a effectué en ${year}`,
			unit: "CHF",
			min: 0,
			step: 1,
			defaultValue: 0,
			required: true,
		},
		{ kind: "select", name: `avsIncome${year}`, label: `Revenu soumis à l'AVS en ${year}`, options: yesNo, defaultValue: "yes", required: true },
		{
			kind: "select",
			name: `alreadyBoughtBack${year}`,
			label: `Rachat déjà effectué pour ${year}`,
			options: yesNo,
			defaultValue: "no",
			required: true,
		},
	]),
	{
		kind: "select",
		name: "currentYearContributionPaidInFull",
		label: `Cotisation 3a ${pillar3aBuybackYear} versée intégralement`,
		options: yesNo,
		defaultValue: "yes",
		required: true,
	},
	{
		kind: "select",
		name: "avsIncomeInBuybackYear",
		label: `Revenu soumis à l'AVS en ${pillar3aBuybackYear}`,
		options: yesNo,
		defaultValue: "yes",
		required: true,
	},
	{
		kind: "select",
		name: "oldAgeBenefit",
		label: "Prestation de vieillesse du pilier 3a déjà perçue",
		options: yesNo,
		defaultValue: "no",
		required: true,
	},
];

export const pillar3aBuyback: CalculatorDefinition = {
	id: PILLAR_3A_BUYBACK_ID,
	family: "pension",
	slug: "/prevoyance/rachat-3a-retroactif/",
	title: "Rachat rétroactif du pilier 3a",
	metaDescription: `Calculez ce que vous pouvez racheter dans votre pilier 3a depuis ${firstGapYear}, jusqu'à quand, et l'impôt économisé dans votre commune romande.`,

	scope: {
		forWhom: [
			`Salarié ou indépendant affilié à un 2e pilier, ayant réalisé un revenu soumis à l'AVS, imposé au régime ordinaire dans un canton romand, qui n'a pas versé le maximum au pilier 3a une ou plusieurs années depuis ${firstGapYear}.`,
		],
		notCovered: [
			{
				case: `Lacunes antérieures à ${firstGapYear} : elles ne sont pas rachetables. La disposition transitoire de la modification de l'OPP 3 du 6 novembre 2024 n'ouvre le rachat qu'aux lacunes nées à partir de ${firstGapYear}.`,
				alternative: opp3Link,
			},
			{
				case: "Personnes imposées à la source sans quasi-résidence : le calcul suppose une taxation ordinaire.",
				alternative: { label: "Renseignez-vous auprès de l'administration fiscale de votre canton." },
			},
			{
				case: "Personnes ayant déjà perçu une prestation de vieillesse du pilier 3a, ou ayant dépassé de plus de cinq ans l'âge de référence : le rachat est exclu (art. 7a al. 4 et 5 OPP 3).",
				alternative: opp3Link,
			},
			{
				case: "Rachat des personnes non affiliées à un 2e pilier (indépendants sans caisse de pension, salariés sous le seuil LPP), dont la lacune se calcule sur la « grande » cotisation : il n'est pas encore couvert.",
				alternative: { label: "Adressez-vous à votre fondation ou à votre assurance 3a." },
			},
			{
				case: "Rendement futur du capital racheté.",
				alternative: "pension.retirement-projection",
			},
			...coverage.notCovered,
		],
		assumptions: [
			"Le total des rachats d'une même année est plafonné à la « petite » cotisation de cette année, quel que soit le nombre de lacunes comblées, et ne dépasse pas les lacunes (art. 7a al. 2).",
			"La cotisation de l'année du rachat doit avoir été versée intégralement avant la demande de rachat (art. 7a al. 1 let. c, art. 7b al. 2 let. a).",
			"Un revenu soumis à l'AVS est exigé l'année de la lacune (art. 7b al. 2 let. b) et l'année du rachat (OFAS, « Le troisième pilier » ; art. 7a al. 1 let. c).",
			"Un seul rachat par année de lacune : une lacune comblée en partie ne peut plus être complétée, et le solde est perdu (art. 7a al. 3).",
			`Une lacune peut être rachetée pendant les ${lookbackYears} années qui suivent (art. 7a al. 1 let. a).`,
			"L'économie est la différence entre l'impôt total (canton, commune et Confédération) avant et après le rachat. Elle ne dépend pas de la fortune, dont l'impôt ne change pas.",
			"Le rachat réduit les deux revenus imposables exactement de son montant. Les déductions dont le montant dépend du revenu ne sont pas recalculées.",
		],
		cantonsCovered: coverage.cantonsCovered,
		referenceYear: pillar3aBuybackYear,
	},

	fields,
	engine: "pension/pillar-3a-buyback",
	sourceIds,
	variants: ["pension.pillar-3a-tax-saving", "pension.lpp-buyback"],
	faq: [
		{
			question: "Quelles années puis-je racheter, et jusqu'à quand ?",
			answer: `Seules les lacunes apparues depuis ${firstGapYear} ; les années antérieures ne pourront jamais être rachetées. Chaque lacune reste rachetable pendant ${lookbackYears} ans : celle de ${firstGapYear} jusqu'en ${firstGapYear + lookbackYears}.`,
		},
		{
			question: "Quelles conditions dois-je remplir ?",
			answer:
				"Avoir eu un revenu soumis à l'AVS l'année de la lacune et l'année du rachat ; avoir versé en entier la cotisation ordinaire de l'année du rachat ; ne jamais avoir perçu de prestation de vieillesse du pilier 3a, y compris d'une police arrivée à échéance. Après une telle prestation, plus aucun rachat n'est possible. Les indemnités de l'assurance-chômage comptent comme revenu soumis à l'AVS.",
		},
		{
			question: "J'ai interrompu mon activité une année : ai-je une lacune ?",
			answer:
				"Seulement si vous avez eu un revenu soumis à l'AVS cette année-là. Une année sans aucun revenu de ce type, par exemple pour une formation, ne crée pas de lacune rachetable.",
		},
		{
			question: "Combien puis-je racheter en une année ?",
			answer: `Au total, au plus la « petite » cotisation de l'année du rachat (${chf(smallCap)} CHF en ${pillar3aBuybackYear}), en plus de votre cotisation ordinaire, et jamais plus que vos lacunes. Ce plafond vaut pour tous, indépendants compris. Un même rachat peut combler plusieurs années.`,
		},
		{
			question: "Et si mes lacunes dépassent ce plafond ?",
			answer:
				"Chaque année de lacune ne se rachète qu'une fois : si vous n'en comblez qu'une partie, le reste est perdu. Mieux vaut combler des années entières qui tiennent sous le plafond, en commençant par celles qui expirent le plus tôt, et garder les autres pour une année suivante. C'est la répartition que propose le calculateur.",
		},
		{
			question: "Comment se passe la demande ?",
			answer:
				"Par écrit, auprès de votre fondation bancaire ou de votre assurance : vous indiquez le montant, les années concernées et le montant par année, et vous confirmez remplir les conditions. L'institution vérifie et autorise le rachat ; vous ne versez qu'ensuite, selon ses instructions. Elle vous remet une attestation pour votre déclaration d'impôt.",
		},
		{
			question: "Quand faut-il s'y prendre ?",
			answer:
				"Le rachat se déduit du revenu de l'année où il est versé. Il doit donc être autorisé et payé avant la fin de l'année, et beaucoup d'institutions ferment les demandes plus tôt, parfois dès la mi-décembre. Renseignez-vous dès l'automne.",
		},
		{
			question: "Je suis indépendant, ou salarié sans caisse de pension : qu'est-ce que cela change ?",
			answer: `Ce qui compte, c'est l'affiliation à un 2e pilier, pas le statut. Sans caisse de pension, votre lacune se calcule sur la « grande » cotisation (${percent(largeRate)} du revenu, au plus ${chf(largeCap)} CHF), mais le rachat annuel reste plafonné à la petite. Ce calculateur ne couvre pas encore ce rachat : adressez-vous à votre fondation ou à votre assurance 3a.`,
		},
		{
			question: "Pourquoi ne pas multiplier le rachat par mon taux marginal ?",
			answer:
				"Parce que le rachat peut faire changer de tranche de barème. Le calculateur calcule votre impôt deux fois, avant et après le rachat, et affiche la différence exacte.",
		},
	],

	monetization: { type: "none" },
};

/** Textes de la page propres à A1, en français. */
export const pillar3aBuybackTexts = {
	resultLabel: "Économie d'impôt",
	/** Guide de la famille qui explique le rachat rétroactif (src/content/articles/rachat-3a-retroactif.mdx). */
	guide: { label: "Comprendre le rachat rétroactif", url: "/prevoyance/guides/rachat-3a-retroactif/" },
	/** Réserve sous le résultat (checklist, point 13), l'année fiscale des données. */
	disclaimer: `Estimation indicative, établie d'après les barèmes ${pillar3aBuybackYear} et vos saisies. Elle ne constitue ni un conseil fiscal ni un conseil en prévoyance, et ne remplace pas votre décision de taxation.`,
	outOfScope: (canton: string): string =>
		`Ce calculateur ne couvre pas encore votre ménage dans le canton ${canton} : ses résultats ne reproduiraient pas exactement ceux du calculateur officiel. Utilisez la calculette du canton :`,
	outOfScopeMunicipality: (municipality: string): string =>
		`Ce calculateur ne couvre pas encore la commune de ${municipality} : une donnée communale nécessaire au calcul n'y est pas relevée. Utilisez la calculette du canton :`,
	missingData: "Une donnée nécessaire au calcul pour cette commune n'est pas encore relevée : aucun résultat n'est affiché.",
	municipalityMismatch: "La commune saisie ne correspond pas au canton choisi.",
	unknownMunicipality: "Choisissez une commune dans la liste proposée.",
	/** Mentions courtes de la barre de résultat mobile, à la place du montant, liées au message de la carte. */
	outOfScopeShort: "Hors périmètre, voir le message",
	missingDataShort: "Donnée manquante, voir le message",
	inputShort: "Commune à préciser, voir le message",
};
