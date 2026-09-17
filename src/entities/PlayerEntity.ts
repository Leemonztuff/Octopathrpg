import * as THREE from 'three';
import { Entity } from './Entity';
import { MovementComponent } from './components/MovementComponent';
import { CompositeSpriteComponent } from './components/CompositeSpriteComponent';
import { HealthComponent } from './components/HealthComponent';
import { EquipmentComponent } from './components/EquipmentComponent';
import { EnemyEntity } from './EnemyEntity';
import { WorldGrid } from '../world/WorldGrid';
import { VoxelMaterials } from '../world/VoxelMaterials';
import { Direction, MoveIntentPayload, Item } from '../types';
import { globalEventBus } from '../core/EventBus';
import { updateHealthSystem, takeDamageSystem, healSystem, startMoveSystem } from './systems/EntitySystems';
import { CharacterStateMachine } from './state-machine/CharacterStateMachine';
import { STANDARD_PLAYER_RIG_CONFIG } from './components/NPCSpriteComponent';

/**
 * Eases a 0..1 progress with a fast start and soft landing.
 * Used for dash displacement so the initial burst feels snappy and responsive.
 */
function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

export class PlayerEntity extends Entity {
  public readonly movement: MovementComponent;
  public readonly sprite: CompositeSpriteComponent;
  public readonly health: HealthComponent;
  public readonly equipment: EquipmentComponent;
  public readonly fsm: CharacterStateMachine;
  public isGhost: boolean = false;
  public gravestonePos: {x: number, z: number} | null = null;
  private worldGrid: WorldGrid;
  private materials: VoxelMaterials;
  private unbindInputListener?: () => void;

  constructor(
    id: string,
    initialGridX: number,
    initialGridZ: number,
    worldGrid: WorldGrid,
    materials: VoxelMaterials
  ) {
    const initialHeight = worldGrid.getVoxelHeight(initialGridX, initialGridZ);
    super(id, initialGridX, initialGridZ, initialHeight);

    this.worldGrid = worldGrid;
    this.materials = materials;
    this.movement = new MovementComponent();
    this.fsm = new CharacterStateMachine();

    this.sprite = new CompositeSpriteComponent(
      materials.getPlayerSpritesheetTexture(),
      materials.getHeadSpritesheetTexture(),
      STANDARD_PLAYER_RIG_CONFIG,
      1.3,
      1.3,
      { DOWN: 0, LEFT: 1, RIGHT: 2, UP: 3 },
      'player'
    );
    this.health = new HealthComponent(100);
    this.equipment = new EquipmentComponent();

    // Register inside dynamic component map
    this.addComponent('movement', this.movement);
    this.addComponent('sprite', this.sprite);
    this.addComponent('health', this.health);
    this.addComponent('equipment', this.equipment);
    this.addComponent('fsm', this.fsm);

    this.containerGroup.add(this.sprite.group);

    // Initial position setup
    this.syncContainerPosition();

    // Bind input & stats listeners
    this.bindEvents();
  }

  private bindEvents(): void {
    const unbindInput = globalEventBus.on('input:move_intent', (payload: MoveIntentPayload) => {
      this.handleMoveIntent(payload.direction, payload.secondaryDirection);
    });

    const unbindStats = globalEventBus.on('stats:recalculated', (stats) => {
      this.equipment.applyRecalculatedStats(stats);
      this.health.maxHealth = stats.maxHp;
      if (this.health.currentHealth > stats.maxHp) {
        this.health.currentHealth = stats.maxHp;
      }
      // Speed bonus speeds up move tween duration
      this.movement.moveDuration = 0.18 / stats.moveSpeedMod;
    });

    this.unbindInputListener = () => {
      unbindInput();
      unbindStats();
    };
  }

  public destroy(): void {
    if (this.unbindInputListener) {
      this.unbindInputListener();
    }
  }

