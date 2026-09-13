import { GameObjects } from "phaser";
import { gameState } from "../state/GameState.js";
import { SaveManager } from "../manager/SaveManager.js";
import { SettingsModal } from "./SettingsModal.js";
import { InventoryModal } from "./InventoryModal.js";
import { ProfileModal } from "./ProfileModal.js";
import { WardrobeModal } from "./WardrobeModal.js";
import { ConfirmModal } from "./ConfirmModal.js";

/**
 * Reusable Agent OS Taskbar component for retro PC terminal screens.
 */
export class Taskbar extends GameObjects.Container {
  /**
   * @param {Phaser.Scene} scene - The scene this taskbar belongs to.
   * @param {Object} [config] - Taskbar configuration options.
   * @param {string} [config.locationName] - Current location display name.
   */
  constructor(scene, config = {}) {
    super(scene, 0, 0);

    this.scene = scene;
    this.locationName = config.locationName || "Bureau Principal";
    this.startMenuOpen = false;
    this.startMenuContainer = null;
    this.toastContainer = null;
    this.toastTimer = null;
    this.currentModal = null;

    this.setDepth(1000);
    this.buildTaskbar();
    this.createToastElement();

    scene.add.existing(this);
  }

  /**
   * Builds the taskbar background, start button, agent status, and quick action buttons.
   */
  buildTaskbar() {
    // Solid taskbar integrated seamlessly into the bottom of the CRT screen
    const barWidth = 1122;
    const barHeight = 50;
    const barX = 960;
    const barY = 850;

    const bg = this.scene.add.rectangle(barX, barY, barWidth, barHeight, 0x000000, 1);
    this.add(bg);

    // Windows Cake / Start button
    const cakeBtn = this.scene.add
      .image(barX - barWidth / 2 + 40, barY, "windows_cake")
      .setScale(0.08)
      .setInteractive({ useHandCursor: true });

    cakeBtn.on("pointerover", () => cakeBtn.setScale(0.086));
    cakeBtn.on("pointerout", () => cakeBtn.setScale(0.08));
    cakeBtn.on("pointerdown", () => this.toggleStartMenu());
    this.add(cakeBtn);

    // Dynamic Agent status text
    this.statusText = this.scene.add
      .text(barX - barWidth / 2 + 75, barY, this.getAgentStatusString(), {
        fontFamily: "Courier, monospace",
        fontSize: "13px",
        fontStyle: "bold",
        color: "#00ffcc",
      })
      .setOrigin(0, 0.5);
    this.add(this.statusText);

    // Settings button
    const settingsBtn = this.scene.add
      .rectangle(barX + barWidth / 2 - 195, barY, 110, 32, 0x1e3a5f)
      .setStrokeStyle(1, 0xffffff)
      .setInteractive({ useHandCursor: true });

    const settingsLabel = this.scene.add
      .text(barX + barWidth / 2 - 195, barY, "⚙️ Options", {
        fontFamily: "Arial, sans-serif",
        fontSize: "13px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    settingsBtn.on("pointerover", () => settingsBtn.setAlpha(0.85));
    settingsBtn.on("pointerout", () => settingsBtn.setAlpha(1));
    settingsBtn.on("pointerdown", () => this.handleSettings());
    this.add([settingsBtn, settingsLabel]);

    // Save button
    const saveBtn = this.scene.add
      .rectangle(barX + barWidth / 2 - 75, barY, 120, 32, 0x1f7a3a)
      .setStrokeStyle(1, 0xffffff)
      .setInteractive({ useHandCursor: true });

    const saveLabel = this.scene.add
      .text(barX + barWidth / 2 - 75, barY, "💾 Sauvegarder", {
        fontFamily: "Arial, sans-serif",
        fontSize: "13px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    saveBtn.on("pointerover", () => saveBtn.setAlpha(0.85));
    saveBtn.on("pointerout", () => saveBtn.setAlpha(1));
    saveBtn.on("pointerdown", () => this.handleSave());
    this.add([saveBtn, saveLabel]);
  }

  /**
   * Generates the agent status string.
   * @returns {string}
   */
  getAgentStatusString() {
    const profile = gameState.getProfile();
    const name = profile?.agentName || gameState.flags?.pseudo || "Non identifié";
    const chapter = gameState.getState().progression?.currentChapter || 1;
    return `Agent : ${name} | Ch. ${chapter} | Lieu : ${this.locationName}`;
  }

  /**
   * Refreshes the agent status display text.
   */
  refreshStatus() {
    if (this.statusText) {
      this.statusText.setText(this.getAgentStatusString());
    }
  }

  /**
   * Toggles the Start Menu popup.
   */
  toggleStartMenu() {
    if (this.startMenuOpen) {
      this.closeStartMenu();
    } else {
      this.openStartMenu();
    }
  }

  /**
   * Opens the retro OS Start Menu popup.
   */
  openStartMenu() {
    this.closeStartMenu();
    this.startMenuOpen = true;

    const startX = 570;
    const startY = 650;

    this.startMenuContainer = this.scene.add.container(startX, startY);
    this.startMenuContainer.setDepth(1100);

    const menuBg = this.scene.add
      .rectangle(0, 0, 270, 320, 0x0d1527, 0.98)
      .setStrokeStyle(2, 0x00d2ff);
    this.startMenuContainer.add(menuBg);

    const header = this.scene.add
      .text(-120, -140, "AGENT OS - DÉMARRER", {
        fontFamily: "Courier, monospace",
        fontSize: "12px",
        fontStyle: "bold",
        color: "#00ffcc",
      })
      .setOrigin(0, 0.5);
    this.startMenuContainer.add(header);

    const items = [
      {
        text: "🖥️ Bureau Principal",
        action: () => {
          this.closeStartMenu();
          this.scene.scene.start("MainMenu");
        },
      },
      {
        text: "🗺️ Carte de l'Institut [M]",
        action: () => {
          this.closeStartMenu();
          this.scene.scene.start("GenericMapScene", { mapId: "secretInstitute" });
        },
      },
      {
        text: "🎒 Sacoche & Inventaire [I]",
        action: () => {
          this.closeStartMenu();
          this.handleInventory();
        },
      },
      {
        text: "👗 Vestiaire Tactique",
        action: () => {
          this.closeStartMenu();
          this.handleWardrobe();
        },
      },
      {
        text: "⚙️ Paramètres & Touches",
        action: () => {
          this.closeStartMenu();
          this.handleSettings();
        },
      },
      {
        text: "🔄 Redémarrer la mission",
        action: () => {
          this.closeStartMenu();
          this.handleRestartGame();
        },
      },
    ];

    items.forEach((item, idx) => {
      const yPos = -105 + idx * 42;
      const btn = this.scene.add
        .rectangle(0, yPos, 250, 34, 0x16243d, 0.9)
        .setStrokeStyle(1, 0x335588)
        .setInteractive({ useHandCursor: true });

      const label = this.scene.add
        .text(-110, yPos, item.text, {
          fontFamily: "Arial, sans-serif",
          fontSize: "13px",
          color: "#ffffff",
        })
        .setOrigin(0, 0.5);

      btn.on("pointerover", () => {
        btn.setFillStyle(0x0055aa, 1);
        btn.setStrokeStyle(1, 0x00d2ff);
        label.setColor("#00ffcc");
      });

      btn.on("pointerout", () => {
        btn.setFillStyle(0x16243d, 0.9);
        btn.setStrokeStyle(1, 0x335588);
        label.setColor("#ffffff");
      });

      btn.on("pointerdown", item.action);

      this.startMenuContainer.add([btn, label]);
    });
  }

  /**
   * Closes the Start Menu popup.
   */
  closeStartMenu() {
    if (this.startMenuContainer) {
      this.startMenuContainer.destroy();
      this.startMenuContainer = null;
    }
    this.startMenuOpen = false;
  }

  /**
   * Handles saving game state.
   */
  handleSave() {
    const res = SaveManager.save();
    if (res.success) {
      this.showToast("✓ Progression sauvegardée avec succès !");
      this.refreshStatus();
    } else {
      this.showToast("✗ Erreur de sauvegarde");
    }
  }

  /**
   * Handles opening Settings modal.
   */
  handleSettings() {
    this.closeStartMenu();
    new SettingsModal(this.scene, {
      onRestart: () => this.handleRestartGame(),
      onClearSave: () => this.handleClearSave(),
    });
  }

  /**
   * Handles toggling the Point & Click Inventory modal.
   */
  handleInventory() {
    this.closeStartMenu();

    if (this.currentModal) {
      const isSame = this.currentModal instanceof InventoryModal;
      this.currentModal.close();
      this.currentModal = null;
      if (isSame) return;
    }

    this.currentModal = new InventoryModal(this.scene, {
      onClose: () => {
        this.currentModal = null;
      },
    });

    this.currentModal.on("destroy", () => {
      this.currentModal = null;
    });
  }

  /**
   * Handles opening Wardrobe modal.
   */
  handleWardrobe() {
    this.closeStartMenu();
    new WardrobeModal(this.scene);
  }

  /**
   * Restarts the current session.
   */
  handleRestartGame() {
    this.showToast("🔄 Redémarrage du système...");
    gameState.reset();
    if (this.currentModal && this.currentModal.scene) {
      this.currentModal.close();
    }
    this.currentModal = null;

    this.scene.time.delayedCall(400, () => {
      this.scene.scene.start("MainMenu");
    });
  }

  /**
   * Wipes save data and restarts.
   */
  handleClearSave() {
    SaveManager.deleteSave();
    gameState.reset();
    this.showToast("🗑️ Sauvegarde effacée !");

    if (this.currentModal && this.currentModal.scene) {
      this.currentModal.close();
    }
    this.currentModal = null;

    this.scene.time.delayedCall(400, () => {
      this.scene.scene.start("MainMenu");
    });
  }

  /**
   * Creates the toast notification container.
   */
  createToastElement() {
    this.toastContainer = this.scene.add.container(960, 780);
    this.toastContainer.setDepth(1200);
    this.toastContainer.setAlpha(0);

    const bg = this.scene.add
      .rectangle(0, 0, 480, 42, 0x0d1527, 0.95)
      .setStrokeStyle(1, 0x00ffcc);

    this.toastText = this.scene.add
      .text(0, 0, "", {
        fontFamily: "Arial, sans-serif",
        fontSize: "14px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    this.toastContainer.add([bg, this.toastText]);
  }

  /**
   * Displays an animated toast notification.
   * @param {string} msg
   */
  showToast(msg) {
    if (!this.toastContainer) return;
    this.toastText.setText(msg);

    if (this.toastTimer) {
      this.toastTimer.remove();
    }

    this.scene.tweens.killTweensOf(this.toastContainer);
    this.toastContainer.setAlpha(0);

    this.scene.tweens.add({
      targets: this.toastContainer,
      alpha: 1,
      duration: 250,
      ease: "Cubic.easeOut",
    });

    this.toastTimer = this.scene.time.delayedCall(2500, () => {
      this.scene.tweens.add({
        targets: this.toastContainer,
        alpha: 0,
        duration: 350,
        ease: "Cubic.easeIn",
      });
    });
  }

  /**
   * Cleans up taskbar elements and timers.
   */
  destroy(fromScene) {
    this.closeStartMenu();
    if (this.toastTimer) {
      this.toastTimer.remove();
    }
    super.destroy(fromScene);
  }
}
