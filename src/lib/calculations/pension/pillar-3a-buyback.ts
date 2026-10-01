/**
 * Rachat rétroactif dans le pilier 3a (OPP 3, RS 831.461.3, art. 7a et 7b).
 *
 * Fonction pure : plafonds et règles arrivent en paramètres (R2), la fonction
 * n'importe aucun fichier de données. Elle dit, année par année, quelle lacune
 * est rachetable l'année R du rachat, et propose une répartition du rachat sous
 * le plafond de l'année R.
 *
 * Non traité : la limite d'âge (art. 7a al. 5, qui renvoie à l'art. 7 al. 3).
 */
import type { BreakdownLine } from "../../utils/breakdown";

/** Une valeur relevée, avec l'acte qui la fixe. */
export type Sourced<T> = { value: T; sourceId: string };

/** Une année de lacune candidate. */
export type Pillar3aGapYearInput = {
	year: number;
	/** Plafond applicable à la personne cette année-là : petite ou grande cotisation. */
	maxContribution: Sourced<number>;
	paidContribution: number;
	/** Revenu soumis à l'AVS cette année-là. */
	hadAvsIncome: boolean;
	/** Année déjà rachetée, même en partie. */
	alreadyBoughtBack: boolean;
};

export type Pillar3aGapsParams = {
	/** Année du rachat, notée R. */
	buybackYear: number;
	/** Première année de lacune rachetable (disposition transitoire de la modification du 6 novembre 2024). */
	firstGapYear: Sourced<number>;
	/** Nombre d'années précédentes rachetables (art. 7a al. 1 let. a). */
	lookbackYears: Sourced<number>;
	/** Plafond total des rachats de l'année R : la petite cotisation de R (art. 7a al. 2). */
	buybackYearCap: Sourced<number>;
	gapYears: Pillar3aGapYearInput[];
	/** Cotisation ordinaire de l'année R versée intégralement (art. 7a al. 1 let. c). */
	currentYearContributionPaidInFull: boolean;
	/** Revenu soumis à l'AVS l'année R. */
	hasAvsIncomeInBuybackYear: boolean;
	/** Prestation de vieillesse déjà perçue (art. 7a al. 4). */
	receivedOldAgeBenefit: boolean;
};

export type Pillar3aGapYearResult = {
	year: number;
	/** Plafond moins cotisation versée, jamais négatif. */
	gap: number;
	/** Montant proposé au rachat l'année R. */
	proposedBuyback: number;
	/** Dernière année où la lacune peut être rachetée. */
	lastBuybackYear: number;
	eligible: boolean;
	/** Motif du refus, en français, avec son article ; `null` si l'année est rachetable. */
	refusalReason: string | null;
	/** Année comblée en partie : son solde est perdu (art. 7a al. 3). */
	partiallyFilled: boolean;
	/** Solde perdu si l'année n'est comblée qu'en partie. */
	lostBalance: number;
};

export type Pillar3aGapsResult = {
	years: Pillar3aGapYearResult[];
	/** Total rachetable l'année R, dans la limite du plafond. */
	totalBuyback: number;
	breakdown: BreakdownLine[];
};

const numberFormat = new Intl.NumberFormat("fr-CH", { maximumFractionDigits: 2 });
const fmt = (value: number): string => numberFormat.format(value);

/**
 * Ensemble d'années entières dont la somme est la plus grande sans dépasser
 * `cap` ; à égalité, celui dont les années, triées, expirent le plus tôt. Les
 * années candidates sont au plus le nombre d'années rachetables : l'énumération
 * exhaustive reste petite.
 */
const bestWholeYears = (candidates: { year: number; gap: number }[], cap: number): Set<number> => {
	if (candidates.length > 20) throw new Error(`${candidates.length} années candidates : énumération non prévue.`);
	const sorted = [...candidates].sort((a, b) => a.year - b.year);
	let best: { sum: number; years: number[] } = { sum: 0, years: [] };
	for (let mask = 1; mask < 1 << sorted.length; mask++) {
		const chosen = sorted.filter((_, index) => (mask >> index) & 1);
		const sum = chosen.reduce((total, year) => total + year.gap, 0);
		if (sum > cap) continue;
		const years = chosen.map((year) => year.year);
		if (sum > best.sum || (sum === best.sum && expiresEarlier(years, best.years))) best = { sum, years };
	}
	return new Set(best.years);
};

/** Vrai si la première liste d'années (triées) contient des années qui expirent plus tôt. */
const expiresEarlier = (a: number[], b: number[]): boolean => {
	for (let index = 0; index < Math.min(a.length, b.length); index++) {
		if (a[index] !== b[index]) return a[index]! < b[index]!;
	}
	return a.length > b.length;
};

