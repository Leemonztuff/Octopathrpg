import * as THREE from 'three';
import { Entity } from './Entity';
import { NPCSpriteComponent } from './components/NPCSpriteComponent';
import { WorldGrid } from '../world/WorldGrid';
import { VoxelMaterials } from '../world/VoxelMaterials';
import { Direction, GridPos, WorldPos } from '../types';

export type NPCBehaviorType = 'GUARD' | 'WANDER' | 'MERCHANT' | 'IDLE';

export class NpcEntity extends Entity {
  public readonly sprite: NPCSpriteComponent;
  public npcId: string;
  public name: string;
  public behaviorType: NPCBehaviorType = 'IDLE';
  
  private behaviorTimer: number = 0;
  private behaviorInterval: number = 3.0;
  private originX: number;
  private originZ: number;
  private worldGrid: WorldGrid;

  // Tweened cell-to-cell walking (instead of teleporting) so NPCs feel alive.
  private walkState: {
    fromGrid: GridPos;
    toGrid: GridPos;
    fromWorld: WorldPos;
    toWorld: WorldPos;
    progress: number;
    duration: number;
  } | null = null;
  private walkDuration: number;

  // Per-NPC idle liveliness: randomized standing offset + subtle sway
  private idleOffsetX: number;
  private idleOffsetZ: number;
  private idleSwayPhase: number;
  private idleSwayAmplitude: number;
  private idleSwayFreq: number;
  private npcTime: number = 0;

  constructor(
    id: string,
    npcId: string,
    name: string,
    initialGridX: number,
    initialGridZ: number,
    worldGrid: WorldGrid,
    materials: VoxelMaterials,
    spriteIndex?: number,
    behaviorType: NPCBehaviorType = 'WANDER'
  ) {
    const initialHeight = worldGrid.getVoxelHeight(initialGridX, initialGridZ);
    super(id, initialGridX, initialGridZ, initialHeight);

    this.npcId = npcId;
    this.name = name;
    this.originX = initialGridX;
    this.originZ = initialGridZ;
    this.worldGrid = worldGrid;
    this.behaviorType = behaviorType;
    this.behaviorInterval = 2.5 + Math.random() * 2.5;

    // Vary walking speed per NPC (280ms - 520ms per cell step) so crowds feel organic.
    this.walkDuration = 0.28 + Math.random() * 0.24;

    // Randomized idle standing offset so NPCs don't stack perfectly on cell centers
    const idleAngle = Math.random() * Math.PI * 2;
    this.idleOffsetX = Math.cos(idleAngle) * (0.05 + Math.random() * 0.09);
    this.idleOffsetZ = Math.sin(idleAngle) * (0.05 + Math.random() * 0.09);
    this.idleSwayPhase = Math.random() * Math.PI * 2;
    this.idleSwayAmplitude = 0.02 + Math.random() * 0.04;
    this.idleSwayFreq = 0.9 + Math.random() * 0.8;

    // 1. Decouple textures: Clone body and head textures per NPC instance
    // This ensures independent texture offset states so NPCs don't share head/body frames with the player or each other.
    let bodyTexture: THREE.Texture;
    if (spriteIndex !== undefined) {
      const pad = (num: number, size: number) => {
        let s = num + "";
        while (s.length < size) s = "0" + s;
        return s;
      };
      const textureLoader = new THREE.TextureLoader();
      const filename = `frame_${pad(spriteIndex, 3)}.webp`;
      bodyTexture = textureLoader.load(`/spritesheets/${filename}`, (tex) => {
        tex.magFilter = THREE.NearestFilter;
        tex.minFilter = THREE.NearestFilter;
        tex.generateMipmaps = false;
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;
      });
    } else {
      bodyTexture = materials.getPlayerSpritesheetTexture().clone();
      bodyTexture.magFilter = THREE.NearestFilter;
      bodyTexture.minFilter = THREE.NearestFilter;
      bodyTexture.needsUpdate = true;
    }

    const headTexture = materials.getHeadSpritesheetTexture().clone();
    headTexture.magFilter = THREE.NearestFilter;
    headTexture.minFilter = THREE.NearestFilter;
    headTexture.needsUpdate = true;

    this.sprite = new NPCSpriteComponent(bodyTexture, headTexture);

    this.addComponent('sprite', this.sprite);
    this.containerGroup.add(this.sprite.group);
    this.syncContainerPosition();
  }

  private lastCameraQuaternion: THREE.Quaternion = new THREE.Quaternion();

  public update(dt: number): void {
    this.sprite.update(dt);
  }

