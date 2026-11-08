/**
 * A4 vu des autres calculateurs : identifiant, URL et publication, sans importer
 * sa définition (A4 importe A3). Les textes d'A2, d'A3 et de la méthodologie
 * qui annonçaient A4 « en préparation » basculent d'eux-mêmes vers un lien le
 * jour où sa page existe (leçon de W09, décision du mainteneur du 7.11.2026).
 */
import { pageExists } from "../page-exists";

export const CAPITAL_WITHDRAWAL_ID = "pension.capital-withdrawal";
/** URL publique, FRANÇAIS (CLAUDE.md § 7). */
export const CAPITAL_WITHDRAWAL_SLUG = "/prevoyance/retrait-capital-lpp-3a/";
/** Vrai si la page d'A4 est publiée. */
export const capitalWithdrawalPublished = pageExists(CAPITAL_WITHDRAWAL_SLUG);
/** Lien vers A4 depuis un autre calculateur. FRANÇAIS. */
export const capitalWithdrawalLink = { label: "Calculer l’impôt sur le capital retiré", url: CAPITAL_WITHDRAWAL_SLUG };
