# Charte rédactionnelle de calculateurs.ch

> **Statut : fait autorité** pour tout texte visible du site : pages, définitions des calculateurs,
> `src/i18n/fr.ts`, articles, balises `title` et méta-descriptions, textes alternatifs et
> `aria-label`, images de partage. Elle complète `docs/design-system.md`, qui fixe la forme visuelle ;
> celle-ci fixe la forme écrite. Elle ne s'applique pas au code (identifiants, commentaires, messages
> de commit), ni aux documents de pilotage.
>
> Adoptée le 18 octobre 2026. La table des tournures interdites (§ 4.3) est lue par
> `tests/content/editorial.test.ts` : la modifier modifie le garde-fou.

## 1. La voix

Le site parle comme un fiscaliste romand compétent qui explique sa situation à un ami. Il sait de quoi
il parle, il le dit avec précision, et il n'en rajoute pas. Il ne vend rien, ne s'enthousiasme pas et
ne fait pas de pédagogie appuyée : il répond à la question posée, puis il s'arrête.

Concrètement, une phrase du site doit pouvoir être dite à voix haute, à table, sans que personne ne
fronce les sourcils. « Votre versement se déduit de votre revenu imposable » passe. « Optimisez votre
fiscalité grâce à notre outil innovant » ne passe pas.

**On change la forme, jamais le fond.** Une réécriture de style ne retire ni n'ajoute aucune
information (§ 5).

## 2. Rythme

- **Varier la longueur des phrases.** Une phrase courte, parfois de trois mots, après une plus longue.
  Jamais trois phrases de suite de même longueur ou de même construction.
- **Varier l'attaque.** Pas deux paragraphes de suite qui commencent de la même façon. Un parallèle
  voulu (« Pour un salarié… Pour un indépendant… ») reste permis quand il aide à comparer.
- **Pas de triade réflexe.** Une énumération compte deux, quatre ou un seul terme, selon ce qui est
  vrai. Trois termes seulement quand il y en a trois.
- **Une liste à puces seulement pour une vraie liste** : des éléments de même nature, qu'on pourrait
  compter. Un raisonnement s'écrit en phrases.
- **Une phrase, une idée.** Au-delà de 35 mots, la phrase se coupe en deux, sauf si la condition
  juridique qu'elle porte ne se découpe pas sans perdre son sens (§ 5) ; on le note alors dans la revue.

## 3. Ponctuation et typographie

### 3.1 Tirets

Aucun tiret cadratin (—) ni demi-cadratin (–) comme ponctuation, nulle part : ni incise, ni
séparateur, ni début de ligne, ni case vide de tableau. On les remplace par une virgule, des
parenthèses, un point ou une nouvelle phrase. Une case sans montant reste vide.

