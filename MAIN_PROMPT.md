# ChoreScore V2 — constitution produit et technique

## Autorité

Ce dépôt est un **rebuild greenfield**. L'ancien dépôt `Mickalive/Chorescore` est une archive : aucune app, aucun modèle métier, aucun test produit et aucune migration de l'ancienne V1 ne constituent une base de confiance. Une brique technique ancienne peut être réimplémentée ou reprise seulement si elle est isolée, comprise, utile à la V2 et auditée comme telle.

Ordre d'autorité : sécurité/droit > ce fichier > `governance/RELEASE_DEFINITION.json` > `docs/ROADMAP.md` > `docs/PRODUCT_BLUEPRINT.md` / `docs/MONETIZATION.md` / `docs/QUALITY_GATES.md` / `docs/DESIGN_CONTRACT.md` > `docs/architecture.md` > rôle > tâche active.

Une suite de tests verte ne vaut jamais validation produit si l'UX ou le comportement divergent de cette constitution.

## Produit

**ChoreScore est un Tricount du temps domestique, avec un planning To-do partagé. KISS.**

Après connexion, l'utilisateur voit ses **foyers** et peut en créer selon le quota de son abonnement. Dans un foyer, la navigation principale comporte exactement :

1. **Ajouter une tâche**
2. **Score**
3. **To-do**

Pas d'onglet Historique, Classement, Bilan, Profil ou Foyer supplémentaire dans cette navigation.

## Identité, foyers et abonnement

En production, l'utilisateur se connecte avec sa propre identité : compte ChoreScore/email, Google ou Facebook. L'identité connectée est fixe ; `Fait par` est une donnée d'une entrée, pas une façon de changer d'identité.

L'écran racine affiche les foyers accessibles, `Créer un foyer` si le quota le permet, `Options` et, pour un compte non Premium, une action **Upgrade / Passer à Premium** claire. Le nombre de foyers dépend d'un entitlement numérique (`householdLimit` ou équivalent).

Le Premium n'est pas synonyme de multi-foyers : un **Premium 1 foyer** doit pouvoir exister, et d'autres paliers Premium peuvent augmenter `householdLimit`. Les prix, noms et limites exactes viennent de la configuration de facturation ; ne pas les disperser dans le code.

Tout utilisateur a des Options personnelles (notifications, confidentialité, légal, préférences). Le payeur/propriétaire voit en plus les Options du foyer : abonnement/quota, administration et permissions disponibles selon le plan. Cela ne devient pas un quatrième onglet.

Le modèle collaboratif par défaut repose sur la confiance, comme Tricount : les membres peuvent saisir, corriger et organiser pour les autres. Des permissions fines peuvent être proposées selon le plan du propriétaire.

### Freemium canonique

La version gratuite reste utilisable pour saisir le travail domestique mais ses capacités sont limitées par entitlement :
- un foyer par défaut ;
- CompletedEntry manuelle ou chrono ;
- Fait par / Fait pour ;
- PersistentTask ;
- partage système ;
- **Score limité au mois civil courant** ;
- pas de pondération ;
- pas de planification To-do.

Au changement de mois, le Score gratuit recommence sur le nouveau mois. **Les anciennes données ne sont jamais effacées** : elles restent persistées mais deviennent hors de la fenêtre gratuite. Un upgrade Premium doit les rendre à nouveau accessibles immédiatement.

La pondération Premium et les TodoItem créées pendant une période Premium ne sont jamais détruites après downgrade ; elles sont simplement non disponibles selon les droits courants et doivent pouvoir réapparaître après upgrade.

Les règles détaillées d'entitlement et de downgrade/upgrade sont dans `docs/MONETIZATION.md`.

## Ajouter une tâche = saisie + historique complet

Une réalisation crée une **CompletedEntry indépendante**. Deux réalisations identiques restent deux entrées.

Champs cœur :
- `label` libre ;
- `performedByMemberId` = **fait par qui** ;
- `beneficiaryMemberIds[]` = **fait pour qui** ;
- durée réelle ;
- foyer ;
- date/heure ;
- `persistentTaskId` facultatif ;
- pondération avancée facultative lorsque l'entitlement l'autorise ;
- traçabilité `createdBy/modifiedBy` si nécessaire.

`Fait par` sélectionne par défaut l'utilisateur connecté mais peut être changé pour n'importe quel membre du foyer. `Fait pour` permet `Tout le monde` ou n'importe quel sous-ensemble non vide des membres.

Il existe exactement deux modes de durée : **durée manuelle** ou **chrono**. **1 minute réelle = 1 minute réelle.**

Sous la saisie se trouve **tout l'historique chronologique du foyer**, comme les dépenses dans Tricount. Chaque ligne montre de façon compacte quoi, durée, fait par, fait pour, date. Modifier/supprimer via interaction compacte.

## PersistentTask

Une `PersistentTask` est facultative. Elle sert uniquement à accélérer la saisie, mémoriser éventuellement une pondération par défaut et créer **exactement un filtre stable dans Score**.

**Une PersistentTask = un filtre Score.** Les libellés non persistants ne créent jamais de filtres, même s'ils se répètent. Ils restent individuellement dans l'historique complet et sont regroupés sous **Autres** dans Score.

PersistentTask n'est ni une réalisation ni une To-do. Les PersistentTask ne sont pas supprimées au reset mensuel gratuit.

## Score = statistiques + équilibres + historique filtré

Score est l'équivalent d'**Équilibres** de Tricount enrichi de statistiques.

Périodes produit : **Semaine / Mois / Année / Depuis le début**. Pour un compte gratuit, la fenêtre accessible reste le **mois civil courant** : Semaine et Mois sont utilisables dans cette fenêtre ; Année, Depuis le début et toute donnée antérieure au mois courant sont Premium.

