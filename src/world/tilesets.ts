import Phaser from 'phaser';

const TILE_SIZE = 16;
const COLS = 8;
const ROWS = 8;

function drawTile(
  ctx: CanvasRenderingContext2D,
  tileIndex: number,
  draw: (x: number, y: number) => void,
): void {
  const col = tileIndex % COLS;
  const row = Math.floor(tileIndex / COLS);
  const ox = col * TILE_SIZE;
  const oy = row * TILE_SIZE;
  ctx.save();
  ctx.translate(ox, oy);
  draw(ox, oy);
  ctx.restore();
}

export function ensureOverworldTilesTexture(scene: Phaser.Scene): void {
  const key = 'overworld_tiles';
  if (scene.textures.exists(key)) return;

  const texW = COLS * TILE_SIZE;
  const texH = ROWS * TILE_SIZE;
  const canvasTexture = scene.textures.createCanvas(key, texW, texH);
  if (!canvasTexture) throw new Error('Failed to create overworld_tiles canvas texture');

  const ctx = canvasTexture.context;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, texW, texH);

  const px = (x: number, y: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, 1, 1);
  };

  // Tile 1: grass
  {
    const base = '#3eaa3e';
    const speck1 = '#2f8c2f';
    const speck2 = '#56c256';
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        const r = (x * 13 + y * 7) % 17;
        px(x, y, r === 0 ? speck1 : r === 3 ? speck2 : base);
      }
    }
  }

  // Tile 2: path
  drawTile(ctx, 1, () => {
    // already grass tile 1 occupies index 0 visually, but our map uses gid=1 => tileIndex 0 in texture.
  });

  // We draw tiles by absolute pixel coordinates; compute offsets per tile index.
  const tile = (idx0Based: number, fn: (ox: number, oy: number) => void) => {
    const col = idx0Based % COLS;
    const row = Math.floor(idx0Based / COLS);
    fn(col * TILE_SIZE, row * TILE_SIZE);
  };

  // idx 0: grass
  tile(0, (ox, oy) => {
    const base = '#3eaa3e';
    const speck1 = '#2f8c2f';
    const speck2 = '#56c256';
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        const r = (x * 13 + y * 7) % 17;
        px(ox + x, oy + y, r === 0 ? speck1 : r === 3 ? speck2 : base);
      }
    }
  });

  // idx 1: dirt path
  tile(1, (ox, oy) => {
    const base = '#c7b07a';
    const shade = '#b99e67';
    const pebble = '#d4c08d';
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        const edge = x === 0 || y === 0 || x === TILE_SIZE - 1 || y === TILE_SIZE - 1;
        const r = (x * 11 + y * 5) % 23;
        px(ox + x, oy + y, edge ? shade : r === 0 ? pebble : base);
      }
    }
  });

  // idx 2: water
  tile(2, (ox, oy) => {
    const base = '#2f6fd6';
    const wave = '#4a8bf0';
    const deep = '#225ab2';
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        const r = (x + y) % 8;
        px(ox + x, oy + y, r === 0 ? wave : r === 5 ? deep : base);
      }
    }
    // little wave line
    for (let x = 2; x < 14; x++) px(ox + x, oy + 6, wave);
  });

  // idx 3: tree (top)
  tile(3, (ox, oy) => {
    const leaf = '#2f8c2f';
    const leaf2 = '#3fa53f';
    const trunk = '#7b4b2a';
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) px(ox + x, oy + y, leaf2);
    }
    for (let y = 2; y < 12; y++) {
      for (let x = 2; x < 14; x++) px(ox + x, oy + y, (x + y) % 3 === 0 ? leaf : leaf2);
    }
    for (let y = 12; y < 16; y++) {
      for (let x = 7; x <= 8; x++) px(ox + x, oy + y, trunk);
    }
  });

  // idx 4: building wall
  tile(4, (ox, oy) => {
    const base = '#d7d2c8';
    const line = '#c6bfb4';
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        px(ox + x, oy + y, y % 4 === 0 ? line : base);
      }
    }
  });

  // idx 5: roof
  tile(5, (ox, oy) => {
    const base = '#b2473f';
    const shade = '#9a3b34';
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        const r = (x * 7 + y * 9) % 13;
        px(ox + x, oy + y, r === 0 ? shade : base);
      }
    }
    for (let x = 0; x < TILE_SIZE; x++) px(ox + x, oy + 15, shade);
  });

  // idx 6: brick (London street)
  tile(6, (ox, oy) => {
    const base = '#7d7d7d';
    const dark = '#666666';
    const light = '#909090';
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        const mortar = y % 4 === 0 || (y % 4 === 2 && x % 8 === 0);
        px(ox + x, oy + y, mortar ? dark : (x + y) % 7 === 0 ? light : base);
      }
    }
  });

  // idx 8: wood floor (interiors)
  tile(8, (ox, oy) => {
    const base = '#caa06a';
    const dark = '#b58a58';
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        const seam = x % 5 === 0;
        px(ox + x, oy + y, seam ? dark : base);
      }
    }
  });

  // idx 9: interior wall
  tile(9, (ox, oy) => {
    const base = '#2a2a2a';
    const light = '#3a3a3a';
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        const r = (x * 5 + y * 11) % 19;
        px(ox + x, oy + y, r === 0 ? light : base);
      }
    }
  });

  // idx 10: rug
  tile(10, (ox, oy) => {
    const base = '#7a3b3b';
    const edge = '#612f2f';
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        const isEdge = x === 0 || y === 0 || x === TILE_SIZE - 1 || y === TILE_SIZE - 1;
        px(ox + x, oy + y, isEdge ? edge : base);
      }
    }
  });

  // idx 11: desk
  tile(11, (ox, oy) => {
    const wood = '#7b4b2a';
    const shade = '#633b22';
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        const r = (x + y) % 9;
        px(ox + x, oy + y, r === 0 ? shade : wood);
      }
    }
    for (let x = 2; x < 14; x++) px(ox + x, oy + 3, shade);
  });

  canvasTexture.refresh();
}


