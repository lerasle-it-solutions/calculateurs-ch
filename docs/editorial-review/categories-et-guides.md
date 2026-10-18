# Revue rédactionnelle : `/prevoyance/` et `/guides/`

18 octobre 2026, selon `docs/editorial-style.md`. Sources : `src/i18n/fr.ts` (`familyPage`,
`guidesPage`), `src/pages/prevoyance/index.astro`, `src/pages/guides.astro`. Les cartes reprennent le
titre et la méta-description de chaque calculateur, et le titre et la description du guide, revus avec
eux.

## Déplacements

La méta-description et le chapeau de `/prevoyance/` étaient écrits dans la page ; ils passent dans
`fr.familyPage.pension`. Les deux `title` passent par le séparateur « · » (`fr.site.pageTitle`).

## Textes

| Texte | Avant | Après |
| --- | --- | --- |
| `title` de `/prevoyance/` | Prévoyance — calculateurs.ch | Prévoyance · calculateurs.ch |
| Méta-description de `/prevoyance/` | Calculateurs de prévoyance pour la Suisse romande, 3e pilier et 2e pilier, avec la source et la date de chaque chiffre. | Calculateurs du 3e pilier et du 2e pilier pour la Suisse romande, avec la source et la date de chaque chiffre. |
| Chapeau de `/prevoyance/` | Des calculateurs pour le 3e pilier et la prévoyance professionnelle, en Suisse romande. Chaque chiffre provient d'une source officielle datée. | Des calculateurs pour votre 3e pilier et votre caisse de pension, en Suisse romande. Chaque chiffre vient d’une source officielle, datée. |
| `title` de `/guides/` | Guides — calculateurs.ch | Guides · calculateurs.ch |
| Chapeau et méta-description de `/guides/` | Les règles derrière chaque calcul, expliquées et sourcées, avec un exemple chiffré. ; Guides de prévoyance et de fiscalité pour la Suisse romande : les règles derrière chaque calculateur, expliquées et sourcées. | *(typographie seule)* : déjà directs |

« Prévoyance professionnelle » devient « caisse de pension », le terme suisse de la charte (§ 4.2).

## `npm run copy:report`

Avant et après : `## prevoyance/index.html (0)`, `## guides/index.html (0)`.

Garde-fou : un tiret cadratin par page avant (dans le `title`), 0 après ; les deux pages quittent
`PENDING_PAGES`.
