/**
 * Entités schema.org du site (prompt SEO du 23.10.2026, étape 5) : le site et
 * son éditeur sont décrits une fois, sur l'accueil (`seo/SiteSchema.astro`) ;
 * les autres pages y renvoient par leur `@id` comme `publisher`.
 */
import { fr } from "../../i18n/fr";

const ORIGIN = "https://calculateurs.ch";

export const WEBSITE_ID = `${ORIGIN}/#website`;
export const ORGANIZATION_ID = `${ORIGIN}/#organization`;

/** Renvoi à l'éditeur, nommé comme dans le pied de page. */
export const organizationReference = () => ({
	"@type": "Organization",
	"@id": ORGANIZATION_ID,
	name: fr.footer.publisherName,
});

/** Le site et son éditeur, en un seul graphe : JSON-LD de l'accueil. */
export const siteSchema = (logoUrl: string) => ({
	"@context": "https://schema.org",
	"@graph": [
		{
			"@type": "WebSite",
			"@id": WEBSITE_ID,
			name: fr.site.name,
			url: `${ORIGIN}/`,
			inLanguage: "fr-CH",
			publisher: { "@id": ORGANIZATION_ID },
		},
		{
			"@type": "Organization",
			"@id": ORGANIZATION_ID,
			name: fr.footer.publisherName,
			url: `${ORIGIN}/`,
			logo: { "@type": "ImageObject", url: logoUrl },
			address: { "@type": "PostalAddress", addressLocality: fr.footer.publisherLocality, addressCountry: "CH" },
		},
	],
});
