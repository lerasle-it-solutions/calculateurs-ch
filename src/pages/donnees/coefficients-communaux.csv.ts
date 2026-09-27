/**
 * Export CSV du détail communal des coefficients (voir CLAUDE.md § 1.4).
 * Route statique, générée au build (aucun serveur) : /donnees/coefficients-communaux.csv
 *
 * Ce n'est PAS un export brut du jeu de données de l'AFC : seuls les
 * coefficients communaux sur le revenu et la fortune, transformés et sourcés
 * par `scripts/read-estv-exports.ts`, sont inclus — jamais les coefficients
 * paroissiaux, de bénéfice ou de capital de l'export d'origine.
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
		"incomeMunicipalMultiplier",
		"wealthMunicipalMultiplier",
		"sourceId",
		"verifiedOn",
		"effectiveFrom",
	];
	const rows = data.multipliers.map((entry) => [
		entry.bfsId,
		entry.canton,
		entry.municipality,
		entry.income.municipal.value,
		entry.wealth.municipal.value,
		entry.income.municipal.sourceId,
		entry.income.municipal.verifiedOn,
		entry.income.municipal.effectiveFrom,
	]);

	return new Response(toCsv(columns, rows), {
		headers: {
			"content-type": "text/csv; charset=utf-8",
			"content-disposition": 'attachment; filename="coefficients-communaux.csv"',
		},
	});
};
