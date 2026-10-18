# Revue rédactionnelle : `/prevoyance/economie-impot-3a/` (A2, page pilote)

18 octobre 2026. Réécriture de forme selon `docs/editorial-style.md` ; aucun chiffre, aucune condition ni
référence légale ajoutée ou retirée. Les textes sont montrés tels qu'ils s'affichent (année 2026,
montants formatés au build). La typographie française (apostrophe ’, espace fine avant « : ; ? »,
insécables dans les guillemets) s'applique à toutes les chaînes d'A2 ; elle n'est signalée ci-dessous
que lorsqu'elle est le seul changement.

Sources : `src/calculators/pension/pillar-3a-tax-saving.ts` (définition), `src/lib/calculations/pension/pillar-3a-tax-saving-labels.ts`
(deux motifs de refus affichés dans la carte), `src/lib/display/pillar-3a-tax-saving.ts` (cellule sans
montant de la trace).

## 1. Balises et en-tête

| Texte | Avant | Après |
| --- | --- | --- |
| `title` (53 c.) | Versement 3a 2026 : combien d'impôt économisez-vous ? | Versement 3a 2026 : combien d’impôt économisez-vous ? *(typographie seule)* |
| Méta-description | Calculez l'impôt économisé grâce à votre versement au pilier 3a dans votre commune romande, selon votre affiliation à un 2e pilier. (131 c.) | Combien d’impôt votre versement au pilier 3a vous fait-il économiser ? Votre impôt est calculé avant et après la déduction, dans votre commune romande. (151 c.) |
| H1 | Économie d'impôt d'un versement 3a | Économie d’impôt d’un versement 3a *(typographie seule)* |
| Question (carte de l'accueil) | Combien d'impôt votre versement 3a vous fait-il économiser ? | Combien d’impôt votre versement 3a vous fait-il économiser ? *(typographie seule)* |
| Promesse | L'impôt économisé par votre versement au pilier 3a. | Ce que votre versement au pilier 3a vous fait économiser d’impôt, dans votre commune. |
| Ligne de périmètre | Personnes avec un revenu soumis à l'AVS, imposées au régime ordinaire en Suisse romande, versement en 2026. | Pour un versement en 2026, par une personne qui a un revenu soumis à l’AVS et qui est imposée au régime ordinaire en Suisse romande. |
| Bandeau d'exemple | Exemple : personne seule à Lausanne, avec caisse de pension, revenu imposable de 70’000 CHF, versement maximal — remplacez par vos chiffres, ou partez de votre salaire brut. | Exemple : une personne seule à Lausanne, affiliée à une caisse de pension, qui verse le maximum sur un revenu imposable de 70’000 CHF. Remplacez par vos chiffres, ou partez de votre salaire brut. |

Mot-clé principal conservé : « impôt » et « versement 3a » dans le `title`, le H1 et la description.

## 2. Formulaire

| Texte | Avant | Après |
| --- | --- | --- |
| Aide de la commune | Commencez à saisir le nom de la commune ; le canton en est déduit. | Tapez les premières lettres de votre commune. Le canton s’en déduit. |
| Aide des revenus imposables | Partez du revenu imposable de votre dernière décision de taxation et ajoutez-y la déduction 3a qui y figure, s'il y en a une : le calcul porte sur le revenu avant cette déduction. | Reprenez le revenu imposable de votre dernière décision de taxation et rajoutez-y la déduction 3a qui y figure, s’il y en a une. Le calcul part du revenu avant cette déduction. |
| Aide « revenu soumis à l'AVS » | Salaire, revenu d'indépendant ou revenu de remplacement, comme les indemnités de chômage. | Un salaire, un revenu d’indépendant ou un revenu de remplacement, comme les indemnités de chômage. |
| Aide « affilié » | Affilié à une caisse de pension, à titre obligatoire ou facultatif. Après l'âge de référence, une personne qui touche une rente de sa caisse et n'y est plus assurée n'est plus affiliée ; si elle y reste assurée, même sans cotiser, elle l'est encore. | Oui si vous êtes affilié à une caisse de pension, à titre obligatoire ou facultatif. Après l’âge de référence, une personne qui touche une rente de sa caisse sans y être encore assurée n’est plus affiliée. Celle qui y reste assurée l’est toujours, même si elle ne cotise plus. |
| Aide « revenu de l'activité lucrative » | Seulement sans caisse de pension. Salarié : salaire brut moins les cotisations AVS, AI, APG et AC. Indépendant : résultat après rectifications fiscales, moins les cotisations AVS, AI et APG. | À remplir seulement sans caisse de pension. Pour un salarié, c’est le salaire brut moins les cotisations AVS, AI, APG et AC. Pour un indépendant, le résultat après rectifications fiscales, moins les cotisations AVS, AI et APG. |
| Questions, profils, conditions, libellés | (onze questions, quatre profils, quatre conditions) | Inchangés sur le fond, *typographie seule* : elles étaient déjà courtes et directes. |

## 3. Carte résultat et messages

| Texte | Avant | Après |
| --- | --- | --- |
| Rappel sous le chiffre | Le capital 3a sera imposé à son retrait : cette économie n'est pas un gain net. | Le capital 3a sera imposé à son retrait, cette économie n’est donc pas un gain net. |
| Réserve sous la carte | Estimation indicative, établie d'après les barèmes 2026 et vos saisies. Elle ne constitue ni un conseil fiscal ni un conseil en prévoyance, et ne remplace pas votre décision de taxation. | Ce montant est une estimation indicative, établie d’après les barèmes 2026 et vos saisies. Il ne constitue pas un conseil fiscal ou en prévoyance, et ne remplace pas votre décision de taxation. |
| Excédent (avertissement) | Attention : 2’000 CHF versés au-delà du plafond ne sont pas déductibles ; votre fondation doit vous les rembourser (circulaire AFC n° 18a, ch. 9.1). | Attention : Les 2’000 CHF versés au-delà du plafond ne sont pas déductibles, et votre fondation doit vous les rembourser (circulaire AFC n° 18a, ch. 9.1). |
| Refus, sans revenu AVS | Aucun revenu soumis à l'AVS cette année : aucune cotisation 3a n'est déductible (circulaire AFC n° 18a, ch. 3 et 5.1). | Sans revenu soumis à l’AVS cette année, aucune cotisation 3a n’est déductible (circulaire AFC n° 18a, ch. 3 et 5.1). |
| Refus, après l'âge de référence | Âge de référence atteint, sans activité lucrative ou depuis cinq ans ou plus : aucune cotisation 3a n'est déductible (art. 7 al. 3 OPP 3). | L’âge de référence est atteint, sans activité lucrative ou depuis cinq ans ou plus. Aucune cotisation 3a n’est donc déductible (art. 7 al. 3 OPP 3). |
| Revenu d'activité manquant | Indiquez le revenu de l'activité lucrative de chaque personne sans caisse de pension. | Indiquez le revenu de l’activité lucrative de chaque personne sans caisse de pension. *(typographie seule)* |
| Libellé du résultat | Économie d'impôt | Économie d’impôt *(typographie seule)* |
| Mentions courtes de la barre mobile | Aucune déduction, voir le message ; Revenu à préciser, voir le message | Inchangées |

## 4. Points de vigilance

| Texte | Avant | Après |
| --- | --- | --- |
| Point 1, phrase visible | Attention : Le capital 3a sera imposé à son retrait : l'économie affichée n'est pas un gain net. | Attention : L’économie affichée n’est pas un gain net, car le capital 3a sera imposé à son retrait. |
| Point 1, « En savoir plus » | Le capital 3a sera imposé à son retrait, séparément de vos autres revenus et à taux réduit : l'économie affichée n'en tient pas compte. Le calculateur du retrait en capital LPP/3a est en préparation. | Le capital 3a sera imposé à son retrait, séparément de vos autres revenus et à taux réduit. L’économie affichée n’en tient pas compte. Le calculateur du retrait en capital LPP/3a est en préparation. |
| Point 2 | Pour être déductible en 2026, le versement doit être crédité sur votre compte ou votre police 3a au plus tard le 31 décembre (circulaire AFC n° 18a, ch. 5.1). | Inchangé *(typographie seule)* : la date vient des données. |
| Point 3 | L'année où vous cessez votre activité lucrative, la cotisation entière reste déductible, à condition d'être versée avant la fin de l'activité (art. 7 al. 4 OPP 3). | Si vous cessez votre activité lucrative en cours d’année, la cotisation entière reste déductible, pourvu qu’elle soit versée avant la fin de l’activité (art. 7 al. 4 OPP 3). |

## 5. Ce que ce calcul suppose

| Texte | Avant | Après |
| --- | --- | --- |
| Pour qui | Personne domiciliée dans un canton romand, imposée au régime ordinaire, qui réalise un revenu soumis à l'AVS (salaire, revenu d'indépendant ou revenu de remplacement comme les indemnités de chômage) et veut connaître l'économie d'impôt de sa cotisation 3a ordinaire. | Une personne domiciliée dans un canton romand et imposée au régime ordinaire, qui veut connaître l’économie d’impôt de sa cotisation 3a ordinaire. Elle doit avoir un revenu soumis à l’AVS, qu’il s’agisse d’un salaire, d’un revenu d’indépendant ou d’un revenu de remplacement comme les indemnités de chômage. |
| Ne couvre pas, 1 | Le rachat de lacunes des personnes affiliées à un 2e pilier. — Rachat rétroactif du pilier 3a | Le rachat de lacunes, pour les personnes affiliées à un 2e pilier. *(alternative sur sa propre ligne)* Rachat rétroactif du pilier 3a |
| Ne couvre pas, 2 | Le rachat de lacunes des personnes non affiliées à un 2e pilier. — Adressez-vous… | Le rachat de lacunes, pour les personnes qui ne sont pas affiliées à un 2e pilier. Adressez-vous à votre fondation ou à votre assurance 3a. |
| Ne couvre pas, 3 | L'imposition du capital à son retrait. — Elle est rappelée dans chaque résultat ; le calculateur du retrait en capital LPP/3a est en préparation. | L’imposition du capital à son retrait. Chaque résultat la rappelle. Le calculateur du retrait en capital LPP/3a est en préparation. |
| Ne couvre pas, 4 et 5 | … — Adressez-vous… | Tiret retiré, *typographie seule* |
| Ne couvre pas, 7 | Le rendement du placement, la comparaison entre banque et assurance. — Ce calculateur ne compare pas les placements. | Le rendement du placement, et le choix entre une banque et une assurance. Ce calculateur ne compare pas les placements. |
| Hypothèse 3 | Barèmes et plafonds de l'année de calcul, 2026. | Les barèmes et les plafonds sont ceux de 2026, l’année de calcul. |
| Hypothèse 4 | L'économie est la différence entre l'impôt total (canton, commune et Confédération) avant et après la déduction, retranchée des deux revenus imposables ; jamais un taux marginal multiplié par le versement. | L’économie est la différence entre l’impôt total (canton, commune et Confédération) avant et après la déduction, retranchée des deux revenus imposables. Elle ne s’obtient jamais en multipliant le versement par un taux marginal. |
| Hypothèse 5 | Pour un couple marié ou lié par un partenariat enregistré, chacun a sa propre déduction, selon sa propre affiliation (art. 7 al. 2 OPP 3) et ses propres conditions : revenu soumis à l'AVS (circulaire AFC n° 18a, ch. 3), âge de référence (art. 7 al. 3 OPP 3). Celui qui ne les remplit pas n'a pas de déduction ; l'autre garde la sienne. L'économie porte sur leur somme. | Dans un couple marié ou lié par un partenariat enregistré, chacun a sa propre déduction, qui dépend de sa propre affiliation (art. 7 al. 2 OPP 3). Chacun doit aussi remplir ses propres conditions, à savoir un revenu soumis à l’AVS (circulaire AFC n° 18a, ch. 3) et la condition d’âge de référence (art. 7 al. 3 OPP 3). Celui qui ne les remplit pas n’a pas de déduction, et l’autre garde la sienne. L’économie porte sur la somme des deux. |
| Le calcul en bref, § 1 | Votre versement au pilier 3a se déduit de votre revenu imposable, pour l'impôt fédéral comme pour l'impôt cantonal et communal. Le plafond dépend de votre affiliation à un 2e pilier, pas de votre statut : affilié à une caisse de pension, vous déduisez au plus la « petite » cotisation, 7’258 CHF en 2026 ; sans caisse de pension, 20 % du revenu de votre activité lucrative, au plus 36’288 CHF. | Votre versement au pilier 3a se déduit de votre revenu imposable, pour l’impôt fédéral direct comme pour l’impôt cantonal et communal. Le plafond dépend de votre affiliation à un 2e pilier, et non de votre statut. Avec une caisse de pension, vous déduisez au plus la « petite » cotisation, soit 7’258 CHF en 2026. Sans caisse de pension, la limite passe à 20 % du revenu de votre activité lucrative, avec un maximum de 36’288 CHF. |
| Le calcul en bref, § 2 | Ce calculateur calcule votre impôt deux fois, avant et après la déduction, et affiche la différence exacte, étape par étape. | Votre impôt est calculé deux fois, sans la déduction puis avec elle. L’économie affichée est la différence entre ces deux impôts, et chaque étape figure dans le détail du calcul. |

