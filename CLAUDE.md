# calculateurs.ch — Instructions du projet

Ce fichier fait autorité. Il contient (1) les règles absolues (R1–R5), (2) la
convention de nommage et son glossaire, (3) le document d'architecture v2 intégral.
Toute décision technique doit s'y conformer.

---

## Règles absolues

Ces cinq règles priment sur toute autre considération. Aucune exception sans
accord explicite du mainteneur.

### R1 — Aucun back-end, aucune base de données, aucun compte utilisateur

Le site est statique par défaut. Pas de base de données, pas d'authentification,
pas de comptes utilisateurs. **Seule exception autorisée :** la Pages Function
sans état `functions/api/lead.ts`, dédiée au routage des leads (valide, formate,
transmet au partenaire, renvoie 200 — rien n'est stocké côté serveur).

### R2 — Aucune valeur chiffrée dans le code

Aucune valeur brute (barème, plafond, taux, seuil, coût de référence, tarif…)
n'apparaît dans le code. Tout vit dans `src/data/`, enveloppé dans le type
`Value<T>`, avec au minimum une **source** (`sourceId` présent dans
`src/data/sources.ts`) et une **date de vérification** (`verifiedOn`). Une valeur
sans source ni date ne peut pas entrer dans le dépôt. Les fonctions de
`src/lib/calculations/` reçoivent leurs barèmes **en argument** et ne les importent
jamais elles-mêmes.

### R3 — On n'invente jamais une valeur chiffrée

Si une valeur chiffrée manque, on ne la déduit pas, on ne l'estime pas, on ne la
copie pas de mémoire. On crée une entrée `TODO` explicite dans le fichier
`src/data/` concerné (valeur marquée, `sourceId` à renseigner, `verifiedOn` vide)
**et on demande au mainteneur de relever la valeur** à sa source officielle. Le
travail dépendant de cette valeur reste bloqué jusqu'à ce qu'elle soit fournie.

### R4 — Chaque fonction de calcul retourne une trace ligne par ligne

Toute fonction de `src/lib/calculations/` retourne, en plus de son résultat, une
**trace du calcul ligne par ligne** (`breakdown` : chaque étape a un libellé,
ses opérande(s), l'opération, le résultat intermédiaire et l'hypothèse retenue).
Cette trace alimente le composant `Breakdown.astro`. Un résultat non traçable est
un bug.

### R5 — Le code en anglais, le contenu en français

Tout identifiant de code — fichiers, dossiers, types, fonctions, variables, clés
de données, tests, messages de commit — est en anglais, en `camelCase` pour les
identifiants et en `kebab-case` pour les noms de fichiers. Tout contenu destiné à
l'utilisateur — URL publiques, titres, libellés, textes — est en français et
passe par `src/i18n/fr.ts`. **Ne traduis jamais une URL en anglais.** Utilise le
glossaire de la section suivante sans jamais inventer de synonyme. Détail complet
et exceptions : **§ Convention de nommage** ci-dessous.

---

## Convention de nommage — le code en anglais, le contenu en français

**Règle :** tout ce que lit une machine est en anglais, tout ce que lit un
visiteur est en français. Cette frontière est stricte et ne souffre aucune
exception, parce qu'une base de code à moitié traduite est pire que l'une ou
l'autre convention prise seule : personne, ni toi ni l'IA, ne se souvient de quel
côté se trouve un fichier donné.

| En anglais — lu par la machine | En français — lu par un humain |
| --- | --- |
| Noms de dossiers et de fichiers du code | URL publiques : `/prevoyance/rachat-3a-retroactif/` |
| Noms de types, fonctions, variables, composants | Titres, textes, intitulés de champs, FAQ |
| Clés des fichiers de données (`pillar3aEmployeeCap`) | Valeurs des chaînes dans `src/i18n/fr.ts` |
| Noms des tests et des scripts | Documents de pilotage : `DECISIONS.md`, `JOURNAL.md` |
| Messages de commit Git | Contenu des articles |
| Commentaires dans le code | Ce plan, la méthodologie, la politique de confidentialité |

**Le point à ne pas rater : les URL restent en français.** Elles sont du contenu,
pas du code. `/prevoyance/rachat-3a-retroactif/` contient tes mots-clés et
s'affiche dans les résultats de recherche ; `/pension/pillar-3a-buyback/` te
coûterait du référencement et de la crédibilité auprès d'un lecteur romand. Le
fichier peut donc s'appeler `src/calculators/pension/pillar-3a-buyback.ts` tout en
produisant une URL française — c'est la définition du calculateur qui porte le
slug.

> Cas particulier `src/pages/` : en routage par fichier Astro, le nom du fichier
> **devient** le segment d'URL. Les fichiers de `src/pages/` sont donc nommés en
> **français** (`rachat-3a-retroactif.astro`) — ils sont du contenu, pas du code.
> Tout le reste de `src/` suit la règle anglaise.

### Glossaire de référence

À conserver ici pour que l'IA nomme toujours de la même façon. Ne jamais inventer
de synonyme.

| Domaine | Français | Anglais retenu |
| --- | --- | --- |
| Calculateur | calculateur | `calculator` |
| Prévoyance | prévoyance | `pension` |
| Immobilier | immobilier | `property` |
| Énergie | énergie | `energy` |
| Entreprise | entreprise | `business` |
| 3e pilier | 3a | `pillar3a` / `pillar-3a` |
| Rachat | rachat | `buyback` |
| Lacune de cotisation | lacune | `contributionGap` |
| Retrait en capital | retrait en capital | `capitalWithdrawal` |
| Valeur locative | valeur locative | `imputedRentalValue` |
| Subvention | subvention | `subsidy` |
| Barème | barème | `taxScale` |
| Coefficient / centimes additionnels | coefficient communal | `municipalMultiplier` |
| Commune | commune | `municipality` |
| Périmètre déclaré | périmètre | `scope` |
| Trace du calcul | trace | `breakdown` |
| Fraîcheur des données | fraîcheur | `freshness` |

### Deux exceptions assumées

1. **Les acronymes d'institutions et de textes légaux restent en français**, parce
   que ce sont des noms propres, pas des mots à traduire :
   `sourceId: "ofas-pillar-3a-caps"`, `"estv-tax-calculator"`, `"opp3-art-7a"`,
   `"lifd-art-36"`.
2. **Les codes de cantons restent les abréviations officielles :**
   `VD`, `GE`, `VS`, `FR`, `NE`, `JU`.

### Le type central

```ts
// src/data/schema.ts
export type Value<T> = {
  value: T;
  unit?: string;
  sourceId: string;
  verifiedOn: string;    // ISO 8601
  effectiveFrom: string; // ISO 8601
};
```

### Formulation à garder pour l'IA

> Convention de nommage stricte : tout identifiant de code — fichiers, dossiers,
> types, fonctions, variables, clés de données, tests, messages de commit — est en
> anglais, en `camelCase` pour les identifiants et en `kebab-case` pour les noms de
> fichiers. Tout contenu destiné à l'utilisateur — URL publiques, titres,
> libellés, textes — est en français et passe par `src/i18n/fr.ts`. Ne traduis
> jamais une URL en anglais. Utilise le glossaire ci-dessus sans jamais inventer
> de synonyme.

### Portée sur le document d'architecture ci-dessous

Le document d'architecture v2 a été rédigé avec la convention de nommage
appliquée : dossiers, types, fonctions, clés de données et tests y sont en
anglais ; seuls les fichiers de `src/pages/`, les URL et les textes affichés
restent en français. En cas de contradiction résiduelle, **cette section prime**.

---

# Architecture — calculateurs.ch (Astro.js) — **v2**

> **Ce qui change par rapport à la v1**
>
> 1. **La couche de données devient le cœur du projet**, pas un détail. Chaque valeur
>    est versionnée, sourcée, datée et testée. C'est la barrière à l'entrée.
> 2. **Nouvelle famille `/energie/`** — subventions, pompe à chaleur, photovoltaïque.
>    Absente de la v1, c'est la plus rentable.
> 3. **Le moteur fiscal cantonal devient une bibliothèque, pas des pages.**
>    On ne publie pas `/impots/impot-vaud/` : on ne bat pas les simulateurs officiels.
>    Le moteur sert les calculateurs de prévoyance et d'immobilier.
> 4. **Le périmètre déclaré devient une donnée structurée**, pas un texte libre.
>    Il alimente le bandeau, les liens de variantes, la FAQ et le JSON-LD.
> 5. **Périmètre année 1 explicite** : 8 calculateurs, pas 68. Le reste est un backlog.
> 6. **Capture de lead et suivi de fraîcheur** intégrés à l'architecture.
>
> Version : 2.0 — Cible : Astro 5.x — Déploiement : Cloudflare Pages

---

## Principes directeurs

**P1 — La donnée est le produit, la page n'est que l'interface.**
Le jour où l'on détient le seul jeu de données romand à jour sur les subventions
communales et les tarifs de reprise, on peut le vendre en licence, l'exposer en API,
l'embarquer chez des partenaires et publier un baromètre annuel. Les pages web ne
sont qu'une sortie parmi d'autres. Toute décision technique se tranche en faveur de
la qualité et de la traçabilité de la donnée.

**P2 — Aucune donnée sans source ni date de vérification.**
Une valeur sans `sourceId` et `verifiedOn` ne peut pas entrer dans le dépôt.
Un test de build échoue si une donnée n'a pas été vérifiée depuis plus de 12 mois.

**P3 — Statique par défaut.**
Pas de base de données, pas de comptes utilisateurs, pas d'authentification.
Une seule exception autorisée : une Pages Function sans état pour le routage des leads.

**P4 — Montrer le calcul.**
Chaque résultat est accompagné du détail ligne par ligne et des hypothèses retenues.
C'est ce qui distingue le site des formulaires à devis déguisés et ce qui le rend citable.

**P5 — Le périmètre est annoncé avant la saisie, jamais après.**
Bandeau au-dessus du formulaire : pour qui, ce que ça ne couvre pas, quelles hypothèses.

---

## Structure du projet

```
calculateurs.ch/
│
├── public/
│   ├── favicon.svg
│   ├── robots.txt
│   └── og/                              ← images Open Graph par famille
│
├── scripts/
│   ├── verify-data.ts                   ← rapport de fraîcheur (CI + manuel)
│   └── new-year.ts                      ← duplique federal/YYYY.json pour révision
│
├── src/
│   │
│   ├── data/                            ★ CŒUR DU PROJET
│   │   ├── schema.ts                    ← types + validation zod
│   │   ├── sources.ts                   ← registre central des sources officielles
│   │   ├── index.ts                     ← accès typé, résolution par année
│   │   │
│   │   ├── federal/
│   │   │   ├── 2025.json                ← AVS/AI/APG, AC, LPP, 3a, TVA, IFD
│   │   │   └── 2026.json
│   │   │
│   │   ├── cantons/                     ← 6 cantons romands d'abord. Pas 26.
│   │   │   ├── vd.json                  ← barème revenu, fortune, gains immo,
│   │   │   ├── ge.json                    prestation en capital, valeur locative
│   │   │   ├── vs.json
│   │   │   ├── fr.json
│   │   │   ├── ne.json
│   │   │   └── ju.json
│   │   │
│   │   ├── municipalities/
│   │   │   ├── multipliers.json         ← coefficient d'impôt communal
│   │   │   └── subsidies.json           ← aides communales à la rénovation
│   │   │
│   │   └── energy/
│   │       ├── subsidies.json           ← Programme Bâtiments + cantonal + Pronovo
│   │       ├── feed-in-tariffs.json     ← par gestionnaire de réseau
│   │       └── reference-costs.json     ← fourchettes PAC / PV / isolation
│   │
│   ├── lib/
│   │   ├── calculations/                ← logique pure, zéro import Astro
│   │   │   ├── income-tax.ts            ← MOTEUR : taux marginal, canton + commune
│   │   │   ├── pension/
│   │   │   │   ├── pillar-3a-buyback.ts
│   │   │   │   ├── lpp-buyback.ts
│   │   │   │   └── capital-withdrawal.ts
│   │   │   ├── property/
│   │   │   │   ├── imputed-rental-value.ts
│   │   │   │   ├── renovation-tax.ts
│   │   │   │   ├── amortization.ts
│   │   │   │   └── purchase-capacity.ts
│   │   │   ├── energy/
│   │   │   │   ├── subsidies.ts
│   │   │   │   ├── heat-pump.ts
│   │   │   │   └── photovoltaic.ts
│   │   │   └── business/
│   │   │       └── employer-cost.ts
│   │   │
│   │   └── utils/
│   │       ├── format-chf.ts
│   │       ├── round.ts
│   │       ├── breakdown.ts             ← construit le détail du calcul affichable
│   │       └── period.ts                ← résolution de l'année fiscale applicable
│   │
│   ├── calculators/                     ★ DÉFINITIONS DÉCLARATIVES
│   │   ├── types.ts
│   │   ├── pension/
│   │   │   ├── pillar-3a-buyback.ts     ← périmètre, champs, moteur, variantes, FAQ
│   │   │   └── pillar-3a-tax-saving.ts
│   │   ├── property/
│   │   ├── energy/
│   │   └── business/
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.astro
│   │   │   ├── Footer.astro
│   │   │   ├── Breadcrumb.astro
│   │   │   └── FamilyNav.astro
│   │   ├── calculator/
│   │   │   ├── Shell.astro              ← titre, intro, périmètre, formulaire, résultat
│   │   │   ├── ScopeBanner.astro        ★ bandeau, alimenté par la définition
│   │   │   ├── Breakdown.astro          ★ le calcul ligne par ligne
│   │   │   ├── ResultCard.astro
│   │   │   ├── DataFreshness.astro      ★ "barèmes 2026, vérifiés le 12.01.2026"
│   │   │   ├── RelatedVariants.astro
│   │   │   └── fields/
│   │   │       ├── Number.astro
│   │   │       ├── Select.astro
│   │   │       ├── Canton.astro
│   │   │       └── Municipality.tsx     ← island Preact (autocomplétion ~300 entrées)
│   │   ├── conversion/
│   │   │   ├── Lead.astro               ★ mise en relation partenaire, jamais bloquant
│   │   │   └── Newsletter.astro
│   │   ├── editorial/
│   │   │   ├── CalculatorCta.astro
│   │   │   ├── TableOfContents.astro
│   │   │   └── Sources.astro
│   │   └── seo/
│   │       ├── SchemaCalculator.astro
│   │       ├── SchemaArticle.astro
│   │       ├── SchemaFaq.astro
│   │       └── SchemaBreadcrumb.astro
│   │
│   ├── layouts/
│   │   ├── BaseLayout.astro
│   │   ├── FamilyLayout.astro
│   │   ├── CalculatorLayout.astro
│   │   └── ArticleLayout.astro
│   │
│   ├── content/
│   │   ├── config.ts                    ← collections typées
│   │   └── articles/
│   │       ├── pension/
│   │       ├── property/
│   │       ├── energy/
│   │       └── business/
│   │
│   ├── i18n/
│   │   └── fr.ts                        ← toutes les chaînes UI, dès le jour 1
│   │
│   └── pages/                           ← noms de fichiers en FRANÇAIS : ils deviennent l'URL
│       ├── index.astro
│       ├── methodologie.astro           ★ sources, formules, politique de MAJ
│       ├── donnees.astro                ★ état de fraîcheur public, page à liens
│       │
│       ├── prevoyance/
│       │   ├── index.astro
│       │   ├── rachat-3a-retroactif.astro
│       │   ├── economie-impot-3a.astro
│       │   ├── rachat-lpp.astro
│       │   ├── retrait-capital-lpp-3a.astro
│       │   └── guides/[slug].astro
│       │
│       ├── immobilier/
│       │   ├── index.astro
│       │   ├── suppression-valeur-locative.astro
│       │   ├── renover-avant-la-reforme.astro
│       │   ├── amortir-ou-investir.astro
│       │   ├── capacite-achat.astro
│       │   ├── gains-immobiliers.astro
│       │   ├── frais-notaire.astro
│       │   └── guides/[slug].astro
│       │
│       ├── energie/
│       │   ├── index.astro
│       │   ├── subventions-renovation.astro
│       │   ├── pompe-a-chaleur.astro
│       │   ├── photovoltaique.astro
│       │   ├── isolation.astro
│       │   └── guides/[slug].astro
│       │
│       └── entreprise/
│           ├── index.astro
│           ├── cout-employeur.astro
│           ├── independant-ri-sarl.astro
│           └── guides/[slug].astro
│
├── functions/
│   └── api/lead.ts                      ← Pages Function, sans état, seule exception à P3
│
├── tests/
│   ├── calculations/                    ← cas de référence par calculateur
│   ├── data/                            ← fraîcheur + conformité de schéma
│   └── regression/                      ← instantanés de résultats
│
├── astro.config.mjs
├── tsconfig.json
├── vitest.config.ts
└── package.json
```

---

## 1. La couche de données

### 1.1 Le type `Value<T>`

Aucune valeur brute dans le dépôt. Tout est enveloppé :

```ts
// src/data/schema.ts
export type Value<T> = {
  value: T;
  unit?: string;
  sourceId: string;      // clé dans sources.ts
  verifiedOn: string;    // ISO 8601 — date de vérification humaine
  effectiveFrom: string; // ISO 8601
};
```

Exemple réel :

```jsonc
// src/data/federal/2026.json
{
  "year": 2026,
  "pillar3a": {
    "employeeCapWithLpp": {
      "value": 7258,
      "unit": "CHF",
      "sourceId": "ofas-pillar-3a-caps",
      "verifiedOn": "2026-01-08",
      "effectiveFrom": "2026-01-01"
    },
    "retroactiveBuyback": {
      "firstBuybackableGap": {
        "value": 2025,
        "sourceId": "opp3-art-7a",
        "verifiedOn": "2026-01-08",
        "effectiveFrom": "2026-01-01"
      },
      "windowYears": {
        "value": 10,
        "sourceId": "opp3-art-7a",
        "verifiedOn": "2026-01-08",
        "effectiveFrom": "2026-01-01"
      }
    }
  }
}
```

> Les lacunes antérieures à 2025 ne sont pas rachetables ; le rachat rétroactif est
> plafonné au même montant que le plafond annuel. Ces nuances se documentent dans
> la page méthodologie et, si besoin, dans un champ `note` du fichier de données.

### 1.2 Le registre des sources

```ts
// src/data/sources.ts
export const SOURCES = {
  "opp3-art-7a": {
    name: "OPP 3, art. 7a — rachats dans le pilier 3a",
    url: "https://www.fedlex.admin.ch/...",
    authority: "Confédération",
    cadence: "annual",
  },
  "vd-municipal-multipliers": {
    name: "Coefficients d'impôt communaux vaudois",
    url: "https://www.vd.ch/...",
    authority: "Canton de Vaud",
    cadence: "annual",
  },
  // ...
} as const;
```

Les clés de l'objet (`opp3-art-7a`) et les noms de champs (`name`, `url`,
`authority`, `cadence`) sont en anglais ; `name` et `authority` portent des libellés
français, ce sont des noms propres (voir exceptions § Convention de nommage).
Chaque `sourceId` référencé dans les données doit exister ici. Un test le vérifie.

