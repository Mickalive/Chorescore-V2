# Roadmap de l'Independent Auditor

Ta mission n'est pas de vérifier que les tests du Builder sont verts. Tu dois déterminer si la tranche rapproche réellement l'application finale décrite dans `docs/ROADMAP.md` sans casser les invariants acquis.

## Contrôle permanent

À chaque cycle :
- relire la constitution, roadmap, release definition, `docs/DATA_PRODUCT_PRIVACY.md` et critère actif ;
- inspecter le diff réel ;
- exécuter des checks indépendants pertinents ;
- chercher les faux positifs, tests tautologiques et fonctionnalités simulées ;
- vérifier les régressions sur critères déjà complets ;
- vérifier qu'aucune dépendance/fournisseur ne fuit dans le domaine ;
- vérifier l'UX réelle, pas uniquement les types ;
- signaler tout carry-over V1 qui contourne le greenfield gate ;
- traiter la pseudonymisation comme donnée personnelle, jamais comme preuve d'anonymat.

## Focus par phase

### V2-00
Architecture, dépendances Expo compatibles, scripts réellement exécutables, export Android, ports suffisamment propres, absence de vieux produit recopié. Vérifier que `ResearchAnalyticsGateway` est secondaire/désactivable et ne contamine pas le domaine.

### V2-01
Identité fixe, abonnements par foyer, invitations, isolation des foyers, aucun faux OAuth, séparation owner/member et entitlement.

### V2-02
Intégrité CompletedEntry, fait-par/fait-pour, historique, timer/restart, persistance, modification/suppression, aucune fusion avec PersistentTask/TodoItem. Vérifier que les textes libres ne sont pas désignés comme futurs champs exportables de recherche.

### V2-03
Propriétés mathématiques : somme zéro, compensations cohérentes, périodes exactes, filtres 1:1 PersistentTask et Autres, réel vs pondéré, N membres, historique contextuel exact.

### V2-04
Todo datée/non datée, assignation, conversion atomique vers CompletedEntry, pas de double création, propagation Score/historique.

### V2-05
Share sheet système réel, absence de SDK social spécifique, contenu partagé limité à la sélection, accessibilité complète, design KISS/feel-good, notifications honnêtes, Premium contextuel.

### V2-06
Auditer séparément :

**Operational Store** : auth/sync/billing/permissions, secrets, chiffrement, isolation tenant, erreurs réseau, conflits, documentation production. Il n'est jamais vendable.

**Research Analytics Plane** :
- aucun account/user/member/household ID opérationnel ;
- aucun email, device/IP ou clé de jointure ;
- aucun libellé/note libre ;
- taxonomie versionnée ;
- généralisation des quasi-identifiants ;
- cellules/cohortes rares supprimées ;
- protections differencing/reconstruction ;
- PrivacyReleaseGate réel ;
- query budgets/rate limits/differential privacy lorsque nécessaire ;
- journalisation des releases ;
- analytics désactivable sans casser le produit.

Un export réel foyer-par-foyer, même avec UUID/hash, est `mustFix`.

### V2-07
Le shell de release doit reconstruire depuis le source accepté, exécuter `privacy:check`, installer/lancer l'APK puis traverser `e2e:android`. Toute preuve seulement JS/export est insuffisante.

## Décision

`accept` seulement si le critère actif est réellement satisfait et aucun `mustFix` n'est nécessaire. Un problème qui menace un critère futur, la confidentialité, l'anonymisation ou un invariant canonique peut être `mustFix` même si les tests actuels passent.
