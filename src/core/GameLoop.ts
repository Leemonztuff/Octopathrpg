import { GameClock } from './GameClock';

export interface UpdatableSystem {
  name: string;
  update(dt: number): void;
}

export class GameLoop {
  private clock: GameClock;
  private systems: UpdatableSystem[] = [];
  private renderCallback?: () => void;
  private requestId: number | null = null;
  private isRunning: boolean = false;
  private fps: number = 60;
  private frameCount: number = 0;
  private fpsTimer: number = 0;

  // Fixed timestep accumulator: decouple logic rate from render rate
  // Logic updates at a fixed 60Hz to prevent physics/animation jitter.
  // Rendering happens every RAF frame with interpolated visuals.
  private static readonly FIXED_DT = 1 / 60;
  private accumulator: number = 0;

  constructor() {
    this.clock = new GameClock();
  }

  registerSystem(system: UpdatableSystem): void {
    this.systems.push(system);
  }

  setRenderCallback(callback: () => void): void {
    this.renderCallback = callback;
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.clock.start();
    this.tick();
  }

  stop(): void {
    if (this.requestId !== null) {
      cancelAnimationFrame(this.requestId);
      this.requestId = null;
    }
    this.isRunning = false;
  }

  private tick = (): void => {
    if (!this.isRunning) return;

    const rawDt = this.clock.update();

    // FPS calculation
    this.frameCount++;
    this.fpsTimer += rawDt;
    if (this.fpsTimer >= 1.0) {
      this.fps = Math.round(this.frameCount / this.fpsTimer);
      this.frameCount = 0;
      this.fpsTimer = 0;
    }

    // Fixed timestep accumulator: run logic at consistent 60Hz
    this.accumulator += rawDt;
    const fixedDt = GameLoop.FIXED_DT;
    while (this.accumulator >= fixedDt) {
      for (const system of this.systems) {
        try {
          system.update(fixedDt);
        } catch (err) {
          console.error(`Error updating system ${system.name}:`, err);
        }
      }
      this.accumulator -= fixedDt;
    }

    // Render phase (every frame, uncapped)
    if (this.renderCallback) {
      this.renderCallback();
    }

    this.requestId = requestAnimationFrame(this.tick);
  };

  getFPS(): number {
    return this.fps;
  }

  getClock(): GameClock {
    return this.clock;
  }
}
