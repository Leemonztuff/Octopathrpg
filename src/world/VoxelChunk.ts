import * as THREE from 'three';
import { WorldGrid } from './WorldGrid';
import { VoxelMaterials } from './VoxelMaterials';
import { TileType } from '../types';

export class VoxelChunk {
  public readonly group: THREE.Group;
  private grid: WorldGrid;
  private materials: VoxelMaterials;
  public readonly chunkX: number;
  public readonly chunkZ: number;
  public readonly chunkSize: number;

  constructor(
    grid: WorldGrid,
    materials: VoxelMaterials,
    chunkX: number = 0,
    chunkZ: number = 0,
    chunkSize: number = 16
  ) {
    this.grid = grid;
    this.materials = materials;
    this.chunkX = chunkX;
    this.chunkZ = chunkZ;
    this.chunkSize = chunkSize;
    this.group = new THREE.Group();
    this.group.name = `VoxelChunk_${chunkX}_${chunkZ}`;

    this.buildChunkMeshWithFaceCulling();
  }

  /**
   * Optimized Hidden Face Culling Meshing strategy.
   * Merges all exposed voxel faces into combined geometries to reduce draw calls.
   */
  public buildChunkMeshWithFaceCulling(): void {
    // Dispose old geometries before removing children
    while (this.group.children.length > 0) {
      const child = this.group.children[0] as THREE.Mesh;
      if (child.geometry) child.geometry.dispose();
      this.group.remove(child);
    }

    const startX = this.chunkX * this.chunkSize;
    const startZ = this.chunkZ * this.chunkSize;
    const endX = startX + this.chunkSize;
    const endZ = startZ + this.chunkSize;

    // Separate geometry face buffers per TileType
    const positionsByTile: Map<TileType, number[]> = new Map();
    const normalsByTile: Map<TileType, number[]> = new Map();
    const uvsByTile: Map<TileType, number[]> = new Map();

    const getArrays = (type: TileType) => {
      if (!positionsByTile.has(type)) {
        positionsByTile.set(type, []);
        normalsByTile.set(type, []);
        uvsByTile.set(type, []);
      }
      return {
        pos: positionsByTile.get(type)!,
        norm: normalsByTile.get(type)!,
        uv: uvsByTile.get(type)!,
      };
    };

    // Helper to check if block exists at (x, y, z)
    const hasBlockAt = (gx: number, gy: number, gz: number): boolean => {
      if (gy < 0) return true; // Below ground level
      const cell = this.grid.getCell(gx, gz);
      return cell ? cell.height > gy : false;
    };

    for (let gx = startX; gx < endX; gx++) {
      for (let gz = startZ; gz < endZ; gz++) {
        const cell = this.grid.getCell(gx, gz);
        if (!cell || cell.type === TileType.EMPTY) continue;

        for (let gy = 0; gy < cell.height; gy++) {
          let topTileType = cell.type;
          let sideTileType = cell.type;

          const isGrassOrTransition =
            cell.type === TileType.GRASS ||
            cell.type === TileType.GRASS_DIRT_N ||
            cell.type === TileType.GRASS_DIRT_S ||
            cell.type === TileType.GRASS_DIRT_E ||
            cell.type === TileType.GRASS_DIRT_W ||
            cell.type === TileType.GRASS_DIRT_NE ||
            cell.type === TileType.GRASS_DIRT_NW ||
            cell.type === TileType.GRASS_DIRT_SE ||
            cell.type === TileType.GRASS_DIRT_SW;

          if (isGrassOrTransition) {
            if (gy < cell.height - 1) {
              topTileType = TileType.DIRT;
              sideTileType = TileType.DIRT;
            } else {
              if (cell.type !== TileType.GRASS) {
                // Manually placed transition: use explicitly chosen direction texture
                topTileType = cell.type;
              } else {
                // Dynamic neighbor-detecting autotiling:
                const getCellType = (x: number, z: number): TileType => {
                  const c = this.grid.getCell(x, z);
                  return c ? c.type : TileType.EMPTY;
                };

                const nType = getCellType(gx, gz - 1);
                const sType = getCellType(gx, gz + 1);
                const eType = getCellType(gx + 1, gz);
                const wType = getCellType(gx - 1, gz);

                const isNDirt = nType === TileType.DIRT;
                const isSDirt = sType === TileType.DIRT;
                const isEDirt = eType === TileType.DIRT;
                const isWDirt = wType === TileType.DIRT;

                if (isNDirt && isEDirt) {
                  topTileType = TileType.GRASS_DIRT_NE;
                } else if (isNDirt && isWDirt) {
                  topTileType = TileType.GRASS_DIRT_NW;
                } else if (isSDirt && isEDirt) {
                  topTileType = TileType.GRASS_DIRT_SE;
                } else if (isSDirt && isWDirt) {
                  topTileType = TileType.GRASS_DIRT_SW;
                } else if (isNDirt) {
                  topTileType = TileType.GRASS_DIRT_N;
                } else if (isSDirt) {
                  topTileType = TileType.GRASS_DIRT_S;
                } else if (isEDirt) {
                  topTileType = TileType.GRASS_DIRT_E;
                } else if (isWDirt) {
                  topTileType = TileType.GRASS_DIRT_W;
                } else {
                  topTileType = TileType.GRASS;
                }
              }
              sideTileType = TileType.DIRT;
            }
          }

          const x = gx;
          const y = gy;
          const z = gz;

          // 1. Top Face (+Y)
          if (!hasBlockAt(gx, gy + 1, gz)) {
            const { pos, norm, uv } = getArrays(topTileType);
            pos.push(
              x, y + 1, z + 1,
              x + 1, y + 1, z + 1,
              x + 1, y + 1, z,
              x, y + 1, z + 1,
              x + 1, y + 1, z,
              x, y + 1, z
            );
            for (let i = 0; i < 6; i++) norm.push(0, 1, 0);
            uv.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1);
          }

          // 2. Bottom Face (-Y)
          if (gy > 0 && !hasBlockAt(gx, gy - 1, gz)) {
            const { pos, norm, uv } = getArrays(sideTileType);
            pos.push(
              x, y, z,
              x + 1, y, z,
              x + 1, y, z + 1,
              x, y, z,
              x + 1, y, z + 1,
              x, y, z + 1
            );
            for (let i = 0; i < 6; i++) norm.push(0, -1, 0);
            uv.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1);
          }

          // 3. Front Face (+Z)
          if (!hasBlockAt(gx, gy, gz + 1)) {
            const { pos, norm, uv } = getArrays(sideTileType);
            pos.push(
              x, y, z + 1,
              x + 1, y, z + 1,
              x + 1, y + 1, z + 1,
              x, y, z + 1,
              x + 1, y + 1, z + 1,
              x, y + 1, z + 1
            );
            for (let i = 0; i < 6; i++) norm.push(0, 0, 1);
            uv.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1);
          }

          // 4. Back Face (-Z)
          if (!hasBlockAt(gx, gy, gz - 1)) {
            const { pos, norm, uv } = getArrays(sideTileType);
            pos.push(
              x + 1, y, z,
              x, y, z,
              x, y + 1, z,
              x + 1, y, z,
              x, y + 1, z,
              x + 1, y + 1, z
            );
            for (let i = 0; i < 6; i++) norm.push(0, 0, -1);
            uv.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1);
          }

