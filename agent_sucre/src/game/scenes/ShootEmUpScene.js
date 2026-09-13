import * as Phaser from "phaser";
import { Scene, Math as PMath, Utils, Input } from "phaser";
import { gameState } from "../state/GameState.js";
import { AgentAvatar } from "../components/AgentAvatar.js";

/**
 * Runner & Shoot 'Em Up mini-game triggered when Infiltration drops to 0.
 * Agent Sucre flees through the corridors of the institute, dodging low/high obstacles
 * and shooting pursuers with the Éclair Laser.
 */
export class ShootEmUpScene extends Scene {
  constructor() {
    super({ key: "ShootEmUpScene" });
  }

  init(data) {
    this.originScene = data?.originScene || "GenericMapScene";
    this.dialogId = data?.dialogId || null;
    this.roomReturnId = data?.roomReturnId || null;

    // Mini-game configuration & progression variables
    this.isGameStarted = false; // Game begins once the player dismisses the briefing modal
    this.targetDuration = 35; // 35 seconds to reach safe ventilation duct
    this.elapsedTime = 0;
    this.playerHealth = 3;
    this.maxHealth = 3;
    this.timesHit = 0; // Tracks total hits taken during the run
    this.enemiesDefeated = 0;
    this.obstaclesAvoided = 0;
    this.isGameOver = false;
    this.isVictory = false;

    // Movement & physics variables
    this.floorY = 730;
    this.playerGroundY = 650;
    this.playerX = 850;
    this.playerY = this.playerGroundY;
    this.playerVy = 0;
    this.gravity = 1800;
    this.jumpForce = -760;
    this.isJumping = false;
    this.isCrouching = false;

    // Shooting & Ammo system (3 shots magazine, 1.8s reload, 0.75s cooldown)
    this.maxAmmo = 3;
    this.currentAmmo = 3;
    this.isReloading = false;
    this.reloadDuration = 1800; // ms to reload 3 bullets
    this.reloadStartTime = 0;
    this.lastShotTime = 0;
    this.shootCooldown = 750; // ms between laser shots (0.75s)
    this.lastEmptyClickTime = 0;
    this.lastBackwardsFireTime = 0; // Timestamp of last Space backwards shot
    this.crosshair = null;

    // Flying Bonus Hearts system (3 to 5 hearts across the run)
    this.bonusHearts = [];
    this.totalBonusHearts = Phaser.Math.Between(3, 5);
    this.heartSpawnSchedule = [];
    const minHeartTime = 5;
    const maxHeartTime = 29;
    const heartInterval = (maxHeartTime - minHeartTime) / this.totalBonusHearts;
    for (let i = 0; i < this.totalBonusHearts; i++) {
      const spawnAt =
        minHeartTime +
        i * heartInterval +
        Phaser.Math.FloatBetween(0.5, Math.max(1, heartInterval - 0.5));
      this.heartSpawnSchedule.push(spawnAt);
    }

    // Spawning timers
    this.obstacleSpawnTimer = 0;
    this.nextObstacleDelay = 2200; // ms
    this.pursuerSpawnTimer = 0;
    this.nextPursuerDelay = 2800; // ms

    // Entity collections
    this.bullets = [];
    this.pursuers = [];
    this.enemyProjectiles = [];
    this.obstacles = [];
    this.speedlines = [];
    this.invulnerableUntil = 0;
    this.defeatRedirectTimer = null;
    this.briefingModal = null;
  }

  create() {
    this.cameras.main.setBackgroundColor(0x050811);
    this.cameras.main.fadeIn(400, 0, 0, 0);

    // 1. Environment & Parallax Scrolling Background
    this.createEnvironment();

    // 2. Speedlines & High-Speed Atmosphere
    this.createSpeedlines();

    // 3. Player (Agent Sucre with Éclair Laser)
    this.createPlayer();

    // 4. Emergency Alarm Beacon Lights
    this.createAlarmBeacons();

    // 5. HUD Display (Distance, Health, Ammo, Score, Controls Reminder)
    this.createHUD();

    // 6. Aiming Reticle (Crosshair)
    this.createCrosshair();

    // 7. Keyboard & Mouse Input Handlers
    this.setupInputs();

    // 8. Pre-run Briefing modal presenting game controls
    this.showStartBriefingModal();
  }

  /* ========================================================================== */
  /* ENVIRONMENT & PARALLAX SCROLLING SETUP                                     */
  /* ========================================================================== */

  createEnvironment() {
    // Upper corridor ceiling & background metal wall
    this.bgWall = this.add.rectangle(960, 360, 1920, 720, 0x0a101f);

    // Hazard caution stripes along the corridor top
    this.stripeGraphics = this.add.graphics();
    this.stripeOffset = 0;
    this.drawHazardStripes();

    // Background wall vertical conduits
    this.wallPipes = [];
    for (let i = 0; i < 7; i++) {
      const pipe = this.add
        .rectangle(i * 340 + 100, 320, 22, 580, 0x162238)
        .setAlpha(0.65);
      this.wallPipes.push(pipe);
    }

    // High-tech wall alarm panels
    this.wallPanels = [];
    for (let i = 0; i < 4; i++) {
      const panel = this.add.container(i * 540 + 200, 300);
      const box = this.add
        .rectangle(0, 0, 160, 90, 0x07111e, 0.9)
        .setStrokeStyle(1.5, 0x00d2ff, 0.5);
      const text = this.add
        .text(0, -15, "🚨 ALERTE BRIGADE", {
          fontFamily: "Courier, monospace",
          fontSize: "11px",
          color: "#ff3344",
          fontStyle: "bold",
        })
        .setOrigin(0.5);
      const graph = this.add
        .rectangle(0, 15, 120, 20, 0x1f293d)
        .setStrokeStyle(1, 0x00ffcc, 0.4);
      panel.add([box, text, graph]);
      this.wallPanels.push(panel);
    }

    // Floor area (y: 730 to 980)
    this.floorBg = this.add.rectangle(960, 855, 1920, 250, 0x111625);
    this.floorTopBorder = this.add
      .rectangle(960, 730, 1920, 6, 0x00d2ff, 0.9)
      .setDepth(15);

    // Dynamic checkered kitchen floor tiles
    this.floorTiles = [];
    this.tileSpacing = 120;
    for (let x = -this.tileSpacing; x < 1920 + this.tileSpacing * 2; x += this.tileSpacing) {
      const tile = this.add.container(x, 830);
      const t1 = this.add.rectangle(0, -35, 100, 60, 0x1a233a, 0.85);
      const t2 = this.add.rectangle(55, 35, 100, 60, 0x222e4d, 0.85);
      const t3 = this.add.rectangle(-55, 35, 100, 60, 0x151d30, 0.85);
      const line = this.add.rectangle(0, 70, 110, 4, 0x00d2ff, 0.3);
      tile.add([t1, t2, t3, line]);
      tile.setDepth(10);
      this.floorTiles.push(tile);
    }
  }

  drawHazardStripes() {
    this.stripeGraphics.clear();
    const width = 1920;
    const height = 28;
    const y = 30;
    const stripeW = 40;

    this.stripeGraphics.fillStyle(0x1a1a00, 0.9);
    this.stripeGraphics.fillRect(0, y, width, height);

    this.stripeGraphics.fillStyle(0xffaa00, 0.85);
    for (let x = -stripeW * 2; x < width + stripeW * 2; x += stripeW * 2) {
      const drawX = x + (this.stripeOffset % (stripeW * 2));
      this.stripeGraphics.beginPath();
      this.stripeGraphics.moveTo(drawX, y);
      this.stripeGraphics.lineTo(drawX + stripeW, y);
      this.stripeGraphics.lineTo(drawX, y + height);
      this.stripeGraphics.lineTo(drawX - stripeW, y + height);
      this.stripeGraphics.closePath();
      this.stripeGraphics.fillPath();
    }
  }

