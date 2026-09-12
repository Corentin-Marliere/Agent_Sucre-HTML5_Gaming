import { Scene } from "phaser";
import { gameState } from "../state/GameState.js";
import { SaveManager } from "../manager/SaveManager.js";
import { ProfileModal } from "../components/ProfileModal.js";
import { SettingsModal } from "../components/SettingsModal.js";
import { WardrobeModal } from "../components/WardrobeModal.js";
import { ConfirmModal } from "../components/ConfirmModal.js";

/**
 * Scène du Menu Principal (OS Virtuel de l'Agent).
 * Implémente la logique complète requise par les tickets #3 et #16 :
 * - 'New Mission' : Initialisation et démarrage d'une nouvelle partie.
 * - 'Load Save' : Chargement et déverrouillage de la sauvegarde par code PIN.
 * - 'Settings' : Options sonores, configuration des touches et redémarrage du jeu (critère Epitech).
 * - 'Wardrobe' : Vestiaire tactique de l'agent.
 * - 'Institut Secret' : Accès direct à la carte d'exploration.
 * - Menu Démarrer interactif via le bouton Windows Cake.
 */
export class MainMenu extends Scene {
  constructor() {
    super("MainMenu");
  }

  create() {
    gameState.setCurrentScene("MainMenu");
    this.cameras.main.setBackgroundColor(0x000000);
    this.add.image(980, 499, "pc_screen").setScale(1.3);

    this.startMenuOpen = false;
    this.startMenuContainer = null;

    // Barre des tâches inférieure
    this.createTaskbar();

    // Icônes d'action sur le bureau virtuel
    this.createDesktopIcons();

    // Message toast de retour d'action
    this.createToastElement();

    // Détection automatique au premier lancement de la session
    this.checkInitialSession();
  }

  /* ========================================================================== */
  /* BUREAU VIRTUEL & ICÔNES D'ACTION (#3 & #16)                                */
  /* ========================================================================== */

  createDesktopIcons() {
    const iconsData = [
      {
        x: 410,
        y: 158,
        label: "New Mission",
        sub: "(Nouvelle partie)",
        color: "#00ffcc",
        action: () => this.handleNewMission(),
      },
      {
        x: 680,
        y: 158,
        label: "Load Save",
        sub: "(Charger avec PIN)",
        color: "#ffdd00",
        action: () => this.handleLoadSave(),
      },
      {
        x: 950,
        y: 158,
        label: "Wardrobe",
        sub: "(Dressing tactique)",
        color: "#e082ff",
        action: () => this.handleWardrobe(),
      },
      {
        x: 1220,
        y: 158,
        label: "Settings",
        sub: "(Options & Touches)",
        color: "#00d2ff",
        action: () => this.handleSettings(),
      },
      {
        x: 1490,
        y: 158,
        label: "Institut Secret",
        sub: "(Carte interactive)",
        color: "#ffffff",
        action: () => this.scene.start("GenericMapScene", { mapId: "secretInstitute" }),
      },
    ];

    iconsData.forEach((item) => {
      const folder = this.add.image(item.x, item.y, "folder");
      folder.setScale(0.1);
      folder.setInteractive({ useHandCursor: true });

      // Effet de survol
      folder.on("pointerover", () => folder.setScale(0.11));
      folder.on("pointerout", () => folder.setScale(0.1));
      folder.on("pointerdown", item.action);

      this.add
        .text(item.x, item.y + 44, item.label, {
          fontFamily: "Arial, sans-serif",
          fontSize: "14px",
          fontStyle: "bold",
          color: item.color,
        })
        .setOrigin(0.5);

      this.add
        .text(item.x, item.y + 62, item.sub, {
          fontFamily: "Arial, sans-serif",
          fontSize: "11px",
          color: "#94a3b8",
        })
        .setOrigin(0.5);
    });
  }

  /* ========================================================================== */
  /* ACTIONS DES BOUTONS                                                        */
  /* ========================================================================== */

