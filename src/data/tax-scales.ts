/**
 * Assemble, pour un canton, une commune et une année, les barèmes et
 * coefficients que le moteur fiscal reçoit en argument (R2, § 10) : barèmes
 * cantonaux, coefficients cantonal, communal et paroissiaux, barème LIFD,
 * corrections cantonales datées.
 *
 * Semaine 5, session A : signature seulement. Le barème LIFD n'est pas encore
 * dans `src/data/federal/` ; l'assemblage est écrit en session B.
 */
import type { TaxInput, TaxScales } from "../lib/calculations/tax";

export type TaxScalesQuery = Pick<
	TaxInput,
	"taxYear" | "canton" | "municipalityOfsId"
>;

export function getTaxScales(query: TaxScalesQuery): TaxScales {
	void query;
	throw new Error("getTaxScales : non implémenté (semaine 5, session B).");
}
