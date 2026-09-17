/**
 * GameClock tracks delta time and elapsed time, with pause support.
 */
export class GameClock {
  private startTime: number = 0;
  private lastTime: number = 0;
  private deltaTime: number = 0;
  private elapsedTime: number = 0;
  private isPaused: boolean = false;
  private maxDeltaTime: number = 0.1; // Cap delta time to prevent spiral of death

  start(): void {
    const now = performance.now() / 1000;
    this.startTime = now;
    this.lastTime = now;
    this.elapsedTime = 0;
    this.isPaused = false;
  }

  update(): number {
    if (this.isPaused) {
      this.deltaTime = 0;
      return 0;
    }

    const now = performance.now() / 1000;
    const rawDelta = now - this.lastTime;
    this.lastTime = now;

    // Cap frame time (e.g. tab switches)
    this.deltaTime = Math.min(rawDelta, this.maxDeltaTime);
    this.elapsedTime += this.deltaTime;

    return this.deltaTime;
  }

  getDelta(): number {
    return this.deltaTime;
  }

  getElapsed(): number {
    return this.elapsedTime;
  }

  setPaused(paused: boolean): void {
    this.isPaused = paused;
    if (!paused) {
      this.lastTime = performance.now() / 1000;
    }
  }
}
