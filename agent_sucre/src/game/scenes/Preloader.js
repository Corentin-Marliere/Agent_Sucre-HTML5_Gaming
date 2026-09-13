import { Scene } from "phaser";

export class Preloader extends Scene {
  constructor() {
    super("Preloader");
  }

  init() {
    //  We loaded this image in our Boot Scene, so we can display it here
    this.add.image(512, 384, "background");

    //  A simple progress bar. This is the outline of the bar.
    this.add.rectangle(512, 384, 468, 32).setStrokeStyle(1, 0xffffff);

    //  This is the progress bar itself. It will increase in size from the left based on the % of progress.
    const bar = this.add.rectangle(512 - 230, 384, 4, 28, 0xffffff);

    //  Use the 'progress' event emitted by the LoaderPlugin to update the loading bar
    this.load.on("progress", (progress) => {
      //  Update the progress bar (our bar is 464px wide, so 100% = 464px)
      bar.width = 4 + 460 * progress;
    });
  }

  preload() {
    //  Load the assets for the game - Replace with your own assets
    this.load.setPath("assets");

    this.load.image("pc_screen", "images/Windows_Screen.png");
    this.load.image("folder", "images/folder.png");
    this.load.image("windows_cake", "images/Windows_Cake.png");
    this.load.image("secret_institute_map", "images/map_secret_institute.jpeg");
    this.load.image("game_logo", "images/logo.png");

    // Character portraits for Visual Novel dialogues
    this.load.image("char_etchebest", "images/char_etchebest.jpg");
    this.load.image("char_lignac", "images/char_lignac.jpg");
    this.load.image("char_ramsay", "images/char_ramsay.jpg");
    this.load.image("char_bocuse", "images/char_bocuse.jpg");

    // Room backgrounds for immersive Visual Novel dialogues
    this.load.image("bg_security_hall", "images/bg_security_hall.jpg");
    this.load.image("bg_rd_lab", "images/bg_rd_lab.jpg");
    this.load.image("bg_training_grounds", "images/bg_training_grounds.jpg");

    // Inventory gadget textures
    this.load.image("item_tablier_pare_balles", "images/tablier-pare-balle.png");
    this.load.image("item_brookie_walkie", "images/brookie-walkie.png");
    this.load.image("item_poche_a_douille", "images/poche-a-douille-inventaire.png");
    this.load.image("item_sainte_grenade", "images/sainte-grenade.png");
    this.load.image("item_eclair_laser", "images/eclair-laser-on.png");
    this.load.image("item_boussole", "images/boussole.png");

    this.load.json("dialogs", "data/dialogs_example.json");
    this.load.json("maps", "data/maps.json");
    this.load.json("items", "data/items.json");
  }

  create() {
    //  When all the assets have loaded, it's often worth creating global objects here that the rest of the game can use.
    //  For example, you can define global animations here, so we can use them in other scenes.

    //  Move to the MainMenu. You could also swap this for a Scene Transition, such as a camera fade.
    this.scene.start("MainMenu");
  }
}
