import { GameObjects } from "phaser";
import { gameState } from "../state/GameState.js";
import { SaveManager } from "../manager/SaveManager.js";

/**
 * Point & Click visual inventory and inspection modal.
 */
export class InventoryModal extends GameObjects.Container {
  /**
   * @param {Phaser.Scene} scene
   * @param {Object} [options={}]
   * @param {Function} [options.onClose] - Callback fired when the modal closes
   */
  constructor(scene, options = {}) {
    super(scene, 0, 0);

    this.onClose = options.onClose || (() => {});
    this.totalSlots = 12; // 3 rows x 4 columns grid
    this.selectedItemId = null;
    this.inspectionRevealed = false;

    // Retrieve static catalog from Phaser cache
    this.itemsCatalog = scene.cache.json.get("items") || {};

    this.initUI();
    this.initKeyboard();

    scene.add.existing(this);
    this.setDepth(1100);
  }

  initUI() {
    this.removeAll(true);

    const screenWidth = this.scene.scale.width;
    const screenHeight = this.scene.scale.height;

    // Semi-transparent darkened background
    this.backdrop = this.scene.add
      .rectangle(screenWidth / 2, screenHeight / 2, screenWidth, screenHeight, 0x000000, 0.72)
      .setInteractive();
    this.add(this.backdrop);

    // Main window container
    const winWidth = 780;
    const winHeight = 520;
    const winX = screenWidth / 2;
    const winY = screenHeight / 2;

    this.windowBg = this.scene.add
      .rectangle(winX, winY, winWidth, winHeight, 0x1e222d, 0.98)
      .setStrokeStyle(3, 0x00d2ff);
    this.add(this.windowBg);

    // Title bar
    const titleBarHeight = 44;
    const titleBarY = winY - winHeight / 2 + titleBarHeight / 2;
    this.titleBar = this.scene.add.rectangle(winX, titleBarY, winWidth, titleBarHeight, 0x103460);
    this.add(this.titleBar);

    // Title text
    this.titleText = this.scene.add
      .text(winX - winWidth / 2 + 20, titleBarY, "🎒 SACOCHE D'AGENT - INVENTAIRE TACTIQUE", {
        fontFamily: "Arial, sans-serif",
        fontSize: "17px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0, 0.5);
    this.add(this.titleText);

    // Close button [X]
    const closeBtn = this.scene.add
      .text(winX + winWidth / 2 - 25, titleBarY, "✖", {
        fontFamily: "Arial, sans-serif",
        fontSize: "18px",
        color: "#ff6b6b",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    closeBtn.on("pointerdown", () => this.close());
    this.add(closeBtn);

    // Fetch player items list from GameState
    const rawItems = gameState.getItems();
    // Normalize items: each element can be a string ID or an object { id, quantity }
    const playerItems = rawItems.map((item) => {
      if (typeof item === "string") {
        return { id: item, quantity: 1 };
      }
      return { id: item.id, quantity: item.quantity || 1 };
    });

    // Subtitle / capacity counter
    const capacityText = this.scene.add
      .text(
        winX - winWidth / 2 + 25,
        winY - winHeight / 2 + 65,
        `Capacité sacoche : ${playerItems.length} / ${this.totalSlots} objets`,
        {
          fontFamily: "Courier, monospace",
          fontSize: "13px",
          color: "#94a3b8",
        }
      )
      .setOrigin(0, 0.5);
    this.add(capacityText);

    // Default selection: keep current selected item if still present, or select first item
    if (playerItems.length > 0) {
      const exists = playerItems.some((i) => i.id === this.selectedItemId);
      if (!exists) {
        this.selectedItemId = playerItems[0].id;
        this.inspectionRevealed = false;
      }
    } else {
      this.selectedItemId = null;
    }

    // Render left inventory grid (3 rows x 4 columns)
    this.renderGrid(winX - 190, winY + 20, playerItems);

    // Render right inspection panel
    this.renderInspectionPanel(winX + 180, winY + 20);

    // Bottom helper note
    const helpNote = this.scene.add
      .text(
        winX,
        winY + winHeight / 2 - 22,
        "Astuce : Appuyez sur [ I ] pour ouvrir/fermer la sacoche ou [ Échap ] pour quitter.",
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "12px",
          color: "#64748b",
        }
      )
      .setOrigin(0.5);
    this.add(helpNote);
  }

  /**
   * Renders the 3x4 Point & Click inventory slots grid.
   * @param {number} centerX
   * @param {number} centerY
   * @param {Array} playerItems
   */
  renderGrid(centerX, centerY, playerItems) {
    const cols = 4;
    const rows = 3;
    const slotSize = 76;
    const spacing = 12;

    const gridWidth = cols * slotSize + (cols - 1) * spacing;
    const gridHeight = rows * slotSize + (rows - 1) * spacing;

    const startX = centerX - gridWidth / 2 + slotSize / 2;
    const startY = centerY - gridHeight / 2 + slotSize / 2 - 10;

    for (let index = 0; index < this.totalSlots; index++) {
      const col = index % cols;
      const row = Math.floor(index / cols);

      const slotX = startX + col * (slotSize + spacing);
      const slotY = startY + row * (slotSize + spacing);

      const itemData = playerItems[index] || null;
      const isSelected = itemData && itemData.id === this.selectedItemId;

      // Slot background
      const slotBg = this.scene.add
        .rectangle(
          slotX,
          slotY,
          slotSize,
          slotSize,
          isSelected ? 0x243b55 : 0x141b26,
          0.95
        )
        .setStrokeStyle(2, isSelected ? 0x00ffcc : 0x334155);

      this.add(slotBg);

      if (itemData) {
        slotBg.setInteractive({ useHandCursor: true });

        // Lookup static details from items.json
        const meta = this.itemsCatalog[itemData.id] || {
          name: itemData.id,
          icon: "📦",
          category: "Objet",
        };

        // Item icon (Sprite texture or Emoji fallback)
        if (meta.texture && this.scene.textures.exists(meta.texture)) {
          const itemImg = this.scene.add
            .image(slotX, slotY - 10, meta.texture)
            .setDisplaySize(42, 42);
          this.add(itemImg);
        } else {
          const iconText = this.scene.add
            .text(slotX, slotY - 10, meta.icon || "📦", {
              fontFamily: "Arial, sans-serif",
              fontSize: "28px",
            })
            .setOrigin(0.5);
          this.add(iconText);
        }

        // Truncated item label below icon
        const shortName =
          meta.name.length > 10 ? meta.name.substring(0, 9) + "…" : meta.name;
        const nameText = this.scene.add
          .text(slotX, slotY + 22, shortName, {
            fontFamily: "Arial, sans-serif",
            fontSize: "10px",
            color: isSelected ? "#00ffcc" : "#cbd5e1",
            align: "center",
          })
          .setOrigin(0.5);
        this.add(nameText);

        // Quantity badge if greater than 1
        if (itemData.quantity > 1) {
          const qtyBg = this.scene.add
            .rectangle(slotX + slotSize / 2 - 12, slotY - slotSize / 2 + 10, 20, 16, 0x00d2ff)
            .setOrigin(0.5);
          const qtyText = this.scene.add
            .text(slotX + slotSize / 2 - 12, slotY - slotSize / 2 + 10, `${itemData.quantity}`, {
              fontFamily: "Arial, sans-serif",
              fontSize: "10px",
              fontStyle: "bold",
              color: "#000000",
            })
            .setOrigin(0.5);
          this.add([qtyBg, qtyText]);
        }

        // Hover & click interactions
        slotBg.on("pointerover", () => {
          if (itemData.id !== this.selectedItemId) {
            slotBg.setStrokeStyle(2, 0x00d2ff);
            slotBg.setFillStyle(0x1e2d42);
          }
        });

        slotBg.on("pointerout", () => {
          if (itemData.id !== this.selectedItemId) {
            slotBg.setStrokeStyle(2, 0x334155);
            slotBg.setFillStyle(0x141b26);
          }
        });

        slotBg.on("pointerdown", () => {
          this.selectedItemId = itemData.id;
          this.inspectionRevealed = false;
          this.initUI();
        });
      }
    }
  }

  /**
   * Renders the right inspection panel displaying item details and actions.
   * @param {number} panelX
   * @param {number} panelY
   */
  renderInspectionPanel(panelX, panelY) {
    const panelWidth = 340;
    const panelHeight = 400;

    // Panel card frame
    const cardBg = this.scene.add
      .rectangle(panelX, panelY, panelWidth, panelHeight, 0x141b26, 0.95)
      .setStrokeStyle(1, 0x3b4a60);
    this.add(cardBg);

    if (!this.selectedItemId) {
      // Empty state prompt
      const emptyPrompt = this.scene.add
        .text(
          panelX,
          panelY,
          "🔍 Aucun objet sélectionné.\n\nCliquez sur un objet dans la sacoche pour l'inspecter et examiner ses propriétés.",
          {
            fontFamily: "Arial, sans-serif",
            fontSize: "14px",
            color: "#64748b",
            align: "center",
            wordWrap: { width: 280 },
          }
        )
        .setOrigin(0.5);
      this.add(emptyPrompt);
      return;
    }

    const itemMeta = this.itemsCatalog[this.selectedItemId] || {
      name: this.selectedItemId,
      category: "Inconnu",
      icon: "📦",
      description: "Objet sans description.",
      inspection: "Rien de particulier à signaler.",
    };

    const topY = panelY - panelHeight / 2 + 14;

    // Item icon preview box
    const iconBox = this.scene.add
      .rectangle(panelX - 112, topY + 30, 52, 52, 0x0f141c)
      .setStrokeStyle(1, 0x00d2ff);
    this.add(iconBox);

    if (itemMeta.texture && this.scene.textures.exists(itemMeta.texture)) {
      const itemImg = this.scene.add
        .image(panelX - 112, topY + 30, itemMeta.texture)
        .setDisplaySize(44, 44);
      this.add(itemImg);
    } else {
      const iconDisplay = this.scene.add
        .text(panelX - 112, topY + 30, itemMeta.icon || "📦", {
          fontFamily: "Arial, sans-serif",
          fontSize: "30px",
        })
        .setOrigin(0.5);
      this.add(iconDisplay);
    }

    // Item title
    const itemName = this.scene.add
      .text(panelX - 68, topY + 18, itemMeta.name, {
        fontFamily: "Arial, sans-serif",
        fontSize: "14px",
        fontStyle: "bold",
        color: "#ffffff",
        wordWrap: { width: 195 },
      })
      .setOrigin(0, 0.5);
    this.add(itemName);

    // Category badge
    const catBadge = this.scene.add
      .text(panelX - 68, topY + 42, `[ ${itemMeta.category || "Objet"} ]`, {
        fontFamily: "Courier, monospace",
        fontSize: "11px",
        color: "#00ffcc",
      })
      .setOrigin(0, 0.5);
    this.add(catBadge);

    // Divider
    const divider = this.scene.add
      .line(panelX, topY + 68, -145, 0, 145, 0, 0x334155)
      .setOrigin(0, 0);
    this.add(divider);

    // Section 1: Standard Description
    const descLabel = this.scene.add
      .text(panelX - 145, topY + 80, "DESCRIPTION :", {
        fontFamily: "Arial, sans-serif",
        fontSize: "11px",
        fontStyle: "bold",
        color: "#94a3b8",
      })
      .setOrigin(0, 0.5);
    this.add(descLabel);

    const descText = this.scene.add
      .text(panelX - 145, topY + 95, itemMeta.description, {
        fontFamily: "Arial, sans-serif",
        fontSize: "12px",
        color: "#e2e8f0",
        wordWrap: { width: 290 },
        lineSpacing: 3,
      })
      .setOrigin(0, 0);
    this.add(descText);

    // Section 2: Detailed Inspection Panel (Point & Click Inspector)
    const descBottom = descText.y + descText.height;
    const inspectY = descBottom + 12;
    let nextSectionY = inspectY;

    if (this.inspectionRevealed) {
      // Create texts first to measure dynamic height
      const inspectTitle = this.scene.add
        .text(panelX - 140, inspectY + 12, "🔍 RAPPORT D'INSPECTION TACTIQUE :", {
          fontFamily: "Arial, sans-serif",
          fontSize: "11px",
          fontStyle: "bold",
          color: "#ffdd00",
        })
        .setOrigin(0, 0.5);

      const inspectContent = this.scene.add
        .text(panelX - 140, inspectY + 26, itemMeta.inspection, {
          fontFamily: "Arial, sans-serif",
          fontSize: "11px",
          color: "#fef08a",
          wordWrap: { width: 280 },
          lineSpacing: 3,
        })
        .setOrigin(0, 0);

      // Dynamically calculate the box height to enclose all text with comfortable padding
      const inspectBoxHeight = Math.max(68, inspectContent.height + 36);

      const inspectBox = this.scene.add
        .rectangle(panelX, inspectY + inspectBoxHeight / 2, 310, inspectBoxHeight, 0x0b131f)
        .setStrokeStyle(1, 0xffdd00);

      // Add background first so it sits behind text
      this.add(inspectBox);
      this.add([inspectTitle, inspectContent]);

      nextSectionY = inspectY + inspectBoxHeight + 14;
    } else {
      // Button to trigger inspection
      const inspectBtn = this.scene.add
        .rectangle(panelX, inspectY + 18, 300, 34, 0x1e3a5f)
        .setStrokeStyle(1, 0x00d2ff)
        .setInteractive({ useHandCursor: true });

      const inspectBtnLabel = this.scene.add
        .text(panelX, inspectY + 18, "🔍 Inspecter l'objet en détail", {
          fontFamily: "Arial, sans-serif",
          fontSize: "13px",
          fontStyle: "bold",
          color: "#ffffff",
        })
        .setOrigin(0.5);

      inspectBtn.on("pointerover", () => inspectBtn.setFillStyle(0x00d2ff, 0.4));
      inspectBtn.on("pointerout", () => inspectBtn.setFillStyle(0x1e3a5f, 1));
      inspectBtn.on("pointerdown", () => {
        this.inspectionRevealed = true;
        this.initUI();
      });

      this.add([inspectBtn, inspectBtnLabel]);
      nextSectionY = inspectY + 44;
    }

    // Section 3: Contextual action button (e.g. Open Box, Equip Armor)
    if (itemMeta.action) {
      const actionY = Math.min(nextSectionY + 18, topY + panelHeight - 35);
      this.renderActionButton(panelX, actionY, itemMeta);
    }
  }

  /**
   * Renders contextual action button for the selected item.
   * @param {number} x
   * @param {number} y
   * @param {Object} itemMeta
   */
  renderActionButton(x, y, itemMeta) {
    if (!itemMeta.action) return;

    if (itemMeta.action === "OPEN") {
      const openBtn = this.scene.add
        .rectangle(x, y, 300, 36, 0x1f7a3a)
        .setStrokeStyle(1, 0x00ff88)
        .setInteractive({ useHandCursor: true });

      const openLabel = this.scene.add
        .text(x, y, `📦 ${itemMeta.actionLabel || "Ouvrir"}`, {
          fontFamily: "Arial, sans-serif",
          fontSize: "13px",
          fontStyle: "bold",
          color: "#ffffff",
        })
        .setOrigin(0.5);

      openBtn.on("pointerover", () => openBtn.setAlpha(0.85));
      openBtn.on("pointerout", () => openBtn.setAlpha(1));
      openBtn.on("pointerdown", () => {
        this.handleOpenContainer(itemMeta);
      });

      this.add([openBtn, openLabel]);
    } else if (itemMeta.action === "EQUIP") {
      const isEquipped =
        gameState.getFlag("equippedOutfit") === itemMeta.outfitId;

      const equipBtn = this.scene.add
        .rectangle(x, y, 300, 36, isEquipped ? 0x271f38 : 0x6c3483)
        .setStrokeStyle(1, isEquipped ? 0x9b59b6 : 0xffffff)
        .setInteractive({ useHandCursor: true });

      const equipLabel = this.scene.add
        .text(
          x,
          y,
          isEquipped
            ? "✓ Tenue actuellement équipée"
            : `👗 ${itemMeta.actionLabel || "Équiper"}`,
          {
            fontFamily: "Arial, sans-serif",
            fontSize: "13px",
            fontStyle: "bold",
            color: isEquipped ? "#00ff88" : "#ffffff",
          }
        )
        .setOrigin(0.5);

      equipBtn.on("pointerover", () => equipBtn.setAlpha(0.85));
      equipBtn.on("pointerout", () => equipBtn.setAlpha(1));
      equipBtn.on("pointerdown", () => {
        gameState.setFlag("equippedOutfit", itemMeta.outfitId);
        if (typeof this.scene.refreshStatus === "function") {
          this.scene.refreshStatus();
        }
        if (this.scene.taskbar && typeof this.scene.taskbar.refreshStatus === "function") {
          this.scene.taskbar.refreshStatus();
        }

        // Check Chapter 1 completion condition
        if (
          itemMeta.outfitId === "tablier_pare_balles" &&
          gameState.getFlag("chap1_scene4_dialog_completed") &&
          !gameState.getFlag("chap1_completed")
        ) {
          this.triggerChapter1Completion();
          return;
        }

        this.initUI();
      });

      this.add([equipBtn, equipLabel]);
    }
  }

  /**
   * Triggers celebration modal and progression advancement when completing Chapter 1.
   */
  triggerChapter1Completion() {
    gameState.setFlag("chap1_completed", true);
    gameState.completeChapter(1);
    gameState.setChapter(2);
    SaveManager.save();

    // Close inventory modal
    this.close();

    // Celebration modal
    const overlay = this.scene.add
      .rectangle(960, 490, 1920, 980, 0x000000, 0.85)
      .setDepth(2000)
      .setInteractive();

    const box = this.scene.add
      .rectangle(960, 490, 840, 460, 0x0b1326, 0.98)
      .setStrokeStyle(3, 0xffdd00)
      .setDepth(2001);

    const title = this.scene.add
      .text(960, 310, "🏆 MISSION ACCOMPLIE : CHAPITRE 1 VALIDÉ !", {
        fontFamily: "Arial, sans-serif",
        fontSize: "22px",
        fontStyle: "bold",
        color: "#ffdd00",
      })
      .setOrigin(0.5)
      .setDepth(2002);

    const sub = this.scene.add
      .text(960, 345, "« Mise en Bouche Confidentielle »", {
        fontFamily: "Arial, sans-serif",
        fontSize: "15px",
        fontStyle: "italic",
        color: "#00ffcc",
      })
      .setOrigin(0.5)
      .setDepth(2002);

    const bodyText =
      "Félicitations Recrue ! Votre couverture d'apprenti est désormais scellée.\n\n" +
      "✓ Dossier initialisé auprès du Directeur Paul Bocuse.\n" +
      "✓ Accréditation et badge validés par Philippe Etchebest.\n" +
      "✓ Arsenal secret et macaron explosif obtenus auprès de Cyril Lignac.\n" +
      "✓ Épreuve physique surmontée et Tablier Pare-Balles de Gordon Ramsay équipé !\n\n" +
      "Votre véritable mission d'infiltration au château commence maintenant.\n" +
      "Progression automatiquement sauvegardée. Bienvenue au Chapitre 2 !";

    const content = this.scene.add
      .text(960, 460, bodyText, {
        fontFamily: "Arial, sans-serif",
        fontSize: "14px",
        color: "#e2e8f0",
        align: "center",
        lineSpacing: 5,
      })
      .setOrigin(0.5)
      .setDepth(2002);

    const continueBtn = this.scene.add
      .rectangle(960, 640, 260, 42, 0x155d27)
      .setStrokeStyle(2, 0x00ff88)
      .setInteractive({ useHandCursor: true })
      .setDepth(2002);

    const continueLabel = this.scene.add
      .text(960, 640, "Continuer l'aventure ▶", {
        fontFamily: "Arial, sans-serif",
        fontSize: "15px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setDepth(2002);

    continueBtn.on("pointerover", () => continueBtn.setFillStyle(0x1d7c34));
    continueBtn.on("pointerout", () => continueBtn.setFillStyle(0x155d27));
    continueBtn.on("pointerdown", () => {
      overlay.destroy();
      box.destroy();
      title.destroy();
      sub.destroy();
      content.destroy();
      continueBtn.destroy();
      continueLabel.destroy();

      if (this.scene.taskbar && typeof this.scene.taskbar.refreshStatus === "function") {
        this.scene.taskbar.refreshStatus();
        this.scene.taskbar.showToast("✓ Chapitre 2 débloqué !");
      }
    });
  }

  /**
   * Handles opening a container item (e.g. Mystery cake box).
   * @param {Object} itemMeta
   */
  handleOpenContainer(itemMeta) {
    const currentBoxId = this.selectedItemId;

    // Remove box and add reward item
    gameState.removeItem(currentBoxId, 1);
    if (itemMeta.rewardItemId) {
      gameState.addItem(itemMeta.rewardItemId, 1);
      this.selectedItemId = itemMeta.rewardItemId;
    } else {
      this.selectedItemId = null;
    }

    this.inspectionRevealed = true;

    // Toast feedback if available on the current scene
    if (typeof this.scene.showToast === "function") {
      this.scene.showToast(
        itemMeta.rewardMessage || "📦 Objet ouvert avec succès !"
      );
    }

    this.initUI();
  }

  /**
   * Initializes keyboard navigation (Close on [ Escape ]).
   */
  initKeyboard() {
    this.onKeyDown = (event) => {
      if (!this.scene || !this.visible) return;

      if (event.key === "Escape") {
        event.preventDefault();
        this.close();
      }
    };

    this.scene.input.keyboard.on("keydown", this.onKeyDown);
  }

  /**
   * Closes the inventory modal and cleans up listeners.
   */
  close() {
    if (
      this.scene &&
      this.scene.input &&
      this.scene.input.keyboard &&
      this.onKeyDown
    ) {
      this.scene.input.keyboard.off("keydown", this.onKeyDown);
    }
    this.destroy();
    this.onClose();
  }
}

