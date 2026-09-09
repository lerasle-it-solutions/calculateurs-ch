// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
// Configuration conforme à la section 9 de l'architecture et au § Design system (voir CLAUDE.md).
// Aucun framework d'interface, aucun îlot hydraté : Tailwind CSS v4 via le plugin Vite,
// interactivité en JavaScript natif dans les pages concernées.
export default defineConfig({
  site: "https://calculateurs.ch",
  output: "static",
  integrations: [
    sitemap({
      changefreq: "monthly",
      lastmod: new Date(),
      // Les pages internes de démonstration ne sont ni indexées ni listées.
      filter: (page) => !page.includes("/demo-"),
    }),
  ],
  build: { format: "directory" },
  prefetch: { prefetchAll: true, defaultStrategy: "viewport" },
  vite: {
    plugins: [tailwindcss()],
  },
});
