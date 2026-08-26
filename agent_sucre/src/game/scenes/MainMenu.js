import { Scene } from "phaser";

export class MainMenu extends Scene {
  constructor() {
    super("MainMenu");
  }

  create() {
    this.add.image(512, 384, "pc_screen");

    const bouton = this.add.image(130, 130, "folder");

    bouton.setScale(0.1);

    bouton.setInteractive({ useHandCursor: true });

    bouton.on("pointerdown", () => {
      this.scene.start("Game");
    });
  }
}
