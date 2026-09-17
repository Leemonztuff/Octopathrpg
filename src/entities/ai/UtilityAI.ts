import { Direction, GridPos } from '../../types';
import { WorldGrid } from '../../world/WorldGrid';
import { EnemyEntity } from '../EnemyEntity';

export interface UtilityAction {
  name: string;
  evaluate: (enemy: EnemyEntity, playerPos: GridPos, worldGrid: WorldGrid) => number;
  execute: (
    enemy: EnemyEntity,
    playerPos: GridPos,
    worldGrid: WorldGrid,
    onMoveIntent: (direction: Direction) => void,
    onAttackIntent: () => void
  ) => void;
}

export class UtilityAI {
  private actions: UtilityAction[] = [];

  constructor() {
    this.setupDefaultActions();
  }

  public registerAction(action: UtilityAction) {
    this.actions.push(action);
  }

  public tick(
    enemy: EnemyEntity,
    playerPos: GridPos,
    worldGrid: WorldGrid,
    onMoveIntent: (direction: Direction) => void,
    onAttackIntent: () => void
  ): void {
    if (this.actions.length === 0) return;

    let bestAction: UtilityAction | null = null;
    let highestScore = -1;

    for (const action of this.actions) {
      const score = action.evaluate(enemy, playerPos, worldGrid);
      if (score > highestScore) {
        highestScore = score;
        bestAction = action;
      }
    }

    if (bestAction && highestScore > 0) {
      bestAction.execute(enemy, playerPos, worldGrid, onMoveIntent, onAttackIntent);
    }
  }

  private setupDefaultActions() {
    // 1. ATTACK Action
    this.registerAction({
      name: 'ATTACK',
      evaluate: (enemy, playerPos) => {
        const ePos = enemy.position.getGridPos();
        const dist = Math.abs(playerPos.x - ePos.x) + Math.abs(playerPos.z - ePos.z);
        if (dist <= enemy.aiController.attackRadius) {
          return 95; // Extremely high desire to smash the player if adjacent
        }
        return 0;
      },
      execute: (enemy, playerPos, worldGrid, onMoveIntent, onAttackIntent) => {
        if (enemy.aiController.attackTimer <= 0) {
          enemy.aiController.attackTimer = enemy.aiController.attackCooldownDuration;
          onAttackIntent();
        }
      }
    });

    // 2. FLEE Action (If health is critically low, and player is close, flee to preserve life)
    this.registerAction({
      name: 'FLEE',
      evaluate: (enemy, playerPos) => {
        const hpPercent = enemy.health.currentHealth / enemy.health.maxHealth;
        if (hpPercent < 0.35) {
          const ePos = enemy.position.getGridPos();
          const dist = Math.abs(playerPos.x - ePos.x) + Math.abs(playerPos.z - ePos.z);
          // If player is close, fleeing is highly prioritized
          if (dist <= 3) {
            return 85; 
          } else if (dist <= 6) {
            return 50;
          }
        }
        return 0;
      },
      execute: (enemy, playerPos, worldGrid, onMoveIntent) => {
        const ePos = enemy.position.getGridPos();
        // Move in a direction that maximizes distance to player
        const directions: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
        let bestDir: Direction | null = null;
        let maxDist = -1;

        for (const dir of directions) {
          let tx = ePos.x;
          let tz = ePos.z;
          if (dir === 'UP') tz -= 1;
          if (dir === 'DOWN') tz += 1;
          if (dir === 'LEFT') tx -= 1;
          if (dir === 'RIGHT') tx += 1;

          if (worldGrid.isWalkable(tx, tz)) {
            const d = Math.abs(playerPos.x - tx) + Math.abs(playerPos.z - tz);
            if (d > maxDist) {
              maxDist = d;
              bestDir = dir;
            }
          }
        }

        if (bestDir) {
          onMoveIntent(bestDir);
        }
      }
    });

    // 3. APPROACH / PURSUE Action
    this.registerAction({
      name: 'APPROACH',
      evaluate: (enemy, playerPos) => {
        const ePos = enemy.position.getGridPos();
        const dist = Math.abs(playerPos.x - ePos.x) + Math.abs(playerPos.z - ePos.z);
        if (dist <= enemy.aiController.detectionRadius && dist > enemy.aiController.attackRadius) {
          // Score is higher if health is good, or inversely proportional to distance (desire increases as we get closer)
          const hpFactor = enemy.health.currentHealth / enemy.health.maxHealth;
          return 40 + (10 / (dist + 0.1)) + (hpFactor * 30); // Scales between 40 and 80
        }
        return 0;
      },
      execute: (enemy, playerPos, worldGrid, onMoveIntent) => {
        const ePos = enemy.position.getGridPos();
        const dx = playerPos.x - ePos.x;
        const dz = playerPos.z - ePos.z;

        let primaryDir: Direction | null = null;
        let secondaryDir: Direction | null = null;

        if (Math.abs(dx) >= Math.abs(dz)) {
          primaryDir = dx > 0 ? 'RIGHT' : 'LEFT';
          secondaryDir = dz > 0 ? 'DOWN' : 'UP';
        } else {
          primaryDir = dz > 0 ? 'DOWN' : 'UP';
          secondaryDir = dx > 0 ? 'RIGHT' : 'LEFT';
        }

        const canMoveInDir = (dir: Direction) => {
          let tx = ePos.x;
          let tz = ePos.z;
          if (dir === 'UP') tz -= 1;
          if (dir === 'DOWN') tz += 1;
          if (dir === 'LEFT') tx -= 1;
          if (dir === 'RIGHT') tx += 1;
          return worldGrid.isWalkable(tx, tz);
        };

        if (primaryDir && canMoveInDir(primaryDir)) {
          onMoveIntent(primaryDir);
        } else if (secondaryDir && canMoveInDir(secondaryDir)) {
          onMoveIntent(secondaryDir);
        }
      }
    });

    // 4. PATROL Action (Idle wander)
    this.registerAction({
      name: 'PATROL',
      evaluate: (enemy, playerPos) => {
        const ePos = enemy.position.getGridPos();
        const dist = Math.abs(playerPos.x - ePos.x) + Math.abs(playerPos.z - ePos.z);
        if (dist > enemy.aiController.detectionRadius) {
          return 30; // Solid baseline desire to wander if player is out of reach
        }
        return 5; // Low priority but possible if nothing else matches
      },
      execute: (enemy, playerPos, worldGrid, onMoveIntent) => {
        // Handle patrol step interval
        const directions: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
        for (let i = directions.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [directions[i], directions[j]] = [directions[j], directions[i]];
        }

        const ePos = enemy.position.getGridPos();
        for (const dir of directions) {
          let tx = ePos.x;
          let tz = ePos.z;
          if (dir === 'UP') tz -= 1;
          if (dir === 'DOWN') tz += 1;
          if (dir === 'LEFT') tx -= 1;
          if (dir === 'RIGHT') tx += 1;

          if (worldGrid.isWalkable(tx, tz)) {
            onMoveIntent(dir);
            break;
          }
        }
      }
    });
  }
}
