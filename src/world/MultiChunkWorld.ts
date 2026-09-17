import * as THREE from 'three';
import { WorldGrid } from './WorldGrid';
import { VoxelMaterials } from './VoxelMaterials';
import { VoxelChunk } from './VoxelChunk';
import { BillboardSystem } from '../billboards/BillboardSystem';
import { PropType, TileType } from '../types';
import { MapSerializer } from '../save/MapFormat';

export class MultiChunkWorld {
  public readonly group: THREE.Group;
  public readonly grid: WorldGrid;
  public readonly materials: VoxelMaterials;
  public readonly billboardSystem: BillboardSystem;
  private chunks: VoxelChunk[] = [];
  public readonly chunksX: number = 16; // 2x2 multi-chunk grid (32x32 cells)
  public readonly chunksZ: number = 16;
  public readonly chunkSize: number = 16;

  constructor(materials: VoxelMaterials) {
    this.group = new THREE.Group();
    this.group.name = 'MultiChunkWorldGroup';
    this.materials = materials;

    const totalWidth = this.chunksX * this.chunkSize;
    const totalDepth = this.chunksZ * this.chunkSize;
    this.grid = new WorldGrid(totalWidth, totalDepth);

    this.billboardSystem = new BillboardSystem(this.grid, this.materials);
    this.group.add(this.billboardSystem.group);

    this.setupWorldLayout();
  }

  private setupWorldLayout(): void {
    const w = this.grid.width;
    const d = this.grid.depth;

    for (let x = 0; x < w; x++) {
      for (let z = 0; z < d; z++) {
        let tileType = TileType.GRASS;
        let height = 1;
        let walkable = true;

        // Castle outer perimeter wall
        if ((z === 0 || z === d - 1 || x === 0 || x === w - 1) && !( (x >= 14 && x <= 17) || (z >= 14 && z <= 17) )) {
          tileType = TileType.CASTLE_WALL;
          height = 2;
          walkable = false;
        }
        // Main North-South Grand Avenue
        else if (x >= 14 && x <= 17) {
          tileType = TileType.STONE_COBBLE;
        }
        // Main East-West Grand Avenue
        else if (z >= 14 && z <= 17) {
          tileType = TileType.STONE_COBBLE;
        }
        // Central Plaza Mayor
        else if (x >= 10 && x <= 21 && z >= 10 && z <= 21) {
          tileType = TileType.STONE_COBBLE;
        }
        // Market Bazaar Street
        else if (x >= 4 && x <= 13 && z >= 10 && z <= 13) {
          tileType = TileType.STONE_COBBLE;
        }
        // Tavern & Guild Elevated Terrace
        else if (x >= 19 && x <= 28 && z >= 4 && z <= 10) {
          tileType = TileType.STONE;
          height = 2;
        }
        // Royal Park Lake
        else if (x >= 22 && x <= 26 && z >= 21 && z <= 25) {
          tileType = TileType.WATER;
          walkable = false;
        }
        // Lake promenade
        else if (((x === 21 || x === 27) && (z >= 20 && z <= 26)) || ((z === 20 || z === 26) && (x >= 21 && x <= 27))) {
          tileType = TileType.STONE_COBBLE;
        }

        this.grid.setCell(x, z, {
          x,
          z,
          height,
          walkable,
          type: tileType,
        });
      }
    }

    // Build Multi-Chunk Voxel Mesh objects
    for (let cx = 0; cx < this.chunksX; cx++) {
      for (let cz = 0; cz < this.chunksZ; cz++) {
        const chunk = new VoxelChunk(this.grid, this.materials, cx, cz, this.chunkSize);
        this.chunks.push(chunk);
        this.group.add(chunk.group);
      }
    }
  }

