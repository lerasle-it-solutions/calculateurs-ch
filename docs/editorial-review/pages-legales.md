# Revue rédactionnelle : politique de confidentialité et mentions légales

18 octobre 2026, selon `docs/editorial-style.md`. Sources : `src/pages/politique-de-confidentialite.astro`
et `src/pages/mentions-legales.astro`.

## Ce qui change

| Texte | Avant | Après |
| --- | --- | --- |
| `title` de la politique | Politique de confidentialité — calculateurs.ch | Politique de confidentialité · calculateurs.ch |
| `title` des mentions | Mentions légales — calculateurs.ch | Mentions légales · calculateurs.ch |

## Typographie (18.10.2026, seconde passe)

À la demande du mainteneur, la typographie française s'applique au texte des deux pages : apostrophe
typographique, espace fine avant « : ; ? », insécables dans les guillemets. **Changement typographique,
fond inchangé, date conservée** : aucun mot ne change, et les dates « Dernière mise à jour » restent
le 16.10.2026 (politique) et le 02.10.2026 (mentions).

## Ce que signale encore `copy:report`

Sur les mentions légales :

- la clause de responsabilité (38 mots, « Dans les limites autorisées par le droit suisse, l'éditeur décline
  toute responsabilité… ») : clause juridique, laissée entière ;
- le bloc de coordonnées (« E-mail : … Numéro IDE : … Registre du commerce : … »), compté comme un
  paragraphe de trois deux-points : ce sont des étiquettes de champ, une par ligne, pas des phrases.

## `npm run copy:report`

| Page | Avant | Après |
| --- | ---: | ---: |
| `/politique-de-confidentialite/` | 0 | 0 |
| `/mentions-legales/` | 2 | 2 |

Garde-fou : un tiret cadratin par page avant (dans le `title`), 0 après. Ce sont les deux dernières pages
de la liste d'attente du test ; la liste est supprimée et le test contrôle désormais toutes les pages.
