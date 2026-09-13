import { GameObjects } from "phaser";
import { gameState } from "../state/GameState.js";

/**
 * Procedural Among Us style Maze minigame ("Weather Node") component.
 * Allows hacking into the secret Archives via the maintenance corridor.
 * Playable with keyboard (Arrow keys / WASD / ZQSD) or mouse (click & drag).
 */
export class MazeModal extends GameObjects.Container {
  /**
   * @param {Phaser.Scene} scene
   * @param {Object} [options={}]
   * @param {Function} [options.onClose]
   * @param {Function} [options.onSuccess]
   * @param {number} [options.timeLimit=25] Time limit in seconds
   */
  constructor(scene, options = {}) {
    super(scene, 0, 0);

    this.onClose = options.onClose || (() => {});
    this.onSuccess = options.onSuccess || (() => {});
    this.timeLimit = options.timeLimit || 25;
    this.timeRemaining = this.timeLimit;

    // Grid configuration: 9 columns x 5 rows matching Among Us Polus Weather Node
    this.cols = 9;
    this.rows = 5;
    this.startCell = { c: 1, r: 0 };
    this.exitCell = { c: 7, r: 4 };

    this.isFinished = false;
    this.isFailed = false;
    this.isDragging = false;

    this.initUI();
    this.initMaze();
    this.initControls();
    this.startTimer();

    scene.add.existing(this);
    this.setDepth(1200);
  }

  /**
   * Builds the MIRA-style cyber console frame and layout.
   */
  initUI() {
    const screenWidth = this.scene.scale.width;
    const screenHeight = this.scene.scale.height;

    // 1. Darkened backdrop (clicking outside closes modal if not completed)
    this.backdrop = this.scene.add
      .rectangle(screenWidth / 2, screenHeight / 2, screenWidth, screenHeight, 0x000000, 0.8)
      .setInteractive();
    this.backdrop.on("pointerdown", () => {
      if (!this.isFinished) this.close();
    });
    this.add(this.backdrop);

    // Modal dimensions
    this.winWidth = 980;
    this.winHeight = 620;
    this.winX = screenWidth / 2;
    this.winY = screenHeight / 2;

    // 2. Metallic outer cyber console frame
    this.consoleFrame = this.scene.add
      .rectangle(this.winX, this.winY, this.winWidth, this.winHeight, 0x182438, 0.98)
      .setStrokeStyle(3, 0x00d2ff)
      .setInteractive();
    this.add(this.consoleFrame);

    // Console top bezel with cooling vents
    const topBar = this.scene.add
      .rectangle(this.winX, this.winY - this.winHeight / 2 + 25, this.winWidth, 50, 0x0e1726);
    this.add(topBar);

    // Decorative ventilation slits
    for (let i = -3; i <= 3; i++) {
      const slit = this.scene.add
        .rectangle(this.winX + i * 20, this.winY - this.winHeight / 2 + 16, 8, 16, 0x070c14);
      this.add(slit);
    }

    // Title & Instructions
    this.titleText = this.scene.add
      .text(
        this.winX - this.winWidth / 2 + 30,
        this.winY - this.winHeight / 2 + 25,
        "⚡ COULOIR TECHNIQUE // DÉRIVATION DU SAS DES ARCHIVES",
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "15px",
          fontStyle: "bold",
          color: "#00ffcc",
        }
      )
      .setOrigin(0, 0.5);
    this.add(this.titleText);

    // Close button [✖]
    const closeBtnBg = this.scene.add
      .circle(this.winX + this.winWidth / 2 - 30, this.winY - this.winHeight / 2 + 25, 16, 0x22111d)
      .setStrokeStyle(1.5, 0xff6b6b)
      .setInteractive({ useHandCursor: true });

