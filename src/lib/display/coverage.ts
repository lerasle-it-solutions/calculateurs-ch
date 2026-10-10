/**
 * Message de couverture partielle, commun à A1 et A2 : le texte du canton ou de
 * la commune, et le lien vers la calculette officielle du canton. Il s'établit
 * dès que le canton, la commune, l'état civil et le nombre d'enfants sont
 * connus (`coverageStatusOf`) : la page l'affiche sans attendre les revenus.
 */
import { assertTaxCoverage, PartialCoverageError, type TaxInput, type TaxScales } from "../calculations/tax";
import type { ResultStatus, StatusLink } from "./result-card";

export type CoverageTexts = {
	/** Ménage non couvert, par code de canton. */
	outOfScope: Record<string, string>;
	/** Commune non couverte, par nom de commune. */
	outOfScopeMunicipality: Record<string, string>;
	/** Mention courte de la barre de résultat mobile. */
	outOfScopeShort: string;
};

/** Message d'une erreur de couverture partielle. */
export const coverageStatus = (
	error: PartialCoverageError,
	texts: CoverageTexts,
	officialCalculators: Record<string, StatusLink>,
): ResultStatus => ({
	text:
		(error.municipality !== null ? texts.outOfScopeMunicipality[error.municipality] : texts.outOfScope[error.canton]) ?? "",
	short: texts.outOfScopeShort,
	link: officialCalculators[error.canton],
});

/** Message de couverture du ménage, établi sans les revenus ; `null` si le ménage est couvert. */
export function coverageStatusOf(
	household: Pick<TaxInput, "canton" | "maritalStatus" | "children">,
	scales: TaxScales,
	texts: CoverageTexts,
	officialCalculators: Record<string, StatusLink>,
): ResultStatus | null {
	try {
		// Seuls le canton, l'état civil et les enfants comptent pour la couverture
		assertTaxCoverage(household as TaxInput, scales);
		return null;
	} catch (error) {
		if (error instanceof PartialCoverageError) return coverageStatus(error, texts, officialCalculators);
		throw error;
	}
}
