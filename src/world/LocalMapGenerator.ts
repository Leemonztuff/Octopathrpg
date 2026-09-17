export interface LocalBillboardData {
  id?: string;
  type: string;
  gridX: number;
  gridZ: number;
  width?: number;
  height?: number;
  footprintWidth?: number;
  footprintDepth?: number;
  walkable?: boolean;
  name?: string;
}

export interface LocalMapData {
  width: number;
  height: number;
  voxels: Record<string, { height: number; type: string }>;
  billboards: LocalBillboardData[];
  playerSpawn: { x: number; z: number };
  poiType: string;
  name: string;
  description: string;
}

export class LocalMapGenerator {
  /**
   * Generates a rich, biome-tailored local map based on the POI type.
   */
  public static generateLocalMap(poiType: string, customName?: string): LocalMapData {
    switch (poiType) {
      case 'TOWN_VILLAGE':
        return this.createVillageMap(customName || 'Aldea del Viento');
      case 'TOWN_FARM':
        return this.createFarmMap(customName || 'Granja de Oakhaven');
      case 'TOWN_TEMPLE':
        return this.createTempleMap(customName || 'Santuario del Invierno');
      case 'TOWN_RUINS':
        return this.createRuinsMap(customName || 'Ruinas Antiguas de Eldoria');
      case 'TOWN_PORT':
        return this.createPortMap(customName || 'Puerto Mareas y Playa Coral');
      case 'TOWN_CAVE':
      case 'CAVE_ENTRANCE':
        return this.createCaveMap(customName || 'Minas de Mithril');
      case 'TOWN_LUMBERMILL':
      default:
        return this.createForestLumbermillMap(customName || 'Bosque de los Susurros');
    }
  }

