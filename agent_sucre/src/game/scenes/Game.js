import { Scene } from "phaser";
import { DialogBox } from "../components/DialogBox.js";

export class Game extends Scene {
  constructor() {
    super("Game");
  }

  create() {
    this.cameras.main.setBackgroundColor(0x00ff00);

    this.dialogBox = new DialogBox(this, 115, 600, 800, 130);

    this.dialogBox.start(
      [
        "Bonjour ! Bienvenue dans cette aventure.",
        "Utilise la carte pour te déplacer.",
        "Bonne chance !",
      ],
      () => {
        this.scene.start("GameOver");
      },
    );

    this.input.on("pointerdown", () => this.dialogBox.advance());
    this.input.keyboard.on("keydown-SPACE", () => this.dialogBox.advance());
  }
}