Filtres : **Toutes / chaque PersistentTask / Autres**. Le filtre s'applique aux calculs, graphes et historique contextuel.

Pour une CompletedEntry de durée `D`, faite par `P` pour `N` bénéficiaires :
- `P` reçoit un crédit `+D` ;
- chaque bénéficiaire reçoit `-D/N` ;
- si P est bénéficiaire, sa propre quote-part se compense naturellement.

La somme des soldes du foyer vaut zéro. Les soldes positifs/négatifs servent à proposer simplement **qui doit rattraper combien de temps auprès de qui**, comme les remboursements Tricount.

Score affiche au minimum :
- soldes/avance-retard réels ;
- proposition de compensation pair-à-pair ;
- temps réellement effectué par membre ;
- graphique en barres avec **nom + valeur directement lisibles**.

L'identité d'un membre ne dépend pas d'une couleur fixe. Les couleurs servent seulement à la lisibilité et ne doivent pas limiter le nombre de membres.

La pondération est Premium, avancée, coefficient 1 par défaut, et ne change jamais le temps réel. La même logique fait-par/fait-pour produit une section secondaire d'**heures pondérées** : soldes/compensations + graphique pondéré. Aucun point abstrait.

Sous les statistiques, Score affiche l'**historique correspondant exactement à la période et au filtre sélectionnés**. Donc : Ajouter = historique complet ; Score = historique filtré/contextuel. Sur gratuit, cet historique Score est limité au mois courant sans supprimer les entrées plus anciennes.

## To-do = planning futur Premium

`TodoItem` représente quelque chose à faire. La planification To-do est une capacité Premium. Elle peut être sans date, datée/deadline, assignée à un membre, destinée à tout ou partie du foyer, liée à une PersistentTask, accompagnée de notes et d'un rappel, et synchronisable avec un calendrier lorsque l'intégration réelle est active.

Pour un compte sans entitlement To-do, l'onglet existe dans la structure du foyer mais présente honnêtement la capacité Premium et l'upgrade ; il ne simule pas un planning disponible. Un downgrade ne détruit aucune TodoItem existante.

Une To-do Premium possède un check clair. Lorsqu'elle est marquée faite :
1. mini-formulaire ;
2. `Fait par` par défaut = membre qui valide, mais modifiable ;
3. durée réelle demandée ;
4. `Fait pour` repris de la To-do ou sélectionné ;
5. TodoItem terminée ;
6. création d'une CompletedEntry indépendante ;
7. mise à jour immédiate de l'historique et de Score.

## Partage

Le partage utilise **uniquement le share sheet natif du système**. Aucune intégration spécifique Instagram/Facebook/WhatsApp n'est nécessaire : Android/iOS présentent les applications installées compatibles.

Le partage doit être contextuel : entrée, sélection d'historique, Score courant, équilibres/graphes, historique filtré, To-do/planning. Des share cards ChoreScore peuvent être générées, mais l'utilisateur choisit ce qu'il partage et l'app n'invente jamais de jugement culpabilisant.

## Dépendances / frontières obligatoires dès le socle

Le domaine ne dépend directement d'aucun fournisseur externe. Prévoir des ports/adapters explicites pour :
- `AuthGateway` : email/compte, Google, Facebook ;
- `EntitlementGateway` / `BillingGateway` : householdLimit et capacités Premium ;
- `SystemShareGateway` : share sheet natif ;
- `NotificationGateway` : notifications locales puis push quand configuré ;
- `CalendarGateway` : calendrier device/synchronisation quand autorisée ;
- `SecureStorageGateway` : tokens/secrets locaux ;
- `SyncGateway` / repositories : futur backend multi-device ;
- deep links/invitations si nécessaires.

Les adapters de développement peuvent être locaux, mais **aucun OAuth, paiement, push, calendrier distant ou sync réseau ne doit être présenté comme réel sans configuration réelle**.

Le choix fournisseur peut évoluer. L'architecture doit permettre un adapter Firebase Auth/Firestore ou équivalent sans contaminer le domaine. Le billing doit rester abstrait : StoreKit / Google Play Billing lorsque les stores l'exigent, Stripe ou autre sur les canaux où cela est permis. Aucun fournisseur n'est hardcodé dans le domaine.

## UX / design

Direction : **feel-good, chaleureuse, contemporaine, énergique mais pas enfantine**.

- éviter le blanc dominant ;
- fonds teintés doux et surfaces colorées légères ;
- typographie nette ;
- formulaires courts ;
- graphes lisibles avec noms et temps ;
- aucune palette identitaire finie par membre ;
- peu de texte permanent ;
- upgrade clair mais non trompeur ;
- aucune interprétation morale/psychologique automatique ;
- accessibilité, grandes tailles de texte, contrastes, états vides et erreurs font partie du produit.

Les agents doivent suivre `docs/PRODUCT_BLUEPRINT.md`, `docs/DESIGN_CONTRACT.md`, `docs/REFERENCE_SCENARIOS.json` et `docs/QUALITY_GATES.md`.

## Objets métier à ne jamais fusionner

- `CompletedEntry` = réalisation passée avec fait-par + fait-pour ;
- `PersistentTask` = raccourci + filtre Score ;
- `TodoItem` = travail futur.

## Condition terminale

La factory ne s'arrête que lorsque tous les critères de release sont prouvés, aucun finding bloquant n'est ouvert, l'UX est conforme, les entitlements sont prouvés sans destruction de données, les dépendances externes sont honnêtement encapsulées, et un **APK Android reproductible est réellement compilé, installé, lancé et traversé par le golden path E2E**.

**Construire la V2 depuis zéro. Réutiliser seulement des briques isolées après audit, jamais l'ancienne app comme fondation.**
