import * as THREE from 'three';
import { WorldPos, Direction } from '../types';

export interface OctopathCameraConfig {
  fov: number;
  pitchDegrees: number; // Pitch angle from vertical Y axis (50 - 60)
  distance: number; // Distance from focus target
  lerpSpeed: number; // Lerp smoothing factor (e.g. 6.0)
  mapWidth: number; // For boundary clamping
  mapDepth: number; // For boundary clamping
  lookAheadStrength?: number; // World units the focus leads movement direction
  lookAheadLerpSpeed?: number; // Smoothing speed for look-ahead follow
  shakeMaxOffset?: number; // Peak world-unit displacement at full trauma (1.0)
  shakeDecay?: number; // Trauma decay per second
  shakeFrequency?: number; // Oscillation speed for shake noise
}

export type CameraMode = 'local' | 'overworld';

export class OctopathCamera {
  public readonly camera: THREE.PerspectiveCamera;
  private currentFocus: THREE.Vector3 = new THREE.Vector3(8, 1, 8);
  private targetFocus: THREE.Vector3 = new THREE.Vector3(8, 1, 8);
  private config: OctopathCameraConfig;
  private offset: THREE.Vector3 = new THREE.Vector3();
  
  private mode: CameraMode = 'local';
  private targetDistance: number = 18;
  private currentDistance: number = 18;
  private targetPitchDegrees: number = 55;
  private currentPitchDegrees: number = 55;
  private targetFOV: number = 45;
  private currentFOV: number = 45;

  // Look-ahead framing
  private lookAheadStrength: number;
  private lookAheadLerpSpeed: number;
  private lookAheadDesired: THREE.Vector3 = new THREE.Vector3();
  private lookAheadCurrent: THREE.Vector3 = new THREE.Vector3();

  // Screen-shake (trauma model: intensity squared -> displacement, non-linear decay)
  private shakeTrauma: number = 0;
  private shakeTime: number = 0;
  private shakeMaxOffset: number;
  private shakeDecay: number;
  private shakeFrequency: number;
  private shakeOffset: THREE.Vector3 = new THREE.Vector3();

  // Scratch buffer to avoid allocations in the per-frame update
  private effectiveFocus: THREE.Vector3 = new THREE.Vector3();
  private lastProjectionFOV: number = 0;

  constructor(aspectRatio: number, config?: Partial<OctopathCameraConfig>) {
    this.config = {
      fov: 45,
      pitchDegrees: 55,
      distance: 18,
      lerpSpeed: 6.0,
      mapWidth: 256,
      mapDepth: 256,
      ...config,
    };

    this.lookAheadStrength = this.config.lookAheadStrength ?? 1.4;
    this.lookAheadLerpSpeed = this.config.lookAheadLerpSpeed ?? 4.5;
    this.shakeMaxOffset = this.config.shakeMaxOffset ?? 1.8;
    this.shakeDecay = this.config.shakeDecay ?? 2.2;
    this.shakeFrequency = this.config.shakeFrequency ?? 34;

    this.currentDistance = this.config.distance;
    this.targetDistance = this.config.distance;
    this.currentPitchDegrees = this.config.pitchDegrees;
    this.targetPitchDegrees = this.config.pitchDegrees;
    this.currentFOV = this.config.fov;
    this.targetFOV = this.config.fov;
    this.lastProjectionFOV = this.config.fov;

    this.camera = new THREE.PerspectiveCamera(
      this.config.fov,
      aspectRatio,
      0.1,
      1000
    );

    this.updateOffsetVector();
    this.snapToTarget(this.targetFocus);
  }

  /**
   * Calculates fixed offset vector relative to target based on pitch degrees and distance.
   */
  public updateOffsetVector(): void {
    const rad = THREE.MathUtils.degToRad(this.currentPitchDegrees);
    // Y height = distance * cos(pitch)
    // Z offset = distance * sin(pitch)
    const yOffset = this.currentDistance * Math.cos(rad);
    const zOffset = this.currentDistance * Math.sin(rad);

    this.offset.set(0, yOffset, zOffset);
  }

