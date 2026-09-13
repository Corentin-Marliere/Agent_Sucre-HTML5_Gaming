import { Scene } from "phaser";
import { InteractiveArea } from "../components/InteractiveArea.js";
import { gameState } from "../state/GameState.js";
import { InventoryModal } from "../components/InventoryModal.js";
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
  }

  create() {
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

    // Story / Dialogue trigger button
    if (roomData.character || roomData.dialogId) {
      icons.push({
        label: `💬 ${roomData.character ? "Parler à " + roomData.character : "Rapport Mission"}`,
        sub: "(Lancer l'échange)",
        color: "#ffdd00",
        action: () => {
          this.scene.start("Game", {
            dialogId: activeDialogId,
            roomReturnId: this.currentMapId,
          });
        },
      });
    }

    // Map shortcut
    icons.push({
      label: "🗺️ Carte Institut [M]",
      sub: "(Changer de pièce)",
      color: "#38bdf8",
      action: () => {
        this.scene.start("GenericMapScene", { mapId: "secretInstitute" });
      },
    });

    // Inventory shortcut
    icons.push({
      label: "🎒 Sacoche [I]",
      sub: "(Inspecter objets)",
      color: "#00ff88",
      action: () => this.taskbar.handleInventory(),
    });

    // Desktop shortcut
    icons.push({
      label: "🖥️ Bureau Principal",
      sub: "(Retour accueil)",
      color: "#ffffff",
      action: () => this.scene.start("MainMenu"),
    });

    // Spacing calculation centered inside the CRT screen
    const count = icons.length;
    const spacing = 230;
    const startX = 960 - ((count - 1) * spacing) / 2;
    const yPos = 440;

    icons.forEach((item, idx) => {
      const xPos = startX + idx * spacing;

      const folder = this.add.image(xPos, yPos, "folder");
      folder.setScale(0.1);

      const labelText = this.add
        .text(xPos, yPos + 44, item.label, {
          fontFamily: "Arial, sans-serif",
          fontSize: "14px",
          fontStyle: "bold",
          color: item.color,
        })
        .setOrigin(0.5);

      const subText = this.add
        .text(xPos, yPos + 64, item.sub, {
          fontFamily: "Arial, sans-serif",
          fontSize: "11px",
          color: "#94a3b8",
        })
        .setOrigin(0.5);

      const hitZone = this.add
        .rectangle(xPos, yPos + 20, 170, 120, 0x000000, 0)
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
}
