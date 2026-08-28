import { Scene } from "phaser";
import { DialogBox } from "../components/DialogBox.js";
import { DialogueManager } from "../manager/DialogManager.js";

export class Game extends Scene {
  constructor() {
    super("Game");
  }

  create() {
    this.cameras.main.setBackgroundColor(0x00ff00);

    this.dialogBox = new DialogBox(this);

    this.dialogueManager = new DialogueManager(
      this,
      this.dialogBox,
      "dialogs",
    );

    this.dialogueManager.play("explications");

    this.input.on("pointerdown", () => this.dialogBox.advance());
    this.input.keyboard.on("keydown-SPACE", () => this.dialogBox.advance());
  }
}