  public updateNpc(dt: number, cameraQuaternion: THREE.Quaternion, isSelected: boolean = false): void {
    this.lastCameraQuaternion.copy(cameraQuaternion);
    // 1. Update independent animation clock per NPC instance
    this.sprite.update(dt);
    this.sprite.setSelected(isSelected, dt);
    this.updateBillboardOrientation(cameraQuaternion);

    // 1b. Advance tweened walk and idle sway
    this.npcTime += dt;
    this.updateWalkState(dt);

    // 2. Execute Coherent AI Behavioral Patterns
    this.behaviorTimer += dt;
    if (this.behaviorTimer >= this.behaviorInterval) {
      this.behaviorTimer = 0;
      this.executeAIBehavior();
    }
  }

  /**
   * Advances the current walk tween (if any) and applies the per-NPC idle/living
   * offset + sway on top of the logical world position each frame.
   */
  private updateWalkState(dt: number): void {
    if (this.walkState) {
      const ws = this.walkState;
      ws.progress += dt / ws.duration;

      if (ws.progress >= 1.0) {
        // Arrived: snap to exact target cell and stop the walk animation
        this.walkState = null;
        this.position.setGridPos(ws.toGrid.x, ws.toGrid.z, ws.toWorld.y);
        this.sprite.stopAnimation(true);
      } else {
        const p = ws.progress;
        this.position.worldX = THREE.MathUtils.lerp(ws.fromWorld.x, ws.toWorld.x, p);
        this.position.worldY = THREE.MathUtils.lerp(ws.fromWorld.y, ws.toWorld.y, p);
        this.position.worldZ = THREE.MathUtils.lerp(ws.fromWorld.z, ws.toWorld.z, p);
      }
    }

    // Subtle living sway around the randomized idle offset (visual only)
    const swayX = Math.sin(this.npcTime * this.idleSwayFreq + this.idleSwayPhase) * this.idleSwayAmplitude;
    const swayZ = Math.cos(this.npcTime * this.idleSwayFreq * 0.9 + this.idleSwayPhase * 1.3) * this.idleSwayAmplitude;
    this.containerGroup.position.set(
      this.position.worldX + this.idleOffsetX + swayX,
      this.position.worldY,
      this.position.worldZ + this.idleOffsetZ + swayZ
    );
  }

  private executeAIBehavior(): void {
    const currentGrid = this.position.getGridPos();

    switch (this.behaviorType) {
      case 'WANDER': {
        // Coherent Wander AI: pick a random adjacent tile within 3 steps of origin
        // and walk there with a tween (speed varies per NPC instance).
        if (this.walkState) return; // Already walking; wait for arrival
        const dirs: Direction[] = ['DOWN', 'UP', 'LEFT', 'RIGHT'];
        const chosenDir = dirs[Math.floor(Math.random() * dirs.length)];
        
        let targetX = currentGrid.x;
        let targetZ = currentGrid.z;
        if (chosenDir === 'DOWN') targetZ += 1;
        if (chosenDir === 'UP') targetZ -= 1;
        if (chosenDir === 'LEFT') targetX -= 1;
        if (chosenDir === 'RIGHT') targetX += 1;

        const distFromOrigin = Math.abs(targetX - this.originX) + Math.abs(targetZ - this.originZ);
        if (distFromOrigin <= 3 && this.worldGrid.isWalkable(targetX, targetZ)) {
          const targetHeight = this.worldGrid.getVoxelHeight(targetX, targetZ);
          const fromWorld = this.position.getWorldPos();
          this.walkState = {
            fromGrid: { x: currentGrid.x, z: currentGrid.z },
            toGrid: { x: targetX, z: targetZ },
            fromWorld,
            toWorld: { x: targetX + 0.5, y: targetHeight, z: targetZ + 0.5 },
            progress: 0,
            duration: this.walkDuration,
          };
          this.sprite.setDirection(chosenDir);
          this.sprite.startAnimation();
        }
        break;
      }
      case 'GUARD': {
        // Coherent Guard AI: Periodically scan surroundings by looking in cardinal directions
        const guardDirs: Direction[] = ['DOWN', 'LEFT', 'RIGHT', 'UP'];
        const randomDir = guardDirs[Math.floor(Math.random() * guardDirs.length)];
        this.sprite.setDirection(randomDir);
        break;
      }
      case 'MERCHANT':
      case 'IDLE':
      default: {
        // Stand still with occasional subtle looking around
        const idleDirs: Direction[] = ['DOWN', 'LEFT', 'RIGHT'];
        if (Math.random() > 0.6) {
          this.sprite.setDirection(idleDirs[Math.floor(Math.random() * idleDirs.length)]);
        }
        break;
      }
    }
  }

  public syncContainerPosition(): void {
    const world = this.position.getWorldPos();
    this.containerGroup.position.set(world.x, world.y, world.z);
  }

  public updateBillboardOrientation(cameraQuaternion: THREE.Quaternion): void {
    this.sprite.setRotationToCamera(cameraQuaternion);
  }
}
