# Revue rédactionnelle : accueil, en-tête et pied de page

18 octobre 2026, selon `docs/editorial-style.md`. Sources : `src/i18n/fr.ts` (`home`, `header`, `footer`,
`breadcrumb`, `site`) et `src/pages/index.astro`. Les cartes des calculateurs reprennent le titre et la
question de chaque définition, revus avec leur calculateur ; la carte du guide reprend son
en-tête, revu avec le guide.

## Balises

| Texte | Avant | Après |
| --- | --- | --- |
| `title` | calculateurs.ch — calculateurs suisses romands qui affichent leurs sources (74 c.) | Calculs d’impôt sourcés en Suisse romande · calculateurs.ch (59 c.) |
| Méta-description | Calculateurs de fiscalité et de prévoyance pour la Suisse romande, chaque chiffre sourcé et daté. Aucun compte, aucun cookie de suivi. | Des calculateurs d’impôt et de prévoyance pour la Suisse romande, dont chaque chiffre est sourcé et daté. Aucun compte, aucun cookie de suivi. (142 c.) |

Les deux quittent le préambule de `index.astro` pour `fr.home.metaTitle` et `fr.home.metaDescription`.
Le séparateur « · » des `title` hors calculateurs passe par une seule fonction, `fr.site.pageTitle`, que
les autres familles reprennent.

## Accueil

| Texte | Avant | Après |
| --- | --- | --- |
| H1 | Combien votre 3e pilier vous fait-il économiser d'impôt ? | Combien votre 3e pilier vous fait-il économiser d’impôt ? *(typographie seule)* |
| Chapeau | Votre commune, votre revenu imposable, votre versement : le calcul se fait dans votre navigateur. | Indiquez votre commune, votre revenu imposable et votre versement. Le calcul se fait dans votre navigateur. |
| Compte à rebours | Il reste {days} jours pour verser votre 3a 2026 — le versement doit être crédité au plus tard le 31 décembre. Comptez quelques jours ouvrables pour que le virement soit crédité. | Il reste {days} jours pour verser votre 3a 2026, et le versement doit être crédité au plus tard le 31 décembre. Comptez quelques jours ouvrables pour que le virement soit crédité. |
| Résultat type d'une carte | Lausanne, 70’000 CHF : 1’865 CHF d'impôt en moins | Lausanne, 70’000 CHF : 1’865 CHF d’impôt en moins *(typographie seule)* |
| Titre de section | Pourquoi ces chiffres sont justes | Comment ces chiffres sont calculés |
| Méthode, 1 | Votre impôt est calculé avant et après la déduction ; l'économie est la différence exacte, pas un taux marginal multiplié par votre versement. | Votre impôt est calculé deux fois, avant et après la déduction. L’économie affichée est la différence entre les deux, jamais un taux marginal multiplié par votre versement. |
| Méthode, 2 | Barèmes, coefficients et plafonds viennent des textes officiels, chacun avec sa date de vérification, publiée sur la page des données. | Les barèmes, les coefficients et les plafonds viennent des textes officiels. Chaque valeur porte sa date de vérification, publiée sur la page des données. |
| Méthode, 3 | Le calcul se fait sur votre appareil. Aucun compte, aucun cookie de suivi : vos saisies ne sont envoyées nulle part. | Le calcul se fait sur votre appareil, sans compte ni cookie de suivi. Vos saisies ne sont envoyées nulle part. |

« Pourquoi ces chiffres sont justes » affirmait une justesse que le site ne peut pas garantir (conditions
d'usage de l'AFC, interdit n° 3) ; le nouveau titre dit ce que la section montre, la méthode. « Exacte »
disparaît comme sur A2.

Le compte à rebours garde deux fois « crédité » : la seconde phrase est recopiée en dur par
`tests/seo/home-page.test.ts`, et la première dit la règle (« crédité au plus tard le »), qu'on ne
remplace pas par un synonyme approximatif.

## En-tête et pied de page

Inchangés sur le fond : libellés courts, déjà conformes. Typographie seule (« d’aucune banque », « Fil
d’Ariane », corps du courriel « Signaler une erreur »). L'`aria-label` du logo avait été corrigé avec
A2. La ligne d'identité de l'éditeur est le texte du mainteneur (17.10.2026), gardé mot pour mot.

## Test adapté

`tests/seo/home-page.test.ts` : la fonction `text` du test ramène tout blanc à une espace, espace fine
comprise ; l'attendu (`fr.home.heroTitle`) reçoit la même normalisation. Garantie inchangée : le H1 est
le titre de `fr.ts`.

## `npm run copy:report`

Avant : `## index.html (0)`. Après : `## index.html (0)`.

Garde-fou : 1 tiret cadratin avant (dans le `title`), 0 après ; la page quitte `PENDING_PAGES`.
