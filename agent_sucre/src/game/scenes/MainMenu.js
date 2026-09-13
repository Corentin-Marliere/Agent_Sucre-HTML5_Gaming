import { Scene } from "phaser";
import { gameState } from "../state/GameState.js";
import { SaveManager } from "../manager/SaveManager.js";
import { ProfileModal } from "../components/ProfileModal.js";
import { ConfirmModal } from "../components/ConfirmModal.js";
import { Taskbar } from "../components/Taskbar.js";

/**
 * Main Menu scene representing the retro Agent OS PC desktop.
 */
export class MainMenu extends Scene {
  constructor() {
    super("MainMenu");
  }

  create() {
    gameState.setCurrentScene("MainMenu");
    this.cameras.main.setBackgroundColor(0x000000);

    // Centered retro CRT monitor frame
    this.add.image(960, 490, "pc_screen").setScale(1.3);

    this.currentModal = null;

    // Agent OS taskbar at the bottom
    this.taskbar = new Taskbar(this, { locationName: "Bureau Principal" });

    // Desktop icons organized neatly inside the CRT screen
    this.createDesktopIcons();

    // Session check on launch
    this.checkInitialSession();

    // Keydown listeners: [I] for Inventory, [M] for Map
    this.input.keyboard.on("keydown", (event) => {
      if (event.key === "i" || event.key === "I") {
        this.taskbar.handleInventory();
      } else if (event.key === "m" || event.key === "M") {
        if (!this.currentModal && !this.taskbar.currentModal) {
          if (!gameState.getFlag("chap1_scene1_completed")) {
            this.scene.start("Game", { dialogId: "bocuse_welcome" });
          } else {
            this.scene.start("GenericMapScene", { mapId: "secretInstitute" });
          }
        }
      }
    });
  }

  /* ========================================================================== */
  /* VIRTUAL DESKTOP & DESKTOP ICONS                                            */
  /* ========================================================================== */

  createDesktopIcons() {
    // Game Logo Header inside CRT monitor
    if (this.textures.exists("game_logo")) {
      this.add.image(960, 150, "game_logo").setScale(0.85);
    }

    // Active Quest Objective Banner
    const currentObjective = gameState.getCurrentObjective();
    const objBg = this.add
      .rectangle(960, 205, 840, 32, 0x0a101d, 0.88)
      .setStrokeStyle(1, 0xffdd00, 0.8);

    this.objectiveBannerText = this.add
      .text(960, 205, `🎯 OBJECTIF : ${currentObjective.instruction}`, {
        fontFamily: "Arial, sans-serif",
        fontSize: "12px",
        fontStyle: "bold",
        color: "#ffdd00",
      })
      .setOrigin(0.5);

    // 2-row by 3-column grid comfortably centered inside the CRT monitor
    const iconsData = [
      // Row 1 (y = 280)
      {
        x: 640,
        y: 280,
        label: "Mission Dialogue",
        sub: "(Continuer histoire)",
        color: "#ffffff",
        action: () => {
          const objective = gameState.getCurrentObjective();
          if (objective.targetMap === "MainMenu" || !gameState.getFlag("chap1_scene1_completed")) {
            const dialogId = gameState.getFlag("chap1_completed")
              ? "bocuse_chap1_conclusion"
              : "bocuse_welcome";
            this.scene.start("Game", { dialogId });
          } else if (objective.targetMap === "inventory") {
            this.taskbar.handleInventory();
          } else if (objective.targetMap && objective.targetMap !== "secretInstitute") {
            const dialogId = gameState.getDialogueForRoom(objective.targetMap);
            this.scene.start("Game", {
              dialogId,
              roomReturnId: objective.targetMap,
            });
          } else {
            this.scene.start("GenericMapScene", { mapId: "secretInstitute" });
          }
        },
      },
      {
        x: 960,
        y: 280,
        label: "New Mission",
        sub: "(Créer profil PIN)",
        color: "#00ffcc",
        action: () => this.handleNewMission(),
      },
      {
        x: 1280,
        y: 280,
        label: "Load Save",
        sub: "(Charger avec PIN)",
        color: "#ffdd00",
        action: () => this.handleLoadSave(),
      },
      // Row 2 (y = 480)
      {
        x: 640,
        y: 480,
        label: "Inventaire [I]",
        sub: "(Sacoche d'agent)",
        color: "#00ff88",
        action: () => this.taskbar.handleInventory(),
      },
      {
        x: 960,
        y: 480,
        label: "Wardrobe",
        sub: "(Dressing tactique)",
        color: "#e082ff",
        action: () => this.taskbar.handleWardrobe(),
      },
      {
        x: 1280,
        y: 480,
        label: "Institut Secret [M]",
        sub: "(Carte interactive)",
        color: "#38bdf8",
        action: () => {
          if (!gameState.getFlag("chap1_scene1_completed")) {
            this.scene.start("Game", { dialogId: "bocuse_welcome" });
          } else {
            this.scene.start("GenericMapScene", { mapId: "secretInstitute" });
          }
        },
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
        .text(item.x, item.y + 64, item.sub, {
          fontFamily: "Arial, sans-serif",
          fontSize: "11px",
          color: "#94a3b8",
        })
        .setOrigin(0.5);

      // Interactive hit zone covering both icon and labels
      const hitZone = this.add
        .rectangle(item.x, item.y + 20, 180, 120, 0x000000, 0)
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
    this.taskbar.closeStartMenu();

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
          this.taskbar.refreshStatus();
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
    this.taskbar.closeStartMenu();

    if (!SaveManager.hasSave()) {
      this.taskbar.showToast(
        "⚠️ Aucune sauvegarde trouvée. Cliquez sur New Mission !",
      );
      return;
    }

    this.openProfileModal("LOAD");
  }

  /**
   * Session check on launch
   */
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

  /**
   * Opens profile creation or login modal.
   * @param {string} mode - 'CREATE' or 'LOAD'
   * @param {Function} [onFinished]
   */
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
        this.taskbar.refreshStatus();
        if (result.mode === "CREATE") {
          this.taskbar.showToast(
            `Bienvenue, agent ${result.agentName} ! Connexion sécurisée...`,
          );
          this.time.delayedCall(700, () => {
            this.scene.start("Game", { dialogId: "bocuse_welcome" });
          });
        } else {
          this.refreshObjectiveBanner();
          this.taskbar.showToast(`✓ Session déverrouillée ! Progression restaurée.`);
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

  /**
   * Refreshes the desktop quest objective banner text dynamically.
   */
  refreshObjectiveBanner() {
    if (this.objectiveBannerText) {
      const currentObjective = gameState.getCurrentObjective();
      this.objectiveBannerText.setText(`🎯 OBJECTIF : ${currentObjective.instruction}`);
    }
  }
}
