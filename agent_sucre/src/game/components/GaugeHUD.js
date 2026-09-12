import { GameObjects } from "phaser";
import { gameState } from "../state/GameState.js";

/**
 * Character identifier mapping helper.
 */
const CHARACTER_MAP = {
  etchebest: "Philippe Etchebest",
  ramsay: "Gordon Ramsay",
  lignac: "Cyril Lignac",
  bocuse: "Paul Bocuse",
  grolet: "Cédric Grolet",
};

/**
 * Visual Novel HUD displaying Infiltration and Character Affinity meters.
 */
export class GaugeHUD extends GameObjects.Container {
  /**
   * @param {Phaser.Scene} scene
   * @param {Object} [options={}]
   * @param {string} [options.speaker="etchebest"] - Initial character for the affinity gauge
   */
  constructor(scene, options = {}) {
    super(scene, 0, 0);

    this.activeCharacter = this.normalizeCharacterKey(options.speaker || "etchebest");

    this.initUI();

    scene.add.existing(this);
    this.setDepth(900);
  }

  /**
   * Normalizes character name or key to lowercase identifier.
   * @param {string} rawName
   * @returns {string}
   */
  normalizeCharacterKey(rawName) {
    if (!rawName) return "etchebest";
    const lower = rawName.toLowerCase();
    if (lower.includes("etchebest") || lower.includes("philippe")) return "etchebest";
    if (lower.includes("ramsay") || lower.includes("gordon")) return "ramsay";
    if (lower.includes("lignac") || lower.includes("cyril")) return "lignac";
    if (lower.includes("bocuse") || lower.includes("paul")) return "bocuse";
    if (lower.includes("grolet") || lower.includes("cédric") || lower.includes("cedric")) return "grolet";
    return lower;
  }

