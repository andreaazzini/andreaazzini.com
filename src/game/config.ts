import Phaser from 'phaser';

export const BASE_WIDTH = 320;
export const BASE_HEIGHT = 240;

export const phaserConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: BASE_WIDTH,
  height: BASE_HEIGHT,
  parent: 'game',
  backgroundColor: '#000000',
  pixelArt: true,
  antialias: false,
  fps: { target: 60, forceSetTimeOut: true },
  render: {
    pixelArt: true,
    antialias: false,
    roundPixels: true,
  },
  scale: {
    mode: Phaser.Scale.NONE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: BASE_WIDTH,
    height: BASE_HEIGHT,
  },
};