/** Conditions qui bloquent tout rachat l'année R, dans l'ordre où elles sont examinées. */
const blockingConditionOf = (params: Pillar3aGapsParams): string | null => {
	if (params.receivedOldAgeBenefit) {
		return "Une prestation de vieillesse a été perçue : aucun rachat n'est possible (art. 7a al. 4 OPP 3).";
	}
	if (!params.currentYearContributionPaidInFull) {
		return `La cotisation ordinaire de ${params.buybackYear} n'est pas versée intégralement : aucun rachat n'est possible (art. 7a al. 1 let. c OPP 3).`;
	}
	if (!params.hasAvsIncomeInBuybackYear) {
		// Condition non écrite en toutes lettres : elle découle de l'art. 7a al. 1 let. c,
		// la cotisation ordinaire de l'année R supposant un revenu soumis à l'AVS cette année-là.
		return `Aucun revenu soumis à l'AVS en ${params.buybackYear} : aucun rachat n'est possible (découle de l'art. 7a al. 1 let. c OPP 3).`;
	}
	return null;
};

/** Motif de refus propre à une année, ou `null` si elle est rachetable l'année R. */
const yearRefusalOf = (params: Pillar3aGapsParams, gapYear: Pillar3aGapYearInput): string | null => {
	const R = params.buybackYear;
	const firstGapYear = params.firstGapYear.value;
	const lookbackYears = params.lookbackYears.value;
	const Y = gapYear.year;
	if (Y >= R) {
		return `${Y} n'est pas une année antérieure à l'année du rachat ${R} (art. 7a al. 1 let. a OPP 3).`;
	}
	if (Y < firstGapYear) {
		return `Lacune antérieure à ${firstGapYear}, non rachetable (OPP 3, disposition transitoire de la modification du 6 novembre 2024).`;
	}
	if (Y < R - lookbackYears) {
		return `Délai échu : la lacune de ${Y} ne pouvait être rachetée que jusqu'en ${Y + lookbackYears} (art. 7a al. 1 let. a OPP 3).`;
	}
	if (!gapYear.hadAvsIncome) {
		return `Aucun revenu soumis à l'AVS en ${Y} : la lacune n'est pas rachetable (art. 7a al. 1 let. b ; art. 7b al. 2 let. b OPP 3).`;
	}
	if (gapYear.alreadyBoughtBack) {
		return `${Y} a déjà fait l'objet d'un rachat : un seul rachat par année de lacune, le solde non comblé est perdu (art. 7a al. 3 ; art. 7b al. 2 let. c OPP 3).`;
	}
	return null;
};

/**
 * Lacunes rachetables l'année R et répartition proposée du rachat, dans la
 * limite du plafond total de l'année R, y compris pour un indépendant (art. 7a
 * al. 2 ; un seul rachat peut combler plusieurs lacunes, al. 3). Une année
 * entamée ne se complète plus (al. 3) : la répartition retient l'ensemble
 * d'années entières dont la somme est la plus grande sous le plafond, et à
 * égalité celui qui contient les années qui expirent le plus tôt. Une année
 * n'est entamée que si elle expire l'année R ; les autres restent rachetables
 * jusqu'à leur dernière année.
 */
