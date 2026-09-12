import { Scene } from "phaser";
import { DialogBox } from "../components/DialogBox.js";
import { DialogueManager } from "../manager/DialogManager.js";
import { gameState } from "../state/GameState.js";
import { InventoryModal } from "../components/InventoryModal.js";
import { GaugeHUD } from "../components/GaugeHUD.js";

/**
 * Dialogue scene with Visual Novel box, Gauges HUD, and inventory modal support.
 */
export class Game extends Scene {
  constructor() {
    super("Game");
  }

  create() {
    gameState.setCurrentScene("Game");
    this.cameras.main.setBackgroundColor(0x141b26);

    // Background decoration if available
    if (this.textures.exists("pc_screen")) {
      this.add.image(980, 499, "pc_screen").setScale(1.3).setAlpha(0.65);
    }

    this.currentModal = null;

    // Visual Novel HUD: Infiltration bar and Character Affinity meter
    this.gaugeHUD = new GaugeHUD(this, { speaker: "Philippe Etchebest" });

    // Dialogue text box
    this.dialogBox = new DialogBox(this);

    // Dialogue narrative manager connected to HUD
    this.dialogueManager = new DialogueManager(
      this,
      this.dialogBox,
      "dialogs",
      { gaugeHUD: this.gaugeHUD }
    );

    // Start introductory dialogue
    this.dialogueManager.play("etchebest_intro");

    // Top HUD controls (return to desktop & inventory shortcut)
    this.createHUD();

    // Advance dialogues when clicking (only if no modal is open)
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
