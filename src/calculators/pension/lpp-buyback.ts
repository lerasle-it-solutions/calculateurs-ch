/**
 * A3 — Rachat LPP : économie d'impôt et échelonnement.
 *
 * Fiche corrigée du 12.10.2026 (docs/plan/fiche-A3-rachat-lpp.md), textes repris
 * tels quels, avec les décisions de mise en page du même jour : le délai de
 * blocage vient des données partout où la fiche l'écrit (R2), « 24 ans » et
 * « cinq ans » restent du texte, dans la phrase de leur article.
 */
import { eachValue, getFederalData, getMunicipalMultipliers } from "../../data";
import { resolveTaxYear } from "../../data/tax-years";
import { SCENARIO_TRANCHE_COUNTS } from "../../lib/calculations/pension/lpp-buyback";
import { taxEngineCoverage } from "../tax-coverage";
import { taxEngineSourceIds } from "../tax-engine-sources";
import type { CalculatorDefinition, FieldDefinition } from "../types";
import { PILLAR_3A_BUYBACK_ID, pillar3aBuybackTexts } from "./pillar-3a-buyback";
import { PILLAR_3A_TAX_SAVING_ID } from "./pillar-3a-tax-saving";

export const LPP_BUYBACK_ID = "pension.lpp-buyback";
/** Retrait en capital LPP/3a (A4), variante dès sa publication. */
const CAPITAL_WITHDRAWAL_ID = "pension.capital-withdrawal";

/**
 * Année de calcul : l'année civile de la construction si toutes les données
 * d'A3 sont relevées pour elle, sinon la plus récente année complète qui la
 * précède (src/data/tax-years.ts).
 */
export const lppBuybackTaxYear = resolveTaxYear(LPP_BUYBACK_ID);
export const lppBuybackYear = lppBuybackTaxYear.year;

const lockValue = getFederalData(lppBuybackYear).lppBuyback?.lockPeriodYears;
if (lockValue === undefined) throw new Error(`Délai de blocage LPP absent des données ${lppBuybackYear}.`);
/** Délai de blocage après un rachat (art. 79b al. 3 LPP), lu dans les données. */
export const lppBuybackLockPeriod = lockValue;
const lock = lockValue.value;
const maxTranches = Math.max(...SCENARIO_TRANCHE_COUNTS);

/** Date de vérification la plus ancienne des données fédérales lues : barème IFD et délai de blocage. */
export const lppBuybackVerifiedOn = (() => {
	const dates: string[] = [lockValue.verifiedOn];
	eachValue(getFederalData(lppBuybackYear).directFederalTax, (value) => dates.push(value.verifiedOn));
	return dates.sort()[0]!;
})();

export const lppBuybackIntro: string[] = [
	"Estimez l'économie d'impôt d'un rachat dans votre caisse de pension, en une fois ou échelonné, et vérifiez le délai de blocage.",
];

/** Sources du moteur fiscal, puis celles du rachat (fiche A3, § Données requises). */
const sourceIds = [
	...new Set([
		...taxEngineSourceIds(lppBuybackYear),
		"fedlex-lpp",
		"fedlex-opp2",
		"fedlex-lifd",
		"fedlex-lhid",
		"atf-142-ii-399",
	]),
];

const coverage = taxEngineCoverage();

const municipalityOptions = (getMunicipalMultipliers()?.multipliers ?? [])
	.filter((entry) => coverage.cantonsCovered.includes(entry.canton))
	.map((entry) => ({ value: `${entry.municipality} (${entry.canton})` }));

const taxableIncomeHint = "Revenu imposable sans la déduction du rachat, par exemple celui de votre dernière décision de taxation.";

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
		label: "Revenu imposable cantonal avant rachat",
		unit: "CHF",
		min: 0,
		step: 100,
		hint: taxableIncomeHint,
		required: true,
	},
	{
		kind: "number",
		name: "federalTaxableIncome",
		label: "Revenu imposable fédéral avant rachat",
		unit: "CHF",
		min: 0,
		step: 100,
		hint: taxableIncomeHint,
		required: true,
	},
	{
		kind: "number",
		name: "buybackPotential",
		label: "Potentiel de rachat",
		unit: "CHF",
		min: 0,
		step: 1,
		hint: "Tel qu'il figure sur votre certificat de prévoyance, ou confirmé par écrit par votre caisse.",
		required: true,
	},
	{
		kind: "number",
		name: "buybackAmount",
		label: "Montant du rachat envisagé",
		unit: "CHF",
		min: 0,
		step: 1,
		hint: "Montant total, versé en une fois ou réparti sur plusieurs années.",
		required: true,
	},
	{
		kind: "select",
		name: "unrepaidHomeOwnershipWithdrawal",
		label: "Avez-vous reçu un versement anticipé pour la propriété du logement, non encore remboursé ?",
		options: [
			{ value: "no", label: "Non" },
			{ value: "yes", label: "Oui" },
		],
		defaultValue: "no",
		required: true,
	},
	{
		kind: "number",
		name: "plannedCapitalWithdrawalYear",
		label: "Année prévue du premier retrait en capital",
		min: lppBuybackYear,
		step: 1,
		hint: "Laissez vide si vous ne prévoyez pas de retrait en capital.",
	},
];

