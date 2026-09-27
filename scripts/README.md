# Scripts de maintenance

## Exports de l'AFC — `read-estv-exports.ts`

Les barèmes, coefficients et déductions cantonaux viennent du module « Rechercher des données de base » du simulateur fiscal de l'Administration fédérale des contributions. L'AFC autorise leur réutilisation à condition de citer la source et sans garantie, mais réserve le simulateur à son interface web : **aucun script n'interroge ses serveurs**. Les exports se téléchargent à la main, une fois par an, puis `read-estv-exports.ts` les lit.

### Obtenir les exports

1. Sur `swisstaxcalculator.estv.admin.ch`, ouvre le module « Rechercher des données de base ».
2. Choisis l'année. L'année en cours n'apparaît qu'avec la région « Selon le canton ».
3. Pour chacun des six cantons — VD, GE, VS, FR, NE, JU — lance les exports de la matrice ci-dessous et enregistre chaque fichier, au format xlsx, sous le nom indiqué dans `imports/estv/{année}/{ct}/` (code du canton en minuscules, p. ex. `imports/estv/2026/vd/`).
4. Ne télécharge pas « Impôt sur le bénéfice et le capital » : il concerne les personnes morales, hors périmètre.

Le dossier `imports/` est exclu du dépôt.

| Module | Type d'impôt | Fichier | Remarque |
|---|---|---|---|
| Coefficients d'impôt | Revenu et Fortune | `coefficients.xlsx` | |
| Barèmes | Revenu | `bareme-revenu.xlsx` | |
| Barèmes | Fortune | `bareme-fortune.xlsx` | |
| Barèmes | Versement en capital de la prévoyance | `bareme-capital.xlsx` | FR et JU uniquement ; les quatre autres cantons dérivent ce barème de celui du revenu |
| Déductions | Revenu | `deductions.xlsx` | |
| Autres déductions | Revenu | `autres-deductions.xlsx` | absent pour VD |

Pour 2026 : 31 fichiers, soit 36 moins les quatre barèmes de capital absents et les autres déductions vaudoises.

### Lancer la lecture

```sh
npm run read:estv-exports -- 2026
```

Le script écrit `src/data/cantons/{ct}.json` et `src/data/municipalities/multipliers.json`. Il est **fail-closed** : les six cantons sont lus et validés en mémoire, toutes les anomalies sont listées, et s'il y en a une seule, **rien n'est écrit**. Une anomalie typique : un en-tête qui a changé, une absence de fichier non prévue, une source de `SOURCE_BY_CANTON` vide ou jamais vérifiée.

- Les identifiants de source viennent de `SOURCE_BY_CANTON` (`src/data/sources.ts`), par rôle ; `collectedFrom` vaut `estv-base-data-module`, `verifiedOn` la date du jour.
- Les clés absentes des exports — réduction de l'impôt de base, fortune communale valaisanne, gains immobiliers, valeur locative — sont écrites en `todo`. Une valeur relevée à la main dans le fichier cantonal n'est jamais écrasée par une nouvelle lecture.
- Les « remarques » affichées en fin de lecture ne bloquent pas l'écriture : elles signalent ce que le moteur doit savoir (p. ex. un barème communal de fortune valaisan apparu dans l'export, lu comme celui du revenu).

### Barèmes

- **Type de barème.** `scaleType` — `marginal` ou `averageRate` — appartient à la table, jamais au canton : Fribourg a un revenu à taux moyen et une fortune marginale. Chaque table est déclarée dans `DECLARED_SCALE_TYPES` ; une table lue sans déclaration, une déclaration sans table, ou un type contredit par les montants de base (marginal tous nuls, taux moyen non nuls) bloquent l'écriture.
- **Largeurs de tranches (Jura).** L'export donne « Pour les prochains CHF » au lieu d'un seuil. `estv-scale-conversion.ts` cumule les largeurs en seuils et les impôts des tranches précédentes en montants de base ; la largeur `9 999 999 999` marque la dernière tranche, sans borne. La table porte la note `derivedFrom: "bracketWidths"`.
- **Arrondi.** Taux, coefficients et montants de base calculés sont arrondis à huit décimales. L'arrondi ne vise que les artefacts de virgule flottante, jamais la précision publiée : l'AFC publie au plus cinq décimales. Un test vérifie qu'aucun taux des exports jurassiens n'est modifié par l'arrondi.
- **Prestations en capital dérivées** (VD, GE, NE, VS). Leurs règles vivent dans `src/data/cantons/capital-withdrawal-derivation.json`, écrit à la main, lu et validé par le lecteur mais jamais réécrit ; le fichier cantonal y renvoie par `{ "definedIn": … }`. Chaque valeur y porte pour `sourceId` le rôle `taxLaw` du canton.
- **Barème communal valaisan.** Lu sous l'autorité « Commune » en `communalScale.income`. L'export ne livre pas la fortune communale : `communalScale.wealth` reste un TODO tant qu'elle n'est ni dans l'export ni relevée à la main.

### Contrôle après lecture

Les coefficients de Neuchâtel (commune 6458) doivent valoir 124 % pour le canton et 65 % pour la commune. Sinon, l'unité de l'export n'est pas celle attendue : ne pas aller plus loin.

## Données privées — `fetch-private-data.ts`

Lancé automatiquement avant `npm run build` et `npm run test`. Il injecte le dépôt privé `calculateurs-ch-data` dans `src/data/private/` et `tests/calculations/private/`, avec le jeton `DATA_REPO_TOKEN`. Sans jeton hors production, il copie les jeux d'exemple fictifs de `src/data/private-fixtures/`.

## Ancien import — `import-estv-tax-data.ts`

Neutralisé : il interrogeait les serveurs du simulateur, ce que l'AFC n'autorise pas. Conservé pour ses schémas zod ; il s'arrête dès son lancement.
