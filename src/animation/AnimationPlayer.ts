/**
 * AnimationPlayer: Spritesheet animation controller placeholder.
 * Will be populated with 4x4 walk loops in Prompt 2.
 */
export class AnimationPlayer {
  public currentFrame: number = 0;
  public totalFrames: number = 4;
  public frameTime: number = 0.15;
  private timer: number = 0;

  public update(dt: number): void {
    this.timer += dt;
    if (this.timer >= this.frameTime) {
      this.timer = 0;
      this.currentFrame = (this.currentFrame + 1) % this.totalFrames;
    }
  }
}