  initUI() {
    this.removeAll(true);

    // ==========================================
    // 1. INFILTRATION GAUGE (Top-Left)
    // ==========================================
    const infilX = 220;
    const infilY = 36;
    const infilWidth = 270;
    const infilHeight = 46;

    // Card background
    const infilCard = this.scene.add
      .rectangle(infilX, infilY, infilWidth, infilHeight, 0x101a28, 0.92)
      .setStrokeStyle(1.5, 0x00d2ff);
    this.add(infilCard);

    // Label
    const infilVal = gameState.getInfiltration();
    this.infilLabel = this.scene.add
      .text(infilX - infilWidth / 2 + 15, infilY - 10, "🕵️ INFILTRATION", {
        fontFamily: "Arial, sans-serif",
        fontSize: "12px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0, 0.5);

    this.infilValueText = this.scene.add
      .text(infilX + infilWidth / 2 - 15, infilY - 10, `${infilVal} %`, {
        fontFamily: "Courier, monospace",
        fontSize: "13px",
        fontStyle: "bold",
        color: this.getInfiltrationColor(infilVal),
      })
      .setOrigin(1, 0.5);
    this.add([this.infilLabel, this.infilValueText]);

    // Progress bar track
    this.infilTrackWidth = 240;
    this.infilTrackHeight = 10;
    const infilTrack = this.scene.add
      .rectangle(infilX, infilY + 11, this.infilTrackWidth, this.infilTrackHeight, 0x1f2937)
      .setOrigin(0.5);
    this.add(infilTrack);

    // Progress bar fill
    const initialFillWidth = (infilVal / 100) * this.infilTrackWidth;
    this.infilFill = this.scene.add
      .rectangle(
        infilX - this.infilTrackWidth / 2,
        infilY + 11,
        Math.max(2, initialFillWidth),
        this.infilTrackHeight,
        this.getInfiltrationColorHex(infilVal)
      )
      .setOrigin(0, 0.5);
    this.add(this.infilFill);

    // ==========================================
    // 2. CHARACTER AFFINITY / LOVE-O-METER (Top-Center)
    // ==========================================
    const affX = 570;
    const affY = 36;
    const affWidth = 350;
    const affHeight = 46;

    // Card background
    const affCard = this.scene.add
      .rectangle(affX, affY, affWidth, affHeight, 0x101a28, 0.92)
      .setStrokeStyle(1.5, 0xff6b9d);
    this.add(affCard);

    const affVal = gameState.getAffection(this.activeCharacter);
    const displayName = CHARACTER_MAP[this.activeCharacter] || this.activeCharacter;

    this.affLabel = this.scene.add
      .text(affX - affWidth / 2 + 15, affY - 10, `❤️ AFFINITÉ : ${displayName}`, {
        fontFamily: "Arial, sans-serif",
        fontSize: "12px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0, 0.5);

    this.affValueText = this.scene.add
      .text(affX + affWidth / 2 - 15, affY - 10, `${affVal} %`, {
        fontFamily: "Courier, monospace",
        fontSize: "13px",
        fontStyle: "bold",
        color: "#ff6b9d",
      })
      .setOrigin(1, 0.5);
    this.add([this.affLabel, this.affValueText]);

    // Progress bar track
    this.affTrackWidth = 320;
    this.affTrackHeight = 10;
    const affTrack = this.scene.add
      .rectangle(affX, affY + 11, this.affTrackWidth, this.affTrackHeight, 0x1f2937)
      .setOrigin(0.5);
    this.add(affTrack);

    // Progress bar fill
    const initialAffFill = (affVal / 100) * this.affTrackWidth;
    this.affFill = this.scene.add
      .rectangle(
        affX - this.affTrackWidth / 2,
        affY + 11,
        Math.max(2, initialAffFill),
        this.affTrackHeight,
        0xff6b9d
      )
      .setOrigin(0, 0.5);
    this.add(this.affFill);
  }

  /**
   * Sets the active character and updates the affinity display.
   * @param {string} speakerName
   */
  setSpeaker(speakerName) {
    if (!speakerName) return;
    const key = this.normalizeCharacterKey(speakerName);
    this.activeCharacter = key;
    this.refresh();
  }

  /**
   * Refreshes the display of both gauges with smooth animations.
   */
  refresh() {
    if (!this.scene) return;

    // Refresh Infiltration
    const infilVal = gameState.getInfiltration();
    if (this.infilValueText && this.infilValueText.scene) {
      this.infilValueText.setText(`${infilVal} %`);
      this.infilValueText.setColor(this.getInfiltrationColor(infilVal));
    }

    if (this.infilFill && this.infilFill.scene) {
      const targetWidth = Math.max(2, (infilVal / 100) * this.infilTrackWidth);
      this.scene.tweens.add({
        targets: this.infilFill,
        width: targetWidth,
        duration: 400,
        ease: "Cubic.easeOut",
      });
      this.infilFill.setFillStyle(this.getInfiltrationColorHex(infilVal));
    }

    // Refresh Affinity
    const affVal = gameState.getAffection(this.activeCharacter);
    const displayName = CHARACTER_MAP[this.activeCharacter] || this.activeCharacter;

    if (this.affLabel && this.affLabel.scene) {
      this.affLabel.setText(`❤️ AFFINITÉ : ${displayName}`);
    }

    if (this.affValueText && this.affValueText.scene) {
      this.affValueText.setText(`${affVal} %`);
    }

    if (this.affFill && this.affFill.scene) {
      const targetAffWidth = Math.max(2, (affVal / 100) * this.affTrackWidth);
      this.scene.tweens.add({
        targets: this.affFill,
        width: targetAffWidth,
        duration: 400,
        ease: "Cubic.easeOut",
      });
    }
  }

  /**
   * Spawns an animated floating feedback text when a gauge changes.
   * @param {string} text
   * @param {string} color
   * @param {number} x
   * @param {number} y
   */
  showFeedback(text, color = "#00ff88", x = 570, y = 65) {
    if (!this.scene) return;

    const feedback = this.scene.add
      .text(x, y, text, {
        fontFamily: "Arial, sans-serif",
        fontSize: "16px",
        fontStyle: "bold",
        color,
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(950);

    this.scene.tweens.add({
      targets: feedback,
      y: y - 40,
      alpha: 0,
      duration: 1400,
      ease: "Power2",
      onComplete: () => {
        feedback.destroy();
      },
    });
  }

  getInfiltrationColor(val) {
    if (val > 50) return "#00ff88";
    if (val >= 25) return "#ffaa00";
    return "#ff4444";
  }

  getInfiltrationColorHex(val) {
    if (val > 50) return 0x00ff88;
    if (val >= 25) return 0xffaa00;
    return 0xff3333;
  }
}

