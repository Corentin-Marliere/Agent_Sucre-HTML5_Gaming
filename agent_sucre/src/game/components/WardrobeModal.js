import { GameObjects } from "phaser";
import { gameState } from "../state/GameState.js";
import { AgentAvatar } from "./AgentAvatar.js";

/**
 * Agent tactical wardrobe and character customization modal featuring Drag & Drop.
 */
export class WardrobeModal extends GameObjects.Container {
  /**
   * @param {Phaser.Scene} scene
   * @param {Object} [options={}]
   * @param {Function} [options.onClose]
   */
  constructor(scene, options = {}) {
    super(scene, 0, 0);

    this.onClose = options.onClose || (() => {});
    this.customization = gameState.getCustomization();
    this.activeTab = "outfits"; // 'outfits' | 'hair' | 'face' | 'accessories'
    this.activeDragGhost = null;

    this.outfits = [
      {
        id: "apprenti_lyfe",
        name: "Tablier d'Apprenti Lyfe",
        desc: "Couverture standard d'élève cuisinier sous Paul Bocuse.",
        bonus: "Discrétion basique",
        texture: "avatar_outfit_apprenti",
        unlocked: true,
      },
      {
        id: "tablier_pare_balles",
        name: "Tablier Pare-Balles du Chef",
        desc: "Donné par Gordon Ramsay lors de l'épreuve physique.",
        bonus: "+20 % Résistance physique",
        texture: "avatar_outfit_tablier_pare_balles",
        unlocked: gameState.hasItem("tablier_pare_balles") || gameState.hasFlag("tablier_unlocked"),
      },
      {
        id: "tenue_infiltration",
        name: "Smoking Tactique Haute Couture",
        desc: "Conçu sur mesure par le Directeur Bocuse pour infiltrer les cuisines.",
        bonus: "+25 % Vitesse d'infiltration",
        texture: "avatar_outfit_smoking",
        unlocked: gameState.hasFlag("smoking_unlocked"),
      },
    ];

    this.hairStyles = [
      { id: "hair_short", name: "Court Espion" },
      { id: "hair_bob", name: "Carré Chic" },
      { id: "hair_ponytail", name: "Queue de Cheval" },
      { id: "hair_curly", name: "Boucles Stylées" },
    ];

    this.hairColors = [
      { name: "Châtain", color: 0x5a3825, hex: "#5a3825" },
      { name: "Blond Doré", color: 0xd4af37, hex: "#d4af37" },
      { name: "Noir Corbeau", color: 0x1e293b, hex: "#1e293b" },
      { name: "Roux Cuivré", color: 0xc2410c, hex: "#c2410c" },
      { name: "Rose Bonbon", color: 0xf472b6, hex: "#f472b6" },
      { name: "Argenté", color: 0x94a3b8, hex: "#94a3b8" },
    ];

    this.skinTones = [
      { id: "light", name: "Teint Clair", color: 0xffdfc4 },
      { id: "tan", name: "Teint Hâlé", color: 0xe2a77f },
      { id: "dark", name: "Teint Sombre", color: 0x8c593b },
    ];

    this.eyeColors = [
      { id: "blue", name: "Bleu Azur", color: 0x2563eb },
      { id: "green", name: "Vert Émeraude", color: 0x059669 },
      { id: "brown", name: "Marron Noisette", color: 0x78350f },
      { id: "purple", name: "Violet Améthyste", color: 0x7c3aed },
    ];

    this.accessories = [
      { id: "none", name: "Aucun accessoire", desc: "Profil discret" },
      { id: "glasses", name: "Lunettes Tactiques", desc: "Vision infrarouge HUD" },
      { id: "earpiece", name: "Oreillette Comm", desc: "Fréquence chiffrée avec Lignac" },
      { id: "toque", name: "Toque de Chef", desc: "Prestige gastronomique" },
    ];

    this.initUI();
    this.initKeyboard();

    scene.add.existing(this);
    this.setDepth(1100);
  }

