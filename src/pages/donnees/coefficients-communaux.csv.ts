/**
 * Export CSV du détail communal des coefficients (voir CLAUDE.md § 1.4).
 * Route statique, générée au build (aucun serveur) : /donnees/coefficients-communaux.csv
 *
 * Ce n'est PAS un export brut du jeu de données ESTV : seules les deux valeurs
 * transformées et sourcées que le site conserve (coefficient cantonal et
 * communal, voir `scripts/import-estv-tax-data.ts`) sont incluses — jamais les
 * autres champs de la réponse d'origine (taux de fortune, de bénéfice, etc.).
 *
 * Les en-têtes définis ci-dessous ne survivent pas à l'export statique : sur
 * Cloudflare Pages, c'est `public/_headers` qui fixe le Content-Disposition
 * du fichier généré (vérifié : sans lui, le fichier est servi sans invite de
 * téléchargement).
 */
import type { APIRoute } from "astro";
import { getMunicipalMultipliers } from "../../data";
import { toCsv } from "../../lib/utils/csv";

export const GET: APIRoute = () => {
	const data = getMunicipalMultipliers();

	if (!data) {
		return new Response(
			"Aucun coefficient communal n'a encore été importé sur calculateurs.ch.\n",
			{ status: 404, headers: { "content-type": "text/plain; charset=utf-8" } },
		);
	}

	const columns = [
		"bfsId",
		"canton",
		"municipality",
		"cantonalMultiplier",
		"municipalMultiplier",
		"sourceId",
		"verifiedOn",
		"effectiveFrom",
	];
	const rows = data.multipliers.map((entry) => [
		entry.bfsId,
		entry.canton,
		entry.municipality,
		entry.cantonalMultiplier.value,
		entry.municipalMultiplier.value,
		entry.cantonalMultiplier.sourceId,
		entry.cantonalMultiplier.verifiedOn,
		entry.cantonalMultiplier.effectiveFrom,
	]);

	return new Response(toCsv(columns, rows), {
		headers: {
			"content-type": "text/csv; charset=utf-8",
			"content-disposition": 'attachment; filename="coefficients-communaux.csv"',
		},
	});
};
