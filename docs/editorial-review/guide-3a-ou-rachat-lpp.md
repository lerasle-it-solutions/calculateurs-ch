# Revue rédactionnelle : `/prevoyance/guides/3a-ou-rachat-lpp/`

20 octobre 2026, selon `docs/editorial-style.md`. Sources : `src/content/articles/3a-ou-rachat-lpp.mdx`,
`src/lib/articles/3a-ou-rachat-lpp.ts` (valeurs et libellés repris d'A3) et la liste des sources de
`src/pages/prevoyance/guides/[slug].astro`.

Article neuf, écrit d'emblée selon la charte : pas d'« avant » publié. La revue porte sur le texte
relu avant la première construction, sur les phrases reprises d'A3 et de l'article 1, et sur les
choix qui s'écartent de la lettre de la charte.

## Fiche

| Élément | Texte | Longueur |
| --- | --- | --- |
| H1 (`title`) | 3a ou rachat LPP : lequel choisir selon votre situation ? | 57 caractères |
| `metaTitle` | 3a ou rachat LPP en 2026 : lequel choisir ? | 43 caractères, avec l'année |
| Description | À montant égal, un versement 3a et un rachat LPP font économiser le même impôt. Ce qui les départage, situation par situation, avec deux exemples chiffrés. | 155 caractères |

Mot-clé principal « 3a ou rachat LPP » dans le `title`, le H1 et la description (§ 5).

## Phrases reprises mot pour mot

Reprises pour garder un seul énoncé par règle sur le site (§ 4.1, « une seule façon de dire une chose ») :

| Phrase de l'article | Origine |
| --- | --- |
| En principe, tout versement en capital dans les 3 ans est réputé abusif, et le rachat n’est pas déductible. | A3, avertissement 1, puce 1 (sans « sans autre examen ») |
| Lorsque le remboursement n’est plus possible, en principe à l’approche de la retraite, le règlement de votre caisse peut autoriser des rachats dans certaines limites. | A3, FAQ 5 |
| La part de votre 3a qui dépasse la somme des versements maximaux déductibles depuis vos 24 ans, intérêts au taux minimal LPP compris, est déduite du rachat LPP possible. | A3, FAQ 6, sans les avoirs de libre passage (art. 60a al. 3, hors du sujet de la ligne) |
| Vos rachats LPP sont plafonnés chaque année pendant vos premières années d’affiliation. | A3, FAQ 7 |
| Une caisse en découvert peut prélever des cotisations d’assainissement et, si cela ne suffit pas, rémunérer l’avoir de vieillesse en dessous du taux minimal légal. L’avoir racheté fait partie de votre avoir de vieillesse, et les mesures d’assainissement s’y appliquent comme au reste. | A3, avertissement 4 |
| Les barèmes étant progressifs, répartir un gros rachat garde souvent chaque déduction dans des tranches plus imposées. | A3, FAQ 3 |
| Le revenu imposable et les barèmes de 2026 sont supposés constants sur toute la période, et le potentiel reste disponible jusqu’à la dernière tranche. | A3, hypothèse 5 (« de l’année de calcul » devient « de 2026 », l’article étant daté) |
| Chaque versement fait courir son propre délai, si bien qu’échelonner ses rachats repousse la date du premier retrait en capital possible (art. 79b al. 3 LPP). | A3, avertissement 1, puce 3 |
| Le calcul raisonne en années civiles. Le délai se compte à partir de la date de chaque versement : si l’écart est de 3 ans, vérifiez la date exacte auprès de votre caisse. | A3, hypothèse de la ligne du délai dans la trace (`LOCK_PERIOD_ASSUMPTION_*`), lue par le module ; apostrophe et espace fine posées à l’affichage |
| Échelonnement, Tranches, Économie totale, Écart avec le rachat en une fois, En une fois, Sur 3 ans ; Année du versement, Fin du délai, à vérifier jour pour jour, Retrait compatible dès | A3, en-têtes et libellés des tableaux « Rachat en une fois ou échelonné » et « Délai de blocage », lus par le module |
| *Calcul effectué le … sur les calculateurs du site, barèmes 2026. Les revenus sont des montants ronds choisis pour l’exemple.* | Article 1, mention de l’exemple chiffré |

## Corrections faites à la relecture

| Passage | Premier jet | Texte relu |
| --- | --- | --- |
| Tableau, ligne « aucune caisse » | Le rachat LPP suppose une caisse de pension, qui le permet jusqu’à hauteur des prestations de son règlement. Sans caisse, le plafond du 3a passe à… | Sans caisse de pension, aucun rachat LPP n’est possible. Le plafond du 3a passe alors à… (la ligne précédente disait déjà « jusqu’à hauteur des prestations de son règlement ») |
| Exemple 2, total | Au total, c’est 15’837 francs, … | Au total, l’économie atteint 15’837 francs, … |
| Réponse courte | Une phrase de 37 mots réunissant la déduction et ses deux impôts | Deux phrases : la déduction, puis les impôts concernés avec leurs articles |
| Tableau, ligne « retrait en capital » | Les motifs (retraite, logement, départ) n’apparaissaient que dans la situation | Ajout de « Selon la pratique fiscale, le retrait compte quel que soit son motif. » (A3, méthodologie § 6, phrase 48 de `tracabilite-A3.md`, sans la mention de l’institution), pour que la portée des motifs soit attribuée à la pratique et non à l’arrêt |
| Les deux se cumulent | Un avoir 3a élevé peut toutefois réduire le rachat possible, comme le montre le tableau plus haut. | Un avoir 3a élevé peut toutefois réduire le rachat possible (art. 60a al. 2 OPP 2). |

## Écarts assumés avec la lettre de la charte

- **Colonne « Base » du tableau de décision.** Les références n’y sont pas « en fin de phrase et entre
  parenthèses » (§ 5) : la colonne est demandée par le plan de l’article (W10). Chaque ligne garde
  sa règle et sa référence côte à côte.
- **Case vide** dans le tableau de l’échelonnement : l’écart du rachat en une fois avec lui-même n’est
  pas un montant (§ 3.1, « une case sans montant reste vide »). A3 affiche « 0 CHF » à cet endroit.
- **« 24 ans »** reste écrit dans la phrase de l’art. 60a al. 2 OPP 2, comme sur A3 : ce n’est pas une
  valeur des données, c’est le texte de l’article.

## `npm run copy:report`

```
## prevoyance/guides/3a-ou-rachat-lpp/index.html (0)
```

Aucune phrase de plus de 35 mots, aucun paragraphe au rythme uniforme, aucun paragraphe à plus d’un
deux-points. Garde-fou postbuild (`tests/content/editorial.test.ts`) : passé.

## Phrases qui ont résisté

Aucune.

## A3, textes modifiés

| Passage | Avant | Après |
| --- | --- | --- |
| Ce que ça ne couvre pas, « Comparaison entre un rachat LPP et un versement 3a » | Alternative : le calculateur d’économie d’impôt 3a (A2) | Alternative : 3a ou rachat LPP : lequel choisir selon votre situation ?, lien vers l’article |
| Ce que ce calcul suppose, « Le calcul en bref » | Aucun lien de guide | Choisir entre un versement 3a et un rachat LPP, lien vers l’article |
| Tableau d’échelonnement, écart négatif (après saisie) | « – 12 CHF » (tiret demi-cadratin) | « − 12 CHF » (signe moins, U+2212, § 3.1) |
