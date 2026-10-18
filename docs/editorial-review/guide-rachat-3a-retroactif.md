# Revue rédactionnelle : `/prevoyance/guides/rachat-3a-retroactif/`

18 octobre 2026, selon `docs/editorial-style.md`. Sources : `src/content/articles/rachat-3a-retroactif.mdx`,
les figures et le tableau de `src/components/articles/`, et la liste des sources de
`src/pages/prevoyance/guides/[slug].astro`.

**Les dates ne changent pas.** « Mis à jour le 5 octobre 2026 » (`updatedOn`) et « droit en vigueur au
5 octobre 2026 » décrivent l'état du droit, et une réécriture de style n'est pas une mise à jour du droit.
`publishedOn` et `updatedOn` restent au 2026-10-05, et l'exemple chiffré reste daté du 5 octobre 2026.

Le texte du guide était déjà écrit au plus près de la charte. Les changements sont peu nombreux.

## Textes

| Passage | Avant | Après |
| --- | --- | --- |
| Demande de rachat (38 mots) | Vous demandez le rachat **par écrit** à votre fondation bancaire ou à votre assurance 3a, en indiquant le montant, les années à combler et ce que vous avez déjà versé ces années-là (art. 7b al. 1 OPP 3). | Vous demandez le rachat **par écrit** à votre fondation bancaire ou à votre assurance 3a. La demande indique le montant, les années à combler et ce que vous avez déjà versé ces années-là (art. 7b al. 1 OPP 3). |
| Piège 3 (37 mots) | … (circulaire 18a, ch. 5.7 e) : rachetez avant votre dernier jour de travail, pas seulement avant la fin de l'année. | … (circulaire 18a, ch. 5.7 e). Rachetez donc avant votre dernier jour de travail, pas seulement avant la fin de l’année. |
| Piège 4 (deux deux-points) | Une seule exception : une lacune qui arrive à sa dernière année de rachat passe toujours en premier, sinon elle expire. | Seule exception, une lacune qui arrive à sa dernière année de rachat passe toujours en premier, sinon elle expire. |
| Ce qui change en 2027 (quatre phrases de 17 à 19 mots) | … En 2027, vous pourrez donc racheter jusqu'à 7’373 francs, après avoir versé une cotisation ordinaire du même montant. Les lacunes de 2025 et 2026 restent mesurées… | … En 2027, vous pourrez donc racheter jusqu’à 7’373 francs. Il faudra d’abord verser une cotisation ordinaire du même montant. Les lacunes de 2025 et 2026, elles, restent mesurées… |
| Avant de racheter (41 mots) | Le capital 3a sera imposé à son retrait, séparément de vos autres revenus et à taux réduit : pour l'impôt fédéral direct, au cinquième du barème ordinaire (art. 38 LIFD), et selon les règles de votre canton pour l'impôt cantonal et communal. | Le capital 3a sera imposé à son retrait, séparément de vos autres revenus et à taux réduit. Pour l’impôt fédéral direct, c’est le cinquième du barème ordinaire (art. 38 LIFD) ; pour l’impôt cantonal et communal, ce sont les règles de votre canton. |
| Figure 1, légende | Figure 1 — Chaque lacune est rachetable pendant 10 ans… | Figure 1. Chaque lacune est rachetable pendant 10 ans… |
| Figure 2, légende | Figure 2 — Même plafond, deux choix. Une année entamée ne se complète plus : son solde est perdu. | Figure 2. Même plafond, deux choix. Une année entamée ne se complète plus, et son solde est perdu. |
| Sources officielles | OPP 3, art. 7, 7a, 7b et 8 — Fedlex (et les quatre autres) | OPP 3, art. 7, 7a, 7b et 8 (Fedlex) |

Typographie : les montants de l'exemple écrits dans le texte (« 70'000 », « 2'500 », « 3'000 »…) prennent
l'apostrophe typographique dans la source ; le rendu MDX la posait déjà à l'affichage. Le titre, le
`title` et la description reçoivent l'espace fine avant les deux-points.

## Ce qui reste signalé

La phrase des confirmations de la demande (40 mots) énumère les quatre déclarations de l'art. 7b al. 2
OPP 3 sous une seule référence (« al. 2 ») ; la couper séparerait la référence de trois d'entre elles.

## `npm run copy:report`

Avant :

```
## prevoyance/guides/rachat-3a-retroactif/index.html (6)
- phrase de 38 mots : Vous demandez le rachat par écrit à votre fondation bancaire ou à votre assurance 3a, …
- phrase de 40 mots : Vous y confirmez avoir versé la cotisation maximale de l’année, …
- phrase de 37 mots : Et le jour où votre activité prend fin, …
- phrase de 41 mots : Le capital 3a sera imposé à son retrait, …
- rythme uniforme (18, 19, 18, 17 mots) : Le 2 octobre 2026, le Conseil fédéral a relevé les montants…
- 2 deux-points : 4. Le plafond vaut pour le total de l’année. …
```

Après :

```
## prevoyance/guides/rachat-3a-retroactif/index.html (1)
- phrase de 40 mots : Vous y confirmez avoir versé la cotisation maximale de l’année, …
```

Garde-fou : 7 tirets cadratins avant (2 légendes, 5 sources), 0 après ; la page quitte `PENDING_PAGES`.
