import { Direction, GridPos } from '../../types';
import { WorldGrid } from '../../world/WorldGrid';
import { UtilityAI } from './UtilityAI';
import { BTNode, BTSelector, BTSequence, BTConditionNode, BTActionNode } from './BehaviorTree';
import { globalEventBus } from '../../core/EventBus';

export type AIState = 'PATROL' | 'PURSUIT' | 'ATTACK' | 'BOSS_SPECIAL';
export type AIType = 'UTILITY' | 'BEHAVIOR_TREE';

export class AIController {
  public currentState: AIState = 'PATROL';
  public aiType: AIType = 'UTILITY';

  public detectionRadius: number = 5;
  public attackRadius: number = 1;

  public patrolTimer: number = 0;
  public attackTimer: number = 0;

  public attackCooldownDuration: number = 1.2; // Seconds between attacks
  public patrolInterval: number = 1.8; // Seconds between patrol steps (made slightly faster for responsiveness)

  // Utility AI Engine
  public utilityAI: UtilityAI;

  // Behavior Tree Engine (Root Node for Bosses)
  public btRoot: BTNode | null = null;
  public hasSummonedMinions: boolean = false;
  public isRaged: boolean = false;

  constructor(detectionRadius: number = 6, attackRadius: number = 1, aiType: AIType = 'UTILITY') {
    this.detectionRadius = detectionRadius;
    this.attackRadius = attackRadius;
    this.aiType = aiType;
    this.patrolTimer = Math.random() * this.patrolInterval;

    this.utilityAI = new UtilityAI();

    if (this.aiType === 'BEHAVIOR_TREE') {
      this.setupBossBehaviorTree();
    }
  }

  /**
   * Sets up a robust Behavior Tree for elite/boss enemies with distinct phases
   */
  private setupBossBehaviorTree() {
    // A Boss Behavior Tree:
    // Selector (OR)
    //  ├─ Sequence (AND): Rage/Heal Phase (Condition: HP < 40%, Action: Rage Buff and summon particles)
    //  ├─ Sequence (AND): Close Combat (Condition: Player in Attack Radius, Action: Special Boss Smash)
    //  ├─ Sequence (AND): Chase (Condition: Player in Detection Radius, Action: Move to Player)
    //  └─ Action: Boss Patrol
    
    const self = this;

    const ragePhase = new BTSequence([
      new BTConditionNode((enemy) => {
        const hpPercent = enemy.health.currentHealth / enemy.health.maxHealth;
        return hpPercent < 0.4 && !self.isRaged;
      }),
      new BTActionNode((enemy) => {
        self.isRaged = true;
        enemy.attackDamage = Math.round(enemy.attackDamage * 1.5); // 50% more damage!
        
        // Visual cue through events
        globalEventBus.emit('combat:enemy_damaged', {
          enemyId: enemy.id,
          name: `${enemy.name} (RABIOSO 🔥)`,
          amount: 0,
          worldPos: {
            x: enemy.containerGroup.position.x,
            y: enemy.containerGroup.position.y + 1.6,
            z: enemy.containerGroup.position.z,
          },
          isCritical: true,
          isMagic: true,
        });

        // Trigger boss rage animation / spawn particle bursts
        return 'SUCCESS';
      })
    ]);

    const closeCombat = new BTSequence([
      new BTConditionNode((enemy, playerPos) => {
        const ePos = enemy.position.getGridPos();
        const dist = Math.abs(playerPos.x - ePos.x) + Math.abs(playerPos.z - ePos.z);
        return dist <= self.attackRadius;
      }),
      new BTActionNode((enemy, playerPos, worldGrid, onMoveIntent, onAttackIntent) => {
        if (self.attackTimer <= 0) {
          self.attackTimer = self.attackCooldownDuration * 0.8; // Faster boss attacks
          onAttackIntent();
          return 'SUCCESS';
        }
        return 'RUNNING';
      })
    ]);

    const chasePlayer = new BTSequence([
      new BTConditionNode((enemy, playerPos) => {
        const ePos = enemy.position.getGridPos();
        const dist = Math.abs(playerPos.x - ePos.x) + Math.abs(playerPos.z - ePos.z);
        return dist <= self.detectionRadius;
      }),
      new BTActionNode((enemy, playerPos, worldGrid, onMoveIntent) => {
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
          return 'SUCCESS';
        } else if (secondaryDir && canMoveInDir(secondaryDir)) {
          onMoveIntent(secondaryDir);
          return 'SUCCESS';
        }
        return 'FAILURE';
      })
    ]);

    const bossPatrol = new BTActionNode((enemy, playerPos, worldGrid, onMoveIntent) => {
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
          return 'SUCCESS';
        }
      }
      return 'FAILURE';
    });

    this.btRoot = new BTSelector([
      ragePhase,
      closeCombat,
      chasePlayer,
      bossPatrol
    ]);
  }
}
