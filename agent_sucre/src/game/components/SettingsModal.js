import { GameObjects } from "phaser";
import { SaveManager } from "../manager/SaveManager.js";
import { gameState } from "../state/GameState.js";

/**
 * Retro OS dialog box for settings management
 */
export class SettingsModal extends GameObjects.Container {
  /**
   * @param {Phaser.Scene} scene
   * @param {Object} options
   * @param {Function} [options.onClose]
   * @param {Function} [options.onRestart]
   */
  constructor(scene, options = {}) {
    super(scene, 0, 0);

    this.onClose = options.onClose || (() => { });
    this.onRestart = options.onRestart || (() => { });
    this.onClearSave = options.onClearSave || (() => { });

    // Active dialogue key (Space by default)
    this.dialogueKey = gameState.getFlag("dialogueKey") || "SPACE";
    // Movement layout preference (ZQSD by default, or WASD)
    this.movementLayout = gameState.getFlag("movementLayout") || "ZQSD";

    this.initUI();
    this.initKeyboard();

    scene.add.existing(this);
    this.setDepth(1100);
  }

  initUI() {
    this.removeAll(true);

    const screenWidth = this.scene.scale.width;
    const screenHeight = this.scene.scale.height;

    // Darkened backdrop
    this.backdrop = this.scene.add
      .rectangle(screenWidth / 2, screenHeight / 2, screenWidth, screenHeight, 0x000000, 0.7)
      .setInteractive();
    this.add(this.backdrop);

    // Window
    const winWidth = 700;
    const winHeight = 570;
    const winX = screenWidth / 2;
    const winY = screenHeight / 2;

    this.windowBg = this.scene.add
      .rectangle(winX, winY, winWidth, winHeight, 0x1e222d, 0.98)
      .setStrokeStyle(3, 0x4a76a8);
    this.add(this.windowBg);

    // Title bar
    const titleBarHeight = 44;
    const titleBarY = winY - winHeight / 2 + titleBarHeight / 2;
    this.titleBar = this.scene.add.rectangle(winX, titleBarY, winWidth, titleBarHeight, 0x103460);
    this.add(this.titleBar);

    this.titleText = this.scene.add
      .text(winX - winWidth / 2 + 20, titleBarY, "⚙️ PARAMÈTRES DU SYSTÈME - AGENT OS", {
        fontFamily: "Arial, sans-serif",
        fontSize: "17px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0, 0.5);
    this.add(this.titleText);

    // Close button [X]
    const closeBtn = this.scene.add
      .text(winX + winWidth / 2 - 25, titleBarY, "✖", {
        fontFamily: "Arial, sans-serif",
        fontSize: "18px",
        color: "#ff6b6b",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    closeBtn.on("pointerdown", () => this.close());
    this.add(closeBtn);

    // ==========================================
    // SECTION 1: AUDIO
    // ==========================================
    const audioTitle = this.scene.add
      .text(winX - 320, winY - 205, "🔊 PARAMÈTRES AUDIO", {
        fontFamily: "Arial, sans-serif",
        fontSize: "15px",
        fontStyle: "bold",
        color: "#00d2ff",
      })
      .setOrigin(0, 0.5);
    this.add(audioTitle);

    const currentVolume = this.scene.sound.volume ?? 1;
    this.volumeText = this.scene.add
      .text(winX - 320, winY - 165, `Volume général : ${Math.round(currentVolume * 100)} %`, {
        fontFamily: "Arial, sans-serif",
        fontSize: "14px",
        color: "#ffffff",
      })
      .setOrigin(0, 0.5);
    this.add(this.volumeText);

    // Volume buttons: 0%, 25%, 50%, 75%, 100%
    const volumeLevels = [0, 0.25, 0.5, 0.75, 1];
    volumeLevels.forEach((vol, idx) => {
      const btnX = winX - 90 + idx * 75;
      const btn = this.scene.add
        .rectangle(btnX, winY - 165, 65, 28, currentVolume === vol ? 0x00d2ff : 0x2e3846)
        .setStrokeStyle(1, 0xffffff)
        .setInteractive({ useHandCursor: true });

      const btnText = this.scene.add
        .text(btnX, winY - 165, `${Math.round(vol * 100)}%`, {
          fontFamily: "Arial, sans-serif",
          fontSize: "12px",
          color: currentVolume === vol ? "#000000" : "#ffffff",
          fontStyle: "bold",
        })
        .setOrigin(0.5);

      btn.on("pointerdown", () => {
        this.scene.sound.volume = vol;
        this.scene.sound.mute = vol === 0;
        this.initUI();
      });

      this.add([btn, btnText]);
    });

    // ==========================================
    // SECTION 2: KEY CONFIGURATION
    // ==========================================
    const controlsTitle = this.scene.add
      .text(winX - 320, winY - 110, "⌨️ CONFIGURATION DES COMMANDES & TOUCHES", {
        fontFamily: "Arial, sans-serif",
        fontSize: "15px",
        fontStyle: "bold",
        color: "#00d2ff",
      })
      .setOrigin(0, 0.5);
    this.add(controlsTitle);

    const layoutLabel = this.movementLayout === "ZQSD" ? "ZQSD (AZERTY)" : "WASD (QWERTY)";

    const controlsInfo = this.scene.add
      .text(
        winX - 320,
        winY - 32,
        `• Avancer dans les dialogues : [ ${this.dialogueKey} ] ou CLIC GAUCHE\n• Déplacement (Labyrinthe) : ${layoutLabel} ou FLÈCHES / SOURIS\n• Raccourci Carte (Guide Michelin) : TOUCHE [ M ]\n• Raccourci Inventaire : TOUCHE [ I ]`,
        {
          fontFamily: "Courier, monospace",
          fontSize: "12px",
          color: "#d0d7de",
          lineSpacing: 7,
        }
      )
      .setOrigin(0, 0.5);
    this.add(controlsInfo);

    // Dialogue key toggle button (Space vs Enter)
    const toggleKeyBtn = this.scene.add
      .rectangle(winX + 175, winY - 54, 250, 32, 0x2e3846)
      .setStrokeStyle(1, 0x00d2ff)
      .setInteractive({ useHandCursor: true });

    const toggleKeyText = this.scene.add
      .text(winX + 175, winY - 54, `Touche dialogue : [ ${this.dialogueKey} ]`, {
        fontFamily: "Arial, sans-serif",
        fontSize: "12px",
        color: "#00ffcc",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    toggleKeyBtn.on("pointerdown", () => {
      this.dialogueKey = this.dialogueKey === "SPACE" ? "ENTER" : "SPACE";
      gameState.setFlag("dialogueKey", this.dialogueKey);
      this.initUI();
    });

    // Movement layout toggle button (ZQSD vs WASD)
    const toggleLayoutBtn = this.scene.add
      .rectangle(winX + 175, winY - 12, 250, 32, 0x2e3846)
      .setStrokeStyle(1, 0x00ff88)
      .setInteractive({ useHandCursor: true });

    const toggleLayoutText = this.scene.add
      .text(winX + 175, winY - 12, `Clavier : ${layoutLabel}`, {
        fontFamily: "Arial, sans-serif",
        fontSize: "12px",
        color: "#00ff88",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    toggleLayoutBtn.on("pointerdown", () => {
      this.movementLayout = this.movementLayout === "ZQSD" ? "WASD" : "ZQSD";
      gameState.setFlag("movementLayout", this.movementLayout);
      this.initUI();
    });

    this.add([toggleKeyBtn, toggleKeyText, toggleLayoutBtn, toggleLayoutText]);

    // ==========================================
    // SECTION 3: SYSTEM & EPITECH REQUIREMENTS
    // ==========================================
    const sysTitle = this.scene.add
      .text(winX - 320, winY + 58, "🔄 GESTION DU JEU & SESSION (Critère Epitech)", {
        fontFamily: "Arial, sans-serif",
        fontSize: "15px",
        fontStyle: "bold",
        color: "#00d2ff",
      })
      .setOrigin(0, 0.5);
    this.add(sysTitle);

    // Restart game button
    this.createActionButton(
      winX - 155,
      winY + 120,
      "🔄 Redémarrer le jeu",
      0xd97706,
      () => {
        this.close();
        this.onRestart();
      },
      280
    );

    // Delete local save button
    this.createActionButton(
      winX + 155,
      winY + 120,
      "🗑️ Effacer la sauvegarde",
      0xb91c1c,
      () => {
        this.close();
        this.onClearSave();
      },
      280
    );

    // Close button
    this.createActionButton(
      winX,
      winY + 210,
      "Fermer les paramètres",
      0x104e8b,
      () => this.close(),
      300
    );
  }

  createActionButton(x, y, text, color, onClick, width = 240) {
    const btn = this.scene.add
      .rectangle(x, y, width, 40, color)
      .setStrokeStyle(1, 0xffffff)
      .setInteractive({ useHandCursor: true });

    const btnText = this.scene.add
      .text(x, y, text, {
        fontFamily: "Arial, sans-serif",
        fontSize: "14px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    btn.on("pointerover", () => btn.setAlpha(0.85));
    btn.on("pointerout", () => btn.setAlpha(1));
    btn.on("pointerdown", onClick);

    this.add([btn, btnText]);
  }

  initKeyboard() {
    this.onKeyDown = (event) => {
      if (event.key === "Escape") {
        this.close();
      }
    };
    this.scene.input.keyboard.on("keydown", this.onKeyDown);
  }

  close() {
    if (this.scene && this.scene.input && this.scene.input.keyboard && this.onKeyDown) {
      this.scene.input.keyboard.off("keydown", this.onKeyDown);
    }
    this.destroy();
    this.onClose();
  }
}

