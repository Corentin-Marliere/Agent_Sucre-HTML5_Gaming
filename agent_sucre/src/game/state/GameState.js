export class GameState {
  constructor(initialData = {}) {
    this.reset(initialData);
  }

  /**
   * Returns the default game state structure.
   * @returns {Object}
   */
  getDefaultState() {
    const now = new Date().toISOString();
    return {
      version: "1.0.0",
      profile: {
        agentName: "Agent Sucre",
        pinCode: null,
        createdAt: now,
        updatedAt: now,
        customization: {
          skinTone: "light",
          hairStyle: "hair_short",
          hairColor: 0x4a2e18,
          eyeColor: "eyes_blue",
          outfit: "apprenti_lyfe",
          accessory: "none",
        },
      },
      progression: {
        currentChapter: 1,
        completedChapters: [],
        currentScene: "MainMenu",
        currentMapId: "secretInstitute",
        currentDialogueId: null,
      },
      inventory: {
        items: ["badge_recrue", "boite_patissiere"],
      },
      gauges: {
        affection: {
          etchebest: 50,
          ramsay: 50,
          lignac: 50,
          bocuse: 50,
          grolet: 50,
        },
        infiltration: 100,
        energy: 100,
        moral: 100,
      },
      flags: {},
    };
  }

  /**
   * Resets the state to default values ​​or initial data.
   * @param {Object} [overrideData={}]
   */
  reset(overrideData = {}) {
    this.state = this.getDefaultState();
    if (Object.keys(overrideData).length > 0) {
      this.loadState(overrideData);
    }
  }

  /**
   * Condenses the current state of the game into a plain JavaScript object.
   * @returns {Object} Deep copy of the game's current state.
   */
  getState() {
    return JSON.parse(JSON.stringify(this.state));
  }

  /**
   * Standard alias for automatic serialization via JSON.stringify().
   * @returns {Object}
   */
  toJSON() {
    return this.getState();
  }

  /**
   * Loads a pre-existing state into the manager.
   * @param {Object} loadedState
   */
  loadState(loadedState) {
    if (!loadedState || typeof loadedState !== "object") {
      throw new Error("L'état fourni est invalide.");
    }

    const defaultState = this.getDefaultState();
    const loadedGauges = loadedState.gauges || {};
    const loadedAffection = loadedGauges.affection || {};

    this.state = {
      version: loadedState.version || defaultState.version,
      profile: {
        ...defaultState.profile,
        ...(loadedState.profile || {}),
        customization: {
          ...defaultState.profile.customization,
          ...(loadedState.profile?.customization || {}),
        },
      },
      progression: {
        ...defaultState.progression,
        ...(loadedState.progression || {}),
        completedChapters: Array.isArray(loadedState.progression?.completedChapters)
          ? [...loadedState.progression.completedChapters]
          : [...defaultState.progression.completedChapters],
      },
      inventory: {
        ...defaultState.inventory,
        items: Array.isArray(loadedState.inventory?.items)
          ? JSON.parse(JSON.stringify(loadedState.inventory.items))
          : [...defaultState.inventory.items],
      },
      gauges: {
        ...defaultState.gauges,
        ...loadedGauges,
        affection: {
          ...defaultState.gauges.affection,
          ...loadedAffection,
        },
      },
      flags: {
        ...(loadedState.flags || {}),
      },
    };

    // If an outfit flag is present, keep customization.outfit in sync
    if (this.state.flags.equippedOutfit) {
      this.state.profile.customization.outfit = this.state.flags.equippedOutfit;
    }

    this._touch();
  }

  /* ========================================================================= */
  /* PROFILE & CUSTOMIZATION                                                   */
  /* ========================================================================= */

  /**
   * Returns a copy of the player profile.
   * @returns {Object}
   */
  getProfile() {
    return JSON.parse(JSON.stringify(this.state.profile));
  }

  /**
   * Returns current character customization options.
   * @returns {Object}
   */
  getCustomization() {
    return { ...this.state.profile.customization };
  }

  /**
   * Updates character appearance customization settings.
   * @param {Object} updates
   */
  setCustomization(updates = {}) {
    this.state.profile.customization = {
      ...this.state.profile.customization,
      ...updates,
    };
    if (updates.outfit) {
      this.setFlag("equippedOutfit", updates.outfit);
    }
    this._touch();
  }

  /**
   * Defines the agent profile information.
   * @param {Object} param0
   * @param {string} [param0.agentName]
   * @param {string} [param0.pinCode]
   */
  setProfile({ agentName, pinCode } = {}) {
    if (agentName !== undefined) {
      this.state.profile.agentName = agentName;
    }
    if (pinCode !== undefined) {
      this.state.profile.pinCode = pinCode;
    }
    this._touch();
  }

  /**
   * Returns a copy of the player profile.
   * @returns {Object}
   */
  getProfile() {
    return { ...this.state.profile };
  }

  /* ========================================================================= */
  /* PROGRESSION / CHAPTERS                                                    */
  /* ========================================================================= */

  /**
   * Sets the current chapter.
   * @param {number|string} chapterId
   */
  setChapter(chapterId) {
    this.state.progression.currentChapter = chapterId;
    this._touch();
  }

  /**
   * Mark a chapter as completed.
   * @param {number|string} chapterId
   */
  completeChapter(chapterId) {
    if (!this.state.progression.completedChapters.includes(chapterId)) {
      this.state.progression.completedChapters.push(chapterId);
      this._touch();
    }
  }

  /**
   * Check if a chapter is already finished.
   * @param {number|string} chapterId
   * @returns {boolean}
   */
  isChapterCompleted(chapterId) {
    return this.state.progression.completedChapters.includes(chapterId);
  }

  /**
   * Saves the currently active Phaser scene.
   * @param {string} sceneKey
   */
  setCurrentScene(sceneKey) {
    this.state.progression.currentScene = sceneKey;
    this._touch();
  }

  /**
   * Saves the current map.
   * @param {string} mapId
   */
  setCurrentMap(mapId) {
    this.state.progression.currentMapId = mapId;
    this._touch();
  }

  /**
   * Saves the ID of the current dialogue.
   * @param {string|null} dialogueId
   */
  setCurrentDialogue(dialogueId) {
    this.state.progression.currentDialogueId = dialogueId;
    this._touch();
  }

  /**
   * Computes the current active storyline objective for the player.
   * @returns {{ title: string, instruction: string, targetMap: string, character: string|null }}
   */
  getCurrentObjective() {
    if (!this.getFlag("chap1_scene1_completed")) {
      return {
        title: "Briefing de Mission",
        instruction: "Écouter la transmission secrète du Directeur Paul Bocuse.",
        targetMap: "MainMenu",
        character: "Paul Bocuse",
      };
    }
    if (!this.getFlag("chap1_scene2_completed")) {
      return {
        title: "Contrôle d'Accès",
        instruction: "Présenter votre badge à Philippe Etchebest dans le Hall de Sécurité.",
        targetMap: "security_hall",
        character: "Philippe Etchebest",
      };
    }
    if (!this.getFlag("chap1_scene3_completed")) {
      return {
        title: "Équipement Pâtissier R&D",
        instruction: "Rejoindre Cyril Lignac au Laboratoire R&D pour obtenir vos gadgets.",
        targetMap: "rd_lab",
        character: "Cyril Lignac",
      };
    }
    if (!this.getFlag("chap1_scene4_dialog_completed")) {
      return {
        title: "Test Physique & Combat",
        instruction: "Se présenter à Gordon Ramsay dans la Cour d'Entraînement.",
        targetMap: "training_grounds",
        character: "Gordon Ramsay",
      };
    }
    if (!this.getFlag("chap1_scene4_completed") && !this.getFlag("chap1_completed")) {
      return {
        title: "Équiper le Tablier",
        instruction: "Ouvrir votre sacoche [I] et équiper le Tablier Pare-Balles du Chef.",
        targetMap: "inventory",
        character: "Gordon Ramsay",
      };
    }
    return {
      title: "Mise en Bouche Validée",
      instruction: "Félicitations Agent ! Chapitre 1 validé. Préparez-vous pour le Chapitre 2.",
      targetMap: "MainMenu",
      character: "Paul Bocuse",
    };
  }

  /**
   * Resolves the appropriate dialogue ID for a given room based on current narrative flags.
   * @param {string} roomId
   * @returns {string}
   */
  getDialogueForRoom(roomId) {
    if (!this.getFlag("chap1_scene1_completed")) {
      return "etchebest_bloque_bocuse";
    }

    if (roomId === "security_hall" || roomId === "institute") {
      if (!this.getFlag("chap1_scene2_completed")) return "etchebest_intro";
      if (!this.getFlag("chap1_scene3_completed")) return "etchebest_rappel_lignac";
      if (!this.getFlag("chap1_scene4_dialog_completed")) return "etchebest_rappel_ramsay";
      if (!this.getFlag("chap1_scene4_completed") && !this.getFlag("chap1_completed")) return "etchebest_rappel_equiper";
      return "etchebest_post_chap1";
    }

    if (roomId === "rd_lab") {
      if (!this.getFlag("chap1_scene2_completed")) return "lignac_bloque";
      if (!this.getFlag("chap1_scene3_completed")) return "lignac_intro";
      if (!this.getFlag("chap1_scene4_dialog_completed")) return "lignac_rappel_ramsay";
      if (!this.getFlag("chap1_scene4_completed") && !this.getFlag("chap1_completed")) return "lignac_rappel_equiper";
      return "lignac_post_chap1";
    }

    if (roomId === "training_grounds") {
      if (!this.getFlag("chap1_scene3_completed")) return "ramsay_bloque";
      if (!this.getFlag("chap1_scene4_dialog_completed")) return "ramsay_intro";
      if (!this.getFlag("chap1_scene4_completed") && !this.getFlag("chap1_completed")) return "ramsay_rappel_equiper";
      return "ramsay_post_chap1";
    }

    if (this.getFlag("chap1_completed")) {
      return "bocuse_chap1_conclusion";
    }

    return "bocuse_welcome";
  }

  /* ======================================================================== */
  /* ITEMS / INVENTORY                                                        */
  /* ======================================================================== */

  /**
   * Adds an item to the inventory.
   * If the object already exists, increment its quantity if it has a 'quantity' field.
   * otherwise, add it as a new element.
   * @param {string|Object} item - Object identifier (string) or detailed object ({ id, name, ... }).
   * @param {number} [quantity=1]
   */
  addItem(item, quantity = 1) {
    const itemId = typeof item === "string" ? item : item.id;
    const existing = this.state.inventory.items.find((i) =>
      typeof i === "string" ? i === itemId : i.id === itemId
    );

    if (existing) {
      if (typeof existing === "object" && typeof existing.quantity === "number") {
        existing.quantity += quantity;
      } else if (typeof item === "object" && item.quantity) {
        // Replacement or update
        Object.assign(existing, item);
      }
    } else {
      if (typeof item === "string") {
        this.state.inventory.items.push(quantity > 1 ? { id: item, quantity } : item);
      } else {
        this.state.inventory.items.push({ quantity, ...item });
      }
    }

    this._touch();
  }

  /**
   * Remove an item from the inventory.
   * @param {string} itemId
   * @param {number} [quantity=1]
   * @returns {boolean} true if the object was removed, false otherwise.
   */
  removeItem(itemId, quantity = 1) {
    const index = this.state.inventory.items.findIndex((i) =>
      typeof i === "string" ? i === itemId : i.id === itemId
    );

    if (index === -1) return false;

    const currentItem = this.state.inventory.items[index];
    if (typeof currentItem === "object" && typeof currentItem.quantity === "number") {
      currentItem.quantity -= quantity;
      if (currentItem.quantity <= 0) {
        this.state.inventory.items.splice(index, 1);
      }
    } else {
      this.state.inventory.items.splice(index, 1);
    }

    this._touch();
    return true;
  }

  /**
   * Checks if an item is present in the inventory.
   * @param {string} itemId
   * @returns {boolean}
   */
  hasItem(itemId) {
    return this.state.inventory.items.some((i) =>
      typeof i === "string" ? i === itemId : i.id === itemId
    );
  }

  /**
   * Returns the list of items in the inventory.
   * @returns {Array}
   */
  getItems() {
    return JSON.parse(JSON.stringify(this.state.inventory.items));
  }

  /* ========================================================================== */
  /* METERS (Affection, Energy, Morale...)                                      */
  /* ========================================================================== */

  /**
   * Defines a specific gauge (energy, morale, etc.).
   * @param {string} gaugeName
   * @param {number} value
   */
  setGauge(gaugeName, value) {
    this.state.gauges[gaugeName] = value;
    this._touch();
  }

  /**
   * Gets the value of a gauge.
   * @param {string} gaugeName
   * @returns {number|undefined}
   */
  getGauge(gaugeName) {
    return this.state.gauges[gaugeName];
  }

  /**
   * Modifies a gauge by a relative amount.
   * @param {string} gaugeName
   * @param {number} amount
   * @param {Object} [options]
   * @param {number} [options.min=0]
   * @param {number} [options.max=100]
   * @returns {number} New value
   */
  addGauge(gaugeName, amount, { min = 0, max = 100 } = {}) {
    const current = this.state.gauges[gaugeName] ?? 0;
    let nextValue = current + amount;
    if (min !== undefined) nextValue = Math.max(min, nextValue);
    if (max !== undefined) nextValue = Math.min(max, nextValue);
    this.state.gauges[gaugeName] = nextValue;
    this._touch();
    return nextValue;
  }

  /**
   * Modifies the affection level with a character (bounded between 0 and 100).
   * @param {string} character
   * @param {number} amount
   * @returns {number} New value
   */
  addAffection(character, amount) {
    const current = this.state.gauges.affection[character] ?? 50;
    const nextVal = Math.min(100, Math.max(0, current + amount));
    this.state.gauges.affection[character] = nextVal;
    this._touch();
    return nextVal;
  }

  /**
   * Sets the affection level with a character (bounded between 0 and 100).
   * @param {string} character
   * @param {number} value
   */
  setAffection(character, value) {
    this.state.gauges.affection[character] = Math.min(100, Math.max(0, value));
    this._touch();
  }

  /**
   * Retrieves the affection level with a character.
   * @param {string} character
   * @returns {number}
   */
  getAffection(character) {
    return this.state.gauges.affection[character] ?? 50;
  }

  /**
   * Retrieves the infiltration level (0-100).
   * @returns {number}
   */
  getInfiltration() {
    return this.state.gauges.infiltration ?? 100;
  }

  /**
   * Modifies the infiltration level (bounded between 0 and 100).
   * @param {number} amount
   * @returns {number} New infiltration value
   */
  addInfiltration(amount) {
    return this.addGauge("infiltration", amount, { min: 0, max: 100 });
  }

  /**
   * Sets the infiltration level (bounded between 0 and 100).
   * @param {number} value
   */
  setInfiltration(value) {
    this.setGauge("infiltration", Math.min(100, Math.max(0, value)));
  }

  /* ======================================================================= */
  /* FLAGS / NARRATIVE VARIABLES                                             */
  /* ======================================================================= */

  /**
   * Records a narrative flag (e.g., choice made, dialogue viewed).
   * @param {string} flag
   * @param {*} [value=true]
   */
  setFlag(flag, value = true) {
    this.state.flags[flag] = value;
    this._touch();
  }

  /**
   * Retrieves the value of a flag.
   * @param {string} flag
   * @returns {*}
   */
  getFlag(flag) {
    return this.state.flags[flag];
  }

  /**
   * Checks if a flag exists and is 'truthy'.
   * @param {string} flag
   * @returns {boolean}
   */
  hasFlag(flag) {
    return Boolean(this.state.flags[flag]);
  }

  /* ========================================================================== */
  /* INTERNAL                                                                   */
  /* ========================================================================== */

  /**
   * Updates the modification timestamp.
   * @private
   */
  _touch() {
    if (this.state.profile) {
      this.state.profile.updatedAt = new Date().toISOString();
    }
  }
}

/**
 * Singleton instance shared by all game scenes and managers.
 */
export const gameState = new GameState();
export default gameState;

