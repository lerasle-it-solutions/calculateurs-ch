# Revue rédactionnelle : inventaire des textes visibles

Relevé du 18 octobre 2026, avant la réécriture du site selon `docs/editorial-style.md`. Les nombres de
mots sont approximatifs : mots du texte visible de chaque page construite (`dist/`, extrait par
`src/lib/build/visible-text.ts`, en-tête et pied de page compris), et mots des chaînes françaises de
chaque fichier source.

Une revue par page ou par famille suit dans ce dossier (`<page>.md`, avant / après).

## 1. Par page construite

| Page | Mots visibles | dont `aria-label`, `alt`, `title` | `title` (caractères) | Méta-description (caractères) |
| --- | ---: | ---: | ---: | ---: |
| `/` (accueil) | 396 | 12 | **74** | 134 |
| `/prevoyance/` | 250 | 12 | 28 | 119 |
| `/prevoyance/rachat-3a-retroactif/` (A1) | 1 901 | 18 | 53 | 134 |
| `/prevoyance/economie-impot-3a/` (A2, pilote) | 1 727 | 18 | 53 | 151 |
| `/prevoyance/rachat-lpp/` (A3) | 2 561 | 18 | 51 | 140 |
| `/guides/` | 152 | 12 | 24 | 125 |
| `/prevoyance/guides/rachat-3a-retroactif/` | 2 057 | 14 | 54 | 152 |
| `/methodologie/` | 4 110 | 12 | 30 | 141 |
| `/donnees/` | 1 081 | 12 | 36 | 102 |
| `/politique-de-confidentialite/` | 1 112 | 12 | 46 | 145 |
| `/mentions-legales/` | 708 | 12 | 34 | 130 |
| `/404` | 114 | 12 | 28 | 50 |
| `/demo-calculateur/`, `/demo-ui/` (démonstrations) | 379 + 640 | 18 + 15 | 32, 48 | 49, 59 |

Le `title` de l'accueil dépasse 60 caractères et contient un tiret cadratin : à traiter avec la
famille « accueil » (la charte demande « · » comme séparateur).

## 2. Par source

| Source | Mots (approx.) | Contenu |
| --- | ---: | --- |
| `src/i18n/fr.ts` | 1 150 | En-tête, pied de page, accueil, fil d'Ariane, messages génériques de la carte et des champs, 404, page des données, formulaire de mise en relation |
| `src/calculators/pension/pillar-3a-buyback.ts` (A1) | 1 400 | Promesse, ligne de périmètre, cas exemple, pour qui, ne couvre pas, hypothèses, points de vigilance, conditions, profils, FAQ, messages de la carte |
| `src/calculators/pension/pillar-3a-tax-saving.ts` (A2) | 1 400 | Idem |
| `src/calculators/pension/lpp-buyback.ts` (A3) | 2 000 | Idem |
| `src/calculators/home.ts`, `src/calculators/tax-coverage.ts` | < 30 | Cartes de l'accueil ; messages de couverture partielle (lus dans `fr.ts`) |
| `src/pages/methodologie.astro` | 3 450 | Page rédigée, en dur dans le gabarit |
| `src/pages/politique-de-confidentialite.astro` | 1 000 | Page rédigée, en dur dans le gabarit |
| `src/pages/mentions-legales.astro` | 600 | Page rédigée, en dur dans le gabarit |
| `src/pages/donnees.astro` | 30 | Gabarit ; textes dans `fr.ts` et dans le registre |
| `src/data/sources.ts` | 4 200 | Registre : `name`, `authority`, `legalReference`, `attributionText` s'affichent sur `/donnees/` et `/methodologie/` ; les notes ne s'affichent pas |
| `src/content/articles/rachat-3a-retroactif.mdx` | 2 100 | Le guide |
| `src/lib/articles/rachat-3a-retroactif.ts` | 950 | Valeurs et phrases calculées du guide |
| `src/components/articles/*.astro` | 210 | Figures et tableau du guide (légendes, en-têtes) |
| `src/lib/calculations/*-labels.ts`, `trace-labels.ts` | 1 400 | Libellés de la trace du calcul (« Voir le calcul ligne par ligne ») |
| `src/lib/calculations/tax.ts`, `gross-to-taxable.ts` | 370 | Libellés de trace et messages d'erreur ; ces derniers ne s'affichent pas |
| Balises `title` et méta-descriptions | 14 + 14 | `metaTitle` et `metaDescription` des définitions ; `fr.ts` ou la page pour les autres |
| `aria-label`, `alt` | 12 à 18 mots par page | `fr.ts` (en-tête, pied de page, fil d'Ariane, variantes) |
| Images de partage | 0 | Aucune image de partage n'existe encore (`public/og/` absent) |

## 3. Textes visibles écrits en dur hors des emplacements prévus

Le contenu d'un calculateur vit dans sa définition et les chaînes d'interface dans `fr.ts` (R5). Écrits
ailleurs :

1. **Méta-descriptions de l'accueil et de `/prevoyance/`**, dans le préambule de
   `src/pages/index.astro` et `src/pages/prevoyance/index.astro`.
2. **Case vide de `/donnees/`** : un tiret cadratin tapé dans `src/pages/donnees.astro` pour une source
   inconnue, et `fr.common.emptyValue` (« — ») pour une échéance absente.
3. **Libellés de la trace** dans `src/lib/calculations/` : prévu par R4, mais leur rédaction est figée
   par les tests de calcul qui les recopient (R7), voir la revue d'A2.
4. **Cellule « sans montant » de la trace** : « — » produit par `src/lib/display/pillar-3a-buyback.ts`,
   `lpp-buyback-core.ts` et `gross-estimate.ts` (corrigé pour A2 seulement, dans
   `pillar-3a-tax-saving.ts`).
5. **Figures du guide** (`src/components/articles/WholeYearsFigure.astro`, `BuybackWindowFigure.astro`,
   `BuybackWindowTable.astro`) : légendes et en-têtes en dur dans le composant.
6. **Pages de démonstration** (`src/pages/demo-calculateur.astro`, `demo-ui.astro`) : définitions
   factices et textes de démonstration en dur, avec plusieurs tirets cadratins.
7. **Signe moins des montants négatifs** : `formatSwissNumber` (`src/lib/format/chf.ts`) produit un
   trait d'union (« -1’000 ») ; la charte demande le signe moins typographique (−). À traiter avec les
   messages génériques, le formateur étant partagé et testé.