  public handleMoveIntent(direction: Direction, secondaryDirection?: Direction): void {
    this.movement.facingDirection = direction;
    this.sprite.setDirection(direction);

    // Block new movement if the state machine doesn't allow it, or if we are already moving
    if (!this.fsm.canTransitionTo('MOVE')) return;
    if (this.movement.isMoving) return;

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
    let targetX = currentGrid.x + deltaX;
    let targetZ = currentGrid.z + deltaZ;
    let activeDirection = direction;

    // Wall-sliding fallback: If primary direction is blocked and secondary direction is provided
    if (!this.worldGrid.isWalkable(targetX, targetZ) && secondaryDirection) {
      let secDeltaX = 0;
      let secDeltaZ = 0;
      switch (secondaryDirection) {
        case 'UP':
          secDeltaZ = -1;
          break;
        case 'DOWN':
          secDeltaZ = 1;
          break;
        case 'LEFT':
          secDeltaX = -1;
          break;
        case 'RIGHT':
          secDeltaX = 1;
          break;
      }
      const secX = currentGrid.x + secDeltaX;
      const secZ = currentGrid.z + secDeltaZ;
      if (this.worldGrid.isInBounds(secX, secZ) && this.worldGrid.isWalkable(secX, secZ)) {
        targetX = secX;
        targetZ = secZ;
        activeDirection = secondaryDirection;
        this.movement.facingDirection = activeDirection;
        this.sprite.setDirection(activeDirection);
      }
    }

    // Check map boundaries for exiting map
    if (!this.worldGrid.isInBounds(targetX, targetZ)) {
      globalEventBus.emit('player:exit_map', {});
      this.fsm.transitionTo('IDLE');
      return;
    }

    if (!this.worldGrid.isWalkable(targetX, targetZ)) {
      this.fsm.transitionTo('IDLE');
      globalEventBus.emit('player:move_blocked', {
        targetPos: { x: targetX, z: targetZ },
        reason: !this.worldGrid.isInBounds(targetX, targetZ)
          ? 'OUT_OF_BOUNDS'
          : 'BLOCKED_TILE',
      });
      return;
    }

    // Prepare step target
    const targetHeight = this.worldGrid.getVoxelHeight(targetX, targetZ);
    const startWorld = this.position.getWorldPos();
    const targetWorld = {
      x: targetX + 0.5,
      y: targetHeight,
      z: targetZ + 0.5,
    };

    if (this.fsm.transitionTo('MOVE')) {
      startMoveSystem(this.movement, currentGrid, { x: targetX, z: targetZ }, startWorld, targetWorld, activeDirection);
      this.sprite.startAnimation();

      globalEventBus.emit('player:move_start', {
        from: currentGrid,
        to: { x: targetX, z: targetZ },
        direction: activeDirection,
      });
    }
  }

