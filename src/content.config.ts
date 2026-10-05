/**
 * Collections de contenu (CLAUDE.md § 6). Astro 7 lit ce fichier à la racine
 * de src/ ; le § 6 le nomme encore src/content/config.ts.
 *
 * `articles` : un fichier MDX par article, src/content/articles/{slug}.mdx,
 * publié à /{famille}/guides/{slug}/. Contraintes vérifiées au build : au
 * moins un calculateur lié, au moins deux sources.
 */
import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

/**
 * Une source : citée en toutes lettres, ou lue dans le registre par son
 * identifiant (URL du registre, libellé facultatif). `publisher` s'affiche
 * après le lien : « OPP 3, art. 7a — Fedlex ».
 */
const sourceSchema = z.union([
	z.object({ name: z.string().min(1), url: z.url(), publisher: z.string().min(1).optional() }).strict(),
	z.object({ sourceId: z.string().min(1), name: z.string().min(1).optional(), publisher: z.string().min(1).optional() }).strict(),
]);

const articles = defineCollection({
	loader: glob({ pattern: "*.mdx", base: "./src/content/articles" }),
	schema: z.object({
		title: z.string(), // FRANÇAIS — titre de l'article (H1)
		/** Balise <title>, si elle diffère du H1 ; 60 caractères au plus. FRANÇAIS. */
		metaTitle: z.string().max(60).optional(),
		description: z.string().max(155), // FRANÇAIS — méta-description
		family: z.enum(["pension", "property", "energy", "business"]),
		publishedOn: z.coerce.date(),
		updatedOn: z.coerce.date(),
		relatedCalculators: z.array(z.string()).min(1), // ≥ 1 obligatoire
		sources: z.array(sourceSchema).min(2),
		reviewedBy: z.string().optional(),
		faq: z.boolean().default(false),
		/** Durée de lecture annoncée, en minutes. */
		readingMinutes: z.number().int().positive().optional(),
	}),
});

export const collections = { articles };
