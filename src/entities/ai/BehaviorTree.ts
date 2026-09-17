import { Direction, GridPos } from '../../types';
import { WorldGrid } from '../../world/WorldGrid';
import { EnemyEntity } from '../EnemyEntity';

export type BTNodeStatus = 'SUCCESS' | 'FAILURE' | 'RUNNING';

export abstract class BTNode {
  public abstract tick(enemy: EnemyEntity, playerPos: GridPos, worldGrid: WorldGrid, onMoveIntent: (direction: Direction) => void, onAttackIntent: () => void): BTNodeStatus;
}

// Selector Node (OR): Executes children in order until one succeeds or runs.
export class BTSelector extends BTNode {
  constructor(private children: BTNode[]) {
    super();
  }

  public tick(
    enemy: EnemyEntity,
    playerPos: GridPos,
    worldGrid: WorldGrid,
    onMoveIntent: (direction: Direction) => void,
    onAttackIntent: () => void
  ): BTNodeStatus {
    for (const child of this.children) {
      const status = child.tick(enemy, playerPos, worldGrid, onMoveIntent, onAttackIntent);
      if (status === 'SUCCESS' || status === 'RUNNING') {
        return status;
      }
    }
    return 'FAILURE';
  }
}

// Sequence Node (AND): Executes children in order until one fails or runs.
export class BTSequence extends BTNode {
  constructor(private children: BTNode[]) {
    super();
  }

  public tick(
    enemy: EnemyEntity,
    playerPos: GridPos,
    worldGrid: WorldGrid,
    onMoveIntent: (direction: Direction) => void,
    onAttackIntent: () => void
  ): BTNodeStatus {
    for (const child of this.children) {
      const status = child.tick(enemy, playerPos, worldGrid, onMoveIntent, onAttackIntent);
      if (status === 'FAILURE' || status === 'RUNNING') {
        return status;
      }
    }
    return 'SUCCESS';
  }
}

// Action Node: Executes a specific physical action.
export class BTActionNode extends BTNode {
  constructor(
    private action: (
      enemy: EnemyEntity,
      playerPos: GridPos,
      worldGrid: WorldGrid,
      onMoveIntent: (direction: Direction) => void,
      onAttackIntent: () => void
    ) => BTNodeStatus
  ) {
    super();
  }

  public tick(
    enemy: EnemyEntity,
    playerPos: GridPos,
    worldGrid: WorldGrid,
    onMoveIntent: (direction: Direction) => void,
    onAttackIntent: () => void
  ): BTNodeStatus {
    return this.action(enemy, playerPos, worldGrid, onMoveIntent, onAttackIntent);
  }
}

// Condition Node: Evaluates an environment check.
export class BTConditionNode extends BTNode {
  constructor(
    private condition: (enemy: EnemyEntity, playerPos: GridPos, worldGrid: WorldGrid) => boolean
  ) {
    super();
  }

  public tick(
    enemy: EnemyEntity,
    playerPos: GridPos,
    worldGrid: WorldGrid,
    onMoveIntent: (direction: Direction) => void,
    onAttackIntent: () => void
  ): BTNodeStatus {
    return this.condition(enemy, playerPos, worldGrid) ? 'SUCCESS' : 'FAILURE';
  }
}