  // -------------------------------------------------------------
  // 1. ALDEA DEL VIENTO (Village)
  // -------------------------------------------------------------
  private static createVillageMap(name: string): LocalMapData {
    const width = 48;
    const height = 48;
    const voxels: Record<string, { height: number; type: string }> = {};
    const billboards: LocalBillboardData[] = [];

    // Base terrain: lush grass with gentle perimeter hills
    for (let x = 0; x < width; x++) {
      for (let z = 0; z < height; z++) {
        const isBorder = x <= 2 || x >= width - 3 || z <= 2 || z >= height - 3;
        const h = isBorder ? 2 : 1;
        voxels[`${x},${z}`] = { height: h, type: isBorder ? 'STONE' : 'GRASS' };
      }
    }

    // Cobblestone Main Street & Village Plaza
    for (let z = 10; z <= 42; z++) {
      for (let x = 22; x <= 25; x++) {
        voxels[`${x},${z}`] = { height: 1, type: 'STONE_COBBLE' };
      }
    }
    // Village Square
    for (let x = 16; x <= 31; x++) {
      for (let z = 18; z <= 28; z++) {
        voxels[`${x},${z}`] = { height: 1, type: 'STONE_COBBLE' };
      }
    }

    // Central Village Well / Fountain
    billboards.push({
      id: 'village_fountain',
      type: 'FOUNTAIN',
      gridX: 23,
      gridZ: 23,
      width: 3.6,
      height: 2.8,
      footprintWidth: 3,
      footprintDepth: 3,
      walkable: false,
      name: 'Fuente del Viento',
    });

    // Street Lamps
    billboards.push({ id: 'lamp_1', type: 'STREET_LAMP', gridX: 20, gridZ: 19, width: 1.2, height: 2.5, walkable: false });
    billboards.push({ id: 'lamp_2', type: 'STREET_LAMP', gridX: 27, gridZ: 19, width: 1.2, height: 2.5, walkable: false });
    billboards.push({ id: 'lamp_3', type: 'STREET_LAMP', gridX: 20, gridZ: 27, width: 1.2, height: 2.5, walkable: false });
    billboards.push({ id: 'lamp_4', type: 'STREET_LAMP', gridX: 27, gridZ: 27, width: 1.2, height: 2.5, walkable: false });

    // Cottages and Shops surrounding the plaza
    billboards.push({ id: 'house_tavern', type: 'SHOP_HOUSE_3', gridX: 13, gridZ: 18, width: 3.5, height: 4.8, footprintWidth: 3, footprintDepth: 3, walkable: false, name: 'Taberna del Viento' });
    billboards.push({ id: 'house_blacksmith', type: 'SHOP_HOUSE_1', gridX: 13, gridZ: 25, width: 3.5, height: 4.8, footprintWidth: 3, footprintDepth: 3, walkable: false, name: 'Herrería de Bronce' });
    billboards.push({ id: 'house_elder', type: 'MANOR_HOUSE', gridX: 22, gridZ: 12, width: 5.0, height: 5.0, footprintWidth: 4, footprintDepth: 4, walkable: false, name: 'Casa del Anciano' });
    billboards.push({ id: 'house_alchemist', type: 'SHOP_HOUSE_2', gridX: 33, gridZ: 18, width: 3.5, height: 4.8, footprintWidth: 3, footprintDepth: 3, walkable: false, name: 'Boticario' });
    billboards.push({ id: 'house_cottage', type: 'SHOP_HOUSE_1', gridX: 33, gridZ: 25, width: 3.5, height: 4.8, footprintWidth: 3, footprintDepth: 3, walkable: false });

    // Market stalls
    billboards.push({ id: 'stall_1', type: 'MARKET_STALL_RED', gridX: 18, gridZ: 21, width: 2.5, height: 2.2, walkable: false });
    billboards.push({ id: 'stall_2', type: 'MARKET_STALL_BLUE', gridX: 28, gridZ: 21, width: 2.5, height: 2.2, walkable: false });

    // Benches, barrels, crates
    billboards.push({ id: 'bench_1', type: 'BENCH_WOOD', gridX: 21, gridZ: 25, width: 1.5, height: 1.1, walkable: false });
    billboards.push({ id: 'bench_2', type: 'BENCH_WOOD', gridX: 26, gridZ: 25, width: 1.5, height: 1.1, walkable: false });
    billboards.push({ id: 'barrels_1', type: 'BARRELS_STACK', gridX: 16, gridZ: 27, width: 1.6, height: 2.0, walkable: false });
    billboards.push({ id: 'crates_1', type: 'CRATE_STACK', gridX: 31, gridZ: 27, width: 1.2, height: 1.6, walkable: false });

    // Trees & Nature around perimeter
    for (let x = 4; x < width - 4; x += 5) {
      billboards.push({ id: `tree_n_${x}`, type: 'TREE_OAK', gridX: x, gridZ: 5, width: 3.2, height: 4.2, walkable: false });
      billboards.push({ id: `tree_s_${x}`, type: 'TREE_OAK', gridX: x, gridZ: 41, width: 3.2, height: 4.2, walkable: false });
    }
    for (let z = 8; z < height - 8; z += 6) {
      billboards.push({ id: `tree_w_${z}`, type: 'TREE_GRAND_OAK', gridX: 5, gridZ: z, width: 4.5, height: 5.5, walkable: false });
      billboards.push({ id: `tree_e_${z}`, type: 'TREE_LUSH_PINE', gridX: 41, gridZ: z, width: 3.5, height: 5.0, walkable: false });
    }

    // Portal back to Overworld at South Gate
    billboards.push({
      id: 'portal_exit',
      type: 'PORTAL_OVERWORLD',
      gridX: 23,
      gridZ: 43,
      width: 3.6,
      height: 4.8,
      footprintWidth: 2,
      footprintDepth: 2,
      walkable: true,
      name: 'Portal al Mapamundi de Argentum',
    });
    billboards.push({ id: 'exit_sign', type: 'SIGNPOST', gridX: 26, gridZ: 42, width: 1.0, height: 1.0, walkable: false, name: 'Hacia el Continente' });

    return {
      width,
      height,
      voxels,
      billboards,
      playerSpawn: { x: 23, z: 40 },
      poiType: 'TOWN_VILLAGE',
      name,
      description: 'Una acogedora aldea de montaña rodeada de colinas verdes y senderos adoquinados.',
    };
  }

