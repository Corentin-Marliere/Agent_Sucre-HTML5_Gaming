import { Scene } from "phaser";
import { InteractiveArea } from "../components/InteractiveArea.js";
import { gameState } from "../state/GameState.js";

export class GenericMapScene extends Scene {
  constructor() {
    super({ key: "GenericMapScene" });
  }

  init(data) {
    this.currentMapId = data.mapId;
    gameState.setCurrentScene("GenericMapScene");
    if (data.mapId) {
      gameState.setCurrentMap(data.mapId);
    }
  }

  create() {
    const mapsData = this.cache.json.get("maps");
    const mapData = mapsData[this.currentMapId];

    if (!mapData) {
      console.error(
        `La carte "${this.currentMapId}" n'existe pas dans maps.json`,
      );
      return;
    }

    this.add.image(0, 0, mapData.mapKey).setOrigin(0, 0);

    mapData.zones.forEach((zone) => {
      new InteractiveArea(
        this,
        zone.x,
        zone.y,
        zone.width,
        zone.height,
        zone.type,
        zone.target,
      );
    });
  }
}
