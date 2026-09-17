import { GridPos, WorldPos } from '../../types';

export class PositionComponent {
  public gridX: number;
  public gridZ: number;
  public worldX: number;
  public worldY: number;
  public worldZ: number;

  constructor(gridX: number = 0, gridZ: number = 0, height: number = 1) {
    this.gridX = gridX;
    this.gridZ = gridZ;
    this.worldX = gridX + 0.5;
    this.worldY = height;
    this.worldZ = gridZ + 0.5;
  }

  public setGridPos(x: number, z: number, height: number = 1): void {
    this.gridX = x;
    this.gridZ = z;
    this.worldX = x + 0.5;
    this.worldY = height;
    this.worldZ = z + 0.5;
  }

  public getGridPos(): GridPos {
    return { x: this.gridX, z: this.gridZ };
  }

  public getWorldPos(): WorldPos {
    return { x: this.worldX, y: this.worldY, z: this.worldZ };
  }
}
