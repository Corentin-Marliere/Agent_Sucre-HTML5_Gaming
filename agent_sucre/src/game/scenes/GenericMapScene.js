import { Scene } from "phaser";
import { InteractiveArea } from "../components/InteractiveArea.js";
import { gameState } from "../state/GameState.js";
import { InventoryModal } from "../components/InventoryModal.js";
import { ConfirmModal } from "../components/ConfirmModal.js";
import { MazeModal } from "../components/MazeModal.js";
import { Taskbar } from "../components/Taskbar.js";

/**
 * Scene handling both full-screen academy navigation maps and immersive room terminals.
 */
export class GenericMapScene extends Scene {
  constructor() {
    super({ key: "GenericMapScene" });
  }

  init(data) {
    this.currentMapId = data?.mapId || "secretInstitute";
    gameState.setCurrentScene("GenericMapScene");
    if (this.currentMapId) {
      gameState.setCurrentMap(this.currentMapId);
    }
    this.currentModal = null;
    this.tooltipContainer = null;
    this.taskbar = null;
  }

  create() {
    // If the prologue briefing with Director Bocuse was not completed, redirect immediately to Bocuse
    if (!gameState.getFlag("chap1_scene1_completed")) {
      this.scene.start("Game", { dialogId: "bocuse_welcome" });
      return;
    }

    const mapsData = this.cache.json.get("maps");
    const mapData = mapsData ? mapsData[this.currentMapId] : null;

    if (!mapData) {
      console.error(`Map or room "${this.currentMapId}" not found in maps.json`);
      this.scene.start("MainMenu");
      return;
    }

    if (mapData.type === "room") {
      this.createRoomView(mapData);
    } else {
      this.createMapView(mapData);
    }
  }

  /* ========================================================================== */
  /* MAP MODE (Full-screen interactive blueprint)                               */
  /* ========================================================================== */

  createMapView(mapData) {
    this.cameras.main.setBackgroundColor(0x000000);

    // Render the map scaled to cover the full 1920x980 viewport
    const mapImg = this.add.image(960, 490, mapData.mapKey);
    mapImg.setDisplaySize(1920, 980);

    // Create interactive clickable areas mapped to the full-screen canvas
    if (Array.isArray(mapData.zones)) {
      mapData.zones.forEach((zone) => {
        new InteractiveArea(
          this,
          zone.x,
          zone.y,
          zone.width,
          zone.height,
          zone.type,
          zone.target,
          zone.label || ""
        );
      });
    }

    // Top navigation HUD
    this.createMapHUD(mapData);

    // Inventory toggle with [I] key
    this.input.keyboard.on("keydown", (event) => {
      if (event.key === "i" || event.key === "I") {
        this.toggleInventory();
      }
    });
  }

