# ChoreScore V2 — contrat design

Ce document fixe des contraintes de composition et de sensation, pas une maquette figée. Le Builder peut choisir une palette précise tant qu'elle respecte ce contrat.

## Intention

ChoreScore doit être **feel-good, chaleureux, contemporain, vivant mais adulte**. Il doit donner envie d'être ouvert souvent sans ressembler à une app de gamification enfantine.

## Composition

- Éviter le blanc dominant. Utiliser un fond global légèrement teinté et des surfaces distinctes sans empiler des cartes blanches.
- Un écran doit avoir une hiérarchie visuelle évidente en quelques secondes : titre/contexte, action principale, contenu.
- Limiter les encadrements. Préférer espacement, typographie, séparateurs légers et variations de surface.
- Rayons modérés et cohérents ; pas de pilules partout.
- Les actions secondaires restent discrètes ; une seule action primaire vraiment dominante par contexte.

## Couleur

- Palette harmonieuse, chaleureuse, accessible ; pas de palette néon ni corporate froide par défaut.
- Les couleurs servent à distinguer états/actions/information, pas à attribuer une identité permanente à chaque membre.
- Un membre est toujours identifié par son nom. Un graphe doit rester compréhensible en niveaux de gris.
- États destructifs, succès, avertissements et focus doivent être sémantiquement stables.
- Tous les couples texte/fond doivent satisfaire les exigences de contraste applicables.

## Typographie

- Police système ou famille robuste et lisible.
- Peu de tailles différentes ; hiérarchie nette.
- Les durées, soldes et valeurs de Score doivent être immédiatement lisibles.
- Les grandes tailles de texte ne doivent pas masquer les actions critiques ni imposer un défilement horizontal.

## Densité

ChoreScore est une app de saisie fréquente. Les écrans ne doivent être ni vides artificiellement ni surchargés.

- formulaire Ajouter court ;
- historique compact mais respirant ;
- Score synthétique avant les détails ;
- To-do scannable rapidement ;
- options secondaires repliées quand elles ne servent pas au geste principal.

## Composants clés

### Entrée d'historique

Une ligne, pas une mini-fiche complexe. Priorité : libellé + durée, puis fait par/pour + date. Menu secondaire compact.

### Sélecteurs Fait par / Fait pour

Doivent rester utilisables avec un foyer nombreux. Aucun design fondé sur une quantité fixe de couleurs ou d'avatars.

### Graphiques

Barres simples. Nom du membre et durée associés directement. Axe/légende seulement si utile. Pas d'effets décoratifs qui réduisent la lisibilité.

### To-do

Le check de réalisation est évident mais ne doit pas être confondu avec suppression. Échéance et assigné sont visibles sans ouvrir le détail.

### Share card

Doit être reconnaissable comme ChoreScore, lisible sur écran mobile et ne contenir que les informations explicitement partagées. Pas de jugement automatique, pas de texte provocateur généré par l'app.

## Motion

Animations courtes, utiles et facultatives. Aucune animation ne doit ralentir la saisie, masquer un résultat ou empêcher `reduce motion`.

## Anti-patterns de rejet

Rejeter une proposition si elle :
- ressemble à un template SaaS web posé sur mobile ;
- utilise de grandes zones blanches comme structure principale ;
- multiplie cards, ombres, gradients ou badges sans fonction ;
- remplace les labels par la couleur ;
- cache les valeurs derrière des visualisations décoratives ;
- rend les actions courantes à plus de quelques gestes sans raison ;
- donne l'impression d'une app de points/récompenses plutôt que d'un outil domestique partagé.
