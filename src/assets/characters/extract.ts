import Phaser from 'phaser';

export const CHARACTER_FRAME_W = 16;
export const CHARACTER_FRAME_H = 24;

export const CHARACTER_SPRITES_BASE_URL = 'assets/sprites/characters/characters2_3x12';

export function characterTextureKey(spriteFolder: string): string {
  return `character_${spriteFolder}`;
}

function characterFrameKey(spriteFolder: string, facing: 'down' | 'up' | 'left' | 'right', phase: 'walk1' | 'still' | 'walk2'): string {
  return `character_${spriteFolder}_${facing}_${phase}`;
}

function ensureCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export function preloadCharacterFolder(scene: Phaser.Scene, spriteFolder: string): void {
  const base = `${CHARACTER_SPRITES_BASE_URL}/${spriteFolder}`;
  const rows: Array<{ facing: 'down' | 'up' | 'left' | 'right'; still: string; walk1: string; walk2: string }> = [
    { facing: 'down', still: 'face_down.png', walk1: 'walk_down_01.png', walk2: 'walk_down_02.png' },
    { facing: 'up', still: 'face_up.png', walk1: 'walk_up_01.png', walk2: 'walk_up_02.png' },
    { facing: 'left', still: 'face_left.png', walk1: 'walk_left_01.png', walk2: 'walk_left_02.png' },
    { facing: 'right', still: 'face_right.png', walk1: 'walk_right_01.png', walk2: 'walk_right_02.png' },
  ];

  for (const r of rows) {
    scene.load.image(characterFrameKey(spriteFolder, r.facing, 'still'), `${base}/${r.still}`);
    scene.load.image(characterFrameKey(spriteFolder, r.facing, 'walk1'), `${base}/${r.walk1}`);
    scene.load.image(characterFrameKey(spriteFolder, r.facing, 'walk2'), `${base}/${r.walk2}`);
  }
}

/**
 * Assemble the 12 frame PNGs from `characters2_3x12/<folder>` into a 4×3 spritesheet.
 *
 * Rows (top→bottom): down, up, left, right
 * Cols (left→right): walk1, still, walk2
 */
export function registerCharacterSprites(scene: Phaser.Scene, spriteFolder: string): string {
  const outCanvas = ensureCanvas(3 * CHARACTER_FRAME_W, 4 * CHARACTER_FRAME_H);
  const outCtx = outCanvas.getContext('2d');
  if (!outCtx) throw new Error('Failed to get character sprite 2D canvas context');
  outCtx.imageSmoothingEnabled = false;

  const order: Array<{ row: number; facing: 'down' | 'up' | 'left' | 'right' }> = [
    { row: 0, facing: 'down' },
    { row: 1, facing: 'up' },
    { row: 2, facing: 'left' },
    { row: 3, facing: 'right' },
  ];
  const phases: Array<{ col: number; phase: 'walk1' | 'still' | 'walk2' }> = [
    { col: 0, phase: 'walk1' },
    { col: 1, phase: 'still' },
    { col: 2, phase: 'walk2' },
  ];

  for (const r of order) {
    for (const p of phases) {
      const imgKey = characterFrameKey(spriteFolder, r.facing, p.phase);
      const tex = scene.textures.get(imgKey);
      const src = tex?.getSourceImage() as HTMLImageElement | HTMLCanvasElement | undefined;
      if (!src) {
        throw new Error(`Missing character frame texture: ${imgKey}. Did you preload it?`);
      }
      outCtx.drawImage(
        src as CanvasImageSource,
        0,
        0,
        CHARACTER_FRAME_W,
        CHARACTER_FRAME_H,
        p.col * CHARACTER_FRAME_W,
        r.row * CHARACTER_FRAME_H,
        CHARACTER_FRAME_W,
        CHARACTER_FRAME_H,
      );
    }
  }

  const sheetKey = characterTextureKey(spriteFolder);
  if (scene.textures.exists(sheetKey)) scene.textures.remove(sheetKey);

  // Phaser supports canvas sources at runtime, but its TS types are stricter than reality.
  scene.textures.addSpriteSheet(sheetKey, outCanvas as unknown as HTMLImageElement, {
    frameWidth: CHARACTER_FRAME_W,
    frameHeight: CHARACTER_FRAME_H,
  });

  return sheetKey;
}

export function registerCharacterSpritesForFolders(scene: Phaser.Scene, spriteFolders: Iterable<string>): void {
  for (const folder of spriteFolders) registerCharacterSprites(scene, folder);
}