### 1.3 Les tests de données

```
tests/data/
├── schema.test.ts       → tous les fichiers valident le schéma zod
├── sources.test.ts      → tout sourceId référencé existe dans SOURCES
├── freshness.test.ts    → aucune valeur non vérifiée depuis > 12 mois
└── coverage.test.ts     → les 6 cantons ont les mêmes clés obligatoires
```

`freshness.test.ts` échoue le build. C'est volontaire : le seul défaut fatal du site
serait d'afficher un chiffre périmé avec assurance. Passer en avertissement le jour où
ça devient trop pénible est une décision, pas un accident.

### 1.4 La page publique `/donnees/`

Génère automatiquement, depuis la couche de données, un tableau : donnée, valeur,
source, date de vérification, prochaine échéance. Trois effets :

- crédibilité immédiate auprès d'une fiduciaire ou d'un journaliste ;
- aimant à liens — les pages de données à jour se font citer ;
- discipline interne : la dette de fraîcheur devient publique.

### 1.5 Le rituel du 1er janvier

`npm run new-year` duplique `federal/2026.json` en `2027.json`, remet tous les
`verifiedOn` à zéro et sort la liste des valeurs à re-vérifier. C'est un avantage
concurrentiel : les gros sites mettent des semaines à mettre à jour leurs barèmes.
Un déploiement le 2 janvier capte trois semaines de trafic saisonnier.

