/**
 * Date de vérification du site (docs/design-system.md § 2.4) : la plus
 * ancienne date de vérification parmi les jeux de données des calculateurs
 * publiés — fichiers fédéraux de leurs années de calcul, fichiers des cantons
 * qu'ils couvrent, coefficients communaux. Calculée au build, ici seulement :
 * pastille de l'en-tête, pied de page et accueil l'appellent, aucun ne la
 * recalcule ni ne la tape. Les pages calculateurs gardent la leur
 * (`DataFreshness`, décision n° 16).
 */
import { allDataFiles, eachValue } from "../data";
import { allCalculators, isPublished } from "./catalog";

const published = () => allCalculators.filter(isPublished);

/** Chemins, relatifs à src/data/, des jeux de données qu'utilisent les calculateurs publiés. */
export function publishedDataFiles(): string[] {
	const calculators = published();
	return [
		...new Set(calculators.map((definition) => `federal/${definition.scope.referenceYear}.json`)),
		...new Set(calculators.flatMap((definition) => definition.scope.cantonsCovered.map((code) => `cantons/${code.toLowerCase()}.json`))),
		"municipalities/multipliers.json",
	];
}

let cached: string | undefined;

/** Date ISO 8601 de la vérification la plus ancienne. */
export function siteVerifiedOn(): string {
	if (cached !== undefined) return cached;
	const paths = new Set(publishedDataFiles());
	const dates: string[] = [];
	for (const file of allDataFiles()) {
		if (paths.has(file.path)) eachValue(file.data, (value) => dates.push(value.verifiedOn));
	}
	const oldest = dates.sort()[0];
	if (oldest === undefined || oldest === "") throw new Error("Date de vérification du site introuvable : une valeur publiée sans verifiedOn.");
	return (cached = oldest);
}

/** « 26.09.2026 » : jour, mois et année sur deux, deux et quatre chiffres. */
export const formatVerificationDate = (iso: string): string =>
	new Intl.DateTimeFormat("fr-CH", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(iso));
