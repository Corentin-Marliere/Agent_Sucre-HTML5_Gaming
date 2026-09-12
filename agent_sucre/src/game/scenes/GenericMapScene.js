import { Scene } from "phaser";
import { InteractiveArea } from "../components/InteractiveArea.js";
import { gameState } from "../state/GameState.js";
import { InventoryModal } from "../components/InventoryModal.js";

/**
 * Interactive exploration map scene with HUD and inventory support.
 */
export class GenericMapScene extends Scene {
  constructor() {
    super({ key: "GenericMapScene" });
  }

  init(data) {
    this.currentMapId = data.mapId;
    gameState.setCurrentScene("GenericMapScene");
    if (data.mapId) {
      gameState.setCurrentMap(data.mapId);
    }
    this.currentModal = null;
  }

  create() {
    const mapsData = this.cache.json.get("maps");
    const mapData = mapsData[this.currentMapId];

    if (!mapData) {
      console.error(
        `La carte "${this.currentMapId}" n'existe pas dans maps.json`,
      );
      return;
    }

    this.add.image(0, 0, mapData.mapKey).setOrigin(0, 0);

    mapData.zones.forEach((zone) => {
      new InteractiveArea(
        this,
        zone.x,
        zone.y,
        zone.width,
        zone.height,
        zone.type,
        zone.target,
      );
    });

    // Top HUD controls
    this.createHUD();

    // Key listener for inventory [I]
    this.input.keyboard.on("keydown", (event) => {
      if (event.key === "i" || event.key === "I") {
        this.toggleInventory();
      }
    });
  }

  /**
   * Creates HUD buttons for returning to desktop and opening inventory.
   */
  createHUD() {
    // Return to main menu desktop
    const desktopBtn = this.add
      .rectangle(1730, 36, 110, 32, 0x1e222d, 0.9)
      .setStrokeStyle(1, 0x00d2ff)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(1730, 36, "🖥️ Bureau", {
        fontFamily: "Arial, sans-serif",
        fontSize: "13px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    desktopBtn.on("pointerdown", () => this.scene.start("MainMenu"));

    // Inventory button
    const invBtn = this.add
      .rectangle(1850, 36, 100, 32, 0x14422b, 0.9)
      .setStrokeStyle(1, 0x00ff88)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(1850, 36, "🎒 Sacoche [I]", {
        fontFamily: "Arial, sans-serif",
        fontSize: "12px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    invBtn.on("pointerdown", () => this.toggleInventory());
  }

  /**
   * Toggles the Point & Click inventory modal.
   */
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
