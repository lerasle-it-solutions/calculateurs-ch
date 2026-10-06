# calculateurs.ch — Instructions du projet

Ce fichier fait autorité. Il contient (1) les règles absolues (R1–R7), (2) la
convention de nommage et son glossaire, (3) les conditions d'usage des données de
l'AFC, (4) le contrat du moteur fiscal, (5) le document d'architecture v2 intégral,
(6) le design system. Toute décision technique doit s'y conformer.

**Le travail de la semaine n'est pas ici.** Il est dans `docs/plan/`, un fichier par
semaine, avec son index. `docs/plan/` est exclu du dépôt public et sauvegardé dans le
dépôt privé `calculateurs-ch-data`, sous `plan/` : `docs/plan` est un lien symbolique
vers `../calculateurs-ch-data/plan`, clone voisin du dépôt privé. Toute modification du
plan se commite et se pousse dans ce dépôt-là. La commande `/session NN` ouvre et
exécute une semaine.

| Besoin                                                  | Fichier                                        |
| ------------------------------------------------------- | ---------------------------------------------- |
| Ce que je fais cette semaine                            | `docs/plan/WNN.md` (voir `docs/plan/INDEX.md`) |
| Ajouter une source                                      | `docs/plan/sources.md`                         |
| Ce que doivent contenir `/methodologie/` et `/donnees/` | `docs/plan/pages.md`                           |
| Contrat complet du moteur et des cas de référence       | `docs/plan/engine.md`                          |
| Avant une mise en ligne                                 | `docs/plan/checklist.md`                       |
| Pourquoi telle décision                                 | `docs/plan/changelog.md`                       |

---

## Règles absolues

Ces sept règles priment sur toute autre considération. Aucune exception sans accord
explicite du mainteneur.

### R1 — Aucun back-end, aucune base de données, aucun compte utilisateur

Le site est statique par défaut. Pas de base de données, pas d'authentification, pas
de comptes utilisateurs. **Exceptions autorisées, limitativement** : des Cloudflare
Pages Functions **sans état**, qui ne stockent rien et ne journalisent aucune donnée
personnelle —

- `functions/api/lead.ts` et `functions/api/lead/match.ts` : mise en relation avec un
  partenaire (valident, déterminent le destinataire, transmettent, renvoient 200) ;
- `functions/api/subsidies.ts` : calcul des subventions **si et seulement si**
  l'arbitrage d'exposition de la semaine 22 retient cette option, pour éviter
  d'envoyer la table compilée au navigateur.

Aucune autre fonction serveur ne peut être créée sans décision explicite.

### R2 — Aucune valeur chiffrée dans le code

Aucune valeur brute (barème, plafond, taux, seuil, coût de référence, tarif…)
n'apparaît dans le code. Tout vit dans `src/data/`, enveloppé dans le type `Value<T>`,
avec au minimum une **source** (`sourceId` présent dans le registre) et une **date de
vérification** (`verifiedOn`). Une valeur sans source ni date ne peut pas entrer dans
le dépôt. Les fonctions de `src/lib/calculations/` reçoivent leurs barèmes **en
argument** et ne les importent jamais elles-mêmes.

### R3 — On n'invente jamais une valeur chiffrée

Si une valeur chiffrée manque, on ne la déduit pas, on ne l'estime pas, on ne la copie
pas de mémoire. On crée une entrée `TODO` explicite dans le fichier `src/data/`
concerné (valeur marquée, `sourceId` à renseigner, `verifiedOn` vide) **et on demande
au mainteneur de relever la valeur** à sa source officielle. Le travail dépendant de
cette valeur reste bloqué jusqu'à ce qu'elle soit fournie. La règle vaut aussi pour
les **URL** et les **références légales** : on ne les reconstitue jamais de mémoire.

### R4 — Chaque fonction de calcul retourne une trace ligne par ligne