export function computePillar3aGaps(params: Pillar3aGapsParams): Pillar3aGapsResult {
	const breakdown: BreakdownLine[] = [];
	const line = (entry: BreakdownLine): void => {
		breakdown.push(entry);
	};
	const R = params.buybackYear;
	const lookbackYears = params.lookbackYears.value;
	const cap = params.buybackYearCap;

	for (const gapYear of params.gapYears) {
		if (![gapYear.maxContribution.value, gapYear.paidContribution].every((amount) => Number.isFinite(amount) && amount >= 0)) {
			throw new Error(`Montants invalides pour ${gapYear.year} : plafond et cotisation versée doivent être positifs ou nuls.`);
		}
	}
	if (new Set(params.gapYears.map((gapYear) => gapYear.year)).size !== params.gapYears.length) {
		throw new Error("Une même année de lacune figure deux fois.");
	}

	line({
		label: "Années de lacune rachetables",
		operands: { buybackYear: R, firstGapYear: params.firstGapYear.value, lookbackYears },
		formula: `de max(${params.firstGapYear.value} ; ${R} − ${lookbackYears}) à ${R} − 1, soit de ${Math.max(params.firstGapYear.value, R - lookbackYears)} à ${R - 1}`,
		value: Math.max(0, R - Math.max(params.firstGapYear.value, R - lookbackYears)),
		sourceId: params.lookbackYears.sourceId,
		assumption: "Les lacunes antérieures à la première année de lacune rachetable ne le sont jamais (disposition transitoire).",
	});
	line({
		label: "Limite d'âge non examinée",
		operands: {},
		formula: "art. 7a al. 5 OPP 3, qui renvoie à l'art. 7 al. 3 : non traité par ce calcul",
		value: 0,
		sourceId: params.lookbackYears.sourceId,
		assumption: "La limite d'âge du rachat doit être vérifiée à part.",
	});

	const blocking = blockingConditionOf(params);
	if (blocking !== null) {
		line({
			label: "Rachat impossible l'année du rachat",
			operands: { buybackYear: R },
			formula: blocking,
			value: 0,
			unit: "CHF",
			sourceId: params.lookbackYears.sourceId,
		});
	}

	const oldestFirst = [...params.gapYears].sort((a, b) => a.year - b.year);
	const assessed = oldestFirst.map((gapYear) => {
		const gap = Math.max(0, gapYear.maxContribution.value - gapYear.paidContribution);
		const lastBuybackYear = gapYear.year + lookbackYears;
		const refusalReason = blocking ?? yearRefusalOf(params, gapYear);
		line({
			label: `Lacune ${gapYear.year}`,
			operands: { maxContribution: gapYear.maxContribution.value, paidContribution: gapYear.paidContribution },
			formula: `max(0 ; ${fmt(gapYear.maxContribution.value)} − ${fmt(gapYear.paidContribution)})`,
			value: gap,
			unit: "CHF",
			sourceId: gapYear.maxContribution.sourceId,
			assumption:
				refusalReason ?? `Rachetable jusqu'en ${lastBuybackYear} (art. 7a al. 1 let. a OPP 3).`,
		});
		return { year: gapYear.year, gap, lastBuybackYear, refusalReason };
	});

	// Années entières : une année entamée ne se complète plus (art. 7a al. 3).
	const available = blocking === null ? cap.value : 0;
	const candidates = assessed.filter((year) => year.refusalReason === null && year.gap > 0);
	const wholeYears = bestWholeYears(candidates, available);
	let remaining = available - candidates.filter((year) => wholeYears.has(year.year)).reduce((sum, year) => sum + year.gap, 0);
	// Une année n'est entamée que si elle expire l'année R : elle serait perdue de toute façon.
	const partialAmounts = new Map<number, number>();
	for (const year of candidates) {
		if (wholeYears.has(year.year) || year.lastBuybackYear !== R || remaining <= 0) continue;
		const amount = Math.min(year.gap, remaining);
		partialAmounts.set(year.year, amount);
		remaining -= amount;
	}

	const years: Pillar3aGapYearResult[] = assessed.map(({ year, gap, lastBuybackYear, refusalReason }) => {
		if (refusalReason !== null) {
			return { year, gap, proposedBuyback: 0, lastBuybackYear, eligible: false, refusalReason, partiallyFilled: false, lostBalance: 0 };
		}
		const proposedBuyback = wholeYears.has(year) ? gap : (partialAmounts.get(year) ?? 0);
		const partiallyFilled = proposedBuyback > 0 && proposedBuyback < gap;
		const lostBalance = partiallyFilled ? gap - proposedBuyback : 0;
		if (gap > 0) {
			line({
				label: `Rachat proposé pour ${year}`,
				operands: { gap, proposedBuyback, cap: cap.value },
				formula: `${fmt(proposedBuyback)} sur une lacune de ${fmt(gap)}`,
				value: proposedBuyback,
				unit: "CHF",
				sourceId: cap.sourceId,
				assumption: partiallyFilled
					? `Dernière année de rachat de cette lacune : comblée en partie, le solde de ${fmt(lostBalance)} CHF est perdu, un seul rachat étant admis par année de lacune (art. 7a al. 3 OPP 3).`
					: proposedBuyback === gap
						? "Année comblée entièrement : ensemble d'années entières le plus élevé sous le plafond, les années qui expirent le plus tôt en priorité à égalité."
						: `Non retenue en ${R} pour ne pas entamer cette année : elle reste rachetable jusqu'en ${lastBuybackYear}.`,
			});
		}
		return { year, gap, proposedBuyback, lastBuybackYear, eligible: true, refusalReason: null, partiallyFilled, lostBalance };
	});

	const totalBuyback = years.reduce((sum, year) => sum + year.proposedBuyback, 0);
	line({
		label: `Total rachetable en ${R}`,
		operands: { cap: cap.value, totalBuyback },
		formula: `${years.filter((year) => year.proposedBuyback > 0).map((year) => fmt(year.proposedBuyback)).join(" + ") || "0"}, plafond total de ${fmt(cap.value)} CHF pour l'année ${R}`,
		value: totalBuyback,
		unit: "CHF",
		sourceId: cap.sourceId,
		assumption: "Le plafond s'applique au total des rachats de l'année, et non à chaque lacune (art. 7a al. 2 OPP 3).",
	});

	return { years, totalBuyback, breakdown };
}
