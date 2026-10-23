# Revue rédactionnelle : balises lues par Bing et glossaire des entités

23 octobre 2026, selon `docs/editorial-style.md`, pour le prompt SEO « Bing » (branche `seo_bing`).
Sources : `src/i18n/fr.ts`, `src/calculators/pension/pillar-3a-tax-saving.ts`,
`src/calculators/pension/lpp-buyback.ts`, `src/content/articles/*.mdx`, `src/pages/methodologie.astro`.
Aucune URL, aucun chiffre, aucune référence légale ne change.

## 1. Balises `title`

Cible : moins de 60 caractères, mot-clé principal en tête (limite dure de Bing : 70).

| Page | Avant | Après |
| --- | --- | --- |
| `/guides/` | Guides · calculateurs.ch (24) | Guides de prévoyance et de fiscalité · calculateurs.ch (54) |
| `/prevoyance/` | Prévoyance · calculateurs.ch (28) | Prévoyance : calculateurs 3a et LPP · calculateurs.ch (53) |
| `/methodologie/` | Méthodologie · calculateurs.ch (30) | Méthodologie des calculs · calculateurs.ch (42) |

Les autres `title` étaient déjà sous 60 caractères, mot-clé en tête, et ne changent pas.

## 2. Méta-descriptions

Cible : de 120 à 150 caractères, sans reprendre le `title` (limite dure de Bing : 160). Longueurs en
caractères, puis en octets UTF-8.

