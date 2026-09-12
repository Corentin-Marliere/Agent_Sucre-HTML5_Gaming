import { Scene } from "phaser";
import { gameState } from "../state/GameState.js";
import { SaveManager } from "../manager/SaveManager.js";
import { ProfileModal } from "../components/ProfileModal.js";

export class MainMenu extends Scene {
  constructor() {
    super("MainMenu");
  }

  create() {
    gameState.setCurrentScene("MainMenu");
    this.cameras.main.setBackgroundColor(0x000000);
    this.add.image(980, 499, "pc_screen").setScale(1.3);

    // Taskbar
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x000000, 1);
    g.fillRect(32, 32, 1155, 80);

    g.generateTexture("task_bar", 1155, 80);
    g.destroy();

    this.add.image(964, 850, "task_bar");
    this.add.image(450, 865, "windows_cake").setScale(0.08);

    // Desk Icon 1: Dialogue / Mini-game
    const bouton = this.add.image(470, 158, "folder");
    bouton.setScale(0.1);
    bouton.setInteractive({ useHandCursor: true });
    bouton.on("pointerdown", () => {
      this.scene.start("Game");
    });
    this.add
      .text(470, 205, "Mission Dialogue", {
        fontFamily: "Arial",
        fontSize: "14px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    // Desktop Icon 2: Map
    const mapTest = this.add.image(1495, 158, "folder");
    mapTest.setScale(0.1);
    mapTest.setInteractive({ useHandCursor: true });
    mapTest.on("pointerdown", () => {
      this.scene.start("GenericMapScene", { mapId: "secretInstitute" });
    });
    this.add
      .text(1495, 205, "Institut Secret", {
        fontFamily: "Arial",
        fontSize: "14px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    // Desktop Icon 3: Profile & Security Folder
    const profilIcon = this.add.image(980, 158, "folder");
    profilIcon.setScale(0.1);
    profilIcon.setInteractive({ useHandCursor: true });
    profilIcon.on("pointerdown", () => {
      this.openProfileModal();
    });
    this.add
      .text(980, 205, "Dossier Agent / PIN", {
        fontFamily: "Arial",
        fontSize: "14px",
        color: "#00d2ff",
      })
      .setOrigin(0.5);

    // Agent status on the taskbar
    this.statusText = this.add
      .text(520, 865, this.getAgentStatusString(), {
        fontFamily: "Courier, monospace",
        fontSize: "14px",
        color: "#00ffcc",
      })
      .setOrigin(0, 0.5);

    // Save button on the taskbar
    const saveBtn = this.add
      .rectangle(1430, 865, 130, 32, 0x1f7a3a)
      .setStrokeStyle(1, 0xffffff)
      .setInteractive({ useHandCursor: true });

    const saveBtnText = this.add
      .text(1430, 865, "💾 Sauvegarder", {
        fontFamily: "Arial",
        fontSize: "13px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    // Save toast message
    this.saveToast = this.add
      .text(964, 805, "", {
        fontFamily: "Arial",
        fontSize: "16px",
        fontStyle: "bold",
        color: "#00ff88",
        backgroundColor: "#000000cc",
        padding: { x: 14, y: 6 },
      })
      .setOrigin(0.5)
      .setVisible(false);

    saveBtn.on("pointerover", () => saveBtn.setAlpha(0.85));
    saveBtn.on("pointerout", () => saveBtn.setAlpha(1));
    saveBtn.on("pointerdown", () => {
      const res = SaveManager.save();
      if (res.success) {
        this.showToast("✓ Progression sauvegardée dans le stockage local !");
        this.refreshStatus();
      } else {
        this.showToast("✗ Erreur de sauvegarde");
      }
    });

    // Automatic save detection upon initial session loading
    this.checkInitialSaveState();
  }

  getAgentStatusString() {
    const profile = gameState.getProfile();
    const chapter = gameState.getState().progression.currentChapter;
    return `Agent : ${profile.agentName || "Inconnu"} | Ch. ${chapter}`;
  }

  refreshStatus() {
    if (this.statusText) {
      this.statusText.setText(this.getAgentStatusString());
    }
  }

  showToast(message) {
    if (!this.saveToast) return;
    this.saveToast.setText(message).setVisible(true);
    this.time.delayedCall(2500, () => {
      this.saveToast.setVisible(false);
    });
  }

  checkInitialSaveState() {
    const hasSave = SaveManager.hasSave();
    const isUnlocked = Boolean(gameState.getProfile().pinCode);

    if (!hasSave) {
      // Part one: prompting the creation of the profile and PIN
      this.openProfileModal("CREATE");
    } else if (!isUnlocked) {
      // Existing locked save detected: request PIN
      this.openProfileModal("LOAD");
    }
  }

  openProfileModal(forceMode = null) {
    if (this.currentModal) {
      this.currentModal.close();
    }

    const hasSave = SaveManager.hasSave();
    const mode = forceMode || (hasSave ? "LOAD" : "CREATE");

    this.currentModal = new ProfileModal(this, {
      mode,
      onSuccess: ({ mode: successMode, agentName }) => {
        this.refreshStatus();
        if (successMode === "CREATE") {
          this.showToast(`Bienvenue, agent ${agentName} ! Dossier initialisé.`);
        } else {
          this.showToast(`Session déverrouillée ! Bon retour, agent.`);
        }
      },
      onNewGameRequest: () => {
        this.openProfileModal("CREATE");
      },
    });
  }
}
