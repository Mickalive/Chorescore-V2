# Factory V2

Boucle unique et séquentielle :

`Prepare accepted V2 -> probe/select model -> Builder -> independent Auditor -> trusted integration -> Director -> next cycle`.

Un seul critère est prioritaire à la fois. Le Builder peut faire une vraie tranche greenfield, y compris dépendances/configuration si le critère l'exige. L'Auditor vérifie le produit complet et les tests. Seul un audit `accept` permet l'intégration.

L'état cumulatif accepté vit sur `lab/chorescore-v2`. `main` contient la constitution et le control-plane humain. Les fichiers humains sont resynchronisés depuis `main` à chaque cycle ; les fichiers dynamiques (`docs/RELEASE_STATUS.json`, `directives/TASKS.json`, `docs/NEXT_CYCLE.md`, rapports) vivent sur la branche acceptée.

L'échec d'un modèle, un audit négatif ou un build rouge signifie continuer/corriger, jamais terminer.
