import * as THREE from 'three';
import { SpriteAnimator } from '../../animation/SpriteAnimator';
import { Direction } from '../../types';
import { CurvedWorldManager } from '../../renderer/CurvedWorldManager';

export interface SpriteComponentConfig {
  width?: number;
  height?: number;
  headTexture?: THREE.Texture | THREE.CanvasTexture;
  headScale?: number;
  headOffsetY?: number;
  directionMap?: { DOWN: number; UP: number; LEFT: number; RIGHT: number; };
}

export class SpriteComponent {
  public readonly mesh: THREE.Mesh;
  public readonly group: THREE.Group;
  public readonly animator: SpriteAnimator;
  public readonly headAnimator?: SpriteAnimator;
  private material: THREE.MeshStandardMaterial;
  private headMaterial?: THREE.MeshStandardMaterial;

  constructor(texture: THREE.CanvasTexture | THREE.Texture, config: SpriteComponentConfig = {}) {
    this.group = new THREE.Group();
    this.group.name = 'SpriteContainer';

    const width = config.width ?? 0.9;
    const height = config.height ?? 1.35;
    const headTexture = config.headTexture;
    const headScale = config.headScale ?? 0.45;
    const headOffsetY = config.headOffsetY ?? (height * 0.77);

    // Initialize 4x4 Spritesheet Animator
    this.animator = new SpriteAnimator(texture, { 
      rows: 4, 
      cols: 4, 
      fps: 10,
      directionMap: config.directionMap
    });

    const geo = new THREE.PlaneGeometry(width, height);
    geo.translate(0, height / 2 - 0.08, 0);

    this.material = new THREE.MeshStandardMaterial({
      map: this.animator.getTexture(),
      transparent: true,
      alphaTest: 0.1,
      depthWrite: true,
      side: THREE.DoubleSide,
      roughness: 0.7,
    });
    CurvedWorldManager.getInstance().injectCurvedWorld(this.material);

    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.group.add(this.mesh);

    if (headTexture) {
      this.headAnimator = new SpriteAnimator(headTexture, { 
        rows: 4, 
        cols: 4, 
        fps: 10,
        directionMap: config.directionMap
      });
      this.headMaterial = new THREE.MeshStandardMaterial({
        map: this.headAnimator.getTexture(),
        transparent: true,
        alphaTest: 0.1,
        depthWrite: true,
        side: THREE.DoubleSide,
        roughness: 0.7,
      });
      CurvedWorldManager.getInstance().injectCurvedWorld(this.headMaterial);
      
      const headSize = width * headScale;
      const headGeo = new THREE.PlaneGeometry(headSize, headSize);
      headGeo.translate(0, headSize / 2, 0);
      
      const headMesh = new THREE.Mesh(headGeo, this.headMaterial);
      headMesh.position.set(0, headOffsetY, 0.01); // Position at shoulder height, slightly in front
      headMesh.castShadow = true;
      headMesh.receiveShadow = true;
      this.group.add(headMesh);
    }
  }

  public setRotationToCamera(cameraQuaternion: THREE.Quaternion): void {
    this.group.quaternion.copy(cameraQuaternion);
  }

  public setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  public setTexture(tex: THREE.Texture): void {
    this.animator.setTexture(tex);
    this.material.map = tex;
    this.material.needsUpdate = true;
  }

  public setDirection(direction: Direction): void {
    this.animator.setDirection(direction);
    this.headAnimator?.setDirection(direction);
  }

  public startAnimation(): void {
    this.animator.startAnimation();
    this.headAnimator?.startAnimation();
  }

  public stopAnimation(resetToIdleFrame: boolean = true): void {
    this.animator.stopAnimation(resetToIdleFrame);
    this.headAnimator?.stopAnimation(resetToIdleFrame);
  }

  public setAnimationProgress(progress: number): void {
    this.animator.setAnimationProgress(progress);
    if (this.headAnimator) {
      this.headAnimator.setAnimationProgress(progress);
    }
  }

  public update(dt: number): void {
    this.animator.update(dt);
    this.headAnimator?.update(dt);
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
        this.mesh.rotation.z = Math.PI / 2.5;
        break;
      case 'HITSTUN':
        this.stopAnimation(true);
        this.setAnimationProgress(0);
        this.mesh.rotation.z = 0;
        break;
      case 'ATTACK':
        const attackProgress = Math.min(1.0, stateTimer / 0.4);
        this.setAnimationProgress(attackProgress);
        this.mesh.rotation.z = 0;
        break;
      case 'DODGE':
        const dodgeProgress = Math.min(1.0, stateTimer / 0.15);
        this.setAnimationProgress(dodgeProgress);
        this.mesh.rotation.z = 0;
        break;
      case 'MOVE':
        this.setAnimationProgress(moveProgress);
        this.mesh.rotation.z = 0;
        break;
      case 'IDLE':
      default:
        this.stopAnimation(true);
        this.mesh.rotation.z = 0;
        break;
    }

    // 3. Flashing visual feedback (Red flash)
    if (isFlashing || state === 'HITSTUN') {
      this.material.color.setHex(0xef4444);
      if (this.headMaterial) {
        this.headMaterial.color.setHex(0xef4444);
      }
    } else {
      this.material.color.setHex(0xffffff);
      if (this.headMaterial) {
        this.headMaterial.color.setHex(0xffffff);
      }
    }
  }
}
