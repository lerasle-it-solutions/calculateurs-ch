/**
 * Fichier de données des calculateurs fiscaux (src/calculators/tax-data-file.ts) :
 * un par année de calcul des calculateurs publiés, pour tous les cantons, sous
 * un nom haché — /donnees/calcul/baremes-2026.<empreinte>.json. Route statique,
 * générée au build. Le cache immuable est fixé par public/_headers : les
 * en-têtes d'une route ne survivent pas à l'export statique.
 */
import type { APIRoute, GetStaticPaths } from "astro";
import { allCalculators, isPublished } from "../../../calculators/catalog";
import { taxDataFileJson, taxDataFileName } from "../../../calculators/tax-data-file";

export const getStaticPaths = (() =>
	[...new Set(allCalculators.filter(isPublished).map((definition) => definition.scope.referenceYear))].map((year) => ({
		params: { fichier: taxDataFileName(year) },
		props: { year },
	}))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) =>
	new Response(taxDataFileJson(props.year as number), { headers: { "content-type": "application/json; charset=utf-8" } });
