# calculateurs.ch — Instructions du projet

Ce fichier fait autorité. Il contient (1) les quatre règles absolues et (2) le
document d'architecture v2 intégral. Toute décision technique doit s'y conformer.

---

## Règles absolues

Ces quatre règles priment sur toute autre considération. Aucune exception sans
accord explicite du mainteneur.

### R1 — Aucun back-end, aucune base de données, aucun compte utilisateur

Le site est statique par défaut. Pas de base de données, pas d'authentification,
pas de comptes utilisateurs. **Seule exception autorisée :** la Pages Function
sans état `functions/api/lead.ts`, dédiée au routage des leads (valide, formate,
transmet au partenaire, renvoie 200 — rien n'est stocké côté serveur).

### R2 — Aucune valeur chiffrée dans le code

Aucune valeur brute (barème, plafond, taux, seuil, coût de référence, tarif…)
n'apparaît dans le code. Tout vit dans `src/data/`, enveloppé dans le type
`Valeur<T>`, avec au minimum une **source** (`sourceId` présent dans
`src/data/sources.ts`) et une **date de vérification** (`verifieLe`). Une valeur
sans source ni date ne peut pas entrer dans le dépôt. Les fonctions de
`src/lib/calculs/` reçoivent leurs barèmes **en argument** et ne les importent
jamais elles-mêmes.

### R3 — On n'invente jamais une valeur chiffrée

Si une valeur chiffrée manque, on ne la déduit pas, on ne l'estime pas, on ne la
copie pas de mémoire. On crée une entrée `TODO` explicite dans le fichier
`src/data/` concerné (valeur marquée, `sourceId` à renseigner, `verifieLe` vide)
**et on demande au mainteneur de relever la valeur** à sa source officielle. Le
travail dépendant de cette valeur reste bloqué jusqu'à ce qu'elle soit fournie.

### R4 — Chaque fonction de calcul retourne une trace ligne par ligne

Toute fonction de `src/lib/calculs/` retourne, en plus de son résultat, une
**trace du calcul ligne par ligne** (chaque étape : libellé, opérande(s),
opération, résultat intermédiaire, hypothèse retenue). Cette trace alimente le
composant `DetailCalcul.astro`. Un résultat non traçable est un bug.

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
Une valeur sans `sourceUrl` et `verifieLe` ne peut pas entrer dans le dépôt.
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
│   ├── verifier-donnees.ts              ← rapport de fraîcheur (CI + manuel)
│   └── nouvelle-annee.ts                ← duplique federal/AAAA.json pour révision
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
│   │   ├── communes/
│   │   │   ├── coefficients.json        ← coefficient d'impôt communal
│   │   │   └── subventions.json         ← aides communales à la rénovation
│   │   │
│   │   └── energie/
│   │       ├── subventions.json         ← Programme Bâtiments + cantonal + Pronovo
│   │       ├── tarifs-reprise.json      ← par gestionnaire de réseau
│   │       └── couts-reference.json     ← fourchettes PAC / PV / isolation
│   │
│   ├── lib/
│   │   ├── calculs/                     ← logique pure, zéro import Astro
│   │   │   ├── impots.ts                ← MOTEUR : taux marginal, canton + commune
│   │   │   ├── prevoyance/
│   │   │   │   ├── rachat-3a.ts
│   │   │   │   ├── rachat-lpp.ts
│   │   │   │   └── retrait-capital.ts
│   │   │   ├── immobilier/
│   │   │   │   ├── valeur-locative.ts
│   │   │   │   ├── renovation-fiscale.ts
│   │   │   │   ├── amortissement.ts
│   │   │   │   └── capacite-achat.ts
│   │   │   ├── energie/
│   │   │   │   ├── subventions.ts
│   │   │   │   ├── pompe-a-chaleur.ts
│   │   │   │   └── photovoltaique.ts
│   │   │   └── entreprise/
│   │   │       └── cout-employeur.ts
│   │   │
│   │   └── utils/
│   │       ├── formatCHF.ts
│   │       ├── arrondir.ts
│   │       ├── trace.ts                 ← construit le détail du calcul affichable
│   │       └── periode.ts               ← résolution de l'année fiscale applicable
│   │
│   ├── calculateurs/                    ★ DÉFINITIONS DÉCLARATIVES
│   │   ├── types.ts
│   │   ├── prevoyance/
│   │   │   ├── rachat-3a.ts             ← périmètre, champs, moteur, variantes, FAQ
│   │   │   └── economie-impot-3a.ts
│   │   ├── immobilier/
│   │   ├── energie/
│   │   └── entreprise/
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.astro
│   │   │   ├── Footer.astro
│   │   │   ├── FilAriane.astro
│   │   │   └── NavFamille.astro
│   │   ├── calculateur/
│   │   │   ├── Coquille.astro           ← titre, intro, périmètre, formulaire, résultat
│   │   │   ├── PerimetreDeclare.astro   ★ bandeau, alimenté par la définition
│   │   │   ├── DetailCalcul.astro       ★ le calcul ligne par ligne
│   │   │   ├── CarteResultat.astro
│   │   │   ├── FraicheurDonnees.astro   ★ "barèmes 2026, vérifiés le 12.01.2026"
│   │   │   ├── VariantesLiees.astro
│   │   │   └── champs/
│   │   │       ├── Nombre.astro
│   │   │       ├── Select.astro
│   │   │       ├── Canton.astro
│   │   │       └── Commune.tsx          ← island Preact (autocomplétion ~300 entrées)
│   │   ├── conversion/
│   │   │   ├── Lead.astro               ★ mise en relation partenaire, jamais bloquant
│   │   │   └── Newsletter.astro
│   │   ├── editorial/
│   │   │   ├── CtaCalculateur.astro
│   │   │   ├── TableMatieres.astro
│   │   │   └── Sources.astro
│   │   └── seo/
│   │       ├── SchemaCalculateur.astro
│   │       ├── SchemaArticle.astro
│   │       ├── SchemaFaq.astro
│   │       └── SchemaFilAriane.astro
│   │
│   ├── layouts/
│   │   ├── BaseLayout.astro
│   │   ├── FamilleLayout.astro
│   │   ├── CalculateurLayout.astro
│   │   └── ArticleLayout.astro
│   │
│   ├── content/
│   │   ├── config.ts                    ← collections typées
│   │   └── articles/
│   │       ├── prevoyance/
│   │       ├── immobilier/
│   │       ├── energie/
│   │       └── entreprise/
│   │
│   ├── i18n/
│   │   └── fr.ts                        ← toutes les chaînes UI, dès le jour 1
│   │
│   └── pages/
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
│   ├── calculs/                         ← cas de référence par calculateur
│   ├── donnees/                         ← fraîcheur + conformité de schéma
│   └── regression/                      ← instantanés de résultats
│
├── astro.config.mjs
├── tsconfig.json
├── vitest.config.ts
└── package.json
```

---

## 1. La couche de données

### 1.1 Le type `Valeur<T>`

Aucune valeur brute dans le dépôt. Tout est enveloppé :

```ts
// src/data/schema.ts
export type Valeur<T> = {
  valeur: T;
  sourceId: string;        // clé dans sources.ts
  verifieLe: string;       // ISO 8601 — date de vérification humaine
  valableDes: string;      // ISO 8601
  valableJusqua?: string;  // absent = toujours en vigueur
  note?: string;           // nuance, cas particulier, réserve
};
```

Exemple réel :

```jsonc
// src/data/federal/2026.json
{
  "annee": 2026,
  "pilier3a": {
    "plafondAvecLPP": {
      "valeur": 7258,
      "sourceId": "ofas-3a-plafonds",
      "verifieLe": "2026-01-08",
      "valableDes": "2026-01-01",
      "note": "Rachat rétroactif plafonné au même montant."
    },
    "rachatRetroactif": {
      "premiereLacuneRachetable": {
        "valeur": 2025,
        "sourceId": "opp3-art-7a",
        "verifieLe": "2026-01-08",
        "valableDes": "2026-01-01",
        "note": "Les lacunes antérieures à 2025 ne sont pas rachetables."
      },
      "delaiAnnees": { "valeur": 10, "sourceId": "opp3-art-7a", "...": "..." }
    }
  }
}
```

### 1.2 Le registre des sources

```ts
// src/data/sources.ts
export const SOURCES = {
  'opp3-art-7a': {
    nom: 'OPP 3, art. 7a — rachats dans le pilier 3a',
    url: 'https://www.fedlex.admin.ch/...',
    autorite: 'Confédération',
    cadence: 'annuelle',
  },
  'vd-coefficients-communaux': {
    nom: 'Coefficients d\'impôt communaux vaudois',
    url: 'https://www.vd.ch/...',
    autorite: 'Canton de Vaud',
    cadence: 'annuelle',
  },
  // ...
} as const;
```

Chaque `sourceId` référencé dans les données doit exister ici. Un test le vérifie.

### 1.3 Les tests de données

```
tests/donnees/
├── schema.test.ts       → tous les fichiers valident le schéma zod
├── sources.test.ts      → tout sourceId référencé existe dans SOURCES
├── fraicheur.test.ts    → aucune valeur non vérifiée depuis > 12 mois
└── couverture.test.ts   → les 6 cantons ont les mêmes clés obligatoires
```

`fraicheur.test.ts` échoue le build. C'est volontaire : le seul défaut fatal du site
serait d'afficher un chiffre périmé avec assurance. Passer en avertissement le jour où
ça devient trop pénible est une décision, pas un accident.

### 1.4 La page publique `/donnees/`

Génère automatiquement, depuis la couche de données, un tableau : donnée, valeur,
source, date de vérification, prochaine échéance. Trois effets :

- crédibilité immédiate auprès d'une fiduciaire ou d'un journaliste ;
- aimant à liens — les pages de données à jour se font citer ;
- discipline interne : la dette de fraîcheur devient publique.

### 1.5 Le rituel du 1er janvier

`npm run nouvelle-annee` duplique `federal/2026.json` en `2027.json`, remet tous les
`verifieLe` à zéro et sort la liste des valeurs à re-vérifier. C'est un avantage
concurrentiel : les gros sites mettent des semaines à mettre à jour leurs barèmes.
Un déploiement le 2 janvier capte trois semaines de trafic saisonnier.

---

## 2. La définition déclarative d'un calculateur

Le périmètre n'est plus du texte dans une page — c'est une donnée qui alimente
le bandeau, les liens de variantes, la FAQ, le JSON-LD et les tests.

```ts
// src/calculateurs/types.ts
export type DefinitionCalculateur = {
  id: string;
  famille: 'prevoyance' | 'immobilier' | 'energie' | 'entreprise';
  url: string;
  titre: string;
  metaDescription: string;

  perimetre: {
    pourQui: string[];              // → bandeau, bloc "Pour qui"
    neCouvrePas: {                  // → bandeau, bloc "Ce que ça ne couvre pas"
      cas: string;
      alternative?: string;         // id d'un autre calculateur
    }[];
    hypotheses: string[];           // → bandeau + page méthodologie
    cantonsCouverts: string[];
    anneeReference: number;
  };

  champs: DefinitionChamp[];
  moteur: string;                   // chemin dans lib/calculs/
  variantes: string[];              // ids de calculateurs liés
  faq: { question: string; reponse: string }[];

  monetisation?: {
    type: 'lead' | 'affiliation' | 'aucune';
    partenaire?: string;
    declencheur?: string;           // condition sur le résultat
  };
};
```

Bénéfice concret : un test vérifie que **chaque calculateur déclare au moins une
entrée `neCouvrePas` avec une alternative**. Impossible de publier un outil qui laisse
un utilisateur hors périmètre dans une impasse. La rigueur de la v1 devient exécutable.

---

## 3. Rendu et interactivité

| Cas | Technique | Poids visé |
|---|---|---|
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
- Il n'apparaît que si `monetisation.declencheur` est satisfait
  (ex. : montant de travaux estimé > 15'000 CHF).
- Consentement explicite, finalité annoncée, partenaire nommé — nLPD.
- Un seul partenaire par lead. Pas de revente en cascade.

---

## 5. Mesure

| Outil | Usage | Cookies |
|---|---|---|
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
    titre: z.string(),
    description: z.string(),
    famille: z.enum(['prevoyance', 'immobilier', 'energie', 'entreprise']),
    publieLe: z.date(),
    misAJourLe: z.date(),
    calculateursLies: z.array(z.string()).min(1),   // ≥ 1 obligatoire
    sources: z.array(z.object({ nom: z.string(), url: z.string().url() })).min(2),
    validePar: z.string().optional(),               // fiduciaire / conseiller
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

| Ordre | Calculateur | URL | Semaines |
|---|---|---|---|
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
|---|---|
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
|---|---|---|
| Pages | `kebab-case.astro` | `rachat-3a-retroactif.astro` |
| Composants | `PascalCase.astro` | `PerimetreDeclare.astro` |
| Fonctions | `camelCase`, français | `calculerLacune3a()` |
| Données | `kebab-case.json`, par année | `federal/2026.json` |
| Ids de calculateur | `famille.nom` | `prevoyance.rachat-3a` |
| Variables CSS | `--calc-{nom}` | `--calc-accent` |

**Toutes les chaînes d'interface dans `src/i18n/fr.ts` dès le jour 1.** Ça ne coûte
presque rien maintenant et rend l'extension alémanique mécanique plus tard. Ne pas
construire le routage multilingue tant que la décision n'est pas prise.

---

## 9. Configuration

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import preact from '@astrojs/preact';

export default defineConfig({
  site: 'https://www.calculateurs.ch',
  output: 'static',
  integrations: [
    sitemap({ changefreq: 'monthly', lastmod: new Date() }),
    preact({ compat: false }),
  ],
  build: { format: 'directory' },
  prefetch: { prefetchAll: true, defaultStrategy: 'viewport' },
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
  "verifier-donnees": "tsx scripts/verifier-donnees.ts",   // rapport de fraîcheur
  "nouvelle-annee":   "tsx scripts/nouvelle-annee.ts",     // rituel du 1er janvier
  "test":             "vitest run",
  "predeploy":        "npm run test && astro check"
}
```

---

## 10. Séparation des responsabilités

```
src/data/            → faits sourcés et datés. Aucune logique.
src/lib/calculs/     → formules pures. Aucun import Astro, aucun accès direct aux JSON.
src/calculateurs/    → définitions déclaratives : périmètre, champs, FAQ, monétisation.
src/components/      → rendu uniquement.
src/pages/           → assemblage.
```

Règle de dépendance, testable : `lib/calculs/` reçoit ses barèmes **en argument**,
il ne les importe jamais lui-même. Chaque fonction de calcul est donc testable avec
des valeurs fictives, et rejouable sur n'importe quelle année.

```ts
// ✅
export function calculerEconomie3a(montant: number, taux: TauxImposition): Resultat

// ❌
import taux2026 from '../../data/federal/2026.json';
```

---

## 11. Journal des décisions

| # | Décision | Motif |
|---|---|---|
| 1 | Pas de pages d'impôt cantonal | Impossible de battre les simulateurs officiels ; le moteur suffit |
| 2 | 6 cantons romands, pas 26 | Divise le travail de données par 4, permet le niveau communal |
| 3 | Preact plutôt que React | Aucun besoin justifiant 40 kb supplémentaires |
| 4 | Une seule Pages Function | Le routage de lead ne peut pas être statique ; rien d'autre ne le justifie |
| 5 | Aucun cookie | Pas de bannière, conformité nLPD triviale, argument white-label |
| 6 | Fraîcheur des données bloquante au build | Le seul défaut fatal serait un chiffre périmé affiché avec assurance |
| 7 | i18n préparé, non implémenté | Coût quasi nul maintenant, coût élevé plus tard |
| 8 | Périmètre déclaré structuré et non textuel | Alimente 4 usages, et devient vérifiable par test |

---

## Développement

Serveur de dev en mode arrière-plan :

```
astro dev --background
```

Gestion : `astro dev stop`, `astro dev status`, `astro dev logs`.

Documentation complète : https://docs.astro.build
