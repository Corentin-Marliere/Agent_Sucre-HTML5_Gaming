import { GameObjects } from "phaser";
export class DialogBox extends GameObjects.Container {
  constructor(scene) {
    super(scene, 200, 700);

    this.width = 1500;
    this.height = 200;
    this.justSelectedChoice = false;

    this.bg = scene.add
      .rectangle(0, 0, this.width, this.height, 0x000000, 0.8)
      .setStrokeStyle(2, 0xffffff)
      .setOrigin(0);

    this.text = scene.add.text(20, 20, "", {
      fontFamily: "Arial",
      fontSize: "25px",
      color: "#ffffff",
      wordWrap: { width: this.width - 40 },
    });

    this.nameBg = scene.add
      .rectangle(0, -45, 250, 40, 0x111111, 0.9)
      .setStrokeStyle(2, 0xffffff)
      .setOrigin(0);

    this.nameText = scene.add.text(15, -37, "", {
      fontFamily: "Arial",
      fontSize: "22px",
      fontStyle: "bold",
      color: "#ffdd00",
    });

    this.choicesContainer = scene.add.container(0, 0);

    this.add([this.bg, this.text, this.nameBg, this.nameText, this.choicesContainer]);
    scene.add.existing(this);

    this.lines = [];
    this.currentIndex = 0;
    this.isTyping = false;
    this.currentTimer = null;
    this.onComplete = null;
    this.choices = null;
    this.onChoiceSelected = null;

    this.setVisible(false);
  }

  start(speakerName = null, lines, choices = null, onChoiceSelected = null, onComplete = null) {
    this.lines = lines;
    this.currentIndex = 0;
    this.choices = choices;
    this.onChoiceSelected = onChoiceSelected;
    this.onComplete = onComplete;

    if (speakerName && speakerName.trim() !== "") {
      this.nameText.setText(speakerName);
      const textWidth = this.nameText.width;
      this.nameBg.setSize(Math.max(150, textWidth + 30), 40);
      this.nameBg.setVisible(true);
      this.nameText.setVisible(true);
    } else {
      this.nameBg.setVisible(false);
      this.nameText.setVisible(false);
    }

    this.clearChoices();
    this.setVisible(true);
    this.text.setText("");
    this.showCurrentLine();
  }

  advance() {
    if (!this.visible) return;

    if (this.justSelectedChoice) {
      this.justSelectedChoice = false;
      return;
    }

    if (this.isTyping) {
      this.completeTyping();
      return;
    }

    if (this.choicesContainer.length > 0) return;

    this.currentIndex++;

    if (this.currentIndex < this.lines.length) {
      this.showCurrentLine();
    } else {
      if (this.choices && this.choices.length > 0) {
        this.showChoices();
      } else {
        this.close();
      }
    }
  }

  showChoices() {
    this.clearChoices();

    const choiceWidth = 640;
    const choiceHeight = 40;
    const spacing = 12;

    this.choices.forEach((choice, index) => {
      const buttonY = -(choiceHeight + spacing) * (this.choices.length - index) - 10;

      const btnBg = this.scene.add
        .rectangle(this.width / 2, buttonY, choiceWidth, choiceHeight, 0x101a28, 0.95)
        .setStrokeStyle(1.5, 0x00d2ff)
        .setInteractive({ useHandCursor: true });

      const btnText = this.scene.add
        .text(this.width / 2, buttonY, `➤  ${choice.text}`, {
          fontFamily: "Arial, sans-serif",
          fontSize: "15px",
          fontStyle: "bold",
          color: "#ffffff",
        })
        .setOrigin(0.5);

      btnBg.on("pointerover", () => {
        btnBg.setFillStyle(0x1e3a5f, 0.98);
        btnBg.setStrokeStyle(2, 0x00ffcc);
        btnText.setColor("#00ffcc");
      });

      btnBg.on("pointerout", () => {
        btnBg.setFillStyle(0x101a28, 0.95);
        btnBg.setStrokeStyle(1.5, 0x00d2ff);
        btnText.setColor("#ffffff");
      });

      btnBg.on("pointerdown", () => {
        this.justSelectedChoice = true;

        this.clearChoices();
        if (this.onChoiceSelected) this.onChoiceSelected(choice);
      });

      this.choicesContainer.add([btnBg, btnText]);
    });
  }

  clearChoices() {
    this.choicesContainer.removeAll(true);
  }

  close() {
    this.setVisible(false);
    if (this.onComplete) this.onComplete();
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
