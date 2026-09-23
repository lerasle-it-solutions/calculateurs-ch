---
description: Ajoute une source au registre selon le format imposé
---

Lis `docs/plan/sources.md`, section « Structure d'une entrée » et le registre maître.

Je vais te donner un relevé de source. Pour chacune :

1. Vérifie qu'une ligne du registre maître la prévoit. Si oui, reprends-en `dataClass`, `nature`, `requiresAttribution` et `usedBy`. Si non, signale-le-moi : une source hors registre est soit un oubli du plan, soit une source à écarter.
2. Ajoute l'entrée à `src/data/sources.ts` au type `Source` exact, avec `verifiedOn` à la date du jour.
3. N'invente **aucune** URL ni référence légale. Champ manquant → `TODO` et tu me le dis.
4. Si `dataClass` vaut `compiled`, l'entrée va dans `src/data/private/sources.private.ts`, jamais dans le registre public.
5. Lance `npm run test` et vérifie que `/donnees/` affiche la nouvelle source avec, le cas échéant, son texte d'attribution.
