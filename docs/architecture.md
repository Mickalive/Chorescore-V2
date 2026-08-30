# Architecture V2 — greenfield

## Principe

Architecture locale-first, testable, avec domaine indépendant des fournisseurs. Aucun code applicatif de V1 n'est une base.

## Couches cibles

- `src/domain/` : entités et calculs purs (`Household`, `Member`, `CompletedEntry`, `PersistentTask`, `TodoItem`, balances/compensations).
- `src/application/` : cas d'usage et ports.
- `src/infrastructure/` : persistence locale et adapters externes.
- `src/features/` : orchestration UI par fonctionnalité.
- `src/ui/` : composants/design system.
- `app/` : routes Expo Router uniquement.

Le Builder peut ajuster cette arborescence si une alternative reste plus simple, mais les dépendances doivent aller de l'UI/infrastructure vers l'application/domaine, jamais l'inverse.

## Ports obligatoires

- AuthGateway
- EntitlementGateway/BillingGateway
- SystemShareGateway
- NotificationGateway
- CalendarGateway
- SecureStorageGateway
- SyncGateway + repositories

Le share natif est une seule frontière système, pas un SDK par réseau social.

## Données

CompletedEntry stocke `performedByMemberId` et `beneficiaryMemberIds[]`. PersistentTask est facultative et crée un filtre Score. TodoItem est distincte et peut produire une CompletedEntry lorsqu'elle est validée.

## Sécurité

Secrets uniquement via configuration protégée. Les adapters externes non configurés doivent être explicitement indisponibles, jamais simulés comme réussis.

## Greenfield reuse gate

Avant de reprendre une brique de V1, vérifier :
1. aucune dépendance au vieux modèle ;
2. API petite et claire ;
3. tests V2 dédiés ;
4. gain réel par rapport à une réécriture ;
5. audit indépendant.