  /**
   * Builds the entire interactive wardrobe modal.
   */
  initUI() {
    this.cleanupDragGhost();
    this.removeAll(true);

    const screenWidth = this.scene.scale.width;
    const screenHeight = this.scene.scale.height;

    // Darkened backdrop (clicking outside closes modal)
    this.backdrop = this.scene.add
      .rectangle(screenWidth / 2, screenHeight / 2, screenWidth, screenHeight, 0x000000, 0.75)
      .setInteractive();
    this.backdrop.on("pointerdown", () => this.close());
    this.add(this.backdrop);

    // Modal Dimensions
    const winWidth = 840;
    const winHeight = 530;
    const winX = screenWidth / 2;
    const winY = screenHeight / 2;

    // Main window background (interactive to prevent clicks from bubbling to backdrop)
    this.windowBg = this.scene.add
      .rectangle(winX, winY, winWidth, winHeight, 0x141824, 0.98)
      .setStrokeStyle(2, 0x9b59b6)
      .setInteractive();
    this.add(this.windowBg);

    // Title bar
    const titleBarHeight = 44;
    const titleBarY = winY - winHeight / 2 + titleBarHeight / 2;
    this.titleBar = this.scene.add.rectangle(winX, titleBarY, winWidth, titleBarHeight, 0x3b1d4a);
    this.add(this.titleBar);

    this.titleText = this.scene.add
      .text(winX - winWidth / 2 + 20, titleBarY, "👗 DRESSING TACTIQUE & AVATAR DE L'AGENT", {
        fontFamily: "Arial, sans-serif",
        fontSize: "16px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0, 0.5);
    this.add(this.titleText);

    // Close button [✖] with circular background button
    const closeBtnBg = this.scene.add
      .circle(winX + winWidth / 2 - 25, titleBarY, 15, 0x241430)
      .setStrokeStyle(1.5, 0xff6b6b)
      .setInteractive({ useHandCursor: true });

    const closeBtn = this.scene.add
      .text(winX + winWidth / 2 - 25, titleBarY, "✖", {
        fontFamily: "Arial, sans-serif",
        fontSize: "15px",
        fontStyle: "bold",
        color: "#ff6b6b",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const onHoverClose = () => {
      closeBtnBg.setFillStyle(0xff4444, 0.35);
      closeBtn.setColor("#ffffff");
    };
    const onOutClose = () => {
      closeBtnBg.setFillStyle(0x241430, 1);
      closeBtn.setColor("#ff6b6b");
    };

    closeBtnBg.on("pointerover", onHoverClose);
    closeBtnBg.on("pointerout", onOutClose);
    closeBtnBg.on("pointerdown", () => this.close());

    closeBtn.on("pointerover", onHoverClose);
    closeBtn.on("pointerout", onOutClose);
    closeBtn.on("pointerdown", () => this.close());
    this.add([closeBtnBg, closeBtn]);

    // Subtitle / Agent name
    const profileName = gameState.getProfile().agentName || "Agent Sucre";
    const subheader = this.scene.add
      .text(winX - winWidth / 2 + 25, titleBarY + 34, `Matricule : ${profileName} • Station de Personnalisation 2D`, {
        fontFamily: "Arial, sans-serif",
        fontSize: "13px",
        color: "#94a3b8",
      })
      .setOrigin(0, 0.5);
    this.add(subheader);

    // Left Panel: Avatar & Drop Zone
    this.createAvatarPanel(winX - 255, winY + 20);

    // Right Panel: Tabs & Controls
    this.createTabsAndControls(winX + 130, winY + 20);

    // Bottom "Retour au bureau" close button
    const closeBottomBtn = this.scene.add
      .rectangle(winX, winY + winHeight / 2 - 20, 200, 30, 0x3b1d4a)
      .setStrokeStyle(1.5, 0x9b59b6)
      .setInteractive({ useHandCursor: true });

    const closeBottomText = this.scene.add
      .text(winX, winY + winHeight / 2 - 20, "Retour au bureau", {
        fontFamily: "Arial, sans-serif",
        fontSize: "12px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const onHoverBottom = () => closeBottomBtn.setFillStyle(0x6c3483, 1);
    const onOutBottom = () => closeBottomBtn.setFillStyle(0x3b1d4a, 1);

    closeBottomBtn.on("pointerover", onHoverBottom);
    closeBottomBtn.on("pointerout", onOutBottom);
    closeBottomBtn.on("pointerdown", () => this.close());

    closeBottomText.on("pointerover", onHoverBottom);
    closeBottomText.on("pointerout", onOutBottom);
    closeBottomText.on("pointerdown", () => this.close());
    this.add([closeBottomBtn, closeBottomText]);
  }

  /**
   * Creates the avatar preview chamber with the interactive drop zone.
   * @param {number} x
   * @param {number} y
   */
  createAvatarPanel(x, y) {
    const chamberWidth = 260;
    const chamberHeight = 410;

    // Chamber background with cyber outline
    const chamberBg = this.scene.add
      .rectangle(x, y, chamberWidth, chamberHeight, 0x0c101c, 0.9)
      .setStrokeStyle(1.5, 0x4a2e6f);
    this.add(chamberBg);

    // Pedestal base
    const pedestal = this.scene.add
      .ellipse(x, y + 115, 170, 36, 0x1f293d, 0.9)
      .setStrokeStyle(1, 0x00ffcc);
    this.add(pedestal);

    // Drop zone for Drag & Drop
    const dropZoneOutline = this.scene.add
      .rectangle(x, y - 10, chamberWidth - 20, chamberHeight - 75)
      .setStrokeStyle(2, 0x9b59b6, 0.5);
    this.add(dropZoneOutline);

    const dropZone = this.scene.add
      .zone(x, y - 10, chamberWidth - 20, chamberHeight - 75)
      .setRectangleDropZone(chamberWidth - 20, chamberHeight - 75);
    this.add(dropZone);

    // 2D Chibi Avatar Component
    this.avatar = new AgentAvatar(this.scene, x, y - 20, {
      scale: 0.95,
      customization: this.customization,
    });
    this.add(this.avatar);

    // Drop zone visual feedback handlers
    this.cleanupDragListeners();

    this.onDragEnter = (pointer, target, zone) => {
      if (zone === dropZone) {
        dropZoneOutline.setStrokeStyle(2.5, 0x00ffcc, 1);
        dropZoneOutline.setFillStyle(0x00ffcc, 0.08);
      }
    };

    this.onDragLeave = (pointer, target, zone) => {
      if (zone === dropZone) {
        dropZoneOutline.setStrokeStyle(2, 0x9b59b6, 0.5);
        dropZoneOutline.setFillStyle(0x000000, 0);
      }
    };

    this.onDrop = (pointer, gameObject, zone) => {
      if (zone === dropZone && gameObject.outfitData) {
        const outfitId = gameObject.outfitData.id;
        this.cleanupDragGhost();
        dropZoneOutline.setStrokeStyle(2, 0x9b59b6, 0.5);
        dropZoneOutline.setFillStyle(0x000000, 0);

        // Defer equip execution so Phaser completes dragend and resets pointer dragState cleanly
        if (this.scene && this.scene.time) {
          this.scene.time.delayedCall(30, () => {
            this.equipOutfit(outfitId);
          });
        } else {
          this.equipOutfit(outfitId);
        }
      }
    };

    this.scene.input.on("dragenter", this.onDragEnter);
    this.scene.input.on("dragleave", this.onDragLeave);
    this.scene.input.on("drop", this.onDrop);

    // Current Outfit Info Banner
    const currentOutfitObj = this.outfits.find((o) => o.id === (this.customization.outfit || "apprenti_lyfe")) || this.outfits[0];
    this.currentOutfitText = this.scene.add
      .text(x, y + 148, `Tenue : ${currentOutfitObj.name}`, {
        fontFamily: "Arial, sans-serif",
        fontSize: "12px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);
    this.add(this.currentOutfitText);

    this.bonusText = this.scene.add
      .text(x, y + 168, `⚡ ${currentOutfitObj.bonus}`, {
        fontFamily: "Arial, sans-serif",
        fontSize: "11px",
        color: "#00ffcc",
      })
      .setOrigin(0.5);
    this.add(this.bonusText);

    const hintText = this.scene.add
      .text(x, y + 188, "Glissez une tenue ici pour équiper", {
        fontFamily: "Arial, sans-serif",
        fontSize: "10px",
        fontStyle: "italic",
        color: "#94a3b8",
      })
      .setOrigin(0.5);
    this.add(hintText);
  }

  /**
   * Creates the tabs on the right side and displays content for the active tab.
   * @param {number} x
   * @param {number} y
   */
  createTabsAndControls(x, y) {
    const tabs = [
      { id: "outfits", label: "👗 Tenues" },
      { id: "hair", label: "💇 Coiffure" },
      { id: "face", label: "👁️ Visage" },
      { id: "accessories", label: "🕶️ Accessoires" },
    ];

    const tabWidth = 110;
    const startX = x - 170;
    const tabY = y - 180;

    tabs.forEach((tab, index) => {
      const tabX = startX + index * (tabWidth + 6);
      const isActive = this.activeTab === tab.id;

      const tabBg = this.scene.add
        .rectangle(tabX, tabY, tabWidth, 32, isActive ? 0x6c3483 : 0x1e2638)
        .setStrokeStyle(1.5, isActive ? 0xd2b4de : 0x374151)
        .setInteractive({ useHandCursor: true });

      const tabText = this.scene.add
        .text(tabX, tabY, tab.label, {
          fontFamily: "Arial, sans-serif",
          fontSize: "12px",
          fontStyle: isActive ? "bold" : "normal",
          color: isActive ? "#ffffff" : "#cbd5e1",
        })
        .setOrigin(0.5);

      tabBg.on("pointerdown", () => {
        if (this.activeTab !== tab.id) {
          this.activeTab = tab.id;
          this.initUI();
        }
      });

      this.add([tabBg, tabText]);
    });

    // Separator line under tabs
    const sep = this.scene.add
      .rectangle(x + 5, tabY + 22, 490, 1.5, 0x475569);
    this.add(sep);

    // Render active tab body
    if (this.activeTab === "outfits") {
      this.renderOutfitsTab(x, y);
    } else if (this.activeTab === "hair") {
      this.renderHairTab(x, y);
    } else if (this.activeTab === "face") {
      this.renderFaceTab(x, y);
    } else if (this.activeTab === "accessories") {
      this.renderAccessoriesTab(x, y);
    }
  }

  /**
   * Renders the tactical outfits list with Drag & Drop capability.
   * @param {number} x
   * @param {number} y
   */
  renderOutfitsTab(x, y) {
    this.outfits.forEach((outfit, index) => {
      const cardY = y - 100 + index * 95;
      const isEquipped = (this.customization.outfit || "apprenti_lyfe") === outfit.id;

      const card = this.scene.add
        .rectangle(x + 5, cardY, 490, 80, isEquipped ? 0x2b1c3d : 0x182030)
        .setStrokeStyle(1.5, isEquipped ? 0x9b59b6 : 0x334155);
      this.add(card);

      // Visual preview slot for the outfit on the left
      const iconSlotX = x - 200;
      const iconSlotBg = this.scene.add
        .rectangle(iconSlotX, cardY, 56, 64, isEquipped ? 0x1e122b : 0x0f1524)
        .setStrokeStyle(1.5, isEquipped ? 0x9b59b6 : 0x334155);

      const outfitIcon = this.scene.add
        .image(iconSlotX, cardY, outfit.texture || "avatar_outfit_apprenti")
        .setScale(0.24)
        .setAlpha(outfit.unlocked ? 1 : 0.35);

      if (!outfit.unlocked) {
        outfitIcon.setTint(0x555555);
      }

      this.add([iconSlotBg, outfitIcon]);

      // Title & Description (shifted right of the preview icon)
      const textStartX = x - 155;
      const outfitName = this.scene.add
        .text(textStartX, cardY - 20, outfit.name, {
          fontFamily: "Arial, sans-serif",
          fontSize: "14px",
          fontStyle: "bold",
          color: outfit.unlocked ? "#ffffff" : "#777777",
        })
        .setOrigin(0, 0.5);

      const outfitDesc = this.scene.add
        .text(textStartX, cardY + 2, outfit.desc, {
          fontFamily: "Arial, sans-serif",
          fontSize: "11px",
          color: outfit.unlocked ? "#94a3b8" : "#555555",
          wordWrap: { width: 250 },
        })
        .setOrigin(0, 0.5);

      const bonusDesc = this.scene.add
        .text(textStartX, cardY + 24, `⚡ ${outfit.bonus}`, {
          fontFamily: "Arial, sans-serif",
          fontSize: "11px",
          fontStyle: "bold",
          color: outfit.unlocked ? "#00ffcc" : "#445566",
        })
        .setOrigin(0, 0.5);

      this.add([outfitName, outfitDesc, bonusDesc]);

      if (isEquipped) {
        const equippedBadge = this.scene.add
          .text(x + 185, cardY, "ÉQUIPÉ ✓", {
            fontFamily: "Arial, sans-serif",
            fontSize: "13px",
            fontStyle: "bold",
            color: "#00ff88",
          })
          .setOrigin(0.5);
        this.add(equippedBadge);
      } else if (outfit.unlocked) {
        // Quick Equip Button
        const equipBtn = this.scene.add
          .rectangle(x + 185, cardY, 86, 32, 0x6c3483)
          .setStrokeStyle(1, 0xffffff)
          .setInteractive({ useHandCursor: true });

        const equipText = this.scene.add
          .text(x + 185, cardY, "Équiper", {
            fontFamily: "Arial, sans-serif",
            fontSize: "12px",
            color: "#ffffff",
          })
          .setOrigin(0.5);

        equipBtn.on("pointerdown", () => this.equipOutfit(outfit.id));
        this.add([equipBtn, equipText]);

        // Drag & Drop handle on the entire card and icon
        card.setInteractive({ draggable: true, useHandCursor: true });
        card.outfitData = outfit;

        card.on("dragstart", (pointer) => {
          this.cleanupDragGhost();

          // Create the outfit sprite as the drag ghost!
          this.activeDragGhost = this.scene.add
            .image(pointer.x, pointer.y, outfit.texture || "avatar_outfit_apprenti")
            .setScale(0.5)
            .setAlpha(0.9)
            .setDepth(1300);
        });

        card.on("drag", (pointer) => {
          if (this.activeDragGhost) {
            this.activeDragGhost.setPosition(pointer.x, pointer.y);
          }
        });

        card.on("dragend", () => {
          this.cleanupDragGhost();
        });
      } else {
        const lockedText = this.scene.add
          .text(x + 185, cardY, "🔒 Verrouillé", {
            fontFamily: "Arial, sans-serif",
            fontSize: "12px",
            color: "#64748b",
          })
          .setOrigin(0.5);
        this.add(lockedText);
      }
    });
  }

  /**
   * Renders the hairstyle and hair color customization tab.
   * @param {number} x
   * @param {number} y
   */
  renderHairTab(x, y) {
    // 1. Hairstyle selection
    const styleHeader = this.scene.add
      .text(x - 230, y - 130, "Coupe de Cheveux :", {
        fontFamily: "Arial, sans-serif",
        fontSize: "14px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0, 0.5);
    this.add(styleHeader);

    this.hairStyles.forEach((style, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const btnX = x - 120 + col * 240;
      const btnY = y - 85 + row * 46;
      const isSelected = (this.customization.hairStyle || "hair_short") === style.id;

      const btn = this.scene.add
        .rectangle(btnX, btnY, 220, 36, isSelected ? 0x6c3483 : 0x1f293d)
        .setStrokeStyle(1.5, isSelected ? 0x00ffcc : 0x475569)
        .setInteractive({ useHandCursor: true });

      const btnText = this.scene.add
        .text(btnX, btnY, `${isSelected ? "✓ " : ""}${style.name}`, {
          fontFamily: "Arial, sans-serif",
          fontSize: "12px",
          fontStyle: isSelected ? "bold" : "normal",
          color: isSelected ? "#ffffff" : "#cbd5e1",
        })
        .setOrigin(0.5);

      btn.on("pointerdown", () => {
        this.customization.hairStyle = style.id;
        gameState.setCustomization({ hairStyle: style.id });
        this.avatar.updateAppearance(this.customization);
        this.avatar.playEquipAnimation();
        this.initUI();
      });

      this.add([btn, btnText]);
    });

    // 2. Hair color selection
    const colorHeader = this.scene.add
      .text(x - 230, y + 25, "Couleur des Cheveux (Teinte) :", {
        fontFamily: "Arial, sans-serif",
        fontSize: "14px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0, 0.5);
    this.add(colorHeader);

    this.hairColors.forEach((colorOpt, index) => {
      const colX = x - 180 + index * 75;
      const colY = y + 80;
      const isSelected = (this.customization.hairColor ?? 0x5a3825) === colorOpt.color;

      const circle = this.scene.add
        .circle(colX, colY, 22, colorOpt.color)
        .setStrokeStyle(isSelected ? 3 : 1.5, isSelected ? 0x00ffcc : 0xffffff)
        .setInteractive({ useHandCursor: true });

      const label = this.scene.add
        .text(colX, colY + 32, colorOpt.name, {
          fontFamily: "Arial, sans-serif",
          fontSize: "10px",
          color: isSelected ? "#00ffcc" : "#94a3b8",
        })
        .setOrigin(0.5);

      circle.on("pointerdown", () => {
        this.customization.hairColor = colorOpt.color;
        gameState.setCustomization({ hairColor: colorOpt.color });
        this.avatar.updateAppearance(this.customization);
        this.avatar.playEquipAnimation();
        this.initUI();
      });

      this.add([circle, label]);
    });
  }

  /**
   * Renders the face customization tab (skin tone & eye color).
   * @param {number} x
   * @param {number} y
   */
  renderFaceTab(x, y) {
    // 1. Skin tone
    const skinHeader = this.scene.add
      .text(x - 230, y - 130, "Teint de Peau :", {
        fontFamily: "Arial, sans-serif",
        fontSize: "14px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0, 0.5);
    this.add(skinHeader);

    this.skinTones.forEach((skin, index) => {
      const colX = x - 140 + index * 140;
      const colY = y - 75;
      const isSelected = (this.customization.skinTone || "light") === skin.id;

      const card = this.scene.add
        .rectangle(colX, colY, 125, 54, isSelected ? 0x6c3483 : 0x1f293d)
        .setStrokeStyle(1.5, isSelected ? 0x00ffcc : 0x475569)
        .setInteractive({ useHandCursor: true });

      const previewColor = this.scene.add
        .circle(colX - 40, colY, 12, skin.color)
        .setStrokeStyle(1, 0xffffff);

      const skinName = this.scene.add
        .text(colX + 5, colY, skin.name, {
          fontFamily: "Arial, sans-serif",
          fontSize: "11px",
          fontStyle: isSelected ? "bold" : "normal",
          color: isSelected ? "#ffffff" : "#cbd5e1",
        })
        .setOrigin(0.5);

      card.on("pointerdown", () => {
        this.customization.skinTone = skin.id;
        gameState.setCustomization({ skinTone: skin.id });
        this.avatar.updateAppearance(this.customization);
        this.avatar.playEquipAnimation();
        this.initUI();
      });

      this.add([card, previewColor, skinName]);
    });

    // 2. Eye color
    const eyesHeader = this.scene.add
      .text(x - 230, y + 5, "Couleur des Yeux :", {
        fontFamily: "Arial, sans-serif",
        fontSize: "14px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0, 0.5);
    this.add(eyesHeader);

    this.eyeColors.forEach((eye, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const colX = x - 120 + col * 240;
      const colY = y + 55 + row * 52;
      const isSelected = (this.customization.eyeColor || "blue") === eye.id;

      const card = this.scene.add
        .rectangle(colX, colY, 220, 40, isSelected ? 0x6c3483 : 0x1f293d)
        .setStrokeStyle(1.5, isSelected ? 0x00ffcc : 0x475569)
        .setInteractive({ useHandCursor: true });

      const eyeSwatch = this.scene.add
        .circle(colX - 75, colY, 10, eye.color)
        .setStrokeStyle(1, 0xffffff);

      const eyeLabel = this.scene.add
        .text(colX + 5, colY, `${isSelected ? "✓ " : ""}${eye.name}`, {
          fontFamily: "Arial, sans-serif",
          fontSize: "12px",
          fontStyle: isSelected ? "bold" : "normal",
          color: isSelected ? "#ffffff" : "#cbd5e1",
        })
        .setOrigin(0.5);

      card.on("pointerdown", () => {
        this.customization.eyeColor = eye.id;
        gameState.setCustomization({ eyeColor: eye.id });
        this.avatar.updateAppearance(this.customization);
        this.avatar.playEquipAnimation();
        this.initUI();
      });

      this.add([card, eyeSwatch, eyeLabel]);
    });
  }

  /**
   * Renders the accessories tab.
   * @param {number} x
   * @param {number} y
   */
  renderAccessoriesTab(x, y) {
    const accHeader = this.scene.add
      .text(x - 230, y - 130, "Accessoires Tactiques :", {
        fontFamily: "Arial, sans-serif",
        fontSize: "14px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0, 0.5);
    this.add(accHeader);

    this.accessories.forEach((acc, index) => {
      const cardY = y - 75 + index * 60;
      const isSelected = (this.customization.accessory || "none") === acc.id;

      const card = this.scene.add
        .rectangle(x + 5, cardY, 490, 50, isSelected ? 0x2b1c3d : 0x182030)
        .setStrokeStyle(1.5, isSelected ? 0x00ffcc : 0x334155)
        .setInteractive({ useHandCursor: true });

      const name = this.scene.add
        .text(x - 220, cardY - 8, `${isSelected ? "✓ " : ""}${acc.name}`, {
          fontFamily: "Arial, sans-serif",
          fontSize: "13px",
          fontStyle: "bold",
          color: isSelected ? "#00ffcc" : "#ffffff",
        })
        .setOrigin(0, 0.5);

      const desc = this.scene.add
        .text(x - 220, cardY + 12, acc.desc, {
          fontFamily: "Arial, sans-serif",
          fontSize: "11px",
          color: "#94a3b8",
        })
        .setOrigin(0, 0.5);

      const statusBadge = this.scene.add
        .text(x + 200, cardY, isSelected ? "ÉQUIPÉ" : "Choisir", {
          fontFamily: "Arial, sans-serif",
          fontSize: "12px",
          fontStyle: isSelected ? "bold" : "normal",
          color: isSelected ? "#00ff88" : "#cbd5e1",
        })
        .setOrigin(0.5);

      card.on("pointerdown", () => {
        this.customization.accessory = acc.id;
        gameState.setCustomization({ accessory: acc.id });
        this.avatar.updateAppearance(this.customization);
        this.avatar.playEquipAnimation();
        this.initUI();
      });

      this.add([card, name, desc, statusBadge]);
    });
  }

  /**
   * Equips a chosen outfit, updates GameState and triggers story milestones if relevant.
   * @param {string} outfitId
   */
  equipOutfit(outfitId) {
    this.customization.outfit = outfitId;
    gameState.setCustomization({ outfit: outfitId });

    if (this.avatar) {
      this.avatar.updateAppearance(this.customization);
      this.avatar.playEquipAnimation();
    }

    this.initUI();

    // Milestone: Equipping the bulletproof apron unlocks Chapter 1 epilogue
    if (
      outfitId === "tablier_pare_balles" &&
      gameState.getFlag("chap1_scene4_dialog_completed") &&
      !gameState.getFlag("chap1_completed")
    ) {
      gameState.setFlag("chap1_scene4_completed", true);
      gameState.setFlag("chap1_completed", true);
      gameState.completeChapter(1);
      gameState.setChapter(2);
      const targetScene = this.scene;
      this.close();
      if (targetScene && targetScene.scene) {
        targetScene.scene.start("Game", { dialogId: "bocuse_chap1_conclusion" });
      }
    }
  }

  /**
   * Registers keyboard listeners (Escape to close).
   */
  initKeyboard() {
    this.onKeyDown = (event) => {
      if (!this.scene || !this.visible) return;

      if (event.key === "Escape") {
        event.preventDefault();
        this.close();
      }
    };
    if (this.scene && this.scene.input && this.scene.input.keyboard) {
      this.scene.input.keyboard.on("keydown", this.onKeyDown);
    }
  }

  /**
   * Cleans up any floating drag ghost image.
   */
  cleanupDragGhost() {
    if (this.activeDragGhost) {
      if (this.activeDragGhost.textRef) {
        this.activeDragGhost.textRef.destroy();
      }
      this.activeDragGhost.destroy();
      this.activeDragGhost = null;
    }
  }

  /**
   * Cleans up scene-level drag event listeners.
   */
  cleanupDragListeners() {
    if (this.scene && this.scene.input) {
      if (this.onDragEnter) {
        this.scene.input.off("dragenter", this.onDragEnter);
        this.onDragEnter = null;
      }
      if (this.onDragLeave) {
        this.scene.input.off("dragleave", this.onDragLeave);
        this.onDragLeave = null;
      }
      if (this.onDrop) {
        this.scene.input.off("drop", this.onDrop);
        this.onDrop = null;
      }
    }
  }

  /**
   * Cleans up keyboard listeners, drag objects, and destroys the modal container.
   */
  close() {
    this.cleanupDragGhost();
    this.cleanupDragListeners();
    if (this.scene && this.scene.input && this.scene.input.keyboard && this.onKeyDown) {
      this.scene.input.keyboard.off("keydown", this.onKeyDown);
      this.onKeyDown = null;
    }
    const onCloseCb = this.onClose;
    this.destroy();
    if (typeof onCloseCb === "function") {
      onCloseCb();
    }
  }
}
