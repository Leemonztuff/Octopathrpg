import * as THREE from 'three';
import { CompositeAnimator, RigOffsetsConfig } from '../../animation/CompositeAnimator';
import { Direction } from '../../types';
import { CurvedWorldManager } from '../../renderer/CurvedWorldManager';

const ONE_VECTOR = new THREE.Vector3(1, 1, 1);

export class CompositeSpriteComponent {
  public readonly group: THREE.Group;
  public readonly animator: CompositeAnimator;
  private bodyMesh: THREE.Mesh;
  private headMesh: THREE.Mesh;
  private bodyMaterial: THREE.MeshStandardMaterial;
  private headMaterial: THREE.MeshStandardMaterial;
  private rigConfig: RigOffsetsConfig;

  // PIXELS_PER_UNIT: 32 pixels = 1 world unit
  private readonly PIXELS_PER_UNIT: number = 32;

  constructor(
    bodyTexture: THREE.CanvasTexture | THREE.Texture,
    headTexture: THREE.CanvasTexture | THREE.Texture,
    rigConfig: RigOffsetsConfig,
    width: number = 0.9,
    height: number = 1.35,
    directionMap?: { DOWN: number; UP: number; LEFT: number; RIGHT: number },
    entityType: string = 'player'
  ) {
    this.group = new THREE.Group();
    this.group.name = 'CompositeSpriteContainer';
    this.rigConfig = rigConfig;

    this.animator = new CompositeAnimator(bodyTexture, headTexture, rigConfig, 10, directionMap, entityType);

    // 1. Body Mesh (Reference layer z = 0)
    const bodyGeo = new THREE.PlaneGeometry(width, height);
    // Move the pivot slightly higher than the absolute bottom to account for blank space/shadows in the sprite.
    // This moves the "floor" a few pixels higher visually.
    bodyGeo.translate(0, height / 2 - 0.08, 0);
    bodyGeo.computeBoundingBox();

    this.bodyMaterial = new THREE.MeshStandardMaterial({
      map: this.animator.getBodyTexture(),
      transparent: true,
      alphaTest: 0.1,
      depthWrite: true,
      side: THREE.DoubleSide,
      roughness: 0.7,
    });
    CurvedWorldManager.getInstance().injectCurvedWorld(this.bodyMaterial);

    this.bodyMesh = new THREE.Mesh(bodyGeo, this.bodyMaterial);
    this.bodyMesh.castShadow = true;
    this.bodyMesh.receiveShadow = true;
    this.group.add(this.bodyMesh);

    // 2. Head Mesh (Layered on top with a tiny depth offset towards camera +Z in local space to prevent z-fighting)
    // Enforcing strict scale ratio as requested: head is 0.75x of the body width
    const headScaleRatio = 0.75;
    const headWidth = width * headScaleRatio;
    
    // To preserve the head texture's aspect ratio based on rigConfig sizes:
    const headAspectRatio = rigConfig.headFrameSize.h / rigConfig.headFrameSize.w;
    const headHeight = headWidth * headAspectRatio;
    
    const headGeo = new THREE.PlaneGeometry(headWidth, headHeight);
    headGeo.translate(0, headHeight / 2, 0);

    this.headMaterial = new THREE.MeshStandardMaterial({
      map: this.animator.getHeadTexture(),
      transparent: true,
      alphaTest: 0.1,
      depthWrite: true,
      side: THREE.DoubleSide,
      roughness: 0.7,
    });
    CurvedWorldManager.getInstance().injectCurvedWorld(this.headMaterial);

    this.headMesh = new THREE.Mesh(headGeo, this.headMaterial);
    this.headMesh.castShadow = true;
    this.headMesh.receiveShadow = true;

    // Initial position for head (placed above body torso according to rig offsets)
    this.updateHeadPosition();
    this.group.add(this.headMesh);
  }

  public updateHeadPosition(): void {
    const offset = this.animator.getCurrentHeadOffset();
    
    const bodyGeoHeight = this.bodyMesh.geometry.boundingBox?.max.y || 1.3;
    
    // In standard Argentum/2D RPG rips, the body frame often includes a base head.
    // Based on ASCII pixel analysis, the shoulders/neck line starts at approximately y=80 in the 327px frame.
    // We anchor it solidly on the shoulders to avoid the "floating/loose" (suelto) look.
    // Raised the multiplier slightly to elevate the head as requested.
    const neckWorldY = bodyGeoHeight * 0.79;
    
    // The offset in the rig is provided in pixel coordinates relative to the original sprite.
    // We normalize it by the sprite's original height to scale it to world units.
    const normalizedOffsetX = (offset.x / this.rigConfig.bodyFrameSize.w) * (bodyGeoHeight * (this.rigConfig.bodyFrameSize.w / this.rigConfig.bodyFrameSize.h));
    const normalizedOffsetY = -(offset.y / this.rigConfig.bodyFrameSize.h) * bodyGeoHeight;

    // Apply the world scale positioning
    this.headMesh.position.set(normalizedOffsetX, neckWorldY + normalizedOffsetY, 0.002);
  }

  public setRotationToCamera(cameraQuaternion: THREE.Quaternion): void {
    this.group.quaternion.copy(cameraQuaternion);
  }

  public setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  public setAnimationProgress(progress: number): void {
    this.animator.setAnimationProgress(progress);
    this.updateHeadPosition();
  }

