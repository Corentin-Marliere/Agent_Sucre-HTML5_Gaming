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
        affection: {},
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

    this.state = {
      version: loadedState.version || this.state.version,
      profile: {
        ...this.state.profile,
        ...(loadedState.profile || {}),
      },
      progression: {
        ...this.state.progression,
        ...(loadedState.progression || {}),
        completedChapters: Array.isArray(loadedState.progression?.completedChapters)
          ? [...loadedState.progression.completedChapters]
          : this.state.progression.completedChapters,
      },
      inventory: {
        ...this.state.inventory,
        items: Array.isArray(loadedState.inventory?.items)
          ? JSON.parse(JSON.stringify(loadedState.inventory.items))
          : this.state.inventory.items,
      },
      gauges: {
        ...this.state.gauges,
        ...(loadedState.gauges || {}),
        affection: {
          ...this.state.gauges.affection,
          ...(loadedState.gauges?.affection || {}),
        },
      },
      flags: {
        ...this.state.flags,
        ...(loadedState.flags || {}),
      },
    };

    this._touch();
  }

  /* ========================================================================== */
  /* PROFILE                                                                    */
  /* ========================================================================== */

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
   * Modifies the affection level with a character.
   * @param {string} character
   * @param {number} amount
   * @returns {number} New condition
   */
  addAffection(character, amount) {
    const current = this.state.gauges.affection[character] ?? 0;
    const nextVal = current + amount;
    this.state.gauges.affection[character] = nextVal;
    this._touch();
    return nextVal;
  }

  /**
   * Sets the affection level with a character.
   * @param {string} character
   * @param {number} value
   */
  setAffection(character, value) {
    this.state.gauges.affection[character] = value;
    this._touch();
  }

  /**
   * Retrieves the affection level with a character.
   * @param {string} character
   * @returns {number}
   */
  getAffection(character) {
    return this.state.gauges.affection[character] ?? 0;
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

