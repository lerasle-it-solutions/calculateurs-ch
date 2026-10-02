/**
 * Recettes de classes des champs de formulaire (docs/design-system.md § 2.3),
 * partagées par NumberField, SelectField, TextField, MunicipalityField et
 * LeadForm. Uniquement des tokens.
 *
 * États : repos (bordure `rule`), survol (`ink`), focus (bordure et anneau
 * `accent`), erreur (`aria-invalid="true"` → `error`), désactivé (`tint`).
 */

/** Libellé, au-dessus du champ. */
export const fieldLabel = "text-label font-bold";

/** Marque « (obligatoire) », accolée au libellé. */
export const fieldRequired = "font-medium text-ink-muted";

/** Aide, entre le libellé et le champ : lue avant la saisie. */
export const fieldHint = "text-fine text-ink-muted";

/** Champ autonome : <select>, <input> sans unité. */
export const fieldControl =
	"min-h-3xl w-full min-w-0 rounded-control border border-rule bg-paper px-lg text-body transition-colors duration-150 " +
	"hover:border-ink focus:border-accent focus:outline-2 focus:outline-accent focus:outline-offset-0 " +
	"aria-invalid:border-error aria-invalid:bg-error-tint " +
	"disabled:cursor-not-allowed disabled:border-hairline disabled:bg-tint disabled:text-ink-muted";

/** Cadre d'un champ composé (saisie + segment d'unité) : il porte bordure, focus et états. */
export const fieldFrame =
	"flex min-h-3xl min-w-0 items-stretch rounded-control border border-rule bg-paper transition-colors duration-150 " +
	"hover:border-ink focus-within:border-accent focus-within:outline-2 focus-within:outline-accent focus-within:outline-offset-0 " +
	"has-[[aria-invalid=true]]:border-error has-[[aria-invalid=true]]:bg-error-tint " +
	"has-[:disabled]:cursor-not-allowed has-[:disabled]:border-hairline has-[:disabled]:bg-tint has-[:disabled]:text-ink-muted";

/** Saisie dans un cadre : transparente, le cadre dessine le focus. */
export const fieldFramedInput =
	"w-full min-w-0 bg-transparent px-lg text-body tabular-nums outline-none disabled:cursor-not-allowed";

/** Segment d'unité à droite de la saisie (« CHF », « % »). */
export const fieldUnit =
	"flex items-center rounded-r-control border-l border-rule bg-tint px-md text-label text-ink-muted";