  // -------------------------------------------------------------
  // 2. GRANJA DE OAKHAVEN (Farm)
  // -------------------------------------------------------------
  private static createFarmMap(name: string): LocalMapData {
    const width = 48;
    const height = 48;
    const voxels: Record<string, { height: number; type: string }> = {};
    const billboards: LocalBillboardData[] = [];

    for (let x = 0; x < width; x++) {
      for (let z = 0; z < height; z++) {
        voxels[`${x},${z}`] = { height: 1, type: 'GRASS' };
      }
    }

    // Dirt Paths
    for (let z = 6; z <= 42; z++) {
      voxels[`23,${z}`] = { height: 1, type: 'DIRT' };
      voxels[`24,${z}`] = { height: 1, type: 'DIRT' };
    }
    for (let x = 10; x <= 38; x++) {
      voxels[`${x},24`] = { height: 1, type: 'DIRT' };
      voxels[`${x},25`] = { height: 1, type: 'DIRT' };
    }

    // Water Irrigation Canal
    for (let z = 8; z <= 40; z++) {
      voxels[`38,${z}`] = { height: 0, type: 'WATER' };
      voxels[`39,${z}`] = { height: 0, type: 'WATER' };
    }
    // Bridge across canal
    voxels['38,24'] = { height: 1, type: 'PATH' };
    voxels['39,24'] = { height: 1, type: 'PATH' };
    voxels['38,25'] = { height: 1, type: 'PATH' };
    voxels['39,25'] = { height: 1, type: 'PATH' };

    // Wheat Fields (West Quadrants)
    for (let x = 6; x <= 20; x += 2) {
      for (let z = 8; z <= 20; z += 2) {
        billboards.push({ id: `wheat_nw_${x}_${z}`, type: 'WHEATFIELD', gridX: x, gridZ: z, width: 1.2, height: 1.2, walkable: true });
      }
    }
    for (let x = 6; x <= 20; x += 2) {
      for (let z = 28; z <= 40; z += 2) {
        billboards.push({ id: `wheat_sw_${x}_${z}`, type: 'WHEATFIELD', gridX: x, gridZ: z, width: 1.2, height: 1.2, walkable: true });
      }
    }

    // Windmill & Silos (Northeast)
    billboards.push({ id: 'farm_windmill', type: 'WINDMILL', gridX: 30, gridZ: 14, width: 3.5, height: 4.5, footprintWidth: 3, footprintDepth: 3, walkable: false, name: 'Molino de Granos' });
    billboards.push({ id: 'farm_house', type: 'SHOP_HOUSE_1', gridX: 29, gridZ: 28, width: 3.5, height: 4.8, footprintWidth: 3, footprintDepth: 3, walkable: false, name: 'Hogar del Granjero' });

    // Fences around crops
    for (let x = 5; x <= 21; x += 2) {
      billboards.push({ id: `fence_n_${x}`, type: 'FENCE_WOOD', gridX: x, gridZ: 6, width: 1.8, height: 1.0, walkable: false });
      billboards.push({ id: `fence_mid_${x}`, type: 'FENCE_WOOD', gridX: x, gridZ: 22, width: 1.8, height: 1.0, walkable: false });
    }

    // Crates and Barrels of harvest
    billboards.push({ id: 'crates_harvest', type: 'CRATE_STACK', gridX: 26, gridZ: 26, width: 1.2, height: 1.6, walkable: false });
    billboards.push({ id: 'barrels_water', type: 'BARRELS_STACK', gridX: 26, gridZ: 29, width: 1.6, height: 2.0, walkable: false });

    // Portal at South Path
    billboards.push({
      id: 'portal_exit',
      type: 'PORTAL_OVERWORLD',
      gridX: 23,
      gridZ: 43,
      width: 3.6,
      height: 4.8,
      footprintWidth: 2,
      footprintDepth: 2,
      walkable: true,
      name: 'Portal al Mapamundi de Argentum',
    });

    return {
      width,
      height,
      voxels,
      billboards,
      playerSpawn: { x: 23, z: 40 },
      poiType: 'TOWN_FARM',
      name,
      description: 'Campos dorados de trigo y molinos rústicos bañados por canales de agua fresca.',
    };
  }