export const lppBuyback: CalculatorDefinition = {
	id: LPP_BUYBACK_ID,
	family: "pension",
	slug: "/prevoyance/rachat-lpp/",
	title: "Rachat LPP : économie d'impôt et échelonnement",
	metaDescription:
		"Rachat LPP : estimez l'économie d'impôt d'un rachat dans votre caisse de pension, en une fois ou échelonné, et vérifiez le délai de blocage.",

	scope: {
		forWhom: [
			"Une personne affiliée à une institution de prévoyance professionnelle. Il peut s'agir d'un salarié ou d'un indépendant affilié à titre facultatif : c'est l'affiliation qui compte, pas le statut (art. 4 et 44 LPP).",
			"Elle réside dans un canton romand et y est imposée au régime ordinaire. Son certificat de prévoyance, ou une attestation de sa caisse, indique un potentiel de rachat.",
			"Au Valais, seules les personnes seules sans enfant domiciliées dans une commune dont l'indexation est relevée sont couvertes, soit Sion aujourd'hui.",
		],
		notCovered: [
			{
				case: "Calcul du potentiel de rachat lui-même : il dépend du règlement et de l'historique de la personne.",
				alternative: { label: "Le certificat de prévoyance annuel, ou une demande écrite à la caisse." },
			},
			{
				case: "Imposition du capital à la sortie, et donc le point mort entre l'économie d'aujourd'hui et l'impôt au retrait.",
				alternative: {
					label: "Le calculateur du retrait en capital LPP/3a est en préparation ; d'ici là, voir la méthodologie.",
					url: "/methodologie/",
				},
			},
			{
				case: "Rachat consécutif à un divorce ou à la dissolution d'un partenariat enregistré : le délai de blocage ne s'applique pas (art. 79b al. 4 LPP ; ATF 142 II 399 consid. 3.3.5), mais la déduction reste refusée en cas d'évasion fiscale (même arrêt, consid. 4).",
				alternative: { label: "L'économie d'impôt se calcule de la même façon ; la question de FAQ dédiée explique la différence." },
			},
			{
				case: "Personnes imposées à la source sans taxation ordinaire ultérieure.",
				alternative: { label: "Renseignez-vous auprès de l'administration fiscale de votre canton." },
			},
			...coverage.notCovered,
			{
				case: "Comparaison entre un rachat LPP et un versement 3a.",
				alternative: PILLAR_3A_TAX_SAVING_ID,
			},
			{
				case: "Rendement du capital racheté, ou amélioration de la rente.",
				alternative: { label: "Le certificat de prévoyance, ou une simulation demandée à la caisse." },
			},
		],
		assumptions: [
			"Le potentiel saisi est le montant confirmé par la caisse. Il tient déjà compte des réductions prévues par l'OPP 2 : l'avoir 3a qui dépasse la somme des petites cotisations déductibles depuis 24 ans, intérêts au taux minimal LPP compris (art. 60a al. 2) ; les avoirs de libre passage qui n'ont pas été transférés à la caisse (art. 60a al. 3) ; les prestations de vieillesse déjà perçues par une personne qui a repris une activité ou augmenté son taux d'activité (art. 60a al. 4) ; pour une personne arrivée de l'étranger et jamais affiliée en Suisse, un rachat annuel plafonné pendant cinq ans, sauf transfert direct d'avoirs d'un système de prévoyance étranger sans déduction fiscale (art. 60b).",
			"Le rachat est intégralement déductible du revenu imposable cantonal et fédéral de l'année du versement (art. 33 al. 1 let. d LIFD ; art. 9 al. 2 let. d LHID ; art. 81 al. 2 LPP).",
			"L'économie se calcule par différence de deux impôts totaux, sans rachat puis avec rachat. Chaque ligne (cantonal, communal, fédéral) est arrondie au franc avant l'addition. Le taux marginal n'est jamais utilisé.",
			"Le revenu imposable ne descend pas sous zéro. La part d'un rachat qui dépasse le revenu de l'année n'apporte aucune économie cette année-là, et le résultat le signale.",
			`Échelonnement : le montant est réparti en tranches égales sur 1 à ${maxTranches} années successives. Le revenu imposable et les barèmes de l'année de calcul sont supposés constants sur toute la période, et le potentiel reste disponible jusqu'à la dernière tranche.`,
			`Aucun retrait en capital du 2e pilier — prestation de vieillesse, versement anticipé pour le logement, départ définitif, toutes institutions confondues — n'a lieu dans les ${lock} ans qui suivent chaque versement.`,
			"Couple : une seule personne rachète. Le revenu imposable saisi est celui du ménage.",
			"Il s'agit d'un rachat facultatif ordinaire, pas d'un rachat consécutif à un divorce.",
		],
		cantonsCovered: coverage.cantonsCovered,
		referenceYear: lppBuybackYear,
	},

	fields,
	engine: "pension/lpp-buyback",
	sourceIds,
	variants: [PILLAR_3A_BUYBACK_ID, PILLAR_3A_TAX_SAVING_ID, CAPITAL_WITHDRAWAL_ID],
	faq: [
		{
			question: "Où trouver mon potentiel de rachat ?",
			answer:
				"Sur votre certificat de prévoyance annuel. S'il n'y figure pas, demandez-le par écrit à votre caisse. Il dépend de son règlement et ne peut pas être reconstitué de l'extérieur.",
		},
		{
			question: "Combien vais-je réellement économiser ?",
			answer:
				"Le calculateur compare votre impôt sans rachat et avec rachat. C'est plus juste que d'appliquer un taux marginal, qui surestime l'économie pour les gros rachats.",
		},
		{
			question: "Vaut-il mieux racheter en une fois ou sur plusieurs années ?",
			answer: `L'impôt est progressif : répartir un gros rachat garde souvent chaque déduction dans des tranches plus imposées. Mais chaque versement relance le délai de blocage de ${lock} ans. Le calculateur montre les deux effets.`,
		},
		{
			question: `Que se passe-t-il si je retire un capital dans les ${lock} ans ?`,
			answer:
				"La déduction du rachat est refusée ou corrigée après coup. Cela vaut quelle que soit l'institution qui verse le capital, et quel que soit le motif du retrait.",
		},
		{
			question: "J'ai retiré de l'argent pour acheter mon logement. Puis-je racheter ?",
			answer:
				"En règle générale, seulement après avoir remboursé ce versement anticipé (art. 79b al. 3 LPP). Lorsque le remboursement n'est plus possible, en principe à l'approche de la retraite, le règlement de votre caisse peut autoriser des rachats dans certaines limites (art. 60d OPP 2). Votre caisse vous dira si c'est le cas.",
		},
		{
			question: "J'ai un 3a ou un compte de libre passage. Mon potentiel est-il réduit ?",
			answer:
				"Il peut l'être. La part de votre 3a qui dépasse ce que vous auriez pu verser depuis vos 24 ans, intérêts compris, et vos avoirs de libre passage non transférés sont déduits du rachat possible (art. 60a OPP 2). Votre caisse vous les demandera avant d'accepter le rachat.",
		},
		{
			question: "Je suis arrivé de l'étranger récemment. Puis-je racheter ?",
			answer:
				"Oui. Mais si vous n'avez jamais été affilié à une caisse suisse, vos rachats sont plafonnés chaque année pendant vos premières années d'affiliation (art. 60b OPP 2). Saisissez le montant que votre caisse admet.",
		},
		{
			question: "Mon rachat suit un divorce. Le calcul s'applique-t-il ?",
			answer:
				"L'économie d'impôt se calcule de la même façon. Le délai de blocage ne s'applique pas à ce type de rachat (art. 79b al. 4 LPP). Mais un rachat suivi de près d'un retrait en capital peut être refusé en déduction s'il ne vise qu'à économiser de l'impôt (ATF 142 II 399).",
		},
		{
			question: "Et si ma caisse est en découvert ?",
			answer:
				"L'avoir racheté participe aux mesures d'assainissement comme le reste. Consultez le degré de couverture dans le rapport annuel de la caisse.",
		},
	],

	monetization: { type: "none" },
};

