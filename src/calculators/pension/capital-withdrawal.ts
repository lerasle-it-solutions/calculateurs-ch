/**
 * A4 — Retrait en capital LPP et 3a : impôt et échelonnement.
 *
 * v1 limitée aux personnes seules sans enfant (décision du mainteneur,
 * 6.11.2026, docs/plan/W11-W12.md). Les bornes et taux cités dans les textes
 * viennent des données (R2) : délai de blocage, étapes LPP, part de l'IFD,
 * bornes du taux valaisan.
 */
import { eachValue, getCapitalWithdrawalDerivation, getFederalData } from "../../data";
import { resolveTaxYear } from "../../data/tax-years";
import { formatChf } from "../../lib/format/chf";
import { MAX_PILLAR_3A_ACCOUNTS } from "../../lib/calculations/pension/capital-withdrawal-plan";
import { SCENARIO_TRANCHE_COUNTS } from "../../lib/calculations/pension/capital-withdrawal-scenarios";
import { municipalityOptions } from "../municipalities";
import { taxEngineCoverage } from "../tax-coverage";
import { taxEngineSourceIds } from "../tax-engine-sources";
import type { CalculatorDefinition, FieldDefinition, VigilancePoint } from "../types";
import { CAPITAL_WITHDRAWAL_ID, CAPITAL_WITHDRAWAL_SLUG } from "./capital-withdrawal-link";
import { LPP_BUYBACK_ID, lppBuyback } from "./lpp-buyback";
import { pillar3aBuybackTexts } from "./pillar-3a-buyback";
import { PILLAR_3A_TAX_SAVING_ID } from "./pillar-3a-tax-saving";

export { CAPITAL_WITHDRAWAL_ID };

/**
 * Année de calcul : l'année civile de la construction si toutes les données
 * d'A4 sont relevées pour elle, sinon la plus récente année complète qui la
 * précède (src/data/tax-years.ts).
 */
export const capitalWithdrawalTaxYear = resolveTaxYear(CAPITAL_WITHDRAWAL_ID);
export const capitalWithdrawalYear = capitalWithdrawalTaxYear.year;

const federal = getFederalData(capitalWithdrawalYear);
const capitalRules = federal.capitalWithdrawal;
const lockValue = federal.lppBuyback?.lockPeriodYears;
if (capitalRules === undefined || lockValue === undefined) {
	throw new Error(`Retrait en capital : valeurs fédérales absentes des données ${capitalWithdrawalYear}.`);
}
/** Délai de blocage après un rachat LPP (art. 79b al. 3 LPP), bornes LPP (art. 13a LPP) et part de l'IFD (art. 38 al. 2 LIFD), lus dans les données. */
const lock = lockValue.value;
const steps = capitalRules.lppMaximumSteps.value;
const firstPartial = capitalRules.lppMinimumFirstPartialPercent.value;
/** « cinquième » pour 1/5 : le mot de la fraction, la fraction elle-même lue dans les données. */
const FRACTION_WORDS: Record<number, string> = { 4: "quart", 5: "cinquième" };
const federalFraction = FRACTION_WORDS[Math.round(1 / capitalRules.federalScaleFactor.value)];
if (federalFraction === undefined) throw new Error("Part de l'IFD sur le capital sans nom de fraction.");
const valais = getCapitalWithdrawalDerivation().cantons.VS;
const maxYears = Math.max(...SCENARIO_TRANCHE_COUNTS);

/** Date de vérification la plus ancienne des données fédérales lues : barème IFD, valeurs du retrait en capital, délai de blocage. */
export const capitalWithdrawalVerifiedOn = (() => {
	const dates: string[] = [lockValue.verifiedOn];
	eachValue(federal.directFederalTax, (value) => dates.push(value.verifiedOn));
	eachValue(capitalRules, (value) => dates.push(value.verifiedOn));
	return dates.sort()[0]!;
})();

export const capitalWithdrawalIntro: string[] = [
	"Estimez l’impôt sur le capital de votre caisse de pension et de vos comptes 3a, puis comparez un retrait en une fois et un retrait échelonné sur plusieurs années.",
];