  // -------------------------------------------------------------
  // 3. SANTUARIO DEL INVIERNO (Temple / Snow Biome)
  // -------------------------------------------------------------
  private static createTempleMap(name: string): LocalMapData {
    const width = 48;
    const height = 48;
    const voxels: Record<string, { height: number; type: string }> = {};
    const billboards: LocalBillboardData[] = [];

    // All ground is pure SNOW with mountain peaks
    for (let x = 0; x < width; x++) {
      for (let z = 0; z < height; z++) {
        const distFromCenter = Math.hypot(x - 23, z - 23);
        const isMountain = x <= 3 || x >= width - 4 || z <= 3;
        const h = isMountain ? 3 : (distFromCenter < 12 ? 2 : 1);
        voxels[`${x},${z}`] = { height: h, type: isMountain ? 'STONE' : 'SNOW' };
      }
    }

    // Grand Ceremonial Cobblestone Path & Courtyard
    for (let z = 12; z <= 42; z++) {
      for (let x = 22; x <= 25; x++) {
        voxels[`${x},${z}`] = { height: 2, type: 'STONE_COBBLE' };
      }
    }
    for (let x = 16; x <= 31; x++) {
      for (let z = 10; z <= 24; z++) {
        voxels[`${x},${z}`] = { height: 2, type: 'STONE_COBBLE' };
      }
    }

    // Sacred Altar and Chapel
    billboards.push({
      id: 'temple_chapel',
      type: 'TOWN_TEMPLE',
      gridX: 22,
      gridZ: 12,
      width: 4.5,
      height: 4.5,
      footprintWidth: 4,
      footprintDepth: 4,
      walkable: false,
      name: 'Gran Santuario del Invierno',
    });

    // Sacred Pillars and Braziers
    billboards.push({ id: 'pillar_1', type: 'STREET_LAMP', gridX: 18, gridZ: 14, width: 1.2, height: 2.5, walkable: false });
    billboards.push({ id: 'pillar_2', type: 'STREET_LAMP', gridX: 29, gridZ: 14, width: 1.2, height: 2.5, walkable: false });
    billboards.push({ id: 'pillar_3', type: 'STREET_LAMP', gridX: 18, gridZ: 22, width: 1.2, height: 2.5, walkable: false });
    billboards.push({ id: 'pillar_4', type: 'STREET_LAMP', gridX: 29, gridZ: 22, width: 1.2, height: 2.5, walkable: false });

    // Winter Trees & Frozen Boulders
    for (let x = 6; x < width - 6; x += 6) {
      billboards.push({ id: `wtree_1_${x}`, type: 'TREE_WINTER', gridX: x, gridZ: 8, width: 2.4, height: 3.4, walkable: false });
      billboards.push({ id: `wtree_2_${x}`, type: 'TREE_WINTER', gridX: x, gridZ: 36, width: 2.4, height: 3.4, walkable: false });
    }
    for (let z = 10; z < height - 10; z += 5) {
      billboards.push({ id: `rock_w_${z}`, type: 'ROCK_BOULDER', gridX: 8, gridZ: z, width: 1.5, height: 1.2, walkable: false });
      billboards.push({ id: `rock_e_${z}`, type: 'ROCK_BOULDER', gridX: 39, gridZ: z, width: 1.5, height: 1.2, walkable: false });
    }

    // Portal at southern entrance
    billboards.push({
      id: 'portal_exit',
      type: 'PORTAL_OVERWORLD',
      gridX: 23,
      gridZ: 43,
      width: 3.6,
      height: 4.8,
      footprintWidth: 2,
      footprintDepth: 2,
      walkable: true,
      name: 'Portal al Mapamundi de Argentum',
    });

    return {
      width,
      height,
      voxels,
      billboards,
      playerSpawn: { x: 23, z: 40 },
      poiType: 'TOWN_TEMPLE',
      name,
      description: 'Un templo sagrado cubierto de nieves eternas en las cumbres del norte.',
    };
  }

