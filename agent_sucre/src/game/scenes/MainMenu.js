import { Scene } from "phaser";
import { gameState } from "../state/GameState.js";
import { SaveManager } from "../manager/SaveManager.js";
import { ProfileModal } from "../components/ProfileModal.js";
import { ConfirmModal } from "../components/ConfirmModal.js";
import { Taskbar } from "../components/Taskbar.js";
import { MusicPlayerModal } from "../components/MusicPlayerModal.js";
import { MediaFolderModal } from "../components/MediaFolderModal.js";

/**
 * Main Menu scene representing the retro Agent OS PC desktop.
 */
export class MainMenu extends Scene {
  constructor() {
    super("MainMenu");
  }

  init(data) {
    this.initData = data || {};
  }

  create() {
    gameState.setCurrentScene("MainMenu");
    this.cameras.main.setBackgroundColor(0x000000);

    // Centered retro CRT monitor frame
    this.add.image(960, 490, "pc_screen").setScale(1.3);

    // Desktop wallpaper logo inside CRT monitor screen (55% opacity)
    if (this.textures.exists("pc_wallpaper_logo")) {
      const wallpaper = this.add.image(960, 460, "pc_wallpaper_logo");
      wallpaper.setDisplaySize(540, 540);
      wallpaper.setAlpha(0.1);
    }

    this.currentModal = null;

    // Agent OS taskbar at the bottom
    this.taskbar = new Taskbar(this, { locationName: "Bureau Principal" });

    // Desktop icons organized neatly inside the CRT screen
    this.createDesktopIcons();

    // Session check on launch
    this.checkInitialSession();

    // Auto-launch music player if requested (e.g. at end of Chapter 1)
    if (this.initData && this.initData.autoPlayMusic) {
      const isChapterEnd = !!this.initData.isChapterEnd;
      this.time.delayedCall(300, () => {
        this.openMusicPlayer(this.initData.autoPlayMusic, {
          singleTrack: isChapterEnd,
          volume: isChapterEnd ? 0.5 : undefined,
        });
      });
    }

    // Keydown listeners: [I] for Inventory, [M] for Map, [=]/[+] for ShootEmUp (Only when authenticated)
    this.input.keyboard.on("keydown", (event) => {
      // Prevent any global hotkeys while modal is open or session is not authenticated
      if (
        this.currentModal ||
        (this.taskbar && this.taskbar.currentModal) ||
        !gameState.getProfile().pinCode
      ) {
        return;
      }

      if (event.key === "i" || event.key === "I") {
        this.taskbar.handleInventory();
      } else if (event.key === "=" || event.key === "+") {
        this.scene.start("ShootEmUpScene", { originScene: "MainMenu" });
      } else if (event.key === "m" || event.key === "M") {
        if (!gameState.getFlag("chap1_scene1_completed")) {
          this.scene.start("Game", { dialogId: "bocuse_welcome" });
        } else {
          this.scene.start("GenericMapScene", { mapId: "secretInstitute" });
        }
      }
    });
  }

  /* ========================================================================== */
  /* VIRTUAL DESKTOP & DESKTOP ICONS                                            */
  /* ========================================================================== */

