import { Direction, MoveIntentPayload } from '../types';
import { globalEventBus } from '../core/EventBus';

export class InputManager {
  private keyMap: Map<string, Direction> = new Map([
    ['KeyW', 'UP'],
    ['ArrowUp', 'UP'],
    ['KeyS', 'DOWN'],
    ['ArrowDown', 'DOWN'],
    ['KeyA', 'LEFT'],
    ['ArrowLeft', 'LEFT'],
    ['KeyD', 'RIGHT'],
    ['ArrowRight', 'RIGHT'],
  ]);

  private activeKeys: Set<string> = new Set();
  private enabled: boolean = true;
  private keyRepeatThrottle: Map<Direction, number> = new Map();
  private lastActiveDirection: Direction | null = null;

  constructor() {
    this.bindEvents();
  }

  private bindEvents(): void {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
  }

  public unbindEvents(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.enabled) return;

    // Ignore if user is typing in an input field
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement
    ) {
      return;
    }

    
    
    if (event.code === 'KeyM') {
      event.preventDefault();
      if (!this.activeKeys.has(event.code)) {
         this.activeKeys.add(event.code);
         globalEventBus.emit('input:toggle_map', {});
      }
      return;
    }

    if (event.code === 'Space' || event.code === 'Enter' || event.code === 'KeyE') {
      event.preventDefault();
      if (!this.activeKeys.has(event.code)) {
         this.activeKeys.add(event.code);
         globalEventBus.emit('input:interact', {});
      }
      return;
    }

    const direction = this.keyMap.get(event.code);
    if (direction) {
      event.preventDefault();

      // Only trigger if key wasn't already held down (or throttled for held keys)
      if (!this.activeKeys.has(event.code)) {
        this.activeKeys.add(event.code);
        this.lastActiveDirection = direction;
        this.emitMoveIntent(direction, 'keyboard');
      }
    }
  };

  private handleKeyUp = (event: KeyboardEvent): void => {
    this.activeKeys.delete(event.code);
    // Recalculate last active direction without allocating an array
    this.lastActiveDirection = null;
    for (const code of this.activeKeys) {
      const dir = this.keyMap.get(code);
      if (dir) {
        this.lastActiveDirection = dir;
        break; // use the first valid direction found
      }
    }
  };

  private handleBlur = (): void => {
    this.activeKeys.clear();
  };

  /**
   * Method that can also be called programmatically (e.g. by touch controls in Prompt 2)
   */
  public emitMoveIntent(direction: Direction, source: 'keyboard' | 'touch' | 'script' = 'keyboard'): void {
    if (!this.enabled) return;

    const payload: MoveIntentPayload = {
      direction,
      source,
    };
    globalEventBus.emit('input:move_intent', payload);
  }

  /**
   * Checks if held keys should emit continuous movement intents when step completes.
   */
  public update(_dt: number): void {
    if (!this.enabled || this.activeKeys.size === 0) return;

    // Use cached direction instead of Array.from(set).pop() which allocates
    const dir = this.lastActiveDirection;
    if (dir) {
      // We emit continuous intent check; PlayerEntity logic will consume it if ready
      const now = performance.now();
      const last = this.keyRepeatThrottle.get(dir) || 0;
      if (now - last > 180) { // Repeat threshold
        this.keyRepeatThrottle.set(dir, now);
        this.emitMoveIntent(dir, 'keyboard');
      }
    }
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.activeKeys.clear();
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }
}
