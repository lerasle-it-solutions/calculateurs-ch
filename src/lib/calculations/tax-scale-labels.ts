/**
 * Libellés fixes de l'évaluation des barèmes (tax-scale.ts), à part de ceux du
 * moteur fiscal (trace-labels.ts) : un calculateur qui n'évalue qu'un barème (A4)
 * ne lit pas les libellés de l'impôt sur le revenu, et le module du moteur reste
 * entier dans le morceau qu'A1, A2 et A3 partagent (budget JavaScript). Même
 * mécanisme que trace-labels.ts, déclaré dans TRACE_LABEL_MODULES.
 */
export const ZERO_BASE = "assiette nulle";