  // -------------------------------------------------------------
  // 4. RUINAS ANTIGUAS DE ELDORIA (Crypt / Ruins Biome)
  // -------------------------------------------------------------
  private static createRuinsMap(name: string): LocalMapData {
    const width = 48;
    const height = 48;
    const voxels: Record<string, { height: number; type: string }> = {};
    const billboards: LocalBillboardData[] = [];

    // Dark barren dirt plateau with ruined stone walls
    for (let x = 0; x < width; x++) {
      for (let z = 0; z < height; z++) {
        const isBorder = x <= 2 || x >= width - 3 || z <= 2 || z >= height - 3;
        voxels[`${x},${z}`] = { height: isBorder ? 2 : 1, type: isBorder ? 'STONE' : 'DIRT' };
      }
    }

    // Broken stone plazas
    for (let x = 14; x <= 33; x++) {
      for (let z = 12; z <= 32; z++) {
        if ((x + z) % 3 !== 0) {
          voxels[`${x},${z}`] = { height: 1, type: 'STONE_COBBLE' };
        }
      }
    }

    // Central Mausoleum Crypt
    billboards.push({
      id: 'ruins_mausoleum',
      type: 'TOWN_RUINS',
      gridX: 22,
      gridZ: 18,
      width: 4.5,
      height: 4.5,
      footprintWidth: 4,
      footprintDepth: 4,
      walkable: false,
      name: 'Cripta Olvidada de Eldoria',
    });

    // Crumbling pillars, tombstones and ominous rocks
    billboards.push({ id: 'ruin_col_1', type: 'ROCK_BOULDER', gridX: 16, gridZ: 16, width: 2.0, height: 2.5, walkable: false });
    billboards.push({ id: 'ruin_col_2', type: 'ROCK_BOULDER', gridX: 31, gridZ: 16, width: 2.0, height: 2.5, walkable: false });
    billboards.push({ id: 'ruin_col_3', type: 'ROCK_BOULDER', gridX: 16, gridZ: 28, width: 2.0, height: 2.5, walkable: false });
    billboards.push({ id: 'ruin_col_4', type: 'ROCK_BOULDER', gridX: 31, gridZ: 28, width: 2.0, height: 2.5, walkable: false });

    // Weathered dead pine trees
    for (let x = 5; x < width - 5; x += 7) {
      billboards.push({ id: `dead_tree_${x}`, type: 'TREE_PINE', gridX: x, gridZ: 6, width: 2.8, height: 3.8, walkable: false });
      billboards.push({ id: `dead_tree_s_${x}`, type: 'TREE_PINE', gridX: x, gridZ: 38, width: 2.8, height: 3.8, walkable: false });
    }

    // Portal back to Overworld
    billboards.push({
      id: 'portal_exit',
      type: 'PORTAL_OVERWORLD',
      gridX: 23,
      gridZ: 43,
      width: 3.6,
      height: 4.8,
      footprintWidth: 2,
      footprintDepth: 2,
      walkable: true,
      name: 'Portal al Mapamundi de Argentum',
    });

    return {
      width,
      height,
      voxels,
      billboards,
      playerSpawn: { x: 23, z: 40 },
      poiType: 'TOWN_RUINS',
      name,
      description: 'Restos de una antigua civilización con criptas sagradas y piedras milenarias.',
    };
  }