  public update(dt: number): void {
    // If we use manual progress, we might not want the automatic update to override it.
    // However, if isPlaying is false, update(dt) does nothing.
    this.animator.update(dt);
    this.updateHeadPosition();
  }

  
  public setGhostMode(enabled: boolean): void {
    if (enabled) {
      this.bodyMaterial.transparent = true;
      this.bodyMaterial.opacity = 0.3;
      this.bodyMaterial.color = new THREE.Color(0x88ccff);
      this.headMaterial.transparent = true;
      this.headMaterial.opacity = 0.3;
      this.headMaterial.color = new THREE.Color(0x88ccff);
    } else {
      // Normal
      this.bodyMaterial.transparent = true;
      this.bodyMaterial.opacity = 1.0;
      this.bodyMaterial.color = new THREE.Color(0xffffff);
      this.headMaterial.transparent = true;
      this.headMaterial.opacity = 1.0;
      this.headMaterial.color = new THREE.Color(0xffffff);
    }
  }

  public setDirection(direction: Direction): void {
    this.animator.setDirection(direction);
    this.updateHeadPosition();
  }

  public setFrame(frame: number): void {
    this.animator.setFrame(frame);
    this.updateHeadPosition();
  }

  public startAnimation(): void {
    this.animator.startAnimation();
  }

  public stopAnimation(resetToIdleFrame: boolean = true): void {
    this.animator.stopAnimation(resetToIdleFrame);
    this.updateHeadPosition();
  }

  public setBodyTexture(texture: THREE.CanvasTexture | THREE.Texture): void {
    this.animator.setBodyTexture(texture);
    this.bodyMaterial.map = texture;
    this.bodyMaterial.needsUpdate = true;
  }

  public updateFSMState(
    state: string,
    stateTimer: number,
    direction: Direction,
    isFlashing: boolean,
    moveProgress: number = 0
  ): void {
    // 1. Set Direction
    this.setDirection(direction);

    // 2. Map state to animation logic
    switch (state) {
      case 'DEAD':
        this.stopAnimation(true);
        // Tilt meshes to represent a fallen/defeated pose
        this.bodyMesh.rotation.z = Math.PI / 2.5;
        this.headMesh.rotation.z = Math.PI / 2.5;
        break;
      case 'HITSTUN':
        this.stopAnimation(true);
        this.setFrame(0); // standard hit frame
        this.bodyMesh.rotation.z = 0;
        this.headMesh.rotation.z = 0;
        break;
      case 'ATTACK':
        // Attack duration is 0.4s. Cycle 4 frames
        const attackProgress = Math.min(1.0, stateTimer / 0.4);
        this.setAnimationProgress(attackProgress);
        this.bodyMesh.rotation.z = 0;
        this.headMesh.rotation.z = 0;
        break;
      case 'DODGE': {
        // Dodge displacement is eased (fast start); drive the sprite frames from
        // the actual displacement progress so the animation stays in sync.
        const dodgeProgress = moveProgress > 0 ? Math.min(1.0, moveProgress) : Math.min(1.0, stateTimer / 0.15);
        this.setAnimationProgress(dodgeProgress);
        this.bodyMesh.rotation.z = 0;
        this.headMesh.rotation.z = 0;
        break;
      }
      case 'MOVE':
        this.setAnimationProgress(moveProgress);
        this.bodyMesh.rotation.z = 0;
        this.headMesh.rotation.z = 0;
        break;
      case 'IDLE':
      default:
        this.stopAnimation(true);
        this.bodyMesh.rotation.z = 0;
        this.headMesh.rotation.z = 0;
        break;
    }

    // 3. Flashing visual feedback (Red flash)
    if (isFlashing || state === 'HITSTUN') {
      if (this.bodyMaterial.color.getHex() !== 0xef4444) {
        this.bodyMaterial.color.setHex(0xef4444);
        this.headMaterial.color.setHex(0xef4444);
      }
    } else {
      if (this.bodyMaterial.color.getHex() !== 0xffffff) {
        this.bodyMaterial.color.setHex(0xffffff);
        this.headMaterial.color.setHex(0xffffff);
      }
    }
  }

  private isSelected: boolean = false;
  private selectTime: number = 0;

  public setSelected(selected: boolean, dt: number): void {
    this.isSelected = selected;
    if (selected) {
      this.selectTime += dt * 6;
      const pulse = 1.05 + 0.05 * Math.sin(this.selectTime);
      this.group.scale.set(pulse, pulse, pulse);
      this.bodyMaterial.emissive.setHex(0x38bdf8); // Sky blue interactive glow
      this.bodyMaterial.emissiveIntensity = 0.3 + 0.2 * Math.sin(this.selectTime);
      this.headMaterial.emissive.setHex(0x38bdf8);
      this.headMaterial.emissiveIntensity = 0.3 + 0.2 * Math.sin(this.selectTime);
    } else {
      this.selectTime = 0;
      this.group.scale.lerp(ONE_VECTOR, 0.2);
      this.bodyMaterial.emissiveIntensity = THREE.MathUtils.lerp(this.bodyMaterial.emissiveIntensity, 0, 0.2);
      this.headMaterial.emissiveIntensity = THREE.MathUtils.lerp(this.headMaterial.emissiveIntensity, 0, 0.2);
    }
  }
}
