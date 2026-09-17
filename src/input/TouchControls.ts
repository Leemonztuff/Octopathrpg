import { Direction } from '../types';
import { globalEventBus } from '../core/EventBus';

export class TouchControls {
  private touchDetected: boolean = false;

  constructor() {
    this.detectTouchSupport();
  }

  private detectTouchSupport(): void {
    if (typeof window !== 'undefined') {
      this.touchDetected =
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        // @ts-ignore
        (navigator.msMaxTouchPoints && navigator.msMaxTouchPoints > 0);
    }
  }

  public isTouchDevice(): boolean {
    return this.touchDetected;
  }

  public emitTouchMove(direction: Direction): void {
    globalEventBus.emit('input:move_intent', {
      direction,
      source: 'touch',
    });
  }
}