  // -------------------------------------------------------------
  // 5. PUERTO MAREAS Y PLAYA CORAL (Port / Coastal Biome)
  // -------------------------------------------------------------
  private static createPortMap(name: string): LocalMapData {
    const width = 48;
    const height = 48;
    const voxels: Record<string, { height: number; type: string }> = {};
    const billboards: LocalBillboardData[] = [];

    // North half: sandy coast and docks (height 1, SAND / PATH)
    // South half: vast blue ocean (height 0, WATER)
    for (let x = 0; x < width; x++) {
      for (let z = 0; z < height; z++) {
        if (z < 20) {
          voxels[`${x},${z}`] = { height: 1, type: 'SAND' };
        } else if (z < 24) {
          voxels[`${x},${z}`] = { height: 0.5, type: 'SAND' };
        } else {
          voxels[`${x},${z}`] = { height: 0, type: 'WATER' };
        }
      }
    }

    // Wooden Piers & Boardwalk extending far into the sea
    for (let z = 12; z <= 38; z++) {
      for (let x = 22; x <= 25; x++) {
        voxels[`${x},${z}`] = { height: 1, type: 'PATH' };
      }
    }
    // Cross Pier
    for (let x = 12; x <= 35; x++) {
      for (let z = 30; z <= 32; z++) {
        voxels[`${x},${z}`] = { height: 1, type: 'PATH' };
      }
    }

    // Moored sailing ships and boats in the water
    billboards.push({ id: 'boat_1', type: 'BOAT', gridX: 10, gridZ: 31, width: 2.5, height: 1.8, walkable: false, name: 'Gaviota Plateada' });
    billboards.push({ id: 'boat_2', type: 'BOAT', gridX: 37, gridZ: 31, width: 2.5, height: 1.8, walkable: false, name: 'Viento del Sur' });
    billboards.push({ id: 'boat_3', type: 'BOAT', gridX: 23, gridZ: 40, width: 2.5, height: 1.8, walkable: false, name: 'Bergantín Real' });

    // Harbor Master Office and Seaside Tavern on shore
    billboards.push({ id: 'port_tavern', type: 'SHOP_HOUSE_3', gridX: 14, gridZ: 10, width: 3.5, height: 4.8, footprintWidth: 3, footprintDepth: 3, walkable: false, name: 'Taverna del Marinero' });
    billboards.push({ id: 'port_master', type: 'SHOP_HOUSE_1', gridX: 31, gridZ: 10, width: 3.5, height: 4.8, footprintWidth: 3, footprintDepth: 3, walkable: false, name: 'Capitanía de Puerto' });

    // Coconut Palms along the coastline
    for (let x = 4; x < width - 4; x += 6) {
      billboards.push({ id: `palm_${x}`, type: 'TREE_PALM', gridX: x, gridZ: 16, width: 2.4, height: 3.2, walkable: false });
    }

    // Cargo Crates and Fish Barrels on piers
    billboards.push({ id: 'pier_crates_1', type: 'CRATE_STACK', gridX: 20, gridZ: 22, width: 1.2, height: 1.6, walkable: false });
    billboards.push({ id: 'pier_barrels_1', type: 'BARRELS_STACK', gridX: 27, gridZ: 22, width: 1.6, height: 2.0, walkable: false });

    // Portal back to Overworld at north road entrance
    billboards.push({
      id: 'portal_exit',
      type: 'PORTAL_OVERWORLD',
      gridX: 23,
      gridZ: 4,
      width: 3.6,
      height: 4.8,
      footprintWidth: 2,
      footprintDepth: 2,
      walkable: true,
      name: 'Portal al Mapamundi de Argentum',
    });

    return {
      width,
      height,
      voxels,
      billboards,
      playerSpawn: { x: 23, z: 8 },
      poiType: 'TOWN_PORT',
      name,
      description: 'Un vibrante puerto marítimo con muelles de madera sobre aguas cristalinas y brisa marina.',
    };
  }

