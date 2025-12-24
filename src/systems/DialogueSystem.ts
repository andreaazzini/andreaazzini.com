import Phaser from 'phaser';
import { DialogueBox } from '../ui/DialogueBox';

export class DialogueSystem {
  private readonly scene: Phaser.Scene;
  private readonly box: DialogueBox;

  private isOpen = false;
  private fullText = '';
  private shownText = '';
  private typingEvent?: Phaser.Time.TimerEvent;

  private readonly charDelayMs = 18;

  constructor(scene: Phaser.Scene, box: DialogueBox) {
    this.scene = scene;
    this.box = box;
  }

  get open(): boolean {
    return this.isOpen;
  }

  start(text: string): void {
    this.stopTyping();
    this.isOpen = true;
    this.fullText = text;
    this.shownText = '';
    this.box.open();
    this.box.setDialogueText('');

    this.typingEvent = this.scene.time.addEvent({
      delay: this.charDelayMs,
      loop: true,
      callback: () => {
        if (this.shownText.length >= this.fullText.length) {
          this.stopTyping();
          return;
        }
        this.shownText = this.fullText.slice(0, this.shownText.length + 1);
        this.box.setDialogueText(this.shownText);
      },
    });
  }

  advance(): void {
    if (!this.isOpen) return;

    // If still typing, complete instantly.
    if (this.typingEvent) {
      this.stopTyping();
      this.shownText = this.fullText;
      this.box.setDialogueText(this.shownText);
      return;
    }

    // Otherwise close.
    this.isOpen = false;
    this.box.close();
  }

  private stopTyping(): void {
    if (!this.typingEvent) return;
    this.typingEvent.remove(false);
    this.typingEvent = undefined;
  }
}


