import { GameObjects } from "phaser";
import { gameState } from "../state/GameState.js";

/**
 * 2D Chibi Agent Avatar component supporting modular paper-doll layers.
 */
export class AgentAvatar extends GameObjects.Container {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {Object} [options={}]
   * @param {number} [options.scale=1.0]
   * @param {Object} [options.customization=null]
   */
  constructor(scene, x, y, options = {}) {
    super(scene, x, y);

    this.avatarScale = options.scale !== undefined ? options.scale : 1.0;
    this.customization = options.customization || gameState.getCustomization();

    this.initLayers();
    this.updateAppearance(this.customization);

    this.setScale(this.avatarScale);
    scene.add.existing(this);
  }

  /**
   * Initializes the container layers in strict visual depth order.
   */
  initLayers() {
    // 1. Base body (skin, head, limbs, base underwear, shoes)
    this.bodySprite = this.scene.add.image(0, 0, "avatar_body_light");

    // 2. Eyes layer
    this.eyesSprite = this.scene.add.image(0, 0, "avatar_eyes_blue");

    // 3. Outfit layer (Chef apron, armored apron, smoking)
    this.outfitSprite = this.scene.add.image(0, 0, "avatar_outfit_apprenti");

    // 4. Hair layer (tintable with hairColor)
    this.hairSprite = this.scene.add.image(0, 0, "avatar_hair_short");

    // 5. Accessory layer (glasses, earpiece, chef toque)
    this.accessorySprite = this.scene.add.image(0, 0, "avatar_acc_glasses");

    // Add all layers in order
    this.add([
      this.bodySprite,
      this.eyesSprite,
      this.outfitSprite,
      this.hairSprite,
      this.accessorySprite,
    ]);
  }

  /**
   * Updates all avatar layers with the provided customization properties.
   * @param {Object} custom
   */
  updateAppearance(custom = {}) {
    this.customization = { ...this.customization, ...custom };

    // 1. Skin tone
    const skinKey = `avatar_body_${this.customization.skinTone || "light"}`;
    if (this.scene.textures.exists(skinKey)) {
      this.bodySprite.setTexture(skinKey);
      this.bodySprite.setVisible(true);
    }

    // 2. Eyes
    const eyeKey = `avatar_eyes_${this.customization.eyeColor || "blue"}`;
    if (this.scene.textures.exists(eyeKey)) {
      this.eyesSprite.setTexture(eyeKey);
      this.eyesSprite.setVisible(true);
    }

    // 3. Outfit mapping
    let outfitTextureKey = "avatar_outfit_apprenti";
    const currentOutfit = this.customization.outfit || "apprenti_lyfe";
    if (currentOutfit === "tablier_pare_balles") {
      outfitTextureKey = "avatar_outfit_tablier_pare_balles";
    } else if (currentOutfit === "tenue_infiltration" || currentOutfit === "smoking") {
      outfitTextureKey = "avatar_outfit_smoking";
    }
    if (this.scene.textures.exists(outfitTextureKey)) {
      this.outfitSprite.setTexture(outfitTextureKey);
      this.outfitSprite.setVisible(true);
    } else {
      this.outfitSprite.setVisible(false);
    }

    // 4. Hair style & color tinting
    const hairStyleKey = `avatar_${this.customization.hairStyle || "hair_short"}`;
    if (this.scene.textures.exists(hairStyleKey)) {
      this.hairSprite.setTexture(hairStyleKey);
      this.hairSprite.setVisible(true);
      const tint = this.customization.hairColor !== undefined ? this.customization.hairColor : 0x5a3825;
      this.hairSprite.setTint(tint);
    } else {
      this.hairSprite.setVisible(false);
    }

    // 5. Accessory
    const accKey = `avatar_acc_${this.customization.accessory || "none"}`;
    if (this.customization.accessory && this.customization.accessory !== "none" && this.scene.textures.exists(accKey)) {
      this.accessorySprite.setTexture(accKey);
      this.accessorySprite.setVisible(true);
    } else {
      this.accessorySprite.setVisible(false);
    }
  }

  /**
   * Plays a celebratory bounce and sparkle tween when a new item is equipped.
   */
  playEquipAnimation() {
    this.scene.tweens.add({
      targets: this,
      scaleX: this.avatarScale * 1.08,
      scaleY: this.avatarScale * 0.94,
      duration: 120,
      yoyo: true,
      ease: "Quad.easeOut",
      onComplete: () => {
        this.setScale(this.avatarScale);
      },
    });

    // Quick light flash overlay effect
    const flash = this.scene.add
      .circle(this.x, this.y, 90, 0x00ffcc, 0.4)
      .setDepth(this.depth - 1);
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 1.5,
      duration: 400,
      onComplete: () => flash.destroy(),
    });
  }
}

