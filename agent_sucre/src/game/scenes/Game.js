import { Scene } from "phaser";
import { DialogBox } from "../components/DialogBox.js";
import { DialogueManager } from "../manager/DialogManager.js";
import { gameState } from "../state/GameState.js";
import { InventoryModal } from "../components/InventoryModal.js";
import { GaugeHUD } from "../components/GaugeHUD.js";

/**
 * Visual Novel dialogue scene with room-specific background,
 * animated character caricature portraits, Gauges HUD, and inventory modal support.
 */
export class Game extends Scene {
  constructor() {
    super("Game");
  }

  init(data) {
    this.dialogId = data?.dialogId || "etchebest_intro";
    this.roomReturnId = data?.roomReturnId || null;
  }

  create() {
    gameState.setCurrentScene("Game");
    this.cameras.main.setBackgroundColor(0x050811);

    // Render room-specific visual background
    const bgKey = this.getBackgroundTextureKey();
    if (this.textures.exists(bgKey)) {
      const bg = this.add.image(960, 490, bgKey);
      bg.setDisplaySize(1920, 980);
      bg.setDepth(0);

      // Ambient darkening overlay to ensure character and dialogue box contrast
      const dimOverlay = this.add.rectangle(960, 490, 1920, 980, 0x050811, 0.45);
      dimOverlay.setDepth(1);
    } else if (this.textures.exists("pc_screen")) {
      this.add.image(960, 490, "pc_screen").setScale(1.3).setAlpha(0.65).setDepth(0);
    }

    this.currentModal = null;

    // Visual Novel character caricature portrait container
    this.createSpeakerVisuals();

    // Visual Novel HUD: Infiltration bar and Character Affinity meter
    this.gaugeHUD = new GaugeHUD(this, { speaker: "Philippe Etchebest" });
    this.gaugeHUD.setDepth(30);

    // Dialogue text box
    this.dialogBox = new DialogBox(this);
    this.dialogBox.setDepth(20);

    // Dialogue narrative manager connected to HUD
    this.dialogueManager = new DialogueManager(
      this,
      this.dialogBox,
      "dialogs",
      { gaugeHUD: this.gaugeHUD }
    );

    // Start introductory dialogue or room-specific dialogue
    this.dialogueManager.play(this.dialogId || "etchebest_intro");

    // Top HUD controls (return button, active objective reminder, and inventory shortcut)
    this.createHUD();

    // Advance dialogues when clicking (only if no modal is open)
    this.input.on("pointerdown", () => {
      if (!this.currentModal) {
        this.dialogBox.advance();
      }
    });

    // Keydown handler: inventory [I], map [M], and configurable dialogue advance (SPACE vs ENTER)
    this.input.keyboard.on("keydown", (event) => {
      if (event.key === "i" || event.key === "I") {
        this.toggleInventory();
        return;
      } else if (event.key === "m" || event.key === "M") {
        if (!this.currentModal) {
          this.scene.start("GenericMapScene", { mapId: "secretInstitute" });
        }
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
   * Resolves the room background texture key based on roomReturnId or dialogueId.
   * @returns {string}
   */
  getBackgroundTextureKey() {
    if (this.roomReturnId && this.textures.exists(`bg_${this.roomReturnId}`)) {
      return `bg_${this.roomReturnId}`;
    }
    if (this.dialogId.startsWith("lignac") && this.textures.exists("bg_rd_lab")) {
      return "bg_rd_lab";
    }
    if (this.dialogId.startsWith("ramsay") && this.textures.exists("bg_training_grounds")) {
      return "bg_training_grounds";
    }
    if (this.textures.exists("bg_security_hall")) {
      return "bg_security_hall";
    }
    return "pc_screen";
  }

  /**
   * Builds the character caricature portrait container.
   */
  createSpeakerVisuals() {
    this.speakerContainer = this.add.container(960, 420);
    this.speakerContainer.setDepth(5);
    this.speakerContainer.setVisible(false);

    // Card frame & background
    this.speakerCardBg = this.add
      .rectangle(0, 0, 460, 460, 0x0a101d, 0.9)
      .setStrokeStyle(3, 0x00d2ff);

    // Character caricature portrait image
    this.speakerSprite = this.add.image(0, 0, "char_etchebest");
    this.speakerSprite.setDisplaySize(454, 454);

    // Subtle inner border
    this.speakerInnerBorder = this.add
      .rectangle(0, 0, 454, 454)
      .setStrokeStyle(1.5, 0x00d2ff, 0.6);

    // Speaker Name badge at the bottom of the portrait card
    this.speakerBadgeBg = this.add
      .rectangle(0, 205, 320, 32, 0x0a101d, 0.96)
      .setStrokeStyle(1.5, 0x00d2ff);

    this.speakerBadgeText = this.add
      .text(0, 205, "", {
        fontFamily: "Arial, sans-serif",
        fontSize: "14px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    this.speakerContainer.add([
      this.speakerCardBg,
      this.speakerSprite,
      this.speakerInnerBorder,
      this.speakerBadgeBg,
      this.speakerBadgeText,
    ]);
  }

  /**
   * Updates the speaker character portrait on the screen with entrance animation.
   * @param {string|null} speakerName
   */
  updateSpeakerVisuals(speakerName) {
    if (!speakerName) {
      this.speakerContainer.setVisible(false);
      return;
    }

    const clean = speakerName.toLowerCase();
    let texture = null;
    let color = 0x00d2ff;
    let displayName = speakerName;

    if (clean.includes("etchebest")) {
      texture = "char_etchebest";
      color = 0x00d2ff;
      displayName = "Chef Philippe Etchebest";
    } else if (clean.includes("lignac")) {
      texture = "char_lignac";
      color = 0xffaa00;
      displayName = "Chef Cyril Lignac";
    } else if (clean.includes("ramsay")) {
      texture = "char_ramsay";
      color = 0xff3344;
      displayName = "Chef Gordon Ramsay";
    } else if (clean.includes("bocuse")) {
      texture = "char_bocuse";
      color = 0x38bdf8;
      displayName = "Directeur Paul Bocuse";
    }

    if (!texture || !this.textures.exists(texture)) {
      this.speakerContainer.setVisible(false);
      return;
    }

    this.speakerSprite.setTexture(texture);
    this.speakerCardBg.setStrokeStyle(3, color);
    this.speakerInnerBorder.setStrokeStyle(1.5, color, 0.6);
    this.speakerBadgeBg.setStrokeStyle(1.5, color);
    this.speakerBadgeText.setText(displayName);
    this.speakerContainer.setVisible(true);

    // Smooth pop entrance tween
    this.speakerContainer.setScale(0.96);
    this.speakerContainer.setAlpha(0.7);
    this.tweens.add({
      targets: this.speakerContainer,
      scale: 1,
      alpha: 1,
      duration: 220,
      ease: "Cubic.out",
    });
  }

  /**
   * Creates HUD controls including active objective reminder, return button, and inventory shortcut.
   */
  createHUD() {
    // Center active quest objective banner
    const currentObjective = gameState.getCurrentObjective();
    const objBg = this.add
      .rectangle(960, 36, 680, 34, 0x0a101d, 0.92)
      .setStrokeStyle(1, 0xffdd00, 0.85);
    objBg.setDepth(30);

    const objText = this.add
      .text(960, 36, `🎯 OBJECTIF : ${currentObjective.instruction}`, {
        fontFamily: "Arial, sans-serif",
        fontSize: "12px",
        fontStyle: "bold",
        color: "#ffdd00",
      })
      .setOrigin(0.5);
    objText.setDepth(30);

    // Return button (either to room terminal or to main desktop)
    const returnTarget = this.roomReturnId
      ? { scene: "GenericMapScene", data: { mapId: this.roomReturnId }, label: "🚪 Quitter" }
      : { scene: "MainMenu", data: undefined, label: "🖥️ Bureau" };

    const desktopBtn = this.add
      .rectangle(1720, 36, 120, 34, 0x1e222d, 0.92)
      .setStrokeStyle(1, 0x00d2ff)
      .setInteractive({ useHandCursor: true });
    desktopBtn.setDepth(30);

    const desktopText = this.add
      .text(1720, 36, returnTarget.label, {
        fontFamily: "Arial, sans-serif",
        fontSize: "13px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);
    desktopText.setDepth(30);

    desktopBtn.on("pointerover", () => desktopBtn.setFillStyle(0x0055aa, 1));
    desktopBtn.on("pointerout", () => desktopBtn.setFillStyle(0x1e222d, 0.92));
    desktopBtn.on("pointerdown", () => this.scene.start(returnTarget.scene, returnTarget.data));

    // Inventory button
    const invBtn = this.add
      .rectangle(1850, 36, 110, 34, 0x14422b, 0.92)
      .setStrokeStyle(1, 0x00ff88)
      .setInteractive({ useHandCursor: true });
    invBtn.setDepth(30);

    const invText = this.add
      .text(1850, 36, "🎒 Sacoche [I]", {
        fontFamily: "Arial, sans-serif",
        fontSize: "12px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);
    invText.setDepth(30);

    invBtn.on("pointerover", () => invBtn.setFillStyle(0x1d7c34, 1));
    invBtn.on("pointerout", () => invBtn.setFillStyle(0x14422b, 0.92));
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
