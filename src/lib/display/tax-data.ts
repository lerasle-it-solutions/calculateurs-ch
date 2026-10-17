/**
 * Données d'un calculateur fiscal en deux parties (CLAUDE.md § 3, étape 0 de
 * l'accueil calculant) :
 *
 * - le fichier de données (`TaxDataFile`) : barèmes de toutes les communes des
 *   cantons couverts et règles de l'estimateur du salaire brut. Un seul fichier
 *   statique par année de calcul, pour tous les cantons, au nom haché (cache
 *   immuable), chargé avec le cœur à la première interaction. Jamais un fichier
 *   par canton : le demander révélerait au serveur le canton saisi, alors que
 *   les saisies ne quittent pas le navigateur. Chaque visiteur télécharge
 *   exactement la même chose ;
 * - la partie propre à la page (`HouseholdPagePart`), en JSON dans le HTML :
 *   textes des messages, calculettes officielles, cantons couverts.
 *
 * `hydratePageData` les réunit : la construction l'exécute pour calculer le cas
 * exemple, le navigateur à la première interaction, sur les mêmes entrées. Ce
 * que la page en dérive — communes par clé « Commune (CT) », libellés du champ
 * commune, message des communes hors périmètre — n'est donc transmis qu'une
 * fois. Sans DOM.
 */
import type { GrossToTaxableRuleSet } from "../calculations/gross-to-taxable";
import type { TaxInput } from "../calculations/tax";
import type { TaxScalesBundle } from "../calculations/tax-scales-bundle";
import type { HouseholdPageData } from "./calculator-form";
import { municipalityLabels } from "./municipality-labels";

/** Fichier de données d'une année de calcul : ce dont les moteurs ont besoin, rien de dérivé. */
export type TaxDataFile = {
	taxYear: number;
	bundle: TaxScalesBundle;
	/** Règles de l'estimateur du salaire brut ; `null` si elles ne sont pas relevées pour l'année. */
	estimator: GrossToTaxableRuleSet | null;
	/**
	 * Libellés fixes de la trace, par identifiant d'élément (src/lib/build/browser-trace-labels.ts) :
	 * le chargeur en crée les `<script type="application/json">` avant d'importer le cœur.
	 */
	traceLabels: Record<string, string[]>;
};

/** Marque remplacée par le nom de la commune dans le message des communes hors périmètre. */
export const MUNICIPALITY_PLACEHOLDER = "{municipality}";
/** Marque remplacée par le nom du canton dans le message d'un ménage hors périmètre. */
export const CANTON_PLACEHOLDER = "{canton}";

type HouseholdTexts = HouseholdPageData["texts"];

/** Partie d'une page propre au calculateur, en JSON dans le HTML. */
export type HouseholdPagePart = {
	taxYear: number;
	/** Codes des cantons couverts par le calculateur. */
	cantonsCovered: string[];
	/** Adresse du fichier de données de l'année. */
	taxDataUrl: string;
	officialCalculators: HouseholdPageData["officialCalculators"];
	/** Noms des cantons romands, par code : message d'un ménage hors périmètre. */
	cantonNames: Record<string, string>;
	texts: Omit<HouseholdTexts, "outOfScopeMunicipality" | "outOfScope"> & {
		/** Message d'une commune hors périmètre, `MUNICIPALITY_PLACEHOLDER` à la place du nom. */
		outOfScopeMunicipalityTemplate: string;
		/** Message d'un ménage hors périmètre, `CANTON_PLACEHOLDER` à la place du nom du canton. */
		outOfScopeTemplate: string;
	};
};

/** Données d'une page réunies : sa partie propre et le fichier de données de l'année. */
export type HydratedPageData<P extends HouseholdPagePart> = Omit<P, "texts"> &
	HouseholdPageData & {
		texts: P["texts"] & HouseholdTexts;
		estimator: GrossToTaxableRuleSet | null;
		/** Libellés du champ commune, dans l'ordre des données (`<datalist>`). */
		municipalityOptions: string[];
	};

export function hydratePageData<P extends HouseholdPagePart>(page: P, file: TaxDataFile): HydratedPageData<P> {
	if (file.taxYear !== page.taxYear) throw new Error(`Fichier de données ${file.taxYear}, page de calcul ${page.taxYear}.`);
	// Seules les communes des cantons couverts : c'est par elles que le moteur trouve un canton.
	// Barèmes cantonaux et règles de l'estimateur d'un canton non couvert restent sans usage.
	const municipalities = file.bundle.municipalities.filter((entry) => page.cantonsCovered.includes(entry.canton));
	const bundle: TaxScalesBundle = { ...file.bundle, municipalities };
	const estimator = file.estimator;
	const template = page.texts.outOfScopeMunicipalityTemplate;
	const labels = municipalityLabels(municipalities.map((entry) => ({ municipality: entry.name, canton: entry.canton })));
	return {
		...page,
		bundle,
		estimator,
		// Clés « Commune (CT) » ; le champ affiche le libellé (municipality-labels.ts)
		municipalities: Object.fromEntries(
			municipalities.map((entry) => [`${entry.name} (${entry.canton})`, { ofsId: entry.ofsId, canton: entry.canton as TaxInput["canton"] }]),
		),
		municipalityOptions: [...labels.values()],
		texts: {
			...page.texts,
			outOfScope: Object.fromEntries(
				Object.entries(page.cantonNames).map(([code, name]) => [code, page.texts.outOfScopeTemplate.split(CANTON_PLACEHOLDER).join(name)]),
			),
			// Seules les communes non couvertes en entier en ont besoin : le moteur ne lève leur
			// erreur de couverture qu'avec ce nom (PartialCoverageError.municipality).
			outOfScopeMunicipality: Object.fromEntries(
				municipalities.flatMap(({ coverage }) =>
					coverage?.municipality === undefined ? [] : [[coverage.municipality, template.split(MUNICIPALITY_PLACEHOLDER).join(coverage.municipality)]],
				),
			),
		},
	};
}
