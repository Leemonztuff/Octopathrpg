import * as THREE from 'three';
import { Direction } from '../types';
import { getAlignmentOffset } from '../core/utils/spriteUtils';

export interface RigOffsetEntry {
  x: number;
  y: number;
}

export interface RigOffsetsConfig {
  bodyFrameSize: { w: number; h: number };
  headFrameSize: { w: number; h: number };
  headOffsets: {
    down: RigOffsetEntry[];
    up: RigOffsetEntry[];
    left: RigOffsetEntry[];
    right: RigOffsetEntry[];
  };
}

export class CompositeAnimator {
  private bodyTexture: THREE.CanvasTexture | THREE.Texture;
  private headTexture: THREE.CanvasTexture | THREE.Texture;
  private rigConfig: RigOffsetsConfig;
  private entityType: string;

  private currentFrame: number = 0;
  private currentRow: number = 0; // 0: DOWN, 1: UP, 2: LEFT, 3: RIGHT
  private isPlaying: boolean = false;
  private frameTimer: number = 0;
  private frameTime: number = 0.12; // 120ms per frame
  private cols: number = 4;
  private rows: number = 4;

  private directionMap: { DOWN: number; UP: number; LEFT: number; RIGHT: number };

  constructor(
    bodyTex: THREE.CanvasTexture | THREE.Texture,
    headTex: THREE.CanvasTexture | THREE.Texture,
    rigConfig: RigOffsetsConfig,
    fps: number = 8,
    directionMap?: { DOWN: number; UP: number; LEFT: number; RIGHT: number },
    entityType: string = 'player'
  ) {
    this.bodyTexture = bodyTex;
    this.headTexture = headTex;
    this.rigConfig = rigConfig;
    this.frameTime = 1 / fps;
    this.directionMap = directionMap || { DOWN: 0, UP: 1, LEFT: 2, RIGHT: 3 };
    this.entityType = entityType;

    // Configure body texture repeat & filters
    this.bodyTexture.repeat.set(1 / this.cols, 1 / this.rows);
    this.bodyTexture.magFilter = THREE.NearestFilter;
    this.bodyTexture.minFilter = THREE.NearestFilter;
    if (this.bodyTexture.image) {
      this.bodyTexture.needsUpdate = true;
    }

    // Configure head texture repeat & filters
    this.headTexture.repeat.set(1 / this.cols, 1 / this.rows);
    this.headTexture.magFilter = THREE.NearestFilter;
    this.headTexture.minFilter = THREE.NearestFilter;
    if (this.headTexture.image) {
      this.headTexture.needsUpdate = true;
    }

    this.setDirection('DOWN');
    this.setFrame(0);
  }

  public setDirection(direction: Direction): void {
    this.currentRow = this.directionMap[direction];
    this.updateTextureOffsets();
  }

  public setFrame(frame: number): void {
    this.currentFrame = frame % this.cols;
    this.updateTextureOffsets();
  }

  public setAnimationProgress(progress: number): void {
    // Maps 0.0 - 1.0 to frame indices 0 to cols-1
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
      this.setFrame(0);
    }
  }

  public update(dt: number): void {
    if (!this.isPlaying) return;

    this.frameTimer += dt;
    if (this.frameTimer >= this.frameTime) {
      this.frameTimer %= this.frameTime;
      this.currentFrame = (this.currentFrame + 1) % this.cols;
      this.updateTextureOffsets();
    }
  }

  private updateTextureOffsets(): void {
    // 1. Body texture offset
    this.bodyTexture.offset.x = this.currentFrame / this.cols;
    this.bodyTexture.offset.y = (this.rows - 1 - this.currentRow) / this.rows;

    // 2. Head texture offset
    this.headTexture.offset.x = this.currentFrame / this.cols;
    this.headTexture.offset.y = (this.rows - 1 - this.currentRow) / this.rows;
  }

  public getBodyTexture(): THREE.Texture {
    return this.bodyTexture;
  }

  public getHeadTexture(): THREE.Texture {
    return this.headTexture;
  }

  public setBodyTexture(tex: THREE.CanvasTexture | THREE.Texture): void {
    this.bodyTexture = tex;
    this.bodyTexture.repeat.set(1 / this.cols, 1 / this.rows);
    this.bodyTexture.magFilter = THREE.NearestFilter;
    this.bodyTexture.minFilter = THREE.NearestFilter;
    this.bodyTexture.needsUpdate = true;
    this.updateTextureOffsets();
  }

  public getCurrentDirectionKey(): 'down' | 'up' | 'left' | 'right' {
    switch (this.currentRow) {
      case 0: return 'down';
      case 1: return 'up';
      case 2: return 'left';
      case 3: return 'right';
      default: return 'down';
    }
  }

  public getCurrentHeadOffset(): RigOffsetEntry {
    return getAlignmentOffset(this.entityType, this.currentFrame);
  }
}