---

## 2. La définition déclarative d'un calculateur

Le périmètre n'est plus du texte dans une page — c'est une donnée qui alimente
le bandeau, les liens de variantes, la FAQ, le JSON-LD et les tests.

```ts
// src/calculators/types.ts
export type CalculatorDefinition = {
  id: string;                    // "family.name" — ex. "pension.pillar-3a-buyback"
  family: "pension" | "property" | "energy" | "business";
  url: string;                   // slug FRANÇAIS — URL publique
  title: string;                 // FRANÇAIS — affiché
  metaDescription: string;       // FRANÇAIS — affiché

  scope: {
    forWhom: string[];           // FRANÇAIS → bandeau, bloc "Pour qui"
    notCovered: {                // FRANÇAIS → bandeau, bloc "Ce que ça ne couvre pas"
      case: string;
      alternative?: string;      // id d'un autre calculateur
    }[];
    assumptions: string[];       // FRANÇAIS → bandeau + page méthodologie
    cantonsCovered: string[];    // codes officiels : VD, GE, VS, FR, NE, JU
    referenceYear: number;
  };

  fields: FieldDefinition[];
  engine: string;                // chemin dans lib/calculations/
  variants: string[];            // ids de calculateurs liés
  faq: { question: string; answer: string }[];  // FRANÇAIS

  monetization?: {
    type: "lead" | "affiliate" | "none";
    partner?: string;
    trigger?: string;            // condition sur le résultat
  };
};
```

