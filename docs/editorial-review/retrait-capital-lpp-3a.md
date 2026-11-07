# Revue rédactionnelle : `/prevoyance/retrait-capital-lpp-3a/`

7 novembre 2026, selon `docs/editorial-style.md`. Sources : `src/calculators/pension/capital-withdrawal.ts`
(définition, textes de la page), `src/lib/calculations/pension/capital-withdrawal-labels.ts` (trace),
`src/pages/prevoyance/retrait-capital-lpp-3a.astro` et `src/pages/methodologie.astro` (section 6, retrait en
capital ; section 12, niveau 3). Page construite sur la branche `a4-capital-withdrawal`, non publiée.

Page neuve, écrite d'emblée selon la charte : pas d'« avant » publié. La revue porte sur le texte relu avant la
première construction complète, sur les phrases reprises d'A3 et sur les choix qui s'écartent de la lettre de
la charte.

## Fiche

| Élément | Texte | Longueur |
| --- | --- | --- |
| H1 (`title`) | Retrait en capital LPP et 3a : impôt et échelonnement | 53 caractères |
| `metaTitle` | Impôt sur le retrait en capital 2026 : faut-il échelonner ? | 59 caractères, avec l'année |
| Description | Estimez l’impôt sur le capital de votre caisse de pension et de vos comptes 3a, et ce qu’un retrait échelonné vous fait économiser. | 131 caractères, `checkMeta` sans avertissement |
| Promesse | L’impôt sur votre capital LPP et 3a, et ce qu’un retrait échelonné vous fait économiser. | une phrase, raccourcie pour le premier écran |
| Ligne de périmètre | Pour une personne seule sans enfant, imposée au régime ordinaire en Suisse romande, dès 2026. | une phrase, raccourcie pour le premier écran |
| Bandeau de l'exemple | Exemple : à Lausanne, 240’000 CHF de capital LPP et un compte 3a de 45’000 CHF retirés en 2026. | raccourci pour le premier écran |

## Phrases reprises mot pour mot

| Phrase d'A4 | Origine |
| --- | --- |
| Aucun retrait en capital du 2e pilier, quel qu’en soit le motif, dans les 3 ans qui suivent chaque rachat : sinon la déduction est refusée. | A3, point de vigilance 1 (apostrophe typographique posée) |
| Pendant 3 ans après un rachat, les prestations qui en résultent ne peuvent pas être versées en capital (art. 79b al. 3 LPP). | A3, avertissement 1, texte |
| En principe, tout versement en capital dans ce délai est réputé abusif, et le rachat n’est pas déductible, sans autre examen (ATF 142 II 399 consid. 4.1). | A3, avertissement 1, puce 1 (« dans les 3 ans » devient « dans ce délai ») |
| En principe, la déduction du rachat est refusée, ou corrigée après coup si elle avait été admise (ATF 142 II 399 consid. 4.1). | A3, FAQ 4 |
| Le certificat de prévoyance, ou une simulation demandée à votre caisse. | A3, « ne couvre pas », rendement (« la caisse » devient « votre caisse ») |
| Renseignez-vous auprès de l’administration fiscale de votre canton. | A3, « ne couvre pas », impôt à la source |
| Ce montant est une estimation indicative, établie d’après les barèmes 2026 et vos saisies. Il ne constitue pas un conseil fiscal ou en prévoyance, et ne remplace pas votre décision de taxation. | A3, réserve sous le résultat |

## Corrections faites à la relecture

| Avant | Après | Motif |
| --- | --- | --- |
| Une fois versé, le capital ne redevient pas une rente, et l’impôt sur le capital est dû l’année du versement. | Une fois le capital versé, le choix est fait, et l’impôt sur le capital est dû pour l’année du versement (art. 38 al. 1bis LIFD). | La première moitié affirmait une règle sans article ; la seconde reçoit le sien |
| Il se retire en 3 étapes au plus, une étape regroupant tous les retraits d’une même année civile, et le premier retrait partiel vaut au moins 20 % de la prestation (art. 13a al. 2 et 3 LPP). | Deux phrases, chacune avec son alinéa | 37 mots (`npm run copy:report`) |
| Prestations en capital de l'année, additionnées 2026 | Prestations en capital additionnées en 2026 | Libellé de la trace lu à voix haute |
| Description de 152 caractères | 131 caractères | Cible de Bing (120 à 150) |
| Promesse, ligne de périmètre et bandeau plus longs | Versions courtes ci-dessus | `npm run fold` : premier champ sous la barre mobile à 375 × 667 (658 px pour une barre à 604 px), 588 px après |

## Écarts assumés

- **Phrase de 38 mots restante** (rapport de style) : la ligne « Imposition séparée du capital » de la trace,
  dont le rapport lit le libellé et l'hypothèse comme une phrase. L'hypothèse seule compte 32 mots ; elle
  énonce l'imposition séparée, l'impôt annuel entier, l'année d'acquisition et l'absence de déduction sociale
  avec leurs articles. Justifiée par son sens juridique.
- **Références juridiques entre parenthèses** dans les points de vigilance, la FAQ et les hypothèses, comme A3,
  et non en `SourceTag` (§ 4.5) : même choix que la page dont les phrases sont reprises. À reprendre pour les
  deux pages en même temps.
- **Libellés de la trace** à l'apostrophe droite, comme ceux du moteur fiscal (`trace-labels.ts`) ; les textes
  de la page ont l'apostrophe typographique et l'espace fine insécable avant les deux-points.
- **« 1 compte(s) 3a »** dans la trace : forme invariable, la trace étant un relevé de calcul.

## Contrôles

- `tests/content/editorial.test.ts` : vert sur la page construite (aucun tiret cadratin ni demi-cadratin,
  aucun point d'exclamation, aucune tournure interdite).
- `npm run copy:report` relu : une phrase de plus de 35 mots restante, justifiée ci-dessus.
