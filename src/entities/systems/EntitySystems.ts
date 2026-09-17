import * as THREE from 'three';
import { HealthComponent } from '../components/HealthComponent';
import { MovementComponent } from '../components/MovementComponent';
import { PositionComponent } from '../components/PositionComponent';
import { AIController } from '../ai/AIController';
import { Direction, GridPos } from '../../types';
import { WorldGrid } from '../../world/WorldGrid';
import { EnemyEntity } from '../EnemyEntity';

export function updateHealthSystem(health: HealthComponent, dt: number): void {
  if (health.invulnerableTimer > 0) {
    health.invulnerableTimer -= dt;
    if (health.invulnerableTimer <= 0) {
      health.isInvulnerable = false;
      health.invulnerableTimer = 0;
    }
  }

  if (health.damageFlashTimer > 0) {
    health.damageFlashTimer -= dt;
    if (health.damageFlashTimer <= 0) {
      health.isFlashing = false;
      health.damageFlashTimer = 0;
    }
  }
}

export function takeDamageSystem(
  health: HealthComponent,
  amount: number,
  invulnerabilityDuration: number = 0.4
): boolean {
  if (health.isInvulnerable || health.currentHealth <= 0) {
    return false;
  }

  health.currentHealth = Math.max(0, health.currentHealth - amount);
  health.isInvulnerable = true;
  health.invulnerableTimer = invulnerabilityDuration;

  health.isFlashing = true;
  health.damageFlashTimer = 0.2; // 200ms damage flash

  return true;
}

export function healSystem(health: HealthComponent, amount: number): void {
  health.currentHealth = Math.min(health.maxHealth, health.currentHealth + amount);
}

export function startMoveSystem(
  movement: MovementComponent,
  fromGrid: GridPos,
  toGrid: GridPos,
  fromWorld: { x: number, y: number, z: number },
  toWorld: { x: number, y: number, z: number },
  dir: Direction,
  duration?: number
): void {
  movement.isMoving = true;
  movement.startGridPos = { ...fromGrid };
  movement.targetGridPos = { ...toGrid };
  movement.startWorldPos = { ...fromWorld };
  movement.targetWorldPos = { ...toWorld };
  movement.facingDirection = dir;
  movement.progress = 0;
  if (duration !== undefined) {
    movement.moveDuration = duration;
  }
}

export function updateMovementSystem(
  movement: MovementComponent,
  position: PositionComponent,
  containerGroup: THREE.Group,
  sprite: { setAnimationProgress: (progress: number) => void; stopAnimation?: (reset: boolean) => void },
  dt: number,
  onComplete?: () => void
): void {
  if (!movement.isMoving) return;

  movement.progress += dt / movement.moveDuration;
  sprite.setAnimationProgress(movement.progress);

  if (movement.progress >= 1.0) {
    movement.progress = 1.0;
    const targetGrid = movement.targetGridPos;
    const targetWorld = movement.targetWorldPos;

    position.gridX = targetGrid.x;
    position.gridZ = targetGrid.z;
    position.worldX = targetWorld.x;
    position.worldY = targetWorld.y;
    position.worldZ = targetWorld.z;

    containerGroup.position.set(targetWorld.x, targetWorld.y, targetWorld.z);
    movement.isMoving = false;
    movement.progress = 1.0;

    if (sprite.stopAnimation) {
      sprite.stopAnimation(true);
    }

    if (onComplete) {
      onComplete();
    }
  } else {
    const t = movement.progress;
    const start = movement.startWorldPos;
    const target = movement.targetWorldPos;

    const cx = THREE.MathUtils.lerp(start.x, target.x, t);
    const cy = THREE.MathUtils.lerp(start.y, target.y, t);
    const cz = THREE.MathUtils.lerp(start.z, target.z, t);

    containerGroup.position.set(cx, cy, cz);
    position.worldX = cx;
    position.worldY = cy;
    position.worldZ = cz;
  }
}

export function updateAISystem(
  enemy: EnemyEntity,
  playerPos: GridPos,
  worldGrid: WorldGrid,
  isEnemyMoving: boolean,
  dt: number,
  onMoveIntent: (direction: Direction) => void,
  onAttackIntent: () => void
): void {
  const ai = enemy.aiController as AIController;
  if (ai.attackTimer > 0) {
    ai.attackTimer -= dt;
  }

  if (isEnemyMoving) return; // Wait until step finishes

  if (ai.aiType === 'BEHAVIOR_TREE' && ai.btRoot) {
    // Behavior Tree execution (Bosses/Elites)
    const status = ai.btRoot.tick(enemy, playerPos, worldGrid, onMoveIntent, onAttackIntent);
    if (status === 'SUCCESS' && ai.attackTimer > 0) {
      ai.currentState = 'ATTACK';
    } else {
      ai.currentState = 'PURSUIT';
    }
  } else {
    // Utility AI execution (Mobs)
    ai.utilityAI.tick(enemy, playerPos, worldGrid, onMoveIntent, onAttackIntent);
  }
}

function stepTowardsPlayerAI(
  ai: AIController,
  dx: number,
  dz: number,
  enemyPos: GridPos,
  worldGrid: WorldGrid,
  onMoveIntent: (direction: Direction) => void
): void {
  let primaryDir: Direction | null = null;
  let secondaryDir: Direction | null = null;

  if (Math.abs(dx) >= Math.abs(dz)) {
    primaryDir = dx > 0 ? 'RIGHT' : 'LEFT';
    secondaryDir = dz > 0 ? 'DOWN' : 'UP';
  } else {
    primaryDir = dz > 0 ? 'DOWN' : 'UP';
    secondaryDir = dx > 0 ? 'RIGHT' : 'LEFT';
  }

  if (primaryDir && canMoveInDirAI(enemyPos, primaryDir, worldGrid)) {
    onMoveIntent(primaryDir);
  } else if (secondaryDir && canMoveInDirAI(enemyPos, secondaryDir, worldGrid)) {
    onMoveIntent(secondaryDir);
  }
}

function patrolRandomlyAI(
  enemyPos: GridPos,
  worldGrid: WorldGrid,
  onMoveIntent: (direction: Direction) => void
): void {
  const directions: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
  // Shuffle directions
  for (let i = directions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [directions[i], directions[j]] = [directions[j], directions[i]];
  }

  for (const dir of directions) {
    if (canMoveInDirAI(enemyPos, dir, worldGrid)) {
      onMoveIntent(dir);
      break;
    }
  }
}

function canMoveInDirAI(pos: GridPos, dir: Direction, worldGrid: WorldGrid): boolean {
  let tx = pos.x;
  let tz = pos.z;
  if (dir === 'UP') tz -= 1;
  if (dir === 'DOWN') tz += 1;
  if (dir === 'LEFT') tx -= 1;
  if (dir === 'RIGHT') tx += 1;

  return worldGrid.isWalkable(tx, tz);
}
