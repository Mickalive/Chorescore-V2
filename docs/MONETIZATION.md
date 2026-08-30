# ChoreScore V2 — modèle freemium et entitlements

Ce document précise les règles commerciales canoniques. Il ne fixe pas encore les prix ni les noms définitifs des plans. Les comportements sont pilotés par des **entitlements**, jamais par des `if (planName === ...)` dispersés dans l'app.

## Principe

Le Premium n'est **pas** synonyme de multi-foyers.

Il doit être possible d'acheter un plan Premium avec un seul foyer afin de débloquer les fonctions avancées. D'autres paliers Premium augmentent ensuite le nombre de foyers autorisés. Le modèle de plan contient donc au minimum des capacités séparées :

- `householdLimit` ;
- `scoreArchiveAccess` ou équivalent ;
- `weightingEnabled` ;
- `todoPlanningEnabled` ;
- capacités futures de permissions/analytics/export si retenues.

## Version gratuite

La version gratuite doit rester réellement utilisable pour enregistrer le travail domestique.

Entitlements canoniques :
- un foyer autorisé par défaut (`householdLimit = 1`) ;
- création de CompletedEntry manuelle ou par chrono ;
- `Fait par` et `Fait pour` disponibles ;
- PersistentTask disponible comme raccourci/filtre ;
- partage système disponible ;
- **Score limité aux données du mois civil courant** ;
- pas de pondération ;
- pas de planification To-do.

`Semaine` reste utilisable comme sous-période du mois courant. `Mois` montre le mois civil courant. Les vues nécessitant l'historique antérieur (notamment Année / Depuis le début) sont Premium et doivent expliquer clairement qu'elles débloquent les données conservées.

## Reset mensuel intelligent

À chaque changement de mois civil :
- le Score gratuit recommence visuellement sur le nouveau mois ;
- les statistiques, soldes, graphes et historique filtré gratuits n'incluent plus les mois antérieurs ;
- **aucune CompletedEntry antérieure n'est supprimée ni écrasée** ;
- les données restent persistées/synchronisées selon l'architecture disponible ;
- un upgrade Premium doit rendre immédiatement à nouveau accessibles les périodes antérieures.

L'UI peut signaler qu'un historique antérieur existe et qu'il est disponible avec Premium, mais ne doit jamais prétendre que les données ont été effacées si elles ne le sont pas.

Les PersistentTask sont des définitions réutilisables et ne sont pas supprimées au changement de mois. Le reset concerne la **fenêtre de données visible/calculable gratuitement dans Score**, pas le modèle métier.

## Pondération Premium

La version gratuite conserve toujours le temps réel. Elle ne peut pas :
- définir/modifier un coefficient de pondération ;
- afficher les soldes/graphes pondérés comme fonctionnalité active.

Si des données de pondération existent après un downgrade, elles sont conservées mais non modifiables/non exposées comme fonction gratuite. Un upgrade restaure la fonction sans perte.

## To-do Premium

La planification To-do est une capacité Premium : création, édition, assignation, date/deadline, reminder et calendrier appartiennent à `todoPlanningEnabled`.

Un downgrade ne détruit jamais les TodoItem déjà persistées. Elles restent conservées pour restauration après upgrade. L'UX de compte downgradé doit être honnête sur leur état verrouillé et proposer l'upgrade sans simuler une suppression.

## Upgrade

Sur l'écran racine Foyers, un utilisateur non Premium voit une action d'upgrade claire mais non intrusive. Elle peut aussi apparaître contextuellement lorsqu'il tente d'accéder à :
- historique Score antérieur au mois courant ;
- Année / Depuis le début ;
- pondération ;
- planification To-do ;
- création d'un foyer au-delà de son `householdLimit`.

Le paywall doit expliquer **ce qui sera débloqué**. Il ne doit pas être trompeur, bloquer la saisie de base ni prétendre que des données sont perdues.

## BillingGateway

Le domaine et l'UI ne dépendent jamais directement de Stripe, Google Play Billing ou StoreKit.

`BillingGateway` / `EntitlementGateway` exposent les capacités du compte. Les adapters de production dépendent du canal de distribution :
- achats intégrés / abonnements du store lorsque les règles de la plateforme l'exigent ;
- Stripe ou autre fournisseur pour le web/direct lorsque juridiquement et contractuellement permis ;
- restauration/synchronisation des achats pour éviter les doubles abonnements et récupérer les entitlements sur les appareils concernés.

Aucun écran de paiement factice en RC locale. Les prix, périodes d'essai et noms commerciaux sont configuration, pas logique métier hardcodée.
