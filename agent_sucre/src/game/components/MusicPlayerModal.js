import { GameObjects } from "phaser";
import { audioManager } from "../manager/AudioManager.js";

/**
 * Generates or retrieves the procedural vinyl record texture.
 * @param {Phaser.Scene} scene
 * @returns {string} Texture key
 */
function getOrCreateVinylTexture(scene) {
  const textureKey = "vinyl_record_texture";
  if (scene.textures.exists(textureKey)) {
    return textureKey;
  }

  const size = 320;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const cx = size / 2;
  const cy = size / 2;
  const r = 150;

  // Outer disc
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = "#121217";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#252733";
  ctx.stroke();

  // Grooves (subtle concentric rings)
  for (let gr = 50; gr < r - 5; gr += 3.5) {
    ctx.beginPath();
    ctx.arc(cx, cy, gr, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.035)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  // Major track separation bands
  for (const band of [75, 105, 130]) {
    ctx.beginPath();
    ctx.arc(cx, cy, band, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Dual specular sheen (light reflections characteristic of spinning vinyl)
  const grad1 = ctx.createRadialGradient(cx, cy, 45, cx, cy, r);
  grad1.addColorStop(0, "rgba(255, 255, 255, 0)");
  grad1.addColorStop(0.5, "rgba(255, 255, 255, 0.07)");
  grad1.addColorStop(1, "rgba(255, 255, 255, 0)");

  ctx.save();
  ctx.fillStyle = grad1;
  for (const angle of [Math.PI / 4, (5 * Math.PI) / 4]) {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, angle - 0.38, angle + 0.38);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Central Label (Sticker)
  const labelR = 48;
  ctx.beginPath();
  ctx.arc(cx, cy, labelR, 0, Math.PI * 2);
  const labelGrad = ctx.createRadialGradient(cx, cy, 5, cx, cy, labelR);
  labelGrad.addColorStop(0, "#0284c7");
  labelGrad.addColorStop(1, "#0369a1");
  ctx.fillStyle = labelGrad;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#38bdf8";
  ctx.stroke();

  // Outer gold ring on sticker
  ctx.beginPath();
  ctx.arc(cx, cy, labelR - 4, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Text on sticker
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 9px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("AGENT SUCRÉ", cx, cy - 20);

  ctx.font = "bold 7px Courier, monospace";
  ctx.fillStyle = "#bae6fd";
  ctx.fillText("33 ⅓ RPM", cx, cy + 18);
  ctx.fillText("STEREO • HI-FI", cx, cy + 28);

  // Center spindle hole
  ctx.beginPath();
  ctx.arc(cx, cy, 9, 0, Math.PI * 2);
  ctx.fillStyle = "#cbd5e1";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, 6, 0, Math.PI * 2);
  ctx.fillStyle = "#000000";
  ctx.fill();

  scene.textures.addCanvas(textureKey, canvas);
  return textureKey;
}

/**
 * Formats time in seconds to mm:ss string.
 * @param {number} sec
 * @returns {string}
 */
function formatTime(sec) {
  if (!Number.isFinite(sec) || sec < 0) return "00:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/**
 * Retro Agent OS Vinyl Music Player.
 * Displays an animated spinning vinyl record and player controls with zero cluttered background.
 */
export class MusicPlayerModal extends GameObjects.Container {
  /**
   * @param {Phaser.Scene} scene
   * @param {Object} [options]
   * @param {string} [options.trackId="Mission_Mille_Feuille"]
   * @param {Function} [options.onClose]
   */
  constructor(scene, options = {}) {
    super(scene, 0, 0);

    this.onClose = options.onClose || (() => {});
    this.initialTrackId = options.trackId || "Mission_Mille_Feuille";
    this.singleTrack = !!options.singleTrack;

    if (typeof options.volume === "number") {
      audioManager.setVolume(options.volume);
    }

    this.trackList = audioManager.getTrackList();
    this.currentTrackIndex = Math.max(
      0,
      this.trackList.findIndex(
        (t) => t.id.toLowerCase() === this.initialTrackId.toLowerCase()
      )
    );

    this.rotationSpeed = 0.035;
    this.currentRotation = 0;
    this.isSeeking = false;

    this.initUI();
    this.initListeners();

    scene.add.existing(this);
    this.setDepth(1200);

    // Auto-start requested track
    const currentTrack = this.trackList[this.currentTrackIndex];
    if (currentTrack) {
      audioManager.play(currentTrack.id);
    }
  }

  initUI() {
    this.removeAll(true);

    const screenWidth = this.scene.scale.width;
    const screenHeight = this.scene.scale.height;
    const centerX = screenWidth / 2;

    // Subtle background tint to focus attention while leaving CRT monitor and taskbar visible
    this.backdrop = this.scene.add
      .rectangle(centerX, screenHeight / 2, screenWidth, screenHeight, 0x000000, 0.45)
      .setInteractive();
    this.add(this.backdrop);

    // Turntable Vinyl Record
    const textureKey = getOrCreateVinylTexture(this.scene);
    this.vinylSprite = this.scene.add.image(centerX, 330, textureKey);
    this.vinylSprite.setDisplaySize(290, 290);
    this.add(this.vinylSprite);

    // Tonearm / Bras de lecture
    this.tonearm = this.scene.add.graphics();
    this.renderTonearm(centerX, 330, true);
    this.add(this.tonearm);

    // Player Control Console Box
    const panelY = 570;
    const panelWidth = 620;
    const panelHeight = 175;

    this.panelBg = this.scene.add
      .rectangle(centerX, panelY, panelWidth, panelHeight, 0x0a1322, 0.96)
      .setStrokeStyle(2, 0x00d2ff);
    this.add(this.panelBg);

    // Decorative top neon bar
    const neonBar = this.scene.add
      .rectangle(centerX, panelY - panelHeight / 2 + 3, panelWidth - 4, 3, 0x00d2ff);
    this.add(neonBar);

    // Close button [X]
    const closeBtn = this.scene.add
      .rectangle(centerX + panelWidth / 2 - 22, panelY - panelHeight / 2 + 20, 28, 24, 0x991b1b)
      .setStrokeStyle(1, 0xff4444)
      .setInteractive({ useHandCursor: true });

    const closeLabel = this.scene.add
      .text(centerX + panelWidth / 2 - 22, panelY - panelHeight / 2 + 20, "✕", {
        fontFamily: "Arial, sans-serif",
        fontSize: "14px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    closeBtn.on("pointerover", () => closeBtn.setFillStyle(0xdc2626));
    closeBtn.on("pointerout", () => closeBtn.setFillStyle(0x991b1b));
    closeBtn.on("pointerdown", () => this.close());
    this.add([closeBtn, closeLabel]);

    // Current Track Information
    this.trackTitle = this.scene.add
      .text(centerX, panelY - 56, "", {
        fontFamily: "Arial Black, sans-serif",
        fontSize: "18px",
        color: "#00f3ff",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    this.trackSubtitle = this.scene.add
      .text(centerX, panelY - 32, "", {
        fontFamily: "Arial, sans-serif",
        fontSize: "13px",
        color: "#94a3b8",
      })
      .setOrigin(0.5);
    this.add([this.trackTitle, this.trackSubtitle]);

    // Timeline Bar
    const barWidth = 460;
    const barY = panelY - 2;

    this.timeCurrentText = this.scene.add
      .text(centerX - barWidth / 2 - 12, barY, "00:00", {
        fontFamily: "Courier, monospace",
        fontSize: "12px",
        color: "#38bdf8",
      })
      .setOrigin(1, 0.5);

    this.timeDurationText = this.scene.add
      .text(centerX + barWidth / 2 + 12, barY, "00:00", {
        fontFamily: "Courier, monospace",
        fontSize: "12px",
        color: "#64748b",
      })
      .setOrigin(0, 0.5);

    // Track progress background
    this.progressBarBg = this.scene.add
      .rectangle(centerX, barY, barWidth, 8, 0x1e293b)
      .setStrokeStyle(1, 0x334155)
      .setInteractive({ useHandCursor: true });

    // Track progress fill
    this.progressBarFill = this.scene.add
      .rectangle(centerX - barWidth / 2, barY, 0, 8, 0x00d2ff)
      .setOrigin(0, 0.5);

    // Interactive scrub seek
    this.progressBarBg.on("pointerdown", (pointer) => {
      const clickX = pointer.x - (centerX - barWidth / 2);
      const ratio = Math.max(0, Math.min(1, clickX / barWidth));
      const prog = audioManager.getProgress();
      const currentTrack = this.trackList[this.currentTrackIndex];
      const dur = prog.duration || currentTrack?.durationSec || 1;
      audioManager.seek(ratio * dur);
    });

    this.add([
      this.timeCurrentText,
      this.timeDurationText,
      this.progressBarBg,
      this.progressBarFill,
    ]);

    // Playback Buttons Row
    const btnY = panelY + 44;

    if (this.singleTrack) {
      // Single Track Mode (End of Chapter): Only Volume, Play/Pause, and Stop
      this.volumeBtn = this.createButton(
        centerX - 110,
        btnY,
        `🔊 ${Math.round(audioManager.volume * 100)}%`,
        78,
        32,
        () => {
          const nextVol = audioManager.volume >= 1 ? 0.25 : audioManager.volume + 0.25;
          audioManager.setVolume(nextVol);
          this.volumeBtn.label.setText(`🔊 ${Math.round(audioManager.volume * 100)}%`);
        }
      );

      this.playPauseBtn = this.createButton(
        centerX,
        btnY,
        audioManager.isPlaying ? "⏸" : "▶",
        54,
        36,
        () => {
          audioManager.togglePlay();
          this.updatePlayPauseButton();
        },
        0x0284c7
      );

      const stopBtn = this.createButton(centerX + 90, btnY, "⏹", 44, 32, () => {
        audioManager.stop();
        this.updatePlayPauseButton();
      });

      this.add([this.volumeBtn.box, this.volumeBtn.label]);
      this.add([this.playPauseBtn.box, this.playPauseBtn.label]);
      this.add([stopBtn.box, stopBtn.label]);
    } else {
      // Full Playlist Mode (from Media Folder)
      const prevBtn = this.createButton(centerX - 90, btnY, "⏮", 36, 32, () => {
        this.prevTrack();
      });

      this.playPauseBtn = this.createButton(
        centerX,
        btnY,
        audioManager.isPlaying ? "⏸" : "▶",
        54,
        36,
        () => {
          audioManager.togglePlay();
          this.updatePlayPauseButton();
        },
        0x0284c7
      );

      const stopBtn = this.createButton(centerX + 60, btnY, "⏹", 36, 32, () => {
        audioManager.stop();
        this.updatePlayPauseButton();
      });

      const nextBtn = this.createButton(centerX + 115, btnY, "⏭", 36, 32, () => {
        this.nextTrack();
      });

      this.volumeBtn = this.createButton(
        centerX - 170,
        btnY,
        `🔊 ${Math.round(audioManager.volume * 100)}%`,
        78,
        32,
        () => {
          const nextVol = audioManager.volume >= 1 ? 0.25 : audioManager.volume + 0.25;
          audioManager.setVolume(nextVol);
          this.volumeBtn.label.setText(`🔊 ${Math.round(audioManager.volume * 100)}%`);
        }
      );

      this.add([prevBtn.box, prevBtn.label]);
      this.add([this.playPauseBtn.box, this.playPauseBtn.label]);
      this.add([stopBtn.box, stopBtn.label]);
      this.add([nextBtn.box, nextBtn.label]);
      this.add([this.volumeBtn.box, this.volumeBtn.label]);
    }

    // Escape Hotkey Hint
    const escapeHint = this.scene.add
      .text(
        centerX,
        panelY + panelHeight / 2 + 25,
        "⌨️ [ÉCHAP] : Couper le son et quitter le lecteur",
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "14px",
          fontStyle: "bold",
          color: "#f59e0b",
          backgroundColor: "#0b121e",
          padding: { x: 14, y: 6 },
        }
      )
      .setOrigin(0.5);
    this.add(escapeHint);

    this.refreshTrackDisplay();
  }

  /**
   * Renders the turntable tonearm graphics.
   */
  renderTonearm(cx, cy, isPlaying) {
    this.tonearm.clear();

    const pivotX = cx + 160;
    const pivotY = cy - 120;

    // Turntable base for tonearm
    this.tonearm.fillStyle(0x334155, 1);
    this.tonearm.fillCircle(pivotX, pivotY, 16);
    this.tonearm.lineStyle(2, 0x94a3b8, 1);
    this.tonearm.strokeCircle(pivotX, pivotY, 16);

    // Arm angle: rests on record edge if playing, tilted away if stopped
    const targetX = isPlaying ? cx + 60 : cx + 130;
    const targetY = isPlaying ? cy + 40 : cy - 50;

    // Metallic arm bar
    this.tonearm.lineStyle(4, 0xe2e8f0, 1);
    this.tonearm.beginPath();
    this.tonearm.moveTo(pivotX, pivotY);
    this.tonearm.lineTo(pivotX - 25, pivotY + 70);
    this.tonearm.lineTo(targetX, targetY);
    this.tonearm.strokePath();

    // Stylus cartridge (needle head)
    this.tonearm.fillStyle(0xd97706, 1);
    this.tonearm.fillRect(targetX - 8, targetY - 4, 16, 8);
    this.tonearm.lineStyle(1, 0xffedd5, 1);
    this.tonearm.strokeRect(targetX - 8, targetY - 4, 16, 8);
  }

  /**
   * Helper to build a styled UI button.
   */
  createButton(x, y, text, width, height, onClick, bgCol = 0x1e293b) {
    const box = this.scene.add
      .rectangle(x, y, width, height, bgCol, 0.95)
      .setStrokeStyle(1.5, 0x00d2ff)
      .setInteractive({ useHandCursor: true });

    const label = this.scene.add
      .text(x, y, text, {
        fontFamily: "Arial, sans-serif",
        fontSize: "14px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    box.on("pointerover", () => box.setFillStyle(0x0284c7));
    box.on("pointerout", () => box.setFillStyle(bgCol));
    box.on("pointerdown", onClick);

    return { box, label };
  }

  refreshTrackDisplay() {
    const track = this.trackList[this.currentTrackIndex];
    if (!track) return;

    this.trackTitle.setText(`🎵 ${track.title}`);
    this.trackSubtitle.setText(`${track.subtitle} • ${track.artist}`);
    this.timeDurationText.setText(formatTime(track.durationSec));
    this.updatePlayPauseButton();
  }

  updatePlayPauseButton() {
    if (this.playPauseBtn && this.playPauseBtn.label) {
      this.playPauseBtn.label.setText(audioManager.isPlaying ? "⏸" : "▶");
    }
    const screenWidth = this.scene.scale.width;
    this.renderTonearm(screenWidth / 2, 330, audioManager.isPlaying);
  }

  prevTrack() {
    this.currentTrackIndex =
      (this.currentTrackIndex - 1 + this.trackList.length) % this.trackList.length;
    const track = this.trackList[this.currentTrackIndex];
    audioManager.play(track.id);
    this.refreshTrackDisplay();
  }

  nextTrack() {
    this.currentTrackIndex = (this.currentTrackIndex + 1) % this.trackList.length;
    const track = this.trackList[this.currentTrackIndex];
    audioManager.play(track.id);
    this.refreshTrackDisplay();
  }

  initListeners() {
    // Escape hotkey listener to stop audio and close player
    this.onKeyDown = (e) => {
      if (e.key === "Escape" || e.code === "Escape") {
        e.preventDefault();
        this.close();
      }
    };
    window.addEventListener("keydown", this.onKeyDown);

    // Audio Manager event subscriptions
    this.unsubscribeAudio = audioManager.subscribe((event, data) => {
      if (event === "play" || event === "pause" || event === "stop") {
        this.updatePlayPauseButton();
      } else if (event === "timeupdate") {
        this.timeCurrentText.setText(formatTime(data.currentTime));
        if (data.duration) {
          this.timeDurationText.setText(formatTime(data.duration));
          const ratio = Math.max(0, Math.min(1, data.currentTime / data.duration));
          this.progressBarFill.width = 460 * ratio;
        }
      } else if (event === "ended") {
        if (this.singleTrack) {
          audioManager.stop();
          this.updatePlayPauseButton();
        } else {
          this.nextTrack();
        }
      }
    });

    // Scene update loop hook for smooth vinyl spinning
    this.updateListener = (time, delta) => {
      if (audioManager.isPlaying && this.vinylSprite) {
        this.vinylSprite.rotation += this.rotationSpeed * (delta / 16.6);
      }
    };
    this.scene.events.on("update", this.updateListener);
  }

  close() {
    // Stop music on close as requested
    audioManager.stop();

    if (this.onKeyDown) {
      window.removeEventListener("keydown", this.onKeyDown);
    }
    if (this.unsubscribeAudio) {
      this.unsubscribeAudio();
    }
    if (this.updateListener) {
      this.scene.events.off("update", this.updateListener);
    }

    this.onClose();
    this.destroy();
  }
}

