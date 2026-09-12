import { DialogBox } from "../components/DialogBox";

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
    // switch (action.type) {
    //   case "ADD_ITEM":
    //     this.inventory.add(action.itemId);
    //     break;
    //   case "ADD_AFFECTION":
    //     this.playerStats.affection += action.amount;
    //     break;
    // }
  }
}
