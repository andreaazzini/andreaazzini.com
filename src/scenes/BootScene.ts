import Phaser from 'phaser';
import { preloadCharacterFolder, registerCharacterSpritesForFolders } from '../assets/characters/extract';
import { SpriteCatalogScene } from './SpriteCatalogScene';
import { CHARACTER_CATALOG } from '../world/characterCatalog';

type Glyph = string[];

const GLYPHS: Record<string, Glyph> = {
  ' ': ['     ', '     ', '     ', '     ', '     ', '     ', '     '],
  A: [' ### ', '#   #', '#   #', '#####', '#   #', '#   #', '#   #'],
  B: ['#### ', '#   #', '#   #', '#### ', '#   #', '#   #', '#### '],
  C: [' ####', '#    ', '#    ', '#    ', '#    ', '#    ', ' ####'],
  D: ['#### ', '#   #', '#   #', '#   #', '#   #', '#   #', '#### '],
  E: ['#####', '#    ', '#    ', '#### ', '#    ', '#    ', '#####'],
  F: ['#####', '#    ', '#    ', '#### ', '#    ', '#    ', '#    '],
  G: [' ####', '#    ', '#    ', '# ###', '#   #', '#   #', ' ####'],
  H: ['#   #', '#   #', '#   #', '#####', '#   #', '#   #', '#   #'],
  I: [' ### ', '  #  ', '  #  ', '  #  ', '  #  ', '  #  ', ' ### '],
  J: ['  ###', '   # ', '   # ', '   # ', '   # ', '#  # ', ' ##  '],
  K: ['#   #', '#  # ', '# #  ', '##   ', '# #  ', '#  # ', '#   #'],
  L: ['#    ', '#    ', '#    ', '#    ', '#    ', '#    ', '#####'],
  M: ['#   #', '## ##', '# # #', '#   #', '#   #', '#   #', '#   #'],
  N: ['#   #', '##  #', '# # #', '#  ##', '#   #', '#   #', '#   #'],
  O: [' ### ', '#   #', '#   #', '#   #', '#   #', '#   #', ' ### '],
  P: ['#### ', '#   #', '#   #', '#### ', '#    ', '#    ', '#    '],
  Q: [' ### ', '#   #', '#   #', '#   #', '# # #', '#  # ', ' ## #'],
  R: ['#### ', '#   #', '#   #', '#### ', '# #  ', '#  # ', '#   #'],
  S: [' ####', '#    ', '#    ', ' ### ', '    #', '    #', '#### '],
  T: ['#####', '  #  ', '  #  ', '  #  ', '  #  ', '  #  ', '  #  '],
  U: ['#   #', '#   #', '#   #', '#   #', '#   #', '#   #', ' ### '],
  V: ['#   #', '#   #', '#   #', '#   #', '#   #', ' # # ', '  #  '],
  W: ['#   #', '#   #', '#   #', '#   #', '# # #', '## ##', '#   #'],
  X: ['#   #', '#   #', ' # # ', '  #  ', ' # # ', '#   #', '#   #'],
  Y: ['#   #', '#   #', ' # # ', '  #  ', '  #  ', '  #  ', '  #  '],
  Z: ['#####', '    #', '   # ', '  #  ', ' #   ', '#    ', '#####'],
  '0': [' ### ', '#   #', '#  ##', '# # #', '##  #', '#   #', ' ### '],
  '1': ['  #  ', ' ##  ', '# #  ', '  #  ', '  #  ', '  #  ', '#####'],
  '2': [' ### ', '#   #', '    #', '   # ', '  #  ', ' #   ', '#####'],
  '3': ['#### ', '    #', '    #', ' ### ', '    #', '    #', '#### '],
  '4': ['#   #', '#   #', '#   #', '#####', '    #', '    #', '    #'],
  '5': ['#####', '#    ', '#    ', '#### ', '    #', '    #', '#### '],
  '6': [' ### ', '#    ', '#    ', '#### ', '#   #', '#   #', ' ### '],
  '7': ['#####', '    #', '   # ', '  #  ', ' #   ', ' #   ', ' #   '],
  '8': [' ### ', '#   #', '#   #', ' ### ', '#   #', '#   #', ' ### '],
  '9': [' ### ', '#   #', '#   #', ' ####', '    #', '    #', ' ### '],
  '.': ['     ', '     ', '     ', '     ', '     ', ' ##  ', ' ##  '],
  ',': ['     ', '     ', '     ', '     ', ' ##  ', ' ##  ', ' #   '],
  '!': ['  #  ', '  #  ', '  #  ', '  #  ', '  #  ', '     ', '  #  '],
  '?': [' ### ', '#   #', '    #', '   # ', '  #  ', '     ', '  #  '],
  "'": ['  #  ', '  #  ', ' #   ', '     ', '     ', '     ', '     '],
  ':': ['     ', ' ##  ', ' ##  ', '     ', ' ##  ', ' ##  ', '     '],
  '-': ['     ', '     ', '     ', '#####', '     ', '     ', '     '],
  '/': ['    #', '   # ', '   # ', '  #  ', ' #   ', '#    ', '#    '],
};

