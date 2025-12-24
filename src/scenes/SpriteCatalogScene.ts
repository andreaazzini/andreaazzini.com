import Phaser from 'phaser';
import { characterTextureKey, registerCharacterSprites } from '../assets/characters/extract';
import { PLAYER_SPRITE_FOLDER } from '../world/characterCatalog';

export class SpriteCatalogScene extends Phaser.Scene {
  static readonly KEY = 'SpriteCatalogScene';

  constructor() {
    super(SpriteCatalogScene.KEY);
  }

  create(): void {
    this.cameras.main.setRoundPixels(true);

    // Ensure sprites are registered (safe to call multiple times).
    registerCharacterSprites(this, PLAYER_SPRITE_FOLDER);
    const sheetKey = characterTextureKey(PLAYER_SPRITE_FOLDER);

    const padding = 10;
    const tile = 32;
    const labelSize = 8;
    const labelGap = 2;
    const cellW = 72;
    const cellH = tile + labelGap + labelSize + 6;

    const header = this.add.bitmapText(padding, padding, 'pixel_font', 'SPRITES: 12', 10);
    header.setOrigin(0, 0);

    const help = this.add.bitmapText(padding, padding + 10, 'pixel_font', 'EXIT: ESC', 8);
    help.setOrigin(0, 0);

    const labels: Array<{ facing: 'down' | 'up' | 'left' | 'right'; row: number }> = [
      { facing: 'down', row: 0 },
      { facing: 'up', row: 1 },
      { facing: 'left', row: 2 },
      { facing: 'right', row: 3 },
    ];
    const phases: Array<{ phase: 'WALK1' | 'STILL' | 'WALK2'; col: number }> = [
      { phase: 'WALK1', col: 0 },
      { phase: 'STILL', col: 1 },
      { phase: 'WALK2', col: 2 },
    ];

    let y = padding + 26;
    for (const r of labels) {
      let x = padding;
      for (const c of phases) {
        const frame = r.row * 3 + c.col;
        const sprite = this.add.sprite(x, y, sheetKey, frame);
        sprite.setOrigin(0, 0);
        const text = `${r.facing.toUpperCase()}-${c.phase}`;
        const label = this.add.bitmapText(x, y + tile + labelGap, 'pixel_font', text, labelSize);
        label.setOrigin(0, 0);
        label.setTint(0xbdbdbd);
        x += cellW;
      }
      y += cellH;
    }

    const esc = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    esc?.on('down', () => this.scene.start('TitleScene'));
  }
}


