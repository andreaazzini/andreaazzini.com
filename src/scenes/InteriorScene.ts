import Phaser from 'phaser';
import { GridMovement, type Facing } from '../systems/GridMovement';
import { DialogueBox } from '../ui/DialogueBox';
import { DialogueSystem } from '../systems/DialogueSystem';
import { InteractionSystem, type NpcEntity } from '../systems/InteractionSystem';
import { AudioSystem } from '../systems/AudioSystem';
import { characterTextureKey } from '../assets/characters/extract';
import { CHARACTER_BY_ID, PLAYER_SPRITE_FOLDER } from '../world/characterCatalog';

type InteriorId = 'padua_home' | 'milan_home' | 'london_office';

type InteriorData = {
  interiorId: InteriorId;
  returnTo: { tileX: number; tileY: number; facing?: Facing };
};

export class InteriorScene extends Phaser.Scene {
  static readonly KEY = 'InteriorScene';

  private readonly tileSize = 16;
  private readonly characterBaseDepth = 10;
  // 4×3 (12-frame) layout: rows = down, up, left, right; cols = walk1, still, walk2
  private readonly rowByFacing = { down: 0, up: 1, left: 2, right: 3 } as const;
  private walkToggle = false;
  private playerMoving = false;

  private player?: Phaser.GameObjects.Sprite;

  private interiorId: InteriorId = 'padua_home';
  private returnTo: InteriorData['returnTo'] = { tileX: 10, tileY: 10, facing: 'down' };

  private movement?: GridMovement;
  private collisionLayer?: Phaser.Tilemaps.TilemapLayer;
  private exitTile?: { tileX: number; tileY: number };

  private dialogue?: DialogueSystem;
  private interactions?: InteractionSystem;
  private npcs: NpcEntity[] = [];
  private npcTileIndex = new Set<string>();

  private v7EasterEgg = {
    armed: false,
    comboWasDown: false,
    vKey: undefined as Phaser.Input.Keyboard.Key | undefined,
    sevenKey: undefined as Phaser.Input.Keyboard.Key | undefined,
    numpadSevenKey: undefined as Phaser.Input.Keyboard.Key | undefined,
  };

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

  constructor() {
    super(InteriorScene.KEY);
  }

  init(data: InteriorData): void {
    this.interiorId = data.interiorId;
    this.returnTo = data.returnTo;
  }

  preload(): void {
    this.load.tilemapTiledJSON(this.interiorId, `assets/maps/${this.interiorId}.tmj`);
  }