          // 5. Right Face (+X)
          if (!hasBlockAt(gx + 1, gy, gz)) {
            const { pos, norm, uv } = getArrays(sideTileType);
            pos.push(
              x + 1, y, z + 1,
              x + 1, y, z,
              x + 1, y + 1, z,
              x + 1, y, z + 1,
              x + 1, y + 1, z,
              x + 1, y + 1, z + 1
            );
            for (let i = 0; i < 6; i++) norm.push(1, 0, 0);
            uv.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1);
          }

          // 6. Left Face (-X)
          if (!hasBlockAt(gx - 1, gy, gz)) {
            const { pos, norm, uv } = getArrays(sideTileType);
            pos.push(
              x, y, z,
              x, y, z + 1,
              x, y + 1, z + 1,
              x, y, z,
              x, y + 1, z + 1,
              x, y + 1, z
            );
            for (let i = 0; i < 6; i++) norm.push(-1, 0, 0);
            uv.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1);
          }
        }
      }
    }

    // Create Merged Mesh per TileType
    positionsByTile.forEach((posArr, tileType) => {
      if (posArr.length === 0) return;

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(posArr, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(normalsByTile.get(tileType)!, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvsByTile.get(tileType)!, 2));

      const mat = this.materials.getMaterial(tileType);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = false;
      mesh.receiveShadow = true;

      this.group.add(mesh);
    });
  }

  public setGridLinesVisible(visible: boolean): void {
    this.group.traverse((child) => {
      if (child instanceof THREE.LineSegments) {
        child.visible = visible;
      }
    });
  }
}