function makeRetroFontChars(): string {
  return "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,!?' :-/";
}

function drawGlyph(ctx: CanvasRenderingContext2D, glyph: Glyph, x: number, y: number): void {
  for (let row = 0; row < glyph.length; row++) {
    const line = glyph[row] ?? '';
    for (let col = 0; col < line.length; col++) {
      if (line[col] === '#') {
        ctx.fillRect(x + col, y + row, 1, 1);
      }
    }
  }
}

export class BootScene extends Phaser.Scene {
  static readonly KEY = 'BootScene';

  constructor() {
    super(BootScene.KEY);
  }

  preload(): void {
    // Tileset (used by all maps)
    this.load.image('overworld_tiles', 'assets/tiles/overworld_tiles.png');

    // Character sprites (16×24). We load only the folders referenced by the catalog.
    const folders = new Set(CHARACTER_CATALOG.map((c) => c.spriteFolder));
    for (const folder of folders) preloadCharacterFolder(this, folder);
  }

  create(): void {
    this.cameras.main.setRoundPixels(true);
    this.createPixelFont();

    // Repaint select overworld tiles (grass/tree) to avoid confusing edge/border shading
    // while keeping the rest of the PNG tiles untouched.
    this.rethemeOverworldTiles();
    this.ensureDoorTileTexture();
    this.ensurePaddingTileTextures();

    // Register the 12-frame character spritesheets before entering the game.
    const folders = new Set(CHARACTER_CATALOG.map((c) => c.spriteFolder));
    registerCharacterSpritesForFolders(this, folders);

    const url = new URL(window.location.href);
    const debugSprites = url.searchParams.has('sprites') || url.hash === '#sprites';
    this.scene.start(debugSprites ? SpriteCatalogScene.KEY : 'TitleScene');
  }

