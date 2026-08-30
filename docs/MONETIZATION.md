# ChoreScore V2 — modèle freemium et abonnements

Ce document reprend **la dernière grille V1 effectivement codée** puis l'adapte au produit V2. Les comportements sont pilotés par des entitlements, jamais par des conditions dispersées dans l'UI.

## Grille commerciale héritée de V1

### Essai complet

- **30 jours** ;
- toutes les fonctions Premium activées pendant l'essai ;
- aucune donnée n'est détruite à la fin de l'essai.

### Gratuit

- **1 foyer** ;
- saisie CompletedEntry manuelle ou chrono ;
- `Fait par` et `Fait pour` ;
- PersistentTask ;
- partage système ;
- Score limité au **mois civil courant** ;
- aucune pondération ;
- aucune planification To-do.

### Standard

- **2,99 € / mois / foyer** ;
- jusqu'à **7 membres** dans le foyer ;
- fonctions Premium du foyer ;
- multi-foyers autorisé ;
- historique Score complet ;
- pondération ;
- To-do ;
- fonctions avancées prévues par l'entitlement.

### Pro

- **5,99 € / mois / foyer** ;
- requis **à partir de 8 membres** ;
- mêmes fonctions cœur Premium que Standard ;
- capacité de taille supérieure du foyer.

La V1 attachait la facturation au foyer. V2 conserve ce principe : le plan effectif et les droits payants sont résolus au niveau du foyer, avec un propriétaire/payeur. L'utilisateur peut appartenir à plusieurs foyers sans mélanger leurs abonnements ni leurs données.

Les prix devront rester configurables pour localisation, stores et évolutions commerciales ; **2,99 € / 5,99 € sont les références canoniques V1**, pas des constantes métier à répéter dans le code.

## Entitlements

Le modèle expose au minimum :
- `plan: free | trial | standard | pro` ;
- `memberLimit` ;
- `canUseMultipleHouseholds` ;
- `scoreArchiveAccess` ;
- `weightingEnabled` ;
- `todoPlanningEnabled` ;
- `advancedExportEnabled` si retenu ;
- `finePermissionsEnabled` si retenu.

Ne jamais déduire tous les droits uniquement du nom du plan dans l'UI. Les écrans consomment des capacités résolues par `EntitlementGateway`.

## Score gratuit et reset mensuel intelligent

Pour le plan gratuit, Score ne calcule et n'affiche que les CompletedEntry appartenant au **mois civil courant**.

À chaque changement de mois :
- le Score gratuit repart visuellement sur le nouveau mois ;
- les soldes, graphes, statistiques et historique filtré antérieurs quittent la fenêtre gratuite ;
- **aucune CompletedEntry n'est supprimée ni écrasée** ;
- les données antérieures restent persistées ;
- l'app peut signaler honnêtement qu'un historique antérieur existe derrière Premium ;
- un upgrade Trial/Standard/Pro les rend immédiatement à nouveau visibles.

`Semaine` reste disponible lorsqu'elle tombe dans le mois courant. `Mois` = mois courant. `Année` et `Depuis le début`, ainsi que la consultation de mois antérieurs, nécessitent `scoreArchiveAccess`.

Le reset mensuel ne supprime jamais les PersistentTask : elles restent les filtres/raccourcis stables du foyer.

## Pondération Premium

En gratuit :
- la durée réelle fonctionne normalement ;
- le coefficient effectif est 1 ;
- aucune modification de pondération ;
- aucune section pondérée active dans Score.

En Trial/Standard/Pro, la pondération est disponible.

Après downgrade, les poids déjà stockés restent conservés, mais le produit gratuit utilise le temps réel/coefficient effectif 1 et n'expose pas l'édition Premium. Un nouvel upgrade restaure les données de pondération sans perte.

## To-do Premium

La planification To-do est disponible en Trial/Standard/Pro :
- tâche avec ou sans date ;
- assignation ;
- bénéficiaires ;
- deadline ;
- notes ;
- reminder ;
- calendrier lorsque l'intégration réelle est configurée ;
- conversion en CompletedEntry après check + saisie du temps.

En gratuit, l'onglet To-do reste à sa place dans la navigation canonique mais affiche un état Premium utile avec possibilité d'upgrade. Il ne permet pas de créer/planifier de nouvelles TodoItem.

Après downgrade, aucune TodoItem existante n'est détruite. Elle reste persistée et redevient accessible après upgrade.

## Multi-foyers

Comme dans la V1, `canUseMultipleHouseholds` est Premium. Le gratuit est limité à un seul foyer utilisable/créable dans le modèle produit.

L'écran racine montre les foyers auxquels l'utilisateur a accès et une action de création cohérente avec ses droits. Les abonnements étant attachés aux foyers, l'architecture doit permettre des foyers avec propriétaires/payeur/plans différents sans propager les droits d'un foyer dans un autre.

## Upgrade et FOMO honnête

L'écran racine Foyers montre une action **Upgrade / Premium** lorsque pertinente. Des invitations contextuelles à upgrader peuvent apparaître lorsque l'utilisateur tente :
- d'ouvrir un historique antérieur au mois courant ;
- `Année` / `Depuis le début` ;
- la pondération ;
- la planification To-do ;
- l'usage multi-foyers.

Le produit peut montrer qu'il existe des données historiques conservées, mais ne doit jamais prétendre qu'elles sont détruites ou créer une fausse urgence. L'intérêt commercial vient du fait que l'utilisateur sait que son historique continue d'exister et peut être réactivé.

## BillingGateway / EntitlementGateway

Le domaine et l'UI ne dépendent jamais directement d'un fournisseur de paiement.

La V1 utilisait Stripe côté backend ; V2 garde le contrat fournisseur-agnostique :
- `BillingGateway` gère achat/restauration/état de facturation ;
- `EntitlementGateway` traduit cet état en capacités produit ;
- adapters StoreKit / Google Play Billing lorsque les règles des stores l'exigent ;
- Stripe ou autre adapter sur les canaux où il est permis ;
- restauration et synchronisation d'abonnement prévues proprement.

Aucun paiement factice ne doit être présenté comme réel dans une RC locale.
