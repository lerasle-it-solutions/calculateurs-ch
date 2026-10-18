# Revue rédactionnelle : politique de confidentialité et mentions légales

18 octobre 2026, selon `docs/editorial-style.md`. Sources : `src/pages/politique-de-confidentialite.astro`
et `src/pages/mentions-legales.astro`.

## Ce qui change

| Texte | Avant | Après |
| --- | --- | --- |
| `title` de la politique | Politique de confidentialité — calculateurs.ch | Politique de confidentialité · calculateurs.ch |
| `title` des mentions | Mentions légales — calculateurs.ch | Mentions légales · calculateurs.ch |

## Ce qui ne change pas, et pourquoi

**Le texte des deux pages est inchangé, mot pour mot.** Aucun engagement, aucune formulation : il ne
contenait ni tiret, ni point d'exclamation, ni tournure interdite. Seule la typographie (apostrophe
droite, espace ordinaire avant le deux-points) s'écarte de la charte.

Je ne l'ai pas appliquée. Changer le texte imposait de changer la date « Dernière mise à jour » (16.10.2026
pour la politique, 02.10.2026 pour les mentions). Or une nouvelle date sur une politique de
confidentialité annonce au lecteur une modification de ses engagements, ce qui serait faux pour un
changement purement typographique. Je propose d'appliquer la typographie à la prochaine modification
réelle de l'une ou l'autre page, avec sa date.

Les dates « Dernière mise à jour » restent donc inchangées.

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
