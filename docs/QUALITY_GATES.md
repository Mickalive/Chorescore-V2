# ChoreScore V2 — quality gates

Ces gates s'ajoutent aux critères V2-00..V2-07. Un critère n'est pas « fini » parce que le code compile : il doit produire un comportement réel, cohérent avec le blueprint, le design contract et le modèle d'entitlements.

## QG-1 — Aucun faux produit

Avant acceptation d'un critère :
- aucun bouton visible sans comportement réel ou état explicitement indisponible ;
- aucun placeholder/TODO/lorem/demo trompeur dans une fonction déclarée terminée ;
- aucune intégration externe présentée comme active si elle ne l'est pas ;
- aucun écran hérité conceptuellement de la V1 s'il ne correspond pas à la V2 ;
- aucun paywall qui prétend qu'une donnée a été supprimée alors qu'elle est seulement verrouillée.

## QG-2 — Référence déterministe

`docs/REFERENCE_SCENARIOS.json` est la fixture canonique de test/démo.

À mesure que les fonctions existent, les tests doivent prouver exactement les valeurs attendues : filtres, soldes réels, soldes pondérés, compensations, historique, conversion To-do -> CompletedEntry.

La fixture reste limitée aux environnements test/démo. Elle ne doit jamais devenir une donnée utilisateur de production.

## QG-3 — UX écran par écran

Le candidat doit respecter `docs/PRODUCT_BLUEPRINT.md` : hiérarchie des écrans, placement de l'historique, ordre mental des actions, Score, To-do, Options, upgrade et états vides/erreurs.

Toute divergence importante est `mustFix`, même si les tests unitaires sont verts.

## QG-4 — Design et accessibilité

Le candidat doit respecter `docs/DESIGN_CONTRACT.md`.

Au plus tard en V2-05, fournir des preuves visuelles reproductibles des écrans cœur avec la fixture canonique :
- racine foyers avec état d'abonnement/upgrade pertinent ;
- Ajouter une tâche + historique peuplé ;
- Score réel/pondéré + historique filtré ;
- version gratuite limitée au mois courant avec archive Premium honnête ;
- To-do Premium peuplée + modal de complétion ;
- état To-do verrouillé/non Premium ;
- au moins un état vide/erreur pertinent.

Les preuves peuvent être captures Android ou autre rendu déterministe suffisamment fidèle au produit mobile. Elles doivent être conservées comme artefacts d'audit. Les checks accessibilité incluent contraste, labels, ordre de focus/lecture, touch targets, grandes tailles de texte et reduce-motion lorsque pertinent.

## QG-5 — Entitlements et non-destruction

Les tests doivent prouver au minimum :
- essai complet = 30 jours ;
- Standard = 2,99 EUR/mois/foyer et maximum 7 membres ;
- Pro = 5,99 EUR/mois/foyer et requis à partir de 8 membres ;
- plan/billing attaché au foyer, jamais propagé globalement au compte ;
- un compte gratuit peut créer/posséder un foyer gratuit ;
- un compte gratuit peut rejoindre plusieurs foyers par invitation sans achat personnel ;
- les droits utilisés dans chaque foyer invité viennent du plan de ce foyer ;
- un foyer supplémentaire créé/possédé dispose de son propre état de plan/billing ;
- gratuit : historique visible et Score limités au mois civil courant ;
- passage au mois suivant : anciens calculs/entrées disparaissent des vues gratuites mais les données persistent ;
- upgrade : les données historiques redeviennent immédiatement accessibles ;
- downgrade : aucune CompletedEntry, PersistentTask, donnée de pondération ou TodoItem n'est supprimée ;
- gratuit : pondération inactive ;
- gratuit : planification To-do inactive.

## QG-6 — Performance perceptible

Pour les parcours locaux cœur :
- pas d'attente réseau artificielle ;
- saisie/validation immédiatement reflétée dans l'UI ;
- listes raisonnables virtualisées ou bornées correctement ;
- aucun recalcul de Score perceptiblement bloquant sur des volumes domestiques réalistes ;
- le chrono et les données survivent aux reprises prévues.

## QG-7 — Golden path Android obligatoire

Avant V2-07 complet, le repo doit fournir un script `npm run e2e:android` (ou contrat équivalent explicitement appelé par la Factory) exécuté sur l'APK installé, réseau désactivé lorsque le scénario est local.

Il doit automatiser au minimum le `goldenPath` de `docs/REFERENCE_SCENARIOS.json` :
1. ouvrir le foyer démo ;
2. vérifier les trois onglets ;
3. créer une CompletedEntry avec Fait par/Fait pour ;
4. vérifier l'historique complet ;
5. vérifier Score et un résultat chiffré attendu ;
6. terminer une To-do en renseignant le temps dans un contexte Premium de test ;
7. vérifier qu'une seule CompletedEntry est créée et que Score change ;
8. vérifier au moins un comportement d'entitlement gratuit/Premium ;
9. vérifier le changement de mois gratuit sans destruction des données ;
10. déclencher un contexte de share sheet système quand la plateforme de test le permet.

Le test E2E produit un dossier de preuves : résultat machine lisible + captures aux checkpoints utiles. Un simple lancement de l'app n'est pas une preuve suffisante de V2-07.

## QG-8 — Audit de régression cumulative

À chaque cycle, l'Auditor contrôle aussi les invariants des critères déjà acceptés. Une nouvelle fonction qui casse un flux antérieur entraîne `repair`/`reject`, même si le critère courant est localement correct.
