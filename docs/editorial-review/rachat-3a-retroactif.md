# Revue rédactionnelle : `/prevoyance/rachat-3a-retroactif/` (A1)

18 octobre 2026, selon `docs/editorial-style.md`. Sources : `src/calculators/pension/pillar-3a-buyback.ts`
(définition et textes de la carte, partagés avec A2 pour les messages de couverture) et
`src/lib/display/pillar-3a-buyback.ts` (case sans montant de la trace). Textes montrés tels qu'ils
s'affichent (rachat en 2026, première lacune 2025, délai de 10 ans, valeurs lues dans les données).
Typographie française appliquée à toutes les chaînes ; signalée seulement quand elle est le seul
changement.

## 1. Balises et en-tête

| Texte | Avant | Après |
| --- | --- | --- |
| `title` | Rachat 3a rétroactif 2026 : quelle économie d'impôt ? | *(typographie seule)* |
| Méta-description | Calculez ce que vous pouvez racheter dans votre pilier 3a depuis 2025, jusqu'à quand, et l'impôt économisé dans votre commune romande. | Ce que vous pouvez encore racheter dans votre pilier 3a depuis 2025, jusqu’à quand, et l’impôt que vous économisez dans votre commune romande. (142 c.) |
| Promesse | Ce que vous pouvez encore racheter dans votre 3a, et l'impôt économisé. | Ce que vous pouvez encore racheter dans votre 3a, et l’impôt que vous économisez. |
| Ligne de périmètre | Personnes affiliées à un 2e pilier, imposées au régime ordinaire en Suisse romande, rachat en 2026. | Pour un rachat en 2026, par une personne affiliée à un 2e pilier et imposée au régime ordinaire en Suisse romande. |
| Bandeau d'exemple | personne seule à Lausanne, revenu imposable de 70’000 CHF, 2’500 CHF versés en 2025 | une personne seule à Lausanne, avec un revenu imposable de 70’000 CHF, qui a versé 2’500 CHF en 2025 |
| Rappel sous le chiffre | Le capital 3a sera imposé à son retrait : cette économie n'est pas un gain net. | Le capital 3a sera imposé à son retrait, cette économie n’est donc pas un gain net. *(comme A2)* |

## 2. Formulaire

