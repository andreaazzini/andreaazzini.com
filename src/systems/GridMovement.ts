import Phaser from 'phaser';

export type Facing = 'up' | 'down' | 'left' | 'right';

export type IsBlocked = (tileX: number, tileY: number) => boolean;

export type OnStep = (fromTileX: number, fromTileY: number, toTileX: number, toTileY: number, facing: Facing) => void;
export type OnArrive = (tileX: number, tileY: number, facing: Facing) => void;

type Dir = { facing: Facing; dx: number; dy: number };

const DIRS: Record<Facing, Dir> = {
  up: { facing: 'up', dx: 0, dy: -1 },
  down: { facing: 'down', dx: 0, dy: 1 },
  left: { facing: 'left', dx: -1, dy: 0 },
  right: { facing: 'right', dx: 1, dy: 0 },
};

export type GridMovementOptions = {
  tileSize: number;
  pixelOffsetX?: number;
  pixelOffsetY?: number;
  stepDurationMs: number;
  isBlocked: IsBlocked;
  onStep?: OnStep;
  onArrive?: OnArrive;
};

export class GridMovement {
  readonly tileSize: number;

  private readonly scene: Phaser.Scene;
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly isBlocked: IsBlocked;
  private readonly stepDurationMs: number;
  private readonly onStep?: OnStep;
  private readonly onArrive?: OnArrive;
  private readonly pixelOffsetX: number;
  private readonly pixelOffsetY: number;

  private moving = false;
  private holdRepeatMs = 150;
  private holdElapsedMs = 0;

  facing: Facing = 'down';

  get isMoving(): boolean {
    return this.moving;
  }

  constructor(
    scene: Phaser.Scene,
    sprite: Phaser.GameObjects.Sprite,
    opts: GridMovementOptions,
  ) {
    this.scene = scene;
    this.sprite = sprite;
    this.tileSize = opts.tileSize;
    this.stepDurationMs = opts.stepDurationMs;
    this.isBlocked = opts.isBlocked;
    this.onStep = opts.onStep;
    this.onArrive = opts.onArrive;
    this.pixelOffsetX = opts.pixelOffsetX ?? 0;
    this.pixelOffsetY = opts.pixelOffsetY ?? 0;
  }

  get tileX(): number {
    return Math.round((this.sprite.x - this.pixelOffsetX) / this.tileSize);
  }

  get tileY(): number {
    return Math.round((this.sprite.y - this.pixelOffsetY) / this.tileSize);
  }

  setTilePosition(tileX: number, tileY: number): void {
    this.sprite.setPosition(
      tileX * this.tileSize + this.pixelOffsetX,
      tileY * this.tileSize + this.pixelOffsetY,
    );
  }

  update(deltaMs: number, desired: Facing | null): void {
    if (this.moving) return;
    if (!desired) {
      this.holdElapsedMs = 0;
      return;
    }

    // Pokémon-ish feel: first move is immediate; held movement repeats on a short cadence.
    this.holdElapsedMs += deltaMs;
    const canRepeat = this.holdElapsedMs === deltaMs || this.holdElapsedMs >= this.holdRepeatMs;
    if (!canRepeat) return;

    this.holdElapsedMs = 0;
    this.tryStep(desired);
  }

  tryStep(facing: Facing): boolean {
    if (this.moving) return false;
    this.facing = facing;
    const dir = DIRS[facing];

    const fromX = this.tileX;
    const fromY = this.tileY;
    const toX = fromX + dir.dx;
    const toY = fromY + dir.dy;

    if (this.isBlocked(toX, toY)) return false;

    this.moving = true;
    this.onStep?.(fromX, fromY, toX, toY, facing);

    this.scene.tweens.add({
      targets: this.sprite,
      x: toX * this.tileSize + this.pixelOffsetX,
      y: toY * this.tileSize + this.pixelOffsetY,
      duration: this.stepDurationMs,
      ease: 'Linear',
      onComplete: () => {
        this.moving = false;
        this.onArrive?.(toX, toY, facing);
      },
    });
    return true;
  }
}


