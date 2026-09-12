import { Scene } from "phaser";
import { DialogBox } from "../components/DialogBox.js";
import { DialogueManager } from "../manager/DialogManager.js";
import { gameState } from "../state/GameState.js";
import { InventoryModal } from "../components/InventoryModal.js";

/**
 * Dialogue scene with Visual Novel box and inventory modal support.
 */
export class Game extends Scene {
  constructor() {
    super("Game");
  }

  create() {
    gameState.setCurrentScene("Game");
    this.cameras.main.setBackgroundColor(0x00ff00);

    this.currentModal = null;

    this.dialogBox = new DialogBox(this);

    this.dialogueManager = new DialogueManager(
      this,
      this.dialogBox,
      "dialogs",
    );

    this.dialogueManager.play("explications");

    // Top HUD controls
    this.createHUD();

    // Advance dialogues when clicking or pressing Space/Enter (only if no modal is open)
    this.input.on("pointerdown", () => {
      if (!this.currentModal) {
        this.dialogBox.advance();
      }
    });

    // Keydown handler: inventory [I] and configurable dialogue advance (SPACE vs ENTER)
    this.input.keyboard.on("keydown", (event) => {
      if (event.key === "i" || event.key === "I") {
        this.toggleInventory();
        return;
      }

      // Do not advance dialogues if an interactive modal is currently open
      if (this.currentModal) return;

      const configuredKey = gameState.getFlag("dialogueKey") || "SPACE";
      if (configuredKey === "SPACE" && (event.key === " " || event.code === "Space")) {
        this.dialogBox.advance();
      } else if (configuredKey === "ENTER" && event.key === "Enter") {
        this.dialogBox.advance();
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
