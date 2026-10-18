# Revue rédactionnelle : `/methodologie/` et `/donnees/`

18 octobre 2026, selon `docs/editorial-style.md`. Sources : `src/pages/methodologie.astro` (texte rédigé,
en dur dans le gabarit), `src/pages/donnees.astro`, `src/i18n/fr.ts` (`dataPage`) et `src/data/sources.ts`
(noms et références légales du registre, affichés sur les deux pages).

**La méthodologie est le texte d'engagement du mainteneur** (`CLAUDE.md` § 1.4). Seule la forme
change ; chaque engagement reste, mot pour mot quand il porte un délai ou un chiffre : correction sous
48 heures, tolérance de 1 % avec plancher d'un franc, demi-point sur la pente, douze mois de fraîcheur,
rituel du 1er janvier, dix-huit cas de niveau et sept cas différentiels. Typographie française
appliquée à tout le texte du gabarit.

## 1. `/methodologie/`

| Passage | Avant | Après |
| --- | --- | --- |
| `title` | Méthodologie — calculateurs.ch | Méthodologie · calculateurs.ch |
| Chapeau, 2e paragraphe | Le code et les données sont publics sur GitHub — vous pouvez y vérifier vous-même chaque valeur et chaque formule. | Le code et les données sont publics sur GitHub, où vous pouvez vérifier vous-même chaque valeur et chaque formule. |
| D'où viennent les chiffres, § 1 | Aucune valeur chiffrée — barème, plafond, taux, seuil, coût de référence, tarif — n'est écrite en dur dans le code du site. | Aucune valeur chiffrée n’est écrite en dur dans le code du site, qu’il s’agisse d’un barème, d’un plafond, d’un taux, d’un seuil, d’un coût de référence ou d’un tarif. |
| § 2 (trois deux-points, deux tirets) | … L'outil qui a servi à la relever — un module de téléchargement, une notice d'administration — est noté à part, comme outil de collecte : il n'est jamais la source. … Une valeur est toujours relevée à sa source : on ne la déduit pas, … reste bloqué jusqu'à ce qu'elle soit relevée — il n'est jamais publié avec un chiffre approché. | Coupé en deux paragraphes. « L’outil qui a servi à la relever, module de téléchargement ou notice d’administration, est noté à part comme outil de collecte, et il n’est jamais la source. » puis « Une valeur est toujours relevée à sa source. On ne la déduit pas, … reste bloqué jusqu’à ce qu’elle soit relevée, et il n’est jamais publié avec un chiffre approché. » |
| § 3 (40 mots, deux deux-points) | … de l'Administration fédérale des contributions (AFC), dont l'AFC autorise la réutilisation à condition d'en citer la source et sans garantie. Les résultats du calculateur de l'AFC, eux, ne sont jamais reproduits : ils servent uniquement à vérifier nos calculs. | … de l’Administration fédérale des contributions (AFC). L’AFC en autorise la réutilisation, à condition d’en citer la source et sans garantie. Les résultats de son calculateur, eux, ne sont jamais reproduits et servent uniquement à vérifier nos calculs. |
| § 5 (données compilées) | … fournisseur par fournisseur — subventions à la rénovation, tarifs de reprise de l'électricité solaire. Elles ne sont pas publiées sous forme brute : seuls les résultats… Leur existence n'est pas cachée pour autant : la page Données et sources en donnera l'inventaire — nature, couverture et date de mise à jour, jamais les valeurs — dès qu'un calculateur les utilisera. | … fournisseur par fournisseur, comme les subventions à la rénovation ou les tarifs de reprise de l’électricité solaire. Elles ne sont pas publiées sous forme brute, et seuls les résultats… Leur existence n’est pas cachée pour autant. La page Données et sources en donnera l’inventaire (nature, couverture et date de mise à jour, jamais les valeurs) dès qu’un calculateur les utilisera. |
| Vérification, liste | dix-huit cas de niveau, trois par canton romand — deux personnes seules sans enfant et un couple marié avec un enfant —, qui comparent… | dix-huit cas de niveau, trois par canton romand (deux personnes seules sans enfant et un couple marié avec un enfant), qui comparent… |
| Vérification, tolérances (46 mots) | … plancher d'un franc ; la taxe personnelle… Sur la pente — l'impôt supplémentaire pour 1’000 francs de revenu imposable —, elle est d'un demi-point. Ces cas sont rejoués… avant chaque publication : nous lançons… La publication rejoue la suite de tests complète… | … plancher d’un franc. La taxe personnelle et l’impôt paroissial, eux, doivent être identiques. Sur la pente, c’est-à-dire l’impôt supplémentaire pour 1’000 francs de revenu imposable, la tolérance est d’un demi-point. Ces cas sont rejoués… avant chaque publication. Nous lançons… La publication elle-même rejoue la suite complète… |
| Valais (40 mots) | … monoparentales ; il ne calcule donc que… | … monoparentales. Il ne calcule donc que… |
| Trois étages | Les arrondis officiels sont reproduits — certaines étapes arrondissent le revenu à la centaine de francs inférieure — et chaque arrondi apparaît dans le détail du calcul. | Les arrondis officiels sont reproduits, et chaque arrondi apparaît dans le détail du calcul. Certaines étapes arrondissent ainsi le revenu à la centaine de francs inférieure. |
| Quotient familial vaudois (57 mots) | … qui dépend de toute la famille — 1 pour une personne seule, … plus 0,5 par enfant ; le taux lu sur ce quotient… | … qui dépend de toute la famille (1 pour une personne seule, … plus 0,5 par enfant). Le taux lu sur ce quotient… |
| Estimation depuis le salaire brut (39 mots) | Du salaire, on retranche les cotisations AVS, AI et APG, puis celles de l'assurance-chômage…, puis la cotisation à la prévoyance professionnelle : c'est le revenu net du travail. | Du salaire, on retranche d’abord les cotisations AVS, AI et APG. Viennent ensuite celles de l’assurance-chômage…, puis la cotisation à la prévoyance professionnelle. Ce qui reste est le revenu net du travail. |
| Ce qui relève d'une hypothèse (quatre deux-points, 52 mots) | La cotisation LPP figure sur votre fiche de salaire : reportez-la. Par défaut, le calcul retient le minimum légal, la moitié… (au-delà de 90’720 CHF) : le salaire coordonné légal s'arrête là… Les primes d'assurance maladie et accidents valent par défaut la prime moyenne…, fixée par le Département fédéral de l'intérieur, par adulte et par enfant (région de primes 1…) : remplacez-la par le montant de vos polices. La prime de l'assurance-accidents non professionnelle est nulle par défaut : reportez le taux… | Reportez la cotisation LPP de votre fiche de salaire. Par défaut, le calcul retient le minimum légal, soit la moitié… (au-delà de 90’720 CHF), car le salaire coordonné légal s’arrête là… Les primes d’assurance maladie et accidents valent par défaut la prime moyenne…, accident comprise. Cette prime, fixée par le Département fédéral de l’intérieur, s’entend par adulte et par enfant (région de primes 1…). Remplacez-la par le montant de vos polices. La prime de l’assurance-accidents non professionnelle est nulle par défaut ; reportez le taux… |
| Rachat 3a, économie (40 mots) | … montant du rachat : une déduction de plusieurs milliers de francs peut franchir… | … montant du rachat. Une déduction de plusieurs milliers de francs peut franchir… |
| Versement 3a, plafond | Ce qui fixe le plafond de la déduction, c'est l'affiliation à un 2e pilier, pas le statut de salarié ou d'indépendant (art. 7 al. 1 OPP 3). … Après l'âge de référence, une personne qui touche une rente de sa caisse et n'y est plus assurée n'est plus affiliée ; si elle y reste assurée, même sans cotiser, elle l'est encore (ch. 5.7 f). Un montant versé au-delà du plafond est ramené au plafond : l'excédent n'est pas déductible et doit être remboursé par la fondation (ch. 9.1). | Le statut de salarié ou d’indépendant ne joue aucun rôle ; seule compte l’affiliation à un 2e pilier (art. 7 al. 1 OPP 3). … Après l’âge de référence, une personne qui touche une rente de sa caisse n’est plus affiliée si elle n’y est plus assurée, et l’est toujours si elle y reste assurée, même sans cotiser (ch. 5.7 f). L’excédent versé au-delà du plafond n’est pas déductible et doit être remboursé par la fondation (ch. 9.1). Le calculateur ne retient donc que le plafond. |
| Revenu de l'activité lucrative (48 mots) | … ch. 5.5 : pour un salarié, le salaire brut moins… ; pour un indépendant, le résultat… | … ch. 5.5. Pour un salarié, il s’agit du salaire brut moins… Pour un indépendant, du résultat… |
| Conditions personnelles (49 mots) | … (art. 7 al. 2 OPP 3) : celui qui ne les remplit pas… | … (art. 7 al. 2 OPP 3). Celui qui ne les remplit pas… |
| Même calcul que pour le rachat | … diminués de la déduction ; jamais un taux marginal multiplié par le versement. | … diminués de la déduction, et jamais un taux marginal multiplié par le versement. |
| Ce que le calculateur ne couvre pas (94 mots, cinq points-virgules) | une phrase de six éléments | « Six cas restent hors de son champ. » suivi d'une liste à puces, un cas par ligne, mots inchangés |
| Rachat LPP, ce que calcule le calculateur (67 mots) | … affiliée à titre facultatif : c'est l'affiliation qui compte, pas le statut (art. 4 et 44 LPP). … Le montant du certificat de prévoyance n'en tient pas toujours compte : il se fait confirmer… Le calcul est refusé, avec son motif, si le montant envisagé dépasse le potentiel (art. 79b al. 1 LPP), ou si un versement anticipé… n'est pas remboursé (art. 79b al. 3 LPP) ; le règlement de la caisse peut admettre une exception… | … affiliée à titre facultatif, car seule compte l’affiliation, pas le statut (art. 4 et 44 LPP). … Comme le montant du certificat de prévoyance n’en tient pas toujours compte, il se fait confirmer… Le calcul est refusé, avec son motif, dans deux cas : le montant envisagé dépasse le potentiel (art. 79b al. 1 LPP), ou un versement anticipé… n’est pas remboursé (art. 79b al. 3 LPP). Dans ce second cas, le règlement de la caisse peut admettre une exception… |
| Économie par différence | … qui le dépasse ; le résultat signale cette part. | … qui le dépasse, et le résultat signale cette part. |
| Délai de blocage (57 mots) | Si une année de retrait est saisie, chaque tranche est classée : compatible si au moins 4 années… ; à vérifier jour pour jour si… ; dans le délai s'il est de 2 années ou moins, et la déduction de cette tranche serait alors refusée (ATF…). | Si une année de retrait est saisie, chaque tranche reçoit une classe. Elle est compatible si au moins 4 années…, à vérifier jour pour jour si…, et dans le délai s’il est de 2 années ou moins. Dans ce dernier cas, la déduction de cette tranche serait refusée (ATF…). |
| Primauté des prestations | … (art. 33 al. 1 let. d LIFD ; art. 9 al. 2 let. d LHID) : l'économie d'impôt affichée reste valable. En revanche, ce que le rachat change à la rente… | … (…). L’économie d’impôt affichée reste donc valable. Ce que le rachat change à la rente, en revanche, … *(comme A3)* |
| Point mort (43 mots) | Les prestations issues du rachat seront imposées à leur versement : en capital, … ; en rente, … | Trois phrases *(comme A3)* |
| Listes des sources | <nom>, <référence> — vérifiée le 28.09.2026 | <nom>, <référence>, vérifiée le 28.09.2026 |
| Niveaux d'avertissement | Niveau 1 — avertissement général du site ; Niveau 2 — … ; Niveau 3 — … | Niveau 1 : avertissement général du site ; Niveau 2 : … ; Niveau 3 : … |
| Niveau 2 | … ce qu'il ne couvre pas — avec un lien vers une alternative — et les hypothèses qu'il retient. | … ce qu’il ne couvre pas, avec un lien vers une alternative, et les hypothèses qu’il retient. |
| Niveau 3 | … difficilement réversible — un retrait en capital du 2e pilier, par exemple — un encart distinct… | … difficilement réversible, comme un retrait en capital du 2e pilier, un encart distinct… |

