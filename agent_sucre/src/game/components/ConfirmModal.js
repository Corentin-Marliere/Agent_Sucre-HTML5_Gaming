import { GameObjects } from "phaser";

/**
 * Boîte de dialogue modale générique de confirmation rétro OS.
 */
export class ConfirmModal extends GameObjects.Container {
  /**
   * @param {Phaser.Scene} scene
   * @param {Object} options
   * @param {string} options.title
   * @param {string} options.message
   * @param {string} [options.confirmText="Confirmer"]
   * @param {string} [options.cancelText="Annuler"]
   * @param {Function} options.onConfirm
   * @param {Function} [options.onCancel]
   */
  constructor(scene, options = {}) {
    super(scene, 0, 0);

    this.title = options.title || "⚠️ CONFIRMATION";
    this.message = options.message || "Êtes-vous sûr de vouloir continuer ?";
    this.confirmText = options.confirmText || "Confirmer";
    this.cancelText = options.cancelText || "Annuler";
    this.onConfirm = options.onConfirm || (() => {});
    this.onCancel = options.onCancel || (() => {});

    this.initUI();
    scene.add.existing(this);
    this.setDepth(1200);
  }

  initUI() {
    const screenWidth = this.scene.scale.width;
    const screenHeight = this.scene.scale.height;

    // Backdrop
    const backdrop = this.scene.add
      .rectangle(screenWidth / 2, screenHeight / 2, screenWidth, screenHeight, 0x000000, 0.75)
      .setInteractive();
    this.add(backdrop);

    const winWidth = 520;
    const winHeight = 240;
    const winX = screenWidth / 2;
    const winY = screenHeight / 2;

    const bg = this.scene.add
      .rectangle(winX, winY, winWidth, winHeight, 0x1e222d, 0.98)
      .setStrokeStyle(3, 0xd97706);
    this.add(bg);

    // Title bar
    const titleBar = this.scene.add
      .rectangle(winX, winY - winHeight / 2 + 20, winWidth, 40, 0x78350f);
    this.add(titleBar);

    const titleText = this.scene.add
      .text(winX, winY - winHeight / 2 + 20, this.title, {
        fontFamily: "Arial, sans-serif",
        fontSize: "16px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);
    this.add(titleText);

    // Message
    const msgText = this.scene.add
      .text(winX, winY - 10, this.message, {
        fontFamily: "Arial, sans-serif",
        fontSize: "15px",
        color: "#e2e8f0",
        align: "center",
        wordWrap: { width: 460 },
      })
      .setOrigin(0.5);
    this.add(msgText);

    // Bouton Confirmer
    const confirmBtn = this.scene.add
      .rectangle(winX - 110, winY + 65, 190, 38, 0xb91c1c)
      .setStrokeStyle(1, 0xffffff)
      .setInteractive({ useHandCursor: true });

    const confirmLabel = this.scene.add
      .text(winX - 110, winY + 65, this.confirmText, {
        fontFamily: "Arial, sans-serif",
        fontSize: "13px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    confirmBtn.on("pointerdown", () => {
      this.destroy();
      this.onConfirm();
    });

    // Bouton Annuler
    const cancelBtn = this.scene.add
      .rectangle(winX + 110, winY + 65, 190, 38, 0x334155)
      .setStrokeStyle(1, 0xffffff)
      .setInteractive({ useHandCursor: true });

    const cancelLabel = this.scene.add
      .text(winX + 110, winY + 65, this.cancelText, {
        fontFamily: "Arial, sans-serif",
        fontSize: "13px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    cancelBtn.on("pointerdown", () => {
      this.destroy();
      this.onCancel();
    });

    this.add([confirmBtn, confirmLabel, cancelBtn, cancelLabel]);
  }
}