  create(): void {
    this.cameras.main.setRoundPixels(true);

    // Switch to quieter interior loop (audio unlock happens on first title input).
    AudioSystem.playBgm('interior');

    const map = this.make.tilemap({ key: this.interiorId });
    const tileset = map.addTilesetImage('overworld_tiles', 'overworld_tiles', this.tileSize, this.tileSize, 0, 0);
    if (!tileset) throw new Error('Failed to create tileset for interior');

    this.createCameraPaddingBackground('tile_black', map.widthInPixels, map.heightInPixels);

    map.createLayer('Ground', tileset, 0, 0);
    this.collisionLayer = map.createLayer('Collision', tileset, 0, 0) ?? undefined;
    if (this.collisionLayer) this.collisionLayer.setCollisionBetween(1, 999);

    const objects = map.getObjectLayer('Objects')?.objects ?? [];
    const exitObj = objects.find((o) => o.type === 'exit');
    if (exitObj) {
      this.exitTile = {
        tileX: Math.floor((exitObj.x ?? 0) / this.tileSize),
        tileY: Math.floor((exitObj.y ?? 0) / this.tileSize),
      };
    }

    // Dialogue system is shared (same UI, calmer tone comes later via music).
    const dialogueBox = new DialogueBox(this, this.cameras.main.width, 46);
    this.add.existing(dialogueBox);
    this.dialogue = new DialogueSystem(this, dialogueBox);

    this.player = this.add
      .sprite(0, 0, characterTextureKey(PLAYER_SPRITE_FOLDER), this.frameFor('down', 'still'))
      .setOrigin(0.5, 1);
    this.player.setDepth(this.characterBaseDepth + this.returnTo.tileY);
    const player = this.player;

    this.movement = new GridMovement(this, player, {
      tileSize: this.tileSize,
      pixelOffsetX: this.tileSize / 2,
      pixelOffsetY: this.tileSize,
      stepDurationMs: 120,
      isBlocked: (x, y) => this.isBlocked(x, y),
      onArrive: (x, y) => {
        this.playerMoving = false;
        if (this.player) this.applyStillFrame(this.player, this.movement?.facing ?? 'down');
        if (this.exitTile && x === this.exitTile.tileX && y === this.exitTile.tileY) {
          this.leaveInterior();
        }
      },
      onStep: (_fromX, _fromY, _toX, _toY, facing) => {
        AudioSystem.playSfx('step');
        this.playerMoving = true;
        this.walkToggle = !this.walkToggle;
        if (this.player) {
          this.player.setFrame(this.frameFor(facing, this.walkToggle ? 'walk1' : 'walk2'));
        }
      },
    });

    // Spawn near the bottom by default.
    this.movement.setTilePosition(10, 12);
    if (this.player) this.applyStillFrame(this.player, this.movement.facing);
    if (this.player && this.movement) this.player.setDepth(this.characterBaseDepth + this.movement.tileY);

    this.cameras.main.startFollow(player, true, 1, 1);
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
    }) as InteriorScene['keys'];

    this.interactions = new InteractionSystem(this, this.movement, this.dialogue);
    this.spawnNpcsFromMap(objects);
    this.interactions.rebuildIndex(this.npcs);
    const zKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
    const enterKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    zKey?.on('down', () => this.handlePrimaryAction());
    enterKey?.on('down', () => this.handlePrimaryAction());

    if (this.interiorId === 'london_office') {
      this.v7EasterEgg.vKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.V);
      this.v7EasterEgg.sevenKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SEVEN);
      this.v7EasterEgg.numpadSevenKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.NUMPAD_SEVEN);
    }

    this.cameras.main.fadeIn(140, 0, 0, 0);
  }

  update(_time: number, delta: number): void {
    if (!this.movement || !this.keys) return;
    this.tryTriggerV7EasterEgg();
    if (this.dialogue?.open) {
      this.movement.update(delta, null);
      return;
    }
    this.movement.update(delta, this.getDesiredFacing());
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
    if (this.keys.up.isDown || this.keys.w.isDown) return 'up';
    if (this.keys.down.isDown || this.keys.s.isDown) return 'down';
    if (this.keys.left.isDown || this.keys.a.isDown) return 'left';
    if (this.keys.right.isDown || this.keys.d.isDown) return 'right';
    return null;
  }

  private isBlocked(tileX: number, tileY: number): boolean {
    if (this.npcTileIndex.has(this.key(tileX, tileY))) return true;
    const layer = this.collisionLayer;
    if (!layer) return false;
    if (tileX < 0 || tileY < 0 || tileX >= layer.tilemap.width || tileY >= layer.tilemap.height) return true;
    const tile = layer.getTileAt(tileX, tileY, true);
    return tile?.index !== -1 && tile?.index !== 0;
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

  private spawnNpcsFromMap(objects: Phaser.Types.Tilemaps.TiledObject[]): void {
    this.npcs = [];
    this.npcTileIndex.clear();

    type TiledProperty = { name: string; type?: string; value?: unknown };
    const readProp = (obj: Phaser.Types.Tilemaps.TiledObject, name: string): unknown => {
      const props = (obj.properties ?? []) as TiledProperty[];
      return props.find((p) => p.name === name)?.value;
    };

    for (const obj of objects) {
      if (obj.type !== 'npc') continue;
      const tileX = Math.floor((obj.x ?? 0) / this.tileSize);
      const tileY = Math.floor((obj.y ?? 0) / this.tileSize);
      if (this.isBlocked(tileX, tileY)) continue;

      const id = obj.name || 'npc';
      const catalog = CHARACTER_BY_ID[id];

      const textRaw = readProp(obj, 'text');
      const text = typeof textRaw === 'string' ? textRaw : '';
      if (!text) continue;

      const tintRaw = readProp(obj, 'tint');
      const tint =
        typeof tintRaw === 'number'
          ? tintRaw
          : typeof tintRaw === 'string'
            ? Number.parseInt(tintRaw.replace(/^0x/i, ''), 16)
            : null;

      const sprite = this.add
        .sprite(
          0,
          0,
          characterTextureKey(catalog?.spriteFolder ?? PLAYER_SPRITE_FOLDER),
          this.frameFor('down', 'still'),
        )
        .setOrigin(0.5, 1)
        .setDepth(this.characterBaseDepth + tileY);
      // Keep original sprite colors (ignore optional map tinting).
      void tint;

      sprite.setPosition(tileX * this.tileSize + this.tileSize / 2, tileY * this.tileSize + this.tileSize);
      this.applyStillFrame(sprite, 'down');

      const npc: NpcEntity = {
        id,
        tileX,
        tileY,
        faceToward: (px, py) => {
          const dx = px - npc.tileX;
          const dy = py - npc.tileY;
          if (dx < 0) this.applyStillFrame(sprite, 'left');
          else if (dx > 0) this.applyStillFrame(sprite, 'right');
          else if (dy < 0) this.applyStillFrame(sprite, 'up');
          else if (dy > 0) this.applyStillFrame(sprite, 'down');
        },
        talk: () => catalog?.message?.[0] ?? text,
      };

      this.npcs.push(npc);
      this.npcTileIndex.add(this.key(tileX, tileY));
    }
  }


  private key(tileX: number, tileY: number): string {
    return `${tileX},${tileY}`;
  }

  private handlePrimaryAction(): void {
    if (this.handleV7EasterEggAction()) return;
    this.interactions?.handleInteract();
  }

  private tryTriggerV7EasterEgg(): void {
    if (this.interiorId !== 'london_office') return;
    if (this.v7EasterEgg.armed) return;
    if (this.dialogue?.open) return;

    const vDown = this.v7EasterEgg.vKey?.isDown ?? false;
    const sevenDown = (this.v7EasterEgg.sevenKey?.isDown ?? false) || (this.v7EasterEgg.numpadSevenKey?.isDown ?? false);
    const bothDown = vDown && sevenDown;

    if (bothDown && !this.v7EasterEgg.comboWasDown) {
      this.v7EasterEgg.armed = true;
      AudioSystem.playSfx('blip');
      this.dialogue?.start('something is about to happen...');
    }

    this.v7EasterEgg.comboWasDown = bothDown;
  }

  private handleV7EasterEggAction(): boolean {
    if (this.interiorId !== 'london_office') return false;
    if (!this.v7EasterEgg.armed) return false;

    // Keep it as a deliberate follow-up action after the teaser text.
    if (this.dialogue?.open) this.dialogue.advance();

    window.open('https://v7labs.com', '_blank', 'noopener,noreferrer');
    this.v7EasterEgg.armed = false;
    this.v7EasterEgg.comboWasDown = false;
    return true;
  }

  private leaveInterior(): void {
    if (!this.movement) return;
    if (this.dialogue?.open) return;

    AudioSystem.playSfx('door');
    this.cameras.main.fadeOut(140, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      AudioSystem.playBgm('overworld');
      this.scene.start('OverworldScene', {
        spawnX: this.returnTo.tileX,
        spawnY: this.returnTo.tileY,
        facing: this.returnTo.facing ?? 'down',
      });
    });
  }
}