  createDesktopIcons() {
    // Container grouping all desktop foreground icons and banner to allow hiding them during media playback
    this.desktopContainer = this.add.container(0, 0);

    // Active Quest Objective Banner
    const currentObjective = gameState.getCurrentObjective();
    const objBg = this.add
      .rectangle(960, 180, 950, 40, 0x0a101d, 0.88)
      .setStrokeStyle(1, 0xffdd00, 0.8);

    this.objectiveBannerText = this.add
      .text(960, 180, `🎯 OBJECTIF : ${currentObjective.instruction}`, {
        fontFamily: "Arial, sans-serif",
        fontSize: "20px",
        fontStyle: "bold",
        color: "#ffdd00",
      })
      .setOrigin(0.5);

    this.desktopContainer.add([objBg, this.objectiveBannerText]);

    // 2-row layout inside the CRT monitor screen:
    // Row 1 (y = 280) : 4 icons (Mission Dialogue, New Mission, Load Save, Multimédia)
    // Row 2 (y = 480) : 3 icons (Inventaire, Wardrobe, Guide Michelin)
    const iconsData = [
      // Row 1 (y = 350)
      {
        x: 570,
        y: 350,
        texture: "icon_dialogue",
        label: "Browkie-Talkie",
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
        x: 830,
        y: 350,
        texture: "icon_new_mission",
        label: "Nouvel agent",
        color: "#ffffff",
        action: () => this.handleNewMission(),
      },
      {
        x: 1090,
        y: 350,
        texture: "icon_load_save",
        label: "Récupération de\nvotre dossier",
        color: "#ffffff",
        action: () => this.handleLoadSave(),
      },
      {
        x: 1350,
        y: 350,
        label: "Multimédia",
        color: "#ffffff",
        action: () => this.openMediaFolder(),
      },
      // Row 2 (y = 510)
      {
        x: 700,
        y: 510,
        texture: "icon_inventory",
        label: "Poche à douille\ndimensionnelle [I]",
        color: "#ffffff",
        action: () => this.taskbar.handleInventory(),
      },
      {
        x: 960,
        y: 510,
        texture: "icon_wardrobe",
        label: "Wardrobe",
        color: "#ffffff",
        action: () => this.taskbar.handleWardrobe(),
      },
      {
        x: 1220,
        y: 510,
        texture: "icon_map_guide",
        label: "Guide\nMichelin [M]",
        color: "#ffffff",
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
      const iconKey = item.texture || "folder";
      const iconImg = this.add.image(item.x, item.y, iconKey);

      // Scale proportionally to fit comfortably in a 68x68 box
      if (item.texture) {
        const targetDim = 80;
        const baseScale = Math.min(
          targetDim / (iconImg.width || 100),
          targetDim / (iconImg.height || 100)
        );
        iconImg.setScale(baseScale);
      } else {
        const targetDim = 68;
        const baseScale = Math.min(
          targetDim / (iconImg.width || 100),
          targetDim / (iconImg.height || 100)
        );
        iconImg.setScale(baseScale);
      }

      const hasMultiline = item.label.includes("\n");
      const labelY = item.y + (hasMultiline ? 54 : 50);
      const subY = item.y + (hasMultiline ? 74 : 68);

      const labelText = this.add
        .text(item.x, labelY, item.label, {
          fontFamily: "Arial, sans-serif",
          fontSize: "16px",
          fontStyle: "bold",
          color: item.color,
          align: "center",
        })
        .setOrigin(0.5);

      const subText = this.add
        .text(item.x, subY, item.sub, {
          fontFamily: "Arial, sans-serif",
          fontSize: "11px",
          color: "#94a3b8",
          align: "center",
        })
        .setOrigin(0.5);

      // Interactive hit zone covering both icon and labels
      const hitZone = this.add
        .rectangle(item.x, item.y + 20, 150, 130, 0x000000, 0)
        .setInteractive({ useHandCursor: true });

      hitZone.on("pointerover", () => {
        iconImg.setScale(baseScale * 1.12);
        labelText.setColor("#ffffff");
      });
      hitZone.on("pointerout", () => {
        iconImg.setScale(baseScale);
        labelText.setColor(item.color);
      });
      hitZone.on("pointerdown", item.action);

      this.desktopContainer.add([iconImg, labelText, subText, hitZone]);
    });
  }

  /**
   * Opens the retro OS File Explorer for the 'Multimédia' folder.
   * @param {string} [initialView="root"]
   */
  openMediaFolder(initialView = "root") {
    if (this.currentModal) return;
    this.currentModal = new MediaFolderModal(this, {
      initialView,
      onPlayMusic: (trackId) => {
        this.currentModal = null;
        this.openMusicPlayer(trackId);
      },
      onClose: () => {
        this.currentModal = null;
      },
    });
  }

  /**
   * Opens the retro vinyl music player with a clean/minimal desktop background.
   * @param {string} [trackId="Mission_Mille_Feuille"]
   * @param {Object} [options]
   */
  openMusicPlayer(trackId = "Mission_Mille_Feuille", options = {}) {
    if (this.currentModal) {
      if (typeof this.currentModal.close === "function") {
        this.currentModal.close();
      } else {
        this.currentModal.destroy();
      }
      this.currentModal = null;
    }

    // Hide desktop icons and banner so background is pristine and focused on the vinyl
    this.setDesktopVisibility(false);

    this.currentModal = new MusicPlayerModal(this, {
      trackId,
      singleTrack: options.singleTrack || false,
      volume: typeof options.volume === "number" ? options.volume : null,
      onClose: () => {
        this.currentModal = null;
        this.setDesktopVisibility(true);
      },
    });
  }

  /**
   * Toggles visibility of desktop icons and active quest banner.
   * @param {boolean} visible
   */
  setDesktopVisibility(visible) {
    if (this.desktopContainer) {
      this.desktopContainer.setVisible(visible);
    }
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
