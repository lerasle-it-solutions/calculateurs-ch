---
description: Vérifie une page de calculateur contre la liste de contrôle UX (ex. /ux-check rachat-3a-retroactif)
---

Lis `docs/design-system.md`, § 4 en entier, puis la liste de contrôle du § 4.7.

Le slug à vérifier est `$ARGUMENTS` : le slug français de l'URL publique (ex. `rachat-3a-retroactif`). S'il manque, demande-le-moi et arrête-toi.

1. Retrouve la définition du calculateur dont `slug` vaut `$ARGUMENTS` dans `src/calculators/`, puis la page de `src/pages/` qui la rend, et tous les composants, scripts et chaînes de `src/i18n/fr.ts` qu'elle utilise. Si aucune définition ne porte ce slug, dis-le et arrête-toi.
2. Parcours la liste du § 4.7 **point par point, dans l'ordre**, sans en sauter un. Pour chaque point, conclus par l'un de ces états : **conforme**, **écart**, **sans objet** (avec la raison, par exemple aucun plafond pour le bouton « Verser le maximum »), **non vérifiable par lecture** (à vérifier dans le navigateur, avec ce qu'il faut regarder).
3. Pour chaque écart, donne le fichier et la ligne au format `chemin:ligne`, ce que la règle exige (avec son paragraphe, ex. § 4.3) et ce que le code fait.
4. Lance `npx vitest run tests/design` et rapporte le résultat tel quel.
5. Lance `npm run fold` (après `npm run build` si `dist/` manque ou date d'avant tes dernières
   lectures ; première fois : `npx playwright install chromium`) et rapporte tel quel les lignes de la
   page : elles tranchent le point du premier écran (§ 4.1), à 375 × 667 et à 320 × 568.

Rends un tableau : point, état, `chemin:ligne`, constat. Termine par le nombre de points conformes, d'écarts, sans objet et non vérifiables.

**Tu ne corriges rien** : aucune modification de fichier, aucun commit. Si un point de la liste te paraît contredire une autre règle de `CLAUDE.md` ou de `docs/design-system.md`, signale-le sans trancher.