    const closeBtn = this.scene.add
      .text(this.winX + this.winWidth / 2 - 30, this.winY - this.winHeight / 2 + 25, "✖", {
        fontFamily: "Arial, sans-serif",
        fontSize: "15px",
        fontStyle: "bold",
        color: "#ff6b6b",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const onCloseHover = () => {
      closeBtnBg.setFillStyle(0xff4444, 0.4);
      closeBtn.setColor("#ffffff");
    };
    const onCloseOut = () => {
      closeBtnBg.setFillStyle(0x22111d, 1);
      closeBtn.setColor("#ff6b6b");
    };

    closeBtnBg.on("pointerover", onCloseHover);
    closeBtnBg.on("pointerout", onCloseOut);
    closeBtnBg.on("pointerdown", () => this.close());
    closeBtn.on("pointerover", onCloseHover);
    closeBtn.on("pointerout", onCloseOut);
    closeBtn.on("pointerdown", () => this.close());
    this.add([closeBtnBg, closeBtn]);

    // Timer & Status Banner
    const timerBarY = this.winY - this.winHeight / 2 + 65;
    this.timerBg = this.scene.add
      .rectangle(this.winX, timerBarY, 860, 10, 0x0a101d)
      .setStrokeStyle(1, 0x334155);
    this.add(this.timerBg);

    this.timerBar = this.scene.add
      .rectangle(this.winX - 430, timerBarY, 860, 8, 0x00ffcc)
      .setOrigin(0, 0.5);
    this.add(this.timerBar);

    this.timerText = this.scene.add
      .text(this.winX - 430, timerBarY - 16, `⏱️ TEMPS RESTANT : ${this.timeLimit.toFixed(1)} s`, {
        fontFamily: "Arial, sans-serif",
        fontSize: "12px",
        fontStyle: "bold",
        color: "#00ffcc",
      })
      .setOrigin(0, 0.5);
    this.add(this.timerText);

    const layout = gameState.getFlag("movementLayout") || "ZQSD";
    this.hintText = this.scene.add
      .text(
        this.winX + 430,
        timerBarY - 16,
        `Contrôles : Souris (glisser/clic) OU Flèches / ${layout}`,
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "11px",
          color: "#94a3b8",
        }
      )
      .setOrigin(1, 0.5);
    this.add(this.hintText);

    // Inner CRT display chamber
    this.screenBg = this.scene.add
      .rectangle(this.winX, this.winY + 38, 880, 440, 0x080f1a, 0.95)
      .setStrokeStyle(2, 0x1e3a5f);
    this.add(this.screenBg);

    // Graphics layers for maze rendering
    this.mazeGraphics = this.scene.add.graphics();
    this.beamGraphics = this.scene.add.graphics();
    this.add([this.mazeGraphics, this.beamGraphics]);

    // Grid coordinates
    this.cellW = 86;
    this.cellH = 76;
    this.gridOriginX = this.winX - ((this.cols - 1) * this.cellW) / 2;
    this.gridOriginY = this.winY + 38 - ((this.rows - 1) * this.cellH) / 2;

    // Glowing head cursor on current node
    this.cursorHead = this.scene.add
      .circle(0, 0, 16, 0x00ffff, 0.9)
      .setStrokeStyle(2, 0xffffff);
    this.cursorHead.setVisible(false);
    this.add(this.cursorHead);

    // Pulse tween for the glowing node head
    this.headTween = this.scene.tweens.add({
      targets: this.cursorHead,
      scaleX: 1.25,
      scaleY: 1.25,
      alpha: 0.6,
      duration: 350,
      yoyo: true,
      repeat: -1,
    });
  }

