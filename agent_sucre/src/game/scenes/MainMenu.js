import { Scene } from "phaser";
import { gameState } from "../state/GameState.js";

export class MainMenu extends Scene {
  constructor() {
    super("MainMenu");
  }

  create() {
    gameState.setCurrentScene("MainMenu");
    this.cameras.main.setBackgroundColor(0x000000);
    this.add.image(980, 499, "pc_screen").setScale(1.3);

    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x000000, 1);
    g.fillRect(32, 32, 1155, 80);

    g.generateTexture("task_bar", 1155, 80);
    g.destroy();

    this.add.image(964, 850, "task_bar");

    this.add.image(450, 865, "windows_cake").setScale(0.08);

    const bouton = this.add.image(470, 158, "folder");

    bouton.setScale(0.1);

    bouton.setInteractive({ useHandCursor: true });

    bouton.on("pointerdown", () => {
      this.scene.start("Game");
    });

    const mapTest = this.add.image(1495, 158, "folder");

    mapTest.setScale(0.1);

    mapTest.setInteractive({ useHandCursor: true });

    mapTest.on("pointerdown", () => {
      this.scene.start("GenericMapScene", { mapId: "secretInstitute" });
    });
  }
}
