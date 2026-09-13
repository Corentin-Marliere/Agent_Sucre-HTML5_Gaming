import { GameObjects } from "phaser";
import { gameState } from "../state/GameState.js";

/**
 * Agent tactical wardrobe / dressing modal
 */
export class WardrobeModal extends GameObjects.Container {
  /**
   * @param {Phaser.Scene} scene
   * @param {Object} options
   * @param {Function} [options.onClose]
   */
  constructor(scene, options = {}) {
    super(scene, 0, 0);

    this.onClose = options.onClose || (() => { });
    this.equippedOutfit = gameState.getFlag("equippedOutfit") || "apprenti_lyfe";

    this.outfits = [
      {
        id: "apprenti_lyfe",
        name: "Tablier d'Apprenti Lyfe",
        desc: "Couverture standard d'élève cuisinier sous Paul Bocuse.",
        bonus: "Discrétion basique",
        unlocked: true,
      },
      {
        id: "tablier_pare_balles",
        name: "Tablier Pare-Balles du Chef",
        desc: "Donné par Gordon Ramsay lors de l'épreuve physique.",
        bonus: "+20 % Résistance physique",
        unlocked: gameState.hasItem("tablier_pare_balles") || gameState.hasFlag("tablier_unlocked"),
      },
      {
        id: "tenue_infiltration",
        name: "Smoking Tactique Haute Couture",
        desc: "Conçu sur mesure par le Directeur Bocuse pour infiltrer les cuisines.",
        bonus: "+25 % Vitesse d'infiltration",
        unlocked: gameState.hasFlag("smoking_unlocked"),
      },
    ];

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
    const winWidth = 660;
    const winHeight = 460;
    const winX = screenWidth / 2;
    const winY = screenHeight / 2;

    this.windowBg = this.scene.add
      .rectangle(winX, winY, winWidth, winHeight, 0x1e222d, 0.98)
      .setStrokeStyle(3, 0x9b59b6);
    this.add(this.windowBg);

    // Title bar
    const titleBarHeight = 44;
    const titleBarY = winY - winHeight / 2 + titleBarHeight / 2;
    this.titleBar = this.scene.add.rectangle(winX, titleBarY, winWidth, titleBarHeight, 0x4a235a);
    this.add(this.titleBar);

    this.titleText = this.scene.add
      .text(winX - winWidth / 2 + 20, titleBarY, "👗 VESTIAIRE TACTIQUE - DRESSING DE L'AGENT", {
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

    const profileName = gameState.getProfile().agentName || "Agent Sucre";
    const header = this.scene.add
      .text(winX, winY - 160, `Agent : ${profileName} • Tenues d'infiltration disponibles :`, {
        fontFamily: "Arial, sans-serif",
        fontSize: "15px",
        color: "#d0d7de",
      })
      .setOrigin(0.5);
    this.add(header);

    // Outfit list
    this.outfits.forEach((outfit, idx) => {
      const cardY = winY - 90 + idx * 85;
      const isEquipped = this.equippedOutfit === outfit.id;

      const card = this.scene.add
        .rectangle(winX, cardY, 580, 72, isEquipped ? 0x271f38 : 0x141b26)
        .setStrokeStyle(1, isEquipped ? 0x9b59b6 : 0x3b4a60);
      this.add(card);

      const outfitTitle = this.scene.add
        .text(winX - 270, cardY - 16, outfit.name, {
          fontFamily: "Arial, sans-serif",
          fontSize: "15px",
          fontStyle: "bold",
          color: outfit.unlocked ? "#ffffff" : "#777777",
        })
        .setOrigin(0, 0.5);
      this.add(outfitTitle);

      const outfitDesc = this.scene.add
        .text(winX - 270, cardY + 12, `${outfit.desc} (${outfit.bonus})`, {
          fontFamily: "Arial, sans-serif",
          fontSize: "12px",
          color: outfit.unlocked ? "#a3b8cc" : "#555555",
        })
        .setOrigin(0, 0.5);
      this.add(outfitDesc);

      if (isEquipped) {
        const badge = this.scene.add
          .text(winX + 220, cardY, "ÉQUIPÉ ✓", {
            fontFamily: "Arial, sans-serif",
            fontSize: "13px",
            fontStyle: "bold",
            color: "#00ff88",
          })
          .setOrigin(0.5);
        this.add(badge);
      } else if (outfit.unlocked) {
        const equipBtn = this.scene.add
          .rectangle(winX + 215, cardY, 95, 32, 0x6c3483)
          .setStrokeStyle(1, 0xffffff)
          .setInteractive({ useHandCursor: true });

        const equipText = this.scene.add
          .text(winX + 215, cardY, "Équiper", {
            fontFamily: "Arial, sans-serif",
            fontSize: "13px",
            color: "#ffffff",
          })
          .setOrigin(0.5);

        equipBtn.on("pointerdown", () => {
          this.equippedOutfit = outfit.id;
          gameState.setFlag("equippedOutfit", outfit.id);
          this.initUI();

          if (
            outfit.id === "tablier_pare_balles" &&
            gameState.getFlag("chap1_scene4_dialog_completed") &&
            !gameState.getFlag("chap1_completed")
          ) {
            gameState.setFlag("chap1_scene4_completed", true);
            gameState.setFlag("chap1_completed", true);
            gameState.completeChapter(1);
            gameState.setChapter(2);
            this.close();
            this.scene.scene.start("Game", { dialogId: "bocuse_chap1_conclusion" });
          }
        });

        this.add([equipBtn, equipText]);
      } else {
        const lockedText = this.scene.add
          .text(winX + 215, cardY, "🔒 Verrouillé", {
            fontFamily: "Arial, sans-serif",
            fontSize: "12px",
            color: "#888888",
          })
          .setOrigin(0.5);
        this.add(lockedText);
      }
    });

    // Close button
    const closeBottomBtn = this.scene.add
      .rectangle(winX, winY + 180, 240, 38, 0x4a235a)
      .setStrokeStyle(1, 0xffffff)
      .setInteractive({ useHandCursor: true });

    const closeBottomText = this.scene.add
      .text(winX, winY + 180, "Retour au bureau", {
        fontFamily: "Arial, sans-serif",
        fontSize: "14px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    closeBottomBtn.on("pointerdown", () => this.close());
    this.add([closeBottomBtn, closeBottomText]);
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

