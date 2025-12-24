import Phaser from 'phaser';

export class DialogueBox extends Phaser.GameObjects.Container {
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly text: Phaser.GameObjects.BitmapText;

  private readonly boxWidth: number;
  private readonly boxHeight: number;
  private readonly padding = 8;

  constructor(scene: Phaser.Scene, width: number, height: number) {
    super(scene, 0, 0);
    this.boxWidth = width;
    this.boxHeight = height;

    this.bg = scene.add.graphics();
    this.text = scene.add.bitmapText(0, 0, 'pixel_font', '', 10);

    this.add([this.bg, this.text]);
    this.setScrollFactor(0);
    this.setDepth(1000);
    this.setVisible(false);

    this.layout();
  }

  layout(): void {
    const cam = this.scene.cameras.main;
    const x = 0;
    const y = cam.height - this.boxHeight;
    this.setPosition(x, y);

    this.bg.clear();
    this.bg.fillStyle(0x101010, 1);
    this.bg.fillRoundedRect(4, 4, this.boxWidth - 8, this.boxHeight - 8, 6);
    this.bg.lineStyle(2, 0xffffff, 1);
    this.bg.strokeRoundedRect(4, 4, this.boxWidth - 8, this.boxHeight - 8, 6);

    this.text.setPosition(this.padding, this.padding + 2);
    this.text.setMaxWidth(this.boxWidth - this.padding * 2);
  }

  open(): void {
    this.setVisible(true);
  }

  close(): void {
    this.setVisible(false);
    this.text.setText('');
  }

  setDialogueText(t: string): void {
    this.text.setText(t);
  }
}


