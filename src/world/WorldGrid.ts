import { TileType, VoxelCell } from '../types';

export class WorldGrid {
  public readonly width: number;
  public readonly depth: number;
  private cells: Map<string, VoxelCell> = new Map();

  constructor(width: number = 16, depth: number = 16) {
    this.width = width;
    this.depth = depth;
    this.initializeDefaultFlatChunk();
  }

  /**
   * Generates a 16x16 flat chunk with some decorative path & stone highlights.
   */
  private initializeDefaultFlatChunk(): void {
    for (let x = 0; x < this.width; x++) {
      for (let z = 0; z < this.depth; z++) {
        let tileType = TileType.GRASS;
        let walkable = true;
        let height = 1;

        // Add cobblestone path through center
        if (x === 7 || x === 8) {
          tileType = TileType.PATH;
        }

        // Add a decorative stone landmark at (3, 3) and (12, 12)
        if ((x === 3 && z === 3) || (x === 12 && z === 12)) {
          tileType = TileType.STONE;
          walkable = false; // Solid obstacle block!
          height = 2; // Elevated block
        }

        // Add water puddle at (13, 3)
        if (x === 13 && z === 3) {
          tileType = TileType.WATER;
          walkable = false;
          height = 1;
        }

        const cell: VoxelCell = {
          x,
          z,
          height,
          walkable,
          type: tileType,
        };

        this.setCell(x, z, cell);
      }
    }
  }

  private getKey(x: number, z: number): string {
    return `${x},${z}`;
  }

  public setCell(x: number, z: number, cell: VoxelCell): void {
    if (!this.isInBounds(x, z)) return;
    this.cells.set(this.getKey(x, z), cell);
  }

  public getCell(x: number, z: number): VoxelCell | undefined {
    return this.cells.get(this.getKey(x, z));
  }

  public isInBounds(x: number, z: number): boolean {
    return x >= 0 && x < this.width && z >= 0 && z < this.depth;
  }

  public isWalkable(x: number, z: number): boolean {
    if (!this.isInBounds(x, z)) return false;
    const cell = this.getCell(x, z);
    return cell ? cell.walkable : false;
  }

  public getVoxelHeight(x: number, z: number): number {
    const cell = this.getCell(x, z);
    return cell ? cell.height : 0;
  }

  public getAllCells(): VoxelCell[] {
    return Array.from(this.cells.values());
  }
}
