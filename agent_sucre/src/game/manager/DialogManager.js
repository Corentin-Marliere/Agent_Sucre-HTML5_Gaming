import { DialogBox } from "../components/DialogBox";
import { gameState } from "../state/GameState.js";

export class DialogueManager {
  constructor(scene, dialogBox, jsonKey) {
    this.scene = scene;
    this.dialogBox = dialogBox;
    this.dialogueData = scene.cache.json.get(jsonKey);
  }

  play(dialogueId) {
    const data = this.dialogueData[dialogueId];
    if (!data) {
      console.warn(`Dialogue ID non trouvé : ${dialogueId}`);
      return;
    }

    gameState.setCurrentDialogue(dialogueId);

    this.dialogBox.start(
      data.speaker || null,
      data.lines,
      data.choices,
      (selectedChoice) => this.handleNavigation(selectedChoice),
      () => this.handleNavigation(data),
    );
  }

  handleNavigation(target) {
    if (!target) return;

    if (target.action) {
      this.executeAction(target.action);
    }

    if (target.nextDialogId) {
      this.play(target.nextDialogId);
      return;
    }

    if (target.nextSceneId) {
      this.scene.scene.start(target.nextSceneId);
      return;
    }
  }

  executeAction(action) {
    switch (action.type) {
      case "ADD_ITEM":
        gameState.addItem(action.itemId, action.quantity || 1);
        break;
      case "REMOVE_ITEM":
        gameState.removeItem(action.itemId, action.quantity || 1);
        break;
      case "ADD_AFFECTION":
        gameState.addAffection(action.target || action.character || "default", action.amount || 0);
        break;
      case "SET_FLAG":
        gameState.setFlag(action.flag, action.value ?? true);
        break;
      default:
        console.warn(`Action de dialogue non reconnue : ${action.type}`);
    }
  }
}
