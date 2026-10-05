/**
 * Éléments HTML du texte d'un article (MDX), stylés par le design system :
 * passés à <Content components={proseComponents} />. Aucun italique
 * synthétique (Figtree n'est chargée qu'en romain) : `em` garde sa valeur
 * d'emphase, rendue en encre atténuée.
 */
import Em from "./prose/Em.astro";
import H2 from "./prose/H2.astro";
import H3 from "./prose/H3.astro";
import Li from "./prose/Li.astro";
import Ol from "./prose/Ol.astro";
import P from "./prose/P.astro";
import Table from "./prose/Table.astro";
import Td from "./prose/Td.astro";
import Th from "./prose/Th.astro";
import Ul from "./prose/Ul.astro";

export const proseComponents = { em: Em, h2: H2, h3: H3, li: Li, ol: Ol, p: P, table: Table, td: Td, th: Th, ul: Ul };
