# ChoreScore V2 — blueprint produit écran par écran

Ce document précise la forme du produit décrit par `MAIN_PROMPT.md`. En cas de conflit, `MAIN_PROMPT.md` prévaut. Il sert à empêcher les agents d'inventer des écrans, des parcours ou des hiérarchies différentes.

## 1. Connexion

Écran sobre et direct. En production : compte ChoreScore/email, Google, Facebook via `AuthGateway`. En développement sans secrets, montrer clairement le mode local/test ; ne jamais faire passer un faux OAuth pour une connexion réelle.

But : atteindre l'écran des foyers avec une identité fixe.

## 2. Racine — Foyers

Contenu principal uniquement :
- foyers auxquels l'utilisateur appartient ;
- `Créer un foyer` si l'entitlement autorise encore une création ;
- accès `Options` ;
- pour le propriétaire/payeur, accès discret aux `Options du foyer`.

Chaque foyer est une ligne/carte simple ouvrable. Ne pas transformer la racine en dashboard statistique.

## 3. Foyer ouvert

Navigation principale exactement :

`Ajouter une tâche | Score | To-do`

Le nom du foyer reste identifiable dans l'en-tête. Options et compte ne deviennent jamais un quatrième onglet.

## 4. Ajouter une tâche

### Zone de saisie

Doit rester rapide, avec les champs essentiels dans cet ordre mental :
1. quoi ? `label` libre ou PersistentTask ;
2. qui l'a fait ? `Fait par` ;
3. pour qui ? `Tout le monde` ou multi-sélection ;
4. combien de temps ? `Manuel | Chrono` ;
5. quand ? date/heure ;
6. `Options avancées` repliées : pondération et rares paramètres secondaires.

Le membre connecté est proposé par défaut dans `Fait par`, mais peut être remplacé par n'importe quel membre du foyer.

### PersistentTask

Un libellé peut rester ponctuel ou être enregistré comme PersistentTask. Les PersistentTask existantes doivent accélérer la saisie sans transformer l'écran en catalogue de tâches.

### Historique complet

Sous la saisie : flux chronologique de toutes les CompletedEntry du foyer, analogue à la liste des dépenses Tricount.

Chaque ligne montre au minimum :
- libellé ;
- durée ;
- fait par ;
- fait pour ;
- date/heure.

Modifier/supprimer via menu compact/détail. Pas de rangée de gros boutons par entrée.

Une action de partage permet de partager une entrée ou une sélection utile via le share sheet natif.

## 5. Score

Score est la vue `Équilibres + statistiques`, pas un deuxième écran d'ajout.

Ordre recommandé :
1. sélecteur de période `Semaine | Mois | Année | Depuis le début` ;
2. filtre `Toutes | chaque PersistentTask | Autres` ;
3. soldes réels / avance-retard ;
4. proposition `qui doit rattraper combien auprès de qui` ;
5. graphique simple du temps réel effectué par membre, noms et valeurs directement lisibles ;
6. section pondérée secondaire : soldes/compensations + graphique pondéré ;
7. historique correspondant exactement à la période + au filtre courants.

Chaque PersistentTask crée exactement un filtre. Les libellés ponctuels ne créent jamais de filtre individuel ; ils appartiennent à `Autres`.

Les graphes ne dépendent pas d'une couleur identitaire fixe par membre. Le nom est toujours l'identifiant visuel principal.

Le partage du Score courant doit utiliser le share sheet système et pouvoir produire une carte ChoreScore propre, limitée aux informations sélectionnées/visibles.

## 6. To-do

Écran de travail futur, distinct des réalisations passées.

Une To-do peut être :
- sans date ;
- avec date/deadline ;
- assignée à un membre ;
- faite pour tout ou partie du foyer ;
- liée à une PersistentTask ;
- accompagnée d'une note et d'un rappel.

La liste doit rester lisible : titre, assigné, échéance éventuelle, état. Ne pas créer une usine de gestion de projet.

### Check vert — tâche faite

Le check ouvre un mini-formulaire :
- `Fait par` (membre validant par défaut, modifiable) ;
- durée réelle ;
- `Fait pour` repris de la To-do ou modifiable.

Validation atomique : TodoItem terminée + CompletedEntry créée. La nouvelle entrée apparaît immédiatement dans l'historique complet et modifie Score.

## 7. Options

### Options personnelles

Notifications, confidentialité, légal, préférences, compte/connexion et autres réglages individuels.

### Options du foyer

Visibles au propriétaire/payeur selon ses droits : abonnement/quota, administration du foyer, membres et permissions fines disponibles selon le plan.

## 8. États obligatoires

Chaque écran important doit avoir :
- état vide utile ;
- chargement seulement si nécessaire ;
- erreur compréhensible avec récupération ;
- fonctionnement offline/local honnête ;
- tailles de texte élevées sans casser la navigation ;
- boutons/actions désactivés expliqués lorsque la capacité externe n'est pas configurée.

## 9. Interdictions UX

- pas de dashboard générique avant les foyers ;
- pas d'onglet Historique séparé ;
- pas de Classement/Leaderboard ;
- pas de points abstraits ;
- pas de catégories ménagères obligatoires ;
- pas de commentaires moraux ou relationnels automatiques ;
- pas de faux boutons Google/Facebook/calendrier/share/paiement qui prétendent fonctionner ;
- pas d'interface dominée par des cartes blanches imbriquées ;
- pas de placeholder visible dans un critère déclaré terminé.
