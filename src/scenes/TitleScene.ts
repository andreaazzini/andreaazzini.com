import Phaser from 'phaser';
import { AudioSystem } from '../systems/AudioSystem';

export class TitleScene extends Phaser.Scene {
  static readonly KEY = 'TitleScene';

  private prompt?: Phaser.GameObjects.BitmapText;

  constructor() {
    super(TitleScene.KEY);
  }

  create(): void {
    this.cameras.main.setRoundPixels(true);

    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2;

    const title = this.add.bitmapText(cx, cy - 40, 'pixel_font', "ANDREA'S", 16);
    title.setOrigin(0.5);

    const subtitle = this.add.bitmapText(cx, cy - 20, 'pixel_font', 'WALKABLE LIFE', 16);
    subtitle.setOrigin(0.5);

    this.prompt = this.add.bitmapText(cx, cy + 40, 'pixel_font', 'PRESS ENTER / Z', 12);
    this.prompt.setOrigin(0.5);

    this.tweens.add({
      targets: this.prompt,
      alpha: 0,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Linear',
    });

    const enterKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    const zKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.Z);

    const start = () => {
      void AudioSystem.unlock().then(() => {
        AudioSystem.playBgm('overworld');
      });
      this.scene.start('OverworldScene');
    };

    enterKey?.once('down', start);
    zKey?.once('down', start);
  }
}


