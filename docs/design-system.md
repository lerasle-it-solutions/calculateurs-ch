# Design system — calculateurs.ch

> **Statut : fait autorité.** Ce fichier remplace l'ancien § « Design system » de `CLAUDE.md`.
> Les valeurs vivent dans `src/styles/tokens.css` (bloc `@theme` de Tailwind v4) ; ce document
> explique *quoi* utiliser, *où* et *pourquoi*. En cas de divergence, `tokens.css` gagne pour la
> valeur, ce document gagne pour l'usage — et la divergence est signalée au mainteneur.

**Palette :** « marine et sapin », propre au site (arrêtée le 2 octobre 2026).
**Pile :** Astro 7 statique, Tailwind CSS v4, JavaScript natif, aucune bibliothèque de composants.

---

## 0. Règles impératives pour l'IA (à appliquer avant toute ligne d'interface)

1. **Uniquement des tokens.** Aucune valeur littérale dans un composant ou une page : pas de
   `#…`, `rgb()`, `text-[17px]`, `p-[13px]`, `rounded-[3px]`, `shadow-[…]`, ni de couleur de la
   palette Tailwind par défaut (`bg-gray-100`, `text-blue-600` — elle est désactivée et ne compile
   plus). Token manquant → l'ajouter dans `tokens.css`, le documenter ici, le signaler.
   `tests/design/design-tokens.test.ts` fait échouer la CI sinon.
2. **Le chiffre est le héros.** Sur une page de calculateur, le résultat (`text-display`,
   `text-accent`) est l'élément le plus grand et le plus contrasté de la page.
3. **Une couleur, un rôle.** `accent` (sapin) = résultat, liens, action principale. `error`
   (rouge) = erreurs uniquement, jamais un montant. `warning` (orange) = avertissements renforcés
   uniquement. `brand` et `warning-signal` ne portent jamais de texte. **Le gain ou la perte se
   dit en mots** (« + », « – », « économie », « surcoût »), jamais par la couleur.
4. **Éléments natifs d'abord** : `<button>`, `<a>`, `<details>`, `<select>`, `<input>`,
   `<output>`, `<dialog>`, `<table>`. Jamais de `<div role="button">`.
5. **Budget de performance inchangé** : < 30 ko de JS par page, < 100 ko de CSS, LCP < 1,5 s en 4G
   simulée, polices auto-hébergées, aucune requête tierce. Aucun ajout de dépendance d'interface.
