# Revue rédactionnelle : `/prevoyance/rachat-lpp/` (A3)

18 octobre 2026, selon `docs/editorial-style.md`. Sources : `src/calculators/pension/lpp-buyback.ts`
(définition, avertissements, tableaux) et `src/lib/display/lpp-buyback-core.ts` (case sans montant de la
trace). Textes montrés tels qu'ils s'affichent (rachat en 2026, délai de blocage de 3 ans lu dans les
données). Typographie française appliquée à toutes les chaînes, sauf aux cinq phrases visibles des
points de vigilance (§ 4).

## 1. Balises et en-tête

| Texte | Avant | Après |
| --- | --- | --- |
| `title`, H1, question | Rachat LPP 2026 : combien d'impôt économisez-vous ? ; Rachat LPP : économie d'impôt et échelonnement | *(typographie seule)* |
| Méta-description | Rachat LPP : estimez l'économie d'impôt d'un rachat dans votre caisse de pension, en une fois ou échelonné, et vérifiez le délai de blocage. | *(typographie seule)* : texte de la fiche, déjà direct, repris aussi dans « Le calcul en bref » |
| Promesse | L'impôt économisé par un rachat LPP, en une fois ou échelonné. | Ce qu’un rachat LPP vous fait économiser d’impôt, en une fois ou échelonné. |
| Ligne de périmètre | Personnes affiliées à une caisse de pension, imposées au régime ordinaire en Suisse romande, rachat en 2026. | Pour un rachat en 2026, par une personne affiliée à une caisse de pension et imposée au régime ordinaire en Suisse romande. |
| Bandeau d'exemple | personne seule à Lausanne, revenu imposable de 110’000 CHF, rachat de 30’000 CHF | une personne seule à Lausanne, avec un revenu imposable de 110’000 CHF, qui rachète 30’000 CHF |
| Rappel sous le chiffre | Le capital issu du rachat sera imposé à son retrait : cette économie n'est pas un gain net. | Le capital issu du rachat sera imposé à son retrait, cette économie n’est donc pas un gain net. |

## 2. Formulaire et carte

| Texte | Avant | Après |
| --- | --- | --- |
| Aide de la commune | Commencez à saisir le nom de la commune ; le canton en est déduit. | Tapez les premières lettres de votre commune. Le canton s’en déduit. |
| Aide des revenus imposables | Revenu imposable sans la déduction du rachat, par exemple celui de votre dernière décision de taxation. | Votre revenu imposable sans la déduction du rachat, par exemple celui de votre dernière décision de taxation. |
| Réserve | Estimation indicative, établie d'après les barèmes 2026… Elle ne constitue ni un conseil fiscal ni un conseil en prévoyance… | Ce montant est une estimation indicative, établie d’après les barèmes 2026… Il ne constitue pas un conseil fiscal ou en prévoyance… *(comme A1 et A2)* |
| Autres aides, libellés, tableaux | (potentiel, montant, versement anticipé, année de retrait, scénarios, calendrier) | *(typographie seule)* |

## 3. Points de vigilance, « En savoir plus »

| Point | Avant | Après |
| --- | --- | --- |
| Délai de blocage, 3e élément | chaque versement fait courir son propre délai : échelonner ses rachats repousse la date du premier retrait en capital possible (art. 79b al. 3 LPP) ; | chaque versement fait courir son propre délai, si bien qu’échelonner ses rachats repousse la date du premier retrait en capital possible (art. 79b al. 3 LPP) ; |
| Imposition à la sortie (43 mots) | Les prestations issues du rachat seront imposées à leur versement : en capital, séparément du reste du revenu (art. 38 LIFD ; art. 11 al. 3 LHID) ; en rente, avec le revenu de chaque année (art. 22 al. 1 LIFD ; art. 7 al. 1 LHID). L'économie affichée n'est donc pas un gain net. … | Les prestations issues du rachat seront imposées à leur versement. En capital, elles le sont séparément du reste du revenu (art. 38 LIFD ; art. 11 al. 3 LHID). En rente, elles s’ajoutent au revenu de chaque année (art. 22 al. 1 LIFD ; art. 7 al. 1 LHID). L’économie affichée n’est donc pas un gain net. … |
| Primauté des prestations | Les règles de déduction ne distinguent pas selon le mode de calcul de la caisse (…) : l'économie d'impôt affichée reste valable. En revanche, ce que le rachat change à votre rente ne se lit qu'auprès de la caisse. | Les règles de déduction ne font aucune différence selon le mode de calcul de la caisse (…). L’économie d’impôt affichée reste donc valable. Ce que le rachat change à votre rente, en revanche, ne se lit qu’auprès de la caisse. |
| Découvert de la caisse | … L'avoir racheté fait partie de votre avoir de vieillesse : les mesures d'assainissement s'y appliquent comme au reste (art. 65d LPP). Consultez son degré de couverture dans son rapport annuel avant de racheter. | … L’avoir racheté fait partie de votre avoir de vieillesse, et les mesures d’assainissement s’y appliquent comme au reste (art. 65d LPP). Consultez le degré de couverture de la caisse dans son rapport annuel avant de racheter. |
| Montant admis par la caisse | Le potentiel affiché sur le certificat peut être réduit après examen de votre situation : avoirs 3a ou de libre passage, arrivée de l'étranger, retrait anticipé pour le logement (…). | *(typographie seule)* : une phrase de 39 mots dont le deux-points annonce une vraie liste, que la couper obligerait à résumer. |