  createSpeedlines() {
    this.speedlineColors = [0x00d2ff, 0xffffff, 0xffaa00, 0x38bdf8];
    for (let i = 0; i < 25; i++) {
      const line = this.add.rectangle(
        PMath.Between(0, 1920),
        PMath.Between(60, 720),
        PMath.Between(120, 320),
        PMath.Between(2, 4),
        Utils.Array.GetRandom(this.speedlineColors),
        PMath.FloatBetween(0.2, 0.6)
      );
      line.speed = PMath.Between(900, 1600);
      line.setDepth(12);
      this.speedlines.push(line);
    }
  }

  createAlarmBeacons() {
    // Red emergency alarm beacons in corners
    this.alarmLightLeft = this.add
      .circle(120, 80, 100, 0xff0033, 0.35)
      .setDepth(5);
    this.alarmLightRight = this.add
      .circle(1800, 80, 100, 0xff0033, 0.35)
      .setDepth(5);

    this.tweens.add({
      targets: [this.alarmLightLeft, this.alarmLightRight],
      alpha: { from: 0.15, to: 0.75 },
      scale: { from: 0.8, to: 1.3 },
      duration: 380,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // Ambient alarm banner in top center
    this.alarmBanner = this.add
      .text(960, 78, "🚨 ALERTE GÉNÉRALE : INFILTRATION DÉTECTÉE - INTERCEPTION IMMÉDIATE 🚨", {
        fontFamily: "Arial, sans-serif",
        fontSize: "14px",
        fontStyle: "bold",
        color: "#ff3344",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(50);

    this.tweens.add({
      targets: this.alarmBanner,
      alpha: { from: 0.4, to: 1 },
      duration: 300,
      yoyo: true,
      repeat: -1,
    });
  }

  /* ========================================================================== */
  /* PLAYER SETUP & CONTROLS                                                   */
  /* ========================================================================== */

  createPlayer() {
    this.playerContainer = this.add.container(this.playerX, this.playerY);
    this.playerContainer.setDepth(40);

    // Chibi Agent Avatar
    this.avatar = new AgentAvatar(this, 0, 0, {
      scale: 0.62,
      customization: gameState.getCustomization(),
    });

    // Attach Éclair Laser to the Agent's hand (pointing backward towards pursuers)
    this.eclairLaser = this.add.image(-25, 12, "item_eclair_laser");
    this.eclairLaser.setDisplaySize(54, 28);
    this.eclairLaser.setOrigin(0.3, 0.5);
    this.eclairLaser.setAngle(-175); // Default orientation towards pursuers behind

    // Glowing laser tip particle aura
    this.laserGlow = this.add
      .circle(-50, 14, 8, 0x00f3ff, 0.8)
      .setDepth(42);

    this.tweens.add({
      targets: this.laserGlow,
      scale: { from: 0.8, to: 1.3 },
      alpha: { from: 0.5, to: 1 },
      duration: 200,
      yoyo: true,
      repeat: -1,
    });

    // Shadow on the ground
    this.playerShadow = this.add
      .ellipse(this.playerX, this.floorY, 70, 16, 0x000000, 0.45)
      .setDepth(15);

    this.playerContainer.add([this.avatar, this.eclairLaser, this.laserGlow]);

    // Running bounce tween
    this.runningBounceTween = this.tweens.add({
      targets: this.avatar,
      y: { from: 0, to: -8 },
      scaleX: { from: 0.62, to: 0.64 },
      scaleY: { from: 0.62, to: 0.59 },
      duration: 160,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  createCrosshair() {
    this.crosshair = this.add.container(960, 490).setDepth(250);
    const ring = this.add
      .circle(0, 0, 15, 0x00f3ff, 0.15)
      .setStrokeStyle(1.5, 0x00f3ff, 0.9);
    const dot = this.add.circle(0, 0, 2.5, 0xffffff, 1);
    const lineT = this.add.line(0, 0, 0, -6, 0, -16, 0x00f3ff, 0.85);
    const lineB = this.add.line(0, 0, 0, 6, 0, 16, 0x00f3ff, 0.85);
    const lineL = this.add.line(0, 0, -6, 0, -16, 0, 0x00f3ff, 0.85);
    const lineR = this.add.line(0, 0, 6, 0, 16, 0, 0x00f3ff, 0.85);
    this.crosshair.add([ring, dot, lineT, lineB, lineL, lineR]);
    this.crosshair.setVisible(false);
  }

  setupInputs() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyZ = this.input.keyboard.addKey("Z");
    this.keyQ = this.input.keyboard.addKey("Q");
    this.keyS = this.input.keyboard.addKey("S");
    this.keyD = this.input.keyboard.addKey("D");
    this.keyW = this.input.keyboard.addKey("W");
    this.keyA = this.input.keyboard.addKey("A");
    this.keyR = this.input.keyboard.addKey("R");
    this.spaceKey = this.input.keyboard.addKey("SPACE");

    // Manual reload hotkey
    this.keyR.on("down", () => {
      if (this.isGameStarted && !this.isGameOver && !this.isVictory) {
        this.startReload();
      }
    });

    // Space key: Shoots directly backwards towards pursuing chefs behind
    this.spaceKey.on("down", () => {
      if (!this.isGameStarted || this.isGameOver || this.isVictory) return;
      this.lastBackwardsFireTime = this.time.now;
      if (this.eclairLaser) {
        this.eclairLaser.setRotation(Math.PI);
      }
      this.attemptFireLaser(this.playerContainer.x - 600, this.playerContainer.y + 14);
    });

    // Mouse click: Shoots towards mouse pointer location (aim at hearts or obstacles)
    this.input.on("pointerdown", (pointer) => {
      if (!this.isGameStarted || this.isGameOver || this.isVictory) return;
      this.attemptFireLaser(pointer.x, pointer.y);
    });
  }

  /* ========================================================================== */
  /* START BRIEFING MODAL                                                       */
  /* ========================================================================== */

  showStartBriefingModal() {
    this.isGameStarted = false;

    this.briefingModal = this.add.container(960, 490).setDepth(600);

    const bgDim = this.add
      .rectangle(0, 0, 1920, 980, 0x000000, 0.82)
      .setInteractive();

    const card = this.add
      .rectangle(0, 0, 900, 530, 0x0a101f, 0.98)
      .setStrokeStyle(3, 0x00d2ff);

    const title = this.add
      .text(0, -215, "🚨 ALERTE GÉNÉRALE : INFILTRATION COMPROMISE !", {
        fontFamily: "Arial Black, sans-serif",
        fontSize: "24px",
        color: "#ff3344",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    const subtitle = this.add
      .text(
        0,
        -170,
        "La brigade de sécurité fonce sur vous ! Fuyez à travers les couloirs pour atteindre la sortie de secours.",
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "14px",
          color: "#94a3b8",
          align: "center",
        }
      )
      .setOrigin(0.5);

    // Section 1: Déplacement & Évasion
    const sec1Title = this.add
      .text(-400, -120, "🏃 DÉPLACEMENT & ÉVASION :", {
        fontFamily: "Arial, sans-serif",
        fontSize: "15px",
        fontStyle: "bold",
        color: "#00ffcc",
      })
      .setOrigin(0, 0.5);

    const sec1Text = this.add
      .text(
        -400,
        -75,
        "• ⬆️ [HAUT / Z] : Sauter par-dessus les obstacles bas (chariots)\n• ⬇️ [BAS / S] : Se baisser / Glisser sous les obstacles hauts (vapeur)\n• ⬅️ ➡️ [GAUCHE / DROITE / Q / D] : Ajuster votre position sur la piste",
        {
          fontFamily: "Courier, monospace",
          fontSize: "13px",
          color: "#ffffff",
          lineSpacing: 5,
        }
      )
      .setOrigin(0, 0.5);

    // Section 2: Armement & Munitions
    const sec2Title = this.add
      .text(-400, -5, "🎯 DÉFENSE (ÉCLAIR LASER) :", {
        fontFamily: "Arial, sans-serif",
        fontSize: "15px",
        fontStyle: "bold",
        color: "#00f3ff",
      })
      .setOrigin(0, 0.5);

    const sec2Text = this.add
      .text(
        -400,
        40,
        "• [ESPACE] : Tir direct en arrière vers les poursuivants\n• [CLIC SOURIS] : Tir vers le curseur (viser les cœurs volants)\n• Chargeur : 3 tirs consécutifs (0.75s)  |  🔄 [TOUCHE R] : Recharger (1.8s)",
        {
          fontFamily: "Courier, monospace",
          fontSize: "13px",
          color: "#ffffff",
          lineSpacing: 5,
        }
      )
      .setOrigin(0, 0.5);

    // Section 3: Cœurs volants bonus
    const sec3Title = this.add
      .text(-400, 110, "💖 CŒURS VOLANTS BONUS :", {
        fontFamily: "Arial, sans-serif",
        fontSize: "15px",
        fontStyle: "bold",
        color: "#ff3366",
      })
      .setOrigin(0, 0.5);

    const sec3Text = this.add
      .text(
        -400,
        145,
        "• Des cœurs traversent le couloir en hauteur : TIREZ DESSUS pour récupérer +1 ❤️ !\n• RÉCOMPENSE : 100% infiltration si 0 dégât  |  75% si 3/3 cœurs finaux  |  50% standard",
        {
          fontFamily: "Courier, monospace",
          fontSize: "12px",
          color: "#ffccdd",
          lineSpacing: 4,
        }
      )
      .setOrigin(0, 0.5);

    // Start Button
    const startBtn = this.add
      .rectangle(0, 210, 360, 48, 0x15803d, 0.95)
      .setStrokeStyle(2, 0x00ff88)
      .setInteractive({ useHandCursor: true });

    const startText = this.add
      .text(0, 210, "🏃 COMMENCER LA FUITE [ ESPACE ]", {
        fontFamily: "Arial, sans-serif",
        fontSize: "16px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    startBtn.on("pointerover", () => startBtn.setFillStyle(0x16a34a, 1));
    startBtn.on("pointerout", () => startBtn.setFillStyle(0x15803d, 0.95));

    const confirmStart = () => {
      if (this.isGameStarted) return;
      if (this.briefingModal) {
        this.briefingModal.destroy();
        this.briefingModal = null;
      }
      this.startGameAction();
    };

    startBtn.on("pointerdown", confirmStart);

    this.briefingModal.add([
      bgDim,
      card,
      title,
      subtitle,
      sec1Title,
      sec1Text,
      sec2Title,
      sec2Text,
      sec3Title,
      sec3Text,
      startBtn,
      startText,
    ]);

    // Space or Enter key starts the run
    const onBriefingKey = (e) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        this.input.keyboard.off("keydown", onBriefingKey);
        confirmStart();
      }
    };
    this.input.keyboard.on("keydown", onBriefingKey);
  }

  startGameAction() {
    if (this.isGameStarted) return;
    this.isGameStarted = true;
    // Grace period so starting Space key does not consume ammo or fire a laser
    this.lastShotTime = this.time.now + 350;

    this.showFloatingText(this.playerX, this.playerY - 80, "🚨 FUYEZ !", "#ff3344");

    // Spawn initial pursuer behind player after a brief suspense delay
    this.time.delayedCall(1200, () => {
      if (!this.isGameOver && !this.isVictory) {
        this.spawnPursuer();
      }
    });
  }

  /* ========================================================================== */
  /* HUD CREATION                                                              */
  /* ========================================================================== */

  createHUD() {
    this.hudContainer = this.add.container(0, 0).setDepth(200);

    // 1. Health Hearts (Top Left) - Added BEFORE hearts so bg stays behind!
    const hpCardX = 180;
    const hpCardY = 36;
    const hpCardW = 210;
    const hpCardH = 46;

    const hpCardBg = this.add
      .rectangle(hpCardX, hpCardY, hpCardW, hpCardH, 0x0e1726, 0.94)
      .setStrokeStyle(1.5, 0xff3366);

    this.hpLabel = this.add
      .text(hpCardX - hpCardW / 2 + 15, hpCardY, "VITALITÉ :", {
        fontFamily: "Arial, sans-serif",
        fontSize: "12px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0, 0.5);

    // Add background and label first
    this.hudContainer.add([hpCardBg, this.hpLabel]);

    // Add hearts on top of background
    this.heartTexts = [];
    for (let i = 0; i < 3; i++) {
      const heart = this.add
        .text(hpCardX + 15 + i * 32, hpCardY, "❤️", {
          fontSize: "22px",
        })
        .setOrigin(0.5);
      this.heartTexts.push(heart);
      this.hudContainer.add(heart);
    }

    // 2. Ammo Magazine HUD (Top Left-Center)
    const ammoCardX = 440;
    const ammoCardY = 36;
    const ammoCardW = 250;
    const ammoCardH = 46;

    const ammoCardBg = this.add
      .rectangle(ammoCardX, ammoCardY, ammoCardW, ammoCardH, 0x0e1726, 0.94)
      .setStrokeStyle(1.5, 0x00d2ff);

    const ammoLabel = this.add
      .text(ammoCardX - ammoCardW / 2 + 14, ammoCardY - 8, "ÉCLAIR :", {
        fontFamily: "Arial, sans-serif",
        fontSize: "12px",
        fontStyle: "bold",
        color: "#00f3ff",
      })
      .setOrigin(0, 0.5);

    this.ammoIcons = [];
    for (let i = 0; i < 3; i++) {
      const icon = this.add
        .text(ammoCardX - 10 + i * 26, ammoCardY - 8, "⚡", {
          fontSize: "18px",
        })
        .setOrigin(0.5);
      this.ammoIcons.push(icon);
    }

    this.ammoStatusText = this.add
      .text(ammoCardX, ammoCardY + 12, "PRÊT [3/3]", {
        fontFamily: "Courier, monospace",
        fontSize: "11px",
        fontStyle: "bold",
        color: "#00ffcc",
      })
      .setOrigin(0.5);

    this.hudContainer.add([
      ammoCardBg,
      ammoLabel,
      ...this.ammoIcons,
      this.ammoStatusText,
    ]);

    // 3. Top Escape Distance Progress Bar (Center)
    const distCardX = 1000;
    const distCardY = 36;
    const distCardW = 600;
    const distCardH = 46;

    const distCardBg = this.add
      .rectangle(distCardX, distCardY, distCardW, distCardH, 0x0e1726, 0.94)
      .setStrokeStyle(1.5, 0x00d2ff);

    this.distLabel = this.add
      .text(distCardX - distCardW / 2 + 18, distCardY - 10, "🏃 DISTANCE DE FUITE (SORTIE DE SECOURS)", {
        fontFamily: "Arial, sans-serif",
        fontSize: "12px",
        fontStyle: "bold",
        color: "#00ffcc",
      })
      .setOrigin(0, 0.5);

    this.distPercentText = this.add
      .text(distCardX + distCardW / 2 - 18, distCardY - 10, "0 % (1000m)", {
        fontFamily: "Courier, monospace",
        fontSize: "13px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(1, 0.5);

    this.distTrackW = 560;
    this.distTrackH = 10;
    const distTrack = this.add
      .rectangle(distCardX, distCardY + 11, this.distTrackW, this.distTrackH, 0x1f293d)
      .setOrigin(0.5);

    this.distFill = this.add
      .rectangle(
        distCardX - this.distTrackW / 2,
        distCardY + 11,
        2,
        this.distTrackH,
        0x00ff88
      )
      .setOrigin(0, 0.5);

    this.hudContainer.add([
      distCardBg,
      this.distLabel,
      this.distPercentText,
      distTrack,
      this.distFill,
    ]);

    // 4. Enemies Repelled Counter (Top Right)
    const scoreCardX = 1680;
    const scoreCardY = 36;
    const scoreCardW = 260;
    const scoreCardH = 46;

    const scoreCardBg = this.add
      .rectangle(scoreCardX, scoreCardY, scoreCardW, scoreCardH, 0x0e1726, 0.94)
      .setStrokeStyle(1.5, 0xffaa00);

    this.scoreText = this.add
      .text(scoreCardX, scoreCardY, "🚨 Poursuivants : 0", {
        fontFamily: "Arial, sans-serif",
        fontSize: "13px",
        fontStyle: "bold",
        color: "#ffdd00",
      })
      .setOrigin(0.5);

    this.hudContainer.add([scoreCardBg, this.scoreText]);

    // 5. Instructions Banner at the bottom
    const instBg = this.add
      .rectangle(960, 950, 1020, 36, 0x0a101d, 0.92)
      .setStrokeStyle(1.2, 0x00d2ff, 0.8);

    const instText = this.add
      .text(
        960,
        950,
        "⬆️ [HAUT / Z] : Sauter  |  ⬇️ [BAS / S] : Glisser  |  🎯 [ESPACE / CLIC] : Tir (~0.8s)  |  🔄 [R] : Recharger",
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "13px",
          fontStyle: "bold",
          color: "#00ffcc",
        }
      )
      .setOrigin(0.5);

    this.hudContainer.add([instBg, instText]);
  }

  /* ========================================================================== */
  /* GAME LOOP & TICK UPDATE                                                   */
  /* ========================================================================== */

  update(time, delta) {
    if (!this.isGameStarted || this.isGameOver || this.isVictory) return;

    const dt = delta / 1000;
    this.elapsedTime += dt;

    // Update Progress
    const progress = Math.min(1.0, this.elapsedTime / this.targetDuration);
    const distRemaining = Math.max(0, Math.round((1 - progress) * 1000));
    const percent = Math.round(progress * 100);

    this.distPercentText.setText(`${percent} % (${distRemaining}m)`);
    this.distFill.width = Math.max(2, progress * this.distTrackW);

    // Check Victory
    if (progress >= 1.0) {
      this.triggerVictory();
      return;
    }

    // Scroll Background & Floor
    this.scrollEnvironment(delta);

    // Handle Player Movement (Jump, Crouch, Lateral adjustments)
    this.handlePlayerMovement(delta);

    // Crosshair tracking with mouse cursor
    const pointer = this.input.activePointer;
    if (this.crosshair) {
      this.crosshair.setPosition(pointer.x, pointer.y);
      this.crosshair.setVisible(true);
    }

    // Continuously aim laser towards mouse cursor, unless recently fired backwards with Space (< 220ms)
    if (this.eclairLaser && this.time.now > this.lastBackwardsFireTime + 220) {
      const muzzleX = this.playerContainer.x - 25;
      const muzzleY = this.playerContainer.y + 12;
      const angle = PMath.Angle.Between(muzzleX, muzzleY, pointer.x, pointer.y);
      this.eclairLaser.setRotation(angle);
    }

    // Update Entities (Bullets, Bonus Hearts, Obstacles, Pursuers, Enemy Projectiles, Speedlines)
    this.updateBullets(dt);
    this.updateBonusHearts(dt);
    this.updateObstacles(dt);
    this.updatePursuers(dt);
    this.updateEnemyProjectiles(dt);
    this.updateSpeedlines(dt);

    // Check scheduled bonus heart spawns
    if (
      this.heartSpawnSchedule.length > 0 &&
      this.elapsedTime >= this.heartSpawnSchedule[0]
    ) {
      this.heartSpawnSchedule.shift();
      this.spawnBonusHeart();
    }

    // Periodic Spawners
    this.obstacleSpawnTimer += delta;
    if (this.obstacleSpawnTimer > this.nextObstacleDelay) {
      this.spawnObstacle();
      this.obstacleSpawnTimer = 0;
      this.nextObstacleDelay = PMath.Between(2100, 3100);
    }

    this.pursuerSpawnTimer += delta;
    if (this.pursuerSpawnTimer > this.nextPursuerDelay) {
      if (this.pursuers.length < 3) {
        this.spawnPursuer();
      }
      this.pursuerSpawnTimer = 0;
      this.nextPursuerDelay = PMath.Between(3000, 4500);
    }

    // Collisions
    this.checkCollisions();
  }

  /* ========================================================================== */
  /* SCROLLING LOGIC                                                           */
  /* ========================================================================== */

  scrollEnvironment(delta) {
    const scrollPx = (delta / 1000) * 520;

    // Top stripes
    this.stripeOffset += scrollPx * 0.7;
    this.drawHazardStripes();

    // Wall pipes
    this.wallPipes.forEach((pipe) => {
      pipe.x -= scrollPx * 0.4;
      if (pipe.x < -100) pipe.x += 1920 + 200;
    });

    // Wall panels
    this.wallPanels.forEach((panel) => {
      panel.x -= scrollPx * 0.55;
      if (panel.x < -200) panel.x += 1920 + 400;
    });

    // Floor checkered tiles
    this.floorTiles.forEach((tile) => {
      tile.x -= scrollPx;
      if (tile.x < -this.tileSpacing) {
        tile.x += 1920 + this.tileSpacing * 2;
      }
    });
  }

  updateSpeedlines(dt) {
    this.speedlines.forEach((line) => {
      line.x -= line.speed * dt;
      if (line.x < -200) {
        line.x = 1920 + PMath.Between(50, 400);
        line.y = PMath.Between(80, 710);
      }
    });
  }

  /* ========================================================================== */
  /* PLAYER MOVEMENT (JUMP & DUCK / SLIDE)                                      */
  /* ========================================================================== */

  handlePlayerMovement(delta) {
    const dt = delta / 1000;

    // 1. Horizontal movement (A/D or Q/D or Left/Right)
    let moveDirX = 0;
    if (this.cursors.left.isDown || this.keyQ.isDown || this.keyA.isDown) {
      moveDirX -= 1;
    }
    if (this.cursors.right.isDown || this.keyD.isDown) {
      moveDirX += 1;
    }

    this.playerX += moveDirX * 360 * dt;
    this.playerX = PMath.Clamp(this.playerX, 520, 1380);

    // 2. Ducking / Crouching (Down / S)
    const isDownPressed = this.cursors.down.isDown || this.keyS.isDown;
    if (isDownPressed && !this.isJumping) {
      this.isCrouching = true;
      this.playerY = this.playerGroundY + 35;
      this.playerContainer.setScale(1.2, 0.48); // Compressed crouch profile
      if (this.runningBounceTween) this.runningBounceTween.pause();

      // Ground slide spark particles
      if (Math.random() < 0.3) {
        this.createSparks(this.playerX, this.floorY, 0x00f3ff);
      }
    } else {
      if (this.isCrouching) {
        this.isCrouching = false;
        this.playerContainer.setScale(1.0, 1.0);
        if (this.runningBounceTween && !this.isJumping) {
          this.runningBounceTween.resume();
        }
      }
    }

    // 3. Jump (Up / Z / W)
    const isUpPressed =
      Input.Keyboard.JustDown(this.cursors.up) ||
      Input.Keyboard.JustDown(this.keyZ) ||
      Input.Keyboard.JustDown(this.keyW);

    if (isUpPressed && !this.isJumping && !this.isCrouching) {
      this.isJumping = true;
      this.playerVy = this.jumpForce;
      if (this.runningBounceTween) this.runningBounceTween.pause();

      // Jump dust puff
      this.createFlourPuff(this.playerX, this.floorY);
    }

    // Apply Gravity when Jumping
    if (this.isJumping) {
      this.playerVy += this.gravity * dt;
      this.playerY += this.playerVy * dt;

      // Landing on ground
      if (this.playerY >= this.playerGroundY) {
        this.playerY = this.playerGroundY;
        this.playerVy = 0;
        this.isJumping = false;
        if (this.runningBounceTween) this.runningBounceTween.resume();
        this.createFlourPuff(this.playerX, this.floorY);
      }
    } else if (!this.isCrouching) {
      this.playerY = this.playerGroundY;
    }

    // Update player container and shadow positions
    this.playerContainer.setPosition(this.playerX, this.playerY);
    this.playerShadow.setPosition(this.playerX, this.floorY);
    const shadowScale = PMath.Clamp(
      1.0 - (this.playerGroundY - this.playerY) / 300,
      0.4,
      1.2
    );
    this.playerShadow.setScale(shadowScale);
  }

  /* ========================================================================== */
  /* SHOOTING & AMMO (ÉCLAIR LASER)                                            */
  /* ========================================================================== */

  attemptFireLaser(targetX, targetY) {
    if (!this.isGameStarted || this.isGameOver || this.isVictory) return;

    if (this.isReloading) {
      if (this.time.now > this.lastEmptyClickTime + 700) {
        this.lastEmptyClickTime = this.time.now;
        this.showFloatingText(this.playerX, this.playerY - 60, "⚡ RECHARGEMENT...", "#f59e0b");
      }
      return;
    }

    if (this.currentAmmo <= 0) {
      this.startReload();
      return;
    }

    const now = this.time.now;
    if (now < this.lastShotTime + this.shootCooldown) {
      return;
    }

    this.currentAmmo -= 1;
    this.lastShotTime = now;
    this.fireLaser(targetX, targetY);
    this.updateAmmoHUD();

    if (this.currentAmmo <= 0) {
      this.startReload();
    }
  }

  startReload() {
    if (!this.isGameStarted || this.isGameOver || this.isVictory) return;
    if (this.isReloading || this.currentAmmo >= this.maxAmmo) return;

    this.isReloading = true;
    this.reloadStartTime = this.time.now;
    this.updateAmmoHUD();
    this.showFloatingText(this.playerX, this.playerY - 60, "⚡ Rechargement...", "#00d2ff");

    this.time.delayedCall(this.reloadDuration, () => {
      if (this.isGameOver || this.isVictory) return;
      this.currentAmmo = this.maxAmmo;
      this.isReloading = false;
      this.updateAmmoHUD();
      this.createSparks(this.playerContainer.x - 50, this.playerContainer.y + 14, 0x00f3ff);
      this.showFloatingText(this.playerX, this.playerY - 60, "⚡ CHARGÉ (3/3) !", "#00ffcc");
    });
  }

  updateAmmoHUD() {
    if (!this.ammoIcons || !this.ammoStatusText) return;

    for (let i = 0; i < 3; i++) {
      if (i < this.currentAmmo) {
        this.ammoIcons[i].setText("⚡");
        this.ammoIcons[i].setColor("#00f3ff");
        this.ammoIcons[i].setAlpha(1);
      } else {
        this.ammoIcons[i].setText("⚫");
        this.ammoIcons[i].setColor("#475569");
        this.ammoIcons[i].setAlpha(0.6);
      }
    }

    if (this.isReloading) {
      this.ammoStatusText.setText("⚡ RECHARGE...");
      this.ammoStatusText.setColor("#f59e0b");
    } else if (this.currentAmmo === 0) {
      this.ammoStatusText.setText("VIDE [0/3]");
      this.ammoStatusText.setColor("#ff3344");
    } else {
      this.ammoStatusText.setText(`PRÊT [${this.currentAmmo}/3]`);
      this.ammoStatusText.setColor("#00ffcc");
    }
  }

  fireLaser(targetX, targetY) {
    const muzzleX = this.playerContainer.x - 55;
    const muzzleY = this.playerContainer.y + 14;

    // Angle calculation (defaults to leftwards backwards fire)
    const angle = PMath.Angle.Between(muzzleX, muzzleY, targetX, targetY);
    this.eclairLaser.setRotation(angle);

    // Laser bullet graphic
    const bulletContainer = this.add.container(muzzleX, muzzleY).setDepth(35);

    const beam = this.add
      .rectangle(0, 0, 38, 8, 0x00f3ff)
      .setOrigin(0.5);
    const beamCore = this.add
      .rectangle(0, 0, 30, 4, 0xffffff)
      .setOrigin(0.5);
    const beamGlow = this.add
      .circle(0, 0, 10, 0x00d2ff, 0.4)
      .setOrigin(0.5);

    bulletContainer.add([beamGlow, beam, beamCore]);
    bulletContainer.setRotation(angle);

    const speed = 1200;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;

    this.bullets.push({
      container: bulletContainer,
      vx,
      vy,
      radius: 16,
    });

    // Muzzle flash
    this.createMuzzleFlash(muzzleX, muzzleY);
    this.cameras.main.shake(60, 0.003);
  }

  createMuzzleFlash(x, y) {
    const flash = this.add.circle(x, y, 22, 0x00ffff, 0.85).setDepth(45);
    this.tweens.add({
      targets: flash,
      scale: 1.8,
      alpha: 0,
      duration: 120,
      onComplete: () => flash.destroy(),
    });
  }

  updateBullets(dt) {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.container.x += b.vx * dt;
      b.container.y += b.vy * dt;

      // Despawn offscreen
      if (
        b.container.x < -100 ||
        b.container.x > 2000 ||
        b.container.y < 0 ||
        b.container.y > 900
      ) {
        b.container.destroy();
        this.bullets.splice(i, 1);
      }
    }
  }

  /* ========================================================================== */
  /* FLYING BONUS HEARTS                                                       */
  /* ========================================================================== */

  spawnBonusHeart() {
    const startX = 2050;
    const startY = Phaser.Math.Between(340, 560);

    const heartContainer = this.add.container(startX, startY).setDepth(34);

    // Glowing circle aura
    const aura = this.add.circle(0, 0, 24, 0xff3366, 0.35);
    this.tweens.add({
      targets: aura,
      scale: 1.4,
      alpha: 0.15,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });

    // Outer heart symbol
    const heartTxt = this.add
      .text(0, 0, "💖", {
        fontSize: "30px",
      })
      .setOrigin(0.5);

    // Sparkle pulsing tween
    this.tweens.add({
      targets: heartTxt,
      scale: 1.15,
      duration: 350,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // Small bonus label
    const label = this.add
      .text(0, 26, "+1 ❤️", {
        fontFamily: "Arial, sans-serif",
        fontSize: "11px",
        fontStyle: "bold",
        color: "#ff6699",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0.5);

    heartContainer.add([aura, heartTxt, label]);

    this.bonusHearts.push({
      container: heartContainer,
      baseY: startY,
      timeOffset: Phaser.Math.FloatBetween(0, Math.PI * 2),
      speed: Phaser.Math.Between(220, 260),
      radius: 26,
    });
  }

  updateBonusHearts(dt) {
    for (let i = this.bonusHearts.length - 1; i >= 0; i--) {
      const h = this.bonusHearts[i];
      h.container.x -= h.speed * dt;
      h.container.y = h.baseY + Math.sin(this.time.now * 0.004 + h.timeOffset) * 20;

      if (h.container.x < -100) {
        h.container.destroy();
        this.bonusHearts.splice(i, 1);
      }
    }
  }

  createHeartSparks(x, y) {
    for (let i = 0; i < 14; i++) {
      const spark = this.add
        .circle(x, y, Phaser.Math.Between(3, 7), 0xff3366, 0.9)
        .setDepth(48);

      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const dist = Phaser.Math.Between(30, 80);

      this.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        duration: 450,
        onComplete: () => spark.destroy(),
      });
    }
  }

  /* ========================================================================== */
  /* OBSTACLES (COMING FROM THE RIGHT)                                         */
  /* ========================================================================== */

  spawnObstacle() {
    // 50% chance of Low Obstacle (JUMP) vs High Obstacle (DUCK/SLIDE)
    const isLow = Math.random() < 0.55;
    const startX = 2050;

    const obstacle = this.add.container(startX, 0).setDepth(28);

    if (isLow) {
      // LOW OBSTACLE: Rolling Kitchen Cart / Flour Crate -> Player must JUMP
      const boxY = this.floorY - 35;
      obstacle.y = boxY;
      obstacle.obstacleType = "LOW";
      obstacle.width = 90;
      obstacle.height = 70;

      // Visual: Stainless steel cart with wheels & flour bags
      const cartBody = this.add
        .rectangle(0, 0, 80, 50, 0x334155)
        .setStrokeStyle(2, 0xffaa00);
      const cartTop = this.add
        .rectangle(0, -22, 90, 8, 0x94a3b8);
      const wheel1 = this.add.circle(-26, 25, 8, 0x1e293b).setStrokeStyle(1.5, 0xffffff);
      const wheel2 = this.add.circle(26, 25, 8, 0x1e293b).setStrokeStyle(1.5, 0xffffff);

      const labelBadge = this.add
        .rectangle(0, -45, 100, 22, 0xff6600, 0.95)
        .setStrokeStyle(1, 0xffffff);
      const labelText = this.add
        .text(0, -45, "⬆️ SAUTER", {
          fontFamily: "Arial, sans-serif",
          fontSize: "12px",
          fontStyle: "bold",
          color: "#ffffff",
        })
        .setOrigin(0.5);

      obstacle.add([cartBody, cartTop, wheel1, wheel2, labelBadge, labelText]);
    } else {
      // HIGH OBSTACLE: High-Pressure Steam Pipe / Laser Tripwire -> Player must DUCK
      const pipeY = 570; // At chest/head height
      obstacle.y = pipeY;
      obstacle.obstacleType = "HIGH";
      obstacle.width = 110;
      obstacle.height = 80;

      // Overhead industrial pipe venting glowing steam
      const pipeBar = this.add
        .rectangle(0, 0, 100, 26, 0x1e293b)
        .setStrokeStyle(2, 0x00d2ff);
      const pipeHanger = this.add
        .rectangle(0, -100, 12, 180, 0x334155);
      const laserBeam = this.add
        .rectangle(0, 16, 90, 8, 0x00f3ff, 0.8);

      const labelBadge = this.add
        .rectangle(0, -32, 100, 22, 0x0055ff, 0.95)
        .setStrokeStyle(1, 0xffffff);
      const labelText = this.add
        .text(0, -32, "⬇️ GLISSER", {
          fontFamily: "Arial, sans-serif",
          fontSize: "12px",
          fontStyle: "bold",
          color: "#ffffff",
        })
        .setOrigin(0.5);

      obstacle.add([pipeHanger, pipeBar, laserBeam, labelBadge, labelText]);
    }

    obstacle.speed = 540; // Obstacle moves left towards player
    obstacle.cleared = false;
    this.obstacles.push(obstacle);
  }

  updateObstacles(dt) {
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.x -= obs.speed * dt;

      // Check if player successfully cleared this obstacle
      if (!obs.cleared && obs.x < this.playerX - 50) {
        obs.cleared = true;
        this.obstaclesAvoided += 1;
        const msg = obs.obstacleType === "LOW" ? "SAUT PARFAIT ! ⬆️" : "GLISSADE ! ⬇️";
        this.showFloatingText(this.playerX, this.playerY - 70, msg, "#00ff88");
      }

      // Despawn offscreen
      if (obs.x < -200) {
        obs.destroy();
        this.obstacles.splice(i, 1);
      }
    }
  }

  /* ========================================================================== */
  /* PURSUERS (SINGLE UNIQUE ENEMY: CUISINIER POURSUIVANT)                     */
  /* ========================================================================== */

  spawnPursuer() {
    const spawnX = PMath.Between(-120, -50);
    const spawnY = this.playerGroundY;

    const pursuerContainer = this.add.container(spawnX, spawnY).setDepth(30);

    // Body (tan avatar skin)
    const body = this.add.image(0, 0, "avatar_body_tan").setScale(0.58);

    // Brigade Apprentice Outfit
    const outfit = this.add.image(0, 0, "avatar_outfit_apprenti").setScale(0.58);

    // Chef's Toque Hat
    const toque = this.add.image(0, 0, "avatar_acc_toque").setScale(0.58);

    // Red menace aura around enemy
    const aura = this.add
      .circle(0, 0, 48, 0xff0033, 0.25)
      .setStrokeStyle(2, 0xff3344, 0.8);

    // Rolling pin weapon in hand
    const rollingPin = this.add
      .rectangle(30, 10, 46, 12, 0xc28544)
      .setStrokeStyle(1, 0x5c3817)
      .setAngle(25);

    // Pursuer name badge
    const badge = this.add
      .text(0, -75, "👨‍🍳 Cuisinier", {
        fontFamily: "Arial, sans-serif",
        fontSize: "11px",
        fontStyle: "bold",
        color: "#ff4444",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0.5);

    pursuerContainer.add([aura, body, outfit, toque, rollingPin, badge]);

    // Running bob tween
    this.tweens.add({
      targets: [body, outfit, toque, rollingPin],
      y: { from: 0, to: -6 },
      duration: 180,
      yoyo: true,
      repeat: -1,
    });

    this.pursuers.push({
      container: pursuerContainer,
      speed: PMath.Between(190, 240),
      throwTimer: PMath.Between(1500, 3000),
      hp: 1, // 1 hit defeat
      radius: 35,
    });
  }

  updatePursuers(dt) {
    for (let i = this.pursuers.length - 1; i >= 0; i--) {
      const p = this.pursuers[i];

      // Move forward towards the player (left to right)
      p.container.x += p.speed * dt;

      // Keep pursuers behind player if they get too close
      if (p.container.x > this.playerContainer.x - 120) {
        p.container.x = this.playerContainer.x - 120;
      }

      // Throw rolling pin projectile
      p.throwTimer -= dt * 1000;
      if (p.throwTimer <= 0) {
        this.fireEnemyProjectile(p.container.x + 30, p.container.y);
        p.throwTimer = PMath.Between(2600, 4200);
      }
    }
  }

  fireEnemyProjectile(x, y) {
    const projContainer = this.add.container(x, y).setDepth(32);

    // Spinning rolling pin projectile
    const pin = this.add
      .rectangle(0, 0, 36, 10, 0xd49b55)
      .setStrokeStyle(1.5, 0xff3344);
    const flourGlow = this.add
      .circle(0, 0, 14, 0xffeedd, 0.4);

    projContainer.add([flourGlow, pin]);

    this.tweens.add({
      targets: pin,
      angle: 360,
      duration: 400,
      repeat: -1,
    });

    this.enemyProjectiles.push({
      container: projContainer,
      vx: 480, // Flies forward towards the player
      radius: 18,
    });
  }

  updateEnemyProjectiles(dt) {
    for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
      const ep = this.enemyProjectiles[i];
      ep.container.x += ep.vx * dt;

      if (ep.container.x > 2000) {
        ep.container.destroy();
        this.enemyProjectiles.splice(i, 1);
      }
    }
  }

  /* ========================================================================== */
  /* COLLISIONS DETECTION                                                      */
  /* ========================================================================== */

  checkCollisions() {
    const playerBox = {
      x: this.playerContainer.x,
      y: this.playerContainer.y,
      isCrouching: this.isCrouching,
      isJumping: this.isJumping,
    };

    // 1. Player Bullets vs Pursuers
    for (let bIdx = this.bullets.length - 1; bIdx >= 0; bIdx--) {
      const bullet = this.bullets[bIdx];
      let hitEnemy = false;

      for (let pIdx = this.pursuers.length - 1; pIdx >= 0; pIdx--) {
        const pursuer = this.pursuers[pIdx];
        const dist = Phaser.Math.Distance.Between(
          bullet.container.x,
          bullet.container.y,
          pursuer.container.x,
          pursuer.container.y
        );

        if (dist < bullet.radius + pursuer.radius) {
          hitEnemy = true;
          this.defeatPursuer(pIdx);
          break;
        }
      }

      if (hitEnemy) {
        bullet.container.destroy();
        this.bullets.splice(bIdx, 1);
      }
    }

    // 2. Player Bullets vs Bonus Flying Hearts
    for (let bIdx = this.bullets.length - 1; bIdx >= 0; bIdx--) {
      const bullet = this.bullets[bIdx];
      let hitHeart = false;

      for (let hIdx = this.bonusHearts.length - 1; hIdx >= 0; hIdx--) {
        const h = this.bonusHearts[hIdx];
        const dist = Phaser.Math.Distance.Between(
          bullet.container.x,
          bullet.container.y,
          h.container.x,
          h.container.y
        );

        if (dist < bullet.radius + h.radius) {
          hitHeart = true;
          this.createHeartSparks(h.container.x, h.container.y);

          if (this.playerHealth < this.maxHealth) {
            this.playerHealth += 1;
            this.updateHealthDisplay();
            this.showFloatingText(h.container.x, h.container.y, "+1 ❤️ VITALITÉ !", "#ff3366");
          } else {
            this.showFloatingText(h.container.x, h.container.y, "❤️ Vitalité Maximale !", "#ff6699");
          }

          h.container.destroy();
          this.bonusHearts.splice(hIdx, 1);
          break;
        }
      }

      if (hitHeart) {
        bullet.container.destroy();
        this.bullets.splice(bIdx, 1);
      }
    }

    // If currently invulnerable after getting hit, skip damage checks
    if (this.time.now < this.invulnerableUntil) return;

    // 3. Player vs Obstacles
    for (let i = 0; i < this.obstacles.length; i++) {
      const obs = this.obstacles[i];
      const distHoriz = Math.abs(obs.x - playerBox.x);

      // Within horizontal collision range
      if (distHoriz < 45) {
        if (obs.obstacleType === "LOW") {
          // Low obstacle must be jumped over
          if (this.playerY > this.playerGroundY - 80) {
            this.handlePlayerHit("Collision avec le chariot de cuisine !");
            this.createSparks(obs.x, obs.y, 0xffaa00);
            return;
          }
        } else if (obs.obstacleType === "HIGH") {
          // High obstacle must be crouched under
          if (!this.isCrouching) {
            this.handlePlayerHit("Heurté par le jet de vapeur suspendu !");
            this.createSparks(obs.x, obs.y, 0x00d2ff);
            return;
          }
        }
      }
    }

    // 4. Player vs Enemy Projectiles (Rolling Pins)
    for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
      const ep = this.enemyProjectiles[i];
      const dist = Phaser.Math.Distance.Between(
        ep.container.x,
        ep.container.y,
        playerBox.x,
        playerBox.y
      );

      if (dist < ep.radius + 32) {
        ep.container.destroy();
        this.enemyProjectiles.splice(i, 1);
        this.handlePlayerHit("Touché par un rouleau à pâtisserie !");
        return;
      }
    }

    // 5. Player vs Pursuer Body Contact
    for (let i = 0; i < this.pursuers.length; i++) {
      const p = this.pursuers[i];
      const dist = Math.abs(p.container.x - playerBox.x);
      if (dist < 55) {
        this.handlePlayerHit("Rattrapé par un cuisinier !");
        return;
      }
    }
  }

  /* ========================================================================== */
  /* DAMAGE & HEALTH HANDLING                                                  */
  /* ========================================================================== */

  updateHealthDisplay() {
    if (!this.heartTexts) return;
    for (let i = 0; i < 3; i++) {
      if (i < this.playerHealth) {
        this.heartTexts[i].setText("❤️");
        this.heartTexts[i].setAlpha(1.0);
      } else {
        this.heartTexts[i].setText("🖤");
        this.heartTexts[i].setAlpha(0.35);
      }
    }
  }

  handlePlayerHit(reason) {
    this.timesHit += 1;
    this.playerHealth -= 1;
    this.invulnerableUntil = this.time.now + 1600; // 1.6s of invulnerability

    // Visual feedback
    this.cameras.main.shake(250, 0.015);
    this.cameras.main.flash(200, 255, 0, 0, 0.4);

    // Update hearts display
    this.updateHealthDisplay();

    // Flashing invulnerability tween
    this.tweens.add({
      targets: this.playerContainer,
      alpha: 0.3,
      duration: 120,
      yoyo: true,
      repeat: 6,
      onComplete: () => {
        this.playerContainer.setAlpha(1.0);
      },
    });

    // Floating damage text
    this.showFloatingText(this.playerX, this.playerY - 60, "-1 ❤️ DÉGÂT !", "#ff3344");

    // Check Defeat
    if (this.playerHealth <= 0) {
      this.triggerDefeat();
    }
  }

  defeatPursuer(index) {
    const p = this.pursuers[index];
    this.enemiesDefeated += 1;
    this.scoreText.setText(`🚨 Poursuivants : ${this.enemiesDefeated}`);

    // Flour puff & sparkle explosion
    this.createFlourPuff(p.container.x, p.container.y);
    this.createSparks(p.container.x, p.container.y, 0xffdd00);

    // Floating notification (no score points)
    this.showFloatingText(
      p.container.x,
      p.container.y - 50,
      "💥 Cuisinier Repoussé !",
      "#00ffcc"
    );

    // Spin pursuer off screen
    this.tweens.add({
      targets: p.container,
      x: p.container.x - 180,
      y: p.container.y + 80,
      angle: -180,
      alpha: 0,
      duration: 350,
      ease: "Power2",
      onComplete: () => {
        p.container.destroy();
      },
    });

    this.pursuers.splice(index, 1);
  }

  showFloatingText(x, y, message, color = "#00ffcc") {
    const txt = this.add
      .text(x, y, message, {
        fontFamily: "Arial, sans-serif",
        fontSize: "15px",
        fontStyle: "bold",
        color,
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(150);

    this.tweens.add({
      targets: txt,
      y: y - 45,
      alpha: 0,
      duration: 1100,
      ease: "Power2",
      onComplete: () => txt.destroy(),
    });
  }

  /* ========================================================================== */
  /* PARTICLE EFFECTS                                                          */
  /* ========================================================================== */

  createFlourPuff(x, y) {
    for (let i = 0; i < 8; i++) {
      const circle = this.add
        .circle(
          x + Phaser.Math.Between(-25, 25),
          y + Phaser.Math.Between(-15, 15),
          Phaser.Math.Between(8, 22),
          0xffffff,
          0.7
        )
        .setDepth(25);

      this.tweens.add({
        targets: circle,
        scale: 1.8,
        alpha: 0,
        x: circle.x + Phaser.Math.Between(-40, 40),
        y: circle.y + Phaser.Math.Between(-30, -10),
        duration: Phaser.Math.Between(350, 600),
        onComplete: () => circle.destroy(),
      });
    }
  }

  createSparks(x, y, color = 0x00f3ff) {
    for (let i = 0; i < 10; i++) {
      const spark = this.add
        .circle(
          x,
          y,
          Phaser.Math.Between(3, 6),
          color,
          0.9
        )
        .setDepth(48);

      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const dist = Phaser.Math.Between(30, 70);

      this.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        duration: 350,
        onComplete: () => spark.destroy(),
      });
    }
  }

  /* ========================================================================== */
  /* END GAME STATES (VICTORY & DEFEAT)                                        */
  /* ========================================================================== */

  triggerVictory() {
    this.isVictory = true;

    // Slide agent safely into the ventilation duct
    this.tweens.add({
      targets: this.playerContainer,
      x: 1950,
      duration: 800,
      ease: "Power2",
    });

    // Slow down pursuers as they hit a closed iron grille
    this.pursuers.forEach((p) => {
      this.tweens.add({
        targets: p.container,
        x: p.container.x - 100,
        duration: 500,
      });
    });

    // Calculate Infiltration Restoration according to performance:
    // 1. Zero hits taken throughout the run => 100% infiltration
    // 2. Hit taken, but recovered and finishes with all 3 hearts => 75% infiltration
    // 3. Finished with 1 or 2 hearts => 50% infiltration
    let restoredAmount = 50;
    let rankBadge = "🏃 ÉVASION STANDARD";
    let rankColor = "#cbd5e1";

    if (this.timesHit === 0) {
      restoredAmount = 100;
      rankBadge = "⭐ PARFAIT (ZÉRO DÉGÂT) : Infiltration restaurée à 100 % !";
      rankColor = "#00ffcc";
    } else if (this.playerHealth >= 3) {
      restoredAmount = 75;
      rankBadge = "💖 RÉCUPÉRATION COMPLÈTE (3/3 CŒURS) : Infiltration restaurée à 75 % !";
      rankColor = "#00ff88";
    } else {
      restoredAmount = 50;
      rankBadge = "🛡️ ÉVASION STANDARD : Infiltration restaurée à 50 % !";
      rankColor = "#94a3b8";
    }

    this.restoredInfiltration = restoredAmount;
    this.victoryRankBadge = rankBadge;
    this.victoryRankColor = rankColor;

    gameState.restoreInfiltrationAfterEscape(restoredAmount);

    this.time.delayedCall(900, () => {
      this.showVictoryModal();
    });
  }

  showVictoryModal() {
    const modal = this.add.container(960, 490).setDepth(500);

    // Dimmed background
    const bgDim = this.add
      .rectangle(0, 0, 1920, 980, 0x000000, 0.8)
      .setInteractive();

    // Dialog card
    const card = this.add
      .rectangle(0, 0, 800, 480, 0x0c1524, 0.98)
      .setStrokeStyle(3, 0x00ff88);

    const title = this.add
      .text(0, -180, "🎉 FUITE RÉUSSIE !", {
        fontFamily: "Arial Black, sans-serif",
        fontSize: "28px",
        color: "#00ff88",
        stroke: "#000000",
        strokeThickness: 5,
      })
      .setOrigin(0.5);

    const subtitle = this.add
      .text(
        0,
        -135,
        "Vous avez semé la brigade et plongé dans le conduit de ventilation secret !",
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "15px",
          color: "#94a3b8",
          stroke: "#000000",
          strokeThickness: 2,
        }
      )
      .setOrigin(0.5);

    // Stats panel container / box
    const statsBox = this.add
      .rectangle(0, -15, 720, 140, 0x07111e, 0.85)
      .setStrokeStyle(1, 0x1e293b);

    const statsHeader = this.add
      .text(0, -68, "— BILAN DE L'ÉVASION —", {
        fontFamily: "Arial, sans-serif",
        fontSize: "13px",
        fontStyle: "bold",
        color: "#38bdf8",
      })
      .setOrigin(0.5);

    const stats = this.add
      .text(
        0,
        -46,
        `• Poursuivants repoussés : ${this.enemiesDefeated}\n• Obstacles franchis : ${this.obstaclesAvoided}\n• Cœurs restants : ${this.playerHealth} / ${this.maxHealth}     |     Dégâts subis : ${this.timesHit}`,
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "15px",
          color: "#e2e8f0",
          lineSpacing: 10,
          align: "center",
        }
      )
      .setOrigin(0.5, 0);

    // Reward Badge Box
    const badgeBorderColor =
      this.restoredInfiltration === 100
        ? 0x00ffcc
        : this.restoredInfiltration === 75
        ? 0x00ff88
        : 0x64748b;
    const badgeBg = this.add
      .rectangle(0, 95, 720, 48, 0x091c18, 0.9)
      .setStrokeStyle(2, badgeBorderColor);

    const badgeText = this.add
      .text(0, 95, this.victoryRankBadge, {
        fontFamily: "Arial, sans-serif",
        fontSize: "15px",
        fontStyle: "bold",
        color: this.victoryRankColor || "#cbd5e1",
      })
      .setOrigin(0.5);

    // Continue button
    const resumeBtn = this.add
      .rectangle(0, 175, 340, 50, 0x15803d, 0.95)
      .setStrokeStyle(2, 0x00ff88)
      .setInteractive({ useHandCursor: true });

    const resumeText = this.add
      .text(0, 175, "🚪 Reprendre la mission", {
        fontFamily: "Arial, sans-serif",
        fontSize: "17px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    resumeBtn.on("pointerover", () => resumeBtn.setFillStyle(0x16a34a, 1));
    resumeBtn.on("pointerout", () => resumeBtn.setFillStyle(0x15803d, 0.95));
    resumeBtn.on("pointerdown", () => {
      modal.destroy();
      // Resume safe scene
      const safeContext = gameState.getLastSafeContext();
      if (this.originScene === "Game" && this.dialogId) {
        this.scene.start("Game", {
          dialogId: this.dialogId,
          roomReturnId: this.roomReturnId,
        });
      } else if (safeContext && safeContext.scene) {
        this.scene.start(safeContext.scene, safeContext.data);
      } else {
        this.scene.start("GenericMapScene", { mapId: "secretInstitute" });
      }
    });

    modal.add([
      bgDim,
      card,
      title,
      subtitle,
      statsBox,
      statsHeader,
      stats,
      badgeBg,
      badgeText,
      resumeBtn,
      resumeText,
    ]);
  }

  triggerDefeat() {
    this.isGameOver = true;

    // Dramatic impact without permanent camera fade
    this.cameras.main.shake(500, 0.02);
    this.cameras.main.flash(350, 255, 0, 0, 0.6);

    this.time.delayedCall(700, () => {
      this.showDefeatModal();
    });
  }

  showDefeatModal() {
    const modal = this.add.container(960, 490).setDepth(800);

    const bgDim = this.add
      .rectangle(0, 0, 1920, 980, 0x000000, 0.88)
      .setInteractive();

    const card = this.add
      .rectangle(0, 0, 780, 390, 0x140a10, 0.98)
      .setStrokeStyle(3, 0xff3344);

    const title = this.add
      .text(0, -135, "❌ VOUS AVEZ ÉTÉ CAPTURÉ !", {
        fontFamily: "Arial Black, sans-serif",
        fontSize: "28px",
        color: "#ff3344",
        stroke: "#000000",
        strokeThickness: 5,
      })
      .setOrigin(0.5);

    const subtitle = this.add
      .text(
        0,
        -70,
        "La brigade de sécurité de l'Institut vous a appréhendé et démasqué !\nVotre session a été verrouillée pour des raisons de sécurité.",
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "16px",
          color: "#cbd5e1",
          align: "center",
          lineSpacing: 6,
        }
      )
      .setOrigin(0.5);

    let remainingSeconds = 4;
    const countdownText = this.add
      .text(
        0,
        5,
        `Redirection vers l'écran de connexion dans ${remainingSeconds} s...`,
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "15px",
          fontStyle: "italic",
          color: "#f59e0b",
        }
      )
      .setOrigin(0.5);

    // Return to Login Button (Single action, no retry)
    const loginBtn = this.add
      .rectangle(0, 95, 380, 52, 0x991b1b, 0.95)
      .setStrokeStyle(2, 0xff4444)
      .setInteractive({ useHandCursor: true });

    const loginText = this.add
      .text(0, 95, "🔐 Écran de connexion (Charger sauvegarde)", {
        fontFamily: "Arial, sans-serif",
        fontSize: "16px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    loginBtn.on("pointerover", () => loginBtn.setFillStyle(0xb91c1c, 1));
    loginBtn.on("pointerout", () => loginBtn.setFillStyle(0x991b1b, 0.95));

    let isRedirecting = false;
    const goToLogin = () => {
      if (isRedirecting) return;
      isRedirecting = true;
      if (this.defeatRedirectTimer) {
        this.defeatRedirectTimer.remove();
        this.defeatRedirectTimer = null;
      }

      // Lock session to prompt for PIN and reload save
      gameState.setProfile({ pinCode: null });

      this.cameras.main.fadeOut(400, 0, 0, 0, (cam, progress) => {
        if (progress >= 1) {
          this.scene.start("MainMenu");
        }
      });
    };

    loginBtn.on("pointerdown", goToLogin);

    // Dynamic timer countdown
    this.defeatRedirectTimer = this.time.addEvent({
      delay: 1000,
      repeat: 3,
      callback: () => {
        remainingSeconds -= 1;
        if (countdownText.active) {
          countdownText.setText(
            `Redirection vers l'écran de connexion dans ${remainingSeconds} s...`
          );
        }
        if (remainingSeconds <= 0) {
          goToLogin();
        }
      },
    });

    modal.add([
      bgDim,
      card,
      title,
      subtitle,
      countdownText,
      loginBtn,
      loginText,
    ]);
  }
}