  /**
   * Action 'New Mission' : Lance une nouvelle partie avec confirmation si une sauvegarde existe.
   */
  handleNewMission() {
    this.closeStartMenu();

    if (SaveManager.hasSave()) {
      new ConfirmModal(this, {
        title: "⚠️ NOUVELLE MISSION",
        message:
          "Une sauvegarde existe déjà.\nVoulez-vous réinitialiser votre profil et commencer une nouvelle mission ?",
        confirmText: "Oui, nouvelle partie",
        cancelText: "Annuler",
        onConfirm: () => {
          SaveManager.deleteSave();
          this.openProfileModal("CREATE", (state) => {
            this.scene.start("Game");
          });
        },
      });
    } else {
      this.openProfileModal("CREATE", () => {
        this.scene.start("Game");
      });
    }
  }

  /**
   * Action 'Load Save' : Ouvre l'invite de déverrouillage PIN.
   */
  handleLoadSave() {
    this.closeStartMenu();

    if (!SaveManager.hasSave()) {
      this.showToast("⚠️ Aucune sauvegarde trouvée. Cliquez sur New Mission !");
      return;
    }

    this.openProfileModal("LOAD", (result) => {
      const targetScene = result?.state?.progression?.currentScene || "Game";
      this.showToast("Session déverrouillée ! Lancement...");
      this.time.delayedCall(800, () => {
        this.scene.start(targetScene);
      });
    });
  }

  /**
   * Action 'Settings' : Ouvre la boîte des paramètres (audio, touches, redémarrage).
   */
  handleSettings() {
    this.closeStartMenu();

    new SettingsModal(this, {
      onRestart: () => {
        this.showToast("🔄 Redémarrage du système...");
        this.time.delayedCall(500, () => {
          this.scene.restart();
        });
      },
    });
  }

  /**
   * Action 'Wardrobe' : Ouvre le vestiaire de l'agent.
   */
  handleWardrobe() {
    this.closeStartMenu();
    new WardrobeModal(this);
  }

  /* ========================================================================== */
  /* BARRE DES TÂCHES & MENU DÉMARRER                                           */
  /* ========================================================================== */

