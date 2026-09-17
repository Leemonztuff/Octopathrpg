import * as THREE from 'three';
import { Entity } from './Entity';
import { MovementComponent } from './components/MovementComponent';
import { SpriteComponent } from './components/SpriteComponent';
import { HealthComponent } from './components/HealthComponent';
import { AIController } from './ai/AIController';
import { WorldGrid } from '../world/WorldGrid';
import { VoxelMaterials } from '../world/VoxelMaterials';
import { Direction, GridPos } from '../types';
import { globalEventBus } from '../core/EventBus';
import { updateHealthSystem, takeDamageSystem, startMoveSystem, updateMovementSystem, updateAISystem } from './systems/EntitySystems';
import { CharacterStateMachine } from './state-machine/CharacterStateMachine';

export class EnemyEntity extends Entity {
  public readonly movement: MovementComponent;
  public readonly sprite: SpriteComponent;
  public readonly health: HealthComponent;
  public readonly aiController: AIController;
  public readonly fsm: CharacterStateMachine;

  private worldGrid: WorldGrid;
  private healthBarMesh: THREE.Mesh;
  private healthBarCanvas: HTMLCanvasElement;
  private healthBarTexture: THREE.CanvasTexture;

  public attackDamage: number = 12;
  public name: string = 'Slime Maligno';

  constructor(
    id: string,
    initialGridX: number,
    initialGridZ: number,
    worldGrid: WorldGrid,
    materials: VoxelMaterials,
    name: string = 'Slime Maligno',
    maxHp: number = 60
  ) {
    const initialHeight = worldGrid.getVoxelHeight(initialGridX, initialGridZ);
    super(id, initialGridX, initialGridZ, initialHeight);

    this.name = name;
    this.worldGrid = worldGrid;
    this.movement = new MovementComponent();
    this.fsm = new CharacterStateMachine();
    
    this.sprite = new SpriteComponent(materials.getEnemySpritesheetTexture(), {
      width: 0.9,
      height: 1.35,
      directionMap: { DOWN: 0, LEFT: 1, RIGHT: 2, UP: 3 }
    });
    this.health = new HealthComponent(maxHp);
    this.aiController = new AIController(6, 1);

    // Register inside base dynamic component registry
    this.addComponent('movement', this.movement);
    this.addComponent('fsm', this.fsm);
    this.addComponent('sprite', this.sprite);
    this.addComponent('health', this.health);
    this.addComponent('aiController', this.aiController);

    this.containerGroup.add(this.sprite.group);

    // Create 3D Overhead Health Bar
    this.healthBarCanvas = document.createElement('canvas');
    this.healthBarCanvas.width = 64;
    this.healthBarCanvas.height = 12;
    this.healthBarTexture = new THREE.CanvasTexture(this.healthBarCanvas);
    this.healthBarTexture.magFilter = THREE.NearestFilter;
    this.healthBarTexture.minFilter = THREE.NearestFilter;

    const barGeo = new THREE.PlaneGeometry(0.8, 0.15);
    const barMat = new THREE.MeshBasicMaterial({
      map: this.healthBarTexture,
      transparent: true,
      side: THREE.DoubleSide,
    });
    this.healthBarMesh = new THREE.Mesh(barGeo, barMat);
    this.healthBarMesh.position.set(0, 1.3, 0); // Position above enemy head
    this.containerGroup.add(this.healthBarMesh);

    this.syncContainerPosition();
    this.updateHealthBarUI();
  }

  public handleMoveIntent(direction: Direction): void {
    if (this.movement.isMoving || !this.health.isAlive()) return;
    if (!this.fsm.canTransitionTo('MOVE')) return;

    let deltaX = 0;
    let deltaZ = 0;
    switch (direction) {
      case 'UP':
        deltaZ = -1;
        break;
      case 'DOWN':
        deltaZ = 1;
        break;
      case 'LEFT':
        deltaX = -1;
        break;
      case 'RIGHT':
        deltaX = 1;
        break;
    }

    const currentGrid = this.position.getGridPos();
    const targetX = currentGrid.x + deltaX;
    const targetZ = currentGrid.z + deltaZ;

    if (!this.worldGrid.isWalkable(targetX, targetZ)) return;

    const targetHeight = this.worldGrid.getVoxelHeight(targetX, targetZ);
    const startWorld = this.position.getWorldPos();
    const targetWorld = {
      x: targetX + 0.5,
      y: targetHeight,
      z: targetZ + 0.5,
    };

    if (this.fsm.transitionTo('MOVE')) {
      startMoveSystem(
        this.movement,
        currentGrid,
        { x: targetX, z: targetZ },
        startWorld,
        targetWorld,
        direction
      );
    }
  }

  public update(dt: number): void {
    // Standard update placeholder for entity mapping
  }

