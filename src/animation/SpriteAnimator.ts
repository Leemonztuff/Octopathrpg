import * as THREE from 'three';
import { Direction } from '../types';

export interface SpritesheetConfig {
  rows: number; // e.g. 4 directions
  cols: number; // e.g. 4 walk loop frames
  fps: number; // Frame playback speed
  directionMap?: { [key in Direction]: number };
}

export class SpriteAnimator {
  private texture: THREE.CanvasTexture | THREE.Texture;
  private rows: number;
  private cols: number;
  private currentFrame: number = 0;
  private currentRow: number = 0;
  private isPlaying: boolean = false;
  private frameTimer: number = 0;
  private frameTime: number = 0.12;
  private directionMap: { [key in Direction]: number };

  constructor(texture: THREE.CanvasTexture | THREE.Texture, config: SpritesheetConfig = { rows: 4, cols: 4, fps: 8 }) {
    this.texture = texture;
    this.rows = config.rows;
    this.cols = config.cols;
    this.frameTime = 1 / config.fps;
    
    // Default mapping if not provided
    this.directionMap = config.directionMap || {
      DOWN: 0,
      UP: 1,
      LEFT: 2,
      RIGHT: 3,
    };

    // Set texture repeat for grid cell
    this.texture.repeat.set(1 / this.cols, 1 / this.rows);
    this.texture.magFilter = THREE.NearestFilter;
    this.texture.minFilter = THREE.NearestFilter;
    if (this.texture.image) {
      this.texture.needsUpdate = true;
    }

    this.setDirection('DOWN');
    this.setFrame(0);
  }

  public setDirection(direction: Direction): void {
    this.currentRow = this.directionMap[direction] ?? 0;
    this.updateTextureOffset();
  }

  public setFrame(frame: number): void {
    this.currentFrame = frame % this.cols;
    this.updateTextureOffset();
  }

  public setAnimationProgress(progress: number): void {
    let frame = Math.floor(progress * this.cols);
    if (frame >= this.cols) frame = this.cols - 1;
    this.setFrame(frame);
  }

  public startAnimation(): void {
    this.isPlaying = true;
    this.frameTimer = 0;
  }

  public stopAnimation(resetToIdleFrame: boolean = true): void {
    this.isPlaying = false;
    if (resetToIdleFrame) {
      this.setFrame(0); // Frame 0 is idle stance
    }
  }

  public update(dt: number): void {
    if (!this.isPlaying) return;

    this.frameTimer += dt;
    if (this.frameTimer >= this.frameTime) {
      this.frameTimer %= this.frameTime;
      this.currentFrame = (this.currentFrame + 1) % this.cols;
      this.updateTextureOffset();
    }
  }

  private updateTextureOffset(): void {
    // X offset increases with columns (left to right)
    this.texture.offset.x = this.currentFrame / this.cols;
    // Y offset in Three.js starts from bottom (0 = bottom row, 1 = top row)
    // Row 0 (DOWN) is top row -> offset.y = (4 - 1 - 0) / 4 = 3/4 = 0.75
    this.texture.offset.y = (this.rows - 1 - this.currentRow) / this.rows;
  }

  public getTexture(): THREE.Texture {
    return this.texture;
  }

  public setTexture(tex: THREE.Texture): void {
    this.texture = tex;
    this.texture.repeat.set(1 / this.cols, 1 / this.rows);
    this.texture.magFilter = THREE.NearestFilter;
    this.texture.minFilter = THREE.NearestFilter;
    this.texture.needsUpdate = true;
    this.updateTextureOffset();
  }
}