  /**
   * Spawns sample vegetation & city props on the multi-chunk map.
   */
  public spawnSampleProps(cameraQuaternion: THREE.Quaternion): void {
    // 1. Central Grand Fountain
    this.billboardSystem.addProp(
      {
        id: 'grand_fountain',
        type: PropType.FOUNTAIN,
        gridX: 14,
        gridZ: 14,
        width: 3.6,
        height: 2.8,
        footprintWidth: 3,
        footprintDepth: 3,
        walkable: false,
      },
      cameraQuaternion
    );

    // 2. Street Lamps
    const lampCoords = [
      [11, 11], [19, 11], [11, 19], [19, 19],
      [5, 10], [11, 10], [19, 8], [23, 8],
      [13, 2], [18, 2], [13, 29], [18, 29]
    ];
    lampCoords.forEach(([lx, lz], idx) => {
      this.billboardSystem.addProp(
        {
          id: `lamp_${idx}`,
          type: PropType.STREET_LAMP,
          gridX: lx,
          gridZ: lz,
          width: 1.2,
          height: 2.5,
          footprintWidth: 1,
          footprintDepth: 1,
          walkable: false,
        },
        cameraQuaternion
      );
    });

    // 3. Market Stalls & Barrels
    this.billboardSystem.addProp(
      {
        id: 'stall_red',
        type: PropType.MARKET_STALL_RED,
        gridX: 6,
        gridZ: 11,
        width: 2.5,
        height: 2.2,
        footprintWidth: 2,
        footprintDepth: 2,
        walkable: false,
      },
      cameraQuaternion
    );
    this.billboardSystem.addProp(
      {
        id: 'stall_blue',
        type: PropType.MARKET_STALL_BLUE,
        gridX: 9,
        gridZ: 11,
        width: 2.5,
        height: 2.2,
        footprintWidth: 2,
        footprintDepth: 2,
        walkable: false,
      },
      cameraQuaternion
    );

    // Barrels & Crates
    this.billboardSystem.addProp({ id: 'barrels_1', type: PropType.BARRELS_STACK, gridX: 4, gridZ: 11, width: 1.6, height: 2.0, footprintWidth: 2, footprintDepth: 1, walkable: false }, cameraQuaternion);
    this.billboardSystem.addProp({ id: 'barrels_2', type: PropType.BARRELS_STACK, gridX: 12, gridZ: 11, width: 1.6, height: 2.0, footprintWidth: 2, footprintDepth: 1, walkable: false }, cameraQuaternion);
    this.billboardSystem.addProp({ id: 'crates_1', type: PropType.CRATE_STACK, gridX: 5, gridZ: 12, width: 1.2, height: 1.6, footprintWidth: 1, footprintDepth: 1, walkable: false }, cameraQuaternion);

    // 4. Shops & Tavern
    this.billboardSystem.addProp({ id: 'shop_1', type: PropType.SHOP_HOUSE_1, gridX: 4, gridZ: 4, width: 3.5, height: 4.8, footprintWidth: 3, footprintDepth: 3, walkable: false }, cameraQuaternion);
    this.billboardSystem.addProp({ id: 'shop_2', type: PropType.SHOP_HOUSE_2, gridX: 8, gridZ: 4, width: 3.5, height: 4.8, footprintWidth: 3, footprintDepth: 3, walkable: false }, cameraQuaternion);
    this.billboardSystem.addProp({ id: 'tavern', type: PropType.SHOP_HOUSE_3, gridX: 20, gridZ: 4, width: 3.5, height: 4.8, footprintWidth: 3, footprintDepth: 3, walkable: false }, cameraQuaternion);
    this.billboardSystem.addProp({ id: 'guild', type: PropType.GUILD_HALL, gridX: 24, gridZ: 3, width: 5.0, height: 5.0, footprintWidth: 4, footprintDepth: 4, walkable: false }, cameraQuaternion);

    // 5. Trees & Greenery
    const grandOaks = [[3, 16], [9, 17], [28, 16], [27, 26], [10, 27]];
    grandOaks.forEach(([ox, oz], idx) => {
      this.billboardSystem.addProp({ id: `oak_${idx}`, type: PropType.TREE_GRAND_OAK, gridX: ox, gridZ: oz, width: 4.5, height: 5.5, footprintWidth: 2, footprintDepth: 2, walkable: false }, cameraQuaternion);
    });

    // Build all instanced & single billboard meshes
    this.billboardSystem.buildBillboards(cameraQuaternion);
  }