/** Un avertissement obligatoire de la fiche : un titre, un texte, et sa liste éventuelle. */
export type LppBuybackWarning = { title: string; text: string; items: string[] };

/** Textes de la page propres à A3, en français. */
export const lppBuybackTexts = {
	resultLabel: "Économie d'impôt d'un rachat en une fois",
	/** Réserve sous le résultat (checklist, point 13), l'année fiscale des données. */
	disclaimer: `Estimation indicative, établie d'après les barèmes ${lppBuybackYear} et vos saisies. Elle ne constitue ni un conseil fiscal ni un conseil en prévoyance, et ne remplace pas votre décision de taxation.`,
	summary: {
		cantonalTax: "Impôt cantonal",
		municipalTax: "Impôt communal",
		federalTax: "Impôt fédéral direct",
	},
	/** Part non déduite (hypothèse 4) : « {federal} » et « {cantonal} » remplacés par les montants. */
	notDeducted:
		"Le revenu imposable ne descend pas sous zéro : {federal} au fédéral et {cantonal} au cantonal n'apportent aucune économie cette année-là.",
	scenarios: {
		heading: "Rachat en une fois ou échelonné",
		caption: `Économie totale selon le nombre de tranches, versées des années successives dès ${lppBuybackYear}`,
		columns: {
			scenario: "Échelonnement",
			tranches: "Tranches",
			total: "Économie totale",
			difference: "Écart avec le rachat en une fois",
			lock: "Retrait prévu",
		},
		single: "En une fois",
		/** « {n} » remplacé par le nombre d'années. */
		spread: "Sur {n} ans",
	},
	calendar: {
		heading: `Délai de blocage de ${lock} ans`,
		caption: "Pour chaque année de versement, l'année où le délai s'achève et celle dès laquelle un retrait en capital ne remet plus en cause la déduction",
		columns: {
			buybackYear: "Année du versement",
			lockEnds: "Fin du délai, à vérifier jour pour jour",
			compatibleFrom: "Retrait compatible dès",
			status: "Retrait prévu",
		},
		/** Seuils des trois classes (fiche, § Sortie 3), tirés du délai des données. */
		classes: [
			`compatible, si au moins ${lock + 1} années séparent le rachat du retrait ;`,
			`à vérifier jour pour jour, si l'écart est de ${lock} années ;`,
			`dans le délai, si l'écart est de ${lock - 1} années ou moins. La déduction de cette tranche serait alors refusée.`,
		],
		classesIntro: "Si une année de retrait est saisie, chaque tranche est classée :",
	},
	warningsHeading: "Avant de racheter",
	/** Les cinq avertissements obligatoires, toujours affichés dans le résultat. */
	warnings: [
		{
			title: `Délai de blocage de ${lock} ans.`,
			text: `Pendant ${lock} ans après un rachat, les prestations qui en résultent ne peuvent pas être versées en capital (art. 79b al. 3 LPP). En droit fiscal, l'interdiction est plus large :`,
			items: [
				`en principe, tout versement en capital dans les ${lock} ans est réputé abusif, et le rachat n'est pas déductible, sans autre examen (ATF 142 II 399 consid. 4.1) ;`,
				"le retrait compte quel que soit son motif (retraite, logement, départ à l'étranger) et quelle que soit l'institution qui verse le capital : c'est la pratique fiscale consolidée (information de l'administration fiscale genevoise ; arrêt 2C_488/2014 cité par la doctrine) ;",
				"chaque versement fait courir son propre délai : échelonner ses rachats repousse la date du premier retrait en capital possible ;",
				"respecter le délai n'exclut pas un contrôle pour évasion fiscale (même arrêt, consid. 4.1).",
			],
		},
		{
			title: "Imposition à la sortie.",
			text: "Le capital, rachat compris, sera imposé lors de son retrait, séparément du revenu. L'économie affichée n'est donc pas un gain net. Le calculateur du retrait en capital LPP/3a est en préparation.",
			items: [],
		},
		{
			title: "Primauté des prestations.",
			text: "Si votre caisse fonctionne en primauté des prestations, l'économie d'impôt reste valable. En revanche, ce que le rachat change à votre rente ne se lit qu'auprès de la caisse.",
			items: [],
		},
		{
			title: "Découvert de la caisse.",
			text: "Une caisse en découvert peut prélever des cotisations d'assainissement et, si cela ne suffit pas, rémunérer l'avoir de vieillesse en dessous du taux minimal légal (art. 65d LPP). L'avoir racheté y est soumis comme le reste. Consultez son degré de couverture dans son rapport annuel avant de racheter.",
			items: [],
		},
		{
			title: "Montant admis par la caisse.",
			text: "Le potentiel affiché sur le certificat peut être réduit après examen de votre situation : avoirs 3a ou de libre passage, arrivée de l'étranger, retrait anticipé pour le logement. Ne versez que le montant que la caisse vous confirme.",
			items: [],
		},
	] satisfies LppBuybackWarning[],
	outOfScope: pillar3aBuybackTexts.outOfScope,
	outOfScopeMunicipality: pillar3aBuybackTexts.outOfScopeMunicipality,
	missingData: pillar3aBuybackTexts.missingData,
	municipalityMismatch: pillar3aBuybackTexts.municipalityMismatch,
	unknownMunicipality: pillar3aBuybackTexts.unknownMunicipality,
	outOfScopeShort: pillar3aBuybackTexts.outOfScopeShort,
	missingDataShort: pillar3aBuybackTexts.missingDataShort,
	inputShort: pillar3aBuybackTexts.inputShort,
	/** Mention courte de la barre mobile quand le rachat est refusé. */
	refusedShort: "Rachat impossible, voir le message",
};
