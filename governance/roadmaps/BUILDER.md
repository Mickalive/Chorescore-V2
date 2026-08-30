# Roadmap du Greenfield Builder

Tu construis ChoreScore V2 tranche par tranche, mais tu dois toujours connaître la destination complète définie dans `docs/ROADMAP.md`.

## Règles permanentes

- Implémente uniquement le critère actif et ses réparations obligatoires.
- Ne prends aucune décision locale qui rend un critère futur artificiellement difficile.
- Préfère des contrats petits, purs et testables.
- Le domaine ne connaît ni Firebase, ni Google, ni Meta, ni Expo APIs, ni Stripe/store billing, ni fournisseur analytics.
- Toute dépendance nouvelle doit avoir une raison produit/plateforme claire.
- Ne copie jamais la V1 comme base. Une brique consultée doit passer le reuse gate.
- Les tests prouvent du comportement, pas la structure que tu viens d'écrire.
- Le design/UX est construit au fil des tranches ; ne crée pas volontairement une UI jetable si une structure simple et durable est possible.
- Le backend opérationnel et le Research Analytics Plane sont deux systèmes logiquement séparés.
- Ne qualifie jamais de données « anonymes » de simples UUID, hashes ou identifiants pseudonymes.
- Aucun identifiant opérationnel, texte libre ou clé de jointure ne doit entrer dans un produit de données externe.
- L'analytics est secondaire : le désactiver ne doit jamais casser ChoreScore.

## Focus par phase

### V2-00
Créer le socle, les ports et le shell. Éviter de pré-implémenter Score/To-do avec des faux écrans complexes. Assurer que les dépendances Expo choisies compilent/exportent réellement. Prévoir `ResearchAnalyticsGateway` comme sortie secondaire désactivable, sans collecte réseau factice.

### V2-01
Construire l'identité et les foyers sans enfermer le domaine dans un fournisseur auth. Les droits viennent d'EntitlementGateway, pas d'un `if premium` dispersé. Garder les IDs de compte/foyer confinés au plan opérationnel.

### V2-02
Faire de CompletedEntry la source de vérité historique. `performedBy` et `beneficiaryMemberIds` sont obligatoires. Timer et saisie manuelle convergent vers la même création d'entrée. Préparer une normalisation analytique des tâches sans imposer de catégories dans l'UX et sans exporter le texte libre.

### V2-03
Isoler les calculs de Score en fonctions pures fortement testées. Conserver les fractions/secondes avec précision et n'arrondir qu'à l'affichage. Les graphes ne sont qu'une vue des données calculées.

### V2-04
TodoItem reste distincte. La complétion doit être transactionnelle/idempotente : ne jamais créer deux CompletedEntry pour une même validation accidentellement répétée.

### V2-05
Utiliser le share sheet système via SystemShareGateway. Ne pas ajouter de SDK réseau social. Construire les contenus partagés sans fuite involontaire de données. Traiter accessibilité et design comme critères bloquants.

### V2-06
Brancher/finaliser les adapters production sans contaminer le domaine. Traiter auth, sync, autorisations, secrets, billing, invitations et conflits explicitement. Construire la séparation :
- Operational Store sécurisé et jamais vendu ;
- Research Analytics Store sans ID opérationnel ni texte libre ;
- TaskTaxonomyService ;
- PrivacyTransformPipeline ;
- PrivacyReleaseGate ;
- suppression de cellules rares et protections differencing/reconstruction ;
- query budget/rate limit/differential privacy lorsque nécessaire ;
- journal d'export et documentation de finalité/consentement.

Aucun export réel foyer-par-foyer même pseudonymisé.

### V2-07
Aucun développement opportuniste. Le produit doit être figé ; seules les réparations requises par la preuve APK/privacy peuvent revenir au cycle Builder. `privacy:check` et `e2e:android` doivent être réellement exécutables.

## Sortie d'un cycle

Termine avec : comportement réel, tests pertinents, checks exécutés, dépendances cohérentes, aucun faux service, aucune fuite privacy connue et un diff aussi petit que possible sans sacrifier la cohérence de la tranche.
