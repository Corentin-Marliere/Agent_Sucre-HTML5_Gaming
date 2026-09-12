import { GameObjects } from "phaser";
import { SaveManager } from "../manager/SaveManager.js";

/**
 * Interactive dialog box styled like an OS/Windows window.
 * for profile creation (agent name + PIN) and authentication/loading.
 */
export class ProfileModal extends GameObjects.Container {
  /**
   * @param {Phaser.Scene} scene
   * @param {Object} options
   * @param {"CREATE"|"LOAD"} [options.mode="CREATE"]
   * @param {Function} [options.onSuccess] - Callback called when creation or loading succeeds
   * @param {Function} [options.onNewGameRequest] - Callback invoked if the user selects "New Game" in LOAD mode.
   */
  constructor(scene, options = {}) {
    super(scene, 0, 0);

    this.mode = options.mode || "CREATE";
    this.onSuccess = options.onSuccess || (() => { });
    this.onNewGameRequest = options.onNewGameRequest || (() => { });

    this.agentName = "Agent Sucre";
    this.pinCode = "";
    this.activeField = this.mode === "CREATE" ? "agentName" : "pinCode";

    this.initUI();
    this.initKeyboardListener();

    scene.add.existing(this);
    this.setDepth(1000);
  }

  initUI() {
    this.removeAll(true);

    const screenWidth = this.scene.scale.width;
    const screenHeight = this.scene.scale.height;

    // Semi-transparent darkened background
    this.backdrop = this.scene.add
      .rectangle(screenWidth / 2, screenHeight / 2, screenWidth, screenHeight, 0x000000, 0.7)
      .setInteractive();
    this.add(this.backdrop);

    // Centered main window
    const winWidth = 640;
    const winHeight = this.mode === "CREATE" ? 440 : 400;
    const winX = screenWidth / 2;
    const winY = screenHeight / 2;

    this.windowBg = this.scene.add
      .rectangle(winX, winY, winWidth, winHeight, 0x1e222d, 0.96)
      .setStrokeStyle(3, 0x4a76a8);
    this.add(this.windowBg);

    // Title bar
    const titleBarHeight = 44;
    const titleBarY = winY - winHeight / 2 + titleBarHeight / 2;
    this.titleBar = this.scene.add.rectangle(winX, titleBarY, winWidth, titleBarHeight, 0x103460);
    this.add(this.titleBar);

    const titleTextString =
      this.mode === "CREATE"
        ? "🛡️ CRÉATION DE PROFIL AGENT"
        : "🔐 AUTHENTIFICATION DE L'AGENT";

    this.titleText = this.scene.add
      .text(winX - winWidth / 2 + 20, titleBarY, titleTextString, {
        fontFamily: "Arial, sans-serif",
        fontSize: "18px",
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

    // Error message
    this.errorText = this.scene.add
      .text(winX, winY + (this.mode === "CREATE" ? 115 : 85), "", {
        fontFamily: "Arial, sans-serif",
        fontSize: "15px",
        color: "#ff5252",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.add(this.errorText);

    if (this.mode === "CREATE") {
      this.renderCreateMode(winX, winY);
    } else {
      this.renderLoadMode(winX, winY);
    }
  }

  renderCreateMode(winX, winY) {
    const subtitle = this.scene.add
      .text(winX, winY - 145, "Configurez vos identifiants pour initialiser votre dossier d'agent :", {
        fontFamily: "Arial, sans-serif",
        fontSize: "15px",
        color: "#d0d7de",
      })
      .setOrigin(0.5);
    this.add(subtitle);

    // Field 1: Agent's name
    const labelName = this.scene.add
      .text(winX - 240, winY - 95, "Nom de code de l'agent :", {
        fontFamily: "Arial, sans-serif",
        fontSize: "15px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0, 0.5);
    this.add(labelName);

    this.nameInputBox = this.scene.add
      .rectangle(winX, winY - 55, 480, 42, 0x0f141c)
      .setStrokeStyle(2, this.activeField === "agentName" ? 0x00d2ff : 0x555e6d)
      .setInteractive({ useHandCursor: true });
    this.nameInputBox.on("pointerdown", () => this.setActiveField("agentName"));
    this.add(this.nameInputBox);

    this.nameDisplayText = this.scene.add
      .text(winX - 225, winY - 55, this.agentName, {
        fontFamily: "Courier, monospace",
        fontSize: "18px",
        color: "#00ffcc",
      })
      .setOrigin(0, 0.5);
    this.add(this.nameDisplayText);

    // Field 2: PIN code
    const labelPin = this.scene.add
      .text(winX - 240, winY + 5, "Code PIN de sécurité (4 chiffres) :", {
        fontFamily: "Arial, sans-serif",
        fontSize: "15px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0, 0.5);
    this.add(labelPin);

    this.pinInputBox = this.scene.add
      .rectangle(winX, winY + 45, 480, 42, 0x0f141c)
      .setStrokeStyle(2, this.activeField === "pinCode" ? 0x00d2ff : 0x555e6d)
      .setInteractive({ useHandCursor: true });
    this.pinInputBox.on("pointerdown", () => this.setActiveField("pinCode"));
    this.add(this.pinInputBox);

    this.pinDisplayText = this.scene.add
      .text(winX - 225, winY + 45, this.getMaskedPin(), {
        fontFamily: "Courier, monospace",
        fontSize: "22px",
        color: "#ffdd00",
        letterSpacing: 6,
      })
      .setOrigin(0, 0.5);
    this.add(this.pinDisplayText);

    // Submit button
    this.createButton(winX, winY + 165, "Créer le profil et commencer", 0x1f7a3a, () => {
      this.handleCreateSubmit();
    });
  }

  renderLoadMode(winX, winY) {
    const summary = SaveManager.getSummary();
    const agentName = summary?.agentName || "Agent inconnu";
    const chapter = summary?.chapter || 1;

    const infoCard = this.scene.add
      .rectangle(winX, winY - 100, 480, 60, 0x141b26)
      .setStrokeStyle(1, 0x3b4a60);
    this.add(infoCard);

    const infoText = this.scene.add
      .text(
        winX,
        winY - 100,
        `Dossier trouvé : ${agentName}\nProgression : Chapitre ${chapter}`,
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "16px",
          color: "#00d2ff",
          align: "center",
        }
      )
      .setOrigin(0.5);
    this.add(infoText);

    // PIN Code Field
    const labelPin = this.scene.add
      .text(winX - 240, winY - 30, "Entrez votre code PIN (4 chiffres) :", {
        fontFamily: "Arial, sans-serif",
        fontSize: "15px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0, 0.5);
    this.add(labelPin);

    this.pinInputBox = this.scene.add
      .rectangle(winX, winY + 15, 480, 44, 0x0f141c)
      .setStrokeStyle(2, 0x00d2ff)
      .setInteractive({ useHandCursor: true });
    this.add(this.pinInputBox);

    this.pinDisplayText = this.scene.add
      .text(winX - 225, winY + 15, this.getMaskedPin(), {
        fontFamily: "Courier, monospace",
        fontSize: "24px",
        color: "#ffdd00",
        letterSpacing: 8,
      })
      .setOrigin(0, 0.5);
    this.add(this.pinDisplayText);

    // Buttons: Unlock and New Game
    this.createButton(winX - 120, winY + 140, "Déverrouiller", 0x1f7a3a, () => {
      this.handleLoadSubmit();
    }, 220);

    this.createButton(winX + 120, winY + 140, "Nouveau profil", 0x7a2222, () => {
      this.promptNewGame();
    }, 220);
  }

  createButton(x, y, text, color, onClick, width = 360) {
    const btn = this.scene.add
      .rectangle(x, y, width, 44, color, 1)
      .setStrokeStyle(2, 0xffffff)
      .setInteractive({ useHandCursor: true });

    const btnText = this.scene.add
      .text(x, y, text, {
        fontFamily: "Arial, sans-serif",
        fontSize: "16px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    btn.on("pointerover", () => btn.setAlpha(0.85));
    btn.on("pointerout", () => btn.setAlpha(1));
    btn.on("pointerdown", onClick);

    this.add([btn, btnText]);
    return btn;
  }

  setActiveField(field) {
    this.activeField = field;
    if (this.nameInputBox && this.nameInputBox.scene) {
      this.nameInputBox.setStrokeStyle(2, field === "agentName" ? 0x00d2ff : 0x555e6d);
    }
    if (this.pinInputBox && this.pinInputBox.scene) {
      this.pinInputBox.setStrokeStyle(2, field === "pinCode" ? 0x00d2ff : 0x555e6d);
    }
  }

  getMaskedPin() {
    if (!this.pinCode) return "_ _ _ _";
    const masked = "• ".repeat(this.pinCode.length).trim();
    const remaining = 4 - this.pinCode.length;
    return remaining > 0 ? `${masked} ${"_ ".repeat(remaining).trim()}` : masked;
  }

  updateDisplay() {
    if (this.nameDisplayText && this.nameDisplayText.scene) {
      this.nameDisplayText.setText(this.agentName || " ");
    }
    if (this.pinDisplayText && this.pinDisplayText.scene) {
      this.pinDisplayText.setText(this.getMaskedPin());
    }
  }

  initKeyboardListener() {
    this.onKeyDown = (event) => {
      if (!this.scene || !this.visible) return;

      const key = event.key;

      if (key === "Tab") {
        event.preventDefault();
        if (this.mode === "CREATE") {
          this.setActiveField(this.activeField === "agentName" ? "pinCode" : "agentName");
        }
        return;
      }

      if (key === "Enter") {
        if (this.mode === "CREATE") {
          if (this.activeField === "agentName" && this.pinCode.length < 4) {
            this.setActiveField("pinCode");
          } else {
            this.handleCreateSubmit();
          }
        } else {
          this.handleLoadSubmit();
        }
        return;
      }

      if (key === "Backspace") {
        if (this.activeField === "agentName") {
          this.agentName = this.agentName.slice(0, -1);
        } else if (this.activeField === "pinCode") {
          this.pinCode = this.pinCode.slice(0, -1);
        }
        if (this.errorText && this.errorText.scene) {
          this.errorText.setText("");
        }
        this.updateDisplay();
        return;
      }

      // Enter PIN code
      if (this.activeField === "pinCode") {
        if (/^\d$/.test(key) && this.pinCode.length < 4) {
          this.pinCode += key;
          if (this.errorText && this.errorText.scene) {
            this.errorText.setText("");
          }
          this.updateDisplay();
        }
        return;
      }

      // Enter agent name
      if (this.activeField === "agentName") {
        if (key.length === 1 && this.agentName.length < 20) {
          this.agentName += key;
          if (this.errorText && this.errorText.scene) {
            this.errorText.setText("");
          }
          this.updateDisplay();
        }
      }
    };

    this.scene.input.keyboard.on("keydown", this.onKeyDown);
  }

  handleCreateSubmit() {
    const result = SaveManager.createProfile(this.agentName, this.pinCode);
    if (!result.success) {
      if (this.errorText && this.errorText.scene) {
        this.errorText.setText(result.error);
      }
      return;
    }

    const createdName = this.agentName;
    this.close();
    this.onSuccess({ mode: "CREATE", agentName: createdName });
  }

  handleLoadSubmit() {
    const result = SaveManager.load(this.pinCode);
    if (!result.success) {
      if (this.errorText && this.errorText.scene) {
        this.errorText.setText(result.error);
      }
      this.pinCode = "";
      this.updateDisplay();
      return;
    }

    this.close();
    this.onSuccess({ mode: "LOAD", state: result.state });
  }

  promptNewGame() {
    // If the user clicks "New profile," switch to creation mode.
    this.mode = "CREATE";
    this.agentName = "Agent Sucre";
    this.pinCode = "";
    this.activeField = "agentName";
    this.initUI();
  }

  close() {
    if (this.scene && this.scene.input && this.scene.input.keyboard && this.onKeyDown) {
      this.scene.input.keyboard.off("keydown", this.onKeyDown);
    }
    this.destroy();
  }
}