| Texte | Avant | Après |
| --- | --- | --- |
| Aide de la commune | Commencez à saisir le nom de la commune ; le canton en est déduit. | Tapez les premières lettres de votre commune. Le canton s’en déduit. *(comme A2)* |
| Aide des revenus imposables | Il figure sur votre dernière décision de taxation, ligne revenu imposable. | Vous le trouvez sur votre dernière décision de taxation, à la ligne « revenu imposable ». |
| Libellés, profil, conditions | (versements, revenus AVS, rachats déjà faits, cotisation de l'année, prestation de vieillesse) | *(typographie seule)* ; « Je remplis les conditions » et sa liste, déjà en clair, ne changent pas. |

## 3. Carte et messages

| Texte | Avant | Après |
| --- | --- | --- |
| Réserve | Estimation indicative, établie d'après les barèmes 2026 et vos saisies. Elle ne constitue ni un conseil fiscal ni un conseil en prévoyance, et ne remplace pas votre décision de taxation. | Ce montant est une estimation indicative, établie d’après les barèmes 2026 et vos saisies. Il ne constitue pas un conseil fiscal ou en prévoyance, et ne remplace pas votre décision de taxation. *(comme A2)* |
| Ménage hors périmètre (A1 et A2) | Ce calculateur ne couvre pas encore votre ménage dans le canton Valais : ses résultats ne reproduiraient pas exactement ceux du calculateur officiel. Utilisez la calculette du canton : | Ce calculateur ne couvre pas encore votre ménage dans le canton Valais, parce que ses résultats ne reproduiraient pas exactement ceux du calculateur officiel. Utilisez la calculette du canton : |
| Commune hors périmètre (A1 et A2) | Ce calculateur ne couvre pas encore la commune de Brig-Glis : une donnée communale nécessaire au calcul n'y est pas relevée. Utilisez la calculette du canton : | Ce calculateur ne couvre pas encore la commune de Brig-Glis, faute d’une donnée communale relevée pour le calcul. Utilisez la calculette du canton : |
| Donnée manquante (A1 et A2) | Une donnée nécessaire au calcul pour cette commune n'est pas encore relevée : aucun résultat n'est affiché. | Une donnée nécessaire au calcul n’est pas encore relevée pour cette commune, et aucun résultat n’est donc affiché. |
| Mentions courtes, commune inconnue | Hors périmètre, voir le message… ; Choisissez une commune dans la liste proposée. | Inchangées |

Le deux-points final des deux messages hors périmètre annonce le lien vers la calculette ; c'est le
seul du message.

## 4. Point de vigilance

| Avant | Après |
| --- | --- |
| Attention : Chaque année de lacune ne se rachète qu'une fois : une lacune comblée en partie ne peut plus être complétée, et le solde est perdu. | Attention : Chaque année de lacune ne se rachète qu’une fois, et si vous n’en comblez qu’une partie, le solde est perdu. |

## 5. Ce que ce calcul suppose

| Texte | Avant | Après |
| --- | --- | --- |
| Pour qui (38 mots) | Salarié ou indépendant affilié à un 2e pilier, ayant réalisé un revenu soumis à l'AVS, imposé au régime ordinaire dans un canton romand, qui n'a pas versé le maximum au pilier 3a une ou plusieurs années depuis 2025. | Un salarié ou un indépendant affilié à un 2e pilier et imposé au régime ordinaire dans un canton romand. Il a réalisé un revenu soumis à l’AVS et n’a pas versé le maximum au pilier 3a une ou plusieurs années depuis 2025. |
| Ne couvre pas, 1 | Lacunes antérieures à 2025 : elles ne sont pas rachetables. La disposition transitoire… | Les lacunes antérieures à 2025, qui ne sont pas rachetables. La disposition transitoire… *(suite inchangée)* |
| Ne couvre pas, 2 | Personnes imposées à la source sans quasi-résidence : le calcul suppose une taxation ordinaire. | Les personnes imposées à la source sans quasi-résidence, car le calcul suppose une taxation ordinaire. |
| Ne couvre pas, 3 (41 mots) | Personnes ayant déjà perçu une prestation de vieillesse du pilier 3a, ou ayant dépassé de plus de cinq ans l'âge de référence : le rachat est exclu (art. 7a al. 4 et 5 OPP 3). | Les personnes qui ont déjà perçu une prestation de vieillesse du pilier 3a, ou qui ont dépassé l’âge de référence de plus de cinq ans. Pour elles, le rachat est exclu (art. 7a al. 4 et 5 OPP 3). |
| Ne couvre pas, 4 (42 mots) | Rachat des personnes non affiliées à un 2e pilier (indépendants sans caisse de pension, salariés sous le seuil LPP), dont la lacune se calcule sur la « grande » cotisation : il n'est pas encore couvert. | Le rachat des personnes non affiliées à un 2e pilier (indépendants sans caisse de pension, salariés sous le seuil LPP). Leur lacune se calcule sur la « grande » cotisation, et ce cas n’est pas encore couvert. |
| Ne couvre pas, 5 | Rendement futur du capital racheté. | Le rendement futur du capital racheté. |
| Hypothèse 4 | Un seul rachat par année de lacune : une lacune comblée en partie ne peut plus être complétée, et le solde est perdu (art. 7a al. 3). | Une année de lacune ne se rachète qu’une fois, si bien qu’une lacune comblée en partie ne peut plus être complétée et que le solde est perdu (art. 7a al. 3). |
| Autres hypothèses | (plafond annuel, cotisation de l'année, revenu AVS, délai, méthode, déductions) | *(typographie seule)* |
| Le calcul en bref, § 1 | Depuis 2026, il est possible pour la première fois de rattraper des versements manqués au pilier 3a, mais seulement pour les années à partir de 2025. Une année où vous n'avez pas versé le maximum peut être rachetée pendant 10 ans, et le rachat se déduit de votre revenu imposable, comme une cotisation ordinaire. | Depuis 2026, vous pouvez rattraper des versements manqués au pilier 3a. C’est une première, limitée aux années à partir de 2025. Une année où vous n’avez pas versé le maximum se rachète pendant 10 ans, et le rachat se déduit de votre revenu imposable comme une cotisation ordinaire. |
| Le calcul en bref, § 2 | Chaque année, vous pouvez racheter au total jusqu'à la « petite » cotisation 3a de l'année (7’258 CHF en 2026), … Il faut en outre avoir eu un revenu soumis à l'AVS… qui doit l'autoriser avant que vous ne versiez. | En une année, vos rachats peuvent atteindre au total la « petite » cotisation 3a de l’année (7’258 CHF en 2026), … Il faut encore avoir eu un revenu soumis à l’AVS… qui doit l’autoriser avant tout versement. |
| Le calcul en bref, § 3 | Ce calculateur indique, année par année, ce que vous pouvez encore racheter, jusqu'à quand, et l'impôt que vous économiseriez. | Le calculateur montre, année par année, ce que vous pouvez encore racheter et jusqu’à quand, puis l’impôt que ce rachat vous ferait économiser. |

## 6. Questions fréquentes

| Question | Avant | Après |
| --- | --- | --- |
| Quelles années puis-je racheter… | Seules les lacunes apparues depuis 2025 ; les années antérieures ne pourront jamais être rachetées. Chaque lacune reste rachetable pendant 10 ans : celle de 2025 jusqu'en 2035. | Seulement les lacunes apparues depuis 2025. Les années antérieures ne pourront jamais être rachetées. Chaque lacune reste rachetable pendant 10 ans, celle de 2025 par exemple jusqu’en 2035. |
| Quelles conditions… (44 mots, trois points-virgules) | Avoir eu un revenu soumis à l'AVS l'année de la lacune et l'année du rachat ; avoir versé en entier la cotisation ordinaire de l'année du rachat ; ne jamais avoir perçu de prestation de vieillesse du pilier 3a, y compris d'une police arrivée à échéance. Après une telle prestation, plus aucun rachat n'est possible. … | Il vous faut un revenu soumis à l’AVS l’année de la lacune et l’année du rachat. La cotisation ordinaire de l’année du rachat doit être versée en entier. Enfin, vous ne devez jamais avoir perçu de prestation de vieillesse du pilier 3a, y compris d’une police arrivée à échéance, car après une telle prestation plus aucun rachat n’est possible. … |
| Et si mes lacunes dépassent ce plafond ? | Chaque année de lacune ne se rachète qu'une fois : si vous n'en comblez qu'une partie, le reste est perdu. Mieux vaut combler… | Chaque année de lacune ne se rachète qu’une fois, et si vous n’en comblez qu’une partie, le reste est perdu. Mieux vaut donc combler… |
| Comment se passe la demande ? | Par écrit, auprès de votre fondation bancaire ou de votre assurance : vous indiquez… L'institution vérifie et autorise le rachat ; vous ne versez qu'ensuite… | Par écrit, auprès de votre fondation bancaire ou de votre assurance. Vous y indiquez… L’institution vérifie puis autorise le rachat, et vous ne versez qu’ensuite… |
| Je suis indépendant… | Ce qui compte, c'est l'affiliation à un 2e pilier, pas le statut. … Ce calculateur ne couvre pas encore ce rachat : adressez-vous à votre fondation ou à votre assurance 3a. | Seule compte l’affiliation à un 2e pilier, pas votre statut. … Ce calculateur ne couvre pas encore ce rachat. Adressez-vous à votre fondation ou à votre assurance 3a. |
| Pourquoi ne pas multiplier… | Parce que le rachat peut faire changer de tranche de barème. Le calculateur calcule votre impôt deux fois, avant et après le rachat, et affiche la différence exacte. | Parce que le rachat peut faire passer votre revenu dans une autre tranche du barème, ce qu’un taux marginal ne voit pas. Le calculateur établit donc votre impôt deux fois, avant et après le rachat, et affiche la différence. *(comme A2)* |
| Interruption, montant annuel, calendrier | (trois réponses) | *(typographie seule)* |

## 7. Ce qui n'a pas changé

- **La trace** et les motifs de refus par année (« jusqu'en 2035 », « disposition transitoire »…) : libellés
  du moteur recopiés par `tests/calculations/pension/pillar-3a-buyback.test.ts` (décision du mainteneur,
  18.10.2026). Aucun tiret n'y figure. La case sans montant devient vide, dans le composant d'affichage.
- **Les alternatives** « Adressez-vous à votre fondation ou à votre assurance 3a. » et le libellé du profil
  « Je remplis les conditions » : recopiés par des tests, et déjà conformes.

## 8. Phrases au sens juridique délicat

1. **« Il est possible pour la première fois » → « C'est une première ».** Même affirmation (2026 ouvre
   le rachat pour la première fois), détachée dans sa phrase.
2. **Hypothèse 4.** « Un seul rachat par année de lacune » devient « Une année de lacune ne se rachète
   qu'une fois » ; les deux conséquences et la référence (art. 7a al. 3) restent dans la même phrase.
3. **FAQ « Quelles conditions ».** Les trois conditions passent en trois phrases ; la conséquence d'une
   prestation de vieillesse reste dans la phrase de la condition, reliée par « car ».

## 9. Tests adaptés

- `tests/components/pillar-3a-tax-saving-page.test.ts` : FAQ 8 d'A1, « ne couvre pas encore ce rachat :
  adressez-vous… » → « ne couvre pas encore ce rachat. Adressez-vous… ». Garantie inchangée : la FAQ dit
  que le cas n'est pas couvert, renvoie à la fondation et ne cite pas A2.
- `tests/components/pillar-3a-buyback-municipality-texts.test.ts` : message de Brig-Glis réécrit. Garantie
  inchangée : commune non couverte, donnée communale non relevée, renvoi à la calculette du canton.

## 10. `npm run copy:report`

Avant :

```
## prevoyance/rachat-3a-retroactif/index.html (5)
- phrase de 38 mots : Salarié ou indépendant affilié à un 2e pilier, ayant réalisé un revenu soumis à l'AVS, …
- phrase de 41 mots : Personnes ayant déjà perçu une prestation de vieillesse du pilier 3a, …
- phrase de 42 mots : Rachat des personnes non affiliées à un 2e pilier (indépendants sans caisse de pension, …
- phrase de 44 mots : Avoir eu un revenu soumis à l'AVS l'année de la lacune et l'année du rachat ; …
- 2 deux-points : Valais : nous ne couvrons pour l'instant que les personnes seules sans enfant, …
```

Après :

```
## prevoyance/rachat-3a-retroactif/index.html (1)
- 2 deux-points : Valais : nous ne couvrons pour l'instant que les personnes seules sans enfant, …
```

Le message du Valais vient de `fr.partialCoverage`, repris avec les messages génériques.
