import { gameState } from "../state/GameState.js";

const SAVE_STORAGE_KEY = "agent_sucre_savegame";

/**
 * Manages local game persistence (saving, loading, PIN verification, resetting).
 */
export class SaveManager {
  /**
   * Checks if a valid save exists in localStorage.
   * @returns {boolean}
   */
  static hasSave() {
    try {
      const raw = localStorage.getItem(SAVE_STORAGE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return Boolean(parsed && parsed.profile && parsed.profile.agentName);
    } catch (e) {
      console.error("Erreur lors de la vérification de la sauvegarde :", e);
      return false;
    }
  }

  /**
   * Retrieves a lightweight summary of the backup without unlocking the full state.
   * @returns {{ agentName: string, chapter: number|string, updatedAt: string, currentScene: string } | null}
   */
  static getSummary() {
    try {
      const raw = localStorage.getItem(SAVE_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return {
        agentName: parsed.profile?.agentName || "Agent inconnu",
        chapter: parsed.progression?.currentChapter || 1,
        updatedAt: parsed.profile?.updatedAt || null,
        currentScene: parsed.progression?.currentScene || "Game",
      };
    } catch (e) {
      console.error("Erreur lors de la lecture du résumé de sauvegarde :", e);
      return null;
    }
  }

  /**
   * Create a new profile with an agent name and PIN, initialize the game state, and write the save file.
   * @param {string} agentName - The agent's name.
   * @param {string} pinCode - The 4-digit PIN code.
   * @returns {{ success: boolean, error?: string }}
   */
  static createProfile(agentName, pinCode) {
    const trimmedName = (agentName || "").trim();
    const trimmedPin = (pinCode || "").trim();

    if (!trimmedName) {
      return { success: false, error: "Veuillez entrer un nom d'agent." };
    }
    if (!/^\d{4}$/.test(trimmedPin)) {
      return { success: false, error: "Le code PIN doit comporter exactement 4 chiffres." };
    }

    try {
      gameState.reset();
      gameState.setProfile({
        agentName: trimmedName,
        pinCode: trimmedPin,
      });

      const saved = this.save();
      if (!saved.success) {
        return saved;
      }

      return { success: true };
    } catch (e) {
      console.error("Erreur lors de la création du profil :", e);
      return { success: false, error: "Impossible d'enregistrer le profil." };
    }
  }

  /**
   * Saves the current state of gameState to localStorage.
   * @param {GameState} [stateInstance=gameState]
   * @returns {{ success: boolean, error?: string }}
   */
  static save(stateInstance = gameState) {
    try {
      const data = stateInstance.getState();
      data.profile.updatedAt = new Date().toISOString();
      localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(data));
      return { success: true };
    } catch (e) {
      console.error("Erreur lors de l'enregistrement de la sauvegarde :", e);
      return { success: false, error: "Échec de l'écriture dans le stockage local." };
    }
  }

  /**
   * Validates the entered PIN, and loads and restores game data into gameState.
   * @param {string} pinCode - The 4-digit PIN entered by the player.
   * @returns {{ success: boolean, state?: Object, error?: string }}
   */
  static load(pinCode) {
    try {
      const raw = localStorage.getItem(SAVE_STORAGE_KEY);
      if (!raw) {
        return { success: false, error: "Aucune sauvegarde trouvée." };
      }

      const parsed = JSON.parse(raw);
      const storedPin = parsed.profile?.pinCode;

      if (!storedPin || String(storedPin) !== String(pinCode).trim()) {
        return { success: false, error: "Code PIN incorrect." };
      }

      gameState.loadState(parsed);
      return { success: true, state: gameState.getState() };
    } catch (e) {
      console.error("Erreur lors du chargement de la sauvegarde :", e);
      return { success: false, error: "Erreur lors de la lecture des données de sauvegarde." };
    }
  }

  /**
   * Deletes the existing save and resets the in-memory state.
   * @returns {boolean}
   */
  static deleteSave() {
    try {
      localStorage.removeItem(SAVE_STORAGE_KEY);
      gameState.reset();
      return true;
    } catch (e) {
      console.error("Erreur lors de la suppression de la sauvegarde :", e);
      return false;
    }
  }
}
