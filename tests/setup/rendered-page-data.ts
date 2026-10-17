import { taxDataFileJson, taxDataFileUrl } from "../../src/calculators/tax-data-file";
import { hydratePageData, type HouseholdPagePart, type TaxDataFile } from "../../src/lib/display/tax-data";

/**
 * Données d'une page rendue, réunies comme le navigateur le fait à la première
 * interaction : le JSON propre à la page (`<script type="application/json" id>`)
 * et le fichier de données qu'elle déclare (`data-tax-data`,
 * src/lib/display/tax-data.ts).
 */
export function renderedPageData<T = ReturnType<typeof hydratePageData>>(html: string, dataId: string): T {
	const json = html.match(new RegExp(`<script type="application/json" id="${dataId}">([\\s\\S]*?)</script>`))?.[1];
	if (json === undefined) throw new Error(`JSON ${dataId} absent de la page.`);
	const page = JSON.parse(json) as HouseholdPagePart;
	const url = html.match(/\sdata-tax-data="([^"]+)"/)?.[1];
	if (url !== taxDataFileUrl(page.taxYear)) throw new Error(`Fichier de données ${url} déclaré, ${taxDataFileUrl(page.taxYear)} attendu.`);
	return hydratePageData(page, JSON.parse(taxDataFileJson(page.taxYear)) as TaxDataFile) as T;
}
