/**
 * Fichiers de données des calculateurs, sous un nom haché, routes statiques
 * générées au build. Le cache immuable est fixé par public/_headers : les
 * en-têtes d'une route ne survivent pas à l'export statique.
 *
 * - le fichier commun (src/calculators/tax-data-file.ts) : un par année de
 *   calcul des calculateurs publiés, pour tous les cantons —
 *   /donnees/calcul/baremes-2026.<empreinte>.json ;
 * - le fichier propre à un calculateur qui en a un
 *   (src/calculators/calculator-data-file.ts), chargé par sa seule page —
 *   /donnees/calcul/retrait-capital-2026.<empreinte>.json.
 */
import type { APIRoute, GetStaticPaths } from "astro";
import { allCalculators, isPublished } from "../../../calculators/catalog";
import { calculatorDataFileJson, calculatorDataFileName, hasCalculatorDataFile } from "../../../calculators/calculator-data-file";
import { taxDataFileJson, taxDataFileName } from "../../../calculators/tax-data-file";

export const getStaticPaths = (() => {
	const published = allCalculators.filter(isPublished);
	return [
		...[...new Set(published.map((definition) => definition.scope.referenceYear))].map((year) => ({
			params: { fichier: taxDataFileName(year) },
			props: { json: taxDataFileJson(year) },
		})),
		...published
			.filter((definition) => hasCalculatorDataFile(definition.id))
			.map((definition) => ({
				params: { fichier: calculatorDataFileName(definition.id, definition.scope.referenceYear) },
				props: { json: calculatorDataFileJson(definition.id, definition.scope.referenceYear) },
			})),
	];
}) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) =>
	new Response(props.json as string, { headers: { "content-type": "application/json; charset=utf-8" } });
