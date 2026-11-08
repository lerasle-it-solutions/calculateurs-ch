/**
 * Assemble, pour un canton, une commune et une année, ce que le moteur du
 * retrait en capital (src/lib/calculations/pension/capital-withdrawal.ts) reçoit
 * en argument (R2, § 10) : barèmes du moteur fiscal, modèle cantonal de l'impôt
 * sur le capital, coefficients qui s'y appliquent, exonération, facteur de l'IFD
 * et bornes LPP.
 *
 * Le modèle se lit dans les données, jamais dans le code du canton : un barème
 * propre (`capitalWithdrawalTax`), une règle de dérivation avec un facteur, ou
 * une règle sans facteur bornée par un taux maximal, qui convertit le capital en
 * rente selon le tableau de l'AFC.
 */
import { packCapitalWithdrawalBundle, type CapitalWithdrawalBundle } from "../lib/calculations/pension/capital-withdrawal-bundle";
import type { CapitalTaxModel, CapitalWithdrawalScales } from "../lib/calculations/pension/capital-withdrawal-plan";
import { getCantonData, getCapitalAnnuityConversion, getCapitalWithdrawalDerivation, getFederalData, getMunicipalMultipliers } from "./index";
import { getTaxScales, sourced, sourcedOrPending, toTables, type TaxScalesQuery } from "./tax-scales";

/**
 * Sources des règles sans valeur chiffrée que la trace cite : imposition séparée
 * (art. 11 al. 3 LHID), compte 3a retiré en une fois (circulaire AFC n° 18a,
 * ch. 6.2.a), fenêtre de retrait (art. 3 al. 1 OPP 3).
 */
const RULE_SOURCES: CapitalWithdrawalScales["ruleSources"] = {
	separateTaxation: "fedlex-lhid",
	pillar3aAccount: "afc-circular-18a",
	withdrawalWindow: "opp3-art-7a",
};

export function getCapitalWithdrawalScales(query: TaxScalesQuery): CapitalWithdrawalScales {
	const tax = getTaxScales(query);
	const canton = getCantonData(query.canton);
	const federal = getFederalData(query.taxYear).capitalWithdrawal;
	if (federal === undefined) {
		throw new Error(`Retrait en capital : facteur de l'IFD et bornes LPP non relevés pour ${query.taxYear} (federal/${query.taxYear}.json).`);
	}

	let model: CapitalTaxModel;
	const capital = canton.capitalWithdrawalTax;
	if (Array.isArray(capital)) {
		model = { type: "ownScale", tables: toTables(capital, `${query.canton}, barème des prestations en capital`) };
	} else {
		const rule = getCapitalWithdrawalDerivation().cantons[query.canton];
		if (rule === undefined) throw new Error(`${query.canton} : règle de dérivation des prestations en capital absente.`);
		if (rule.factor !== undefined) {
			model = {
				type: "incomeScaleFraction",
				factor: sourced(rule.factor),
				minimumRatePercent: rule.minimumRatePercent === undefined ? null : sourced(rule.minimumRatePercent),
			};
		} else if (rule.maximumRatePercent !== undefined && rule.minimumRatePercent !== undefined) {
			const conversion = getCapitalAnnuityConversion();
			model = {
				type: "periodicBenefitRate",
				minimumRatePercent: sourced(rule.minimumRatePercent),
				maximumRatePercent: sourced(rule.maximumRatePercent),
				// Absent : à relever, jamais supposé (R3)
				rateBounds:
					rule.rateBounds === undefined
						? { pending: `${query.canton} : stade des bornes du taux, avant ou après le coefficient, à relever.`, sourceId: null }
						: sourcedOrPending(rule.rateBounds),
				conversion: sourced(conversion),
			};
		} else {
			throw new Error(`${query.canton} : règle de dérivation sans facteur ni bornes de taux.`);
		}
	}

	const multipliers = canton.capitalWithdrawalMultipliers;
	return {
		tax,
		model,
		multipliers: {
			cantonal: sourcedOrPending(multipliers.cantonal),
			communal: sourcedOrPending(multipliers.communal),
			church: sourcedOrPending(multipliers.church),
			baseTaxReduction: multipliers.baseTaxReduction === null ? null : sourcedOrPending(multipliers.baseTaxReduction),
		},
		exemption: canton.capitalWithdrawalExemption === null ? null : sourced(canton.capitalWithdrawalExemption),
		aggregation: canton.capitalWithdrawalAggregation === null ? null : sourced(canton.capitalWithdrawalAggregation),
		federalScaleFactor: sourced(federal.federalScaleFactor),
		lpp: {
			maximumSteps: sourced(federal.lppMaximumSteps),
			minimumFirstPartialPercent: sourced(federal.lppMinimumFirstPartialPercent),
		},
		ruleSources: RULE_SOURCES,
	};
}

/**
 * Règles du retrait en capital des cantons demandés, pour le fichier de données
 * de l'année (src/lib/calculations/pension/capital-withdrawal-bundle.ts) ;
 * `null` si l'année n'a pas ses valeurs fédérales du retrait en capital.
 */
export function getCapitalWithdrawalBundle(taxYear: number, cantons: readonly TaxScalesQuery["canton"][]): CapitalWithdrawalBundle | null {
	if (getFederalData(taxYear).capitalWithdrawal === undefined) return null;
	const rules: Parameters<typeof packCapitalWithdrawalBundle>[1] = {};
	for (const canton of cantons) {
		const municipality = getMunicipalMultipliers()?.multipliers.find((entry) => entry.canton === canton);
		if (!municipality) continue;
		const { tax: _, ...cantonRules } = getCapitalWithdrawalScales({ taxYear, canton, municipalityOfsId: municipality.bfsId });
		rules[canton] = cantonRules;
	}
	return packCapitalWithdrawalBundle(taxYear, rules);
}
