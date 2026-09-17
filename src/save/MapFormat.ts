import { BillboardPropData, PropType, TileType, VoxelCell } from '../types';
import { WorldGrid } from '../world/WorldGrid';
import { BillboardSystem } from '../billboards/BillboardSystem';

export interface VoxelDataJSON {
  height: number;
  type: string; // e.g. "GRASS", "DIRT", "STONE", "PATH", "WATER"
}

export interface BillboardDataJSON {
  x: number;
  z: number;
  type: string; // e.g. "PINE_TREE", "BUSH", "FLOWER_ROCK", "HOUSE_FACADE"
  footprint?: { w: number; h: number };
  walkable?: boolean;
}

export interface MapSchemaJSON {
  width: number;
  height: number; // grid depth
  chunkSize: number;
  voxels: Record<string, VoxelDataJSON>;
  billboards: BillboardDataJSON[];
}

export class MapSerializer {
  public static tileTypeToString(type: TileType): string {
    switch (type) {
      case TileType.GRASS:
        return 'GRASS';
      case TileType.DIRT:
        return 'DIRT';
      case TileType.STONE:
        return 'STONE';
      case TileType.PATH:
        return 'PATH';
      case TileType.WATER:
        return 'WATER';
      case TileType.GRASS_DIRT_N:
        return 'GRASS_DIRT_N';
      case TileType.GRASS_DIRT_S:
        return 'GRASS_DIRT_S';
      case TileType.GRASS_DIRT_E:
        return 'GRASS_DIRT_E';
      case TileType.GRASS_DIRT_W:
        return 'GRASS_DIRT_W';
      case TileType.GRASS_DIRT_NE:
        return 'GRASS_DIRT_NE';
      case TileType.GRASS_DIRT_NW:
        return 'GRASS_DIRT_NW';
      case TileType.GRASS_DIRT_SE:
        return 'GRASS_DIRT_SE';
      case TileType.GRASS_DIRT_SW:
        return 'GRASS_DIRT_SW';
      case TileType.STONE_COBBLE:
        return 'STONE_COBBLE';
      case TileType.CASTLE_WALL:
        return 'CASTLE_WALL';
      case TileType.SAND:
        return 'SAND';
      case TileType.SNOW:
        return 'SNOW';
      case TileType.EMPTY:
      default:
        return 'GRASS';
    }
  }

  public static stringToTileType(str: string): TileType {
    const s = (str || '').toUpperCase();
    if (s.includes('SNOW')) return TileType.SNOW;
    if (s.includes('STONE_COBBLE') || s.includes('COBBLE')) return TileType.STONE_COBBLE;
    if (s.includes('CASTLE_WALL') || s.includes('WALL_STONE')) return TileType.CASTLE_WALL;
    if (s.includes('GRASS_DIRT_NE')) return TileType.GRASS_DIRT_NE;
    if (s.includes('GRASS_DIRT_NW')) return TileType.GRASS_DIRT_NW;
    if (s.includes('GRASS_DIRT_SE')) return TileType.GRASS_DIRT_SE;
    if (s.includes('GRASS_DIRT_SW')) return TileType.GRASS_DIRT_SW;
    if (s.includes('GRASS_DIRT_N')) return TileType.GRASS_DIRT_N;
    if (s.includes('GRASS_DIRT_S')) return TileType.GRASS_DIRT_S;
    if (s.includes('GRASS_DIRT_E')) return TileType.GRASS_DIRT_E;
    if (s.includes('GRASS_DIRT_W')) return TileType.GRASS_DIRT_W;
    if (s.includes('GRASS')) return TileType.GRASS;
    if (s.includes('DIRT')) return TileType.DIRT;
    if (s.includes('STONE') || s.includes('WALL')) return TileType.STONE;
    if (s.includes('PATH') || s.includes('ROAD')) return TileType.PATH;
    if (s.includes('WATER')) return TileType.WATER;
    if (s.includes('SAND')) return TileType.SAND;
    return TileType.GRASS;
  }

