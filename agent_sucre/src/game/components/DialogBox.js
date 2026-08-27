import { GameObjects } from "phaser";


export class DialogBox extends GameObjects.Container {
  constructor(scene, x, y, width, height) {
    super(scene, x, y);

    this.width = width;
    this.height = height;

    this.bg = scene.add
      .rectangle(0, 0, width, height, 0x000000, 0.8)
      .setStrokeStyle(2, 0xffffff)
      .setOrigin(0);

    this.text = scene.add.text(20, 20, "", {
      fontFamily: "Arial",
      fontSize: "18px",
      color: "#ffffff",
      wordWrap: { width: width - 40 },
    });

    this.add([this.bg, this.text]);
    scene.add.existing(this);

    this.lines = [];
    this.currentIndex = 0;
    this.isTyping = false;
    this.currentTimer = null;
    this.onComplete = null;

    this.setVisible(false);
  }

  start(lines, onComplete = null) {
    this.lines = lines;
    this.currentIndex = 0;
    this.onComplete = onComplete;
    this.setVisible(true);

    this.showCurrentLine();
  }

  advance() {
    if (!this.visible) return;

    if (this.isTyping) {
      this.completeTyping();
      return;
    }

    this.currentIndex++;

    if (this.currentIndex < this.lines.length) {
      this.showCurrentLine();
    } else {
      this.setVisible(false);
      if (this.onComplete) this.onComplete();
    }
  }

  showCurrentLine(speed = 40) {
    if (this.currentTimer) this.currentTimer.remove();

    const currentText = this.lines[this.currentIndex];
    this.text.setText("");
    this.isTyping = true;
    let index = 0;

    this.currentTimer = this.scene.time.addEvent({
      delay: speed,
      repeat: currentText.length - 1,
      callback: () => {
        this.text.text += currentText[index];
        index++;
        if (index === currentText.length) {
          this.isTyping = false;
        }
      },
    });
  }

  completeTyping() {
    if (this.currentTimer) this.currentTimer.remove();
    this.text.setText(this.lines[this.currentIndex]);
    this.isTyping = false;
  }
}