## 2. `/donnees/`

| Texte | Avant | Après |
| --- | --- | --- |
| `title` | Données et sources — calculateurs.ch | Données et sources · calculateurs.ch |
| Chapeau | … Cette page est générée depuis la couche de données : elle ne peut pas mentir sur son propre état. | … Cette page est générée depuis la couche de données, si bien qu’elle ne peut pas mentir sur son propre état. |
| Sources des règles | Ces sources fondent une règle de calcul — un plafond, une condition, une méthode — sans fournir de valeur chiffrée : elles ne figurent donc pas dans le tableau ci-dessus. | Ces sources fondent une règle de calcul, qu’il s’agisse d’un plafond, d’une condition ou d’une méthode, sans fournir de valeur chiffrée. Elles ne figurent donc pas dans le tableau ci-dessus. |
| Outils de collecte | Ces outils ont servi à relever les valeurs ; la source juridique de chacune reste… | Ces outils ont servi à relever les valeurs, mais la source juridique de chacune reste… |
| Détail communal | … ne sont pas listés ligne par ligne ici — ce tableau reste lisible quel que soit le nombre de communes. | … ne sont pas listés ligne par ligne ici, pour que ce tableau reste lisible quel que soit le nombre de communes. |
| Réserve sur l'unité | Les coefficients sont repris tels que reçus de l'AFC ; leur unité (…) reste à confirmer auprès du droit fiscal cantonal avant usage dans un calculateur — voir la méthodologie. | Les coefficients sont repris tels que reçus de l’AFC. Leur unité (…) reste à confirmer auprès du droit fiscal cantonal avant tout usage dans un calculateur, comme l’explique la méthodologie. |
| Cases vides | « — » sans cadence connue ou sans échéance | case vide |
| Source inconnue | <id> — source non enregistrée | <id> (source non enregistrée) |