  private createPixelFont(): void {
    const chars = makeRetroFontChars();
    const charW = 6;
    const charH = 8;
    const cols = 16;
    const rows = Math.ceil(chars.length / cols);
    const texW = cols * charW;
    const texH = rows * charH;

    const canvasTexture = this.textures.createCanvas('pixel_font', texW, texH);
    if (!canvasTexture) {
      throw new Error('Failed to create pixel_font canvas texture');
    }
    const ctx = canvasTexture.context;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, texW, texH);
    ctx.fillStyle = '#ffffff';

    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i]!;
      const col = i % cols;
      const row = Math.floor(i / cols);
      const glyph = GLYPHS[ch] ?? GLYPHS[ch.toUpperCase()] ?? GLYPHS['?']!;
      drawGlyph(ctx, glyph, col * charW, row * charH);
    }

    canvasTexture.refresh();

    const fontData = Phaser.GameObjects.RetroFont.Parse(this, {
      image: 'pixel_font',
      'offset.x': 0,
      'offset.y': 0,
      width: charW,
      height: charH,
      chars,
      charsPerRow: cols,
      'spacing.x': 0,
      'spacing.y': 0,
      lineSpacing: 2,
    });

    this.cache.bitmapFont.add('pixel_font', fontData);
  }

  private rethemeOverworldTiles(): void {
    const key = 'overworld_tiles';
    const existing = this.textures.get(key);
    const source = existing.getSourceImage() as HTMLImageElement | HTMLCanvasElement | null;
    if (!source) return;

    const w = (source as HTMLImageElement).width;
    const h = (source as HTMLImageElement).height;
    if (!w || !h) return;

    // Replace the texture with a canvas copy, then repaint tile 0 (gid 1) only.
    this.textures.remove(key);
    const canvasTexture = this.textures.createCanvas(key, w, h);
    if (!canvasTexture) throw new Error('Failed to create overworld_tiles canvas texture');
    const ctx = canvasTexture.context;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(source as HTMLImageElement, 0, 0);

    const TILE = 16;

    const paintTile = (tileIdx0Based: number, paint: (px: (x: number, y: number, c: string) => void) => void) => {
      const cols = Math.floor(w / TILE) || 1;
      const col = tileIdx0Based % cols;
      const row = Math.floor(tileIdx0Based / cols);
      const ox = col * TILE;
      const oy = row * TILE;
      const px = (x: number, y: number, c: string) => {
        ctx.fillStyle = c;
        ctx.fillRect(ox + x, oy + y, 1, 1);
      };
      paint(px);
    };

    // Tile idx 0 (gid 1): short grass. Flatter fill, subtle speckles, no edge shading.
    paintTile(0, (px) => {
      const base = '#49b949';
      const speck1 = '#3ea83e';
      const speck2 = '#5fd25f';
      for (let y = 0; y < TILE; y++) {
        for (let x = 0; x < TILE; x++) {
          const r = (x * 17 + y * 13) % 29;
          px(x, y, r === 0 ? speck1 : r === 11 ? speck2 : base);
        }
      }
    });

    // Tile idx 3 (gid 4): tree. Replace with a clearer canopy + trunk silhouette.
    paintTile(3, (px) => {
      const grass = '#49b949';
      const leaf = '#2f8c2f';
      const leaf2 = '#3fa53f';
      const leafHi = '#63d063';
      const trunk = '#7b4b2a';
      const trunkShade = '#633b22';

      // background grass
      for (let y = 0; y < TILE; y++) {
        for (let x = 0; x < TILE; x++) px(x, y, grass);
      }

      // canopy (simple circle-ish blob)
      const cx = 8;
      const cy = 6;
      const r0 = 6.2;
      for (let y = 0; y < TILE; y++) {
        for (let x = 0; x < TILE; x++) {
          const dx = x - cx;
          const dy = y - cy;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d <= r0) {
            const n = (x * 19 + y * 11) % 17;
            const c = n === 0 ? leafHi : n === 7 ? leaf2 : leaf;
            px(x, y, c);
          }
        }
      }

      // trunk
      for (let y = 10; y < TILE; y++) {
        for (let x = 7; x <= 8; x++) {
          const isEdge = x === 7;
          px(x, y, isEdge ? trunkShade : trunk);
        }
      }

      // small shadow at base
      px(6, 15, trunkShade);
      px(9, 15, trunkShade);
    });

    // Tile idx 4 (gid 5): building wall. Softer plaster w/ subtle tiling, less noisy than the placeholder.
    paintTile(4, (px) => {
      const base = '#d9d2c7';
      const shade = '#c9c1b6';
      const deep = '#b7afa4';
      const highlight = '#ece6dd';

      for (let y = 0; y < TILE; y++) {
        for (let x = 0; x < TILE; x++) {
          const n = (x * 23 + y * 17) % 41;
          const c = n === 0 ? highlight : n === 7 ? deep : n === 13 ? shade : base;
          px(x, y, c);
        }
      }

      // Gentle horizontal trim line to break repetition.
      for (let x = 0; x < TILE; x++) {
        px(x, 5, shade);
        if (x % 4 === 1) px(x, 6, deep);
      }

      // A darker base shadow at bottom.
      for (let x = 0; x < TILE; x++) px(x, 15, deep);
    });

    // Tile idx 5 (gid 6): roof. Clean shingle pattern with slight variation.
    paintTile(5, (px) => {
      const r1 = '#b3473f';
      const r2 = '#9c3c36';
      const r3 = '#c75b52';
      const edge = '#7f2f2b';

      for (let y = 0; y < TILE; y++) {
        for (let x = 0; x < TILE; x++) {
          // Shingle rows every 3px, staggered.
          const row = Math.floor(y / 3);
          const offset = (row % 2) * 2;
          const inShingle = ((x + offset) % 6) < 5;
          const seam = ((x + offset) % 6) === 0 || y % 3 === 0;
          const n = (x * 13 + y * 19) % 31;
          const base = n === 0 ? r3 : n === 11 ? r2 : r1;
          px(x, y, seam ? edge : inShingle ? base : r2);
        }
      }

      // Roof bottom lip.
      for (let x = 0; x < TILE; x++) px(x, 15, edge);
    });

    // Tile idx 6 (gid 7): London street/asphalt. Make it warmer + more vibrant than flat gray.
    paintTile(6, (px) => {
      const base = '#7a6f62'; // warm asphalt
      const dark = '#5f564c';
      const hi = '#8d8275';
      const speck = '#a09383';

      for (let y = 0; y < TILE; y++) {
        for (let x = 0; x < TILE; x++) {
          const seam = x % 8 === 0 || y % 8 === 0;
          const n = (x * 13 + y * 17) % 29;
          const c = seam ? dark : n === 0 ? speck : n === 11 ? hi : base;
          px(x, y, c);
        }
      }

      // Subtle painted lane marks every other row to add life (still tiles well).
      const paint = '#d8c45c';
      for (let x = 2; x < 14; x += 4) {
        px(x, 3, paint);
        px(x + 1, 3, paint);
        px(x, 11, paint);
        px(x + 1, 11, paint);
      }
    });

    // Tile idx 7 (gid 8): cobblestone road (walkable).
    paintTile(7, (px) => {
      // Warmer stone so it doesn't read like bland gray asphalt.
      const base = '#9a8c7a';
      const shade = '#847765';
      const hi = '#b2a48f';
      const mortar = '#6b5f52';

      // 4x4 cobble blocks with slight offsets.
      for (let y = 0; y < TILE; y++) {
        for (let x = 0; x < TILE; x++) {
          const by = Math.floor(y / 4);
          const bx = Math.floor((x + (by % 2) * 2) / 4);
          const isMortar = x % 4 === (by % 2) * 2 || y % 4 === 0;
          const n = (bx * 19 + by * 11 + x + y) % 13;
          const c = isMortar ? mortar : n === 0 ? hi : n === 5 ? shade : base;
          px(x, y, c);
        }
      }
    });

    // Tile idx 9 (gid 10): interior wall. Make it fully gray (solid fill).
    // Interiors use GIDs 9-12; the overworld map doesn't, so this won't affect outside.
    paintTile(9, (px) => {
      const wall = '#808080';
      for (let y = 0; y < TILE; y++) {
        for (let x = 0; x < TILE; x++) px(x, y, wall);
      }
    });

    // Tile idx 12 (gid 13): signpost (blocked).
    paintTile(12, (px) => {
      const grass = '#49b949';
      const wood = '#8b5a2b';
      const wood2 = '#74461f';
      const outline = '#3b2314';

      // grass background
      for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) px(x, y, grass);

      // post
      for (let y = 6; y < 16; y++) {
        px(7, y, outline);
        px(8, y, wood);
        px(9, y, wood2);
      }

      // board
      for (let y = 2; y <= 7; y++) {
        for (let x = 2; x <= 13; x++) {
          const edge = x === 2 || x === 13 || y === 2 || y === 7;
          px(x, y, edge ? outline : wood);
        }
      }
    });

    // Tile idx 13 (gid 14): flowers (blocked).
    paintTile(13, (px) => {
      const grass = '#49b949';
      const speck1 = '#3ea83e';
      const speck2 = '#5fd25f';
      const stem = '#2f8c2f';
      const pink = '#ff7aa8';
      const yellow = '#ffd05e';
      const white = '#f2f0e9';

      for (let y = 0; y < TILE; y++) {
        for (let x = 0; x < TILE; x++) {
          const r = (x * 17 + y * 13) % 29;
          px(x, y, r === 0 ? speck1 : r === 11 ? speck2 : grass);
        }
      }

      // three little flowers
      const flowers = [
        { x: 5, y: 10, c: pink },
        { x: 10, y: 8, c: yellow },
        { x: 12, y: 12, c: white },
      ];
      for (const f of flowers) {
        px(f.x, f.y, stem);
        px(f.x, f.y - 1, stem);
        px(f.x - 1, f.y - 2, f.c);
        px(f.x, f.y - 2, f.c);
        px(f.x + 1, f.y - 2, f.c);
        px(f.x, f.y - 3, f.c);
      }
    });

    // Tile idx 14 (gid 15): small bush (blocked).
    paintTile(14, (px) => {
      const grass = '#49b949';
      const leaf = '#2f8c2f';
      const leaf2 = '#3fa53f';
      const leafHi = '#63d063';

      for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) px(x, y, grass);

      // bush blob near bottom
      const cx = 8;
      const cy = 11;
      const r0 = 5.2;
      for (let y = 6; y < TILE; y++) {
        for (let x = 0; x < TILE; x++) {
          const dx = x - cx;
          const dy = y - cy;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d <= r0) {
            const n = (x * 19 + y * 11) % 17;
            const c = n === 0 ? leafHi : n === 7 ? leaf2 : leaf;
            px(x, y, c);
          }
        }
      }
    });

    canvasTexture.refresh();
  }

  private ensureDoorTileTexture(): void {
    const key = 'door_tile';
    if (this.textures.exists(key)) return;

    const w = 16;
    const h = 16;
    const canvasTexture = this.textures.createCanvas(key, w, h);
    if (!canvasTexture) throw new Error('Failed to create door_tile canvas texture');
    const ctx = canvasTexture.context;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, w, h);

    const px = (x: number, y: number, c: string) => {
      ctx.fillStyle = c;
      ctx.fillRect(x, y, 1, 1);
    };

    const outline = '#3b2314';
    const wood = '#8b5a2b';
    const wood2 = '#74461f';
    const hi = '#a56c35';
    const knob = '#d6c26b';

    // Door body (centered, with outline)
    for (let y = 3; y <= 15; y++) {
      for (let x = 5; x <= 10; x++) {
        const edge = x === 5 || x === 10 || y === 3 || y === 15;
        px(x, y, edge ? outline : wood);
      }
    }

    // Inner panels + subtle vertical grain
    for (let y = 5; y <= 13; y++) {
      for (let x = 6; x <= 9; x++) {
        const grain = (x + y) % 7 === 0;
        px(x, y, grain ? wood2 : wood);
      }
    }
    for (let y = 4; y <= 14; y += 2) {
      px(7, y, hi);
    }

    // Knob
    px(9, 10, knob);
    px(9, 11, outline);

    canvasTexture.refresh();
  }

  private ensurePaddingTileTextures(): void {
    this.ensureSolidTileTexture('tile_black', '#000000');
    this.ensureCutoutTileTexture('tile_tree', 'overworld_tiles', 16, 3);
  }

  private ensureSolidTileTexture(key: string, color: string): void {
    if (this.textures.exists(key)) return;
    const w = 16;
    const h = 16;
    const tex = this.textures.createCanvas(key, w, h);
    if (!tex) throw new Error(`Failed to create ${key} canvas texture`);
    const ctx = tex.context;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
    tex.refresh();
  }

  private ensureCutoutTileTexture(
    key: string,
    sourceTextureKey: string,
    tileSize: number,
    tileIdx0Based: number,
  ): void {
    if (this.textures.exists(key)) return;
    const srcTex = this.textures.get(sourceTextureKey);
    const src = srcTex?.getSourceImage() as HTMLImageElement | HTMLCanvasElement | undefined;
    if (!src) return;

    const srcW = (src as HTMLImageElement).width ?? (src as HTMLCanvasElement).width;
    const cols = Math.floor(srcW / tileSize) || 1;
    const col = tileIdx0Based % cols;
    const row = Math.floor(tileIdx0Based / cols);
    const sx = col * tileSize;
    const sy = row * tileSize;

    const tex = this.textures.createCanvas(key, tileSize, tileSize);
    if (!tex) throw new Error(`Failed to create ${key} canvas texture`);
    const ctx = tex.context;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, tileSize, tileSize);
    ctx.drawImage(src as CanvasImageSource, sx, sy, tileSize, tileSize, 0, 0, tileSize, tileSize);
    tex.refresh();
  }
}


