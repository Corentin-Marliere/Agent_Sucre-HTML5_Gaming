/**
 * Singleton Audio Manager for Agent OS.
 * Manages streaming audio playback via HTML5 Audio elements without blocking game preloads.
 */
class AudioManager {
  constructor() {
    this.audio = null;
    this.currentTrackId = null;
    this.isPlaying = false;
    this.volume = 0.8;
    this.listeners = new Set();

    // Catalog of available music tracks in /assets/musics/
    this.catalog = {
      Mission_Mille_Feuille: {
        id: "Mission_Mille_Feuille",
        title: "Mission Mille-Feuille",
        subtitle: "Thème Victoire - Clôture Chapitre 1",
        artist: "Agent Secret B.O.",
        file: "assets/musics/Mission_Mille_Feuille.mp3",
        durationSec: 18.6,
      },
      Agent_Sucre: {
        id: "Agent_Sucre",
        title: "Agent Sucré",
        subtitle: "Thème Principal de l'Institut",
        artist: "Confrérie Pâtissière",
        file: "assets/musics/Agent_Sucré.mp3",
        durationSec: 153.0,
      },
      L_affaire_du_bonbon: {
        id: "L_affaire_du_bonbon",
        title: "L'Affaire du Bonbon",
        subtitle: "Infiltration Nocturne",
        artist: "Division Surveillance",
        file: "assets/musics/L_affaire_du_bonbon.mp3",
        durationSec: 18.6,
      },
      Recette_pour_un_agent: {
        id: "Recette_pour_un_agent",
        title: "Recette pour un Agent",
        subtitle: "Ambiance Laboratoire & R&D",
        artist: "Atelier Sucré",
        file: "assets/musics/Recette_pour_un_agent.mp3",
        durationSec: 152.0,
      },
    };
  }

  /**
   * Returns list of all available tracks in catalog.
   * @returns {Array<Object>}
   */
  getTrackList() {
    return Object.values(this.catalog);
  }

  /**
   * Retrieves track data by ID or key.
   * @param {string} trackId
   * @returns {Object|null}
   */
  getTrack(trackId) {
    if (!trackId) return null;
    const cleanKey = trackId.replace(/\.mp3$/i, "");
    // Check exact or case-insensitive match
    if (this.catalog[cleanKey]) return this.catalog[cleanKey];
    const found = Object.values(this.catalog).find(
      (t) =>
        t.id.toLowerCase() === cleanKey.toLowerCase() ||
        t.file.toLowerCase().includes(cleanKey.toLowerCase())
    );
    return found || null;
  }

  /**
   * Starts playing a track by ID.
   * @param {string} trackId
   * @param {Object} [options]
   * @param {boolean} [options.loop=false]
   * @returns {Promise<boolean>}
   */
  async play(trackId, options = {}) {
    const track = this.getTrack(trackId);
    if (!track) {
      console.warn(`[AudioManager] Track not found in catalog: ${trackId}`);
      return false;
    }

    // If same track is already playing
    if (this.audio && this.currentTrackId === track.id && !this.audio.paused) {
      return true;
    }

    this.stop();

    try {
      this.currentTrackId = track.id;
      this.audio = new Audio(track.file);
      this.audio.volume = this.volume;
      this.audio.loop = options.loop || false;

      this.audio.addEventListener("timeupdate", () => {
        this.emit("timeupdate", {
          currentTime: this.audio.currentTime,
          duration: this.audio.duration || track.durationSec,
        });
      });

      this.audio.addEventListener("play", () => {
        this.isPlaying = true;
        this.emit("play", { track });
      });

      this.audio.addEventListener("pause", () => {
        this.isPlaying = false;
        this.emit("pause", { track });
      });

      this.audio.addEventListener("ended", () => {
        this.isPlaying = false;
        this.emit("ended", { track });
      });

      await this.audio.play();
      this.isPlaying = true;
      return true;
    } catch (err) {
      console.warn("[AudioManager] Playback interrupted or user interaction required:", err);
      this.isPlaying = false;
      return false;
    }
  }

  /**
   * Resumes playback if paused.
   */
  resume() {
    if (this.audio && this.audio.paused) {
      this.audio.play().catch((e) => console.warn(e));
      this.isPlaying = true;
    }
  }

  /**
   * Pauses current playback.
   */
  pause() {
    if (this.audio && !this.audio.paused) {
      this.audio.pause();
      this.isPlaying = false;
    }
  }

  /**
   * Toggles play/pause state.
   */
  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.resume();
    }
  }

  /**
   * Stops current playback and resets position.
   */
  stop() {
    if (this.audio) {
      try {
        this.audio.pause();
        this.audio.currentTime = 0;
      } catch (e) {
        // Ignored
      }
      this.audio = null;
    }
    this.isPlaying = false;
    this.emit("stop", { trackId: this.currentTrackId });
  }

  /**
   * Seeks to specific time in seconds.
   * @param {number} seconds
   */
  seek(seconds) {
    if (this.audio && Number.isFinite(seconds)) {
      this.audio.currentTime = Math.max(0, Math.min(seconds, this.audio.duration || 9999));
    }
  }

  /**
   * Sets the volume (0.0 to 1.0).
   * @param {number} vol
   */
  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.audio) {
      this.audio.volume = this.volume;
    }
    this.emit("volumechange", { volume: this.volume });
  }

  /**
   * Returns current time and duration.
   * @returns {{ currentTime: number, duration: number }}
   */
  getProgress() {
    if (!this.audio) return { currentTime: 0, duration: 0 };
    return {
      currentTime: this.audio.currentTime || 0,
      duration: this.audio.duration || 0,
    };
  }

  /**
   * Registers an event listener callback.
   * @param {Function} callback
   */
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Emits an event to all subscribers.
   * @param {string} event
   * @param {Object} data
   */
  emit(event, data) {
    for (const listener of this.listeners) {
      try {
        listener(event, data);
      } catch (e) {
        console.error(e);
      }
    }
  }
}

export const audioManager = new AudioManager();

