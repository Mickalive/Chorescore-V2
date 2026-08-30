# ChoreScore V2 — feuille de route canonique

## Autorité et usage

Cette feuille de route traduit `MAIN_PROMPT.md` en ordre de construction. Elle ne peut jamais contredire la constitution produit ni `governance/RELEASE_DEFINITION.json`.

Tous les agents doivent la lire avant d'agir. Le Builder construit une tranche sans casser les tranches futures. L'Auditor contrôle à la fois le critère courant et les invariants déjà acquis. Le Director choisit la prochaine tranche en suivant cette séquence, sauf réparation obligatoire d'un finding.

Ordre d'autorité opérationnel : sécurité/droit > `MAIN_PROMPT.md` > `governance/RELEASE_DEFINITION.json` > `docs/ROADMAP.md` > `docs/architecture.md` > rôle > tâche active.

## Produit final visé

Parcours canonique :

`Connexion -> Foyers -> [Ajouter une tâche + historique complet | Score + équilibres + historique filtré | To-do]`

Le produit final doit notamment permettre :
- identité réelle par compte/email, Google ou Facebook ;
- foyers accessibles selon un quota d'abonnement configurable ;
- CompletedEntry avec `Fait par`, `Fait pour`, durée manuelle ou chrono ;
- PersistentTask facultative, une PersistentTask = un filtre Score ;
- historique complet sous Ajouter une tâche ;
- Score semaine/mois/année/depuis le début avec soldes fait-par/fait-pour, compensations, graphes réel/pondéré et historique filtré ;
- To-do datée ou non, assignable, qui devient une CompletedEntry après validation et saisie du temps ;
- partage par share sheet natif ;
- notifications et calendrier derrière des ports honnêtes ;
- Options personnelles et Options du foyer selon les droits ;
- UX feel-good, KISS, accessible et non moralisatrice ;
- APK Android réellement compilé, installé et lancé.

## Invariants transversaux

1. Le domaine ne dépend d'aucun fournisseur externe.
2. `CompletedEntry`, `PersistentTask` et `TodoItem` restent trois objets distincts.
3. Le temps réel reste la métrique principale ; aucun système de points abstraits.
4. Les services externes non configurés sont indisponibles, jamais simulés.
5. Le partage passe par le share sheet système, pas par un SDK spécifique à chaque réseau.
6. Toute tranche doit conserver les critères déjà acceptés.
7. La V1 n'est jamais une base. Une brique V1 n'entre en V2 qu'après le greenfield reuse gate.
8. L'UX fait partie de l'acceptation, pas d'une phase cosmétique finale.

## V2-00 — Socle greenfield

Objectif : créer la nouvelle application, pas une coquille de l'ancienne.

Livrables :
- Expo/React Native TypeScript propre ;
- routing minimal ;
- séparation domain/application/infrastructure/UI ;
- tests + typecheck + export Android ;
- ports Auth, Entitlement/Billing, SystemShare, Notification, Calendar, SecureStorage, Sync ;
- adapters locaux honnêtes pour travailler sans secrets ;
- shell visuel minimal foyers -> trois onglets, sans prétendre que les fonctions futures existent.

Interdit : copier `app/`, `src/`, tests ou modèle métier de V1 comme fondation.

Gate : check/test/export Android verts + audit d'architecture.

## V2-01 — Identité, foyers et Options

Objectif : faire exister le niveau global de l'application.

Livrables :
- session locale/testable avec identité fixe ;
- modèle User/Household/Member ;
- écran racine listant les foyers ;
- création selon `householdLimit` configurable ;
- Options personnelles ;
- frontière Options du foyer/propriétaire ;
- contrats production email/Google/Facebook sans faux OAuth ;
- entitlement/billing abstrait.

Gate : tests de session, identité, isolation foyers, quotas et droits + audit UX.

## V2-02 — Réalisations, chrono et historique complet

Objectif : livrer le coeur transactionnel façon Tricount.

Livrables :
- navigation interne `Ajouter une tâche | Score | To-do` ;
- CompletedEntry indépendante ;
- `Fait par` n'importe quel membre ;
- `Fait pour` tout le monde ou sous-ensemble non vide ;
- durée manuelle ou chrono, rien d'autre ;
- PersistentTask facultative ;
- pondération avancée coefficient 1 par défaut ;
- modification/suppression ;
- historique complet sous Ajouter une tâche ;
- persistance locale robuste et reprise du chrono.

