import { Direction, GridPos } from '../../types';
import { globalEventBus } from '../../core/EventBus';

export type CharacterState = 'IDLE' | 'MOVE' | 'ATTACK' | 'DODGE' | 'HITSTUN' | 'DEAD';

export interface StateConfig {
  duration: number;
  cancelWindow?: { from: number; to: number };
  displacement?: { dx: number; dz: number }; // relative to facing direction (e.g. dx: 0, dz: 1 means 1 tile forward)
}

export const STATE_CONFIGS: Record<CharacterState, StateConfig> = {
  IDLE: { duration: 0 },
  MOVE: { duration: 0 },
  ATTACK: { 
    duration: 0.4, 
    cancelWindow: { from: 0.15, to: 0.4 } 
  },
  DODGE: { 
    duration: 0.15, 
    displacement: { dx: 0, dz: 1 } // 1 cell forward
  },
  HITSTUN: { duration: 0.35 },
  DEAD: { duration: 0 },
};

export class CharacterStateMachine {
  private currentState: CharacterState = 'IDLE';
  private stateTimer: number = 0;
  private bufferedIntent: { type: 'ATTACK' | 'DODGE'; timestamp: number } | null = null;
  private onStateChangeCallbacks: Array<(state: CharacterState) => void> = [];

  // Scripted displacement tracking
  private scriptedMove: {
    startGrid: GridPos;
    targetGrid: GridPos;
    startWorld: { x: number; y: number; z: number };
    targetWorld: { x: number; y: number; z: number };
    duration: number;
    progress: number;
  } | null = null;

  constructor() {}

  public get currentStateName(): CharacterState {
    return this.currentState;
  }

  public get timer(): number {
    return this.stateTimer;
  }

  public registerOnStateChange(cb: (state: CharacterState) => void): void {
    this.onStateChangeCallbacks.push(cb);
  }

  /**
   * Safe check for transition rules
   */
  public canTransitionTo(target: CharacterState): boolean {
    if (this.currentState === 'DEAD') return false; // terminal state
    if (target === 'DEAD') return true; // anyone can die
    if (target === 'HITSTUN') return true; // any living state can get stunned

    // If currently in HitStun, cannot change until duration finishes
    if (this.currentState === 'HITSTUN') {
      return this.stateTimer >= STATE_CONFIGS.HITSTUN.duration;
    }

    // From IDLE or MOVE, any state is accessible
    if (this.currentState === 'IDLE' || this.currentState === 'MOVE') {
      return true;
    }

    // Cancellation window checks for ATTACK
    if (this.currentState === 'ATTACK') {
      const config = STATE_CONFIGS.ATTACK;
      if (config.cancelWindow) {
        const canCancel = this.stateTimer >= config.cancelWindow.from && this.stateTimer <= config.cancelWindow.to;
        if (canCancel && (target === 'DODGE' || target === 'ATTACK')) {
          return true;
        }
      }
      return this.stateTimer >= config.duration;
    }

    // DODGE cannot be canceled, must run to completion
    if (this.currentState === 'DODGE') {
      return this.stateTimer >= STATE_CONFIGS.DODGE.duration;
    }

    return false;
  }

  /**
   * Request transition. Returns true if transition succeeded.
   */
  public transitionTo(target: CharacterState): boolean {
    if (!this.canTransitionTo(target)) {
      return false;
    }

    const previousState = this.currentState;
    this.currentState = target;
    this.stateTimer = 0;

    // Clear scripted move if we transition out of its state
    if (previousState === 'DODGE' && target !== 'DODGE') {
      this.scriptedMove = null;
    }

    // Invoke state change callbacks
    for (const cb of this.onStateChangeCallbacks) {
      cb(target);
    }

    return true;
  }

  /**
   * Buffers an intent to execute it as soon as the state allows it
   */
  public bufferIntent(type: 'ATTACK' | 'DODGE'): void {
    this.bufferedIntent = {
      type,
      timestamp: performance.now(),
    };
  }

  /**
   * Clear buffer
   */
  public clearBuffer(): void {
    this.bufferedIntent = null;
  }

  /**
   * Get active buffered intent if it is still valid (within 150ms)
   */
  public getValidBufferedIntent(maxAgeMs: number = 150): 'ATTACK' | 'DODGE' | null {
    if (!this.bufferedIntent) return null;
    const age = performance.now() - this.bufferedIntent.timestamp;
    if (age <= maxAgeMs) {
      return this.bufferedIntent.type;
    }
    this.bufferedIntent = null; // Stale, clear it
    return null;
  }

  /**
   * Scripted movement helpers
   */
  public startScriptedMove(
    startGrid: GridPos,
    targetGrid: GridPos,
    startWorld: { x: number; y: number; z: number },
    targetWorld: { x: number; y: number; z: number },
    duration: number
  ): void {
    this.scriptedMove = {
      startGrid,
      targetGrid,
      startWorld,
      targetWorld,
      duration,
      progress: 0,
    };
  }

  public get activeScriptedMove() {
    return this.scriptedMove;
  }

  /**
   * Main update loop for timers and automatic transitions
   */
  public update(dt: number, onStateComplete?: (completedState: CharacterState) => void): void {
    this.stateTimer += dt;

    // Handle scripted move progress
    if (this.scriptedMove) {
      this.scriptedMove.progress += dt / this.scriptedMove.duration;
      if (this.scriptedMove.progress >= 1.0) {
        this.scriptedMove.progress = 1.0;
      }
    }

    // Auto-transition when timed states expire
    const config = STATE_CONFIGS[this.currentState];
    if (config.duration > 0 && this.stateTimer >= config.duration) {
      const expiredState = this.currentState;
      
      // Auto-transition back to IDLE
      this.transitionTo('IDLE');

      if (onStateComplete) {
        onStateComplete(expiredState);
      }
    }
  }
}