| Usage | Forme |
| --- | --- |
| Séparateur dans une balise `title` | « · » (point médian, espaces de part et d'autre) |
| Montant négatif | signe moins typographique (−, U+2212) |
| Opération dans la trace du calcul | signe moins typographique (−, U+2212) |
| Mot composé, nom propre (Brig-Glis, peut-être, Saint-Maurice) | trait d'union, inchangé |
| Intervalle (2025-2034, art. 7-9) | trait d'union, ou « de 2025 à 2034 » dans une phrase |

### 3.2 Deux-points

Avec parcimonie : **au plus un par paragraphe**, et jamais deux phrases de suite construites en
« X : Y ». Le deux-points annonce une explication ou une liste ; il ne remplace pas un verbe.

Restent tels quels, parce que le design system et les règles d'accessibilité (WCAG 1.4.1) les
imposent : les préfixes « Attention : », « Erreur : » et « Envoyé : ». Ils ne comptent pas dans la
limite d'un deux-points par paragraphe. Le préfixe « Exemple : » du bandeau du cas exemple compte.

### 3.3 Typographie française

- Espace fine insécable (U+202F) avant `;`, `:`, `!` et `?`.
- Guillemets « » avec une espace insécable (U+00A0) à l'intérieur : « petite » cotisation.
- Apostrophe typographique (’) dans le texte visible : l’impôt, d’un versement.
- Séparateur de milliers suisse, l’apostrophe typographique : 7’258 CHF. Les montants passent par
  le formateur du site (`src/lib/format/chf.ts`), jamais par une chaîne tapée.
- Aucun point d'exclamation, aucun emoji.

## 4. Vocabulaire et ton

### 4.1 Règles

- **Vouvoiement**, jamais de tutoiement.
- **Phrases directes**, verbes concrets, le sujet avant le verbe. « Votre caisse de pension vous
  rembourse l’excédent » plutôt que « Un remboursement de l’excédent est effectué par la caisse ».
- **Un exemple concret vaut mieux qu’une généralité.** « Une déduction peut faire passer votre revenu
  dans la tranche inférieure du barème » plutôt que « Divers effets de barème peuvent intervenir ».
- **Une seule façon de dire une chose.** Le même objet garde le même nom sur tout le site (§ 4.2).
- **Pas de formule d'accroche** ni de phrase de transition (« Voyons maintenant… »).
- **Pas de conclusion qui répète** ce que le paragraphe vient de dire.

### 4.2 Termes suisses

| Dire | Ne pas dire |
| --- | --- |
| caisse de pension | fonds de pension, caisse de retraite |
| décision de taxation | avis d'imposition, avis de taxation |
| commune | municipalité (dans le texte visible) |
| revenu imposable | revenu fiscal, base imposable |
| 3e pilier, pilier 3a | troisième pilier lié, épargne retraite |
| 2e pilier | deuxième pilier (en toutes lettres) |
| fondation 3a, assurance 3a | prestataire 3a |
| impôt fédéral direct | impôt fédéral (sans précision, quand il faut distinguer) |

### 4.3 Tournures interdites

La colonne « Motif » est une expression régulière (insensible à la casse) que
`tests/content/editorial.test.ts` cherche dans chaque bloc de texte visible de `dist/`. Une ligne dont
le motif est « relecture » relève du jugement : aucun test ne la détecte, la revue la cherche.
Ajouter une ligne ici l'ajoute au garde-fou. Dans la table, une barre verticale du motif s'écrit
`\|`, comme toute barre dans une cellule Markdown.

| Tournure | Motif |
| --- | --- |
| « Il est important de noter » | `il est important de noter` |
| « Il convient de noter » | `il convient de noter` |
| « N’hésitez pas » | `n['’]hésitez pas` |
| « Découvrez » | `\bdécouvrez\b` |
| « Plongez » | `\bplongez\b` |
| « En effet » en tête de phrase | `(?:^\|[.?:;]\s+)en effet\b` |
| « Que vous soyez… ou… » | `\bque vous soyez\b` |
| « Ce n’est pas X, c’est Y » | `\bce n['’]est pas [^.]{1,60}, c['’]est\b` |
| « En résumé » | `\ben résumé\b` |
| « tout en » répété dans un même bloc | `\btout en\b[\s\S]*\btout en\b` |
| « véritable » | `\bvéritables?\b` |
| « crucial » | `\bcruci(?:al\|ale\|aux\|ales)\b` |
| « essentiel » (adjectif ; la locution juridique « pour l’essentiel » reste permise) | `(?<!pour l['’])\bessentiel(?:le)?s?\b` |
| « en toute sérénité » | `en toute sérénité` |
| « simple et rapide » | `\bsimples? et rapides?\b` |
| « Force est de constater » | `force est de constater` |
| La question rhétorique suivie de sa réponse | relecture |
| La phrase de conclusion qui répète ce qui précède | relecture |
| L'énumération en trois termes par réflexe | relecture |

## 5. Ce qui ne change jamais

- **Le sens juridique.** Chaque condition, exception et nuance (« en principe », « selon la pratique
  fiscale », « à titre obligatoire ou facultatif ») reste attachée à la même affirmation. Chaque
  référence légale reste, **en fin de phrase et entre parenthèses** : « … reste déductible (art. 7
  al. 4 OPP 3). » Leur passage en `SourceTag` (design system § 4.5) est prévu à une session suivante.
  Une phrase dont le sens juridique résiste à la réécriture garde sa forme ; on la signale dans la
  revue avec une proposition.
- **Les chiffres.** Aucun chiffre ajouté, retiré ou recopié en dur (R2, R3). Une valeur lue dans les
  données le reste ; un montant passe par le formateur.
- **La formule d'attribution de l'AFC**, mot pour mot, ponctuation comprise :
  « Source : Administration fédérale des contributions (AFC), simulateur fiscal, module « Rechercher
  des données de base ». Données reproduites sans garantie. »
- **Les URL et les slugs.**
- **Les contraintes SEO** : `title` de moins de 60 caractères, avec l'année et le bénéfice ;
  méta-description de 155 caractères au plus ; mot-clé principal conservé dans le `title`, le H1 et
  la description.
- **Les termes interdits par les conditions d'usage de l'AFC** : jamais « à jour », « exact »,
  « garanti » à propos d'une donnée.

## 6. Garde-fous automatiques

### 6.1 Le test, bloquant

`tests/content/editorial.test.ts` tourne après la construction (`postbuild`) sur le texte visible de
chaque page de `dist/`, extrait par `src/lib/build/visible-text.ts` : ni code, ni attributs techniques,
ni JSON de données ; le titre, la méta-description, les textes de partage, `alt`, `aria-label`,
`title` et `placeholder` y sont. Il échoue sur :

- un tiret cadratin (U+2014) ou demi-cadratin (U+2013) ;
- un trait d'union isolé entre deux espaces (« 2026 - 2027 ») ;
- un point d'exclamation ;
- une tournure de la table du § 4.3.

Les textes qu'un script n'affiche qu'après une saisie (messages lus dans le JSON de la page) échappent
à ce test : ils viennent de `fr.ts` et des définitions, que la revue relit.

Pendant la réécriture du site (octobre 2026), les pages pas encore relues figurent dans la liste
`PENDING_PAGES` du test ; la liste se vide famille par famille et disparaît à la fin.

### 6.2 Le rapport, indicatif

`npm run copy:report` ne fait jamais échouer la construction. Il lit `dist/` et liste, page par page :

- les phrases de plus de 35 mots ;
- les paragraphes de trois phrases ou plus dont les longueurs varient de moins de 4 mots ;
- les paragraphes de plus d'un deux-points (préfixes obligatoires du § 3.2 exclus).

Le rapport signale, il ne tranche pas : une phrase juridique de 40 mots peut être juste (§ 5).

## 7. Revue d'une page

Toute réécriture laisse une trace dans `docs/editorial-review/<page>.md` : chaque texte modifié en
avant / après, la sortie de `copy:report` avant / après, et les phrases dont le sens juridique a
résisté. Tout calculateur, nouveau ou repris, passe cette charte (design system § 4.7).

## 8. Exemples

Tirés de la page pilote `/prevoyance/economie-impot-3a/` (revue complète :
`docs/editorial-review/economie-impot-3a.md`).

| Avant | Après | Ce qui a changé |
| --- | --- | --- |
| Le plafond dépend de votre affiliation à un 2e pilier, pas de votre statut : affilié à une caisse de pension, vous déduisez au plus la « petite » cotisation, 7’258 CHF en 2026 ; sans caisse de pension, 20 % du revenu… | Le plafond dépend de votre affiliation à un 2e pilier, et non de votre statut. Avec une caisse de pension, vous déduisez au plus la « petite » cotisation, soit 7’258 CHF en 2026. Sans caisse de pension, la limite passe à 20 % du revenu… | Une phrase de 46 mots, deux-points et point-virgule, devient trois phrases. |
| Seulement sans caisse de pension. Salarié : salaire brut moins les cotisations… Indépendant : résultat après rectifications fiscales… | À remplir seulement sans caisse de pension. Pour un salarié, c’est le salaire brut moins les cotisations… Pour un indépendant, le résultat après rectifications fiscales… | Deux « X : Y » de suite deviennent des phrases. |
| L'excédent n'est pas déductible : le calculateur ramène le montant au plafond, et votre fondation doit vous rembourser la différence (circulaire AFC n° 18a, ch. 9.1). | L’excédent n’est pas déductible, et votre fondation doit vous le rembourser (circulaire AFC n° 18a, ch. 9.1). Le calculateur ne retient donc que le plafond. | Les deux affirmations juridiques restent ensemble, devant leur référence ; le comportement du calculateur passe dans sa propre phrase. |
| Exemple : personne seule à Lausanne, avec caisse de pension, revenu imposable de 70’000 CHF, versement maximal — remplacez par vos chiffres, | Exemple : une personne seule à Lausanne, affiliée à une caisse de pension, qui verse le maximum sur un revenu imposable de 70’000 CHF. Remplacez par vos chiffres, | Le tiret devient un point ; l'énumération télégraphique devient une phrase. |