6. **Accessibilité AA** : contrastes du § 1.1 respectés, focus visible, cibles tactiles ≥ 44 px,
   `prefers-reduced-motion` respecté, site utilisable sans JavaScript (seul le calcul s'arrête).

---

## 1. Tokens de conception

### 1.1 Palette de couleurs — « marine et sapin »

#### Neutres

| Token Tailwind | HEX | RGB | Rôle |
| --- | --- | --- | --- |
| `ink` | `#1C2A3A` | 28 42 58 | Texte, titres, bouton secondaire, pied de page |
| `ink-muted` | `#596577` | 89 101 119 | Texte secondaire, aide, métadonnées |
| `paper` | `#FFFFFF` | 255 255 255 | Fond de page, cartes, champs |
| `tint` | `#F4F6F8` | 244 246 248 | Sections alternées, panneaux, en-têtes de tableau |
| `hairline` | `#DDE2E8` | 221 226 232 | Séparateurs décoratifs, grilles de graphiques |
| `rule` | `#7A8494` | 122 132 148 | Bordure des champs et contrôles (≥ 3:1) |

#### Sapin (accent)

| Token | HEX | RGB | Rôle |
| --- | --- | --- | --- |
| `accent` | `#1C7853` | 28 120 83 | Chiffre du résultat, liens, bouton principal, focus |
| `accent-strong` | `#186748` | 24 103 72 | Survol / pression de `accent` |
| `accent-tint` | `#E8F2EE` | 232 242 238 | Fond de la carte résultat, élément sélectionné, succès, pastille |
| `brand` | `#3AA67B` | 58 166 123 | Vert clair — **décor et graphiques uniquement** |

#### Graphiques

| Token | HEX | Rôle |
| --- | --- | --- |
| `slate` | `#4A6FA5` | Série complémentaire, neutre (ni gain ni perte) ; lisible en texte (5,11:1) |
| `slate-light` | `#A9B8CC` | Remplissages, série secondaire |

#### États

| Token | HEX | Usage |
| --- | --- | --- |
| `success` / `success-tint` | `#1C7853` / `#E8F2EE` | Confirmation (formulaire envoyé, donnée à jour) — alias de l'accent |
| `warning` | `#B54708` | Orange vif : texte et titre des avertissements renforcés, « jamais vérifié » |
| `warning-signal` | `#F79009` | Filet gauche des avertissements (décoratif) |
| `warning-tint` | `#FFF4E5` | Fond des avertissements |
| `error` / `error-tint` | `#D11F2A` / `#FBEDEE` | Rouge vif : erreur de saisie, échec d'envoi. Jamais un montant |

#### Contrastes vérifiés (WCAG 2.x)

| Paire | Ratio | Niveau |
| --- | --- | --- |
| `ink` sur `paper` / `tint` | 14,57 / 13,45:1 | AAA |
| `ink` sur `accent-tint` / `warning-tint` / `error-tint` | 12,74 / 13,40 / 12,80:1 | AAA |
| `ink-muted` sur `paper` / `tint` | 5,91 / 5,46:1 | AA |
| `accent` sur `paper` / `tint` / `accent-tint` | 5,44 / 5,02 / 4,76:1 | AA |
| `paper` sur `accent` / `accent-strong` | 5,44 / 6,83:1 | AA |
| `slate` sur `paper` | 5,11:1 | AA |
| `warning` sur `paper` / `warning-tint` | 5,43 / 4,99:1 | AA |
| `error` sur `paper` / `error-tint` | 5,33 / 4,68:1 | AA |
| `rule` sur `paper` / `tint` | 3,78 / 3,49:1 | UI ≥ 3:1 |
| `brand` sur `paper` | 3,03:1 | UI seulement — jamais du texte |
| `warning-signal` sur `paper` | 2,35:1 | ✗ décor seulement |

`accent` contraste à 2,68:1 avec `ink` : le résultat se distingue du texte courant par la
luminosité, pas seulement par la teinte.

#### Règles d'usage

- Fond par défaut `paper`. Les sections alternent `paper` / `tint` pour rythmer la page.
- `accent` = résultat ou action. Un seul bouton principal par zone visible.
- L'accent marque *le* résultat, quel que soit son sens : un impôt dû et une économie
  s'affichent tous deux en `accent`. Le sens est porté par le texte.
- `error` n'apparaît que si quelque chose est faux. `warning` n'apparaît que pour les
  avertissements renforcés (retrait en capital, amortir ou investir, subventions, donnée jamais
  vérifiée).
- Aucune couleur ne porte seule une information (WCAG 1.4.1) : préfixes « Attention : »,
  « Erreur : », « Envoyé : » obligatoires.
- Aucun dégradé. Aucun aplat plein écran de couleur (un bloc `accent-tint` ou `tint` arrondi est
  permis).

#### Pourquoi cette palette

Une encre marine presque noire pour la lecture, une seule couleur vive pour l'action et le
résultat, avec un accent propre au site :

- **Neutralité** : reprendre les couleurs d'un prestataire de prévoyance ferait paraître le site
  affilié à lui.
- **Sens** : rouge et rose se lisent comme une perte ou une erreur ; ils sont réservés aux erreurs.
- **Sujets** : le vert accompagne l'économie d'impôt, les subventions et la rénovation énergétique.
- **White-label** : un seul token d'accent à remplacer pour mettre un calculateur embarqué aux
  couleurs d'une fiduciaire (`accent`, `accent-strong`, `accent-tint`).

#### Palette des graphiques

| Série | Trait | Remplissage |
| --- | --- | --- |
| 1 (principale) | `accent` | `accent-tint` |
| 2 | `ink` | — |
| 3 | `slate` | `slate-light` |
| 4 | `brand` | — |

Jamais `error` ni `warning` dans un graphique, sauf pour marquer un seuil d'alerte explicitement
légendé. Grille et axes `hairline`, trait 2 px, points masqués, libellés `ink-muted`.
Graphiques rendus en SVG au build ou en SVG inline généré par le script de la page ; jamais de
bibliothèque de graphiques. Chaque graphique a un `<table>` équivalent (dans un `<details>`).

### 1.2 Typographie

**Famille retenue : `Figtree`** — sans-serif géométrique, libre (OFL), deux graisses seulement :
Medium 500 et Bold 700,
auto-hébergée via `@fontsource/figtree`, chiffres tabulaires `tnum` présents.
Fichiers chargés : `latin-500`, `latin-700` (+ `latin-ext` servis seulement si un glyphe
l'exige, via `unicode-range`). Poids : ≈ 22 ko contre ≈ 66 ko pour l'ancien trio IBM Plex.

```
--font-sans: "Figtree", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
```

Une seule famille. L'ancien serif (« appareil de sources ») est remplacé par un **bloc source**
(§ 2.6). L'alias de migration `font-serif` a été retiré de `tokens.css` le 2 octobre 2026 :
la classe ne compile plus.

#### Échelle (fluide de 320 px à 1280 px)

| Niveau | Élément | Token | Taille (mobile → bureau) | Interligne | Graisse | Approche |
| --- | --- | --- | --- | --- | --- | --- |
| Résultat | `<output>` | `text-display` | 36 → 56 px | 1,05 | 700 | −0,02 em |
| H1 | `<h1>` | `text-title` | 30 → 44 px | 1,15 | 700 | −0,015 em |
| H2 | `<h2>` | `text-heading` | 24 → 32 px | 1,2 | 700 | −0,01 em |
| H3 | `<h3>` | `text-subheading` | 20 px | 1,3 | 700 | 0 |
| H4–H6 | `<h4>`…`<h6>` | `text-label font-bold` | 15 px | 1,4 | 700 | 0 |
| Chapeau | `<p>` sous le H1 | `text-lead` | 19 px | 1,55 | 500 | 0 |
| Corps | `<p>`, `<li>` | `text-body` | 17 px | 1,6 | 500 | 0 |
| Libellé | `<label>`, bouton, nav | `text-label` | 15 px | 1,4 | 500 (700 bouton) | 0 |
| Légende | aide, source, mention | `text-fine` | 13 px | 1,5 | 500 | 0 |

Règles :

- Graisses autorisées : **500 et 700 uniquement** (`font-medium`, `font-bold`). Corps en 500,
  Pas de 400, 600 ni d'italique synthétique.
- `tabular-nums` sur tout montant, pourcentage ou année (appliqué en base sur `input`, `output`,
  `table`, `time`, `[data-numeric]` ; ajouter `tabular-nums` ailleurs).
- Montants au format suisse : `CHF 12'345.–` / `12'345.60` (apostrophe typographique `’`
  acceptée), espace insécable entre `CHF` et le nombre.
- Texte aligné à gauche, jamais justifié ; longueur de ligne ≤ 70 caractères (`max-w-reading`).
- Casse phrase partout. Jamais de capitales pour un titre, libellé ou bouton.

### 1.3 Espacement et dimensionnement

Base 4 px. Les composants n'utilisent que ces pas (`p-*`, `m-*`, `gap-*`, `space-*`, `min-h-*`).

| Token | rem | px | Usage typique |
| --- | --- | --- | --- |
| `2xs` | 0,125 | 2 | Décalage du focus, filet |
| `xs` | 0,25 | 4 | Libellé ↔ champ |
| `sm` | 0,5 | 8 | Icône ↔ texte, intérieur de pastille |
| `md` | 0,75 | 12 | Padding vertical des champs et boutons |
| `lg` | 1 | 16 | Gouttière mobile, padding horizontal des champs, gap de formulaire |
| `xl` | 1,5 | 24 | Padding des cartes, padding horizontal des boutons |
| `2xl` | 2 | 32 | Gap entre colonnes, entre cartes |
| `3xl` | 3 | 48 | Hauteur des contrôles (`min-h-3xl`), padding de section mobile |
| `4xl` | 4 | 64 | Padding de section bureau |
| `5xl` | 6 | 96 | Respiration des sections héros (bureau) |
| `icon` | 1,25 | 20 | **Taille d'objet**, pas un pas de rythme : icône fonctionnelle (§ 2.1), case à cocher et bouton radio natifs (§ 2.3), en `size-icon` |

Rythme vertical : sections `py-3xl md:py-4xl` (héros `md:py-5xl`) ; titres suivis de `mt-sm`
(chapeau) puis `mt-2xl` (contenu).

#### Rayons

| Token | Valeur | Usage |
| --- | --- | --- |
| `rounded-control` | 8 px | Champs, segment d'unité, cases, menus déroulants |
| `rounded-panel` | 16 px | Cartes, carte résultat, avis, tableaux encapsulés |
| `rounded-section` | 24 px | Grands blocs teintés en pleine largeur de conteneur |
| `rounded-button` | pilule | Boutons, pastilles, filtres |

Jamais le même rayon partout : le rayon croît avec la taille de la surface.

#### Largeurs et points de rupture

| Token | Valeur | Usage |
| --- | --- | --- |
| `max-w-reading` | 40 rem (640 px) | Texte courant |
| `max-w-page` | 72 rem (1152 px) | Gabarit de toutes les pages |
| `md` | 768 px | Bascule mobile → bureau |
| `lg` | 1024 px | Calculateur en deux colonnes |

Gouttière : `px-lg` (16 px) mobile, `md:px-2xl` (32 px) au-delà. Responsive jusqu'à 320 px.

### 1.4 Ombres et relief

Ombres douces, teintées `ink`, jamais noires. Trois niveaux, pas un de plus.

| Niveau | Token | Valeur | Usage |
| --- | --- | --- | --- |
| 0 | — | aucune | Sections, champs, cartes sur `tint`, tableaux |
| 1 | `shadow-card` | `0 1px 2px rgb(28 42 58 / .06), 0 4px 16px rgb(28 42 58 / .08)` | Cartes sur fond `paper`, carte résultat |
| 2 | `shadow-raised` | `0 2px 4px rgb(28 42 58 / .08), 0 12px 32px rgb(28 42 58 / .12)` | Menu mobile déplié, `<dialog>` |
| 2b | `shadow-bar` | `0 -4px 16px rgb(28 42 58 / .10)` | Barre de résultat collée en bas (mobile) |

Pas de flou d'arrière-plan (`backdrop-blur`), coûteux au rendu. Une carte posée sur `tint`
n'a pas d'ombre : le contraste de fond suffit.

### 1.5 Logo

**Logotype « point de résultat »** : `calculateurs.ch` en Figtree 700, approche −0,01 em,
vectorisé (aucune dépendance à la police). Seul le point est en couleur : il prend la couleur
du résultat, la marque désigne le chiffre. Le point est agrandi de 25 % (compensation optique)
pour rester visible à 24 px de haut.

Sources vectorielles dans `src/assets/brand/` (`logo.svg`, `logo-blanc.svg`, `symbole.svg`),
importées comme composants Astro et rendues en ligne (aucune requête réseau). Copies publiques
dans `public/brand/` pour les usages externes (presse, réseaux, partenaires).

| Fichier | Usage |
| --- | --- |
| `logo.svg` | Version principale : encre `#1C2A3A`, point `accent` `#1C7853`, fond clair |
| `logo-blanc.svg` | Fond `ink` ou foncé : blanc, point `brand` `#3AA67B` (4,80:1 sur `ink`) |
| `logo-blanc-pur.svg` | Une seule couleur blanche : photo, gravure, objets |
| `logo-encre.svg` | Une seule couleur encre : impression noir et blanc, tampon |
| `symbole.svg` / `favicon.svg` | Monogramme « c. » sur tuile `ink` arrondie (rayon 22 %) |
| `symbole-blanc.svg` | Monogramme sur tuile blanche, pour fond foncé |
| `apple-touch-icon.png` (180), `brand/icon-512.png` | Tuile carrée pleine (iOS et Android arrondissent eux-mêmes) |
| `favicon.ico` | 16, 32 et 48 px |

Règles :

- Hauteur minimale du logotype : 20 px à l'écran, 6 mm à l'impression. En dessous, symbole seul.
- Zone de protection : la hauteur du « c » tout autour.
- Le logotype ne se recompose jamais en texte vivant, ne se déforme pas, ne change pas de
  couleur hors des quatre versions, ne reçoit ni ombre ni contour.
- Pas de croix suisse ni de drapeau, même stylisés (armoiries protégées par la loi, et cliché).
- En-tête du site : `import Logo from "../../assets/brand/logo.svg"` puis
  `<Logo class="h-xl w-auto md:h-2xl" aria-hidden="true" />` dans un lien vers l'accueil portant
  `aria-label="calculateurs.ch — accueil"`. Pied de page sur fond `ink` : `logo-blanc.svg`, même méthode.

---

## 2. Composants de l'interface

Les recettes ci-dessous sont des listes de classes Tailwind exclusivement composées de tokens.
Un composant `.astro` est créé dans `src/components/ui/` dès qu'une recette sert deux fois.

### 2.1 Boutons

Élément : `<button>` pour une action, `<a>` pour une navigation. Texte en `text-label font-bold`,
casse phrase, verbe d'action (« Calculer », « Voir le détail »).

**Base commune :**
```
inline-flex items-center justify-center gap-sm rounded-button text-label font-bold
no-underline transition-colors duration-150
disabled:cursor-not-allowed aria-disabled:cursor-not-allowed
```

| Variante | Classes | Survol | Actif (pression) | Désactivé |
| --- | --- | --- | --- | --- |
| **Principal** | `bg-accent text-paper border border-accent` | `hover:bg-accent-strong hover:border-accent-strong` | `active:bg-accent-strong` | `disabled:bg-hairline disabled:border-hairline disabled:text-ink-muted` |
| **Secondaire** | `bg-paper text-ink border border-ink` | `hover:bg-tint` | `active:bg-hairline` | `disabled:border-hairline disabled:text-ink-muted` |
| **Fantôme** | `bg-transparent text-accent border border-transparent` | `hover:bg-accent-tint` | `active:bg-accent-tint` | `disabled:text-ink-muted` |
| **Inversé** (sur `ink`) | `bg-paper text-ink border border-paper` | `hover:bg-tint` | — | — |

| Taille | Classes | Hauteur |
| --- | --- | --- |
| `sm` | `min-h-2xl px-lg text-fine` | 32 px — actions secondaires de tableau uniquement (cible tactile étendue par l'espacement) |
| `md` (défaut) | `min-h-3xl px-xl` | 48 px |
| `lg` | `min-h-4xl px-2xl text-body` | 64 px — appel à l'action principal d'un héros |

Focus : anneau global `outline 2px accent, offset 2px` (base) — ne jamais le retirer.
Chargement : `aria-busy="true"` + libellé changé (« Envoi… ») + `disabled` ; pas de spinner animé.
Pleine largeur mobile : ajouter `w-full md:w-auto`. Icône fonctionnelle éventuelle : SVG inline
`aria-hidden="true"`, 20 px, `currentColor`, après le libellé (flèche « → » pour un lien sortant de
la page).

### 2.2 Cartes et conteneurs

| Variante | Classes | Usage |
| --- | --- | --- |
| **Carte** | `rounded-panel bg-paper shadow-card p-xl` | Carte sur fond `paper` (liste de calculateurs) |
| **Carte sur teinte** | `rounded-panel bg-paper p-xl` | Carte posée sur une section `bg-tint` |
| **Panneau** | `rounded-panel bg-tint p-xl` | Encadré, regroupement de champs |
| **Contour** | `rounded-panel border border-hairline bg-paper p-xl` | Tableaux, contenus denses |
| **Section teintée** | `rounded-section bg-tint px-xl py-3xl md:px-3xl md:py-4xl` | Bloc fort dans le flux (FAQ, méthodologie) |
| **Carte résultat** | `rounded-panel bg-accent-tint p-xl md:p-2xl flex flex-col gap-sm` | `ResultCard` (`<output>`), chiffre en `text-display text-accent tabular-nums` |

Carte cliquable (lien vers un calculateur) : tout le contenu dans un `<a class="block no-underline
text-ink rounded-panel …">`, titre `text-subheading`, description `text-body text-ink-muted`,
lien d'action en `text-accent font-bold` à la fin. **Aucune** élévation ni transformation au
survol : seul le titre se souligne (`group-hover:underline`).

Grilles de cartes : `grid gap-xl md:grid-cols-2 lg:grid-cols-3`. Sur mobile, empilement — pas
de carrousel (exclu, coût JS).

### 2.3 Champs de formulaire

Structure (inchangée dans son principe, conserve `NumberField`, `SelectField`, etc.) :

```html
<div class="flex flex-col gap-xs">
  <label for="revenu" class="text-label font-bold">Revenu annuel brut</label>
  <p id="revenu-hint" class="text-fine text-ink-muted">Salaire AVS, avant déductions.</p>
  <div class="flex min-h-3xl items-stretch rounded-control border border-rule bg-paper
              focus-within:border-accent focus-within:outline focus-within:outline-2
              focus-within:outline-accent focus-within:outline-offset-0">
    <input id="revenu" class="w-full min-w-0 bg-transparent px-lg text-body tabular-nums outline-none"
           inputmode="decimal" aria-describedby="revenu-hint revenu-error">
    <span class="flex items-center rounded-r-control border-l border-rule bg-tint px-md text-label text-ink-muted">CHF</span>
  </div>
  <p id="revenu-error" class="text-fine font-bold text-error" hidden>Erreur : indiquez un montant positif.</p>
</div>
```

| État | Rendu |
| --- | --- |
| Repos | Bordure `rule` 1 px, fond `paper`, texte `ink`, `min-h-3xl` (48 px) |
| Survol | `hover:border-ink` |
| Focus | Bordure `accent` + anneau `outline 2px accent` (offset 0) |
| Erreur | `aria-invalid="true"` → `border-error bg-error-tint` ; message `text-error font-bold` **préfixé « Erreur : »** sous le champ |
| Désactivé | `bg-tint text-ink-muted border-hairline cursor-not-allowed` |
| Lecture seule | `bg-tint border-transparent` |

Mise en page :

- Libellé au-dessus du champ, jamais en placeholder. Aide **entre** libellé et champ
  (lue avant la saisie), message d'erreur **sous** le champ.
- Champs obligatoires : marque textuelle « (obligatoire) » en `text-ink-muted font-medium`,
  ou mention globale en tête de formulaire. Pas d'astérisque seul.
- Gap vertical entre champs `gap-xl` ; groupes thématiques dans un `<fieldset>` avec `<legend
  class="text-subheading">`.
- `<select>` : mêmes classes que le conteneur de champ, flèche native conservée.
- Curseur (`<input type="range">`) : natif, `accent-color` via la
  base, toujours couplé à un champ numérique éditable et à une valeur affichée en `tabular-nums`.
- Cases et boutons radio : natifs, 20 px, libellé cliquable à droite, `gap-sm`.
- Choix binaire fréquent (ex. « Marié·e / Célibataire ») : radios stylés en pastilles —
  `rounded-button border border-rule px-lg min-h-3xl`, état coché
  `has-[:checked]:bg-accent-tint has-[:checked]:border-accent has-[:checked]:text-ink`.

### 2.4 Navigation

**En-tête :**

```
<header class="sticky top-0 z-10 border-b border-hairline bg-paper">
  <div class="mx-auto flex max-w-page items-center justify-between gap-xl px-lg md:px-2xl min-h-4xl">
```

- Gauche : nom du site, `text-subheading text-ink no-underline` (mot-symbole texte ; pas de
  logo image tant qu'il n'existe pas en SVG < 2 ko).
- Centre (≥ `md`) : liens de familles en `text-label font-bold text-ink no-underline`,
  `hover:text-accent`, page courante `aria-current="page"` → `text-accent` + soulignement
  2 px décalé (`underline decoration-2 underline-offset-8`).
- Droite : au plus **un** bouton principal `sm`/`md` (ex. « Tous les calculateurs »).
  Pas de recherche ni de sélecteur de langue tant que le site est monolingue.
- Hauteur 64 px. Collant (`sticky`) autorisé ; jamais masqué/réaffiché au défilement (JS).

**Menu mobile (< `md`) — sans JavaScript :**

```html
<details class="md:hidden">
  <summary class="flex min-h-3xl list-none items-center gap-sm rounded-button px-lg text-label font-bold">
    <svg aria-hidden="true" …>…</svg> Menu
  </summary>
  <nav aria-label="Familles de calculateurs"
       class="absolute inset-x-0 top-full border-b border-hairline bg-paper px-lg py-xl shadow-raised">
    <ul class="flex flex-col gap-xs">
      <li><a class="flex min-h-3xl items-center rounded-control px-md text-body font-bold text-ink no-underline hover:bg-tint">…</a></li>
    </ul>
  </nav>
</details>
```

**Fil d'Ariane :** `text-fine text-ink-muted`, séparateur « › » en `aria-hidden`, dernier élément
non lié avec `aria-current="page"`.

**Pied de page :** fond `ink`, texte `paper` (14,57:1), liens `text-paper underline`,
colonnes `grid gap-2xl md:grid-cols-3`, `py-4xl`, mentions en `text-fine`. Variante sobre
autorisée : `bg-tint text-ink`.

**Liens dans le texte :** `accent`, soulignés 1 px (2 px au survol), `underline-offset` 0,15 em.

### 2.5 Résultat de calcul

- Grand écran (`lg`) : deux colonnes `lg:grid-cols-[2fr_3fr]`, saisie à gauche, carte résultat à
  droite en `lg:sticky lg:top-5xl`.
- Mobile : barre collée en bas `fixed inset-x-0 bottom-0 bg-paper shadow-bar px-lg py-md`
  montrant libellé + montant (`text-heading text-accent tabular-nums`) ; lien « Voir le détail »
  vers l'ancre du détail. Elle ne contient jamais d'appel commercial.
- Détail du calcul : `<details>` + `<table>` en registre — libellé à gauche, montant aligné à
  droite `text-right tabular-nums`, lignes séparées par `border-b border-hairline`, total en
  `font-bold border-t-2 border-ink`.

### 2.6 Avis, sources et pastilles

| Élément | Classes |
| --- | --- |
| Avis informatif (`ScopeNotice`, `<aside>`) | `rounded-panel bg-tint p-lg text-label` + titre `font-bold` |
| Avertissement renforcé | `rounded-r-panel border-l-4 border-warning-signal bg-warning-tint p-lg text-label text-ink` + titre « Attention : » `font-bold text-warning` |
| Succès | `rounded-panel bg-success-tint p-lg text-label text-ink`, préfixe « Envoyé : » |
| Erreur globale | `rounded-panel bg-error-tint p-lg text-label text-ink`, préfixe « Erreur : » en `text-error font-bold`, `role="alert"` |
| **Bloc source** (remplace le serif) | `border-l-2 border-hairline pl-md text-fine text-ink-muted` : référence légale/barème, `<cite>` non italique, `<time datetime>` |
| Pastille | `inline-flex items-center rounded-button bg-accent-tint px-sm text-fine font-bold text-accent` (« Données 2026 ») |
| Pastille neutre | `… bg-tint text-ink` |

`DataFreshness` utilise le bloc source.

### 2.7 Tableaux

`w-full border-collapse text-label` ; en-tête `bg-tint text-left font-bold` ; cellules
`px-md py-sm border-b border-hairline` ; montants `text-right tabular-nums` ; tableau large
enveloppé dans `overflow-x-auto rounded-panel border border-hairline` avec `<caption>` visible.

---

## 3. Règles et conventions

### 3.1 Style visuel général

**Clair, aéré, digne de confiance** — une référence suisse sourcée, accessible plutôt
qu'administrative :

- Mode clair uniquement (aucun `dark:`) : les lecteurs impriment et citent.
- Beaucoup de blanc, sections alternées `paper` / `tint`, surfaces arrondies, ombres douces.
- Encre marine pour la lecture, vert sapin pour l'action et le résultat ; orange et rouge
  n'apparaissent que pour avertir ou signaler une erreur.
- Titres gras et compacts (700, approche négative), corps en 500 : contraste de graisse marqué.
- Ton : direct, tutoiement exclu, phrases courtes, chiffres concrets.
- Le chiffre reste le héros : rien ne doit être plus grand ou plus coloré que le résultat.

**Exclus :** pictogrammes et illustrations, modèles 3D, animations Lottie, carrousels,
Alpine.js, fenêtre de consentement — par respect du budget de performance.

### 3.2 Grille de mise en page

- Conteneur : `mx-auto w-full max-w-page px-lg md:px-2xl`.
- Grille 12 colonnes implicite via CSS Grid : `grid gap-2xl lg:grid-cols-12` ; contenu éditorial
  `lg:col-span-8`, aside `lg:col-span-4`. Calculateur : `lg:grid-cols-[2fr_3fr]` (gabarit de
  structure autorisé).
- Texte courant toujours borné par `max-w-reading`, même dans une colonne large.
- Héros de page : H1 + chapeau (`text-lead text-ink-muted`) + au plus un bouton principal,
  `py-3xl md:py-5xl`, aligné à gauche.

### 3.3 Mouvement

Transitions limitées à `transition-colors duration-150` sur boutons, liens et champs.
Interdits : animations d'apparition au défilement, parallaxe, transformations au survol des
cartes, carrousels automatiques, compteurs animés du résultat.

### 3.4 Garde-fous automatiques

- `--color-*: initial` dans `tokens.css` : la palette Tailwind par défaut n'existe plus.
- `@theme static` dans `tokens.css` : toutes les variables CSS sont émises, y compris celles
  qu'aucun utilitaire n'emploie encore. Un graphique en SVG inline lit donc `var(--color-slate)`
  sans dépendre d'une classe présente ailleurs (≈ 1 ko de CSS).
- `tests/design/design-tokens.test.ts` (Vitest, lancé par `npm test` et `predeploy`) : échoue sur
  toute couleur ou dimension arbitraire, style en ligne coloré ou couleur de palette par défaut
  dans `src/components`, `src/layouts`, `src/pages`.

### 3.5 Performance (inchangé, prioritaire sur l'esthétique)

| Budget | Valeur |
| --- | --- |
| JavaScript par page | < 30 ko |
| CSS total | < 100 ko (actuel ≈ 15 ko) |
| Polices | 2 fichiers woff2 latin ≈ 22 ko, `font-display: swap` (Fontsource) |
| LCP (4G simulée) | < 1,5 s |
| Requêtes tierces | 0 |

Ombres, rayons et couleurs n'ont aucun coût réseau. Toute nouvelle graisse, famille, image
décorative ou bibliothèque doit être refusée ou justifiée par une mesure.

### 3.6 Interdits permanents

Bibliothèques de composants ou d'icônes, frameworks d'interface, polices hébergées par un tiers,
mode sombre, dégradés, flou d'arrière-plan, emoji, photographies et illustrations décoratives,
bandeaux de cookies, fenêtres surgissantes, barres d'appel à l'action flottantes (la barre de
résultat mobile n'en est pas une), formulaire de mise en relation affiché avant le résultat
complet.
