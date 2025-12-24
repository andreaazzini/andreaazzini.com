import { GridMovement } from './GridMovement';
import { DialogueSystem } from './DialogueSystem';
import { AudioSystem } from './AudioSystem';

export type NpcEntity = {
  id: string;
  tileX: number;
  tileY: number;
  faceToward: (tileX: number, tileY: number) => void;
  talk: () => string;
};

export type SignEntity = {
  tileX: number;
  tileY: number;
  text: string;
};

export class InteractionSystem {
  private readonly movement: GridMovement;
  private readonly dialogue: DialogueSystem;
  private readonly npcsByTile = new Map<string, NpcEntity>();
  private readonly signsByTile = new Map<string, SignEntity>();

  constructor(_scene: unknown, movement: GridMovement, dialogue: DialogueSystem) {
    this.movement = movement;
    this.dialogue = dialogue;
  }

  registerNpc(npc: NpcEntity): void {
    this.npcsByTile.set(this.key(npc.tileX, npc.tileY), npc);
  }

  rebuildIndex(npcs: NpcEntity[]): void {
    this.npcsByTile.clear();
    for (const npc of npcs) this.registerNpc(npc);
  }

  moveNpc(npc: NpcEntity, fromTileX: number, fromTileY: number, toTileX: number, toTileY: number): void {
    this.npcsByTile.delete(this.key(fromTileX, fromTileY));
    this.npcsByTile.set(this.key(toTileX, toTileY), npc);
  }

  registerSign(sign: SignEntity): void {
    this.signsByTile.set(this.key(sign.tileX, sign.tileY), sign);
  }

  rebuildSigns(signs: SignEntity[]): void {
    this.signsByTile.clear();
    for (const s of signs) this.registerSign(s);
  }

  handleInteract(): void {
    if (this.dialogue.open) {
      AudioSystem.playSfx('blip');
      this.dialogue.advance();
      return;
    }

    const { tileX, tileY } = this.getFrontTile();
    const sign = this.signsByTile.get(this.key(tileX, tileY));
    if (sign) {
      AudioSystem.playSfx('blip');
      this.dialogue.start(sign.text);
      return;
    }

    const npc = this.npcsByTile.get(this.key(tileX, tileY));
    if (!npc) return;

    npc.faceToward(this.movement.tileX, this.movement.tileY);
    AudioSystem.playSfx('blip');
    this.dialogue.start(npc.talk());
  }

  private getFrontTile(): { tileX: number; tileY: number } {
    const x = this.movement.tileX;
    const y = this.movement.tileY;
    switch (this.movement.facing) {
      case 'up':
        return { tileX: x, tileY: y - 1 };
      case 'down':
        return { tileX: x, tileY: y + 1 };
      case 'left':
        return { tileX: x - 1, tileY: y };
      case 'right':
        return { tileX: x + 1, tileY: y };
    }
  }

  private key(tileX: number, tileY: number): string {
    return `${tileX},${tileY}`;
  }
}


