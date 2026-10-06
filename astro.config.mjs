// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { browserTraceLabels } from "./src/lib/build/browser-trace-labels.ts";
import { includeInSitemap } from "./src/lib/seo/sitemap.ts";

// https://astro.build/config
// Configuration conforme à la section 9 de l'architecture et au § Design system (voir CLAUDE.md).
// Aucun framework d'interface, aucun îlot hydraté : Tailwind CSS v4 via le plugin Vite,
// interactivité en JavaScript natif dans les pages concernées.
export default defineConfig({
  site: "https://calculateurs.ch",
  output: "static",
  integrations: [
    // Articles en MDX : composants Astro (figures, tableaux générés depuis src/data/)
    // rendus à la construction, aucun JavaScript envoyé.
    mdx(),
    sitemap({
      changefreq: "monthly",
      lastmod: new Date(),
      // Les pages en noindex (démonstration, mentions légales, 404…) ne sont pas listées.
      filter: includeInSitemap,
    }),
  ],
  build: { format: "directory" },
  // Préchargement désactivé : son script comptait dans le budget de 30 ko de JavaScript par page.
  prefetch: false,
  vite: {
    // Libellés fixes de la trace lus dans le JSON de la page, hors du script (budget JavaScript).
    plugins: [tailwindcss(), browserTraceLabels()],
  },
});
