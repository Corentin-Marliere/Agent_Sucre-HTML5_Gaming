import { GameObjects } from "phaser";

export class InteractiveArea extends GameObjects.Container {
  constructor(scene, x, y, width, height, type, target, label = "") {
    super(scene, x, y);

    this.type = type;
    this.target = target;
    this.label = label;

    this.setSize(width, height);
    this.setInteractive({ useHandCursor: true });

    this.highlight = scene.add.graphics();
    this.highlight.fillStyle(0x00ffff, 0.25); // Subtle cyan glow
    this.highlight.lineStyle(2, 0x00ffff, 0.8);
    this.highlight.strokeRect(-width / 2, -height / 2, width, height);
    this.highlight.fillRect(-width / 2, -height / 2, width, height);
    this.highlight.setVisible(false);

    this.add(this.highlight);

    this.on("pointerover", () => {
      this.highlight.setVisible(true);
      if (this.label && typeof this.scene.showMapTooltip === "function") {
        this.scene.showMapTooltip(this.label);
      }
    });

    this.on("pointerout", () => {
      this.highlight.setVisible(false);
      if (typeof this.scene.hideMapTooltip === "function") {
        this.scene.hideMapTooltip();
      }
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