Bénéfice concret : un test vérifie que **chaque calculateur déclare au moins une
entrée `notCovered` avec une alternative**. Impossible de publier un outil qui laisse
un utilisateur hors périmètre dans une impasse. La rigueur de la v1 devient exécutable.

---

## 3. Rendu et interactivité

| Cas | Technique | Poids visé |
| --- | --- | --- |
| Calculateur simple (≤ 6 champs, calcul direct) | `<script>` vanilla dans la page | 0 kb JS framework |
| Sélecteur de commune (~300 entrées, autocomplétion) | Island **Preact** `client:visible` | ~4 kb |
| Comparateur multi-cantons, graphiques | Island Preact `client:visible` | ~4 kb + lib |

**Preact, pas React.** Même API, une fraction du poids, `@astrojs/preact` en une ligne
de config. Aucun calculateur du périmètre année 1 ne justifie React.

Budget de performance, vérifié en CI : LCP < 1,5 s en 4G simulée, moins de 30 kb de JS
par page, aucune police auto-hébergée au-dessus de 2 fichiers.

---

## 4. Capture de lead

`functions/api/lead.ts` — Cloudflare Pages Function, sans état, sans base de données :
valide, formate, transmet par e-mail ou webhook au partenaire, renvoie 200. Rien n'est
stocké côté serveur.

