import { GameObjects } from "phaser";
import { audioManager } from "../manager/AudioManager.js";

/**
 * Retro OS File Explorer Window for the 'Multimédia' folder.
 * Supports navigation between root, 'Musiques' and 'Images' subfolders.
 */
export class MediaFolderModal extends GameObjects.Container {
  /**
   * @param {Phaser.Scene} scene
   * @param {Object} [options]
   * @param {string} [options.initialView="root"] // "root" | "musics" | "images"
   * @param {Function} [options.onPlayMusic]
   * @param {Function} [options.onClose]
   */
  constructor(scene, options = {}) {
    super(scene, 0, 0);

    this.onClose = options.onClose || (() => {});
    this.onPlayMusic = options.onPlayMusic || (() => {});
    this.currentView = options.initialView || "root";

    this.initUI();
    this.initKeyboard();

    scene.add.existing(this);
    this.setDepth(1100);
  }

  initUI() {
    this.removeAll(true);

    const screenWidth = this.scene.scale.width;
    const screenHeight = this.scene.scale.height;
    const centerX = screenWidth / 2;
    const centerY = screenHeight / 2;

    // Dimmed background
    this.backdrop = this.scene.add
      .rectangle(centerX, centerY, screenWidth, screenHeight, 0x000000, 0.72)
      .setInteractive();
    this.add(this.backdrop);

    // Explorer Window
    const winWidth = 840;
    const winHeight = 540;

    this.windowBg = this.scene.add
      .rectangle(centerX, centerY, winWidth, winHeight, 0x0c1424, 0.98)
      .setStrokeStyle(3, 0x00d2ff);
    this.add(this.windowBg);

    // Title Bar
    const titleBarHeight = 42;
    const titleBarY = centerY - winHeight / 2 + titleBarHeight / 2;

    const titleBar = this.scene.add
      .rectangle(centerX, titleBarY, winWidth, titleBarHeight, 0x102b4c);
    this.add(titleBar);

    let pathTitle = "📁 C:\\AgentOS\\Multimédia";
    if (this.currentView === "musics") pathTitle += "\\Musiques";
    else if (this.currentView === "images") pathTitle += "\\Images";

    const titleText = this.scene.add
      .text(centerX - winWidth / 2 + 16, titleBarY, pathTitle, {
        fontFamily: "Arial, sans-serif",
        fontSize: "14px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0, 0.5);
    this.add(titleText);

    // Close button [✕]
    const closeBtn = this.scene.add
      .rectangle(centerX + winWidth / 2 - 24, titleBarY, 32, 26, 0x991b1b)
      .setStrokeStyle(1, 0xff4444)
      .setInteractive({ useHandCursor: true });

    const closeText = this.scene.add
      .text(centerX + winWidth / 2 - 24, titleBarY, "✕", {
        fontFamily: "Arial, sans-serif",
        fontSize: "14px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    closeBtn.on("pointerover", () => closeBtn.setFillStyle(0xdc2626));
    closeBtn.on("pointerout", () => closeBtn.setFillStyle(0x991b1b));
    closeBtn.on("pointerdown", () => this.close());
    this.add([closeBtn, closeText]);

    // Navigation Bar / Breadcrumb
    const navBarY = titleBarY + titleBarHeight / 2 + 20;
    const navBarBg = this.scene.add
      .rectangle(centerX, navBarY, winWidth - 24, 34, 0x070c17)
      .setStrokeStyle(1, 0x1e293b);
    this.add(navBarBg);

    // Parent Folder Button [⬆ Dossier parent]
    const hasParent = this.currentView !== "root";
    const upBtn = this.scene.add
      .rectangle(
        centerX - winWidth / 2 + 90,
        navBarY,
        140,
        24,
        hasParent ? 0x1e3a5f : 0x111827
      )
      .setStrokeStyle(1, hasParent ? 0x00d2ff : 0x374151);

    if (hasParent) {
      upBtn.setInteractive({ useHandCursor: true });
      upBtn.on("pointerover", () => upBtn.setFillStyle(0x2563eb));
      upBtn.on("pointerout", () => upBtn.setFillStyle(0x1e3a5f));
      upBtn.on("pointerdown", () => {
        this.currentView = "root";
        this.initUI();
      });
    }

    const upLabel = this.scene.add
      .text(
        centerX - winWidth / 2 + 90,
        navBarY,
        "⬆ Dossier parent",
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "12px",
          fontStyle: "bold",
          color: hasParent ? "#ffffff" : "#64748b",
        }
      )
      .setOrigin(0.5);
    this.add([upBtn, upLabel]);

    // Breadcrumb text
    let breadcrumb = "Poste de travail > Multimédia";
    if (this.currentView === "musics") breadcrumb += " > 🎵 Musiques";
    else if (this.currentView === "images") breadcrumb += " > 🖼️ Images (Gadgets)";

    const breadcrumbText = this.scene.add
      .text(centerX - winWidth / 2 + 180, navBarY, breadcrumb, {
        fontFamily: "Arial, sans-serif",
        fontSize: "13px",
        color: "#94a3b8",
      })
      .setOrigin(0, 0.5);
    this.add(breadcrumbText);

    // Render current view contents
    if (this.currentView === "root") {
      this.renderRootView(centerX, centerY);
    } else if (this.currentView === "musics") {
      this.renderMusicsView(centerX, centerY);
    } else if (this.currentView === "images") {
      this.renderImagesView(centerX, centerY);
    }

    // Status bar at the bottom
    const statusBarY = centerY + winHeight / 2 - 18;
    const statusBar = this.scene.add
      .rectangle(centerX, statusBarY, winWidth, 30, 0x070c17)
      .setStrokeStyle(1, 0x1e293b);

    const hintText = this.scene.add
      .text(
        centerX,
        statusBarY,
        "⌨️ [ÉCHAP] : Fermer le dossier  |  Double-clic ou clic pour ouvrir les fichiers",
        {
          fontFamily: "Arial, sans-serif",
          fontSize: "12px",
          color: "#94a3b8",
        }
      )
      .setOrigin(0.5);
    this.add([statusBar, hintText]);
  }

  /* ========================================================================== */
  /* ROOT VIEW : DOSSIERS MUSIQUES & IMAGES                                     */
  /* ========================================================================== */

  renderRootView(centerX, centerY) {
    const folders = [
      {
        id: "musics",
        title: "Dossier : Musiques",
        subtitle: "Bande-son et archives audio\n4 pistes enregistrées",
        iconText: "🎵",
        badge: "4 FICHIERS MP3",
        badgeColor: "#00d2ff",
        x: centerX - 190,
      },
      {
        id: "images",
        title: "Dossier : Images",
        subtitle: "Arsenal et gadgets tactiques\n6 schémas techniques",
        iconText: "🖼️",
        badge: "6 OBJETS",
        badgeColor: "#ffdd00",
        x: centerX + 190,
      },
    ];

    folders.forEach((folder) => {
      const cardY = centerY + 30;
      const card = this.scene.add
        .rectangle(folder.x, cardY, 320, 280, 0x0f1b2f, 0.95)
        .setStrokeStyle(2, 0x1e3a5f)
        .setInteractive({ useHandCursor: true });

      // Big Folder Icon
      let folderImg;
      if (this.scene.textures.exists("folder")) {
        folderImg = this.scene.add.image(folder.x, cardY - 60, "folder");
        folderImg.setDisplaySize(96, 96);
        this.add(folderImg);
      } else {
        const emoji = this.scene.add
          .text(folder.x, cardY - 60, "📁", { fontSize: "64px" })
          .setOrigin(0.5);
        this.add(emoji);
      }

      // Mini badge icon
      const badgeIcon = this.scene.add
        .text(folder.x + 28, cardY - 30, folder.iconText, { fontSize: "28px" })
        .setOrigin(0.5);

      // Title
      const title = this.scene.add
        .text(folder.x, cardY + 22, folder.title, {
          fontFamily: "Arial, sans-serif",
          fontSize: "17px",
          fontStyle: "bold",
          color: "#ffffff",
        })
        .setOrigin(0.5);

      // Subtitle
      const sub = this.scene.add
        .text(folder.x, cardY + 62, folder.subtitle, {
          fontFamily: "Arial, sans-serif",
          fontSize: "13px",
          color: "#94a3b8",
          align: "center",
          lineSpacing: 4,
        })
        .setOrigin(0.5);

      // Pill badge
      const pill = this.scene.add
        .text(folder.x, cardY + 110, `[ ${folder.badge} ]`, {
          fontFamily: "Courier, monospace",
          fontSize: "12px",
          fontStyle: "bold",
          color: folder.badgeColor,
        })
        .setOrigin(0.5);

      card.on("pointerover", () => {
        card.setFillStyle(0x162945, 1);
        card.setStrokeStyle(2, 0x00d2ff);
        if (folderImg) folderImg.setScale(folderImg.scale * 1.08);
      });

      card.on("pointerout", () => {
        card.setFillStyle(0x0f1b2f, 0.95);
        card.setStrokeStyle(2, 0x1e3a5f);
        if (folderImg) folderImg.setDisplaySize(96, 96);
      });

      card.on("pointerdown", () => {
        this.currentView = folder.id;
        this.initUI();
      });

      this.add([card, badgeIcon, title, sub, pill]);
    });
  }

  /* ========================================================================== */
  /* MUSICS VIEW : LISTE DES PISTES AUDIO                                       */
  /* ========================================================================== */

  renderMusicsView(centerX, centerY) {
    const tracks = audioManager.getTrackList();
    const startY = centerY - 140;
    const rowHeight = 76;

    tracks.forEach((track, idx) => {
      const rowY = startY + idx * (rowHeight + 10);

      const rowBg = this.scene.add
        .rectangle(centerX, rowY, 780, rowHeight, 0x0f1d32, 0.95)
        .setStrokeStyle(1.5, 0x1e3a5f)
        .setInteractive({ useHandCursor: true });

      // Music note icon
      const icon = this.scene.add
        .text(centerX - 350, rowY, "🎵", { fontSize: "28px" })
        .setOrigin(0.5);

      // Title & Subtitle
      const title = this.scene.add
        .text(centerX - 310, rowY - 14, track.title, {
          fontFamily: "Arial, sans-serif",
          fontSize: "16px",
          fontStyle: "bold",
          color: "#ffffff",
        })
        .setOrigin(0, 0.5);

      const sub = this.scene.add
        .text(centerX - 310, rowY + 14, `${track.subtitle}  •  ${track.artist}`, {
          fontFamily: "Arial, sans-serif",
          fontSize: "12px",
          color: "#94a3b8",
        })
        .setOrigin(0, 0.5);

      // Play button on the right
      const playBtn = this.scene.add
        .rectangle(centerX + 280, rowY, 160, 38, 0x155d27)
        .setStrokeStyle(1.5, 0x00ff88)
        .setInteractive({ useHandCursor: true });

      const playLabel = this.scene.add
        .text(centerX + 280, rowY, "▶ Lancer Vinyle", {
          fontFamily: "Arial, sans-serif",
          fontSize: "13px",
          fontStyle: "bold",
          color: "#ffffff",
        })
        .setOrigin(0.5);

      const launchTrack = () => {
        this.close();
        this.onPlayMusic(track.id);
      };

      rowBg.on("pointerover", () => {
        rowBg.setFillStyle(0x162c4b, 1);
        rowBg.setStrokeStyle(1.5, 0x00d2ff);
        title.setColor("#00f3ff");
      });

      rowBg.on("pointerout", () => {
        rowBg.setFillStyle(0x0f1d32, 0.95);
        rowBg.setStrokeStyle(1.5, 0x1e3a5f);
        title.setColor("#ffffff");
      });

      rowBg.on("pointerdown", launchTrack);

      playBtn.on("pointerover", () => playBtn.setFillStyle(0x1d7c34));
      playBtn.on("pointerout", () => playBtn.setFillStyle(0x155d27));
      playBtn.on("pointerdown", launchTrack);

      this.add([rowBg, icon, title, sub, playBtn, playLabel]);
    });
  }

  /* ========================================================================== */
  /* IMAGES VIEW : GALERIE DES GADGETS & ARSENAL                                */
  /* ========================================================================== */

  renderImagesView(centerX, centerY) {
    const gadgets = [
      {
        texture: "item_poche_a_douille",
        fileName: "poche-a-douille.png",
        name: "Poche à Douille Tactique",
        category: "Arme Dissuasive",
        sub: "Munition cryogénique",
        description:
          "Poche à douille sous pression projetant de la crème pâtissière cryogénique à prise ultra-rapide.",
        inspection:
          "Idéale pour figer un ennemi sur place ou boucher instantanément un conduit d'aération ou un mécanisme d'alarme.",
      },
      {
        texture: "item_tablier_pare_balles",
        fileName: "tablier-pare-balle.png",
        name: "Tablier Pare-Balles du Chef",
        category: "Équipement Tactique",
        sub: "Armure Gordon Ramsay",
        description:
          "Tablier de cuisine renforcé de fibres de kevlar tressées, remis par le Chef Gordon Ramsay lors de l'entraînement.",
        inspection:
          "Un rembourrage secret protège les organes vitaux contre les éclaboussures et les tirs ennemis. Sceau 'Done to perfection'.",
      },
      {
        texture: "item_sainte_grenade",
        fileName: "sainte-grenade.png",
        name: "Sainte Grenade Pâtissière",
        category: "Explosif Sucré",
        sub: "Arme Cyril Lignac",
        description:
          "Grenade d'apparat dorée garnie d'une émulsion au sucre pétillant et caramel surchauffé.",
        inspection:
          "Dégoupiller, compter jusqu'à trois, et lancer vers le verrou ou la porte blindée pour une ouverture royale.",
      },
      {
        texture: "item_brookie_walkie",
        fileName: "brookie-walkie.png",
        name: "Brookie-Walkie Chiffré",
        category: "Communication Secrète",
        sub: "Radio chiffrée",
        description:
          "Émetteur-récepteur radio haute fréquence camouflé sous la forme d'un brookie mi-brownie mi-cookie.",
        inspection:
          "En pressant la pépite supérieure, vous ouvrez un canal sécurisé directement relié au bureau du Directeur Bocuse.",
      },
      {
        texture: "item_eclair_laser",
        fileName: "eclair-laser-on.png",
        name: "Éclair au Chocolat Laser",
        category: "Arme Photonique",
        sub: "Fusil photonique",
        description:
          "Pâtisserie tactique équipée d'un émetteur laser à haute concentration dans son glaçage chocolat.",
        inspection:
          "Permet de repousser les poursuivants et de neutraliser les systèmes de sécurité à distance.",
      },
      {
        texture: "item_boussole",
        fileName: "boussole.png",
        name: "Guide Michelin Tactique",
        category: "Carte & Navigation",
        sub: "Carte confidentielle",
        description:
          "Boussole de haute précision couplée au plan classifié de l'Institut Culinaire Secret.",
        inspection:
          "Indique l'emplacement de toutes les salles sécurisées, du laboratoire R&D et des couloirs de fuite.",
      },
    ];

    const cols = 3;
    const itemWidth = 240;
    const itemHeight = 150;
    const startX = centerX - 260;
    const startY = centerY - 60;

    gadgets.forEach((gadget, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const gx = startX + col * itemWidth;
      const gy = startY + row * (itemHeight + 15);

      // 1. Box background (added FIRST so sprites and labels render on top)
      const box = this.scene.add
        .rectangle(gx, gy, itemWidth - 16, itemHeight, 0x0f1d32, 0.95)
        .setStrokeStyle(1.5, 0x1e3a5f)
        .setInteractive({ useHandCursor: true });
      this.add(box);

      // 2. Sprite image
      let sprite;
      if (this.scene.textures.exists(gadget.texture)) {
        sprite = this.scene.add.image(gx, gy - 28, gadget.texture);
        sprite.setDisplaySize(56, 56);
        this.add(sprite);
      }

      // 3. Name & Subtitle
      const name = this.scene.add
        .text(gx, gy + 18, gadget.name, {
          fontFamily: "Arial, sans-serif",
          fontSize: "13px",
          fontStyle: "bold",
          color: "#ffffff",
        })
        .setOrigin(0.5);

      const sub = this.scene.add
        .text(gx, gy + 38, gadget.sub, {
          fontFamily: "Arial, sans-serif",
          fontSize: "11px",
          color: "#94a3b8",
        })
        .setOrigin(0.5);

      const openHint = this.scene.add
        .text(gx, gy + 56, "🔍 Cliquer pour ouvrir", {
          fontFamily: "Arial, sans-serif",
          fontSize: "10px",
          fontStyle: "italic",
          color: "#38bdf8",
        })
        .setOrigin(0.5);

      this.add([name, sub, openHint]);

      const onOpen = () => this.openImageViewer(gadget);

      box.on("pointerover", () => {
        box.setFillStyle(0x162c4b, 1);
        box.setStrokeStyle(1.5, 0x00d2ff);
        name.setColor("#00f3ff");
        if (sprite) sprite.setScale(sprite.scale * 1.15);
      });

      box.on("pointerout", () => {
        box.setFillStyle(0x0f1d32, 0.95);
        box.setStrokeStyle(1.5, 0x1e3a5f);
        name.setColor("#ffffff");
        if (sprite) sprite.setDisplaySize(56, 56);
      });

      box.on("pointerdown", onOpen);
    });
  }

  /**
   * Opens a retro OS Image Viewer to inspect the gadget sprite in full resolution.
   * @param {Object} gadget
   */
  openImageViewer(gadget) {
    this.closeImageViewer();

    const screenWidth = this.scene.scale.width;
    const screenHeight = this.scene.scale.height;
    const cx = screenWidth / 2;
    const cy = screenHeight / 2;

    this.imageViewerContainer = this.scene.add.container(0, 0);
    this.imageViewerContainer.setDepth(1250);

    // Darkened backdrop
    const backdrop = this.scene.add
      .rectangle(cx, cy, screenWidth, screenHeight, 0x000000, 0.8)
      .setInteractive();
    backdrop.on("pointerdown", () => this.closeImageViewer());

    // Window frame
    const winW = 660;
    const winH = 490;
    const win = this.scene.add
      .rectangle(cx, cy, winW, winH, 0x091220, 0.98)
      .setStrokeStyle(2, 0x00d2ff)
      .setInteractive();

    // Title bar
    const titleBar = this.scene.add
      .rectangle(cx, cy - winH / 2 + 20, winW, 40, 0x102b4c);

    const titleText = this.scene.add
      .text(cx - winW / 2 + 16, cy - winH / 2 + 20, `🖼️ Visionneuse Agent OS — ${gadget.fileName}`, {
        fontFamily: "Arial, sans-serif",
        fontSize: "13px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0, 0.5);

    const closeBtn = this.scene.add
      .rectangle(cx + winW / 2 - 22, cy - winH / 2 + 20, 28, 24, 0x991b1b)
      .setStrokeStyle(1, 0xff4444)
      .setInteractive({ useHandCursor: true });

    const closeLabel = this.scene.add
      .text(cx + winW / 2 - 22, cy - winH / 2 + 20, "✕", {
        fontFamily: "Arial, sans-serif",
        fontSize: "14px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    closeBtn.on("pointerover", () => closeBtn.setFillStyle(0xdc2626));
    closeBtn.on("pointerout", () => closeBtn.setFillStyle(0x991b1b));
    closeBtn.on("pointerdown", () => this.closeImageViewer());

    // Image Framing Box
    const imgBoxY = cy - 80;
    const imgBox = this.scene.add
      .rectangle(cx, imgBoxY, 190, 190, 0x070c18, 0.95)
      .setStrokeStyle(1.5, 0x1e3a5f);

    let largeImg;
    if (this.scene.textures.exists(gadget.texture)) {
      largeImg = this.scene.add.image(cx, imgBoxY, gadget.texture);
      largeImg.setDisplaySize(140, 140);
    }

    // Gadget details
    const nameText = this.scene.add
      .text(cx, cy + 42, gadget.name, {
        fontFamily: "Arial Black, sans-serif",
        fontSize: "18px",
        color: "#00f3ff",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    const metaText = this.scene.add
      .text(cx, cy + 72, `Catégorie : ${gadget.category}   |   Format : PNG 32-bit`, {
        fontFamily: "Courier, monospace",
        fontSize: "12px",
        fontStyle: "bold",
        color: "#f59e0b",
      })
      .setOrigin(0.5);

    const descText = this.scene.add
      .text(cx, cy + 112, gadget.description, {
        fontFamily: "Arial, sans-serif",
        fontSize: "13px",
        color: "#e2e8f0",
        align: "center",
        wordWrap: { width: 560 },
        lineSpacing: 4,
      })
      .setOrigin(0.5);

    const inspectText = this.scene.add
      .text(cx, cy + 158, `« ${gadget.inspection} »`, {
        fontFamily: "Arial, sans-serif",
        fontSize: "12px",
        fontStyle: "italic",
        color: "#94a3b8",
        align: "center",
        wordWrap: { width: 560 },
        lineSpacing: 3,
      })
      .setOrigin(0.5);

    // Close bottom button
    const closeBottomBtn = this.scene.add
      .rectangle(cx, cy + 205, 180, 34, 0x1e293b, 0.95)
      .setStrokeStyle(1.5, 0x00d2ff)
      .setInteractive({ useHandCursor: true });

    const closeBottomText = this.scene.add
      .text(cx, cy + 205, "✕ Fermer l'aperçu", {
        fontFamily: "Arial, sans-serif",
        fontSize: "13px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    closeBottomBtn.on("pointerover", () => closeBottomBtn.setFillStyle(0x0284c7));
    closeBottomBtn.on("pointerout", () => closeBottomBtn.setFillStyle(0x1e293b));
    closeBottomBtn.on("pointerdown", () => this.closeImageViewer());

    this.imageViewerContainer.add([
      backdrop,
      win,
      titleBar,
      titleText,
      closeBtn,
      closeLabel,
      imgBox,
      ...(largeImg ? [largeImg] : []),
      nameText,
      metaText,
      descText,
      inspectText,
      closeBottomBtn,
      closeBottomText,
    ]);
  }

  /**
   * Closes the image viewer popup if open.
   */
  closeImageViewer() {
    if (this.imageViewerContainer) {
      this.imageViewerContainer.destroy();
      this.imageViewerContainer = null;
    }
  }

  initKeyboard() {
    this.onKeyDown = (e) => {
      if (e.key === "Escape" || e.code === "Escape") {
        e.preventDefault();
        if (this.imageViewerContainer) {
          this.closeImageViewer();
        } else if (this.currentView !== "root") {
          this.currentView = "root";
          this.initUI();
        } else {
          this.close();
        }
      }
    };
    window.addEventListener("keydown", this.onKeyDown);
  }

  close() {
    this.closeImageViewer();
    if (this.onKeyDown) {
      window.removeEventListener("keydown", this.onKeyDown);
    }
    this.onClose();
    this.destroy();
  }
}

