/**
 * Montant affiché dans le navigateur : le formateur de la construction
 * (src/lib/format/chf.ts), unité après le nombre, « 12’346 CHF ». Sans Intl,
 * le séparateur ne dépend pas du navigateur. Module à part, pour qu'un
 * calculateur l'importe sans entraîner l'affichage d'un autre dans son paquet.
 */
import { formatChf } from "../format/chf";

export const formatChfAmount = (value: number): string => `${formatChf(value)} CHF`;