  /**
   * Builds the top HUD bar and hover tooltip for the full-screen map.
   * @param {Object} mapData
   */
  createMapHUD(mapData) {
    // Left title pill
    const titlePill = this.add
      .rectangle(230, 36, 380, 34, 0x0a0e17, 0.9)
      .setStrokeStyle(1, 0x00d2ff);

    this.add
      .text(230, 36, `🗺️ ${mapData.title || "CARTE DE L'INSTITUT"}`, {
        fontFamily: "Arial, sans-serif",
        fontSize: "14px",
        fontStyle: "bold",
        color: "#00ffcc",
      })
      .setOrigin(0.5);

    // Center active quest objective banner
    const currentObjective = gameState.getCurrentObjective();
    this.objectiveContainer = this.add.container(960, 36);
    this.objectiveContainer.setDepth(450);

    const objBg = this.add
      .rectangle(0, 0, 820, 34, 0x0a101d, 0.92)
      .setStrokeStyle(1, 0xffdd00, 0.85);

    this.objectiveText = this.add
      .text(0, 0, `🎯 OBJECTIF : ${currentObjective.instruction}`, {
        fontFamily: "Arial, sans-serif",
        fontSize: "13px",
        fontStyle: "bold",
        color: "#ffdd00",
      })
      .setOrigin(0.5);

    this.objectiveContainer.add([objBg, this.objectiveText]);

    // Center interactive tooltip banner (shown when hovering zones)
    this.tooltipContainer = this.add.container(960, 36);
    this.tooltipContainer.setVisible(false);
    this.tooltipContainer.setDepth(500);

    const tooltipBg = this.add
      .rectangle(0, 0, 680, 34, 0x0d1527, 0.96)
      .setStrokeStyle(1, 0x00ffcc);

    this.tooltipText = this.add
      .text(0, 0, "", {
        fontFamily: "Arial, sans-serif",
        fontSize: "13px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    this.tooltipContainer.add([tooltipBg, this.tooltipText]);

    // Top Right Controls
    // Return to main desktop button
    const desktopBtn = this.add
      .rectangle(1720, 36, 120, 34, 0x1e222d, 0.92)
      .setStrokeStyle(1, 0x00d2ff)
      .setInteractive({ useHandCursor: true });

    const desktopLabel = this.add
      .text(1720, 36, "🖥️ Bureau", {
        fontFamily: "Arial, sans-serif",
        fontSize: "13px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    desktopBtn.on("pointerover", () => desktopBtn.setFillStyle(0x0055aa, 1));
    desktopBtn.on("pointerout", () => desktopBtn.setFillStyle(0x1e222d, 0.92));
    desktopBtn.on("pointerdown", () => this.scene.start("MainMenu"));

    // Open inventory button
    const invBtn = this.add
      .rectangle(1850, 36, 110, 34, 0x155d27, 0.92)
      .setStrokeStyle(1, 0x00ff88)
      .setInteractive({ useHandCursor: true });

    const invLabel = this.add
      .text(1850, 36, "🎒 Sacoche [I]", {
        fontFamily: "Arial, sans-serif",
        fontSize: "12px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    invBtn.on("pointerover", () => invBtn.setFillStyle(0x1d7c34, 1));
    invBtn.on("pointerout", () => invBtn.setFillStyle(0x155d27, 0.92));
    invBtn.on("pointerdown", () => this.toggleInventory());
  }

  showMapTooltip(label) {
    if (this.tooltipContainer && this.tooltipText && label) {
      this.tooltipText.setText(label);
      this.tooltipContainer.setVisible(true);
      if (this.objectiveContainer) {
        this.objectiveContainer.setVisible(false);
      }
    }
  }

  hideMapTooltip() {
    if (this.tooltipContainer) {
      this.tooltipContainer.setVisible(false);
    }
    if (this.objectiveContainer) {
      this.objectiveContainer.setVisible(true);
    }
  }

  /* ========================================================================== */
  /* ROOM MODE (Immersive retro PC monitor terminal in a specific location)     */
  /* ========================================================================== */

  createRoomView(roomData) {
    this.cameras.main.setBackgroundColor(0x000000);

    // Centered retro PC monitor frame
    this.add.image(960, 490, "pc_screen").setScale(1.3);

    // Terminal desktop wallpaper logo inside CRT monitor screen (55% opacity)
    if (this.textures.exists("pc_wallpaper_logo")) {
      const wallpaper = this.add.image(960, 460, "pc_wallpaper_logo");
      wallpaper.setDisplaySize(540, 540);
      wallpaper.setAlpha(0.1);
    }

    // Reusable taskbar at the bottom of the CRT screen
    this.taskbar = new Taskbar(this, {
      locationName: roomData.title || "Poste d'observation",
    });

    // Room Header Banner inside the CRT monitor
    const headerBg = this.add
      .rectangle(960, 195, 880, 60, 0x0a101d, 0.88)
      .setStrokeStyle(2, 0x00d2ff, 0.8);

    const headerTitle = this.add
      .text(960, 182, `🏛️ ${roomData.title || "TERMINAL DE SALLE"}`, {
        fontFamily: "Arial, sans-serif",
        fontSize: "18px",
        fontStyle: "bold",
        color: "#00ffcc",
      })
      .setOrigin(0.5);

    const headerDesc = this.add
      .text(960, 210, roomData.description || "Poste de contrôle d'agent secret.", {
        fontFamily: "Arial, sans-serif",
        fontSize: "13px",
        color: "#cbd5e1",
      })
      .setOrigin(0.5);

    // Active Quest Objective reminder inside the room
    const currentObjective = gameState.getCurrentObjective();
    const isTargetRoom = currentObjective.targetMap === this.currentMapId;

    const objBannerBg = this.add
      .rectangle(960, 260, 880, 36, isTargetRoom ? 0x14281b : 0x0d1527, 0.9)
      .setStrokeStyle(1, isTargetRoom ? 0x00ff88 : 0x334155);

    this.add
      .text(960, 260, `🎯 OBJECTIF ACTIF : ${currentObjective.instruction}`, {
        fontFamily: "Arial, sans-serif",
        fontSize: "13px",
        fontStyle: "bold",
        color: isTargetRoom ? "#00ffcc" : "#e2e8f0",
      })
      .setOrigin(0.5);

    // Room Action Folders inside the CRT monitor
    this.createRoomIcons(roomData);

    // Key listeners: [I] for Inventory, [M] for Map
    this.input.keyboard.on("keydown", (event) => {
      if (event.key === "i" || event.key === "I") {
        this.taskbar.handleInventory();
      } else if (event.key === "m" || event.key === "M") {
        if (!this.taskbar.currentModal) {
          this.scene.start("GenericMapScene", { mapId: "secretInstitute" });
        }
      }
    });
  }

  /**
   * Renders the action folders for the room terminal.
   * @param {Object} roomData
   */
  createRoomIcons(roomData) {
    const icons = [];

    // Dynamically resolve the story dialogue ID for this room
    const activeDialogId = gameState.getDialogueForRoom(this.currentMapId);

    // Story / Dialogue trigger button (Brookie-Walkie)
    if (roomData.character || roomData.dialogId) {
      icons.push({
        texture: "icon_dialogue",
        label: roomData.character ? `Parler à\n${roomData.character}` : "Rapport\nMission",
        color: "#ffffff",
        action: () => {
          this.scene.start("Game", {
            dialogId: activeDialogId,
            roomReturnId: this.currentMapId,
          });
        },
      });
    }

    // Map shortcut (Guide Michelin / Boussole)
    icons.push({
      texture: "icon_map_guide",
      label: "Guide\nMichelin",
      color: "#ffffff",
      action: () => {
        this.scene.start("GenericMapScene", { mapId: "secretInstitute" });
      },
    });

    // Inventory shortcut (Poche à douille)
    icons.push({
      texture: "icon_inventory",
      label: "Inventaire\n[I]",
      color: "#ffffff",
      action: () => this.taskbar.handleInventory(),
    });

    // Desktop shortcut (Windows Cake)
    icons.push({
      texture: "windows_cake",
      label: "Bureau\nPrincipal",
      color: "#ffffff",
      action: () => this.scene.start("MainMenu"),
    });

    // Spacing calculation centered inside the CRT screen
    const count = icons.length;
    const spacing = 220;
    const startX = 960 - ((count - 1) * spacing) / 2;
    const yPos = 430;

    icons.forEach((item, idx) => {
      const xPos = startX + idx * spacing;
      const iconKey = item.texture || "folder";

      const iconImg = this.add.image(xPos, yPos, iconKey);
      const targetDim = 66;
      const baseScale = Math.min(
        targetDim / (iconImg.width || 100),
        targetDim / (iconImg.height || 100)
      );
      iconImg.setScale(baseScale);

      const hasMultiline = item.label.includes("\n");
      const labelY = yPos + (hasMultiline ? 46 : 44);
      const subY = yPos + (hasMultiline ? 72 : 64);

      const labelText = this.add
        .text(xPos, labelY, item.label, {
          fontFamily: "Arial, sans-serif",
          fontSize: "14px",
          fontStyle: "bold",
          color: item.color,
          align: "center",
        })
        .setOrigin(0.5);

      const subText = this.add
        .text(xPos, subY, item.sub, {
          fontFamily: "Arial, sans-serif",
          fontSize: "11px",
          color: "#94a3b8",
          align: "center",
        })
        .setOrigin(0.5);

      const hitZone = this.add
        .rectangle(xPos, yPos + 20, 170, 130, 0x000000, 0)
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
    });
  }

  /* ========================================================================== */
  /* MODAL HELPERS                                                              */
  /* ========================================================================== */

  toggleInventory() {
    if (this.currentModal) {
      this.currentModal.close();
      this.currentModal = null;
      return;
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
   * Handles player clicking on the Archives zone on the map.
   */
  handleArchivesAccess() {
    // If the player already solved the maze, access directly to Archives
    if (gameState.getFlag("archives_unlocked")) {
      let transitioned = false;
      const goToArchives = () => {
        if (!transitioned) {
          transitioned = true;
          this.scene.start("GenericMapScene", { mapId: "archives" });
        }
      };

      this.cameras.main.fadeOut(300, 0, 0, 0, (camera, progress) => {
        if (progress >= 1) {
          goToArchives();
        }
      });

      this.time.delayedCall(350, goToArchives);
      return;
    }

    // Otherwise, show the security error alert modal directing them to the secret corridor
    new ConfirmModal(this, {
      title: "⛔ ACCÈS REFUSÉ — SAS DES ARCHIVES",
      message:
        "Le sas biométrique des Archives est verrouillé !\nImpossible d'entrer directement.\n\nPassez par le Couloir Secret de dérivation pour pirater et déverrouiller le sas.",
      confirmText: "🕵️ Aller au Couloir Secret",
      cancelText: "Annuler",
      onConfirm: () => {
        this.launchMazeMinigame();
      },
    });
  }

  /**
   * Launches the procedural Among Us style maze minigame.
   */
  launchMazeMinigame() {
    if (this.currentModal) {
      this.currentModal.close();
      this.currentModal = null;
    }

    this.currentModal = new MazeModal(this, {
      timeLimit: 25,
      onClose: () => {
        this.currentModal = null;
      },
      onSuccess: () => {
        this.currentModal = null;
        gameState.setFlag("archives_unlocked", true);
        this.showToast("🔓 SAS DÉVERROUILLÉ : Accès aux Archives accordé !");

        let transitioned = false;
        const goToArchives = () => {
          if (!transitioned) {
            transitioned = true;
            this.scene.start("GenericMapScene", { mapId: "archives" });
          }
        };

        // Transition directly into the Archives room terminal
        this.cameras.main.fadeOut(400, 0, 0, 0, (camera, progress) => {
          if (progress >= 1) {
            goToArchives();
          }
        });

        // Safety fallback timer so transition never hangs
        this.time.delayedCall(450, goToArchives);
      },
    });
  }

  /**
   * Shows a toast message via taskbar or floating toast on map.
   * @param {string} msg
   */
  showToast(msg) {
    if (this.taskbar && this.taskbar.scene && typeof this.taskbar.showToast === "function") {
      this.taskbar.showToast(msg);
      return;
    }

    const toast = this.add
      .text(960, 90, msg, {
        fontFamily: "Arial, sans-serif",
        fontSize: "15px",
        fontStyle: "bold",
        backgroundColor: "#0d1527",
        padding: { x: 20, y: 10 },
        color: "#00ffcc",
      })
      .setOrigin(0.5)
      .setDepth(1400);

    this.tweens.add({
      targets: toast,
      alpha: 0,
      y: 70,
      delay: 2200,
      duration: 400,
      onComplete: () => toast.destroy(),
    });
  }
}
