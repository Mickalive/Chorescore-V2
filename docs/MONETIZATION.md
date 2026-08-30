# ChoreScore V2 — modèle freemium et abonnements

Ce document reprend **la dernière grille V1 effectivement codée** puis l'adapte au produit V2. Les comportements sont pilotés par des entitlements, jamais par des conditions dispersées dans l'UI.

## Grille commerciale héritée de V1

### Essai complet

- **30 jours** ;
- toutes les fonctions Premium activées pendant l'essai ;
- aucune donnée n'est détruite à la fin de l'essai.

### Gratuit

- l'utilisateur peut **créer/posséder un foyer gratuit** ;
- il peut rejoindre sans payer les foyers auxquels il est invité ;
- saisie CompletedEntry manuelle ou chrono ;
- `Fait par` et `Fait pour` ;
- PersistentTask ;
- partage système ;
- historique visible limité au **mois civil courant** ;
- Score limité au **mois civil courant** ;
- aucune pondération ;
- aucune planification To-do.

### Standard

- **2,99 € / mois / foyer** ;
- jusqu'à **7 membres** dans le foyer ;
- fonctions Premium du foyer ;
- historique complet ;
- pondération ;
- To-do ;
- export PDF/avancé ;
- possibilité de créer/posséder plusieurs foyers, chaque foyer payant gardant son propre abonnement ;
- fonctions avancées prévues par l'entitlement.

### Pro

- **5,99 € / mois / foyer** ;
- requis **à partir de 8 membres** ;
- mêmes fonctions cœur Premium que Standard ;
- capacité de taille supérieure du foyer.

La V1 attachait la facturation au foyer. V2 conserve ce principe : le plan effectif et les droits payants sont résolus au niveau du foyer, avec un propriétaire/payeur. L'utilisateur peut appartenir à plusieurs foyers sans mélanger leurs abonnements ni leurs données.

Les prix restent configurables pour localisation, stores et évolutions commerciales ; **2,99 € / 5,99 € sont les références canoniques V1**, pas des constantes métier à répéter dans le code.

## Entitlements

Le modèle expose au minimum :
- `plan: free | trial | standard | pro` ;
- `memberLimit` ;
- `canCreateAdditionalOwnedHousehold` ou équivalent ;
- `scoreArchiveAccess` ;
- `historyArchiveAccess` ;
- `weightingEnabled` ;
- `todoPlanningEnabled` ;
- `advancedExportEnabled` ;
- `finePermissionsEnabled` si retenu.

Le nombre de foyers **rejoints par invitation** n'est pas limité par le fait que le compte soit gratuit. La limite gratuite concerne la création/possession d'un foyer gratuit. Un foyer invité apporte ses propres droits selon son propre plan.

Ne jamais déduire tous les droits uniquement du nom du plan dans l'UI. Les écrans consomment des capacités résolues par `EntitlementGateway`.

## Historique gratuit et reset mensuel intelligent

Pour le plan gratuit, les vues d'historique et Score n'affichent que les CompletedEntry appartenant au **mois civil courant**.

À chaque changement de mois :
- l'historique visible sous Ajouter une tâche repart sur le nouveau mois ;
- le Score gratuit repart visuellement sur le nouveau mois ;
- soldes, graphes, statistiques et historique filtré antérieurs quittent la fenêtre gratuite ;
- **aucune CompletedEntry n'est supprimée ni écrasée** ;
- les données antérieures restent persistées ;
- l'app peut signaler honnêtement qu'un historique antérieur existe derrière Premium ;
- un upgrade Trial/Standard/Pro les rend immédiatement à nouveau visibles partout.

`Semaine` reste disponible lorsqu'elle tombe dans le mois courant. `Mois` = mois courant. `Année`, `Depuis le début` et la consultation de mois antérieurs nécessitent `scoreArchiveAccess`.

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

## Multi-foyers et invitations

La règle canonique V2 est :
- un compte gratuit peut créer/posséder **un foyer gratuit** ;
- il peut **rejoindre plusieurs foyers par invitation** sans devoir devenir Premium lui-même ;
- les capacités disponibles dans un foyer invité dépendent du plan de ce foyer ;
- pour créer/posséder des foyers supplémentaires, chacun doit disposer de son propre état de plan/billing (trial, Standard ou Pro selon le cas) ;
- les droits d'un foyer ne se propagent jamais à un autre foyer.

Cette règle préserve la viralité des invitations tout en restant cohérente avec une facturation **par foyer**.

## Upgrade et FOMO honnête

L'écran racine Foyers montre une action **Upgrade / Premium** lorsque pertinente. Des invitations contextuelles à upgrader peuvent apparaître lorsque l'utilisateur tente :
- d'ouvrir un historique antérieur au mois courant ;
- `Année` / `Depuis le début` ;
- la pondération ;
- la planification To-do ;
- de créer/posséder un foyer supplémentaire.

Le produit peut montrer qu'il existe des données historiques conservées, mais ne doit jamais prétendre qu'elles sont détruites ou créer une fausse urgence. L'intérêt commercial vient du fait que l'utilisateur sait que son historique continue d'exister et peut être réactivé.

## BillingGateway / EntitlementGateway

Le domaine et l'UI ne dépendent jamais directement d'un fournisseur de paiement.

La V1 utilisait Stripe côté backend ; V2 garde le contrat fournisseur-agnostique :
- `BillingGateway` gère achat/restauration/état de facturation du foyer ;
- `EntitlementGateway` traduit cet état en capacités produit ;
- adapters StoreKit / Google Play Billing lorsque les règles des stores l'exigent ;
- Stripe ou autre adapter sur les canaux où il est permis ;
- restauration et synchronisation d'abonnement prévues proprement.

Aucun paiement factice ne doit être présenté comme réel dans une RC locale.