  createTaskbar() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x000000, 1);
    g.fillRect(32, 32, 1155, 80);
    g.generateTexture("task_bar", 1155, 80);
    g.destroy();

    this.add.image(964, 850, "task_bar");

    // Bouton Windows Cake (Menu Démarrer)
    const cakeBtn = this.add.image(450, 865, "windows_cake").setScale(0.08);
    cakeBtn.setInteractive({ useHandCursor: true });
    cakeBtn.on("pointerdown", () => this.toggleStartMenu());

    // Statut de l'agent sur la barre
    this.statusText = this.add
      .text(500, 865, this.getAgentStatusString(), {
        fontFamily: "Courier, monospace",
        fontSize: "14px",
        color: "#00ffcc",
      })
      .setOrigin(0, 0.5);

    // Bouton Sauvegarder sur la barre des tâches
    const saveBtn = this.add
      .rectangle(1430, 865, 130, 32, 0x1f7a3a)
      .setStrokeStyle(1, 0xffffff)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(1430, 865, "💾 Sauvegarder", {
        fontFamily: "Arial, sans-serif",
        fontSize: "13px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    saveBtn.on("pointerover", () => saveBtn.setAlpha(0.85));
    saveBtn.on("pointerout", () => saveBtn.setAlpha(1));
    saveBtn.on("pointerdown", () => {
      const res = SaveManager.save();
      if (res.success) {
        this.showToast("✓ Progression sauvegardée avec succès !");
        this.refreshStatus();
      } else {
        this.showToast("✗ Erreur de sauvegarde");
      }
    });
  }

  toggleStartMenu() {
    if (this.startMenuOpen) {
      this.closeStartMenu();
    } else {
      this.openStartMenu();
    }
  }

  openStartMenu() {
    this.closeStartMenu();
    this.startMenuOpen = true;

    this.startMenuContainer = this.add.container(450, 680);
    this.startMenuContainer.setDepth(1050);

    const menuBg = this.add
      .rectangle(100, 0, 260, 240, 0x1e222d, 0.98)
      .setStrokeStyle(2, 0x00d2ff);
    this.startMenuContainer.add(menuBg);

    const items = [
      { text: "🚀 Nouvelle Mission", action: () => this.handleNewMission() },
      { text: "📂 Charger Partie", action: () => this.handleLoadSave() },
      { text: "👗 Vestiaire Tactique", action: () => this.handleWardrobe() },
      { text: "⚙️ Paramètres & Touches", action: () => this.handleSettings() },
      {
        text: "🔄 Redémarrer le jeu",
        action: () => {
          this.closeStartMenu();
          this.scene.restart();
        },
      },
    ];

    items.forEach((item, idx) => {
      const yPos = -90 + idx * 45;
      const btn = this.add
        .rectangle(100, yPos, 240, 36, 0x103460, 0.8)
        .setInteractive({ useHandCursor: true });

      const label = this.add
        .text(100, yPos, item.text, {
          fontFamily: "Arial, sans-serif",
          fontSize: "13px",
          color: "#ffffff",
          fontStyle: "bold",
        })
        .setOrigin(0.5);

      btn.on("pointerover", () => btn.setFillStyle(0x00d2ff, 0.8));
      btn.on("pointerout", () => btn.setFillStyle(0x103460, 0.8));
      btn.on("pointerdown", item.action);

      this.startMenuContainer.add([btn, label]);
    });
  }

  closeStartMenu() {
    if (this.startMenuContainer) {
      this.startMenuContainer.destroy();
      this.startMenuContainer = null;
    }
    this.startMenuOpen = false;
  }

  /* ========================================================================== */
  /* NOTIFICATIONS & STATUT                                                     */
  /* ========================================================================== */

  getAgentStatusString() {
    const profile = gameState.getProfile();
    const chapter = gameState.getState().progression.currentChapter;
    const outfit = gameState.getFlag("equippedOutfit") || "apprenti";
    return `Agent : ${profile.agentName || "Inconnu"} | Ch. ${chapter} | Tenue : ${outfit}`;
  }

  refreshStatus() {
    if (this.statusText) {
      this.statusText.setText(this.getAgentStatusString());
    }
  }

  createToastElement() {
    this.saveToast = this.add
      .text(964, 805, "", {
        fontFamily: "Arial, sans-serif",
        fontSize: "16px",
        fontStyle: "bold",
        color: "#00ff88",
        backgroundColor: "#000000dd",
        padding: { x: 16, y: 8 },
      })
      .setOrigin(0.5)
      .setVisible(false)
      .setDepth(1150);
  }

  showToast(message) {
    if (!this.saveToast) return;
    this.saveToast.setText(message).setVisible(true);
    this.time.delayedCall(2800, () => {
      this.saveToast.setVisible(false);
    });
  }

  checkInitialSession() {
    const hasSave = SaveManager.hasSave();
    const isUnlocked = Boolean(gameState.getProfile().pinCode);

    if (!hasSave) {
      // Première partie : inviter à créer le profil
      this.openProfileModal("CREATE");
    } else if (!isUnlocked) {
      // Sauvegarde présente mais pas encore déverrouillée dans la session
      this.openProfileModal("LOAD");
    }
  }

  openProfileModal(mode = "LOAD", onFinished = null) {
    if (this.currentModal) {
      this.currentModal.close();
    }

    this.currentModal = new ProfileModal(this, {
      mode,
      onSuccess: (result) => {
        this.refreshStatus();
        if (result.mode === "CREATE") {
          this.showToast(`Bienvenue, agent ${result.agentName} ! Dossier initialisé.`);
        } else {
          this.showToast(`Session déverrouillée ! Bon retour, agent.`);
        }
        if (onFinished) onFinished(result);
      },
      onNewGameRequest: () => {
        this.handleNewMission();
      },
    });
  }
}