  // -------------------------------------------------------------
  // 6. MINAS DE MITHRIL (Cavern Biome)
  // -------------------------------------------------------------
  private static createCaveMap(name: string): LocalMapData {
    const width = 48;
    const height = 48;
    const voxels: Record<string, { height: number; type: string }> = {};
    const billboards: LocalBillboardData[] = [];

    // High rocky cavern walls surrounding open mining chambers
    for (let x = 0; x < width; x++) {
      for (let z = 0; z < height; z++) {
        const isWall = x <= 3 || x >= width - 4 || z <= 3 || z >= height - 4;
        voxels[`${x},${z}`] = { height: isWall ? 3 : 1, type: 'STONE' };
      }
    }

    // Stone mining path
    for (let z = 10; z <= 42; z++) {
      voxels[`23,${z}`] = { height: 1, type: 'STONE_COBBLE' };
      voxels[`24,${z}`] = { height: 1, type: 'STONE_COBBLE' };
    }

    // Underground Spring / Lake
    for (let x = 10; x <= 18; x++) {
      for (let z = 18; z <= 26; z++) {
        voxels[`${x},${z}`] = { height: 0, type: 'WATER' };
      }
    }

    // Cavern Mine entrance structure
    billboards.push({
      id: 'cave_shaft',
      type: 'TOWN_CAVE',
      gridX: 22,
      gridZ: 14,
      width: 4.0,
      height: 4.0,
      footprintWidth: 3,
      footprintDepth: 3,
      walkable: false,
      name: 'Pozo Profundo de Mithril',
    });

    // Mining Lanterns / Braziers illuminating the caves
    billboards.push({ id: 'lantern_1', type: 'STREET_LAMP', gridX: 20, gridZ: 16, width: 1.2, height: 2.5, walkable: false });
    billboards.push({ id: 'lantern_2', type: 'STREET_LAMP', gridX: 27, gridZ: 16, width: 1.2, height: 2.5, walkable: false });
    billboards.push({ id: 'lantern_3', type: 'STREET_LAMP', gridX: 20, gridZ: 28, width: 1.2, height: 2.5, walkable: false });
    billboards.push({ id: 'lantern_4', type: 'STREET_LAMP', gridX: 27, gridZ: 28, width: 1.2, height: 2.5, walkable: false });

    // Rock piles and ore deposits
    for (let z = 12; z < height - 12; z += 6) {
      billboards.push({ id: `boulder_w_${z}`, type: 'ROCK_BOULDER', gridX: 8, gridZ: z, width: 1.8, height: 1.5, walkable: false });
      billboards.push({ id: `boulder_e_${z}`, type: 'ROCK_BOULDER', gridX: 38, gridZ: z, width: 1.8, height: 1.5, walkable: false });
    }

    // Ore crates and tool chests
    billboards.push({ id: 'crate_mine_1', type: 'CRATE_STACK', gridX: 27, gridZ: 20, width: 1.2, height: 1.6, walkable: false });
    billboards.push({ id: 'barrel_mine_1', type: 'BARREL_SINGLE', gridX: 20, gridZ: 20, width: 1.0, height: 1.1, walkable: false });

    // Portal back to Overworld
    billboards.push({
      id: 'portal_exit',
      type: 'PORTAL_OVERWORLD',
      gridX: 23,
      gridZ: 43,
      width: 3.6,
      height: 4.8,
      footprintWidth: 2,
      footprintDepth: 2,
      walkable: true,
      name: 'Portal al Mapamundi de Argentum',
    });

    return {
      width,
      height,
      voxels,
      billboards,
      playerSpawn: { x: 23, z: 40 },
      poiType: 'TOWN_CAVE',
      name,
      description: 'Profundas galerías excavadas en la roca con vetas luminiscentes de mithril puro.',
    };
  }