  public updateEnemy(
    dt: number,
    playerGridPos: GridPos,
    onEnemyAttackPlayer: (enemy: EnemyEntity) => void,
    cameraQuaternion: THREE.Quaternion
  ): void {
    // 1. Update health system timings
    updateHealthSystem(this.health, dt);

    // 2. Update state machine
    this.fsm.update(dt);

    const state = this.fsm.currentStateName;

    // 3. Keep DEAD state aligned
    if (!this.health.isAlive()) {
      if (state !== 'DEAD') {
        this.fsm.transitionTo('DEAD');
      }
      this.sprite.updateFSMState('DEAD', this.fsm.timer, this.movement.facingDirection || 'DOWN', this.health.isFlashing);
      this.sprite.setRotationToCamera(cameraQuaternion);
      this.healthBarMesh.quaternion.copy(cameraQuaternion);
      return;
    }

    // 4. Update AI controller decision matrix ONLY when in decision states
    if (state === 'IDLE' || state === 'MOVE') {
      updateAISystem(
        this,
        playerGridPos,
        this.worldGrid,
        this.movement.isMoving,
        dt,
        (dir) => this.handleMoveIntent(dir),
        () => {
          if (this.fsm.transitionTo('ATTACK')) {
            onEnemyAttackPlayer(this);
          }
        }
      );
    }

    // 5. Update visual / coordinate status based on FSM State
    if (state === 'DEAD') {
      this.sprite.updateFSMState('DEAD', this.fsm.timer, this.movement.facingDirection || 'DOWN', this.health.isFlashing);
    } else if (state === 'HITSTUN') {
      this.sprite.updateFSMState('HITSTUN', this.fsm.timer, this.movement.facingDirection || 'DOWN', this.health.isFlashing);
    } else if (state === 'ATTACK') {
      this.sprite.updateFSMState('ATTACK', this.fsm.timer, this.movement.facingDirection || 'DOWN', this.health.isFlashing);
    } else if (state === 'MOVE') {
      if (!this.movement.isMoving) {
        this.fsm.transitionTo('IDLE');
        this.sprite.updateFSMState('IDLE', this.fsm.timer, this.movement.facingDirection || 'DOWN', this.health.isFlashing);
      } else {
        updateMovementSystem(
          this.movement,
          this.position,
          this.containerGroup,
          this.sprite,
          dt,
          () => {
            this.syncContainerPosition();
            this.fsm.transitionTo('IDLE');
          }
        );
        this.sprite.updateFSMState('MOVE', this.fsm.timer, this.movement.facingDirection || 'DOWN', this.health.isFlashing, this.movement.progress);
      }
    } else {
      this.sprite.updateFSMState('IDLE', this.fsm.timer, this.movement.facingDirection || 'DOWN', this.health.isFlashing);
    }

    // Billboard orientation towards camera
    this.sprite.setRotationToCamera(cameraQuaternion);
    this.healthBarMesh.quaternion.copy(cameraQuaternion);
  }

  public takeDamage(amount: number, isMagic: boolean = false): boolean {
    if (!this.health.isAlive()) return false;
    const took = takeDamageSystem(this.health, amount);
    if (took) {
      this.updateHealthBarUI();

      // Emit enemy damage event for Ragnarok-style floating text
      const enemyPos = this.containerGroup.position;
      const isCritical = amount >= 30 || Math.random() < 0.2;
      const finalAmount = isCritical ? Math.round(amount * 1.35) : amount;

      globalEventBus.emit('combat:enemy_damaged', {
        enemyId: this.id,
        name: this.name,
        amount: finalAmount,
        worldPos: {
          x: enemyPos.x,
          y: enemyPos.y + 1.2,
          z: enemyPos.z,
        },
        isCritical,
        isMagic,
      });

      if (!this.health.isAlive()) {
        this.fsm.transitionTo('DEAD');
        globalEventBus.emit('combat:enemy_defeated', { enemyId: this.id, name: this.name });
      } else {
        this.fsm.transitionTo('HITSTUN');
      }
    }
    return took;
  }

  public updateHealthBarUI(): void {
    const ctx = this.healthBarCanvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, 64, 12);

    // Background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 64, 12);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(0, 0, 64, 12);

    // HP Fill
    const ratio = Math.max(0, this.health.currentHealth / this.health.maxHealth);
    ctx.fillStyle = ratio > 0.5 ? '#22c55e' : ratio > 0.25 ? '#eab308' : '#ef4444';
    ctx.fillRect(2, 2, Math.floor(60 * ratio), 8);

    this.healthBarTexture.needsUpdate = true;
  }

  public reset(
    id: string,
    initialGridX: number,
    initialGridZ: number,
    name: string,
    maxHp: number,
    aiType: 'UTILITY' | 'BEHAVIOR_TREE' = 'UTILITY',
    attackDamage: number = 12
  ): void {
    this.id = id;
    this.name = name;
    this.attackDamage = attackDamage;

    // Reset positions
    const initialHeight = this.worldGrid.getVoxelHeight(initialGridX, initialGridZ);
    this.position.setGridPos(initialGridX, initialGridZ, initialHeight);
    this.syncContainerPosition();

    // Reset FSM
    this.fsm.transitionTo('IDLE');

    // Reset components
    this.movement.isMoving = false;
    this.movement.progress = 0;

    this.health.maxHealth = maxHp;
    this.health.currentHealth = maxHp;
    this.health.isInvulnerable = false;
    this.health.invulnerableTimer = 0;
    this.health.isFlashing = false;
    this.health.damageFlashTimer = 0;

    // Reset AI state
    this.aiController.aiType = aiType;
    this.aiController.currentState = 'PATROL';
    this.aiController.patrolTimer = Math.random() * this.aiController.patrolInterval;
    this.aiController.attackTimer = 0;
    this.aiController.isRaged = false;
    this.aiController.hasSummonedMinions = false;
    if (aiType === 'BEHAVIOR_TREE') {
      // Re-initialize boss BT so closures bind to the correct instance
      (this.aiController as any).setupBossBehaviorTree();
    }

    // Make sure it is visible and in the scene
    this.containerGroup.visible = true;
    this.sprite.setVisible(true);

    // Update HP bar
    this.updateHealthBarUI();
  }

  public syncContainerPosition(): void {
    const world = this.position.getWorldPos();
    this.containerGroup.position.set(world.x, world.y, world.z);
  }
}
