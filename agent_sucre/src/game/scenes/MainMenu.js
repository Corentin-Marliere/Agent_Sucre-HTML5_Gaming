import { Scene } from "phaser";

export class MainMenu extends Scene {
  constructor() {
    super("MainMenu");
  }

  create() {
    this.add.image(512, 384, "pc_screen");

    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x000000, 1);
    g.fillRect(32, 32, 896, 150);

    g.generateTexture("task_bar", 896, 80);
    g.destroy();

    this.add.image(495, 639, "task_bar");

    this.add.image(110, 655, "windows_cake").setScale(0.08);

    const bouton = this.add.image(130, 130, "folder");

    bouton.setScale(0.1);

    bouton.setInteractive({ useHandCursor: true });

    bouton.on("pointerdown", () => {
      this.scene.start("Game");
    });
  }
}