## 4. Phrases visibles des points de vigilance : inchangées

Les cinq phrases visibles sont recopiées mot pour mot, ponctuation et apostrophes comprises, par
`tests/data/calculator-examples.test.ts`, test de données. Elles gardent leur texte et leur typographie
d'origine (décision du mainteneur, 18.10.2026), et la charte n'y est pas appliquée :

1. Aucun retrait en capital du 2e pilier, quel qu'en soit le motif, dans les 3 ans qui suivent chaque rachat : sinon la déduction est refusée.
2. Le capital issu du rachat sera imposé à son retrait : l'économie affichée n'est pas un gain net.
3. L'économie d'impôt reste valable ; l'effet du rachat sur votre rente ne se lit qu'auprès de votre caisse.
4. Une caisse en découvert peut appliquer des mesures d'assainissement à l'avoir racheté : vérifiez son degré de couverture.
5. Ne versez que le montant que votre caisse vous confirme : le potentiel du certificat peut être réduit.

Chacune construit sa phrase en « X : Y », ce que la charte déconseille ; aucune ne contient de tiret.
Proposition, si vous voulez les aligner plus tard (test à mettre à jour en même temps, avec votre
accord) : « Aucun retrait en capital du 2e pilier, quel qu’en soit le motif, dans les 3 ans qui suivent
chaque rachat, sinon la déduction est refusée. » ; « L’économie affichée n’est pas un gain net, car le
capital issu du rachat sera imposé à son retrait. » ; « Ne versez que le montant que votre caisse vous
confirme, car le potentiel du certificat peut être réduit. »

## 5. Ce que ce calcul suppose

| Texte | Avant | Après |
| --- | --- | --- |
| Pour qui, 1 | … affilié à titre facultatif : c'est l'affiliation qui compte, pas le statut (art. 4 et 44 LPP). | … affilié à titre facultatif, car seule compte l’affiliation, pas le statut (art. 4 et 44 LPP). |
| Ne couvre pas, 1 | Calcul du potentiel de rachat lui-même : il dépend du règlement et de l'historique de la personne (art. 79b al. 1 LPP). | Calcul du potentiel de rachat lui-même, qui dépend du règlement et de l’historique de la personne (art. 79b al. 1 LPP). |
| Ne couvre pas, 2, alternative | Le calculateur du retrait en capital LPP/3a est en préparation ; d'ici là, voir la méthodologie. | Le calculateur du retrait en capital LPP/3a est en préparation. D’ici là, voyez la méthodologie. |
| Hypothèse 1 (98 mots dans sa dernière phrase) | … Le montant du certificat de prévoyance n'en tient pas toujours compte : faites-le confirmer par votre caisse en lui déclarant ces avoirs. Les réductions sont : l'avoir 3a qui dépasse… (art. 60a al. 2) ; les avoirs de libre passage… (art. 60a al. 3) ; les prestations de vieillesse déjà perçues… (art. 60a al. 4) ; pour une personne arrivée de l'étranger… (art. 60b). | … Faites-le confirmer par votre caisse en lui déclarant les avoirs concernés, car le montant du certificat de prévoyance n’en tient pas toujours compte. Quatre réductions s’appliquent. D’abord l’avoir 3a qui dépasse… (art. 60a al. 2). Ensuite les avoirs de libre passage… (art. 60a al. 3). Puis les prestations de vieillesse déjà perçues… (art. 60a al. 4). Enfin, pour une personne arrivée de l’étranger… (art. 60b). |
| Hypothèse 4 | … pour la part du rachat qui le dépasse ; le résultat signale cette part. | … pour la part du rachat qui le dépasse, et le résultat signale cette part. |
| Hypothèse 5 | Échelonnement : le montant est réparti… | En cas d’échelonnement, le montant est réparti… |
| Hypothèse 6 (deux tirets cadratins) | Aucun retrait en capital du 2e pilier — prestation de vieillesse, versement anticipé pour le logement, départ définitif, toutes institutions confondues — n'a lieu dans les 3 ans qui suivent chaque versement. | Aucun retrait en capital du 2e pilier n’a lieu dans les 3 ans qui suivent chaque versement, toutes institutions confondues. Cela vaut pour une prestation de vieillesse, un versement anticipé pour le logement ou un départ définitif. |
| Hypothèse 7 | Couple : une seule personne rachète. Le revenu imposable saisi est celui du ménage. | Pour un couple, une seule personne rachète, et le revenu imposable saisi est celui du ménage. |