/** Sources du moteur fiscal, puis celles du retrait en capital. */
const sourceIds = [
	...new Set([
		...taxEngineSourceIds(capitalWithdrawalYear),
		"fedlex-lifd",
		"fedlex-lhid",
		"fedlex-lpp",
		"opp3-art-7a",
		"afc-circular-18a",
		"atf-142-ii-399",
		"estv-capital-annuity-conversion",
		"estv-capital-benefits-dossier-2025",
	]),
];

const coverage = taxEngineCoverage();

/** Cas exemple : saisies de scénario, fictives (§ 4.2) ; jamais un montant d'un relevé de l'AFC. */
const EXAMPLE = { lppCapital: 240_000, pillar3a: 45_000 };

const yearField = (name: string, label: string): FieldDefinition & { kind: "number" } => ({
	kind: "number",
	name,
	label,
	min: capitalWithdrawalYear,
	step: 1,
	hint: "Année civile du versement.",
});

const fields: FieldDefinition[] = [
	{
		kind: "municipality",
		name: "municipality",
		label: "Commune de domicile",
		// Un seul champ commune : le canton est déduit, les homonymes portent le leur (§ 4.3)
		options: municipalityOptions(coverage.cantonsCovered),
		hint: "Tapez les premières lettres de votre commune. Le canton s’en déduit.",
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
	{ kind: "number", name: "children", label: "Nombre d’enfants", min: 0, step: 1, defaultValue: 0, required: true },
	{
		kind: "number",
		name: "lppCapital",
		label: "Capital LPP retiré",
		unit: "CHF",
		min: 0,
		step: 1,
		hint: "Capital de vieillesse de votre caisse de pension, versé en une fois. Laissez vide sans retrait LPP.",
	},
	yearField("lppWithdrawalYear", "Année du retrait LPP"),
	{
		kind: "number",
		name: "pillar3aAccounts",
		label: "Nombre de comptes 3a retirés",
		min: 0,
		max: MAX_PILLAR_3A_ACCOUNTS,
		step: 1,
		defaultValue: 0,
		hint: "Un compte 3a se retire en une fois : indiquez chaque compte séparément.",
	},
	{
		kind: "accountList",
		name: "pillar3aAccountList",
		label: "Comptes 3a",
		countField: "pillar3aAccounts",
		itemLegend: "Compte 3a n° {n}",
		itemFields: [
			{ kind: "number", name: "pillar3aAmount{n}", label: "Capital du compte", unit: "CHF", min: 0, step: 1, required: true },
			{ ...yearField("pillar3aYear{n}", "Année du retrait"), required: true },
		],
	},
	{
		kind: "select",
		name: "sex",
		label: "Sexe",
		options: [
			{ value: "", label: "Choisissez" },
			{ value: "female", label: "Femme" },
			{ value: "male", label: "Homme" },
		],
		hint: "Le Valais calcule l’impôt au taux d’une rente équivalente, qui dépend de l’âge et du sexe.",
		shownWhen: [{ field: "canton", value: "VS" }],
	},
	{
		kind: "number",
		name: "age",
		label: "Âge au premier retrait",
		unit: "ans",
		min: 0,
		step: 1,
		hint: "Âge révolu au moment du premier versement.",
		shownWhen: [{ field: "canton", value: "VS" }],
	},
];

/**
 * Points de vigilance (§ 4.1) : avertissement renforcé pour la décision
 * irréversible et pour le rachat récent, qui peut faire perdre une déduction ;
 * avis informatif pour les règles d'échelonnement.
 */
const vigilance: VigilancePoint[] = [
	{
		level: "warning",
		summary: "Un retrait en capital ne se défait pas : faites-vous conseiller par un professionnel avant de décider.",
		title: "Une décision irréversible.",
		text: "Une fois le capital versé, le choix est fait, et l’impôt sur le capital est dû pour l’année du versement (art. 38 al. 1bis LIFD). Le choix entre rente et capital, son moment et son échelonnement dépendent de votre situation complète. Consultez un professionnel de la prévoyance ou de la fiscalité avant d’agir.",
	},
	{
		level: "warning",
		summary: `Aucun retrait en capital du 2e pilier, quel qu’en soit le motif, dans les ${lock} ans qui suivent chaque rachat : sinon la déduction est refusée.`,
		title: "Rachat LPP récent.",
		text: `Pendant ${lock} ans après un rachat, les prestations qui en résultent ne peuvent pas être versées en capital (art. 79b al. 3 LPP). En principe, tout versement en capital dans ce délai est réputé abusif, et le rachat n’est pas déductible, sans autre examen (ATF 142 II 399 consid. 4.1).`,
		link: { label: "Vérifier le délai d’un rachat LPP", url: lppBuyback.slug },
	},
	{
		level: "info",
		summary: "Un compte 3a se retire en une fois : pour échelonner votre 3a, il faut plusieurs comptes.",
		title: "Pilier 3a.",
		text: "Le premier retrait rend imposable tout le capital du compte, et un retrait partiel n’est qu’une modalité de paiement (circulaire AFC n° 18a, ch. 6.2.a). Un compte ne se partage pas au moment du retrait (même circulaire).",
	},
	{
		level: "info",
		summary: `Le capital LPP se retire en ${steps} étapes au plus, la première d’au moins ${firstPartial} %, selon le règlement de votre caisse.`,
		title: "Capital LPP.",
		text: `Une étape regroupe tous les retraits en capital d’une même année civile (art. 13a al. 2 LPP). Le premier retrait partiel représente au moins ${firstPartial} % de la prestation de vieillesse, sauf si votre caisse admet moins (art. 13a al. 3 LPP). Son règlement peut aussi imposer le retrait de la totalité si le salaire restant descend sous le seuil d’assurance (art. 13a al. 4 LPP).`,
	},
];

/** Message des couples et des familles, avant la saisie des montants (P5). */
const HOUSEHOLD_NOT_COVERED =
	"Ce calcul couvre les personnes seules sans enfant. Pour un couple, les retraits des deux époux d’une même année s’additionnent (art. 9 al. 1 LIFD ; art. 3 al. 3 LHID), et chaque canton applique ses propres règles aux couples et aux familles.";

export const capitalWithdrawal: CalculatorDefinition = {
	id: CAPITAL_WITHDRAWAL_ID,
	family: "pension",
	slug: CAPITAL_WITHDRAWAL_SLUG,
	title: "Retrait en capital LPP et 3a : impôt et échelonnement",
	metaDescription:
		"Estimez l’impôt sur le capital de votre caisse de pension et de vos comptes 3a, et ce qu’un retrait échelonné vous fait économiser.",
	question: "Combien d’impôt coûte un retrait en capital, et faut-il l’échelonner ?",
	metaTitle: `Impôt sur le retrait en capital ${capitalWithdrawalYear} : faut-il échelonner ?`,
	promise: "L’impôt sur votre capital LPP et 3a, et ce qu’un retrait échelonné vous fait économiser.",
	scopeLine: `Pour une personne seule sans enfant, imposée au régime ordinaire en Suisse romande, dès ${capitalWithdrawalYear}.`,
	example: {
		label: `à Lausanne, ${formatChf(EXAMPLE.lppCapital)} CHF de capital LPP et un compte 3a de ${formatChf(EXAMPLE.pillar3a)} CHF retirés en ${capitalWithdrawalYear}`,
		values: {
			municipality: "Lausanne",
			maritalStatus: "single",
			children: "0",
			lppCapital: String(EXAMPLE.lppCapital),
			lppWithdrawalYear: String(capitalWithdrawalYear),
			pillar3aAccounts: "1",
			pillar3aAmount1: String(EXAMPLE.pillar3a),
			pillar3aYear1: String(capitalWithdrawalYear),
		},
	},

	scope: {
		forWhom: [
			"Une personne seule sans enfant qui retire en capital tout ou partie de sa prévoyance, avoir de vieillesse de sa caisse de pension ou comptes 3a.",
			"Elle réside dans un canton romand et y est imposée au régime ordinaire l’année du versement.",
			"Au Valais, seules les communes dont l’indexation du barème communal est relevée sont couvertes, et l’âge et le sexe sont demandés.",
		],
		notCovered: [
			{
				case: "Couples mariés et familles. Les retraits des deux époux d’une même année s’additionnent (art. 9 al. 1 LIFD ; art. 3 al. 3 LHID), et chaque canton applique ses propres règles aux couples et aux familles.",
				alternative: { label: "Renseignez-vous auprès de l’administration fiscale de votre canton." },
			},
			{
				case: "Choix entre la rente et le capital, et rendement du capital une fois retiré.",
				alternative: { label: "Le certificat de prévoyance, ou une simulation demandée à votre caisse." },
			},
			{
				case: "Capital versé en cas de décès ou d’invalidité.",
				alternative: { label: "Renseignez-vous auprès de l’administration fiscale de votre canton." },
			},
			{
				case: "Personnes imposées à la source ou domiciliées à l’étranger au moment du versement.",
				alternative: { label: "Renseignez-vous auprès de votre institution de prévoyance ou de l’administration fiscale." },
			},
			...coverage.notCovered,
			{
				case: "Économie d’impôt d’un rachat LPP, et délai de blocage avant un retrait en capital.",
				alternative: LPP_BUYBACK_ID,
			},
		],
		assumptions: [
			"Le capital est imposé séparément de vos autres revenus, par un impôt annuel entier, l’année de son versement (art. 38 al. 1 et 1bis LIFD ; art. 11 al. 3 LHID).",
			"Tous les retraits en capital d’une même année civile s’additionnent, 2e et 3e piliers compris. Fribourg l’écrit dans sa loi (art. 39 al. 4 LICD) ; ailleurs, c’est la conséquence de l’impôt annuel entier.",
			`L’impôt fédéral se calcule au ${federalFraction} du barème d’une personne seule (art. 36 al. 1 LIFD), sans déduction sociale (art. 38 al. 2 et 3 LIFD).`,
			"Chaque canton applique son barème des prestations en capital, ou une fraction de son barème du revenu, et ses coefficients cantonal et communal quand sa loi les applique au capital.",
			...(valais?.minimumRatePercent && valais.maximumRatePercent
				? [
						`Au Valais, le capital est converti en rente viagère selon le tableau de l’AFC, d’après votre âge et votre sexe. Le taux du barème du revenu lu sur cette rente, borné entre ${valais.minimumRatePercent.value} % et ${valais.maximumRatePercent.value} %, s’applique au capital (art. 33b al. 1 LF).`,
					]
				: []),
			"La confession n’est pas demandée, et l’impôt paroissial n’est pas compté.",
			`Les barèmes de ${capitalWithdrawalYear} s’appliquent à toutes les années de votre calendrier, sans projection de leur évolution.`,
			"Chaque impôt (fédéral, cantonal, communal) est arrondi au franc avant l’addition.",
			`La comparaison répartit vos retraits sur 1 à ${maxYears} années civiles successives, à partir de votre premier retrait. Chaque compte 3a reste entier, et le capital LPP se répartit entre ses étapes au franc près.`,
			"Les années de retrait sont supposées dans la fenêtre que permet votre situation (art. 3 al. 1 OPP 3) et admises par le règlement de votre caisse.",
		],
		cantonsCovered: coverage.cantonsCovered,
		partialCantons: coverage.partialCantons,
		referenceYear: capitalWithdrawalYear,
	},

	fields,
	engine: "pension/capital-withdrawal",
	sourceIds,
	variants: [LPP_BUYBACK_ID, PILLAR_3A_TAX_SAVING_ID],
	faq: [
		{
			question: "Pourquoi échelonner ses retraits ?",
			answer: `L’impôt sur le capital est progressif. Réparti sur plusieurs années, chaque retrait reste dans des tranches moins imposées. Le calculateur compare le retrait en une fois et sa répartition sur 2 à ${maxYears} années.`,
		},
		{
			question: "Puis-je retirer mon 3a en plusieurs fois ?",
			answer: "Pas un même compte. Le premier retrait rend imposable tout son capital (circulaire AFC n° 18a, ch. 6.2.a). Pour échelonner, il faut plusieurs comptes.",
		},
		{
			question: "Et mon capital LPP ?",
			answer: `Il se retire en ${steps} étapes au plus, une étape regroupant tous les retraits d’une même année civile (art. 13a al. 2 LPP). Le premier retrait partiel vaut au moins ${firstPartial} % de la prestation (art. 13a al. 3 LPP). Votre caisse peut admettre moins, ou imposer un retrait total. Son règlement fait foi.`,
		},
		{
			question: "J’ai racheté dans ma caisse récemment. Puis-je retirer en capital ?",
			answer: `Pas les prestations issues du rachat avant ${lock} ans (art. 79b al. 3 LPP). En principe, la déduction du rachat est refusée, ou corrigée après coup si elle avait été admise (ATF 142 II 399 consid. 4.1).`,
		},
		{
			question: "Nous sommes mariés. Le calcul s’applique-t-il ?",
			answer: "Pas encore. Les retraits des deux époux d’une même année s’additionnent (art. 9 al. 1 LIFD ; art. 3 al. 3 LHID), et les cantons appliquent des règles propres aux couples.",
		},
	],

	vigilance,

	monetization: { type: "none" },
};

/** Textes de la page propres à A4, en français. */
export const capitalWithdrawalTexts = {
	resultLabel: "Impôt sur le capital retiré",
	/** Réserve sous le résultat (checklist, point 13), l'année fiscale des données. */
	disclaimer: `Ce montant est une estimation indicative, établie d’après les barèmes ${capitalWithdrawalYear} et vos saisies. Il ne constitue pas un conseil fiscal ou en prévoyance, et ne remplace pas votre décision de taxation.`,
	householdNotCovered: HOUSEHOLD_NOT_COVERED,
	householdNotCoveredShort: "Hors périmètre, voir le message",
	capitalMissing: "Indiquez le capital LPP ou au moins un compte 3a, avec l’année de chaque retrait.",
	profileMissing: "Indiquez votre âge et votre sexe : le Valais calcule l’impôt au taux d’une rente équivalente.",
	refusedShort: "Calendrier impossible, voir le message",
	years: {
		heading: "Impôt par année de votre calendrier",
		caption: "Retraits de chaque année civile, additionnés, et impôt de l’année",
		columns: { year: "Année", withdrawals: "Retraits", federal: "Fédéral", cantonal: "Cantonal", municipal: "Communal", total: "Total" },
	},
	scenarios: {
		heading: "Retrait en une fois ou échelonné",
		caption: `Impôt total selon le nombre d’années, à partir de votre premier retrait, barèmes ${capitalWithdrawalYear}`,
		columns: { scenario: "Échelonnement", calendar: "Calendrier", total: "Impôt total", difference: "Écart avec le retrait en une fois" },
		single: "En une fois",
		/** « {n} » remplacé par le nombre d'années. */
		spread: "Sur {n} ans",
		impossible: "Impossible",
		/** « {calendar} » et « {saving} » remplacés par le calendrier et l'économie. */
		optimal: "Calendrier le moins imposé : {calendar}, soit {saving} d’impôt en moins qu’un retrait en une fois.",
		optimalSingle: "Le retrait en une fois est déjà le calendrier le moins imposé.",
		rules: `Chaque compte 3a se retire en une fois, et le capital LPP en ${steps} étapes au plus, la première d’au moins ${firstPartial} %, selon le règlement de votre caisse.`,
	},
	outOfScope: pillar3aBuybackTexts.outOfScope,
	outOfScopeMunicipality: pillar3aBuybackTexts.outOfScopeMunicipality,
	missingData: pillar3aBuybackTexts.missingData,
	unknownMunicipality: pillar3aBuybackTexts.unknownMunicipality,
	outOfScopeShort: pillar3aBuybackTexts.outOfScopeShort,
	missingDataShort: pillar3aBuybackTexts.missingDataShort,
	inputShort: pillar3aBuybackTexts.inputShort,
};