  // -------------------------------------------------------------
  // 7. BOSQUE DE LOS SUSURROS (Forest & Lumbermill Biome)
  // -------------------------------------------------------------
  private static createForestLumbermillMap(name: string): LocalMapData {
    const width = 48;
    const height = 48;
    const voxels: Record<string, { height: number; type: string }> = {};
    const billboards: LocalBillboardData[] = [];

    // Deep wild grass terrain
    for (let x = 0; x < width; x++) {
      for (let z = 0; z < height; z++) {
        voxels[`${x},${z}`] = { height: 1, type: 'GRASS' };
      }
    }

    // Forest River winding through
    for (let z = 0; z < height; z++) {
      const riverX = 35 + Math.floor(Math.sin(z * 0.25) * 3);
      voxels[`${riverX},${z}`] = { height: 0, type: 'WATER' };
      voxels[`${riverX + 1},${z}`] = { height: 0, type: 'WATER' };
    }
    // Wooden Footbridge over river
    voxels['34,24'] = { height: 1, type: 'PATH' };
    voxels['35,24'] = { height: 1, type: 'PATH' };
    voxels['36,24'] = { height: 1, type: 'PATH' };
    voxels['37,24'] = { height: 1, type: 'PATH' };

    // Winding Earthen Forest Trail
    for (let z = 8; z <= 42; z++) {
      voxels[`23,${z}`] = { height: 1, type: 'DIRT' };
      voxels[`24,${z}`] = { height: 1, type: 'DIRT' };
    }

    // Lumberjack Cabin and Logging Camp
    billboards.push({ id: 'lumber_cabin', type: 'SHOP_HOUSE_1', gridX: 16, gridZ: 20, width: 3.5, height: 4.8, footprintWidth: 3, footprintDepth: 3, walkable: false, name: 'Cabaña del Leñador' });
    billboards.push({ id: 'lumber_logs', type: 'BARRELS_STACK', gridX: 20, gridZ: 24, width: 1.6, height: 2.0, walkable: false });
    billboards.push({ id: 'lumber_crates', type: 'CRATE_STACK', gridX: 27, gridZ: 24, width: 1.2, height: 1.6, walkable: false });

    // Dense canopy of ancient oaks and towering pines
    for (let x = 3; x < width - 3; x += 4) {
      for (let z = 3; z < height - 3; z += 5) {
        if (Math.abs(x - 23) > 4 && x < 33) {
          const isOak = (x + z) % 2 === 0;
          billboards.push({
            id: `tree_${x}_${z}`,
            type: isOak ? 'TREE_GRAND_OAK' : 'TREE_LUSH_PINE',
            gridX: x,
            gridZ: z,
            width: isOak ? 4.5 : 3.5,
            height: isOak ? 5.5 : 5.0,
            walkable: false,
          });
        }
      }
    }

    // Wild berry bushes and flowers
    for (let z = 12; z < 36; z += 4) {
      billboards.push({ id: `bush_flower_${z}`, type: 'FLOWERS_WILD', gridX: 21, gridZ: z, width: 1.0, height: 1.0, walkable: true });
      billboards.push({ id: `bush_berry_${z}`, type: 'BUSH_FLOWERING', gridX: 26, gridZ: z, width: 1.5, height: 1.4, walkable: false });
    }

    // Portal back to Overworld
    billboards.push({
      id: 'portal_exit',
      type: 'PORTAL_OVERWORLD',
      gridX: 23,
      gridZ: 43,
      width: 3.6,
      height: 4.8,
      footprintWidth: 2,
      footprintDepth: 2,
      walkable: true,
      name: 'Portal al Mapamundi de Argentum',
    });

    return {
      width,
      height,
      voxels,
      billboards,
      playerSpawn: { x: 23, z: 40 },
      poiType: 'TOWN_LUMBERMILL',
      name,
      description: 'Un frondoso bosque ancestral con robles gigantes, arroyos y el aserradero del valle.',
    };
  }
}