## 6. Questions fréquentes

| Question | Avant | Après |
| --- | --- | --- |
| Quel montant puis-je déduire de mes impôts ? | Affilié à une caisse de pension, à titre obligatoire ou facultatif : au plus la « petite » cotisation, 7’258 CHF en 2026. Sans caisse de pension : 20 % du revenu de votre activité lucrative, au plus 36’288 CHF. C'est l'affiliation qui compte, pas le statut de salarié ou d'indépendant (art. 7 al. 1 OPP 3). | Avec une caisse de pension, à titre obligatoire ou facultatif, vous déduisez au plus la « petite » cotisation, soit 7’258 CHF en 2026. Sans caisse de pension, le plafond est de 20 % du revenu de votre activité lucrative, avec un maximum de 36’288 CHF. Seule l’affiliation compte : être salarié ou indépendant n’y change rien (art. 7 al. 1 OPP 3). |
| Je touche une rente de ma caisse de pension : suis-je encore affilié au 2e pilier ? | Si vous n'y êtes plus assuré, non : votre plafond est alors celui des personnes sans caisse de pension. Si vous y restez assuré, même sans cotiser, vous l'êtes encore (circulaire AFC n° 18a, ch. 5.7 f). | Non, si vous n’y êtes plus assuré. Votre plafond devient alors celui des personnes sans caisse de pension. Si vous y restez assuré, même sans cotiser, vous êtes toujours affilié (circulaire AFC n° 18a, ch. 5.7 f). |
| Que se passe-t-il si j'ai versé plus que le plafond ? | L'excédent n'est pas déductible : le calculateur ramène le montant au plafond, et votre fondation doit vous rembourser la différence (circulaire AFC n° 18a, ch. 9.1). | L’excédent n’est pas déductible, et votre fondation doit vous le rembourser (circulaire AFC n° 18a, ch. 9.1). Le calculateur ramène donc le montant au plafond. |
| Jusqu'à quand puis-je verser des fonds sur mon pilier 3a ? | … au plus tard le 31 décembre (circulaire AFC n° 18a, ch. 5.1). L'année où vous cessez votre activité lucrative, la cotisation entière reste déductible, à condition d'être versée avant la fin de l'activité (art. 7 al. 4 OPP 3 ; ch. 5.7 e). | … au plus tard le 31 décembre (circulaire AFC n° 18a, ch. 5.1). L’année où vous cessez votre activité lucrative, vous pouvez encore déduire la cotisation entière, à condition de la verser avant la fin de l’activité (art. 7 al. 4 OPP 3 ; ch. 5.7 e). |
| Puis-je encore cotiser au pilier 3a après l'âge de référence AVS ? | Oui, si vous exercez encore une activité lucrative, et au plus pendant cinq ans après l'âge de référence (art. 7 al. 3 OPP 3). L'activité doit être prouvée chaque année. | Oui, tant que vous exercez une activité lucrative, et pendant cinq ans au plus après l’âge de référence (art. 7 al. 3 OPP 3). Vous devrez prouver cette activité chaque année. |
| Pourquoi ne pas simplement multiplier mon versement par mon taux marginal ? | Parce que la déduction peut faire changer de tranche de barème. Le calculateur calcule votre impôt deux fois, avant et après la déduction, et affiche la différence exacte. | Parce que la déduction peut faire passer votre revenu dans une autre tranche du barème, ce qu’un taux marginal ne voit pas. Le calculateur établit donc votre impôt deux fois, avant et après la déduction, et affiche la différence. |