Toute fonction de `src/lib/calculations/` retourne, en plus de son résultat, une
**trace du calcul ligne par ligne** (`breakdown` : chaque étape a un libellé français,
ses opérandes, l'opération réellement effectuée, le résultat intermédiaire, le
`sourceId` et l'hypothèse retenue). Cette trace alimente le composant
`CalculationBreakdown.astro`. Un résultat non traçable est un bug.

### R5 — Le code en anglais, le contenu en français

Tout identifiant de code — fichiers, dossiers, types, fonctions, variables, clés de
données, tests, messages de commit — est en anglais, en `camelCase` pour les
identifiants et en `kebab-case` pour les noms de fichiers. Tout contenu destiné à
l'utilisateur — URL publiques, titres, libellés, textes — est en français et passe par
`src/i18n/fr.ts`. **Ne traduis jamais une URL en anglais.** Utilise le glossaire de la
section suivante sans jamais inventer de synonyme. Détail complet et exceptions :
**§ Convention de nommage** ci-dessous.

### R6 — Deux classes de données, rangées séparément

Le critère n'est pas la sensibilité, mais le **coût de reconstitution** : combien
d'heures faudrait-il à un tiers pour refaire ce fichier sans nous ?

| Classe                                                                                                             | Exemples                                                                                                                                                      | Où elle vit                                                                                                             | Licence                                                            |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **Publique** — reconstituable en moins d'une heure, ou déjà publiée ailleurs, et dont la réutilisation est permise | barèmes, coefficients et déductions fiscales ; données fédérales ; prix de référence de l'OFEN                                                                | dépôt public, `src/data/`                                                                                               | CC BY 4.0 sur la compilation ; conditions de l'AFC sur ses données |
| **Compilée** — assemblée à la main, commercialement sensible, ou dont la diffusion n'est pas permise               | subventions cantonales et communales ; tarifs de reprise par gestionnaire ; table de routage des partenaires ; cas de référence issus du calculateur de l'AFC | dépôt privé `calculateurs-ch-data`, injecté à la construction dans `src/data/private/` et `tests/calculations/private/` | aucune — tous droits réservés                                      |

Dans le doute, un fichier est **compilé**. On publie plus tard ce qu'on a gardé ; on ne
dépublie jamais ce qui est passé sur GitHub.

**Limite à connaître** : un dépôt privé ne protège rien de ce que la page envoie au
navigateur. Une donnée compilée n'est réellement protégée que si le calcul qui
l'utilise ne transmet pas la table — d'où l'exception de R1 sur les subventions.

### R7 — Un test ou un cas de référence ne se modifie jamais pour passer

Les fichiers de `tests/calculations/` sont en lecture seule du point de vue du code. On
ne change jamais une valeur attendue, on ne désactive jamais une suite, on ne contourne
jamais un test qui échoue. Si une suite résiste après trois tentatives, on s'arrête et
on présente au mainteneur un tableau : cas, champ, attendu, obtenu, hypothèse sur la
cause.

---

## Convention de nommage — le code en anglais, le contenu en français

**Règle :** tout ce que lit une machine est en anglais, tout ce que lit un visiteur est
en français. Cette frontière est stricte et ne souffre aucune exception, parce qu'une
base de code à moitié traduite est pire que l'une ou l'autre convention prise seule :
personne, ni toi ni l'IA, ne se souvient de quel côté se trouve un fichier donné.

| En anglais — lu par la machine                       | En français — lu par un humain                            |
| ---------------------------------------------------- | --------------------------------------------------------- |
| Noms de dossiers et de fichiers du code              | URL publiques : `/prevoyance/rachat-3a-retroactif/`       |
| Noms de types, fonctions, variables, composants      | Titres, textes, intitulés de champs, FAQ                  |
| Clés des fichiers de données (`pillar3aEmployeeCap`) | Valeurs des chaînes dans `src/i18n/fr.ts`                 |
| Noms des tests et des scripts                        | Documents de pilotage : `DECISIONS.md`, `JOURNAL.md`      |
| Messages de commit Git                               | Contenu des articles                                      |
| Commentaires dans le code                            | Le plan, la méthodologie, la politique de confidentialité |

**Le point à ne pas rater : les URL restent en français.** Elles sont du contenu, pas
du code. `/prevoyance/rachat-3a-retroactif/` contient tes mots-clés et s'affiche dans
les résultats de recherche ; `/pension/pillar-3a-buyback/` te coûterait du
référencement et de la crédibilité auprès d'un lecteur romand. Le fichier peut donc
s'appeler `src/calculators/pension/pillar-3a-buyback.ts` tout en produisant une URL
française — c'est la définition du calculateur qui porte le slug.

> Cas particulier `src/pages/` : en routage par fichier Astro, le nom du fichier
> **devient** le segment d'URL. Les fichiers de `src/pages/` sont donc nommés en
> **français** (`rachat-3a-retroactif.astro`) — ils sont du contenu, pas du code. Tout
> le reste de `src/` suit la règle anglaise.

### Glossaire de référence

À conserver ici pour que l'IA nomme toujours de la même façon. Ne jamais inventer de
synonyme.

| Domaine                                                  | Français             | Anglais retenu                  |
| -------------------------------------------------------- | -------------------- | ------------------------------- |
| Calculateur                                              | calculateur          | `calculator`                    |
| Prévoyance                                               | prévoyance           | `pension`                       |
| Immobilier                                               | immobilier           | `property`                      |
| Énergie                                                  | énergie              | `energy`                        |
| Entreprise                                               | entreprise           | `business`                      |
| 3e pilier                                                | 3a                   | `pillar3a` / `pillar-3a`        |
| Rachat                                                   | rachat               | `buyback`                       |
| Lacune de cotisation                                     | lacune               | `contributionGap`               |
| Retrait en capital                                       | retrait en capital   | `capitalWithdrawal`             |
| Revenu imposable                                         | revenu imposable     | `taxableIncome`                 |
| Économie d'impôt sur déduction                           | économie d'impôt     | `taxSavingOnDeduction`          |
| Valeur locative                                          | valeur locative      | `imputedRentalValue`            |
| Subvention                                               | subvention           | `subsidy`                       |
| Barème                                                   | barème               | `taxScale`                      |
| Coefficient / centimes additionnels                      | coefficient communal | `municipalMultiplier`           |
| Commune                                                  | commune              | `municipality`                  |
| Périmètre déclaré                                        | périmètre            | `scope`                         |
| Trace du calcul                                          | trace                | `breakdown`                     |
| Fraîcheur des données                                    | fraîcheur            | `freshness`                     |
| Projection retraite consolidée (A5), identifiant réservé | projection retraite  | `pension.retirement-projection` |

### Deux exceptions assumées

1. **Les acronymes d'institutions et de textes légaux restent en français**, parce que
   ce sont des noms propres, pas des mots à traduire : `sourceId: "ofas-pillar-3a-caps"`,
   `"opp3-art-7a"`, `"lifd-art-36"`, et `lpp-buyback.ts` — **jamais** `bvg-buyback.ts`.
2. **Les codes de cantons restent les abréviations officielles** : `VD`, `GE`, `VS`,
   `FR`, `NE`, `JU`.

### Le type central

```ts
// src/data/schema.ts
export type Value<T> = {
  value: T;
  unit?: string;
  sourceId: string; // acte officiel, présent dans le registre
  verifiedOn: string; // ISO 8601
  effectiveFrom: string; // ISO 8601
  collectedFrom?: string; // outil de collecte, distinct de la source
  note?: string;
};
```

### Portée sur le document d'architecture ci-dessous

Le document d'architecture v2 a été rédigé avec la convention appliquée : dossiers,
types, fonctions, clés de données et tests en anglais ; seuls les fichiers de
`src/pages/`, les URL et les textes affichés restent en français. En cas de
contradiction résiduelle, **cette section prime**.

---

## Conditions d'usage des données de l'AFC

Réponse écrite de l'Administration fédérale des contributions, septembre 2026. Elle
distingue deux catégories, et la distinction est structurante.

|                | Données de base                                                                                       | Résultats du calculateur                                                                                                          |
| -------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Ce que c'est   | barèmes, coefficients communaux, déductions, publiés par le module « Rechercher des données de base » | impôts calculés pour un profil donné                                                                                              |
| Statut         | **réutilisables, à condition de citer la source et sans garantie**                                    | **pas des données ouvertes** ; calculateur exploité par un prestataire tiers ; consultation **exclusivement par l'interface web** |
| Usage autorisé | `src/data/`, dépôt public, avec attribution                                                           | oracle de test par saisie manuelle ; fichier de référence dans le dépôt privé                                                     |

**Trois interdits permanents :**

1. Aucun appel programmatique aux points d'accès du simulateur, ni depuis un script, ni
   depuis le site. Les données de base se téléchargent à la main depuis le module, et
   `scripts/read-estv-exports.ts` lit ces fichiers.
2. Aucune publication des **résultats** du calculateur hors de son interface, y compris
   dans le dépôt public.
3. Aucune affirmation de garantie sur une donnée issue de l'AFC.

**Formule d'attribution**, identique partout où elle s'applique — composant
`DataFreshness`, `/donnees/`, `/methodologie/`, en-tête des exports CSV,
`src/data/LICENSE.md` :

> Source : Administration fédérale des contributions (AFC), simulateur fiscal, module
> « Rechercher des données de base ». Données reproduites sans garantie.

**Ancrage de source** : le `sourceId` d'une valeur désigne toujours **l'acte officiel**
— loi fiscale cantonale, ordonnance, arrêté communal — et `collectedFrom` l'outil de
collecte (`estv-base-data-module`). Citer la loi vaut mieux que citer un formulaire, et
cela protège le site si le module change.

Le registre complet des sources, avec la semaine d'ajout de chacune, est dans
`docs/plan/sources.md`. Le type `Source` y est défini ; il comporte notamment
`dataClass`, `nature`, `requiresAttribution`, `attributionText`, `legalReference` et
`usedBy`. `nature` pilote l'affichage : une source `self-regulation`, `industry` ou
`association` s'affiche avec la mention « source non officielle, à titre indicatif » ;
une source `reference-tool` ne s'affiche jamais.

---

## Contrat du moteur fiscal

Détail complet et spécification des cas de référence : `docs/plan/engine.md`. À lire
**avant** toute modification de `src/lib/calculations/tax.ts`.

**Deux revenus imposables, pas un.** La LHID (RS 642.14, art. 1 al. 3 et art. 9)
réserve aux cantons la fixation des barèmes, des taux et des montants exonérés ; la
LIFD (RS 642.11) applique ses propres déductions et son barème de l'art. 36. Un même
revenu net produit donc deux revenus imposables différents — par exemple 174 339 au
fédéral contre 173 639 à Neuchâtel — chacun taxé par son barème.

**Trois étages, pas deux calculs parallèles.** L'assiette cantonale et communale est
identique, seul le taux change :

1. `cantonalTaxableIncome` → barème cantonal → **impôt cantonal de base** ;
2. impôt de base × coefficient cantonal → impôt cantonal ; × coefficient communal →
   impôt communal ; × coefficient paroissial → impôt paroissial ;
3. `federalTaxableIncome` → barème LIFD → impôt fédéral direct.

Plus la **taxe personnelle** forfaitaire (24 CHF en Valais, 25 CHF à Genève, aucune
ailleurs en Suisse romande) et les **corrections cantonales datées** — l'impôt vaudois
de base est réduit de 5 % pour 2026, 4 % en 2025.

```ts
type TaxInput = {
  taxYear: number;
  canton: "VD" | "GE" | "VS" | "FR" | "NE" | "JU";
  municipalityOfsId: number;
  maritalStatus: "single" | "married";
  children: number;
  childrenAges: number[]; // certaines déductions en dépendent
  denomination: "none" | "protestant" | "catholic" | "christianCatholic";
  federalTaxableIncome: number;
  cantonalTaxableIncome: number;
  taxableWealth: number;
  // Facultatif. Enfants et personnes nécessiteuses en ménage commun dont le
  // contribuable assume pour l'essentiel l'entretien (art. 36 al. 2bis LIFD) :
  // choix du barème fédéral et réduction par personne. Absent, il vaut
  // { children, needyPersons: 0 }, hypothèse inscrite dans la trace.
  supportedHouseholdMembers?: { children: number; needyPersons: number };
};
```

**La règle la plus importante** : une économie d'impôt se calcule par
`computeTaxSavingOnDeduction` — la différence entre l'impôt total et l'impôt total avec
les **deux** revenus imposables diminués de la déduction — et **jamais** en multipliant
un taux marginal par un montant. Une déduction de plusieurs milliers de francs peut
franchir une limite de barème ou un seuil de déduction sociale, ce qu'une dérivée ne
voit pas. `computeMarginalRate` existe, mais sert d'oracle de vérification, pas de
méthode de calcul : impôt supplémentaire sur 1 000 CHF de revenu imposable appliqués
simultanément aux deux bases, divisé par 1 000. Pourquoi 1 000 : certains cantons font
avancer le revenu déterminant pour le taux par marches — le quotient familial vaudois,
qui divise par 2,3 puis arrondit à la centaine, produit une marche tous les 230 francs —,
de sorte qu'un pas de 100 francs mesure le plateau et non la pente.

**Trois pièges d'implémentation connus** : le barème fribourgeois est **continu**, sans
paliers, contrairement aux cinq autres ; certaines étapes officielles **arrondissent à
la centaine de francs inférieure**, première piste en cas d'écart de quelques francs ;
les charges de famille agissent selon les cantons sur l'impôt et pas seulement sur le
revenu imposable.

---

## Comment tu travailles

- Une tâche à la fois, dans l'ordre du fichier de la semaine. Tu ne prends pas d'avance
  sur les étapes suivantes.
- Tu écris les tests en même temps que le code, et quand le plan le demande, **avant**
  le code.
- Avant toute valeur à relever à la source, tu t'arrêtes et tu la demandes (R3).
- Avant toute mise en ligne : `npm run test`, `npm run build`, puis
  `docs/plan/checklist.md` en entier.
- Tu ne demandes jamais de coller un secret dans un fichier : les clés viennent des
  variables d'environnement, et n'apparaissent ni dans un log, ni dans un message
  d'erreur.
- À la fin d'une session : trois lignes dans `JOURNAL.md`, et les points terminés
  cochés dans le fichier de la semaine.

---

# Architecture — calculateurs.ch (Astro.js) — **v2**

> **Ce qui change par rapport à la v1**
>
> 1. **La couche de données devient le cœur du projet**, pas un détail. Chaque valeur
>    est versionnée, sourcée, datée et testée. C'est la barrière à l'entrée.
> 2. **Nouvelle famille `/energie/`** — subventions, pompe à chaleur, photovoltaïque.
>    Absente de la v1, c'est la plus rentable.
> 3. **Le moteur fiscal cantonal devient une bibliothèque, pas des pages.** On ne
>    publie pas `/impots/impot-vaud/` : on ne bat pas les simulateurs officiels. Le
>    moteur sert les calculateurs de prévoyance et d'immobilier.
> 4. **Le périmètre déclaré devient une donnée structurée**, pas un texte libre. Il
>    alimente le bandeau, les liens de variantes, la FAQ et le JSON-LD.
> 5. **Périmètre année 1 explicite** : 9 à 11 calculateurs, pas 68. Le reste est un
>    backlog.
> 6. **Capture de lead et suivi de fraîcheur** intégrés à l'architecture.
>
> Version : 2.1 — Cible : Astro 5.x — Déploiement : Cloudflare Pages.
> Domaine canonique : **apex `calculateurs.ch`**, `www` redirigé en 301.

---

## Principes directeurs

**P1 — La donnée est le produit, la page n'est que l'interface.**
Le jour où l'on détient le seul jeu de données romand à jour sur les subventions
communales et les tarifs de reprise, on peut le vendre en licence, l'embarquer chez des
partenaires et publier un baromètre annuel. Les pages web ne sont qu'une sortie parmi
d'autres. Toute décision technique se tranche en faveur de la qualité et de la
traçabilité de la donnée.

**P2 — Aucune donnée sans source ni date de vérification.**
Une valeur sans `sourceId` et `verifiedOn` ne peut pas entrer dans le dépôt. Un test de
build échoue si une donnée n'a pas été vérifiée depuis plus de 12 mois — 100 jours pour
les données à cadence trimestrielle.

**P3 — Statique par défaut.**
Pas de base de données, pas de comptes utilisateurs, pas d'authentification. Seules
exceptions : les Pages Functions sans état listées en R1.

**P4 — Montrer le calcul.**
Chaque résultat est accompagné du détail ligne par ligne et des hypothèses retenues.
C'est ce qui distingue le site des formulaires à devis déguisés et ce qui le rend
citable.

**P5 — Le périmètre est annoncé avant la saisie, jamais après.**
Bandeau au-dessus du formulaire : pour qui, ce que ça ne couvre pas, quelles
hypothèses.

---

## Structure du projet

```
calculateurs.ch/
│
├── CLAUDE.md                            ← ce fichier
├── docs/plan/                           ← le plan, une semaine par fichier — HORS DÉPÔT PUBLIC
├── DECISIONS.md, JOURNAL.md, PARTNERS.md ← pilotage — HORS DÉPÔT PUBLIC, liens vers ../calculateurs-ch-data/pilotage/
│
├── public/
│   ├── favicon.svg
│   ├── robots.txt                       ← sitemap sur l'apex ; robots d'IA NON bloqués
│   └── og/
│
├── scripts/
│   ├── read-estv-exports.ts             ★ lit les exports AFC téléchargés à la main
│   ├── import-estv-tax-data.ts          ← NEUTRALISÉ, conservé pour ses schémas zod
│   ├── fetch-private-data.ts            ★ injecte le dépôt privé (prebuild, pretest)
│   ├── verify-data.ts                   ← rapport de fraîcheur
│   └── new-year.ts                      ← rituel du 1er janvier
│
├── imports/estv/{année}/{ct}/           ← exports AFC bruts — HORS DÉPÔT
│
├── src/
│   │
│   ├── data/                            ★ CŒUR DU PROJET
│   │   ├── schema.ts                    ← Value<T>, Source, validation zod
│   │   ├── sources.ts                   ← registre des sources publiques
│   │   ├── index.ts                     ← accès typé, résolution par année
│   │   ├── LICENSE.md                   ← CC BY 4.0 + conditions de l'AFC
│   │   │
│   │   ├── federal/{année}.json         ← AVS/AI/APG, AC, LAA, LPP, 3a, IFD, TVA
│   │   ├── cantons/{ct}.json            ← barèmes revenu et fortune, prestations en
│   │   │                                  capital, gains immobiliers, valeur locative
│   │   ├── municipalities/multipliers.json
│   │   ├── deductions/                  ← tables de déductions (estimateur brut → imposable)
│   │   ├── energy/reference-market-price.json   ← OFEN, trimestriel — PUBLIC
│   │   │
│   │   ├── private/                     ★ INJECTÉ — HORS DÉPÔT (R6)
│   │   │   ├── sources.private.ts       ← registre des sources compilées
│   │   │   ├── energy/subsidies.json    ← cantonal + communal
│   │   │   ├── energy/feed-in-tariffs.json  ← par gestionnaire de réseau
│   │   │   └── partners/routing.json    ← table de routage des leads
│   │   │
│   │   └── private-fixtures/            ← jeux d'exemple FICTIFS, publics
│   │
│   ├── lib/
│   │   ├── calculations/                ← logique pure, zéro import Astro, zéro import JSON
│   │   │   ├── tax.ts                   ★ MOTEUR : impôt de base, coefficients, IFD,
│   │   │   │                              computeMarginalRate, computeTaxSavingOnDeduction
│   │   │   ├── gross-to-taxable.ts      ← estimateur, hypothèses déclarées
│   │   │   ├── pension/
│   │   │   │   ├── pillar-3a-buyback.ts
│   │   │   │   ├── pillar-3a-tax-saving.ts
│   │   │   │   ├── lpp-buyback.ts
│   │   │   │   └── capital-withdrawal.ts
│   │   │   ├── property/
│   │   │   │   ├── imputed-rental-value.ts
│   │   │   │   ├── renovation-timing.ts
│   │   │   │   ├── amortization.ts
│   │   │   │   └── purchase-capacity.ts
│   │   │   ├── energy/
│   │   │   │   ├── subsidies.ts
│   │   │   │   ├── heat-pump.ts
│   │   │   │   └── photovoltaic.ts
│   │   │   └── business/employer-cost.ts
│   │   │
│   │   ├── leads/
│   │   │   ├── routing-schema.ts
│   │   │   └── match-partner.ts         ← fonction pure, table en argument
│   │   │
│   │   └── utils/
│   │       ├── format-chf.ts
│   │       ├── round.ts
│   │       ├── breakdown.ts
│   │       └── period.ts
│   │
│   ├── calculators/                     ★ DÉFINITIONS DÉCLARATIVES
│   │   ├── types.ts
│   │   └── pension/ · property/ · energy/ · business/
│   │
│   ├── components/
│   │   ├── layout/                      Header, Footer, Breadcrumb, FamilyNav
│   │   ├── calculator/
│   │   │   ├── Shell.astro              ← assemble : titre, périmètre, champs, résultat,
│   │   │   │                              trace, fraîcheur, variantes, FAQ
│   │   │   └── RelatedVariants.astro
│   │   ├── ui/                          ★ primitives, éléments HTML natifs
│   │   │   ├── NumberField.astro          `<input type="number">`
│   │   │   ├── SelectField.astro          `<select>`
│   │   │   ├── CantonField.astro          `<select>`
│   │   │   ├── MunicipalityField.astro    `<input list>` + `<datalist>` — aucun JS
│   │   │   ├── ResultCard.astro           `<output>`
│   │   │   ├── CalculationBreakdown.astro `<details>` + `<table>`
│   │   │   ├── ScopeNotice.astro          `<aside>`
│   │   │   ├── DataFreshness.astro        `<p>` + `<time datetime>` + attribution
│   │   │   └── LeadForm.astro             `<form>`
│   │   ├── editorial/                   CalculatorCta, TableOfContents, Sources
│   │   └── seo/                         SchemaCalculator, SchemaArticle,
│   │                                    SchemaFaq, SchemaBreadcrumb
│   │
│   ├── layouts/                         BaseLayout, FamilyLayout, CalculatorLayout, ArticleLayout
│   ├── content/                         collections typées + articles/
│   ├── i18n/fr.ts                       ← clés anglaises, valeurs françaises
│   ├── styles/tokens.css                ★ source unique des valeurs de design
│   │
│   └── pages/                           ← noms de fichiers en FRANÇAIS : ils deviennent l'URL
│       ├── index.astro
│       ├── methodologie.astro           ★ voir docs/plan/pages.md
│       ├── donnees.astro                ★ générée depuis le registre
│       ├── protection-des-donnees.astro
│       ├── mentions-legales.astro
│       ├── prevoyance/ · immobilier/ · energie/ · entreprise/
│       └── {famille}/guides/[slug].astro
│
├── functions/
│   └── api/
│       ├── lead.ts                      ← sans état (R1)
│       ├── lead/match.ts                ← renvoie UN partenaire, jamais la table
│       └── subsidies.ts                 ← seulement si l'option B de la S22 est retenue
│
├── tests/
│   ├── calculations/
│   │   ├── private/                     ← cas de référence AFC — injectés, hors dépôt
│   │   ├── fixtures/                    ← jeux FICTIFS, publics
│   │   └── *.test.ts
│   ├── data/                            ← schéma, sources, fraîcheur, couverture
│   ├── leads/                           ← routage, exclusivité, no-leak
│   └── regression/
│
└── astro.config.mjs · tsconfig.json · vitest.config.ts · package.json
```

---

## 1. La couche de données

### 1.1 Le type `Value<T>`

Aucune valeur brute dans le dépôt. Tout est enveloppé (type complet en § Convention de
nommage).

```jsonc
// src/data/federal/2026.json
{
  "year": 2026,
  "pillar3a": {
    "smallContributionCap": {
      "value": 7258,
      "unit": "CHF",
      "sourceId": "ofas-pillar-3a-caps",
      "verifiedOn": "2026-09-29",
      "effectiveFrom": "2025-01-01",
    },
    "largeContributionCap": {
      "value": 36288,
      "unit": "CHF",
      "sourceId": "ofas-pillar-3a-caps",
      "verifiedOn": "2026-09-29",
      "effectiveFrom": "2025-01-01",
    },
    "largeContributionIncomeRate": {
      "value": 0.2,
      "sourceId": "opp3-art-7a",
      "verifiedOn": "2026-09-29",
      "effectiveFrom": "2025-01-01",
    },
    "buyback": {
      "firstGapYear": {
        "value": 2025,
        "sourceId": "opp3-art-7a",
        "verifiedOn": "2026-09-29",
        "effectiveFrom": "2025-01-01",
      },
      "lookbackYears": {
        "value": 10,
        "sourceId": "opp3-art-7a",
        "verifiedOn": "2026-09-29",
        "effectiveFrom": "2025-01-01",
      },
    },
  },
}
```

> Les lacunes antérieures à 2025 ne sont pas rachetables ; le rachat rétroactif est
> plafonné au même montant que le plafond annuel. Ces nuances se documentent dans la
> page méthodologie et, si besoin, dans le champ `note` du fichier de données.

### 1.2 Le registre des sources

Le type `Source` est défini dans `docs/plan/sources.md`, avec le registre maître et la
semaine d'ajout de chaque entrée. Forme courte :

```ts
// src/data/sources.ts
export const SOURCES = {
  "opp3-art-7a": {
    name: "OPP 3, art. 7a — rachats dans le pilier 3a",
    authority: "Confédération",
    url: "https://www.fedlex.admin.ch/...",
    legalReference: "RS 831.461.3, art. 7a",
    cadence: "irregular",
    verifiedOn: "2026-10-12",
    dataClass: "public",
    nature: "official",
    requiresAttribution: false,
    usedBy: ["pension.pillar-3a-buyback", "pension.pillar-3a-tax-saving"],
  },
  // ...
} as const;
```

Les clés (`opp3-art-7a`) et les noms de champs sont en anglais ; `name` et `authority`
portent des libellés français, ce sont des noms propres. Les sources des données
compilées — une entrée par commune, par gestionnaire de réseau, par partenaire — ne
figurent **pas** ici : leur liste seule révélerait la couverture de la compilation.
Elles vivent dans `src/data/private/sources.private.ts`, fusionné à la construction.

### 1.3 Les tests de données

```
tests/data/
├── schema.test.ts       → tous les fichiers valident le schéma zod
├── sources.test.ts      → tout sourceId existe ; aucune source orpheline ;
│                          toute source requiresAttribution a son attributionText ;
│                          aucune source reference-tool rendue sur une page publique
├── freshness.test.ts    → > 12 mois (100 jours en cadence trimestrielle) = échec
└── coverage.test.ts     → les 6 cantons ont les mêmes clés obligatoires
```

`freshness.test.ts` échoue le build. C'est volontaire : le seul défaut fatal du site
serait d'afficher un chiffre périmé avec assurance. Passer en avertissement le jour où
ça devient trop pénible est une décision, pas un accident.

### 1.4 Les pages publiques `/methodologie/` et `/donnees/`

Leur contenu, section par section et semaine par semaine, est spécifié dans
`docs/plan/pages.md`. `/donnees/` est **entièrement générée** : sources publiques avec
leur fraîcheur, CSV des coefficients communaux, inventaire des données compilées **sans
leurs valeurs**, journal des mises à jour. `/methodologie/` combine une partie générée —
les sources par famille — et une partie rédigée par le mainteneur : l'IA peut proposer
un brouillon, jamais l'engagement.

Trois effets, inchangés depuis la v1 : crédibilité immédiate auprès d'une fiduciaire ou
d'un journaliste, aimant à liens, et discipline interne — la dette de fraîcheur devient
publique.

### 1.5 Le rituel du 1er janvier

`npm run new-year` duplique `federal/{n-1}.json`, remet les `verifiedOn` à zéro et sort
la liste des valeurs à re-vérifier. Puis : téléchargement manuel des exports de l'AFC,
`read-estv-exports.ts`, revérification des numéros OFS — les fusions de communes en
retirent et en créent — et re-saisie des cas de référence de l'année. Publication le
2 janvier : trois semaines de trafic saisonnier captées sur des concurrents qui mettront
des semaines.

---

## 2. La définition déclarative d'un calculateur

Le périmètre n'est pas du texte dans une page — c'est une donnée qui alimente le
bandeau, les liens de variantes, la FAQ, le JSON-LD et les tests.

```ts
// src/calculators/types.ts
export type CalculatorDefinition = {
  id: string; // "family.name" — ex. "pension.pillar-3a-buyback"
  family: "pension" | "property" | "energy" | "business";
  slug: string; // FRANÇAIS — URL publique, indépendante du nom du fichier
  title: string; // FRANÇAIS
  metaDescription: string; // FRANÇAIS

  scope: {
    forWhom: string[];
    notCovered: { case: string; alternative?: string }[];
    assumptions: string[];
    cantonsCovered: string[]; // VD, GE, VS, FR, NE, JU
    referenceYear: number;
  };

  fields: FieldDefinition[];
  engine: string; // chemin dans lib/calculations/
  sourceIds: string[]; // alimente /methodologie/ et le test d'attribution
  variants: string[];
  faq: { question: string; answer: string }[];

  monetization?: {
    type: "lead" | "affiliate" | "none";
    trigger?: string; // condition sur le résultat. Le partenaire est déterminé
    //                   côté serveur, jamais déclaré ici (R6)
  };
};
```

Deux tests en découlent : **chaque calculateur déclare au moins une entrée `notCovered`
avec une alternative** — impossible de laisser un utilisateur hors périmètre dans une
impasse — et **chaque `sourceId` déclaré existe au registre**, avec son texte
d'attribution affiché s'il est requis. La rigueur devient exécutable.

---

## 3. Rendu et interactivité

| Cas                                | Technique                       | Poids             |
| ---------------------------------- | ------------------------------- | ----------------- |
| Calculateur (tous, sans exception) | `<script>` vanilla dans la page | 0 kb de framework |
| Sélecteur de commune               | `<input list>` + `<datalist>`   | 0 kb              |
| Comparatif, tableau                | `<table>` rendu au build        | 0 kb              |

**Aucun framework d'interface.** Ni React, ni Preact, ni Vue, ni Svelte, ni îlot
hydraté. L'inventaire réel du site est de huit composants, dont six ne demandent aucun
JavaScript : les éléments HTML natifs fournissent gratuitement l'accessibilité clavier
et la compatibilité avec les lecteurs d'écran — précisément le problème que résolvent
les bibliothèques de composants, et que nous n'avons pas.

Budget de performance, vérifié en CI : LCP < 1,5 s en 4G simulée, moins de 30 kb de JS
par page (minifié, non compressé, préchargement compris), polices auto-hébergées, **aucune requête vers un domaine tiers**.

Un script chargé à la demande, déclenché par une action de l'utilisateur, a son propre budget
de 30 000 octets et ne compte pas dans celui de la page. Le code qui le charge, lui, compte dans
la page (décision du 05.10.2026, W08 étape 0).

---

## 4. Mise en relation

`functions/api/lead.ts` et `functions/api/lead/match.ts` — Pages Functions sans état,
sans base de données. Règles inscrites dans l'architecture, pas laissées au jugement du
moment :

- Le résultat du calcul s'affiche **toujours en entier avant** toute proposition.
- Le formulaire est facultatif, jamais un mur, jamais une fenêtre surgissante.
- Il n'apparaît que si `monetization.trigger` est satisfait **et** si un partenaire
  couvre la situation — sinon il ne s'affiche pas du tout.
- Consentement explicite par case non pré-cochée, finalité annoncée, partenaire **nommé
  à l'écran avant l'envoi** — nLPD.
- Un seul partenaire par lead, exclusivité garantie par construction : pour une
  combinaison calculateur × commune × type de projet, il existe au plus un partenaire
  actif, et un test refuse tout chevauchement.
- La table de routage ne quitte jamais le serveur ; `lead/match.ts` ne renvoie que
  `partnerId`, `displayName` et `privacyPolicyUrl`. `lead.ts` **recalcule** la
  correspondance et rejette une demande dont le partenaire ne correspond pas.
- Prix, durée d'essai et conditions de résiliation ne sont **jamais déployés** : ils
  restent dans `PARTNERS.md` et les contrats.
- Un test `no-leak`, exécuté après la construction, échoue si une adresse de partenaire,
  un identifiant ou le nom du fichier de routage apparaît dans `dist/`.

---

## 5. Mesure

| Outil                    | Usage                                                                             | Cookies |
| ------------------------ | --------------------------------------------------------------------------------- | ------- |
| Cloudflare Web Analytics | trafic, pages, référents — activé depuis le projet Pages, pas par un script collé | aucun   |
| Google Search Console    | requêtes, positions, indexation — propriété de type **Domaine**, validée par TXT  | —       |
| Bing Webmaster Tools     | idem, plus IndexNow via Crawler Hints                                             | —       |

Aucun cookie de suivi, donc **aucune bannière de consentement**. Meilleure expérience, meilleure
conversion, conformité nLPD triviale, et un argument commercial pour le white-label
auprès des fiduciaires.

---

## 6. Contenu éditorial

```ts
// src/content/config.ts
const articles = defineCollection({
  schema: z.object({
    title: z.string(), // FRANÇAIS
    description: z.string(), // FRANÇAIS
    family: z.enum(["pension", "property", "energy", "business"]),
    publishedOn: z.date(),
    updatedOn: z.date(),
    relatedCalculators: z.array(z.string()).min(1), // ≥ 1 obligatoire
    sources: z
      .array(z.object({ name: z.string(), url: z.string().url() }))
      .min(2),
    reviewedBy: z.string().optional(),
    faq: z.boolean().default(false),
  }),
});
```

Contraintes de schéma, donc vérifiées au build : au moins un calculateur lié, au moins
deux sources. Un article qui ne mène nulle part ne peut pas être publié.
Route : `/{famille}/guides/{slug}/`.

---

## 7. Périmètre année 1

52 heures disponibles. Ce qui est construit :

| Ordre | Calculateur                 | URL                                        | Semaines |
| ----- | --------------------------- | ------------------------------------------ | -------- |
| 1     | Rachat 3a rétroactif        | `/prevoyance/rachat-3a-retroactif/`        | 6        |
| 2     | Économie d'impôt 3a         | `/prevoyance/economie-impot-3a/`           | 8        |
| 3     | Rachat LPP                  | `/prevoyance/rachat-lpp/`                  | 9        |
| 4     | Retrait en capital LPP/3a   | `/prevoyance/retrait-capital-lpp-3a/`      | 11–12    |
| 5     | Suppression valeur locative | `/immobilier/suppression-valeur-locative/` | 13–14    |
| 6     | Rénover avant la réforme    | `/immobilier/renover-avant-la-reforme/`    | 16–17    |
| 7     | Amortir ou investir         | `/immobilier/amortir-ou-investir/`         | 18       |
| 8     | Capacité d'achat            | `/immobilier/capacite-achat/`              | 19       |
| 9     | Subventions rénovation      | `/energie/subventions-renovation/`         | 21–23    |
| 10    | Pompe à chaleur sur 15 ans  | `/energie/pompe-a-chaleur/`                | 24–25    |
| 11    | Photovoltaïque              | `/energie/photovoltaique/`                 | 26 → M7  |

**Ce qui n'est PAS construit en année 1**, et pourquoi — cette liste vaut la précédente :

| Écarté                                            | Raison                                                                                   |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Salaire brut → net (et variantes IS / frontalier) | Requête la plus disputée, visiteur le moins monétisable                                  |
| Pages d'impôt cantonal (`impot-vaud`, etc.)       | Les simulateurs officiels sont gratuits et font autorité. Le moteur reste, les pages non |
| Épargne, intérêts composés, inflation             | Mathématiques universelles, aucune barrière, concurrence mondiale                        |
| Assurances LAMal                                  | Domaine de comparis et des courtiers, budgets sans commune mesure                        |
| Allocations, chômage, APG, pourboire              | Volume correct, valeur commerciale nulle                                                 |
| Cantons alémaniques                               | Après validation du modèle en romand                                                     |

Le backlog complet reste dans le catalogue v2 et dans le fichier articles v1,
requalifiés en **réserve stratégique années 2 à 5**.

**Échéance externe : 31 décembre 2028**, fin du régime fiscal actuel du logement. Le
calculateur « Rénover avant la réforme » est périssable et porte un compte à rebours
daté.

---

## 8. Conventions

| Élément                          | Convention                                    | Exemple                                      |
| -------------------------------- | --------------------------------------------- | -------------------------------------------- |
| Fichiers et dossiers de code     | `kebab-case`, **anglais**                     | `pillar-3a-buyback.ts`                       |
| Types et composants              | `PascalCase`, **anglais**                     | `ScopeNotice.astro`                          |
| Fonctions et variables           | `camelCase`, **anglais**                      | `computeTaxSavingOnDeduction()`              |
| Clés de données                  | `camelCase`, **anglais**                      | `pillar3aEmployeeCap`                        |
| Fichiers de pages (`src/pages/`) | `kebab-case`, **français** (deviennent l'URL) | `rachat-3a-retroactif.astro`                 |
| URL publiques                    | `kebab-case`, **français**                    | `/prevoyance/rachat-3a-retroactif/`          |
| Ids de calculateur               | `family.name`, **anglais**                    | `pension.pillar-3a-buyback`                  |
| Ids de source                    | `kebab-case`, acronymes officiels conservés   | `opp3-art-7a`, `vd-li`                       |
| Chaînes d'interface              | **français**, dans `src/i18n/fr.ts`           | —                                            |
| Messages de commit               | **anglais**, préfixés de la semaine           | `W06 - publish pillar-3a buyback calculator` |
| Variables CSS                    | tokens `@theme` dans `tokens.css`             | `--color-accent`                             |

**Toutes les chaînes d'interface dans `src/i18n/fr.ts` dès le jour 1.** Ça ne coûte
presque rien maintenant et rend l'extension alémanique mécanique plus tard. Ne pas
construire le routage multilingue tant que la décision n'est pas prise.

---

## 9. Configuration

```js
// astro.config.mjs
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwind from "@astrojs/tailwind";

export default defineConfig({
  site: "https://calculateurs.ch", // apex, sans www
  output: "static",
  integrations: [
    sitemap({ changefreq: "monthly", lastmod: new Date() }),
    tailwind(),
  ],
  build: { format: "directory" },
  prefetch: false,
});
```

```jsonc
// scripts npm
{
  "prebuild": "tsx scripts/fetch-private-data.ts",
  "pretest": "tsx scripts/fetch-private-data.ts",
  "test": "vitest run",
  "postbuild": "vitest run tests/leads/no-leak.test.ts",
  "verify-data": "tsx scripts/verify-data.ts",
  "new-year": "tsx scripts/new-year.ts",
  "predeploy": "npm run test && astro check",
}
```

Dépendances : `astro@5`, `@astrojs/sitemap`, `@astrojs/tailwind`, `tailwindcss@4`,
`@fontsource/figtree`, `zod`, `vitest`, `tsx`,
`@astrojs/check`, `typescript`, `@astrojs/mdx` (composants Astro dans les articles
(figures, tableaux générés depuis src/data/)). **Ni `@astrojs/preact`, ni `preact`, ni aucune
bibliothèque de composants.**

Node.js : **24.21.0** (LTS), fixé par `.node-version`, la même version en local et pour la
construction sur Cloudflare Pages. Sur Cloudflare (`CF_PAGES=1`),
`tests/environment/node-version.test.ts` fait échouer la construction si une autre version tourne.

---

## 10. Séparation des responsabilités

```
src/data/             → faits sourcés et datés. Aucune logique.
src/lib/calculations/ → formules pures. Aucun import Astro, aucun accès direct aux JSON.
src/calculators/      → définitions déclaratives : périmètre, champs, FAQ, monétisation.
src/components/       → rendu uniquement.
src/pages/            → assemblage. Noms de fichiers en français (ils deviennent l'URL).
functions/            → exécution sans état de ce qui ne peut pas être statique.
```

Règle de dépendance, testable : `lib/calculations/` reçoit ses barèmes **en argument**,
il ne les importe jamais lui-même. Chaque fonction de calcul est donc testable avec des
valeurs fictives, et rejouable sur n'importe quelle année.

```ts
// ✅
export function computePillar3aTaxSaving(
  amount: number,
  scales: TaxScales,
): Result;

// ❌
import rates2026 from "../../data/federal/2026.json";
```

Règle d'accès aux données privées : **aucun fichier de `src/pages/` ni de
`src/components/` n'importe `src/data/private/partners/`.** Seules les fonctions de
`functions/` y accèdent.

---

## 11. Journal des décisions

| #   | Décision                                                                     | Motif                                                                                                                |
| --- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 1   | Pas de pages d'impôt cantonal                                                | Impossible de battre les simulateurs officiels ; le moteur suffit                                                    |
| 2   | 6 cantons romands, pas 26                                                    | Divise le travail de données par 4, permet le niveau communal                                                        |
| 3   | **Aucun framework d'interface** (remplace « Preact plutôt que React »)       | Huit composants, dont six sans JavaScript. Le budget de 30 kb et les éléments natifs rendent tout framework superflu |
| 4   | Pages Functions limitées et sans état                                        | Le routage de lead ne peut pas être statique ; la protection de la table de subventions non plus                     |
| 5   | Aucun cookie de suivi                                                        | Pas de bannière, conformité nLPD triviale, argument white-label                                                      |
| 6   | Fraîcheur des données bloquante au build                                     | Le seul défaut fatal serait un chiffre périmé affiché avec assurance                                                 |
| 7   | i18n préparé, non implémenté                                                 | Coût quasi nul maintenant, coût élevé plus tard                                                                      |
| 8   | Périmètre déclaré structuré et non textuel                                   | Alimente 4 usages, et devient vérifiable par test                                                                    |
| 9   | Code en anglais, contenu en français, frontière stricte                      | Une base à moitié traduite est pire que l'une ou l'autre convention. Les URL restent françaises : c'est du contenu   |
| 10  | **Deux revenus imposables en entrée du moteur**                              | LHID art. 1 al. 3 et art. 9 : les montants des déductions restent cantonaux                                          |
| 11  | **Économie d'impôt par différence de deux impôts**, jamais par taux marginal | Une déduction de plusieurs milliers de francs franchit des seuils qu'une dérivée ne voit pas                         |
| 12  | **Deux classes de données** (R6), dépôt privé injecté à la construction      | Les subventions communales sont le seul actif réellement coûteux à reconstituer                                      |
| 13  | **Apex canonique**, `www` redirigé en 301                                    | Cloudflare aplatit le CNAME ; le nom se dicte mieux au téléphone                                                     |
| 14  | **Import par exports manuels** de l'AFC, aucun appel programmatique          | Réponse écrite de l'AFC : consultation par l'interface web uniquement                                                |
| 15  | **Tests avant code** sur le moteur, et tests immuables (R7)                  | Piloter une IA par la spécification plutôt que par la relecture                                                      |
| 16  | **Année de calcul résolue par calculateur à la date de construction, repli annoncé** | Déposer 2027.json faisait passer A1 en 2027 avec des barèmes cantonaux 2026 (04.10.2026) |

---

## Développement

Serveur de dev en mode arrière-plan :

```
astro dev --background
```

Gestion : `astro dev stop`, `astro dev status`, `astro dev logs`.
Documentation complète : https://docs.astro.build

---

## Design system

La spécification complète fait autorité et est chargée automatiquement dans chaque session
Claude Code par l'import ci-dessous. Palette « marine et sapin » propre au site.

@docs/design-system.md

Rappel des règles non négociables (le détail est dans le fichier importé) :

- Toute valeur de couleur, taille, graisse, espacement, rayon ou ombre vient de
  `src/styles/tokens.css` (bloc `@theme`). Aucune valeur arbitraire Tailwind, aucune couleur de
  la palette par défaut (désactivée). Token manquant → l'ajouter à `tokens.css`, le documenter
  dans `docs/design-system.md` et me le signaler. `tests/design/design-tokens.test.ts` le vérifie.
- Une seule famille, Figtree 500/700, auto-hébergée via Fontsource. Aucune requête tierce.
- Une couleur, un rôle : `accent` (sapin) pour le résultat, les liens et l'action principale ;
  `error` (rouge) pour les erreurs seulement ; `warning` (orange) pour les avertissements
  renforcés seulement. Le gain ou la perte se dit en mots, jamais par la couleur.
- Le résultat du calcul est l'élément le plus grand et le plus contrasté de la page.
- Logo : composants de `src/assets/brand/`, jamais recomposé en texte ni modifié (§ 1.5).
- Éléments HTML natifs, aucun framework ni bibliothèque de composants ; < 30 ko de JS par page,
  < 100 ko de CSS, LCP < 1,5 s en 4G simulée ; contraste AA, focus visible, 320 px minimum.
- Avant de livrer une interface : relire la section concernée de `docs/design-system.md` et
  lancer `npx vitest run tests/design`.
