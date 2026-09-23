---
description: Exécute une session du plan d'exécution (ex. /session 06)
---

Lis `CLAUDE.md` à la racine, puis `docs/plan/INDEX.md` pour trouver le fichier correspondant à la semaine $ARGUMENTS, puis ce fichier.

Ensuite :

1. Annonce-moi en trois lignes ce que contient la session : les étapes, dans l'ordre, avec leur durée.
2. Demande-moi laquelle nous faisons — session A ou session B — si le fichier en contient plusieurs.
3. Exécute les étapes **une par une**, dans l'ordre du fichier. Tu ne prends pas d'avance.
4. **Avant chaque valeur chiffrée à relever à la source, arrête-toi et demande-la-moi.** Tu n'inventes ni valeur, ni URL, ni référence légale. Si je ne l'ai pas, tu écris `TODO` et tu me le signales.
5. Si le fichier demande d'ajouter des sources, applique le prompt standard de `docs/plan/sources.md` et vérifie la ligne du registre correspondant à la semaine.
6. Si le fichier comporte un bloc « Documentation », il fait partie du « Fini quand » : ne considère pas la session terminée sans lui.
7. Avant toute mise en ligne, exécute `npm run test` puis `npm run build`, et parcours `docs/plan/checklist.md`.
8. À la fin : ajoute trois lignes à `JOURNAL.md` (ce qui est fait, ce qui bloque, ce qui est décidé), et coche dans le fichier de la semaine ce qui est terminé.

Tu ne modifies jamais un test ni un fichier de référence pour faire passer une suite. Si une suite résiste après trois tentatives, tu t'arrêtes et tu me présentes un tableau : cas, champ, attendu, obtenu, hypothèse.
