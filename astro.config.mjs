// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { browserTraceLabels } from "./src/lib/build/browser-trace-labels.ts";
import { directDynamicImport } from "./src/lib/build/direct-dynamic-import.ts";
import { readLedger } from "./src/lib/seo/content-lastmod.ts";
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
      // Les pages en noindex (démonstration, mentions légales, 404…) ne sont pas listées.
      filter: includeInSitemap,
      // lastmod : date du dernier changement du texte de <main>, lue dans seo/lastmod.json
      // (npm run lastmod), jamais la date de construction ; ni changefreq ni priority, que
      // Bing ignore (src/lib/seo/content-lastmod.ts).
      serialize: (item) => {
        const entry = readLedger()[item.url];
        return entry ? { url: item.url, lastmod: entry.lastmod } : { url: item.url };
      },
    }),
  ],
  build: { format: "directory" },
  // Préchargement désactivé : son script comptait dans le budget de 30 ko de JavaScript par page.
  prefetch: false,
  vite: {
    // Libellés fixes de la trace lus dans le JSON de la page, hors du script, et import() à la
    // demande sans helper de préchargement (budget JavaScript).
    plugins: [tailwindcss(), browserTraceLabels(), directDynamicImport()],
    build: {
      rolldownOptions: {
        output: {
          // Morceaux regroupés à la main (budget JavaScript, décision n° 21 ; analyse du 8.11.2026).
          //
          // Chaque frontière entre deux morceaux coûte des octets : la liste des liaisons exportées
          // par l'un, importées par l'autre, et la ligne d'import de chaque cœur. Livré seul, Rolldown
          // découpe le code partagé selon qui l'utilise. A4 n'emploie qu'une partie du moteur fiscal
          // (pas tax.ts ni income-tax-saving.ts) : le morceau commun des cœurs se coupait en deux,
          // et ces coutures ajoutaient environ 310 octets au cœur d'A1 et 420 à celui d'A3 (dont le
          // runtime de Rolldown, sorti dans un morceau à part dès que deux pages l'emploient), qui
          // dépassaient alors 40 000 octets.
          codeSplitting: {
            groups: [
              // Démarrage : chargeur de la première interaction, état partageable et helper de
              // préchargement. Prioritaire, sinon le groupe suivant les absorbe comme dépendances de
              // calculator-runtime.ts et tout le code partagé des cœurs passe dans le démarrage.
              {
                name: "startup",
                priority: 10,
                test: /src[\\/]lib[\\/]display[\\/](share-state|first-interaction)\.ts$|preload-helper/,
              },
              // Formateurs des montants, partagés par tous les cœurs et leurs modules : un seul morceau,
              // au lieu de trois de quelques dizaines d'octets, chacun importé à part.
              { name: "format", test: /src[\\/]lib[\\/](format[\\/]chf|display[\\/]amounts|utils[\\/]format-number)\.ts$/ },
              // Code partagé par tous les cœurs, A4 compris : moteur de la page, lecture du formulaire,
              // couverture, données, carte résultat, barèmes. Un seul morceau au lieu de deux, ce qui
              // supprime une frontière ; amount-input y entre aussi, comme dépendance. Seule la page
              // interne /demo-calculateur/ (noindex, hors sitemap) y perd : son démarrage charge ce
              // morceau, sous le plafond de 30 000 octets.
              {
                name: "calculator-runtime",
                test: /src[\\/]lib[\\/](display[\\/](calculator-runtime|calculator-form|coverage|eligibility|municipality-labels|tax-data|result-card|result-summary|result-views)|calculations[\\/](tax-scales-bundle|tax-scale))\.ts$|browser-trace-labels:tax-scale/,
              },
            ],
          },
        },
      },
    },
  },
});
