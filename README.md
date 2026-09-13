# <p align="center"> HTML Gaming - Agent Sucré </br> L'academie des espions gourmands

<p align="center">
  <img src="https://img.shields.io/badge/Phaser-4.0.0-e84a5f?style=for-the-badge&logo=phaser&logoColor=white" alt="Phaser" />
  <img src="https://img.shields.io/badge/Vite-6.x-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript" />
  <img src="https://img.shields.io/badge/HTML5-Gaming-E34F26?style=for-the-badge&logo=html5&logoColor=white" alt="HTML5" />
  <img src="https://img.shields.io/badge/CSS3-Styling-1572B6?style=for-the-badge&logo=css3&logoColor=white" alt="CSS3" />
  <img src="https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
</p>


## ✨ Agent Sucré c'est quoi ?

**Agent Sucré** est un jeu web narratif et interactif librement inspiré du célèbre jeu **[Amour Sucré](https://www.amoursucre.com/)**, conçu et développé dans le cadre d'un projet d'étude à **Epitech**.

Le jeu revisite le genre du *Visual Novel* à travers une parodie déjantée d'espionnage culinaire : vous y incarnez un "*Agent Sucre*", une jeune recrue infiltrée au prestigieux *Institut Lyfe*. Votre mission secrète : côtoyer les plus grands chefs étoilés de la gastronomie, forger votre réputation auprès d'eux, et contrecarrer les plans machiavéliques de *Cédric Grolet*, déterminé à dérober la légendaire recette du *Bonbon Ultime* pour asservir le monde !

Chaque dialogue et décision façonne votre aventure, votre niveau de couverture et votre complicité avec les chefs ..


## ⚡ Aperçu global

> [!NOTE]
> **Technologies principales utilisées :**
> - **Moteur de jeu :** [Phaser 4](https://phaser.io/) *(Rendu WebGL & Canvas HTML5, physique, scènes, conteneurs et caméra)*.
> - **Build & Bundler :** [Vite](https://vitejs.dev/) avec optimisation et minification [Terser](https://terser.org/).
> - **Langage & Architecture :** JavaScript moderne (ES6+ Modules, Programmation Orientée Objet, State Manager réactif avec persistance `localStorage`).
> - **Graphismes & UI :** Interface d'OS d'espionnage rétro (*Agent OS*), portraits anime de chefs, décors illustrés et avatars modulaires en calques vectoriels SVG.
> - **Audio :** Moteur audio Phaser.


#### Le jeu propose une aventure riche et variée combinant narration immersive, exploration et mini-jeux d'arcade :

- 🖥️ **Bureau d'Espionnage (Agent OS) :** Système d'exploitation virtuel inspiré d'un terminal d'espionnage sur écran CRT rétro. Menu Démarrer interactif, gestion de sauvegardes par disquette, explorateur de fichiers multimédia et un lecteur vinyle 33 tours animé.
- 💬 **Visual Novel & Affinité :** Dialogues à embranchements scénarisés avec portraits expressifs, questions cultes et suivi de jauges en temps réel.
- 🗺️ **Exploration Tactique :** Carte interactive de l'Institut permettant de naviguer librement entre les différentes ailes.
- 🎒 **Équipement & Sacoche d'Agent :** Sacoche d'inventaire interactive avec gadgets gourmands.
- 🥋 **Personnalisation d'Avatar 2D (Garde-robe) :** Atelier de création de personnage chibi en calques SVG vectoriels.
- 🎮 **Mini-Jeux Intégrés :**
  - **Course & Tir :** Shoot'em Up simulant une fuite d'urgence nerveuse en couloir.
  - **Labyrinthe de Dérivation :** Casse-tête procédural de piratage de circuit électrique *(inspiré du __Weather Node__ d'Among Us)*.

<p align="center">
  <!-- Insérez vos captures d'écran ici -->
  <!-- <img src="docs/screenshot_bureau.png" alt="Aperçu du Bureau Agent OS" width="48%" /> -->
  <!-- <img src="docs/screenshot_dialogue.png" alt="Aperçu d'un Dialogue" width="48%" /> -->
</p>


## 🔧 Lancement du projet

### 1. Prérequis
- [Node.js](https://nodejs.org/) version **18.x** ou supérieure.
- **npm**
- Un navigateur web moderne supportant WebGL et Canvas HTML5.


### 2. Récupération du dépôt
Clonez le projet sur votre machine locale :
```bash
git clone git@github.com:EpitechWebAcademiePromo2026/W-WEB-403-LIL-4-1-gaming-5.git
cd W-WEB-403-LIL-4-1-gaming-5
```


### 3. Installation des dépendances
Rendez-vous dans le dossier applicatif `agent_sucre` et installez les paquets npm :
```bash
cd agent_sucre
npm install
```


### 4. Démarrage du serveur de développement
Lancez le serveur local Vite :
```bash
npm run dev
```
*(ou sans script d'historique de log : `npm run dev-nolog`)*

Une fois le serveur démarré, ouvrez votre navigateur et accédez à :
👉 **`http://localhost:8080`**



## ✒️ Informations & contact

Cette application a été créée dans le cadre d'un projet d'étude ***Epitech*** via un sujet d'apprentissage !

**Développé par :**
- [Corentin Loisée](https://www.linkedin.com/in/corentin-lois%C3%A9e-714594317/)
- [Corentin Marlière](https://www.linkedin.com/in/corentin-ma/)

**Pour toute information ou contact :**
- [corentin.loisee@epitech.eu](mailto:corentin.loisee@epitech.eu)
- [corentin.marliere@epitech.eu](mailto:corentin.marliere@epitech.eu)