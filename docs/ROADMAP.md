# ChoreScore V2 — feuille de route canonique

## Autorité et usage

Cette feuille de route traduit `MAIN_PROMPT.md` en ordre de construction. Elle ne peut jamais contredire la constitution produit ni `governance/RELEASE_DEFINITION.json`.

Tous les agents doivent lire avant d'agir :
- `MAIN_PROMPT.md` ;
- `docs/ROADMAP.md` ;
- `docs/PRODUCT_BLUEPRINT.md` ;
- `docs/DESIGN_CONTRACT.md` ;
- `docs/MONETIZATION.md` ;
- `docs/SUBSCRIPTION_REFERENCE_V1.md` ;
- `docs/REFERENCE_SCENARIOS.json` ;
- `docs/QUALITY_GATES.md` ;
- leur roadmap de rôle.

Le Builder construit une tranche sans casser les tranches futures. L'Auditor contrôle le critère courant, les quality gates et les invariants déjà acquis. Le Director choisit la prochaine tranche en suivant cette séquence, sauf réparation obligatoire d'un finding.

## Produit final visé

`Connexion -> Foyers -> [Ajouter une tâche + historique complet | Score + équilibres + historique filtré | To-do]`

Le produit final doit notamment permettre :
- identité réelle par compte/email, Google ou Facebook ;
- foyers avec plan/billing attaché au foyer ;
- essai complet 30 jours ;
- Standard 2,99 €/mois/foyer jusqu'à 7 membres ;
- Pro 5,99 €/mois/foyer à partir de 8 membres ;
- gratuit avec un foyer, Score limité au mois courant, sans pondération ni planification To-do ;
- CompletedEntry avec `Fait par`, `Fait pour`, durée manuelle ou chrono ;
- PersistentTask facultative, une PersistentTask = un filtre Score ;
- historique complet sous Ajouter une tâche ;
- Score avec soldes fait-par/fait-pour, compensations, graphes réel/pondéré et historique filtré ;
- To-do Premium datée ou non, assignable, convertie en CompletedEntry après validation et saisie du temps ;
- partage par share sheet natif ;
- notifications et calendrier derrière des ports honnêtes ;
- Options personnelles et Options du foyer selon les droits ;
- UX feel-good, KISS, accessible et non moralisatrice ;
- preuves visuelles reproductibles ;
- APK Android réellement compilé, installé, lancé et traversé par un golden path E2E.

## Invariants transversaux

1. Le domaine ne dépend d'aucun fournisseur externe.
2. `CompletedEntry`, `PersistentTask` et `TodoItem` restent trois objets distincts.
3. Le temps réel reste la métrique principale ; aucun système de points abstraits.
4. Les services externes non configurés sont indisponibles, jamais simulés.
5. Le partage passe par le share sheet système, pas par un SDK spécifique à chaque réseau.
6. Toute tranche conserve les critères déjà acceptés.
7. La V1 n'est jamais une base ; seules des briques isolées passent le greenfield reuse gate.
8. L'UX fait partie de l'acceptation dès le début.
9. La grille d'abonnement confirmée n'est jamais réinventée par un agent.
10. Une limitation gratuite masque/restreint l'accès ; elle ne détruit jamais les données historiques.
11. `docs/REFERENCE_SCENARIOS.json` fournit les valeurs de référence pour les maths et le golden path.

## V2-00 — Socle greenfield

Objectif : créer la nouvelle application, pas une coquille de l'ancienne.

Livrables :
- Expo/React Native TypeScript propre ;
- routing minimal ;
- séparation domain/application/infrastructure/UI ;
- tests + typecheck + export Android ;
- ports Auth, Entitlement/Billing, SystemShare, Notification, Calendar, SecureStorage, Sync ;
- adapters locaux honnêtes pour travailler sans secrets ;
- architecture d'entitlements au niveau foyer ;
- shell visuel minimal foyers -> trois onglets, sans prétendre que les fonctions futures existent ;
- premiers tokens/composants cohérents avec `DESIGN_CONTRACT.md`.

Interdit : copier `app/`, `src/`, tests ou modèle métier de V1 comme fondation.

Gate : check/test/export Android verts + audit d'architecture + conformité au design contract de base.

## V2-01 — Identité, foyers, abonnement et Options

Objectif : faire exister le niveau global de l'application et le contrat commercial.

Livrables :
- session locale/testable avec identité fixe ;
- modèle User/Household/Member ;
- plan/billing attaché au foyer ;
- écran racine listant les foyers ;
- état Upgrade/Premium ;
- essai complet 30 jours ;
- Standard/Pro représentés avec seuils 7/8 membres et tarifs de référence configurables ;
- gratuit limité à un foyer ;
- Options personnelles ;
- Options du foyer/propriétaire ;
- contrats production email/Google/Facebook sans faux OAuth ;
- entitlement/billing abstrait.

Gate : tests de session, identité, isolation foyers, plan par foyer, essai, droits et upgrade + audit UX.

## V2-02 — Réalisations, chrono et historique complet

Objectif : livrer le cœur transactionnel façon Tricount.

Livrables :
- navigation interne `Ajouter une tâche | Score | To-do` ;
- CompletedEntry indépendante ;
- `Fait par` n'importe quel membre ;
- `Fait pour` tout le monde ou sous-ensemble non vide ;
- durée manuelle ou chrono, rien d'autre ;
- PersistentTask facultative ;
- pondération disponible seulement si entitlement Premium/essai ;
- modification/suppression ;
- historique complet sous Ajouter une tâche ;
- persistance locale robuste et reprise du chrono ;
- aucune suppression de CompletedEntry au changement de mois ou downgrade.

