// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import preact from '@astrojs/preact';

// https://astro.build/config
// Configuration conforme à la section 9 de l'architecture (voir CLAUDE.md).
export default defineConfig({
  site: 'https://www.calculateurs.ch',
  output: 'static',
  integrations: [
    sitemap({ changefreq: 'monthly', lastmod: new Date() }),
    preact({ compat: false }),
  ],
  build: { format: 'directory' },
  prefetch: { prefetchAll: true, defaultStrategy: 'viewport' },
});