  /**
   * Generates a solvable, procedural random maze on a 9x5 grid.
   */
  initMaze() {
    this.grid = [];
    for (let c = 0; c < this.cols; c++) {
      this.grid[c] = [];
      for (let r = 0; r < this.rows; r++) {
        this.grid[c][r] = {
          c,
          r,
          x: this.gridOriginX + c * this.cellW,
          y: this.gridOriginY + r * this.cellH,
          visited: false,
          walls: { top: true, bottom: true, left: true, right: true },
        };
      }
    }

    // Randomized Depth-First Search (Recursive Backtracker)
    const start = this.grid[this.startCell.c][this.startCell.r];
    start.visited = true;
    const stack = [start];

    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      const neighbors = [];

      // Top
      if (current.r > 0 && !this.grid[current.c][current.r - 1].visited) {
        neighbors.push({ cell: this.grid[current.c][current.r - 1], dir: "top", opp: "bottom" });
      }
      // Bottom
      if (current.r < this.rows - 1 && !this.grid[current.c][current.r + 1].visited) {
        neighbors.push({ cell: this.grid[current.c][current.r + 1], dir: "bottom", opp: "top" });
      }
      // Left
      if (current.c > 0 && !this.grid[current.c - 1][current.r].visited) {
        neighbors.push({ cell: this.grid[current.c - 1][current.r], dir: "left", opp: "right" });
      }
      // Right
      if (current.c < this.cols - 1 && !this.grid[current.c + 1][current.r].visited) {
        neighbors.push({ cell: this.grid[current.c + 1][current.r], dir: "right", opp: "left" });
      }

      if (neighbors.length > 0) {
        const next = neighbors[Math.floor(Math.random() * neighbors.length)];
        current.walls[next.dir] = false;
        next.cell.walls[next.opp] = false;
        next.cell.visited = true;
        stack.push(next.cell);
      } else {
        stack.pop();
      }
    }

    // Open an additional ~20% of interior walls to create alternate routes and loops (like Among Us)
    for (let c = 0; c < this.cols; c++) {
      for (let r = 0; r < this.rows; r++) {
        if (Math.random() < 0.22 && c < this.cols - 1 && this.grid[c][r].walls.right) {
          this.grid[c][r].walls.right = false;
          this.grid[c + 1][r].walls.left = false;
        }
        if (Math.random() < 0.18 && r < this.rows - 1 && this.grid[c][r].walls.bottom) {
          this.grid[c][r].walls.bottom = false;
          this.grid[c][r + 1].walls.top = false;
        }
      }
    }

    // Player Path tracking
    this.currentPos = { c: this.startCell.c, r: this.startCell.r };
    this.playerPath = [{ c: this.startCell.c, r: this.startCell.r }];

