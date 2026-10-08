/**
 * Sources lues par le moteur fiscal pour une année : rôles de SOURCE_BY_CANTON
 * des six cantons, sources des valeurs cantonales et communales et de l'impôt
 * fédéral direct, puis l'outil de collecte de l'AFC. Jamais l'outil de
 * référence estv-tax-calculator. Commun aux calculateurs qui appellent le
 * moteur (A1, A2).
 */
import { allDataFiles, eachValue, getFederalData } from "../data";
import { SOURCE_BY_CANTON } from "../data/sources";

export function taxEngineSourceIds(year: number): string[] {
	const ids = new Set<string>();
	for (const roles of Object.values(SOURCE_BY_CANTON)) {
		for (const id of Object.values(roles)) if (id !== null) ids.add(id);
	}
	for (const file of allDataFiles()) {
		if (/^cantons\/[a-z]{2}\.json$/.test(file.path) || file.path.startsWith("municipalities/")) {
			eachValue(file.data, (value) => ids.add(value.sourceId));
		}
	}
	eachValue(getFederalData(year).directFederalTax, (value) => ids.add(value.sourceId));
	ids.add("estv-base-data-module");
	ids.delete("estv-tax-calculator");
	return [...ids];
}
