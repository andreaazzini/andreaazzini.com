import Phaser from 'phaser';
import { phaserConfig, BASE_HEIGHT, BASE_WIDTH } from './config';
import { BootScene } from '../scenes/BootScene';
import { TitleScene } from '../scenes/TitleScene';
import { OverworldScene } from '../scenes/OverworldScene';
import { InteriorScene } from '../scenes/InteriorScene';
import { SpriteCatalogScene } from '../scenes/SpriteCatalogScene';

function computeIntegerZoom(): number {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const zoom = Math.floor(Math.min(w / BASE_WIDTH, h / BASE_HEIGHT));
  return Math.max(1, zoom);
}

export function createGame(_parentEl: HTMLElement | null): Phaser.Game {
  const url = new URL(window.location.href);
  const debugSprites = url.searchParams.has('sprites') || url.hash === '#sprites';

  const game = new Phaser.Game({
    ...phaserConfig,
    scene: debugSprites
      ? [BootScene, SpriteCatalogScene, TitleScene, OverworldScene, InteriorScene]
      : [BootScene, TitleScene, OverworldScene, InteriorScene],
  });

  const applyZoom = () => {
    const zoom = computeIntegerZoom();
    game.scale.setZoom(zoom);
    game.scale.resize(BASE_WIDTH, BASE_HEIGHT);
    game.scale.refresh();
  };

  applyZoom();
  window.addEventListener('resize', applyZoom);

  return game;
}


