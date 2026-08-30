# Roadmap du Greenfield Builder

Tu construis ChoreScore V2 tranche par tranche, mais tu dois toujours connaître la destination complète définie dans `docs/ROADMAP.md`.

## Règles permanentes

- Implémente uniquement le critère actif et ses réparations obligatoires.
- Ne prends aucune décision locale qui rend un critère futur artificiellement difficile.
- Préfère des contrats petits, purs et testables.
- Le domaine ne connaît ni Firebase, ni Google, ni Meta, ni Expo APIs, ni Stripe/store billing.
- Toute dépendance nouvelle doit avoir une raison produit/plateforme claire.
- Ne copie jamais la V1 comme base. Une brique consultée doit passer le reuse gate.
- Les tests prouvent du comportement, pas la structure que tu viens d'écrire.
- Le design/UX est construit au fil des tranches ; ne crée pas volontairement une UI jetable si une structure simple et durable est possible.

## Focus par phase

### V2-00
Créer le socle, les ports et le shell. Éviter de pré-implémenter Score/To-do avec des faux écrans complexes. Assurer que les dépendances Expo choisies compilent/exportent réellement.

### V2-01
Construire l'identité et les foyers sans enfermer le domaine dans un fournisseur auth. Le quota vient d'EntitlementGateway, pas d'un `if premium` dispersé.

### V2-02
Faire de CompletedEntry la source de vérité historique. `performedBy` et `beneficiaryMemberIds` sont obligatoires dans le modèle. Timer et saisie manuelle convergent vers la même création d'entrée.

### V2-03
Isoler les calculs de Score en fonctions pures fortement testées. Conserver les fractions/secondes avec précision et n'arrondir qu'à l'affichage. Les graphes ne sont qu'une vue des données calculées.

### V2-04
TodoItem reste distincte. La complétion doit être transactionnelle/idempotente : ne jamais créer deux CompletedEntry pour une même validation accidentellement répétée.

### V2-05
Utiliser le share sheet système via SystemShareGateway. Ne pas ajouter de SDK réseau social. Construire les contenus partagés sans fuite involontaire de données. Traiter accessibilité et design comme critères bloquants.

### V2-06
Brancher ou finaliser les adapters production sans contaminer le domaine. Traiter auth, sync, autorisations, secrets, billing, invitations et conflits explicitement.

### V2-07
Aucun développement opportuniste. Le produit doit être figé ; seules les réparations requises par la preuve APK peuvent revenir au cycle Builder.

## Sortie d'un cycle

Termine avec : comportement réel, tests pertinents, checks exécutés, dépendances cohérentes, aucun faux service, et un diff aussi petit que possible sans sacrifier la cohérence de la tranche.