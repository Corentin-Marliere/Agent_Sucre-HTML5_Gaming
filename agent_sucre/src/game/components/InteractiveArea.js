import { GameObjects } from "phaser";

export class InteractiveArea extends GameObjects.Container {
  constructor(scene, x, y, width, height, type, target) {
    super(scene, x, y);

    this.type = type;
    this.target = target;

    this.setSize(width, height);
    this.setInteractive({ useHandCursor: true });

    // bg.on("pointerover", () => {
    //   scene.tweens.add({
    //     targets: this,
    //     scale: 1.05,
    //     duration: 150,
    //   });
    // });

    // bg.on("pointerout", () => {
    //   scene.tweens.add({
    //     targets: this,
    //     scale: 1,
    //     duration: 150,
    //   });
    // });

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
