# Revue rédactionnelle : 404, messages génériques et démonstrations

18 octobre 2026, selon `docs/editorial-style.md`. Sources : `src/i18n/fr.ts` (messages partagés par tous
les calculateurs), `src/pages/404.astro`, `src/lib/format/chf.ts`, `src/lib/display/gross-estimate.ts`,
`src/pages/demo-calculateur.astro` et `src/pages/demo-ui.astro` (pages internes, non indexées).

## 1. Messages réécrits

| Message | Avant | Après |
| --- | --- | --- |
| Canton non couvert | Valais : nos calculs ne reproduisent pas encore ceux du calculateur fiscal officiel du canton ; aucun résultat n'est affiché pour ce canton. | Valais : nos calculs ne reproduisent pas encore ceux du calculateur fiscal officiel du canton, et aucun résultat n’est donc affiché pour ce canton. |
| Ménages non couverts | Valais, <ménages> : nos calculs ne reproduisent pas encore… ; aucun résultat n'est affiché pour ces contribuables. | Valais, <ménages> : nos calculs ne reproduisent pas encore…, et aucun résultat n’est donc affiché pour ces contribuables. |
| Couverture partielle (deux deux-points) | Valais : nous ne couvrons pour l'instant que les personnes seules sans enfant, dans les communes suivantes : Sion. Pour les autres situations, utilisez la calculette officielle du canton. | Valais : nous ne couvrons pour l’instant que les personnes seules sans enfant, et seulement dans la commune de Sion. Pour les autres situations, utilisez la calculette officielle du canton. (« les communes de » quand il y en a plusieurs) |
| Échec d'envoi du formulaire de mise en relation | L'envoi a échoué. Réessayez plus tard — votre résultat reste affiché ci-dessus. | L’envoi a échoué. Réessayez plus tard, votre résultat reste affiché ci-dessus. |
| `title` de la 404 | Erreur 404 — calculateurs.ch | Erreur 404 · calculateurs.ch |

Ce message de couverture partielle s'affiche sur A1, A2 et A3. C'était le dernier signalement de
`copy:report` sur les trois calculateurs.

## 2. Typographie seule

Toutes les autres chaînes de `fr.ts` : apostrophe typographique, espace fine avant « : ; ? »
(« Différent ? », « Revenu imposable fédéral : identique au cantonal. », « Lecture : 6 minutes »,
« Exemple : »…), sans changement de mot. Le consentement du formulaire de mise en relation (« J’accepte
que mes coordonnées soient transmises… ») ne change que par son apostrophe.

**Restent tels quels**, comme le veut la charte (§ 3.2) : les préfixes « Attention : », « Erreur : » et
« Envoyé : », avec leur espace d'origine.

## 3. Valeurs vides et signe moins

- **Case sans montant de l'estimateur du salaire brut** : « — » devient une case vide, comme sur A1, A2 et A3.
- **Valeur par défaut de la carte** (`fr.common.emptyValue`) : « — » devient vide. Aucun calculateur publié
  ne l'affiche, puisque tous passent le résultat de leur cas exemple ; seule la démonstration l'affichait.
  Les modules d'affichage gardent « — » comme valeur interne d'une carte qui affiche un message : cette
  valeur est masquée, et les tests de calcul la recopient.
- **Signe moins** : `formatSwissNumber` écrit « −7’258 » (U+2212) au lieu de « -7’258 ». Aucun test de
  `tests/calculations/` ne recopie un montant négatif formaté : l'exception R7 accordée pour le signe
  moins n'a pas eu à servir. La saisie (`amount-input.ts`) accepte toujours le trait d'union tapé au clavier.

## 4. Démonstrations

Ponctuation seulement : titres factices (« Calculateur factice, rachat LPP »), légendes des logos
(« logo.svg : version principale, fond clair »), rôle d'un token (« Confirmation, alias de l’accent »),
`title` de la démonstration du design system (« · »).

## 5. Tests adaptés

| Test | Avant | Après | Garantie |
| --- | --- | --- | --- |
| `tests/lib/format-chf.test.ts` | `-7’258` | `−7’258` | le formateur garde le signe d'un montant négatif |
| `tests/components/tax-year-notice.test.ts` | annonce avec « 2026 : » | même annonce, espace fine avant le deux-points | l'annonce de l'année de repli précède le formulaire |
| `tests/components/scope-notice-coverage.test.ts` | attendu brut de `fr.partialCoverage.scopeLine` ; « dans les communes suivantes » | attendu normalisé comme le texte lu ; « dans la commune de » ou « dans les communes de » | la ligne de périmètre annonce la couverture partielle, le détail nomme les communes couvertes |
| `tests/seo/home-catalog.test.ts` | attendu brut de `fr.home.comingSoon` | attendu normalisé comme le texte lu | les familles sans calculateur tiennent en une ligne |

## 6. `npm run copy:report`

`404.html`, `demo-calculateur/index.html` et `demo-ui/index.html` : 0 avant, 0 après. Les trois pages quittent
`PENDING_PAGES` (2 tirets cadratins sur la démonstration du calculateur, 7 sur celle du design system, 1 sur
la 404, avant).
