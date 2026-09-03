import { GameObjects } from "phaser";

export class InteractiveArea extends GameObjects.Container {
  constructor(scene, x, y, width, height, type, target) {
    super(scene, x, y);

    this.type = type;
    this.target = target;

    this.setSize(width, height);
    this.setInteractive({ useHandCursor: true });

    this.highlight = scene.add.graphics();
    this.highlight.fillStyle(0xffffff, 0.3); // Couleur blanche avec 30% d'opacité
    this.highlight.fillRect(-width / 2, -height / 2, width, height); // Centré sur le container
    this.highlight.setVisible(false);

    this.add(this.highlight);

    this.on("pointerover", () => {
      this.highlight.setVisible(true);
    });

    this.on("pointerout", () => {
      this.highlight.setVisible(false);
    });

    this.on("pointerdown", () => {
      this.changeZone();
    });

    scene.add.existing(this);
  }

  changeZone() {
    this.scene.cameras.main.fadeOut(300, 0, 0, 0, (camera, progress) => {
      if (progress === 1) {
        if (this.type === "map") {
          this.scene.scene.start("GenericMapScene", { mapId: this.target });
        } else if (this.type === "scene") {
          this.scene.scene.start(this.target);
        }
      }
    });
  }
}