    this.renderMazeBase();
    this.updateBeam();
  }

  /**
   * Renders the static maze structure: pedestals, corridors, and barriers.
   */
  renderMazeBase() {
    this.mazeGraphics.clear();

    // 1. Draw passage channels between connected nodes
    for (let c = 0; c < this.cols; c++) {
      for (let r = 0; r < this.rows; r++) {
        const cell = this.grid[c][r];

        // Horizontal passage to the right
        if (c < this.cols - 1) {
          const next = this.grid[c + 1][r];
          if (!cell.walls.right) {
            // Open passage
            this.mazeGraphics.fillStyle(0x132238, 1);
            this.mazeGraphics.fillRect(cell.x, cell.y - 12, this.cellW, 24);
          } else {
            // Blocked barrier
            this.mazeGraphics.fillStyle(0x0a1422, 0.8);
            this.mazeGraphics.fillRect(cell.x + 22, cell.y - 10, this.cellW - 44, 20);
            this.mazeGraphics.lineStyle(1.5, 0x1e334d, 0.9);
            this.mazeGraphics.strokeRect(cell.x + 22, cell.y - 10, this.cellW - 44, 20);
          }
        }

        // Vertical passage downwards
        if (r < this.rows - 1) {
          const next = this.grid[c][r + 1];
          if (!cell.walls.bottom) {
            // Open passage
            this.mazeGraphics.fillStyle(0x132238, 1);
            this.mazeGraphics.fillRect(cell.x - 12, cell.y, 24, this.cellH);
          } else {
            // Blocked barrier
            this.mazeGraphics.fillStyle(0x0a1422, 0.8);
            this.mazeGraphics.fillRect(cell.x - 10, cell.y + 22, 20, this.cellH - 44);
            this.mazeGraphics.lineStyle(1.5, 0x1e334d, 0.9);
            this.mazeGraphics.strokeRect(cell.x - 10, cell.y + 22, 20, this.cellH - 44);
          }
        }
      }
    }

    // 2. Draw square node pedestals
    for (let c = 0; c < this.cols; c++) {
      for (let r = 0; r < this.rows; r++) {
        const cell = this.grid[c][r];

        // Outer block
        this.mazeGraphics.fillStyle(0x1a2b42, 1);
        this.mazeGraphics.fillRoundedRect(cell.x - 22, cell.y - 22, 44, 44, 6);
        this.mazeGraphics.lineStyle(1.5, 0x33557a, 1);
        this.mazeGraphics.strokeRoundedRect(cell.x - 22, cell.y - 22, 44, 44, 6);

        // Center rivet
        this.mazeGraphics.fillStyle(0x0e1b2d, 1);
        this.mazeGraphics.fillRoundedRect(cell.x - 12, cell.y - 12, 24, 24, 3);
      }
    }

    // 3. Start Entrance (Orange power boot at top of start node)
    const startObj = this.grid[this.startCell.c][this.startCell.r];
    this.mazeGraphics.fillStyle(0xff6600, 1);
    this.mazeGraphics.fillRoundedRect(startObj.x - 14, startObj.y - 48, 28, 28, 5);
    this.mazeGraphics.lineStyle(2, 0xffcc00, 1);
    this.mazeGraphics.strokeRoundedRect(startObj.x - 14, startObj.y - 48, 28, 28, 5);
    // Wire connection to start cell
    this.mazeGraphics.fillStyle(0xffffff, 1);
    this.mazeGraphics.fillRect(startObj.x - 4, startObj.y - 22, 8, 22);

    // 4. Exit Receiver (Glowing target terminal at exit node)
    const exitObj = this.grid[this.exitCell.c][this.exitCell.r];
    this.mazeGraphics.fillStyle(0xff6600, 1);
    this.mazeGraphics.fillRoundedRect(exitObj.x - 16, exitObj.y + 22, 32, 30, 6);
    this.mazeGraphics.lineStyle(2, 0xffdd00, 1);
    this.mazeGraphics.strokeRoundedRect(exitObj.x - 16, exitObj.y + 22, 32, 30, 6);

    // Concentric target rings around the exit
    this.mazeGraphics.lineStyle(2, 0x00ffcc, 0.7);
    this.mazeGraphics.strokeCircle(exitObj.x, exitObj.y, 24);
    this.mazeGraphics.lineStyle(1, 0x00ffcc, 0.4);
    this.mazeGraphics.strokeCircle(exitObj.x, exitObj.y, 32);
  }

  /**
   * Redraws the player's active light beam trail and updates the cursor head.
   */
  updateBeam() {
    this.beamGraphics.clear();

    if (this.playerPath.length === 0) return;

    // 1. Draw outer cyan glow aura
    this.beamGraphics.lineStyle(22, 0x00ffff, 0.35);
    this.beamGraphics.beginPath();
    for (let i = 0; i < this.playerPath.length; i++) {
      const pt = this.grid[this.playerPath[i].c][this.playerPath[i].r];
      if (i === 0) {
        this.beamGraphics.moveTo(pt.x, pt.y - 28); // Connect to top plug
        this.beamGraphics.lineTo(pt.x, pt.y);
      } else {
        this.beamGraphics.lineTo(pt.x, pt.y);
      }
    }
    this.beamGraphics.strokePath();

    // 2. Draw solid bright white/cyan core beam
    this.beamGraphics.lineStyle(12, 0xffffff, 0.95);
    this.beamGraphics.beginPath();
    for (let i = 0; i < this.playerPath.length; i++) {
      const pt = this.grid[this.playerPath[i].c][this.playerPath[i].r];
      if (i === 0) {
        this.beamGraphics.moveTo(pt.x, pt.y - 28);
        this.beamGraphics.lineTo(pt.x, pt.y);
      } else {
        this.beamGraphics.lineTo(pt.x, pt.y);
      }
    }
    this.beamGraphics.strokePath();

    // 3. Position the glowing cursor head at the active tip
    const headObj = this.grid[this.currentPos.c][this.currentPos.r];
    this.cursorHead.setPosition(headObj.x, headObj.y);
    this.cursorHead.setVisible(true);
  }

  /**
   * Initializes both Keyboard and Mouse/Touch input systems.
   */
  initControls() {
    // 1. Keyboard Controls (Arrow keys & WASD / ZQSD according to user settings)
    const layout = gameState.getFlag("movementLayout") || "ZQSD";

    this.onKeyDown = (event) => {
      if (!this.scene || !this.visible || this.isFinished || this.isFailed) return;

      if (event.key === "Escape") {
        event.preventDefault();
        this.close();
        return;
      }

      let dir = null;
      if (layout === "WASD") {
        if (event.key === "ArrowUp" || event.key === "w" || event.key === "W") {
          dir = "top";
        } else if (event.key === "ArrowDown" || event.key === "s" || event.key === "S") {
          dir = "bottom";
        } else if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") {
          dir = "left";
        } else if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") {
          dir = "right";
        }
      } else {
        // ZQSD (AZERTY layout)
        if (event.key === "ArrowUp" || event.key === "z" || event.key === "Z") {
          dir = "top";
        } else if (event.key === "ArrowDown" || event.key === "s" || event.key === "S") {
          dir = "bottom";
        } else if (event.key === "ArrowLeft" || event.key === "q" || event.key === "Q") {
          dir = "left";
        } else if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") {
          dir = "right";
        }
      }

      if (dir) {
        event.preventDefault();
        this.moveDirection(dir);
      }
    };

    if (this.scene && this.scene.input && this.scene.input.keyboard) {
      this.scene.input.keyboard.on("keydown", this.onKeyDown);
    }

    // 2. Mouse / Touch Controls (Clicking & Dragging across adjacent nodes)
    this.cellHitZones = [];
    for (let c = 0; c < this.cols; c++) {
      for (let r = 0; r < this.rows; r++) {
        const cell = this.grid[c][r];
        const zone = this.scene.add
          .zone(cell.x, cell.y, this.cellW - 8, this.cellH - 8)
          .setInteractive({ useHandCursor: true });

        zone.on("pointerdown", () => {
          if (this.isFinished || this.isFailed) return;
          this.isDragging = true;
          this.tryMoveTo(cell.c, cell.r);
        });

        zone.on("pointerover", () => {
          if (this.isFinished || this.isFailed) return;
          if (this.isDragging) {
            this.tryMoveTo(cell.c, cell.r);
          }
        });

        this.add(zone);
        this.cellHitZones.push(zone);
      }
    }

    this.onPointerUp = () => {
      this.isDragging = false;
    };
    this.scene.input.on("pointerup", this.onPointerUp);
  }

  /**
   * Attempts to move in a cardinal direction from the current node.
   * @param {string} dir 'top' | 'bottom' | 'left' | 'right'
   */
  moveDirection(dir) {
    const { c, r } = this.currentPos;
    let nextC = c;
    let nextR = r;

    if (dir === "top") nextR = r - 1;
    else if (dir === "bottom") nextR = r + 1;
    else if (dir === "left") nextC = c - 1;
    else if (dir === "right") nextC = c + 1;

    this.tryMoveTo(nextC, nextR);
  }

  /**
   * Validates and executes movement to an adjacent cell (or backtracks).
   * @param {number} targetC
   * @param {number} targetR
   */
  tryMoveTo(targetC, targetR) {
    if (this.isFinished || this.isFailed) return;

    // Bounds check
    if (targetC < 0 || targetC >= this.cols || targetR < 0 || targetR >= this.rows) return;

    const { c, r } = this.currentPos;

    // Case 1: Already on target cell
    if (targetC === c && targetR === r) return;

    // Case 2: Backtracking to the previous node on the path
    if (this.playerPath.length >= 2) {
      const prev = this.playerPath[this.playerPath.length - 2];
      if (prev.c === targetC && prev.r === targetR) {
        this.playerPath.pop();
        this.currentPos = { c: targetC, r: targetR };
        this.updateBeam();
        return;
      }
    }

    // Case 3: Moving to a neighbor - must be immediately adjacent
    const isAdjacent = Math.abs(targetC - c) + Math.abs(targetR - r) === 1;
    if (!isAdjacent) return;

    // Check if passage wall is open
    const current = this.grid[c][r];
    let isOpen = false;
    if (targetC === c && targetR === r - 1) isOpen = !current.walls.top;
    else if (targetC === c && targetR === r + 1) isOpen = !current.walls.bottom;
    else if (targetC === c - 1 && targetR === r) isOpen = !current.walls.left;
    else if (targetC === c + 1 && targetR === r) isOpen = !current.walls.right;

    if (isOpen) {
      this.currentPos = { c: targetC, r: targetR };
      this.playerPath.push({ c: targetC, r: targetR });
      this.updateBeam();

      // Check for victory
      if (targetC === this.exitCell.c && targetR === this.exitCell.r) {
        this.handleSuccess();
      }
    }
  }

  /**
   * Starts the countdown timer and updates progress UI.
   */
  startTimer() {
    this.timerEvent = this.scene.time.addEvent({
      delay: 100,
      repeat: -1,
      callback: () => {
        if (this.isFinished || this.isFailed) return;

        this.timeRemaining -= 0.1;
        if (this.timeRemaining <= 0) {
          this.timeRemaining = 0;
          this.handleTimeout();
        }

        const pct = Math.max(0, this.timeRemaining / this.timeLimit);
        this.timerBar.displayWidth = 860 * pct;

        // Color transitions: Cyan -> Yellow -> Pulsing Red
        if (this.timeRemaining > 10) {
          this.timerBar.setFillStyle(0x00ffcc);
          this.timerText.setColor("#00ffcc");
        } else if (this.timeRemaining > 5) {
          this.timerBar.setFillStyle(0xffdd00);
          this.timerText.setColor("#ffdd00");
        } else {
          this.timerBar.setFillStyle(0xff3344);
          this.timerText.setColor("#ff3344");
        }

        this.timerText.setText(`⏱️ TEMPS RESTANT : ${this.timeRemaining.toFixed(1)} s`);
      },
    });
  }

  /**
   * Handles timeout failure with security alarm and Retry prompt.
   */
  handleTimeout() {
    this.isFailed = true;
    if (this.timerEvent) this.timerEvent.remove();

    // Red flash outline on console
    this.consoleFrame.setStrokeStyle(3, 0xff3344);

    // Failure modal overlay
    this.failOverlay = this.scene.add.container(this.winX, this.winY + 38);
    this.failOverlay.setDepth(1300);

    const failBg = this.scene.add
      .rectangle(0, 0, 520, 240, 0x180b12, 0.96)
      .setStrokeStyle(2, 0xff3344);

    const failTitle = this.scene.add
      .text(0, -65, "🚨 ALARME DE SÉCURITÉ DÉCLENCHÉE", {
        fontFamily: "Arial, sans-serif",
        fontSize: "16px",
        fontStyle: "bold",
        color: "#ff3344",
      })
      .setOrigin(0.5);

    const failDesc = this.scene.add
      .text(
        0,
        -18,
        "Temps de dérivation écoulé !\nLe pare-feu du sas a réinitialisé la séquence de cryptage.",
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "13px",
          color: "#f87171",
          align: "center",
        }
      )
      .setOrigin(0.5);

    // Retry Button (Regenerates a fresh random maze)
    const retryBtn = this.scene.add
      .rectangle(-110, 55, 170, 40, 0xd97706)
      .setStrokeStyle(1.5, 0xffffff)
      .setInteractive({ useHandCursor: true });

    const retryText = this.scene.add
      .text(-110, 55, "🔄 Réessayer", {
        fontFamily: "Arial, sans-serif",
        fontSize: "14px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    retryBtn.on("pointerover", () => retryBtn.setFillStyle(0xb45309));
    retryBtn.on("pointerout", () => retryBtn.setFillStyle(0xd97706));
    retryBtn.on("pointerdown", () => this.restart());

    // Cancel Button
    const cancelBtn = this.scene.add
      .rectangle(110, 55, 170, 40, 0x334155)
      .setStrokeStyle(1.5, 0x64748b)
      .setInteractive({ useHandCursor: true });

    const cancelText = this.scene.add
      .text(110, 55, "❌ Abandonner", {
        fontFamily: "Arial, sans-serif",
        fontSize: "14px",
        fontStyle: "bold",
        color: "#cbd5e1",
      })
      .setOrigin(0.5);

    cancelBtn.on("pointerover", () => cancelBtn.setFillStyle(0x475569));
    cancelBtn.on("pointerout", () => cancelBtn.setFillStyle(0x334155));
    cancelBtn.on("pointerdown", () => this.close());

    this.failOverlay.add([failBg, failTitle, failDesc, retryBtn, retryText, cancelBtn, cancelText]);
    this.add(this.failOverlay);
  }

  /**
   * Handles successful completion of the maze.
   */
  handleSuccess() {
    this.isFinished = true;
    if (this.timerEvent) {
      this.timerEvent.remove();
      this.timerEvent = null;
    }

    if (this.scene && this.scene.tweens) {
      this.scene.tweens.killTweensOf(this.cursorHead);
    }
    this.headTween = null;

    // Green celebration glow
    this.consoleFrame.setStrokeStyle(3, 0x00ff88);
    this.screenBg.setStrokeStyle(2, 0x00ff88);

    // Success banner
    this.successBanner = this.scene.add.container(this.winX, this.winY + 38);
    this.successBanner.setDepth(1300);

    const bannerBg = this.scene.add
      .rectangle(0, 0, 580, 100, 0x062817, 0.95)
      .setStrokeStyle(2, 0x00ff88);

    const bannerText = this.scene.add
      .text(
        0,
        -12,
        "🔓 CIRCUIT DÉRIVÉ AVEC SUCCÈS !",
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "17px",
          fontStyle: "bold",
          color: "#00ff88",
        }
      )
      .setOrigin(0.5);

    const subText = this.scene.add
      .text(
        0,
        18,
        "Le sas des Archives Secrètes est déverrouillé. Redirection en cours...",
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "12px",
          color: "#a7f3d0",
        }
      )
      .setOrigin(0.5);

    this.successBanner.add([bannerBg, bannerText, subText]);
    this.add(this.successBanner);

    // Bounce animation on success banner
    this.scene.tweens.add({
      targets: this.successBanner,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 180,
      yoyo: true,
      ease: "Back.easeOut",
    });

    const successCb = this.onSuccess;
    const targetScene = this.scene;

    // Automatically trigger onSuccess and close after delay
    targetScene.time.delayedCall(1200, () => {
      try {
        this.close();
      } catch (err) {
        console.warn("Error closing MazeModal:", err);
        this.destroy();
      }
      if (typeof successCb === "function") {
        successCb();
      }
    });
  }

  /**
   * Resets and restarts the minigame with a brand-new procedurally generated maze.
   */
  restart() {
    if (this.failOverlay) {
      this.failOverlay.destroy();
      this.failOverlay = null;
    }

    this.consoleFrame.setStrokeStyle(3, 0x00d2ff);
    this.isFailed = false;
    this.isFinished = false;
    this.isDragging = false;
    this.timeRemaining = this.timeLimit;

    this.initMaze();
    this.startTimer();
  }

  /**
   * Cleans up listeners, timers, tweens, and destroys the container.
   */
  close() {
    if (this.timerEvent) {
      this.timerEvent.remove();
      this.timerEvent = null;
    }

    if (this.scene && this.scene.tweens) {
      if (this.cursorHead) this.scene.tweens.killTweensOf(this.cursorHead);
      if (this.successBanner) this.scene.tweens.killTweensOf(this.successBanner);
    }
    this.headTween = null;

    if (this.scene && this.scene.input) {
      if (this.scene.input.keyboard && this.onKeyDown) {
        this.scene.input.keyboard.off("keydown", this.onKeyDown);
        this.onKeyDown = null;
      }
      if (this.onPointerUp) {
        this.scene.input.off("pointerup", this.onPointerUp);
        this.onPointerUp = null;
      }
    }

    const onCloseCb = this.onClose;
    this.destroy();
    if (typeof onCloseCb === "function") {
      onCloseCb();
    }
  }
}