## 7. Éléments partagés corrigés pour la ponctuation seulement

Ils s'affichent sur A2 ; sans eux, la page ne passait pas le garde-fou. Leur ton sera repris avec leur
famille.

| Élément | Avant | Après | Autres pages touchées |
| --- | --- | --- | --- |
| Bandeau d'exemple (`CalculatorShell`, `fr.calculator.exampleReplace`) | « <exemple> — remplacez par vos chiffres, » | « <exemple>. Remplacez par vos chiffres, » | A1, A3, démonstration |
| Alternative d'un cas non couvert (`ScopeNotice`) | « <cas> — <alternative> » | l'alternative passe sur sa propre ligne | A1, A3, démonstrations |
| `aria-label` du logo (`fr.header.homeLabel`) | calculateurs.ch — accueil | Accueil de calculateurs.ch | toutes |
| Cellule sans montant de la trace d'A2 | — | case vide | aucune |

`docs/design-system.md` (§ 1.5, § 4.2, § 4.7) reprend les deux libellés imposés.

## 8. Ce qui n'a pas changé, et pourquoi

- **La trace du calcul** (« Voir le calcul ligne par ligne ») garde ses libellés, apostrophes droites et
  deux-points compris. `tests/calculations/pension/pillar-3a-tax-saving.test.ts` en recopie plusieurs en
  dur (« Revenu de l'activité lucrative », « Montant déductible retenu », « excédent de 2’000 CHF n'est
  pas déductible et doit être remboursé par la fondation », le gabarit « Vous : … Votre conjoint ou
  partenaire : … ») : R7 interdit de toucher ce test. Seuls les deux motifs de refus, que le test lit
  par leur constante, ont été réécrits.