## 6. Questions fréquentes

| Question | Avant | Après |
| --- | --- | --- |
| Où trouver mon potentiel de rachat ? | … Le montant du certificat ne tient pas toujours compte de vos avoirs 3a et de libre passage : faites-le confirmer par votre caisse en les lui déclarant. | … Comme le montant du certificat ne tient pas toujours compte de vos avoirs 3a et de libre passage, faites-le confirmer par votre caisse en les lui déclarant. |
| Et si ma caisse est en découvert ? | L'avoir racheté fait partie de votre avoir de vieillesse : les mesures d'assainissement s'y appliquent comme au reste (art. 65d LPP). … | L’avoir racheté fait partie de votre avoir de vieillesse, et les mesures d’assainissement s’y appliquent comme au reste (art. 65d LPP). … |
| Les sept autres | (sept réponses) | *(typographie seule)* |

## 7. Phrases au sens juridique délicat

1. **« Quatre réductions s'appliquent ».** L'original disait « Les réductions sont : » suivi de quatre
   éléments, sans les compter. Je lis la liste comme complète (art. 60a al. 2 à 4 et 60b OPP 2) ; si elle
   ne l'est pas, je propose « Les réductions sont les suivantes. » à la place.
2. **FAQ « J'ai un 3a ou un compte de libre passage » (44 mots).** Laissée en une phrase : le test du
   composant exige que « 24 ans » et sa référence (art. 60a al. 2 et 3 OPP 2) restent dans la même
   phrase, et c'est juste, car la réduction et la condition d'âge vont ensemble.
3. **Montant admis par la caisse (39 mots)**, laissé tel quel (§ 3).

## 8. Tests adaptés

`tests/components/lpp-buyback-page.test.ts` : méta-description (typographie seule) ; alternative de
l'imposition à la sortie (« ; d'ici là, voir » → « . D’ici là, voyez ») ; alternative de l'imposition à
la source (apostrophe). Garantie inchangée : texte de la fiche, six cas non couverts avec leurs
alternatives.

## 9. `npm run copy:report`

Avant :

```
## prevoyance/rachat-lpp/index.html (6)
- phrase de 43 mots : Les prestations issues du rachat seront imposées à leur versement : en capital, …
- phrase de 39 mots : Le potentiel affiché sur le certificat peut être réduit après examen de votre situation : …
- phrase de 98 mots : Les réductions sont : l'avoir 3a qui dépasse la somme des petites cotisations déductibles …
- phrase de 44 mots : La part de votre 3a qui dépasse la somme des versements maximaux déductibles depuis vos 24 ans, …
- 2 deux-points : Valais : nous ne couvrons pour l'instant que les personnes seules sans enfant, …
- 2 deux-points : Le potentiel saisi doit tenir compte des réductions prévues par l'OPP 2. …
```

Après :

```
## prevoyance/rachat-lpp/index.html (3)
- phrase de 39 mots : Le potentiel affiché sur le certificat peut être réduit après examen de votre situation : …
- phrase de 44 mots : La part de votre 3a qui dépasse la somme des versements maximaux déductibles depuis vos 24 ans, …
- 2 deux-points : Valais : nous ne couvrons pour l'instant que les personnes seules sans enfant, …
```

Garde-fou : 4 tirets cadratins avant (2 dans l'hypothèse 6, 2 dans les cases sans montant de la trace),
0 après ; la page quitte `PENDING_PAGES`.
