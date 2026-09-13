import { DialogBox } from "../components/DialogBox";
import { gameState } from "../state/GameState.js";

/**
 * Manages dialogue progression, branching choices, and narrative actions.
 */
export class DialogueManager {
  /**
   * @param {Phaser.Scene} scene
   * @param {DialogBox} dialogBox
   * @param {string} jsonKey - Cache key for dialogs JSON
   * @param {Object} [options={}]
   * @param {import("../components/GaugeHUD.js").GaugeHUD} [options.gaugeHUD] - Optional HUD for gauge updates
   */
  constructor(scene, dialogBox, jsonKey, options = {}) {
    this.scene = scene;
    this.dialogBox = dialogBox;
    this.dialogueData = scene.cache.json.get(jsonKey);
    this.gaugeHUD = options.gaugeHUD || null;
  }

  /**
   * Links or updates the GaugeHUD reference.
   * @param {import("../components/GaugeHUD.js").GaugeHUD} gaugeHUD
   */
  setGaugeHUD(gaugeHUD) {
    this.gaugeHUD = gaugeHUD;
  }

  /**
   * Plays a dialogue tree node by ID.
   * @param {string} dialogueId
   */
  play(dialogueId) {
    const data = this.dialogueData[dialogueId];
    if (!data) {
      console.warn(`Dialogue ID non trouvé : ${dialogueId}`);
      return;
    }

    gameState.setCurrentDialogue(dialogueId);

    // Execute node-level entry actions (e.g. awards, flag updates)
    if (data.action) {
      this.executeAction(data.action);
    }
    if (Array.isArray(data.actions)) {
      data.actions.forEach((action) => this.executeAction(action));
    }

    // Update active speaker on the affinity gauge if available
    if (data.speaker && this.gaugeHUD) {
      this.gaugeHUD.setSpeaker(data.speaker);
    }

    // Update character sprite portrait visual on scene
    if (typeof this.scene.updateSpeakerVisuals === "function") {
      this.scene.updateSpeakerVisuals(data.speaker);
    }

    this.dialogBox.start(
      data.speaker || null,
      data.lines,
      data.choices,
      (selectedChoice) => this.handleNavigation(selectedChoice),
      () => this.handleNavigation(data),
    );
  }

  /**
   * Handles branching navigation and executes associated actions.
   * @param {Object} target
   */
  handleNavigation(target) {
    if (!target) return;

    // Single action execution
    if (target.action) {
      this.executeAction(target.action);
    }

    // Multiple actions execution
    if (Array.isArray(target.actions)) {
      target.actions.forEach((action) => this.executeAction(action));
    }

    if (target.nextDialogId) {
      this.play(target.nextDialogId);
      return;
    }

    if (target.nextSceneId) {
      this.scene.scene.start(target.nextSceneId, target.sceneData || undefined);
      return;
    }
  }

  /**
   * Executes a specific narrative action and provides visual feedback.
   * @param {Object} action
   */
  executeAction(action) {
    if (!action || !action.type) return;

    switch (action.type) {
      case "ADD_ITEM": {
        const catalog = this.scene.cache.json.get("items") || {};
        const itemName = catalog[action.itemId]?.name || action.itemId;
        gameState.addItem(action.itemId, action.quantity || 1);
        if (typeof this.scene.showToast === "function") {
          this.scene.showToast(`📦 Objet obtenu : ${itemName}`);
        } else if (this.gaugeHUD && typeof this.gaugeHUD.showFeedback === "function") {
          this.gaugeHUD.showFeedback(`+1 📦 ${itemName}`, "#00ffcc", 960, 100);
        }
        break;
      }

      case "REMOVE_ITEM":
        gameState.removeItem(action.itemId, action.quantity || 1);
        break;

      case "ADD_AFFECTION": {
        const charKey =
          action.target ||
          action.character ||
          (this.gaugeHUD ? this.gaugeHUD.activeCharacter : "etchebest");
        const amount = Number(action.amount) || 0;
        const newVal = gameState.addAffection(charKey, amount);

        if (this.gaugeHUD) {
          this.gaugeHUD.refresh();
          const sign = amount >= 0 ? `+${amount}` : `${amount}`;
          const color = amount >= 0 ? "#ff6b9d" : "#ff4444";
          this.gaugeHUD.showFeedback(`${sign} % ❤️ (${charKey})`, color, 570, 70);
        }
        break;
      }

      case "ADD_INFILTRATION": {
        const amount = Number(action.amount) || 0;
        const newVal = gameState.addInfiltration(amount);

        if (this.gaugeHUD) {
          this.gaugeHUD.refresh();
          const sign = amount >= 0 ? `+${amount}` : `${amount}`;
          const color = amount >= 0 ? "#00ff88" : "#ff4444";
          this.gaugeHUD.showFeedback(`${sign} % 🕵️ Infiltration`, color, 220, 70);
        }
        break;
      }

      case "ADD_GAUGE": {
        const gauge = action.gauge || "infiltration";
        const amount = Number(action.amount) || 0;
        gameState.addGauge(gauge, amount);
        if (this.gaugeHUD) {
          this.gaugeHUD.refresh();
        }
        break;
      }

      case "SET_FLAG":
        gameState.setFlag(action.flag, action.value ?? true);
        break;

      case "SET_CHAPTER":
        gameState.setChapter(Number(action.chapter) || 1);
        break;

      default:
        console.warn(`Unrecognized dialogue action: ${action.type}`);
    }

    // Refresh active quest banner if current scene supports it
    if (typeof this.scene.refreshObjectiveBanner === "function") {
      this.scene.refreshObjectiveBanner();
    }
  }
}