  public setMode(mode: CameraMode, bounds?: { width: number; depth: number }): void {
    this.mode = mode;
    if (mode === 'overworld') {
      this.targetDistance = 28;
      this.targetPitchDegrees = 56;
      this.targetFOV = 48;
      this.config.lerpSpeed = 5.0;
      if (bounds) {
        this.setBounds(bounds.width, bounds.depth);
      } else {
        this.setBounds(64, 64);
      }
    } else {
      this.targetDistance = 18;
      this.targetPitchDegrees = 55;
      this.targetFOV = 45;
      this.config.lerpSpeed = 6.0;
      if (bounds) {
        this.setBounds(bounds.width, bounds.depth);
      } else {
        this.setBounds(256, 256);
      }
    }
  }

  public getMode(): CameraMode {
    return this.mode;
  }

  public setTarget(pos: WorldPos | THREE.Vector3): void {
    this.targetFocus.set(pos.x, pos.y, pos.z);
    this.clampTarget(this.targetFocus);
  }

  /**
   * Defines the desired look-ahead lead. While `active`, the camera focus drifts
   * up to `lookAheadStrength` world-units in the given movement direction and
   * smoothly decays back to the player once they stop.
   */
  public setLookAhead(direction: Direction, active: boolean): void {
    this.lookAheadDesired.set(0, 0, 0);
    if (!active) return;

    switch (direction) {
      case 'UP':
        this.lookAheadDesired.z = -1;
        break;
      case 'DOWN':
        this.lookAheadDesired.z = 1;
        break;
      case 'LEFT':
        this.lookAheadDesired.x = -1;
        break;
      case 'RIGHT':
        this.lookAheadDesired.x = 1;
        break;
    }
    this.lookAheadDesired.multiplyScalar(this.lookAheadStrength);
  }

  /**
   * Adds screen-shake trauma (0..1). Displacement scales with trauma^2 so the
   * shake starts sharp and settles naturally. Call this on impactful events.
   */
  public addShake(intensity: number): void {
    this.shakeTrauma = Math.min(1.0, this.shakeTrauma + Math.max(0, intensity));
  }

  public snapToTarget(pos: WorldPos | THREE.Vector3): void {
    this.setTarget(pos);
    this.currentFocus.copy(this.targetFocus);
    this.currentDistance = this.targetDistance;
    this.currentPitchDegrees = this.targetPitchDegrees;
    this.currentFOV = this.targetFOV;
    this.lookAheadDesired.set(0, 0, 0);
    this.lookAheadCurrent.set(0, 0, 0);
    this.shakeTrauma = 0;
    this.shakeOffset.set(0, 0, 0);
    this.updateOffsetVector();
    this.updateCameraPosition();
  }

  private clampTarget(target: THREE.Vector3): void {
    const margin = Math.min(2.0, this.config.mapWidth * 0.05);
    target.x = THREE.MathUtils.clamp(target.x, margin, Math.max(margin, this.config.mapWidth - margin));
    target.z = THREE.MathUtils.clamp(target.z, margin, Math.max(margin, this.config.mapDepth - margin));
  }

  public setBounds(width: number, depth: number): void {
    this.config.mapWidth = Math.max(16, width);
    this.config.mapDepth = Math.max(16, depth);
    this.clampTarget(this.targetFocus);
  }

  public adjustZoom(delta: number): void {
    const minZoom = this.mode === 'overworld' ? 18 : 12;
    const maxZoom = this.mode === 'overworld' ? 42 : 28;
    this.targetDistance = THREE.MathUtils.clamp(this.targetDistance + delta, minZoom, maxZoom);
  }

