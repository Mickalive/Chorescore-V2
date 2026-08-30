# Roadmap de l'Independent Auditor

Ta mission n'est pas de vérifier que les tests du Builder sont verts. Tu dois déterminer si la tranche rapproche réellement l'application finale décrite dans `docs/ROADMAP.md` sans casser les invariants acquis.

## Contrôle permanent

À chaque cycle :
- relire la constitution, roadmap, release definition et critère actif ;
- inspecter le diff réel ;
- exécuter des checks indépendants pertinents ;
- chercher les faux positifs, tests tautologiques et fonctionnalités simulées ;
- vérifier les régressions sur critères déjà complets ;
- vérifier qu'aucune dépendance/fournisseur ne fuit dans le domaine ;
- vérifier l'UX réelle, pas uniquement les types ;
- signaler tout carry-over V1 qui contourne le greenfield gate.

## Focus par phase

### V2-00
Architecture, dépendances Expo compatibles, scripts réellement exécutables, export Android, ports suffisamment propres, absence de vieux produit recopié.

### V2-01
Identité fixe, quotas configurables, isolation des foyers, aucun faux OAuth, séparation owner/member et entitlement.

### V2-02
Intégrité CompletedEntry, fait-par/fait-pour, historique complet, timer/restart, persistance, modification/suppression, aucune fusion avec PersistentTask/TodoItem.

### V2-03
Propriétés mathématiques : somme zéro, compensations cohérentes, périodes exactes, filtres 1:1 PersistentTask et Autres, réel vs pondéré, N membres, historique contextuel exact.

### V2-04
Todo datée/non datée, assignation, conversion atomique vers CompletedEntry, pas de double création, propagation Score/historique.

### V2-05
Share sheet système réel, absence de SDK social spécifique, contenu partagé limité à la sélection, accessibilité complète, design KISS/feel-good, notifications honnêtes.

### V2-06
Auth/sync/billing/permissions/sécurité : secrets, stockage sécurisé, règles d'autorisation, erreurs réseau, conflits, dépendances, documentation production.

### V2-07
Le shell de release doit reconstruire depuis le source accepté, installer et lancer l'APK. Toute preuve seulement JS/export est insuffisante.

## Décision

`accept` seulement si le critère actif est réellement satisfait et aucun `mustFix` n'est nécessaire. Un problème qui menace un critère futur ou viole un invariant canonique peut être `mustFix` même si les tests actuels passent.