  public rebuildAllChunks(): void {
    this.chunks.forEach((chunk) => {
      chunk.buildChunkMeshWithFaceCulling();
    });
  }

  /**
   * Loads map schema data into the WorldGrid and BillboardSystem, then rebuilds meshes.
   */
  public loadFromMapSchema(
    mapData: {
      width?: number;
      height?: number;
      voxels?: Record<string, { height: number; type: string }>;
      billboards?: Array<{
        id?: string;
        x?: number;
        z?: number;
        gridX?: number;
        gridZ?: number;
        type: string;
        width?: number;
        height?: number;
        footprint?: { w: number; h: number };
        footprintWidth?: number;
        footprintDepth?: number;
        walkable?: boolean;
        name?: string;
      }>;
    },
    cameraQuaternion: THREE.Quaternion
  ): void {
    const mapW = mapData.width || this.grid.width;
    const mapD = mapData.height || this.grid.depth;
    const isActualOverworld = mapW <= 64 && mapD <= 64;

    // 1. Reset all cells in grid to default grass height 1 (or deep water if actual overworld)
    for (let x = 0; x < this.grid.width; x++) {
      for (let z = 0; z < this.grid.depth; z++) {
        const isOutside = x >= mapW || z >= mapD;
        this.grid.setCell(x, z, {
          x,
          z,
          height: isOutside && isActualOverworld ? 0 : 1,
          walkable: !isOutside,
          type: isOutside && isActualOverworld ? TileType.WATER : TileType.EMPTY,
        });
      }
    }

    // 2. Load custom voxel cells from mapData
    if (mapData.voxels) {
      Object.entries(mapData.voxels).forEach(([key, vData]) => {
        const [xs, zs] = key.split(',');
        const x = parseInt(xs, 10);
        const z = parseInt(zs, 10);
        if (this.grid.isInBounds(x, z)) {
          const tType = MapSerializer.stringToTileType(vData.type);
          const isWater = tType === TileType.WATER;
          const isStone = tType === TileType.STONE && vData.height > 1;
          this.grid.setCell(x, z, {
            x,
            z,
            height: vData.height,
            walkable: !isWater && !isStone,
            type: tType,
          });
        }
      });
    }

    // 3. Clear and reload billboards
    this.billboardSystem.clearProps();

    if (mapData.billboards) {
      mapData.billboards.forEach((bData, idx) => {
        const pType = MapSerializer.stringToPropType(bData.type);
        let width = 2.0;
        let height = 3.0;
        let fw = bData.footprint?.w || 1;
        let fh = bData.footprint?.h || 1;
        let walkable = false;

        if (pType === PropType.PORTAL_OVERWORLD) {
          width = 3.6;
          height = 4.8;
          fw = 2;
          fh = 2;
          walkable = true;
        } else if (pType === PropType.FOUNTAIN) {
          width = 3.6;
          height = 2.8;
          fw = 3;
          fh = 3;
          walkable = false;
        
        } else if (pType === PropType.TOWN_CASTLE) {
          width = 3.2;
          height = 3.2;
          fw = bData.footprint ? bData.footprint.w : 2;
          fh = bData.footprint ? bData.footprint.h : 2;
          walkable = bData.walkable !== undefined ? bData.walkable : true;
        } else if (pType === PropType.TOWN_VILLAGE) {
          width = 2.2;
          height = 2.2;
          fw = bData.footprint ? bData.footprint.w : 1;
          fh = bData.footprint ? bData.footprint.h : 1;
          walkable = bData.walkable !== undefined ? bData.walkable : true;
        } else if (pType === PropType.TOWN_FARM || pType === PropType.WINDMILL) {
          width = 2.8;
          height = 2.8;
          fw = bData.footprint ? bData.footprint.w : 2;
          fh = bData.footprint ? bData.footprint.h : 2;
          walkable = bData.walkable !== undefined ? bData.walkable : true;
        } else if (pType === PropType.TOWN_TEMPLE) {
          width = 2.8;
          height = 2.8;
          fw = bData.footprint ? bData.footprint.w : 2;
          fh = bData.footprint ? bData.footprint.h : 2;
          walkable = bData.walkable !== undefined ? bData.walkable : true;
        } else if (pType === PropType.TOWN_PORT) {
          width = 2.8;
          height = 2.8;
          fw = bData.footprint ? bData.footprint.w : 2;
          fh = bData.footprint ? bData.footprint.h : 2;
          walkable = bData.walkable !== undefined ? bData.walkable : true;
        } else if (pType === PropType.TOWN_LUMBERMILL) {
          width = 2.8;
          height = 2.8;
          fw = bData.footprint ? bData.footprint.w : 2;
          fh = bData.footprint ? bData.footprint.h : 2;
          walkable = bData.walkable !== undefined ? bData.walkable : true;
        } else if (pType === PropType.TOWN_CAVE || pType === PropType.CAVE_ENTRANCE) {
          width = 2.8;
          height = 2.8;
          fw = bData.footprint ? bData.footprint.w : 2;
          fh = bData.footprint ? bData.footprint.h : 2;
          walkable = bData.walkable !== undefined ? bData.walkable : true;
        } else if (pType === PropType.TOWN_RUINS) {
          width = 2.8;
          height = 2.8;
          fw = bData.footprint ? bData.footprint.w : 2;
          fh = bData.footprint ? bData.footprint.h : 2;
          walkable = bData.walkable !== undefined ? bData.walkable : true;
        } else if (pType === PropType.BOAT) {
          width = 2.2;
          height = 1.6;
          fw = 1;
          fh = 1;
          walkable = false;
        } else if (pType === PropType.WHEATFIELD) {
          width = 1.2;
          height = 1.2;
          fw = 1;
          fh = 1;
          walkable = true;
        } else if (pType === PropType.TREE_PALM) {
          width = 2.4;
          height = 3.2;
          fw = 1;
          fh = 1;
          walkable = false;
        } else if (pType === PropType.TREE_WINTER) {
          width = 2.4;
          height = 3.4;
          fw = 1;
          fh = 1;
          walkable = false;
        } else if (pType === PropType.BUSH_BERRY) {
          width = 1.2;
          height = 1.2;
          fw = 1;
          fh = 1;
          walkable = false;
} else if (pType === PropType.STREET_LAMP || pType === PropType.STREET_LAMP_ALT) {
          width = 1.2;
          height = 2.5;
          fw = 1;
          fh = 1;
          walkable = false;
        } else if (pType === PropType.MARKET_STALL_RED || pType === PropType.MARKET_STALL_BLUE) {
          width = 2.5;
          height = 2.2;
          fw = 2;
          fh = 2;
          walkable = false;
        } else if (pType === PropType.BARRELS_STACK) {
          width = 1.6;
          height = 2.0;
          fw = 2;
          fh = 1;
          walkable = false;
        } else if (pType === PropType.BARREL_SINGLE) {
          width = 1.0;
          height = 1.1;
          fw = 1;
          fh = 1;
          walkable = false;
        } else if (pType === PropType.CRATE_STACK) {
          width = 1.2;
          height = 1.6;
          fw = 1;
          fh = 1;
          walkable = false;
        } else if (pType === PropType.BENCH_WOOD) {
          width = 1.5;
          height = 1.1;
          fw = 1;
          fh = 1;
          walkable = false;
        } else if (pType === PropType.SHOP_HOUSE_1 || pType === PropType.SHOP_HOUSE_2 || pType === PropType.SHOP_HOUSE_3) {
          width = 3.5;
          height = 4.8;
          fw = 3;
          fh = 3;
          walkable = false;
        } else if (pType === PropType.MANOR_HOUSE || pType === PropType.GUILD_HALL) {
          width = 5.0;
          height = 5.0;
          fw = 4;
          fh = 4;
          walkable = false;
        } else if (pType === PropType.TREE_GRAND_OAK) {
          width = 4.5;
          height = 5.5;
          fw = 2;
          fh = 2;
          walkable = false;
        } else if (pType === PropType.TREE_LUSH_PINE) {
          width = 3.5;
          height = 5.0;
          fw = 2;
          fh = 2;
          walkable = false;
        } else if (pType === PropType.TREE_TOWN_GREEN) {
          width = 3.2;
          height = 4.5;
          fw = 1;
          fh = 1;
          walkable = false;
        } else if (pType === PropType.BUSH_FLOWERING || pType === PropType.BUSH_ROUND) {
          width = 1.5;
          height = 1.4;
          fw = 1;
          fh = 1;
          walkable = false;
        } else if (pType === PropType.HOUSE_FACADE) {
          width = 3.5;
          height = 3.5;
          fw = 4;
          fh = 3;
        } else if (pType === PropType.TREE_OAK) {
          width = 3.2;
          height = 4.2;
          fw = 1;
          fh = 1;
          walkable = false;
        } else if (pType === PropType.TREE_PINE || pType === PropType.PINE_TREE) {
          width = 2.8;
          height = 3.8;
          fw = 1;
          fh = 1;
          walkable = false;
        } else if (pType === PropType.BUSH_DETAILED) {
          width = 1.8;
          height = 1.8;
          fw = 1;
          fh = 1;
          walkable = false;
        } else if (pType === PropType.BUSH) {
          width = 1.2;
          height = 1.2;
          fw = 1;
          fh = 1;
          walkable = false;
        } else if (pType === PropType.FENCE_WOOD) {
          width = 1.8;
          height = 1.0;
          fw = 1;
          fh = 1;
          walkable = false;
        } else if (pType === PropType.FLOWERS_WILD || pType === PropType.FLOWERS_BLUE || pType === PropType.FLOWER_ROCK) {
          width = 1.0;
          height = 1.0;
          walkable = true;
        } else if (pType === PropType.ROCK_BOULDER) {
          width = 1.1;
          height = 1.0;
          walkable = false;
        } else if (pType === PropType.SIGNPOST || pType === PropType.CRATE) {
          width = 1.0;
          height = 1.0;
          walkable = false;
        }

        const finalX = bData.gridX !== undefined ? bData.gridX : (bData.x !== undefined ? bData.x : 0);
        const finalZ = bData.gridZ !== undefined ? bData.gridZ : (bData.z !== undefined ? bData.z : 0);
        const finalW = bData.width !== undefined ? bData.width : width;
        const finalH = bData.height !== undefined ? bData.height : height;
        const finalFw = bData.footprintWidth !== undefined ? bData.footprintWidth : fw;
        const finalFh = bData.footprintDepth !== undefined ? bData.footprintDepth : fh;
        const finalWalkable = bData.walkable !== undefined ? bData.walkable : walkable;

        this.billboardSystem.addProp(
          {
            id: bData.id || `prop_${idx}_${pType}`,
            type: pType,
            gridX: finalX,
            gridZ: finalZ,
            width: finalW,
            height: finalH,
            footprintWidth: finalFw,
            footprintDepth: finalFh,
            walkable: finalWalkable,
            name: bData.name,
          } as any,
          cameraQuaternion
        );
      });
    }

    // 4. Rebuild all chunk meshes and billboards
    this.rebuildAllChunks();
    this.billboardSystem.buildBillboards(cameraQuaternion);
  }

  public updateCameraOrientation(cameraQuaternion: THREE.Quaternion): void {
    this.billboardSystem.alignAllToCamera(cameraQuaternion);
  }
}