  public static stringToPropType(str: string): PropType {
    const s = (str || '').toUpperCase();
    if (s === 'TOWN_VILLAGE') return PropType.TOWN_VILLAGE;
    if (s === 'TOWN_CASTLE') return PropType.TOWN_CASTLE;
    if (s === 'TOWN_RUINS') return PropType.TOWN_RUINS;
    if (s === 'TOWN_FARM' || s === 'FARM') return PropType.TOWN_FARM;
    if (s === 'TOWN_TEMPLE' || s === 'TEMPLE') return PropType.TOWN_TEMPLE;
    if (s === 'TOWN_PORT' || s === 'PORT') return PropType.TOWN_PORT;
    if (s === 'TOWN_LUMBERMILL' || s === 'LUMBERMILL') return PropType.TOWN_LUMBERMILL;
    if (s === 'TOWN_CAVE' || s === 'CAVE') return PropType.TOWN_CAVE;
    if (s === 'CAVE_ENTRANCE') return PropType.CAVE_ENTRANCE;
    if (s === 'WINDMILL') return PropType.WINDMILL;
    if (s === 'WHEATFIELD') return PropType.WHEATFIELD;
    if (s === 'TREE_PALM' || s.includes('PALM') || s.includes('COCONUT')) return PropType.TREE_PALM;
    if (s === 'TREE_WINTER' || s.includes('WINTER_TREE')) return PropType.TREE_WINTER;
    if (s === 'BOAT' || s.includes('SHIP')) return PropType.BOAT;
    if (s === 'BUSH_BERRY') return PropType.BUSH_BERRY;
    if (s === 'FOUNTAIN') return PropType.FOUNTAIN;
    if (s === 'STREET_LAMP') return PropType.STREET_LAMP;
    if (s === 'STREET_LAMP_ALT') return PropType.STREET_LAMP_ALT;
    if (s === 'MARKET_STALL_RED') return PropType.MARKET_STALL_RED;
    if (s === 'MARKET_STALL_BLUE') return PropType.MARKET_STALL_BLUE;
    if (s === 'BARRELS_STACK') return PropType.BARRELS_STACK;
    if (s === 'BARREL_SINGLE') return PropType.BARREL_SINGLE;
    if (s === 'CRATE_STACK') return PropType.CRATE_STACK;
    if (s === 'BENCH_WOOD') return PropType.BENCH_WOOD;
    if (s === 'SHOP_HOUSE_1') return PropType.SHOP_HOUSE_1;
    if (s === 'SHOP_HOUSE_2') return PropType.SHOP_HOUSE_2;
    if (s === 'SHOP_HOUSE_3') return PropType.SHOP_HOUSE_3;
    if (s === 'MANOR_HOUSE') return PropType.MANOR_HOUSE;
    if (s === 'GUILD_HALL') return PropType.GUILD_HALL;
    if (s === 'TREE_GRAND_OAK') return PropType.TREE_GRAND_OAK;
    if (s === 'TREE_LUSH_PINE') return PropType.TREE_LUSH_PINE;
    if (s === 'TREE_TOWN_GREEN') return PropType.TREE_TOWN_GREEN;
    if (s === 'BUSH_FLOWERING') return PropType.BUSH_FLOWERING;
    if (s === 'BUSH_ROUND') return PropType.BUSH_ROUND;
    if (s === 'TREE_OAK') return PropType.TREE_OAK;
    if (s === 'TREE_PINE') return PropType.TREE_PINE;
    if (s === 'BUSH_DETAILED') return PropType.BUSH_DETAILED;
    if (s === 'FENCE_WOOD') return PropType.FENCE_WOOD;
    if (s === 'FLOWERS_WILD') return PropType.FLOWERS_WILD;
    if (s === 'FLOWERS_BLUE') return PropType.FLOWERS_BLUE;
    if (s === 'ROCK_BOULDER') return PropType.ROCK_BOULDER;
    if (s === 'SIGNPOST') return PropType.SIGNPOST;
    if (s === 'CRATE') return PropType.CRATE;
    if (s.includes('PORTAL')) return PropType.PORTAL_OVERWORLD;
    if (s.includes('HOUSE') || s.includes('FACADE')) return PropType.HOUSE_FACADE;
    if (s.includes('BUSH')) return PropType.BUSH;
    if (s.includes('FLOWER') || s.includes('ROCK')) return PropType.FLOWER_ROCK;
    return PropType.PINE_TREE;
  }

  /**
   * Serializes current WorldGrid & BillboardSystem into MapSchemaJSON
   */
  public static serialize(grid: WorldGrid, props: BillboardPropData[]): MapSchemaJSON {
    const voxels: Record<string, VoxelDataJSON> = {};

    for (let x = 0; x < grid.width; x++) {
      for (let z = 0; z < grid.depth; z++) {
        const cell = grid.getCell(x, z);
        if (cell && cell.type !== TileType.EMPTY) {
          voxels[`${x},${z}`] = {
            height: cell.height,
            type: MapSerializer.tileTypeToString(cell.type),
          };
        }
      }
    }

    const billboards: BillboardDataJSON[] = props.map((p) => ({
      x: p.gridX,
      z: p.gridZ,
      type: p.type,
      footprint: { w: p.footprintWidth, h: p.footprintDepth },
    }));

    return {
      width: grid.width,
      height: grid.depth,
      chunkSize: 16,
      voxels,
      billboards,
    };
  }
}