## 3. Registre des sources (`src/data/sources.ts`)

Les noms et les références légales s'affichent sur les deux pages. Le tiret qui y séparait deux
éléments devient une virgule, dans 46 champs (`name`, `legalReference`) ; aucune valeur, aucune URL,
aucune date ne change. Les titres de documents passent entre guillemets quand le tiret les séparait de
leur numéro :

| Avant | Après |
| --- | --- |
| Mémento 2.01 — Cotisations salariales à l'AVS, à l'AI et aux APG | Mémento 2.01, « Cotisations salariales à l’AVS, à l’AI et aux APG » |
| Le troisième pilier — plafonds des cotisations au pilier 3a | « Le troisième pilier », plafonds des cotisations au pilier 3a |
| Circulaire n° 18a — Traitement fiscal des cotisations et des prestations du pilier 3a | Circulaire n° 18a, « Traitement fiscal des cotisations et des prestations du pilier 3a » |
| Constitution fédérale de la Confédération suisse — art. 128, impôt fédéral direct | Constitution fédérale de la Confédération suisse, art. 128 (impôt fédéral direct) |
| Feuille cantonale de l'AFC — Jura (et les cinq autres cantons) | Feuille cantonale de l'AFC, Jura |
| RS 642.11 — art. 22 al. 1 (…) (et les autres références) | RS 642.11, art. 22 al. 1 (…) |