  public update(dt: number): void {
    // Lerp currentFocus towards targetFocus cleanly
    const t = Math.min(1.0, dt * this.config.lerpSpeed);
    this.currentFocus.lerp(this.targetFocus, t);

    // Look-ahead: smoothly lead focus toward the movement direction
    const laT = Math.min(1.0, dt * this.lookAheadLerpSpeed);
    this.lookAheadCurrent.x = THREE.MathUtils.lerp(this.lookAheadCurrent.x, this.lookAheadDesired.x, laT);
    this.lookAheadCurrent.y = THREE.MathUtils.lerp(this.lookAheadCurrent.y, this.lookAheadDesired.y, laT);
    this.lookAheadCurrent.z = THREE.MathUtils.lerp(this.lookAheadCurrent.z, this.lookAheadDesired.z, laT);

    // Screen-shake: decay trauma and synthesize smooth (alloc-free) noise offsets.
    this.shakeTime += dt;
    if (this.shakeTrauma > 0.001) {
      this.shakeTrauma = Math.max(0, this.shakeTrauma - dt * this.shakeDecay);
    }
    const mag = this.shakeTrauma * this.shakeTrauma * this.shakeMaxOffset;
    const s = this.shakeTime * this.shakeFrequency;
    this.shakeOffset.set(
      (Math.sin(s) + Math.sin(s * 0.73 + 2.4) * 0.6) * 0.5 * mag,
      (Math.cos(s * 0.61 + 1.1) + Math.sin(s * 1.19 + 0.7)) * 0.35 * mag,
      (Math.cos(s * 0.83 + 0.6) + Math.sin(s * 0.47 + 3.3) * 0.6) * 0.5 * mag
    );

    // Smoothly interpolate zoom distance, pitch degrees, and FOV
    let needsOffsetUpdate = false;
    if (Math.abs(this.currentDistance - this.targetDistance) > 0.01) {
      this.currentDistance = THREE.MathUtils.lerp(this.currentDistance, this.targetDistance, Math.min(1.0, dt * 5.0));
      this.config.distance = this.currentDistance;
      needsOffsetUpdate = true;
    }
    if (Math.abs(this.currentPitchDegrees - this.targetPitchDegrees) > 0.01) {
      this.currentPitchDegrees = THREE.MathUtils.lerp(this.currentPitchDegrees, this.targetPitchDegrees, Math.min(1.0, dt * 5.0));
      this.config.pitchDegrees = this.currentPitchDegrees;
      needsOffsetUpdate = true;
    }
    if (needsOffsetUpdate) {
      this.updateOffsetVector();
    }

    if (Math.abs(this.currentFOV - this.targetFOV) > 0.05) {
      this.currentFOV = THREE.MathUtils.lerp(this.currentFOV, this.targetFOV, Math.min(1.0, dt * 5.0));
      this.config.fov = this.currentFOV;
      this.camera.fov = this.currentFOV;
      // Only rebuild projection matrix when FOV actually changed enough to notice
      if (Math.abs(this.currentFOV - this.lastProjectionFOV) > 0.1) {
        this.camera.updateProjectionMatrix();
        this.lastProjectionFOV = this.currentFOV;
      }
    }

    this.updateCameraPosition();
  }

  private updateCameraPosition(): void {
    // Focus = smoothed player follow + look-ahead lead (clamped to map bounds).
    this.effectiveFocus.copy(this.currentFocus).add(this.lookAheadCurrent);
    this.clampTarget(this.effectiveFocus);

    // Position offsets the effective focus; shake displaces the viewport subtly.
    this.camera.position.copy(this.effectiveFocus).add(this.offset).add(this.shakeOffset);
    this.camera.lookAt(this.effectiveFocus);
  }

  public handleResize(aspectRatio: number): void {
    this.camera.aspect = aspectRatio;
    this.camera.updateProjectionMatrix();
  }

  // Configuration getters & setters for lil-gui debug
  public setPitchDegrees(deg: number): void {
    this.targetPitchDegrees = deg;
    this.currentPitchDegrees = deg;
    this.config.pitchDegrees = deg;
    this.updateOffsetVector();
    this.updateCameraPosition();
  }

  public getPitchDegrees(): number {
    return this.currentPitchDegrees;
  }

  public setDistance(dist: number): void {
    this.targetDistance = dist;
    this.currentDistance = dist;
    this.config.distance = dist;
    this.updateOffsetVector();
    this.updateCameraPosition();
  }

  public getDistance(): number {
    return this.currentDistance;
  }

  public setLerpSpeed(speed: number): void {
    this.config.lerpSpeed = speed;
  }

  public getLerpSpeed(): number {
    return this.config.lerpSpeed;
  }

  public setFOV(fov: number): void {
    this.targetFOV = fov;
    this.currentFOV = fov;
    this.config.fov = fov;
    this.camera.fov = fov;
    this.camera.updateProjectionMatrix();
  }

  public getFOV(): number {
    return this.currentFOV;
  }

  public getCurrentFocus(): THREE.Vector3 {
    return this.currentFocus;
  }
}
