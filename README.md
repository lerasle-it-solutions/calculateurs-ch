# calculateurs.ch

Calculateurs de fiscalité, prévoyance, immobilier et énergie pour la Suisse romande.
Site statique, sans compte utilisateur, sans cookie, sans publicité.

**→ https://calculateurs.ch**

## Pourquoi ce dépôt est public

Un calculateur fiscal ne vaut que par la justesse de ses chiffres et par la transparence de sa méthode.
Publier le code et les données permet à n'importe qui — un contribuable, une fiduciaire, un service cantonal — de vérifier d'où vient chaque valeur et comment le résultat est obtenu.

Si vous constatez une erreur, ouvrez une issue. **Toute erreur signalée sur une valeur officielle est corrigée sous 48 heures**, et la correction est consignée publiquement.

## Trois principes

**1. Aucune donnée ne quitte le navigateur.**
Les calculs s'exécutent intégralement côté client. Aucun revenu, aucun montant, aucune donnée relative à un logement n'est transmis à un serveur. Il n'existe ni base de données, ni compte utilisateur, ni sauvegarde de simulation.

**2. Aucune valeur chiffrée n'est écrite dans le code.**
Toute valeur vit dans `src/data/`, accompagnée de sa source officielle, de sa date de vérification et de sa date d'entrée en vigueur :

```ts
{
  "plafond3aSalarie": {
    "valeur": 7258,
    "unite": "CHF",
    "sourceId": "ofas-3a-plafonds",
    "verifieLe": "2026-09-05",
    "valableDes": "2026-01-01"
  }
}
```

Un test automatisé échoue si une valeur n'a pas été vérifiée depuis plus de douze mois.

**3. Chaque résultat est vérifié contre une source officielle indépendante.**
Les calculs d'impôt sont testés contre le calculateur officiel de l'Administration fédérale des contributions, pour dix-huit profils de référence répartis sur les six cantons romands. Un écart supérieur à 1 % fait échouer la construction du site.

## Sources

Toutes les valeurs proviennent de sources officielles : Fedlex, Office fédéral des assurances sociales, Administration fédérale des contributions, administrations fiscales cantonales, services cantonaux de l'énergie, Office fédéral de l'énergie, Office fédéral de la statistique.
Le registre complet des sources se trouve dans `src/data/sources.ts` et l'état de fraîcheur de chaque donnée est publié sur https://calculateurs.ch/donnees/

## Structure

src/ calculateurs/ définitions déclaratives (périmètre, champs, hypothèses, FAQ) components/ coquille réutilisable et composants de champ data/ valeurs sourcées et datées — CC BY 4.0 lib/calculs/ fonctions pures, sans import de données, avec trace du calcul pages/ une page par calculateur tests/ cas de référence et contrôles de fraîcheur des données scripts/ import annuel des barèmes, rituel du 1er janvier.

## Développement

```bash
npm install
npm run dev
npm run test     # calculs et fraîcheur des données
npm run build
```

## Signaler une erreur

Ouvrez une issue en indiquant : le calculateur concerné, la valeur ou le résultat contesté, et la source officielle qui fait foi. Les corrections issues d'une administration sont prioritaires et créditées.

## Licences

- **Code** : AGPL-3.0 — voir `LICENSE`
- **Données** (`src/data/`) : CC BY 4.0 — voir `src/data/LICENSE.md`. Attribution : « Données compilées par calculateurs.ch ».
- Des licences commerciales du moteur, pour intégration white-label, sont disponibles : [contact@calculateurs.ch]

## Avertissement

Les résultats sont des estimations fournies à titre informatif. Ils ne constituent ni un conseil fiscal, ni un conseil juridique, ni un conseil en placement, et n'engagent aucune administration. Vérifiez toujours votre situation auprès de l'autorité compétente ou d'un professionnel.

---

_Swiss tax, pension, real estate and energy calculators for French-speaking Switzerland. Static site, no tracking, every figure carries its official source and verification date._