Gate : tests déterministes de toutes les combinaisons importantes + audit de données et UX.

## V2-03 — Score et équilibres

Objectif : transformer les entrées en équilibre de temps compréhensible.

Livrables :
- périodes semaine/mois/année/depuis le début ;
- filtres Toutes / une par PersistentTask / Autres ;
- aucun filtre automatique depuis les libellés libres ;
- algorithme crédit `+D` au performedBy et charge `-D/N` aux bénéficiaires ;
- invariant somme des soldes = zéro ;
- proposition de compensations pair-à-pair ;
- temps effectué par membre ;
- barres nommées avec valeurs lisibles, sans dépendance à une couleur identitaire ;
- même logique en heures pondérées dans une section secondaire ;
- historique contextuel sous Score selon période + filtre.

Gate : propriétés mathématiques, cas 2/3/N membres, périodes et filtres testés + audit visuel.

## V2-04 — To-do et conversion en réalisation

Objectif : ajouter le futur sans contaminer l'historique.

Livrables :
- TodoItem datée ou non ;
- assignation, bénéficiaires, note, deadline, reminder ;
- calendrier via CalendarGateway ;
- lien facultatif à PersistentTask ;
- check de complétion ;
- mini-formulaire `Fait par + durée + Fait pour` ;
- création atomique d'une CompletedEntry puis mise à jour immédiate de l'historique et Score.

Gate : tests de conversion, absence de double comptage, erreurs/retry, persistance + audit.

## V2-05 — Partage, notifications, design et accessibilité

Objectif : rendre le produit agréable, partageable et utilisable au quotidien.

Livrables :
- SystemShareGateway branché au share sheet natif ;
- partage d'entrée, historique sélectionné, Score/équilibre/graphes, historique filtré et To-do lorsque pertinent ;
- share cards ChoreScore si utiles ;
- notifications configurables via port ;
- aucun SDK Instagram/Facebook/WhatsApp spécifique pour partager ;
- design feel-good, fonds teintés, hiérarchie claire ;
- grandes tailles de texte, lecteurs d'écran, contrastes, touch targets, états vides/erreurs.

Gate : partage système réel dans l'environnement testable, tests UI/accessibilité et audit visuel complet.

## V2-06 — Sync, auth production-ready et sécurité

Objectif : rendre l'architecture prête à connecter les vrais services sans réécrire le produit.

Livrables :
- adapters production pour auth/sync/invitations/billing ou contrats finaux prêts lorsque secrets absents ;
- règles d'autorisation membres/propriétaire/permissions ;
- SecureStorage pour tokens ;
- stratégie offline/sync/conflits ;
- frontières push/calendrier ;
- validation de dépendances et surface réseau ;
- documentation de configuration production ;
- aucun secret en repo et aucun service factice présenté comme actif.

Gate : tests de frontières/sécurité, audit dépendances, documentation et aucun finding high/critical connu.

## V2-07 — APK final

Objectif : prouver que le produit accepté existe réellement sur Android.

Le trusted release job, pas le Director, doit :
- réinstaller les dépendances lockées ;
- relancer tous les checks ;
- exporter Android ;
- exécuter Expo prebuild ;
- compiler l'APK release ;
- installer l'APK sur Android ;
- lancer l'app sans Metro ;
- effectuer un smoke du parcours coeur ;
- publier l'artefact et ses preuves.

La factory ne s'arrête qu'après cette preuve.

## Règle de progression

La séquence normale est V2-00 -> V2-01 -> V2-02 -> V2-03 -> V2-04 -> V2-05 -> V2-06 -> V2-07.

Un finding `mustFix` interrompt la progression : la réparation devient la tâche suivante. Une implémentation anticipée d'un critère futur ne permet jamais de sauter le critère courant. Le Director peut découper un critère en plusieurs cycles cohérents, mais ne peut pas affaiblir son outcome.

## Définition de fini

ChoreScore V2 n'est fini que lorsque le parcours canonique fonctionne, les comportements sont persistants et testés, l'UX est conforme, les ports externes sont honnêtes, les critères V2-00 à V2-06 sont acceptés indépendamment, et V2-07 fournit un APK installable et lancé.