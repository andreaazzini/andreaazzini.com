import Phaser from 'phaser';
import { GridMovement, type Facing } from '../systems/GridMovement';
import { DialogueBox } from '../ui/DialogueBox';
import { DialogueSystem } from '../systems/DialogueSystem';
import { InteractionSystem, type NpcEntity, type SignEntity } from '../systems/InteractionSystem';
import { NPC_BY_ID } from '../world/npcs';
import { AudioSystem } from '../systems/AudioSystem';
import { characterTextureKey } from '../assets/characters/extract';
import { PLAYER_SPRITE_FOLDER } from '../world/characterCatalog';

type NpcRuntime = {
  npc: NpcEntity;
  sprite: Phaser.GameObjects.Sprite;
  movement: GridMovement;
  home: { minX: number; maxX: number; minY: number; maxY: number };
  walkToggle: boolean;
  arriveResolve?: (() => void) | undefined;
};

type OverworldData = {
  spawnX?: number;
  spawnY?: number;
  facing?: Facing;
};

export class OverworldScene extends Phaser.Scene {
  static readonly KEY = 'OverworldScene';

  private player?: Phaser.GameObjects.Sprite;
  private movement?: GridMovement;
  private readonly characterBaseDepth = 10;
  private groundLayer?: Phaser.Tilemaps.TilemapLayer;
  private collisionLayer?: Phaser.Tilemaps.TilemapLayer;
  private doorSprites: Phaser.GameObjects.Image[] = [];
  private dialogueBox?: DialogueBox;
  private dialogue?: DialogueSystem;
  private interactions?: InteractionSystem;
  private npcs: NpcEntity[] = [];
  private signs: SignEntity[] = [];
  private npcTileIndex = new Set<string>();
  private npcRuntimes: NpcRuntime[] = [];
  private npcTurnEvent?: Phaser.Time.TimerEvent;
  private npcTurnIndex = 0;
  private doorByTile = new Map<string, 'padua_home' | 'milan_home' | 'london_office'>();
  private pendingSpawn?: { tileX: number; tileY: number; facing?: Facing };
  private keys?: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    w: Phaser.Input.Keyboard.Key;
    a: Phaser.Input.Keyboard.Key;
    s: Phaser.Input.Keyboard.Key;
    d: Phaser.Input.Keyboard.Key;
  };

  private readonly tileSize = 16;
  // Only these ground tiles are considered walkable outside.
  // Tileset gids:
  // - 1 = grass
  // - 2 = dirt path
  // - 7 = brick street
  // - 8 = cobblestone road
  // - 14 = flowers (walkable)
  private readonly overworldWalkableGroundGids = new Set<number>([1, 2, 7, 8, 14]);
  // 4×3 (12-frame) layout: rows = down, up, left, right; cols = walk1, still, walk2
  private readonly rowByFacing = { down: 0, up: 1, left: 2, right: 3 } as const;
  private walkToggle = false;
  private playerMoving = false;

  constructor() {
    super(OverworldScene.KEY);
  }

  init(data: OverworldData): void {
    if (typeof data.spawnX === 'number' && typeof data.spawnY === 'number') {
      this.pendingSpawn = { tileX: data.spawnX, tileY: data.spawnY, facing: data.facing };
    } else {
      this.pendingSpawn = undefined;
    }
  }

  preload(): void {
    this.load.tilemapTiledJSON('overworld', 'assets/maps/overworld.tmj');
  }

  create(): void {
    this.cameras.main.setRoundPixels(true);

    const map = this.make.tilemap({ key: 'overworld' });
    const tileset = map.addTilesetImage('overworld_tiles', 'overworld_tiles', this.tileSize, this.tileSize, 0, 0);
    if (!tileset) throw new Error('Failed to create tileset for overworld');

    this.createCameraPaddingBackground('tile_tree', map.widthInPixels, map.heightInPixels);

    this.groundLayer = map.createLayer('Ground', tileset, 0, 0) ?? undefined;
    this.collisionLayer = map.createLayer('Collision', tileset, 0, 0) ?? undefined;

    if (this.collisionLayer) {
      this.collisionLayer.setCollisionBetween(1, 999);
    }

    this.dialogueBox = new DialogueBox(this, this.cameras.main.width, 46);
    this.add.existing(this.dialogueBox);
    this.dialogue = new DialogueSystem(this, this.dialogueBox);

    this.player = this.add.sprite(0, 0, characterTextureKey(PLAYER_SPRITE_FOLDER), this.frameFor('down', 'still'));
    this.player.setOrigin(0.5, 1);
    // Explicit depth so props like doors never render over the player due to creation order.
    this.player.setDepth(this.characterBaseDepth);

    this.movement = new GridMovement(this, this.player, {
      tileSize: this.tileSize,
      pixelOffsetX: this.tileSize / 2,
      pixelOffsetY: this.tileSize,
      stepDurationMs: 120,
      isBlocked: (x, y) => this.isBlocked(x, y),
      onArrive: (x, y) => this.onArrive(x, y),
      onStep: (_fromX, _fromY, _toX, _toY, facing) => {
        AudioSystem.playSfx('step');
        this.playerMoving = true;
        this.walkToggle = !this.walkToggle;
        if (this.player) {
          this.player.setFrame(this.frameFor(facing, this.walkToggle ? 'walk1' : 'walk2'));
        }
      },
    });

    const spawn =
      this.pendingSpawn ??
      (this.getSpawnFromMap(map) as { tileX: number; tileY: number; facing?: Facing } | null) ??
      { tileX: 10, tileY: 10, facing: 'down' as const };
    this.movement.setTilePosition(spawn.tileX, spawn.tileY);
    if (spawn.facing) this.movement.facing = spawn.facing;
    this.applyStillFrame(this.player, this.movement.facing);
    if (this.player) this.player.setDepth(this.characterBaseDepth + spawn.tileY);

    this.cameras.main.startFollow(this.player, true, 1, 1);
    this.setPaddedCameraBounds(map.widthInPixels, map.heightInPixels);

    this.keys = this.input.keyboard?.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D,
    }) as OverworldScene['keys'];

    this.spawnNpcsFromMap(map);
    this.loadSignsFromMap(map);
    this.loadDoorsFromMap(map);
    this.spawnDoorSprites();
    this.interactions = new InteractionSystem(this, this.movement, this.dialogue);
    this.interactions.rebuildIndex(this.npcs);
    this.interactions.rebuildSigns(this.signs);

    // NPC movement cycle: iterate NPCs in a fixed order. Each turn waits 100ms, then forces one NPC to step.
    this.startNpcTurnCycle();

    const zKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
    const enterKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    zKey?.on('down', () => this.interactions?.handleInteract());
    enterKey?.on('down', () => this.interactions?.handleInteract());
  }

  update(_time: number, delta: number): void {
    if (!this.movement || !this.keys) return;
    if (this.dialogue?.open) {
      this.movement.update(delta, null);
      return;
    }
    this.movement.update(delta, this.getDesiredFacing());
    // Keep the sprite in the "still" frame when not actively stepping.
    if (this.player && !this.playerMoving) this.applyStillFrame(this.player, this.movement.facing);
    if (this.player) this.player.setDepth(this.characterBaseDepth + this.movement.tileY);
  }

  private frameFor(facing: Facing, phase: 'walk1' | 'still' | 'walk2'): number {
    const row = this.rowByFacing[facing];
    const col = phase === 'walk1' ? 0 : phase === 'still' ? 1 : 2;
    return row * 3 + col;
  }

  private applyStillFrame(sprite: Phaser.GameObjects.Sprite, facing: Facing): void {
    sprite.setFrame(this.frameFor(facing, 'still'));
    sprite.setFlipX(false);
  }

  private getDesiredFacing(): Facing | null {
    if (!this.keys) return null;

    // Priority order mirrors classic feel: vertical first, then horizontal.
    if (this.keys.up.isDown || this.keys.w.isDown) return 'up';
    if (this.keys.down.isDown || this.keys.s.isDown) return 'down';
    if (this.keys.left.isDown || this.keys.a.isDown) return 'left';
    if (this.keys.right.isDown || this.keys.d.isDown) return 'right';
    return null;
  }

  private isBlocked(tileX: number, tileY: number): boolean {
    if (this.npcTileIndex.has(this.key(tileX, tileY))) return true;
    if (this.isDoorTile(tileX, tileY)) return false;
    const ground = this.groundLayer;
    const collision = this.collisionLayer;

    const boundsMap = ground?.tilemap ?? collision?.tilemap;
    if (!boundsMap) return false;
    if (tileX < 0 || tileY < 0 || tileX >= boundsMap.width || tileY >= boundsMap.height) return true;

    // Outdoors: only allow walking on short grass + road tiles.
    if (ground) {
      const g = ground.getTileAt(tileX, tileY, true);
      const gid = g?.index ?? -1;
      if (!this.overworldWalkableGroundGids.has(gid)) return true;
    }

    // Still respect explicit collision tiles (e.g. boundaries, authored blockers).
    if (collision) {
      const c = collision.getTileAt(tileX, tileY, true);
      if (c?.index !== -1 && c?.index !== 0) return true;
    }

    return false;
  }

  private onArrive(tileX: number, tileY: number): void {
    // Arrived at a tile: return to still frame.
    this.playerMoving = false;
    if (this.player && this.movement) this.applyStillFrame(this.player, this.movement.facing);

    if (this.dialogue?.open) return;
    const interiorId = this.doorByTile.get(this.key(tileX, tileY));
    if (!interiorId) return;

    const returnTo = this.getReturnSpawnForDoor(interiorId, tileX, tileY);
    AudioSystem.playSfx('door');
    this.cameras.main.fadeOut(140, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('InteriorScene', { interiorId, returnTo });
    });
  }

  private loadDoorsFromMap(map: Phaser.Tilemaps.Tilemap): void {
    this.doorByTile.clear();
    const objects = map.getObjectLayer('Objects')?.objects ?? [];
    for (const obj of objects) {
      if (obj.type !== 'door') continue;
      const interiorId = obj.name as 'padua_home' | 'milan_home' | 'london_office';
      const tileX = Math.floor((obj.x ?? 0) / this.tileSize);
      const tileY = Math.floor((obj.y ?? 0) / this.tileSize);
      this.doorByTile.set(this.key(tileX, tileY), interiorId);
    }
  }

  private loadSignsFromMap(map: Phaser.Tilemaps.Tilemap): void {
    this.signs = [];
    const objects = map.getObjectLayer('Objects')?.objects ?? [];
    for (const obj of objects) {
      if (obj.type !== 'sign') continue;
      const tileX = Math.floor((obj.x ?? 0) / this.tileSize);
      const tileY = Math.floor((obj.y ?? 0) / this.tileSize);
      type TiledProperty = { name: string; type?: string; value?: unknown };
      const props = (obj.properties ?? []) as TiledProperty[];
      const textProp = props.find((p: TiledProperty) => p.name === 'text');
      const text = textProp?.value;
      const resolvedText = typeof text === 'string' && text.trim() ? text : '...';
      this.signs.push({ tileX, tileY, text: resolvedText });
    }
  }

  private spawnDoorSprites(): void {
    // Clear old sprites if the scene is recreated.
    for (const s of this.doorSprites) s.destroy();
    this.doorSprites = [];

    if (!this.textures.exists('door_tile')) return;

    for (const k of this.doorByTile.keys()) {
      const [sx, sy] = k.split(',');
      const tileX = Number(sx);
      const tileY = Number(sy);
      if (!Number.isFinite(tileX) || !Number.isFinite(tileY)) continue;

      const x = tileX * this.tileSize;
      const y = tileY * this.tileSize;
      // Above ground, below player/NPCs.
      const img = this.add.image(x, y, 'door_tile').setOrigin(0, 0).setDepth(5);
      this.doorSprites.push(img);
    }
  }

  private getReturnSpawnForDoor(
    interiorId: 'padua_home' | 'milan_home' | 'london_office',
    doorTileX: number,
    doorTileY: number,
  ): { tileX: number; tileY: number; facing?: Facing } {
    // Return outside near the front door, avoiding door tiles/NPC tiles and ensuring the tile is walkable.
    // Facing up feels natural coming out.
    void interiorId;

    const preferred: Array<{ x: number; y: number; facing: Facing }> = [
      { x: doorTileX, y: doorTileY + 1, facing: 'up' },
      { x: doorTileX, y: doorTileY + 2, facing: 'up' },
      { x: doorTileX - 1, y: doorTileY + 1, facing: 'up' },
      { x: doorTileX + 1, y: doorTileY + 1, facing: 'up' },
      { x: doorTileX - 2, y: doorTileY + 1, facing: 'up' },
      { x: doorTileX + 2, y: doorTileY + 1, facing: 'up' },
    ];

    for (const c of preferred) {
      if (this.isDoorTile(c.x, c.y)) continue;
      if (this.npcTileIndex.has(this.key(c.x, c.y))) continue;
      if (this.isWalkableOutside(c.x, c.y)) return { tileX: c.x, tileY: c.y, facing: c.facing };
    }

    const nearest =
      this.findNearestFreeWalkableTile(doorTileX, doorTileY + 1, 10) ??
      this.findNearestFreeWalkableTile(doorTileX, doorTileY + 2, 10);
    if (nearest) return { tileX: nearest.tileX, tileY: nearest.tileY, facing: 'up' as const };

    // Fallback: at least avoid instantly re-triggering the door.
    return { tileX: doorTileX, tileY: doorTileY + 1, facing: 'up' as const };
  }

  private getSpawnFromMap(map: Phaser.Tilemaps.Tilemap): { tileX: number; tileY: number } | null {
    const objects = map.getObjectLayer('Objects')?.objects ?? [];
    const spawn = objects.find((o) => o.type === 'spawn' && o.name === 'player_spawn');
    if (!spawn) return null;
    return {
      tileX: Math.floor((spawn.x ?? 0) / this.tileSize),
      tileY: Math.floor((spawn.y ?? 0) / this.tileSize),
    };
  }

  private spawnNpcsFromMap(map: Phaser.Tilemaps.Tilemap): void {
    this.npcs = [];
    this.npcTileIndex.clear();
    this.npcRuntimes = [];
    const objects = map.getObjectLayer('Objects')?.objects ?? [];
    for (const obj of objects) {
      if (obj.type !== 'npc') continue;
      const npcId = obj.name;
      const def = NPC_BY_ID[npcId];
      if (!def) continue;

      const rawTileX = Math.floor((obj.x ?? 0) / this.tileSize);
      const rawTileY = Math.floor((obj.y ?? 0) / this.tileSize);
      const resolved = this.findNearestFreeWalkableTile(rawTileX, rawTileY, 8) ?? { tileX: rawTileX, tileY: rawTileY };
      const tileX = resolved.tileX;
      const tileY = resolved.tileY;

      const { x, y } = this.tileToWorld(tileX, tileY);
      const sprite = this.add.sprite(x, y, characterTextureKey(def.spriteFolder), this.frameFor('down', 'still'));
      sprite.setOrigin(0.5, 1);
      sprite.setDepth(this.characterBaseDepth + tileY);
      // Default NPC facing: down
      this.applyStillFrame(sprite, 'down');

      const npc: NpcEntity = {
        id: def.id,
        tileX,
        tileY,
        faceToward: (px, py) => {
          // Face toward the player (simple 4-dir).
          const dx = px - npc.tileX;
          const dy = py - npc.tileY;
          if (dx < 0) this.applyStillFrame(sprite, 'left');
          else if (dx > 0) this.applyStillFrame(sprite, 'right');
          else if (dy < 0) this.applyStillFrame(sprite, 'up');
          else if (dy > 0) this.applyStillFrame(sprite, 'down');
        },
        talk: () => {
          // Always return the same line (no cycling).
          return def.dialogue[0] ?? '';
        },
      };

      this.npcs.push(npc);
      this.npcTileIndex.add(this.key(tileX, tileY));

      const home = { minX: tileX - 1, maxX: tileX + 1, minY: tileY - 1, maxY: tileY + 1 };
      const runtime: NpcRuntime = {
        npc,
        sprite,
        movement: undefined as unknown as GridMovement,
        home,
        walkToggle: false,
        arriveResolve: undefined,
      };

      const npcMovement = new GridMovement(this, sprite, {
        tileSize: this.tileSize,
        pixelOffsetX: this.tileSize / 2,
        pixelOffsetY: this.tileSize,
        stepDurationMs: 140,
        isBlocked: (x2, y2) => this.isNpcBlocked(npc, home, x2, y2),
        onStep: (fromX, fromY, toX, toY, facing) => {
          // Occupancy + interaction index: update immediately so others can't pick the same tile this tick.
          this.npcTileIndex.delete(this.key(fromX, fromY));
          this.npcTileIndex.add(this.key(toX, toY));
          npc.tileX = toX;
          npc.tileY = toY;
          sprite.setDepth(this.characterBaseDepth + toY);
          this.interactions?.moveNpc(npc, fromX, fromY, toX, toY);

          // Simple walk animation (toggle walk frames).
          runtime.walkToggle = !runtime.walkToggle;
          sprite.setFrame(this.frameFor(facing, runtime.walkToggle ? 'walk1' : 'walk2'));
        },
        onArrive: (_x2, _y2, facing) => {
          this.applyStillFrame(sprite, facing);
          const resolve = runtime.arriveResolve;
          runtime.arriveResolve = undefined;
          resolve?.();
        },
      });

      runtime.movement = npcMovement;
      this.npcRuntimes.push(runtime);
    }
  }

  private startNpcTurnCycle(): void {
    this.npcTurnEvent?.destroy();
    this.npcTurnEvent = undefined;
    this.npcTurnIndex = 0;
    this.scheduleNextNpcTurn();
  }

  private scheduleNextNpcTurn(): void {
    this.npcTurnEvent?.destroy();
    this.npcTurnEvent = this.time.delayedCall(100, () => {
      void this.runNextNpcTurn().then(() => this.scheduleNextNpcTurn());
    });
  }

  private async runNextNpcTurn(): Promise<void> {
    if (this.dialogue?.open) return;
    if (!this.movement) return;
    if (this.npcRuntimes.length === 0) return;

    const r = this.npcRuntimes[this.npcTurnIndex % this.npcRuntimes.length];
    this.npcTurnIndex = (this.npcTurnIndex + 1) % this.npcRuntimes.length;

    // Force a move: pick a random allowed direction and commit a step if any are available.
    const allowed = this.getAllowedNpcFacings(r);
    if (allowed.length === 0) return;

    // Random choice among allowed.
    const idx = Math.floor(Math.random() * allowed.length);
    const chosen = allowed[idx] ?? allowed[0];
    if (!chosen) return;

    await this.forceNpcStep(r, chosen, allowed);
  }

  private getAllowedNpcFacings(r: NpcRuntime): Facing[] {
    if (!this.movement) return [];
    const playerX = this.movement.tileX;
    const playerY = this.movement.tileY;

    const dirs: Facing[] = ['up', 'down', 'left', 'right'];
    const allowed: Facing[] = [];
    for (const facing of dirs) {
      const dx = facing === 'left' ? -1 : facing === 'right' ? 1 : 0;
      const dy = facing === 'up' ? -1 : facing === 'down' ? 1 : 0;
      const toX = r.npc.tileX + dx;
      const toY = r.npc.tileY + dy;
      if (toX === playerX && toY === playerY) continue;
      if (this.isNpcBlocked(r.npc, r.home, toX, toY)) continue;
      allowed.push(facing);
    }
    return allowed;
  }

  private async forceNpcStep(r: NpcRuntime, primary: Facing, fallbacks: Facing[]): Promise<void> {
    // Try the primary first; if it fails (race), fall back to the remaining allowed directions.
    const order = [primary, ...fallbacks.filter((f) => f !== primary)];
    for (const facing of order) {
      const started = r.movement.tryStep(facing);
      if (!started) continue;
      await new Promise<void>((resolve) => {
        r.arriveResolve = resolve;
      });
      return;
    }
  }

  private isNpcBlocked(npc: NpcEntity, home: NpcRuntime['home'], tileX: number, tileY: number): boolean {
    // Stay within a 3×3 area centered on the NPC's starting tile.
    if (tileX < home.minX || tileX > home.maxX || tileY < home.minY || tileY > home.maxY) return true;

    // NPCs should not enter door tiles.
    if (this.isDoorTile(tileX, tileY)) return true;

    // Also avoid stepping onto the player.
    if (this.movement && tileX === this.movement.tileX && tileY === this.movement.tileY) return true;

    // Respect authored blockers and other NPC occupancy.
    void npc;
    return this.isBlocked(tileX, tileY);
  }

  private isWalkableOutside(tileX: number, tileY: number): boolean {
    const ground = this.groundLayer;
    const collision = this.collisionLayer;

    const boundsMap = ground?.tilemap ?? collision?.tilemap;
    if (!boundsMap) return true;
    if (tileX < 0 || tileY < 0 || tileX >= boundsMap.width || tileY >= boundsMap.height) return false;

    // Doors are always walkable so the player can step into them to enter interiors.
    if (this.isDoorTile(tileX, tileY)) return true;

    if (ground) {
      const g = ground.getTileAt(tileX, tileY, true);
      const gid = g?.index ?? -1;
      if (!this.overworldWalkableGroundGids.has(gid)) return false;
    }

    if (collision) {
      const c = collision.getTileAt(tileX, tileY, true);
      if (c?.index !== -1 && c?.index !== 0) return false;
    }

    return true;
  }

  private isDoorTile(tileX: number, tileY: number): boolean {
    return this.doorByTile.has(this.key(tileX, tileY));
  }

  private findNearestFreeWalkableTile(
    originX: number,
    originY: number,
    maxRadius: number,
  ): { tileX: number; tileY: number } | null {
    const isFree = (x: number, y: number) =>
      this.isWalkableOutside(x, y) && !this.isDoorTile(x, y) && !this.npcTileIndex.has(this.key(x, y));

    if (isFree(originX, originY)) return { tileX: originX, tileY: originY };

    for (let r = 1; r <= maxRadius; r++) {
      for (let dx = -r; dx <= r; dx++) {
        const dy = r - Math.abs(dx);
        const candidates: Array<{ x: number; y: number }> = [
          { x: originX + dx, y: originY + dy },
          { x: originX + dx, y: originY - dy },
        ];
        for (const c of candidates) {
          if (isFree(c.x, c.y)) return { tileX: c.x, tileY: c.y };
        }
      }
    }
    return null;
  }

  private tileToWorld(tileX: number, tileY: number): { x: number; y: number } {
    return { x: tileX * this.tileSize + this.tileSize / 2, y: tileY * this.tileSize + this.tileSize };
  }

  private setPaddedCameraBounds(mapW: number, mapH: number): void {
    const cam = this.cameras.main;
    const padX = cam.width / 2;
    const padY = cam.height / 2;
    cam.setBounds(-padX, -padY, mapW + padX * 2, mapH + padY * 2);
  }

  private createCameraPaddingBackground(tileKey: string, mapW: number, mapH: number): void {
    if (!this.textures.exists(tileKey)) return;
    const cam = this.cameras.main;
    const padX = cam.width / 2 + this.tileSize * 2;
    const padY = cam.height / 2 + this.tileSize * 2;
    const bg = this.add
      .tileSprite(mapW / 2, mapH / 2, mapW + padX * 2, mapH + padY * 2, tileKey)
      .setOrigin(0.5, 0.5);
    bg.setDepth(-100);
  }

  private key(tileX: number, tileY: number): string {
    return `${tileX},${tileY}`;
  }
}