| Page | Avant | Après |
| --- | --- | --- |
| `/donnees/` | Chaque source officielle utilisée sur le site, avec sa date de vérification et sa prochaine relecture. (102) | Chaque source officielle des calculateurs, avec sa date de vérification et sa prochaine relecture. Les coefficients communaux se téléchargent en CSV. (149 / 152) |
| `/guides/` | Guides de prévoyance et de fiscalité pour la Suisse romande : les règles derrière chaque calculateur, expliquées et sourcées. (125, s'ouvre sur le mot du `title`) | Les règles derrière chaque calculateur de prévoyance et d’impôt, expliquées pour la Suisse romande avec leurs sources et un exemple chiffré. (140 / 148) |
| `/prevoyance/` | Calculateurs du 3e pilier et du 2e pilier pour la Suisse romande, avec la source et la date de chaque chiffre. (110) | Calculateurs du 3e pilier et du rachat LPP en Suisse romande. L’impôt est calculé dans votre commune, avec la source et la date de chaque chiffre. (146 / 150) |
| `/prevoyance/economie-impot-3a/` | Combien d’impôt votre versement au pilier 3a vous fait-il économiser ? Votre impôt est calculé avant et après la déduction, dans votre commune romande. (151 / 161, reprend la question du `title`) | Votre impôt est calculé avant et après la déduction de votre versement 3a, dans votre commune romande. La différence est l’impôt que vous économisez. (149 / 158) |
| `/prevoyance/guides/3a-ou-rachat-lpp/` | … Ce qui les départage, situation par situation, avec deux exemples chiffrés. (155 / 162) | … Ce qui les départage, cas par cas, avec deux exemples chiffrés. (143 / 150) |
| `/prevoyance/rachat-lpp/` | Rachat LPP : estimez l’économie d’impôt d’un rachat dans votre caisse de pension, en une fois ou échelonné, et vérifiez le délai de blocage. (140 / 154, s'ouvre sur « Rachat LPP » comme le `title`) | Estimez l’impôt qu’un rachat dans votre caisse de pension vous fait économiser, en une fois ou échelonné, et vérifiez le délai de blocage. (138 / 148) |
| `/prevoyance/guides/rachat-3a-retroactif/` | Racheter les lacunes de son 3e pilier depuis 2025 : conditions de l’OPP 3, plafond annuel, exemple chiffré et cinq pièges qui font perdre une déduction. (152, reprend « conditions, plafond, 5 pièges » du `title`) | Les lacunes de votre 3e pilier nées depuis 2025 se rachètent désormais. Qui y a droit, combien racheter par an et ce qui fait perdre la déduction. (146 / 150) |

La méta-description d'un calculateur s'affiche aussi sur sa carte de `/prevoyance/` : les deux changent
ensemble. Les dates de mise à jour des guides (`updatedOn`) ne changent pas : leur texte est intact.

La méta-description d'A3 était le texte de la fiche, recopié dans
`tests/components/lpp-buyback-page.test.ts`. Le mainteneur a accepté, au titre de R7 (23.10.2026), la
proposition ci-dessus et un test qui lit la description dans la définition et la tient aux cibles.

## 3. Glossaire des entités

| Entité | Terme retenu | Permis seulement | Écarté |
| --- | --- | --- | --- |
| Le pilier en général | 3e pilier | « Le troisième pilier », titre de la page de l'OFAS | troisième pilier, 3ème pilier |
| Le compte, le versement, le rachat | pilier 3a ; « 3a » en apposition (versement 3a, rachat 3a) | « prévoyance individuelle liée », dans le nom de l'OPP 3 | 3e pilier A, épargne retraite |
| Le prestataire 3a | fondation 3a, assurance 3a | fondation bancaire, quand il faut la distinguer de l'assurance | prestataire 3a |
| La prévoyance professionnelle | 2e pilier | « prévoyance professionnelle », dans le nom d'un acte ou une formule légale | deuxième pilier |
| L'institution | caisse de pension | « institution de prévoyance », quand la phrase cite un article (art. 80 LPP), ou quand la règle vise aussi le libre passage | fonds de pension, caisse de retraite |
| La loi et le rachat | LPP, rachat LPP | | BVG |
| L'administration fiscale fédérale | AFC ; « Administration fédérale des contributions (AFC) » au premier emploi d'une page et dans la formule d'attribution | | ESTV |
| L'impôt de la Confédération | impôt fédéral direct | « IFD », dans le nom abrégé d'une ordonnance et dans les références | impôt fédéral, sans précision |
| Le multiplicateur de la commune | coefficient communal | « centimes additionnels », dans le nom de la loi genevoise | taux communal |
| L'âge de la retraite | âge de référence | | âge de la retraite, âge légal |

Relevé sur le texte visible de `dist/` : les variantes écartées n'apparaissent que dans des noms d'actes
ou de pages officielles, sauf trois emplois de « institution de prévoyance (professionnelle) » en texte
courant, remplacés ci-dessous. « Une personne sans caisse de pension », dans la phrase suivante de la
méthodologie, disait déjà « caisse de pension ».

| Emplacement | Avant | Après |
| --- | --- | --- |
| `/methodologie/`, plafond 3a | Une personne affiliée à une institution de prévoyance, à titre obligatoire ou facultatif, déduit… | Une personne affiliée à une caisse de pension, à titre obligatoire ou facultatif, déduit… |
| `/methodologie/`, rachat LPP | Il s’adresse à une personne affiliée à une institution de prévoyance professionnelle, salariée ou… | Il s’adresse à une personne affiliée à une caisse de pension, salariée ou… |
| `/prevoyance/rachat-lpp/`, « Pour qui » | Une personne affiliée à une institution de prévoyance professionnelle. | Une personne affiliée à une caisse de pension. |

**Revérifiés le 23.10.2026** (arbitrage du mainteneur) : les trois phrases portent sur l'affiliation
(qui déduit la petite cotisation, qui peut racheter), et un compte de libre passage n'est pas une
affiliation. Aucune ne vise les fondations de libre passage : les trois remplacements restent.
L'exception est inscrite au § 4.2 de la charte : « institution de prévoyance » reste là où la règle
couvre aussi le libre passage (retrait en capital, délai de blocage, « toutes institutions
confondues »). Le site formule déjà le délai de blocage d'A3 avec « 2e pilier » et « toutes
institutions confondues », sans « caisse ».

Restent tels quels : la ligne de trace d'A2 « Affilié à une institution de prévoyance (art. 80 LPP) »,
qui cite l'article, et les références du registre des sources (`src/data/sources.ts`).

## 4. Accueil : H1 et titre du héros

Arbitrage du mainteneur, 23 octobre 2026. Le H1 dit ce qu'est le site, en cohérence avec le `title`
(« Calculs d’impôt sourcés en Suisse romande ») et la méta-description ; la question du 3e pilier
devient le titre du héros, en H2, au même rendu.

| Élément | Avant | Après |
| --- | --- | --- |
| H1 (style chapeau, `text-lead text-ink-muted`) | Combien votre 3e pilier vous fait-il économiser d’impôt ? | Calculateurs d’impôt et de prévoyance pour la Suisse romande |
| H2 du héros (`text-title`, rendu inchangé) | — | Combien votre 3e pilier vous fait-il économiser d’impôt ? |

À 375 × 667 px, le premier champ de l'accueil était déjà sous le pli (y = 947 px, après le compte à
rebours et la carte résultat) ; la ligne du H1 le décale de 62 px (y = 1 009). Le critère du § 4.1 du
design system vise les pages de calculateur.

## 5. `copy:report`

Aucune des phrases réécrites n'y figure, avant comme après : toutes ont moins de 35 mots et au plus un
deux-points. Les signalements restants de `/donnees/`, `/methodologie/` et `/mentions-legales/` sont des
références légales et des mentions de l'éditeur, inchangées.