Gate : tests déterministes basés sur les scénarios de référence + audit données/UX.

## V2-03 — Score, équilibres et fenêtre gratuite

Objectif : transformer les entrées en équilibre de temps compréhensible.

Livrables :
- périodes semaine/mois/année/depuis le début ;
- gratuit limité au **mois civil courant** ;
- Année/Depuis le début et archive antérieure Premium ;
- changement de mois sans destruction des données ;
- upgrade qui restaure immédiatement l'archive ;
- filtres Toutes / une par PersistentTask / Autres ;
- aucun filtre automatique depuis les libellés libres ;
- algorithme crédit `+D` au performedBy et charge `-D/N` aux bénéficiaires ;
- invariant somme des soldes = zéro ;
- compensations pair-à-pair ;
- temps effectué par membre ;
- barres nommées avec valeurs lisibles, sans couleur identitaire obligatoire ;
- logique pondérée secondaire uniquement Premium/essai ;
- historique contextuel sous Score selon période + filtre.

Gate : valeurs exactes de `REFERENCE_SCENARIOS.json`, cas 2/3/N membres, reset mensuel, upgrade/downgrade et audit visuel.

## V2-04 — To-do Premium et conversion en réalisation

Objectif : ajouter le futur sans contaminer l'historique.

Livrables Premium/essai :
- TodoItem datée ou non ;
- assignation, bénéficiaires, note, deadline, reminder ;
- calendrier via CalendarGateway ;
- lien facultatif à PersistentTask ;
- check de complétion ;
- mini-formulaire `Fait par + durée + Fait pour` ;
- création atomique d'une CompletedEntry puis mise à jour immédiate historique + Score.

Livrables gratuit :
- onglet To-do présent mais état Premium propre ;
- upgrade accessible ;
- aucune TodoItem détruite après downgrade.

Gate : conversion, absence de double comptage, persistance, downgrade/upgrade et audit UX.

## V2-05 — Partage, notifications, design et accessibilité

Objectif : rendre le produit réellement agréable et partageable dès le premier APK.

Livrables :
- SystemShareGateway branché au share sheet natif ;
- partage d'entrée, historique sélectionné, Score/équilibre/graphes, historique filtré et To-do lorsque pertinent ;
- share cards ChoreScore si utiles ;
- notifications configurables via port ;
- aucun SDK social spécifique pour partager ;
- design conforme à `DESIGN_CONTRACT.md` ;
- états Free/Trial/Standard/Pro cohérents ;
- fonds teintés, hiérarchie claire, faible dépendance aux cartes blanches ;
- grandes tailles de texte, lecteurs d'écran, contrastes, touch targets, états vides/erreurs ;
- captures/représentations visuelles reproductibles des écrans cœur avec fixture canonique.

Gate : partage système réel dans l'environnement testable, tests UI/accessibilité, preuves visuelles et audit visuel complet.

## V2-06 — Sync, auth production-ready, billing et sécurité

Objectif : rendre l'architecture prête à connecter les vrais services sans réécrire le produit.

Livrables :
- adapters/contrats production auth/sync/invitations/billing ;
- billing provider-agnostic avec plan attaché au foyer ;
- règles d'autorisation membres/propriétaire/payeur/permissions ;
- SecureStorage pour tokens ;
- stratégie offline/sync/conflits ;
- frontières push/calendrier ;
- restauration des achats/entitlements prévue ;
- validation de dépendances et surface réseau ;
- documentation de configuration production ;
- aucun secret en repo et aucun service factice présenté comme actif.

Gate : tests frontières/sécurité/billing, audit dépendances, documentation et aucun finding high/critical connu.

## V2-07 — APK final et golden path

Objectif : prouver que le produit accepté existe réellement sur Android.

Le trusted release job, pas le Director, doit :
- réinstaller les dépendances lockées ;
- relancer tous les checks ;
- exporter Android ;
- exécuter Expo prebuild ;
- compiler l'APK release ;
- installer l'APK sur Android ;
- lancer l'app sans Metro ;
- exécuter le golden path de `REFERENCE_SCENARIOS.json` via le contrat E2E du repo ;
- vérifier au moins un état Free et un état Premium/essai ;
- produire des captures/checkpoints utiles ;
- publier l'artefact et les preuves.

Un simple `pidof` après lancement n'est jamais suffisant pour déclarer V2-07 complet.

## Règle de progression

Séquence normale : V2-00 -> V2-01 -> V2-02 -> V2-03 -> V2-04 -> V2-05 -> V2-06 -> V2-07.

Un finding `mustFix` interrompt la progression. Une implémentation anticipée ne permet jamais de sauter un critère. Le Director peut découper un critère en plusieurs cycles cohérents, mais ne peut pas affaiblir son outcome ni ses quality gates.

## Définition de fini

ChoreScore V2 n'est fini que lorsque le parcours canonique fonctionne, les entitlements commerciaux confirmés fonctionnent sans destruction de données, les comportements sont persistants et testés, l'UX/design est conforme et prouvé visuellement, les ports externes sont honnêtes, V2-00 à V2-06 sont acceptés indépendamment, et V2-07 fournit un APK traversé par le golden path Android.