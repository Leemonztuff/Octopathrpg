/**
 * Core type definitions for the 2.5D Octopath Voxel Engine.
 */

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface GridPos {
  x: number;
  z: number;
}

export interface WorldPos {
  x: number;
  y: number;
  z: number;
}

export enum TileType {
  EMPTY = 0,
  GRASS = 1,
  DIRT = 2,
  STONE = 3,
  PATH = 4,
  WATER = 5,
  GRASS_DIRT_N = 6,
  GRASS_DIRT_S = 7,
  GRASS_DIRT_E = 8,
  GRASS_DIRT_W = 9,
  GRASS_DIRT_NE = 10,
  GRASS_DIRT_NW = 11,
  GRASS_DIRT_SE = 12,
  GRASS_DIRT_SW = 13,
  STONE_COBBLE = 14,
  CASTLE_WALL = 15,
  SAND = 16,
  SNOW = 17,
}

export enum PropType {
  // Overworld POIs
  TOWN_VILLAGE = 'TOWN_VILLAGE',
  TOWN_CASTLE = 'TOWN_CASTLE',
  TOWN_RUINS = 'TOWN_RUINS',
  TOWN_FARM = 'TOWN_FARM',
  TOWN_TEMPLE = 'TOWN_TEMPLE',
  TOWN_PORT = 'TOWN_PORT',
  TOWN_LUMBERMILL = 'TOWN_LUMBERMILL',
  TOWN_CAVE = 'TOWN_CAVE',
  CAVE_ENTRANCE = 'CAVE_ENTRANCE',
  WINDMILL = 'WINDMILL',
  WHEATFIELD = 'WHEATFIELD',
  TREE_PALM = 'TREE_PALM',
  TREE_WINTER = 'TREE_WINTER',
  BOAT = 'BOAT',
  BUSH_BERRY = 'BUSH_BERRY',
  PINE_TREE = 'PINE_TREE',
  BUSH = 'BUSH',
  FLOWER_ROCK = 'FLOWER_ROCK',
  HOUSE_FACADE = 'HOUSE_FACADE',
  TREE_OAK = 'TREE_OAK',
  TREE_PINE = 'TREE_PINE',
  BUSH_DETAILED = 'BUSH_DETAILED',
  FENCE_WOOD = 'FENCE_WOOD',
  FLOWERS_WILD = 'FLOWERS_WILD',
  FLOWERS_BLUE = 'FLOWERS_BLUE',
  ROCK_BOULDER = 'ROCK_BOULDER',
  SIGNPOST = 'SIGNPOST',
  CRATE = 'CRATE',
  // Kingdom Capital Props & Buildings
  FOUNTAIN = 'FOUNTAIN',
  STREET_LAMP = 'STREET_LAMP',
  STREET_LAMP_ALT = 'STREET_LAMP_ALT',
  MARKET_STALL_RED = 'MARKET_STALL_RED',
  MARKET_STALL_BLUE = 'MARKET_STALL_BLUE',
  BARRELS_STACK = 'BARRELS_STACK',
  BARREL_SINGLE = 'BARREL_SINGLE',
  CRATE_STACK = 'CRATE_STACK',
  BENCH_WOOD = 'BENCH_WOOD',
  SHOP_HOUSE_1 = 'SHOP_HOUSE_1',
  SHOP_HOUSE_2 = 'SHOP_HOUSE_2',
  SHOP_HOUSE_3 = 'SHOP_HOUSE_3',
  MANOR_HOUSE = 'MANOR_HOUSE',
  GUILD_HALL = 'GUILD_HALL',
  TREE_GRAND_OAK = 'TREE_GRAND_OAK',
  TREE_LUSH_PINE = 'TREE_LUSH_PINE',
  TREE_TOWN_GREEN = 'TREE_TOWN_GREEN',
  BUSH_FLOWERING = 'BUSH_FLOWERING',
  BUSH_ROUND = 'BUSH_ROUND',
  PORTAL_OVERWORLD = 'PORTAL_OVERWORLD',
}

export interface BillboardPropData {
  id: string;
  type: PropType;
  gridX: number;
  gridZ: number;
  width: number;
  height: number;
  footprintWidth: number; // in grid cells
  footprintDepth: number; // in grid cells
  walkable: boolean;
}

export interface VoxelCell {
  x: number;
  z: number;
  height: number;
  walkable: boolean;
  type: TileType;
  prop?: BillboardPropData;
}

export interface MoveIntentPayload {
  direction: Direction;
  secondaryDirection?: Direction;
  source: 'keyboard' | 'touch' | 'script';
}

export interface PlayerMovedPayload {
  from: GridPos;
  to: GridPos;
  worldPos: WorldPos;
}

export type FloatingTextStyle = 'damage' | 'crit' | 'magic' | 'player_damage' | 'heal' | 'miss' | 'gold';

export interface FloatingTextPayload {
  text: string;
  worldPos: WorldPos;
  style?: FloatingTextStyle;
  isCrit?: boolean;
}

export type EquipmentSlot = 'weapon' | 'armor' | 'helm' | 'boots' | 'ring' | 'amulet' | 'accessory';

export type ItemRarity = 'common' | 'magic' | 'rare' | 'epic' | 'legendary';

export interface ItemAffix {
  id: string;
  name: string;
  type: 'prefix' | 'suffix';
  tier?: number;
  stats: {
    attack?: number;
    defense?: number;
    maxHp?: number;
    critChance?: number; // e.g. 0.05 = +5%
    critDamage?: number; // e.g. 0.25 = +25%
    lifeSteal?: number; // e.g. 0.04 = +4%
    speedBonus?: number;
    bonusExp?: number;
  };
  flavor?: string;
}