Les autres noms gardent leur apostrophe droite : ce sont des intitulés officiels cités tels quels, et le
garde-fou n'en dépend pas. Les notes du registre, qui ne s'affichent pas, ne changent pas.

## 4. Ce qui reste signalé par `copy:report`, et pourquoi

- **Les références légales des listes de sources** (jusqu'à 94 mots) : ce sont des citations
  d'articles, pas des phrases ; les couper ferait perdre la correspondance avec le registre.
- **Quatre phrases de 36 à 40 mots** : le quotient vaudois (la parenthèse des parts, lue dans les
  données), l'affiliation après l'âge de référence (les deux cas et leur référence commune, ch. 5.7 f),
  le refus du calcul de rachat LPP (deux cas sous un même deux-points), le niveau 3 d'avertissement.
  Chacune garde une seule affirmation avec sa référence.

## 5. Niveau 2 d'avertissement (fond mis à jour, 18.10.2026)

Le niveau 2 décrivait encore « un bandeau au-dessus de chaque formulaire », antérieur à la décision n° 19.
À la demande du mainteneur, il décrit désormais la page actuelle : « Une ligne de périmètre, au-dessus de
chaque formulaire, indique pour qui le calculateur est fait. Elle renvoie au détail “Ce que ce calcul
suppose”, qui précise ce que le calculateur ne couvre pas, avec un lien vers une alternative, et les
hypothèses qu’il retient. Toute exclusion qui s’applique à votre saisie s’affiche en outre dans la carte
du résultat, au moment où la saisie la déclenche. » Aucune autre page ne décrivait le bandeau.

## 5 bis. Seconde passe sur la prose (18.10.2026)

| Passage | Avant | Après |
| --- | --- | --- |
| Quotient vaudois (36 mots) | … qui dépend de toute la famille (1 pour une personne seule, 1,8 pour des époux, 1,3 pour un parent seul, plus 0,5 par enfant). | … qui dépend de toute la famille. Ce diviseur vaut 1 pour une personne seule, 1,8 pour des époux, 1,3 pour un parent seul, plus 0,5 par enfant. |
| Refus du calcul de rachat LPP (38 mots) | Le calcul est refusé, avec son motif, dans deux cas : le montant envisagé dépasse le potentiel (art. 79b al. 1 LPP), ou un versement anticipé pour la propriété du logement n’est pas remboursé (art. 79b al. 3 LPP). | Le calcul est refusé, avec son motif, si le montant envisagé dépasse le potentiel (art. 79b al. 1 LPP). Il l’est aussi si un versement anticipé pour la propriété du logement n’est pas remboursé (art. 79b al. 3 LPP). |
| Niveau 3 (36 mots) | Pour les calculateurs qui portent sur une décision difficilement réversible, comme un retrait en capital du 2e pilier, un encart distinct rappelle… | Certains calculateurs portent sur une décision difficilement réversible, comme un retrait en capital du 2e pilier. Un encart distinct y rappelle… |

Reste une phrase de prose de plus de 35 mots, celle de l'affiliation après l'âge de référence (40 mots).
Une seule référence la couvre (ch. 5.7 f), et elle reste donc entière (décision du mainteneur,
18.10.2026). Les huit autres signalements sont des listes de références légales.

## 6. Tests adaptés

- `tests/components/data-page-sources.test.ts` : le texte rendu ramène tout blanc à une espace ;
  l'attendu (nom de la circulaire, puis nom et référence) reçoit la même normalisation, comme le premier
  test du même fichier. Garantie inchangée : la circulaire figure sur `/donnees/` et sur la méthodologie,
  avec sa référence.
- `tests/components/pillar-3a-tax-saving-page.test.ts` : l'intertitre « Économie d’impôt d’un versement
  3a » de la méthodologie est cherché avec l'apostrophe typographique. Garantie inchangée : la section
  d'A2 cite ses six références.

## 7. `npm run copy:report`

| Page | Avant | Après |
| --- | ---: | ---: |
| `/methodologie/` | 28 | 11 |
| `/donnees/` | 2 | 2 |

Après, `/methodologie/` : 7 citations de références légales, 4 phrases de 36 à 40 mots (§ 4). `/donnees/` :
2 citations de références légales.

Garde-fou : 40 tirets cadratins sur `/methodologie/` et 18 sur `/donnees/` avant, 0 après ; les deux pages
quittent `PENDING_PAGES`.