  public performAttack(
    enemies: EnemyEntity[],
    scene: THREE.Scene,
    slashTexture: THREE.CanvasTexture,
    cameraQuaternion: THREE.Quaternion
  ): { hit: boolean; targetCell: { x: number; z: number }; hitEnemy?: EnemyEntity } | null {
    // Attempt state machine transition. If it fails, buffer the intent.
    if (!this.fsm.transitionTo('ATTACK')) {
      this.fsm.bufferIntent('ATTACK');
      return null;
    }

    // Transition succeeded, clear buffered intents
    this.fsm.clearBuffer();

    const dir = this.movement.facingDirection || 'DOWN';
    let deltaX = 0;
    let deltaZ = 0;

    switch (dir) {
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

    globalEventBus.emit('combat:attack_intent', {
      targetPos: { x: targetX, z: targetZ },
      isPlayer: true
    });

    // Check hit against enemies
    const hitEnemy = enemies.find((e) => {
      const ePos = e.position.getGridPos();
      return e.health.isAlive() && ePos.x === targetX && ePos.z === targetZ;
    });

    if (hitEnemy) {
      const isCrit = Math.random() < this.equipment.critChance;
      const baseDmg = this.equipment.totalAttack * 3;
      const damageDealt = Math.round(isCrit ? baseDmg * this.equipment.critDamage : baseDmg);

      hitEnemy.takeDamage(damageDealt);

      // Life Steal / Vampirism
      if (this.equipment.lifeSteal > 0) {
        const stolenHp = Math.max(1, Math.round(damageDealt * this.equipment.lifeSteal));
        this.heal(stolenHp);
      }

      globalEventBus.emit('combat:player_attack', {
        hit: true,
        damage: damageDealt,
        enemyName: hitEnemy.name,
        targetPos: { x: targetX, z: targetZ },
        isCritical: isCrit,
      });
      return { hit: true, targetCell: { x: targetX, z: targetZ }, hitEnemy };
    }

    globalEventBus.emit('combat:player_attack', {
      hit: false,
      damage: 0,
      targetPos: { x: targetX, z: targetZ },
    });
    return { hit: false, targetCell: { x: targetX, z: targetZ } };
  }

  public heal(amount: number): void {
    healSystem(this.health, amount);
    const pPos = this.containerGroup.position;
    globalEventBus.emit('combat:player_healed', {
      amount,
      currentHp: this.health.currentHealth,
      maxHp: this.health.maxHealth,
      worldPos: {
        x: pPos.x,
        y: pPos.y + 1.4,
        z: pPos.z,
      },
    });
  }

  public useConsumable(slotIndex: number): boolean {
    const item = this.equipment.useConsumable(slotIndex);
    if (item && item.healAmount) {
      this.heal(item.healAmount);
      return true;
    }
    return false;
  }

  public equipItem(item: Item): boolean {
    const success = this.equipment.equipItem(item);
    if (success && item.slot === 'armor') {
      if (item.id.includes('arquero') || item.id.includes('ranger') || item.id.includes('cuerda') || item.id.includes('cuero')) {
        this.sprite.setBodyTexture(this.materials.getArcherPlayerSpritesheetTexture());
      } else {
        this.sprite.setBodyTexture(this.materials.getPlayerSpritesheetTexture());
      }
    }
    return success;
  }

  public performDash(): boolean {
    // Attempt state machine transition. If it fails, buffer the intent.
    if (!this.fsm.transitionTo('DODGE')) {
      this.fsm.bufferIntent('DODGE');
      return false;
    }

    // Transition succeeded, clear buffered intents
    this.fsm.clearBuffer();

    const dir = this.movement.facingDirection || 'DOWN';
    let deltaX = 0;
    let deltaZ = 0;

    switch (dir) {
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

    // Check walkability for scripted displacement target
    if (!this.worldGrid.isWalkable(targetX, targetZ)) {
      // Return to IDLE state if target is blocked
      this.fsm.transitionTo('IDLE');
      return false;
    }

    const targetHeight = this.worldGrid.getVoxelHeight(targetX, targetZ);
    const startWorld = this.position.getWorldPos();
    const targetWorld = {
      x: targetX + 0.5,
      y: targetHeight,
      z: targetZ + 0.5,
    };

    // Trigger FSM Scripted Movement
    const dodgeDuration = 0.15;
    this.fsm.startScriptedMove(currentGrid, { x: targetX, z: targetZ }, startWorld, targetWorld, dodgeDuration);

    // Dodge invulnerability
    this.health.isInvulnerable = true;
    this.health.invulnerableTimer = dodgeDuration;

    globalEventBus.emit('combat:player_dash', { from: currentGrid, to: { x: targetX, z: targetZ } });
    return true;
  }

  public takeDamage(amount: number): boolean {
    if (this.health.isInvulnerable || !this.health.isAlive()) {
      return false;
    }

    const tookDamage = takeDamageSystem(this.health, amount);
    if (tookDamage) {
      if (this.health.isAlive()) {
        this.fsm.transitionTo('HITSTUN');
      } else {
        this.fsm.transitionTo('DEAD');
      }

      const pPos = this.containerGroup.position;
      globalEventBus.emit('combat:player_damaged', {
        amount,
        currentHp: this.health.currentHealth,
        maxHp: this.health.maxHealth,
        worldPos: {
          x: pPos.x,
          y: pPos.y + 1.4,
          z: pPos.z,
        },
      });
    }
    return tookDamage;
  }

  public update(dt: number): void {
    // 1. Update health component timings (invulnerability, flashing)
    updateHealthSystem(this.health, dt);

    // 2. State-machine update (manages timers and auto-transitions)
    this.fsm.update(dt);

    const state = this.fsm.currentStateName;

    // 3. Fallback check for deaths / Ghost mechanic
    if (!this.health.isAlive() && state !== 'DEAD' && !this.isGhost) {
      // Player dies -> Turn into ghost!
      this.isGhost = true;
      
      // Store gravestone position
      this.gravestonePos = { x: this.position.gridX, z: this.position.gridZ };
      globalEventBus.emit('player:died', this.gravestonePos);

      // Restore health
      this.health.currentHealth = this.health.maxHealth;
      
      // Turn sprite to ghost mode
      this.sprite.setGhostMode(true);
      
      // Teleport to cemetery
      const cemeteryX = 150;
      const cemeteryZ = 215;
      const h = this.worldGrid.getVoxelHeight(cemeteryX, cemeteryZ);
      this.position.setGridPos(cemeteryX, cemeteryZ, h);
      this.syncContainerPosition();
      
      // Cancel any ongoing moves
      this.fsm.transitionTo('IDLE');
      this.movement.isMoving = false;
      return;
    }

    // Recover body logic
    if (this.isGhost && this.gravestonePos && !this.movement.isMoving) {
      if (this.position.gridX === this.gravestonePos.x && this.position.gridZ === this.gravestonePos.z) {
        this.isGhost = false;
        this.gravestonePos = null;
        this.sprite.setGhostMode(false);
        globalEventBus.emit('player:recovered_body', {});
      }
    }

    // 4. Handle state-specific logic (Scripted / Tween positioning & sprite rendering)
    if (state === 'DEAD') {
      this.sprite.updateFSMState('DEAD', this.fsm.timer, this.movement.facingDirection || 'DOWN', this.health.isFlashing);
      return;
    }

    if (state === 'HITSTUN') {
      this.sprite.updateFSMState('HITSTUN', this.fsm.timer, this.movement.facingDirection || 'DOWN', this.health.isFlashing);
      return;
    }

    if (state === 'DODGE') {
      const scripted = this.fsm.activeScriptedMove;
      if (scripted) {
        const raw = scripted.progress;
        // Ease-out so the dash launches fast then settles into the target cell
        const t = easeOutQuad(raw);
        const start = scripted.startWorld;
        const target = scripted.targetWorld;

        const currentX = THREE.MathUtils.lerp(start.x, target.x, t);
        const currentY = THREE.MathUtils.lerp(start.y, target.y, t);
        const currentZ = THREE.MathUtils.lerp(start.z, target.z, t);

        this.containerGroup.position.set(currentX, currentY, currentZ);

        this.position.worldX = currentX;
        this.position.worldY = currentY;
        this.position.worldZ = currentZ;

        this.sprite.updateFSMState('DODGE', this.fsm.timer, this.movement.facingDirection || 'DOWN', this.health.isFlashing, t);

        globalEventBus.emit('player:move_step', {
          currentWorldPos: { x: currentX, y: currentY, z: currentZ },
          progress: t,
        });

        if (raw >= 1.0) {
          const targetGrid = scripted.targetGrid;
          this.position.setGridPos(targetGrid.x, targetGrid.z, target.y);
          this.syncContainerPosition();
        }
      }
      return;
    }

    if (state === 'ATTACK') {
      this.sprite.updateFSMState('ATTACK', this.fsm.timer, this.movement.facingDirection || 'DOWN', this.health.isFlashing);
      return;
    }

    if (state === 'MOVE') {
      if (!this.movement.isMoving) {
        this.fsm.transitionTo('IDLE');
        this.sprite.updateFSMState('IDLE', this.fsm.timer, this.movement.facingDirection || 'DOWN', this.health.isFlashing);
        return;
      }

      this.movement.progress += dt / this.movement.moveDuration;

      if (this.movement.progress >= 1.0) {
        this.movement.progress = 1.0;
        const targetGrid = this.movement.targetGridPos;
        const targetWorld = this.movement.targetWorldPos;

        this.position.setGridPos(targetGrid.x, targetGrid.z, targetWorld.y);
        this.syncContainerPosition();
        this.movement.isMoving = false;
        this.movement.progress = 1.0;

        this.fsm.transitionTo('IDLE');
        this.sprite.updateFSMState('IDLE', this.fsm.timer, this.movement.facingDirection || 'DOWN', this.health.isFlashing);

        globalEventBus.emit('player:move_complete', {
          from: this.movement.startGridPos,
          to: targetGrid,
          worldPos: targetWorld,
        });
      } else {
        const t = this.movement.progress;
        const start = this.movement.startWorldPos;
        const target = this.movement.targetWorldPos;

        const currentX = THREE.MathUtils.lerp(start.x, target.x, t);
        const currentY = THREE.MathUtils.lerp(start.y, target.y, t);
        const currentZ = THREE.MathUtils.lerp(start.z, target.z, t);

        this.containerGroup.position.set(currentX, currentY, currentZ);

        this.position.worldX = currentX;
        this.position.worldY = currentY;
        this.position.worldZ = currentZ;

        this.sprite.updateFSMState('MOVE', this.fsm.timer, this.movement.facingDirection || 'DOWN', this.health.isFlashing, t);

        globalEventBus.emit('player:move_step', {
          currentWorldPos: { x: currentX, y: currentY, z: currentZ },
          progress: t,
        });
      }
      return;
    }

    // Default: IDLE
    this.sprite.updateFSMState('IDLE', this.fsm.timer, this.movement.facingDirection || 'DOWN', this.health.isFlashing);
  }

  public syncContainerPosition(): void {
    const world = this.position.getWorldPos();
    this.containerGroup.position.set(world.x, world.y, world.z);
  }

  public updateBillboardOrientation(cameraQuaternion: THREE.Quaternion): void {
    this.sprite.setRotationToCamera(cameraQuaternion);
  }
}
