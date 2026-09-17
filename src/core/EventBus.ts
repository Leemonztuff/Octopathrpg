/**
 * Type-safe EventBus for system decoupling.
 * Allows InputManager, Entities, World, and Camera to communicate cleanly.
 */

type Handler<T> = (data: T) => void;

export class EventBus<Events extends Record<string, any>> {
  private listeners: Map<keyof Events, Set<Handler<any>>> = new Map();

  on<K extends keyof Events>(event: K, handler: Handler<Events[K]>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);

    // Return unbind function
    return () => {
      this.off(event, handler);
    };
  }

  off<K extends keyof Events>(event: K, handler: Handler<Events[K]>): void {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(handler);
    }
  }

  emit<K extends keyof Events>(event: K, data: Events[K]): void {
    const set = this.listeners.get(event);
    if (set) {
      set.forEach((handler) => {
        try {
          handler(data);
        } catch (err) {
          console.error(`Error in event listener for "${String(event)}":`, err);
        }
      });
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}

// Global instance export
import { EngineEvents } from '../types';
export const globalEventBus = new EventBus<EngineEvents>();