export interface Item {
  id: string;
  name: string;
  baseId?: string;
  baseName?: string;
  slot: EquipmentSlot | 'consumable';
  rarity?: ItemRarity;
  itemLevel?: number;
  prefix?: ItemAffix;
  suffix?: ItemAffix;
  extraAffixes?: ItemAffix[];
  statMods?: {
    attack?: number;
    defense?: number;
    maxHp?: number;
    critChance?: number;
    critDamage?: number;
    lifeSteal?: number;
    speedBonus?: number;
    bonusExp?: number;
  };
  healAmount?: number;
  manaAmount?: number;
  icon?: string;
  description?: string;
  value?: number; // Gold value
  stackCount?: number;
}

export interface CharacterStats {
  level: number;
  currentExp: number;
  maxExp: number;
  skillPoints: number;
  currentHp: number;
  maxHp: number;
  baseAttack: number;
  totalAttack: number;
  baseDefense: number;
  totalDefense: number;
  critChance: number; // 0.05 = 5%
  critDamage: number; // 1.5 = 150%
  lifeSteal: number; // 0.05 = 5%
  moveSpeedMod: number; // 1.0 = 100%
  bonusExpMod: number; // 1.0 = 100%
  gold: number;
}

export interface SkillNode {
  id: string;
  name: string;
  description: string;
  branch: 'warrior' | 'guardian' | 'shadow' | 'mystic';
  tier: number;
  cost: number;
  prerequisites: string[]; // Directed graph edges (IDs of prerequisite nodes)
  unlocked: boolean;
  icon: string;
  position: { x: number; y: number }; // Relative coordinate in graph grid (0-100)
  modifiers: {
    attack?: number;
    defense?: number;
    maxHp?: number;
    critChance?: number;
    critDamage?: number;
    lifeSteal?: number;
    speedBonus?: number;
    bonusExp?: number;
  };
}

// Event Bus Map
export interface EngineEvents {
  'player:died': { x: number; z: number };
  'player:recovered_body': Record<string, never>;
  'input:move_intent': MoveIntentPayload;
  'input:interact': Record<string, never>;
  'input:toggle_map': Record<string, never>;
  'player:move_start': { from: GridPos; to: GridPos; direction: Direction };
  'player:move_step': { currentWorldPos: WorldPos; progress: number };
  'player:move_complete': PlayerMovedPayload;
  'player:exit_map': Record<string, never>;
  'player:fast_travel': { overworldX: number; overworldZ: number; poiType: string; name?: string };
  'player:move_blocked': { targetPos: GridPos; reason: string };
  'portal:near': { near: boolean; portalPos?: GridPos; portalName?: string; poiType?: string };
  'overworld:encounter_start': any;
  'overworld:encounter_end': Record<string, never>;
  'overworld:resolve_encounter': 'fight' | 'flee' | 'claim';
  'inventory:add_gold': number;
  'world:grid_updated': { x: number; z: number; cell: VoxelCell };
  'camera:updated': { position: WorldPos; target: WorldPos };
  'engine:state_changed': { state: 'LOADING' | 'READY' | 'PAUSED' | 'RUNNING' };
  'combat:player_attack': { hit: boolean; damage: number; enemyName?: string; targetPos: GridPos; isCritical?: boolean };
  'combat:projectile_fired': { from: GridPos; direction: Direction };
  'combat:attack_intent': { targetPos: GridPos; isPlayer: boolean };
  'combat:player_dash': { from: GridPos; to: GridPos };
  'combat:player_damaged': { amount: number; currentHp: number; maxHp: number; worldPos?: WorldPos };
  'combat:player_healed': { amount: number; currentHp: number; maxHp: number; worldPos?: WorldPos };
  'combat:enemy_damaged': {
    enemyId: string;
    name: string;
    amount: number;
    worldPos: WorldPos;
    isCritical?: boolean;
    isMagic?: boolean;
  };
  'combat:enemy_defeated': { enemyId: string; name: string; worldPos?: WorldPos; enemyType?: string };
  'combat:floating_text': FloatingTextPayload;
  'quest:updated': { questId: string; status: 'not_started' | 'in_progress' | 'completed' };
  'dialogue:start': { npcName: string; lines: string[]; questId?: string };
  'inventory:updated': {
    inventory: (Item | null)[];
    equipped: Record<EquipmentSlot, Item | null>;
    gold: number;
    gems?: number;
    energy?: number;
    maxEnergy?: number;
  };
  'stats:recalculated': CharacterStats;
  'skills:tree_updated': { nodes: SkillNode[]; availablePoints: number };
  'loot:dropped': { item: Item; gold?: number; worldPos?: WorldPos };
  'progression:level_up': { newLevel: number; skillPointsGained: number };
  'shop:open': ShopOpenPayload;
}

export interface ShopItem {
  id: string;
  name: string;
  price: number;
  item: Item;
}

export interface ShopOpenPayload {
  shopName: string;
  npcName: string;
  items: ShopItem[];
}

export interface QuestObjective {
  type: 'reach_location' | 'defeat_enemy';
  targetId?: string;
  mapName?: string;
  count?: number;
  currentCount?: number;
  targetPos?: GridPos;
}

export interface Quest {
  id: string;
  title: string;
  giver: string;
  description: string;
  objective: QuestObjective;
  reward: Item;
  status: 'not_started' | 'in_progress' | 'completed';
}