- **La question « Jusqu'à quand… »** garde son apostrophe droite : `tests/data/contribution-deadline.test.ts`
  la cherche par ce début, et c'est un test de données.
- **Les messages partagés avec A1 et A3** (`fr.ts` : couverture du Valais, traduction du résultat
  « soit 26 % de votre versement », préfixe « Attention : », « Valais : couverture partielle. ») seront
  repris avec la famille « 404 et messages génériques ».
- **La formule d'attribution de l'AFC**, intacte.

## 9. Phrases au sens juridique délicat

1. **Année de cessation de l'activité.** « L'année où vous cessez votre activité lucrative » devient,
   dans le point de vigilance, « Si vous cessez votre activité lucrative en cours d'année ». J'y lis la
   même règle (art. 7 al. 4 OPP 3) ; la FAQ garde la tournure d'origine. À confirmer.
2. **Condition d'âge.** Dans l'hypothèse du couple, « âge de référence (art. 7 al. 3 OPP 3) » devient
   « la condition d'âge de référence » : la condition est celle des deux branches (âge non atteint, ou
   activité poursuivie depuis moins de cinq ans), que le mot seul ne disait pas mieux.
3. **Excédent.** La phrase mêlait deux affirmations juridiques (non déductible, remboursement) et le
   comportement du calculateur, sous une seule référence (ch. 9.1). Les deux affirmations restent
   ensemble devant la référence ; le calculateur passe dans la phrase suivante.