Règles inscrites dans l'architecture, pas laissées au jugement du moment :

- Le résultat du calcul s'affiche **toujours en entier avant** toute proposition de lead.
- Le formulaire est facultatif, jamais un mur, jamais une pop-up.
- Il n'apparaît que si `monetization.trigger` est satisfait
  (ex. : montant de travaux estimé > 15'000 CHF).
- Consentement explicite, finalité annoncée, partenaire nommé — nLPD.
- Un seul partenaire par lead. Pas de revente en cascade.

---

## 5. Mesure

| Outil | Usage | Cookies |
| --- | --- | --- |
| Cloudflare Web Analytics | Trafic, pages, référents | Aucun |
| Google Search Console | Requêtes, positions, indexation | — |
| Compteurs d'événements maison | Calcul lancé, lead envoyé | Aucun |

Aucun cookie tiers, donc **aucune bannière de consentement**. Meilleure expérience,
meilleure conversion, conformité nLPD triviale, et un argument commercial pour le
white-label auprès des fiduciaires.

---

## 6. Contenu éditorial

```ts
// src/content/config.ts
const articles = defineCollection({
  schema: z.object({
    title: z.string(),           // FRANÇAIS
    description: z.string(),      // FRANÇAIS
    family: z.enum(["pension", "property", "energy", "business"]),
    publishedOn: z.date(),
    updatedOn: z.date(),
    relatedCalculators: z.array(z.string()).min(1),   // ≥ 1 obligatoire
    sources: z.array(z.object({ name: z.string(), url: z.string().url() })).min(2),
    reviewedBy: z.string().optional(),                // fiduciaire / conseiller
    faq: z.boolean().default(false),
  }),
});
```

Contraintes de schéma, donc vérifiées au build : au moins un calculateur lié, au moins
deux sources. Un article qui ne mène nulle part ne peut pas être publié.

Route : `/{family}/guides/{slug}/`, où `{family}` se résout en son segment d'URL
français (`prevoyance`, `immobilier`, `energie`, `entreprise`).

---

## 7. Périmètre année 1

52 heures disponibles. Ce qui est construit :

| Ordre | Calculateur | URL | Semaines |
| --- | --- | --- | --- |
| 1 | Rachat 3a rétroactif | `/prevoyance/rachat-3a-retroactif/` | 5–6 |
| 2 | Économie d'impôt 3a | `/prevoyance/economie-impot-3a/` | 8 |
| 3 | Rachat LPP | `/prevoyance/rachat-lpp/` | 9 |
| 4 | Retrait en capital LPP/3a | `/prevoyance/retrait-capital-lpp-3a/` | 11–12 |
| 5 | Suppression valeur locative | `/immobilier/suppression-valeur-locative/` | 13–14 |
| 6 | Rénover avant la réforme | `/immobilier/renover-avant-la-reforme/` | 16–17 |
| 7 | Amortir ou investir | `/immobilier/amortir-ou-investir/` | 18 |
| 8 | Subventions rénovation | `/energie/subventions-renovation/` | 21–23 |
| 9 | Pompe à chaleur sur 15 ans | `/energie/pompe-a-chaleur/` | 24–25 |

**Ce qui n'est PAS construit en année 1**, et pourquoi — cette liste vaut la précédente :

| Écarté | Raison |
| --- | --- |
| Salaire brut → net (et variantes IS / frontalier) | Requête la plus disputée, visiteur le moins monétisable |
| Pages d'impôt cantonal (`impot-vaud`, etc.) | Les simulateurs officiels sont gratuits et font autorité. Le moteur reste, les pages non |
| Épargne, intérêts composés, inflation | Mathématiques universelles, aucune barrière, concurrence mondiale |
| Assurances LAMal | Domaine de comparis et des courtiers, budgets sans commune mesure |
| Allocations, chômage, APG, pourboire | Volume correct, valeur commerciale nulle |
| Cantons alémaniques | Après validation du modèle en romand |

Le backlog complet reste dans le catalogue v2 et dans le fichier articles v1,
requalifiés en **réserve stratégique années 2 à 5**.

---

## 8. Conventions

| Élément | Convention | Exemple |
| --- | --- | --- |
| Fichiers et dossiers de code | `kebab-case`, **anglais** | `pillar-3a-buyback.ts` |
| Types et composants | `PascalCase`, **anglais** | `ScopeBanner.astro` |
| Fonctions et variables | `camelCase`, **anglais** | `calculateContributionGap()` |
| Clés de données | `camelCase`, **anglais** | `pillar3aEmployeeCap` |
| Fichiers de pages (`src/pages/`) | `kebab-case`, **français** (deviennent l'URL) | `rachat-3a-retroactif.astro` |
| URL publiques | `kebab-case`, **français** | `/prevoyance/rachat-3a-retroactif/` |
| Ids de calculateur | `family.name`, **anglais** | `pension.pillar-3a-buyback` |
| Chaînes d'interface | **français**, dans `src/i18n/fr.ts` | — |
| Messages de commit | **anglais** | `add pillar-3a retroactive buyback engine` |
| Variables CSS | `--calc-{name}` | `--calc-accent` |

**Toutes les chaînes d'interface dans `src/i18n/fr.ts` dès le jour 1.** Ça ne coûte
presque rien maintenant et rend l'extension alémanique mécanique plus tard. Ne pas
construire le routage multilingue tant que la décision n'est pas prise.

---

## 9. Configuration

```js
// astro.config.mjs
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import preact from "@astrojs/preact";

export default defineConfig({
  site: "https://calculateurs.ch",
  output: "static",
  integrations: [
    sitemap({ changefreq: "monthly", lastmod: new Date() }),
    preact({ compat: false }),
  ],
  build: { format: "directory" },
  prefetch: { prefetchAll: true, defaultStrategy: "viewport" },
});
```

```json
{
  "dependencies": {
    "astro": "^5.x",
    "@astrojs/preact": "^4.x",
    "preact": "^10.x"
  },
  "devDependencies": {
    "@astrojs/sitemap": "^3.x",
    "@astrojs/check": "^0.x",
    "typescript": "^5.x",
    "vitest": "^2.x",
    "zod": "^3.x"
  }
}
```

```jsonc
// scripts npm
{
  "verify-data": "tsx scripts/verify-data.ts",   // rapport de fraîcheur
  "new-year":    "tsx scripts/new-year.ts",       // rituel du 1er janvier
  "test":        "vitest run",
  "predeploy":   "npm run test && astro check"
}
```

---

## 10. Séparation des responsabilités

```
src/data/             → faits sourcés et datés. Aucune logique.
src/lib/calculations/ → formules pures. Aucun import Astro, aucun accès direct aux JSON.
src/calculators/      → définitions déclaratives : périmètre, champs, FAQ, monétisation.
src/components/        → rendu uniquement.
src/pages/             → assemblage. Noms de fichiers en français (ils deviennent l'URL).
```

Règle de dépendance, testable : `lib/calculations/` reçoit ses barèmes **en argument**,
il ne les importe jamais lui-même. Chaque fonction de calcul est donc testable avec
des valeurs fictives, et rejouable sur n'importe quelle année.

```ts
// ✅
export function calculatePillar3aTaxSaving(amount: number, rates: TaxRates): Result;

// ❌
import rates2026 from "../../data/federal/2026.json";
```

---

## 11. Journal des décisions

| # | Décision | Motif |
| --- | --- | --- |
| 1 | Pas de pages d'impôt cantonal | Impossible de battre les simulateurs officiels ; le moteur suffit |
| 2 | 6 cantons romands, pas 26 | Divise le travail de données par 4, permet le niveau communal |
| 3 | Preact plutôt que React | Aucun besoin justifiant 40 kb supplémentaires |
| 4 | Une seule Pages Function | Le routage de lead ne peut pas être statique ; rien d'autre ne le justifie |
| 5 | Aucun cookie | Pas de bannière, conformité nLPD triviale, argument white-label |
| 6 | Fraîcheur des données bloquante au build | Le seul défaut fatal serait un chiffre périmé affiché avec assurance |
| 7 | i18n préparé, non implémenté | Coût quasi nul maintenant, coût élevé plus tard |
| 8 | Périmètre déclaré structuré et non textuel | Alimente 4 usages, et devient vérifiable par test |
| 9 | Code en anglais, contenu en français, frontière stricte | Une base à moitié traduite est pire que l'une ou l'autre convention : personne ne retient de quel côté est un fichier. Les URL restent françaises, c'est du contenu |

---

## Développement

Serveur de dev en mode arrière-plan :

```
astro dev --background
```

Gestion : `astro dev stop`, `astro dev status`, `astro dev logs`.

Documentation complète : https://docs.astro.build
