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

    // Shuffle choice display order if they represent distinct narrative dialogue responses
    const isDialogueResponse =
      Array.isArray(this.choices) &&
      this.choices.length > 1 &&
      this.choices.every((c) => c.nextDialogId) &&
      new Set(this.choices.map((c) => c.text)).size > 1;

    const displayedChoices = isDialogueResponse
      ? [...this.choices].sort(() => Math.random() - 0.5)
      : this.choices;

    const totalChoices = displayedChoices.length;

    // If more than 4 choices (e.g. 6 or 9 choices), render in a multi-column grid
    if (totalChoices > 4) {
      const cols = totalChoices >= 9 ? 3 : (totalChoices % 2 === 0 && totalChoices < 6 ? 2 : 3);
      const rows = Math.ceil(totalChoices / cols);
      const totalGridWidth = 1060;
      const spacingX = 14;
      const spacingY = 10;
      const btnW = Math.floor((totalGridWidth - (cols - 1) * spacingX) / cols);
      const btnH = 44;
      const totalGridHeight = rows * btnH + (rows - 1) * spacingY;
      const startY = -totalGridHeight - 16;
      const startX = (this.width - totalGridWidth) / 2;

      displayedChoices.forEach((choice, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);

        const btnX = startX + col * (btnW + spacingX) + btnW / 2;
        const btnY = startY + row * (btnH + spacingY) + btnH / 2;

        const btnBg = this.scene.add
          .rectangle(btnX, btnY, btnW, btnH, 0x101a28, 0.95)
          .setStrokeStyle(1.5, 0x00d2ff)
          .setInteractive({ useHandCursor: true });

        const btnText = this.scene.add
          .text(btnX, btnY, `➤  ${choice.text}`, {
            fontFamily: "Arial, sans-serif",
            fontSize: "14px",
            fontStyle: "bold",
            color: "#ffffff",
            wordWrap: { width: btnW - 20, useAdvancedWrap: true },
            align: "center",
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
    } else {
      // 1 to 4 choices: single-column vertical stack with generous width and dynamic height
      const choiceWidth = 1000;
      const defaultChoiceHeight = 44;
      const spacing = 10;
      let currentBottom = -14;

      // Layout from bottom-most choice upwards
      for (let i = displayedChoices.length - 1; i >= 0; i--) {
        const choice = displayedChoices[i];

        const btnText = this.scene.add
          .text(this.width / 2, 0, `➤  ${choice.text}`, {
            fontFamily: "Arial, sans-serif",
            fontSize: "15px",
            fontStyle: "bold",
            color: "#ffffff",
            wordWrap: { width: choiceWidth - 40, useAdvancedWrap: true },
            align: "center",
          })
          .setOrigin(0.5);

        const btnHeight = Math.max(defaultChoiceHeight, btnText.height + 18);
        const btnY = currentBottom - btnHeight / 2;
        btnText.setY(btnY);

        const btnBg = this.scene.add
          .rectangle(this.width / 2, btnY, choiceWidth, btnHeight, 0x101a28, 0.95)
          .setStrokeStyle(1.5, 0x00d2ff)
          .setInteractive({ useHandCursor: true });

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

        // Add background first so text is on top
        this.choicesContainer.add([btnBg, btnText]);
        currentBottom -= (btnHeight + spacing);
      }
    }
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
