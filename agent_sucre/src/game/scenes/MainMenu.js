import { Scene } from "phaser";
import { gameState } from "../state/GameState.js";
import { SaveManager } from "../manager/SaveManager.js";
import { ProfileModal } from "../components/ProfileModal.js";
import { SettingsModal } from "../components/SettingsModal.js";
import { WardrobeModal } from "../components/WardrobeModal.js";
import { ConfirmModal } from "../components/ConfirmModal.js";
import { InventoryModal } from "../components/InventoryModal.js";

/**
 * Main Menu scene.
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
    this.currentModal = null;

    // Bottom taskbar
    this.createTaskbar();

    // Virtual desktop icons
    this.createDesktopIcons();

    // Toast notification element
    this.createToastElement();

    // Session check on launch
    this.checkInitialSession();

    // Toggle inventory with [I] key
    this.input.keyboard.on("keydown", (event) => {
      if (event.key === "i" || event.key === "I") {
        this.handleInventory();
      }
    });
  }

  /* ========================================================================== */
  /* VIRTUAL DESKTOP & DESKTOP ICONS                                            */
  /* ========================================================================== */

  createDesktopIcons() {
    const iconsData = [
      {
        x: 400,
        y: 158,
        label: "Mission Dialogue",
        sub: "(Boîte de dialogue)",
        color: "#ffffff",
        action: () => this.scene.start("Game"),
      },
      {
        x: 620,
        y: 158,
        label: "New Mission",
        sub: "(Créer profil PIN)",
        color: "#00ffcc",
        action: () => this.handleNewMission(),
      },
      {
        x: 840,
        y: 158,
        label: "Load Save",
        sub: "(Charger avec PIN)",
        color: "#ffdd00",
        action: () => this.handleLoadSave(),
      },
      {
        x: 1060,
        y: 158,
        label: "Inventaire [I]",
        sub: "(Sacoche d'agent)",
        color: "#00ff88",
        action: () => this.handleInventory(),
      },
      {
        x: 1280,
        y: 158,
        label: "Wardrobe",
        sub: "(Dressing tactique)",
        color: "#e082ff",
        action: () => this.handleWardrobe(),
      },
      {
        x: 1500,
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

      const labelText = this.add
        .text(item.x, item.y + 44, item.label, {
          fontFamily: "Arial, sans-serif",
          fontSize: "14px",
          fontStyle: "bold",
          color: item.color,
        })
        .setOrigin(0.5);

      const subText = this.add
        .text(item.x, item.y + 62, item.sub, {
          fontFamily: "Arial, sans-serif",
          fontSize: "11px",
          color: "#94a3b8",
        })
        .setOrigin(0.5);

      // Interactive hit zone covering both icon and label
      const hitZone = this.add
        .rectangle(item.x, item.y + 20, 160, 120, 0x000000, 0)
        .setInteractive({ useHandCursor: true });

      hitZone.on("pointerover", () => {
        folder.setScale(0.11);
        labelText.setColor("#ffffff");
      });
      hitZone.on("pointerout", () => {
        folder.setScale(0.1);
        labelText.setColor(item.color);
      });
      hitZone.on("pointerdown", item.action);
    });
  }

  /* ========================================================================== */
  /* BUTTON ACTIONS                                                             */
  /* ========================================================================== */

  /**
   * 'New Mission' action
   */
  handleNewMission() {
    this.closeStartMenu();

    if (SaveManager.hasSave()) {
      new ConfirmModal(this, {
        title: "⚠️ NOUVELLE MISSION",
        message:
          "Une sauvegarde existe déjà.\nVoulez-vous réinitialiser votre progression et créer un nouveau profil d'agent ?",
        confirmText: "Oui, nouvelle partie",
        cancelText: "Annuler",
        onConfirm: () => {
          SaveManager.deleteSave();
          gameState.reset();
          this.refreshStatus();
          this.openProfileModal("CREATE");
        },
      });
    } else {
      this.openProfileModal("CREATE");
    }
  }

  /**
   * 'Load Save' action
   */
  handleLoadSave() {
    this.closeStartMenu();

    if (!SaveManager.hasSave()) {
      this.showToast("⚠️ Aucune sauvegarde trouvée. Cliquez sur New Mission !");
      return;
    }

    this.openProfileModal("LOAD");
  }

  /**
   * 'Settings' action
   */
  handleSettings() {
    this.closeStartMenu();

    new SettingsModal(this, {
      onRestart: () => this.handleRestartGame(),
      onClearSave: () => this.handleClearSave(),
    });
  }

  /**
   * 'Wardrobe' action
   */
  handleWardrobe() {
    this.closeStartMenu();
    new WardrobeModal(this);
  }

  /**
   * 'Inventory' action: Opens the Point & Click inventory modal
   */
  handleInventory() {
    this.closeStartMenu();

    if (this.currentModal) {
      const isSame = this.currentModal instanceof InventoryModal;
      this.currentModal.close();
      this.currentModal = null;
      if (isSame) return;
    }

    this.currentModal = new InventoryModal(this, {
      onClose: () => {
        this.currentModal = null;
      },
    });

    this.currentModal.on("destroy", () => {
      this.currentModal = null;
    });
  }

  /**
   * Restart game:
   */
  handleRestartGame() {
    this.showToast("🔄 Redémarrage du système...");
    gameState.reset();
    if (this.currentModal && this.currentModal.scene) {
      this.currentModal.close();
    }
    this.currentModal = null;

    this.time.delayedCall(400, () => {
      this.scene.restart();
    });
  }

  /**
   * Complete wipe of save data and return to profile creation.
   */
  handleClearSave() {
    SaveManager.deleteSave();
    gameState.reset();
    this.showToast("🗑️ Sauvegarde effacée !");

    if (this.currentModal && this.currentModal.scene) {
      this.currentModal.close();
    }
    this.currentModal = null;

    this.time.delayedCall(400, () => {
      this.scene.restart();
    });
  }

  /* ========================================================================== */
  /* TASKBAR & START MENU                                                       */
  /* ========================================================================== */

  createTaskbar() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x000000, 1);
    g.fillRect(32, 32, 1155, 80);
    g.generateTexture("task_bar", 1155, 80);
    g.destroy();

    this.add.image(964, 850, "task_bar");

    // Windows Cake button
    const cakeBtn = this.add.image(450, 865, "windows_cake").setScale(0.08);
    cakeBtn.setInteractive({ useHandCursor: true });
    cakeBtn.on("pointerdown", () => this.toggleStartMenu());

    // Agent status on taskbar
    this.statusText = this.add
      .text(495, 865, this.getAgentStatusString(), {
        fontFamily: "Courier, monospace",
        fontSize: "14px",
        color: "#00ffcc",
      })
      .setOrigin(0, 0.5);

    // Settings button on taskbar
    const settingsBtn = this.add
      .rectangle(1340, 865, 110, 32, 0x1e3a5f)
      .setStrokeStyle(1, 0xffffff)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(1340, 865, "⚙️ Options", {
        fontFamily: "Arial, sans-serif",
        fontSize: "13px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    settingsBtn.on("pointerover", () => settingsBtn.setAlpha(0.85));
    settingsBtn.on("pointerout", () => settingsBtn.setAlpha(1));
    settingsBtn.on("pointerdown", () => this.handleSettings());

    // Save button on taskbar
    const saveBtn = this.add
      .rectangle(1465, 865, 120, 32, 0x1f7a3a)
      .setStrokeStyle(1, 0xffffff)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(1465, 865, "💾 Sauvegarder", {
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
      .rectangle(100, 0, 260, 290, 0x1e222d, 0.98)
      .setStrokeStyle(2, 0x00d2ff);
    this.startMenuContainer.add(menuBg);

    const items = [
      { text: "💬 Mission Dialogue", action: () => { this.closeStartMenu(); this.scene.start("Game"); } },
      { text: "🎒 Sacoche & Inventaire", action: () => { this.closeStartMenu(); this.handleInventory(); } },
      { text: "🚀 Nouvelle Mission", action: () => this.handleNewMission() },
      { text: "📂 Charger Sauvegarde", action: () => this.handleLoadSave() },
      { text: "👗 Vestiaire Tactique", action: () => this.handleWardrobe() },
      { text: "⚙️ Paramètres & Touches", action: () => this.handleSettings() },
      { text: "🔄 Redémarrer le jeu", action: () => { this.closeStartMenu(); this.handleRestartGame(); } },
    ];

    items.forEach((item, idx) => {
      const yPos = -115 + idx * 38;
      const btn = this.add
        .rectangle(100, yPos, 240, 32, 0x103460, 0.8)
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
  /* NOTIFICATIONS & STATUS                                                     */
  /* ========================================================================== */

  getAgentStatusString() {
    const profile = gameState.getProfile();
    const chapter = gameState.getState().progression.currentChapter;
    const outfit = gameState.getFlag("equippedOutfit") || "apprenti";
    return `Agent : ${profile.agentName || "Inconnu"} | Ch. ${chapter} | Tenue : ${outfit}`;
  }

  refreshStatus() {
    if (this.statusText && this.statusText.scene) {
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
    if (!this.saveToast || !this.saveToast.scene) return;
    this.saveToast.setText(message).setVisible(true);
    this.time.delayedCall(2800, () => {
      if (this.saveToast && this.saveToast.scene) {
        this.saveToast.setVisible(false);
      }
    });
  }

  checkInitialSession() {
    const hasSave = SaveManager.hasSave();
    const isUnlocked = Boolean(gameState.getProfile().pinCode);

    if (!hasSave) {
      // First playthrough
      this.openProfileModal("CREATE");
    } else if (!isUnlocked) {
      // Existing save present but session not unlocked
      this.openProfileModal("LOAD");
    }
  }

  openProfileModal(mode = "LOAD", onFinished = null) {
    if (this.currentModal) {
      if (this.currentModal.scene) {
        this.currentModal.close();
      }
      this.currentModal = null;
    }

    this.currentModal = new ProfileModal(this, {
      mode,
      onSuccess: (result) => {
        this.currentModal = null;
        this.refreshStatus();
        if (result.mode === "CREATE") {
          this.showToast(`Bienvenue, agent ${result.agentName} ! Dossier initialisé.`);
        } else {
          this.showToast(`Session déverrouillée ! Bon retour, agent.`);
        }
        if (onFinished) onFinished(result);
      },
      onNewGameRequest: () => {
        this.currentModal = null;
        this.handleNewMission();
      },
    });

    this.currentModal.on("destroy", () => {
      this.currentModal = null;
    });
  }
}
