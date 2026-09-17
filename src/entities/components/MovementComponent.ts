import { Direction, GridPos, WorldPos } from '../../types';

export class MovementComponent {
  public isMoving: boolean = false;
  public startGridPos: GridPos = { x: 0, z: 0 };
  public targetGridPos: GridPos = { x: 0, z: 0 };
  public startWorldPos: WorldPos = { x: 0.5, y: 1, z: 0.5 };
  public targetWorldPos: WorldPos = { x: 0.5, y: 1, z: 0.5 };
  public progress: number = 0;
  public moveDuration: number = 0.18; // 180ms per cell step
  public facingDirection: Direction = 'DOWN';
}