4. **« Différence exacte ».** L'adjectif disparaît (§ 2 du « calcul en bref » et FAQ 6) : il opposait la
   méthode au taux marginal, opposition que la FAQ 6 dit déjà, et « exact » sonne mal sur un résultat
   qui reste une estimation indicative. Si vous tenez au contraste, je propose « la différence entre les deux impôts, pas une
   approximation ».

## 10. `npm run copy:report`, page A2

Avant :

```
## prevoyance/economie-impot-3a/index.html (5)
- phrase de 39 mots : Personne domiciliée dans un canton romand, imposée au régime ordinaire, qui réalise un revenu soumis à l'AVS (salaire, revenu d'indépendant ou revenu de rempla…
- phrase de 48 mots : Pour un couple marié ou lié par un partenariat enregistré, chacun a sa propre déduction, selon sa propre affiliation (art. 7 al. 2 OPP 3) et ses propres condit…
- phrase de 46 mots : Le plafond dépend de votre affiliation à un 2e pilier, pas de votre statut : affilié à une caisse de pension, vous déduisez au plus la « petite » cotisation, 7…
- 2 deux-points : Valais : nous ne couvrons pour l'instant que les personnes seules sans enfant, dans les communes suivantes : Sion. Pour les autres situations, utilisez la calc…
- 2 deux-points : Affilié à une caisse de pension, à titre obligatoire ou facultatif : au plus la « petite » cotisation, 7’258 CHF en 2026. Sans caisse de pension : 20 % du reve…
```

Après :

```
## prevoyance/economie-impot-3a/index.html (1)
- 2 deux-points : Valais : nous ne couvrons pour l'instant que les personnes seules sans enfant, dans les communes suivantes : Sion. Pour les autres situations, utilisez la calc…
```

Le signalement restant vient de `fr.partialCoverage` (partagé, § 8).

Garde-fou (`tests/content/editorial.test.ts`) : 12 tirets cadratins avant (2 dans l'`aria-label` du
logo, 1 dans le bandeau, 2 dans la trace, 7 dans les cas non couverts), 0 après.
