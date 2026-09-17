import { globalEventBus } from '../core/EventBus';
import { GameEngine } from '../core/GameEngine';
import { LocalMapGenerator } from '../world/LocalMapGenerator';
import { TileType } from '../types';

export interface OverworldEncounter {
  id: string;
  title: string;
  description: string;
  biome: string;
  type: 'combat' | 'treasure' | 'rest';
  reward?: { gold: number; exp: number };
}

export class OverworldManager {
  private engine: GameEngine;
  private inOverworld: boolean = false;
  private lastOverworldPos: { x: number; z: number } = { x: 32, z: 28 };
  private wildernessSteps: number = 0;
  private nextEncounterAt: number = 14;
  private activeEncounter: OverworldEncounter | null = null;
  private currentNearbyPOI: { type: string; name: string; x: number; z: number } | null = null;

  constructor(engine: GameEngine) {
    this.engine = engine;

    globalEventBus.on('player:fast_travel', (payload: any) => {
      const targetX = payload.overworldX ?? 32;
      const targetZ = payload.overworldZ ?? 28;
      this.lastOverworldPos = { x: targetX, z: targetZ };

      if (payload.poiType === 'OVERWORLD_MAP') {
        if (!this.inOverworld) {
          this.loadOverworld();
        } else {
          this.engine.teleportPlayerTo(targetX, targetZ);
        }
      } else {
        this.enterLocalMap(targetX, targetZ, payload.poiType, payload.name);
      }
    });

    globalEventBus.on('player:exit_map', () => {
      if (!this.inOverworld) {
        this.loadOverworld();
      }
    });

    globalEventBus.on('input:toggle_map', () => {
      // Toggle logic or handled by UI
    });

    globalEventBus.on('input:interact', () => {
      this.handleInteraction();
    });

    globalEventBus.on('player:move_complete', (payload) => {
      const px = payload.to.x;
      const pz = payload.to.z;

      if (this.inOverworld) {
        this.checkOverworldProximity(px, pz);
        this.checkWildernessEncounter(px, pz);
      } else {
        this.checkLocalPortalProximity(px, pz);
      }
    });

    globalEventBus.on('overworld:resolve_encounter', (action: 'fight' | 'flee' | 'claim') => {
      this.resolveEncounter(action);
    });
  }

  public isInOverworld(): boolean {
    return this.inOverworld;
  }

  // -------------------------------------------------------------
  // PROXIMITY DETECTION
  // -------------------------------------------------------------
  private checkOverworldProximity(px: number, pz: number) {
    const props = this.engine.multiChunkWorld.billboardSystem.getProps();
    const poi = props.find((p) => {
      const isPoi =
        p.type.startsWith('TOWN_') ||
        p.type === 'CAVE_ENTRANCE' ||
        p.type === 'WINDMILL' ||
        p.type === 'BUSH_BERRY';
      if (!isPoi) return false;
      return Math.abs(p.gridX - px) <= 2 && Math.abs(p.gridZ - pz) <= 2;
    });

    if (poi) {
      const poiName = (poi as any).name || this.getPoiDisplayName(poi.type);
      this.currentNearbyPOI = {
        type: poi.type,
        name: poiName,
        x: poi.gridX,
        z: poi.gridZ,
      };

      globalEventBus.emit('portal:near', {
        near: true,
        portalPos: { x: poi.gridX, z: poi.gridZ },
        portalName: `Entrar a: ${poiName}`,
        poiType: poi.type,
      });
    } else {
      this.currentNearbyPOI = null;
      globalEventBus.emit('portal:near', { near: false });
    }
  }

  private checkLocalPortalProximity(px: number, pz: number) {
    const props = this.engine.multiChunkWorld.billboardSystem.getProps();
    const portal = props.find((p) => {
      if (p.type !== 'PORTAL_OVERWORLD' && !p.type.includes('PORTAL')) return false;
      return Math.abs(p.gridX - px) <= 2 && Math.abs(p.gridZ - pz) <= 2;
    });

    if (portal) {
      globalEventBus.emit('portal:near', {
        near: true,
        portalPos: { x: portal.gridX, z: portal.gridZ },
        portalName: 'Portal al Mapamundi de Argentum (Pulsa [E])',
      });
    } else {
      globalEventBus.emit('portal:near', { near: false });
    }
  }

  // -------------------------------------------------------------
  // WILDERNESS ENCOUNTER LOGIC (OPTION 3 HYBRID)
  // -------------------------------------------------------------
  private checkWildernessEncounter(px: number, pz: number) {
    if (this.activeEncounter) return;

    const cell = this.engine.multiChunkWorld.grid.getCell(px, pz);
    if (!cell) return;

    // Roads (PATH) are safe trade highways with no encounters
    if (cell.type === TileType.PATH) {
      this.wildernessSteps = Math.max(0, this.wildernessSteps - 1);
      return;
    }

    // Wilderness steps (GRASS, DIRT, SNOW, SAND)
    this.wildernessSteps++;

    if (this.wildernessSteps >= this.nextEncounterAt) {
      this.wildernessSteps = 0;
      this.nextEncounterAt = 12 + Math.floor(Math.random() * 8); // 12-20 steps
      this.triggerEncounter(cell.type, px, pz);
    }
  }

  private triggerEncounter(tileType: TileType, px: number, pz: number) {
    let biomeName = 'Praderas de Argentum';
    let enemies = 'Bandidos de los Caminos';

    if (tileType === TileType.SNOW) {
      biomeName = 'Picos Nevados del Norte';
      enemies = 'Gólems de Hielo y Lobos Glaciales';
    } else if (tileType === TileType.DIRT) {
      biomeName = 'Tierras Olvidadas de Eldoria';
      enemies = 'Esqueletos Guerreros y Espectros';
    } else if (tileType === TileType.SAND) {
      biomeName = 'Costa y Playas de Coral';
      enemies = 'Corsarios y Criaturas Marinas';
    } else if (tileType === TileType.STONE) {
      biomeName = 'Canteras Rocosas de Mithril';
      enemies = 'Trolls de las Cavernas';
    }

    const roll = Math.random();
    let encounter: OverworldEncounter;

    if (roll < 0.65) {
      // Combat encounter
      encounter = {
        id: `enc_${Date.now()}`,
        title: `¡Emboscada en ${biomeName}!`,
        description: `Un grupo de ${enemies} ha salido de la espesura interceptando tu camino.`,
        biome: biomeName,
        type: 'combat',
        reward: { gold: 40 + Math.floor(Math.random() * 60), exp: 50 },
      };
    } else if (roll < 0.85) {
      // Treasure cache
      encounter = {
        id: `enc_${Date.now()}`,
        title: `¡Cofre Perdido del Viajero!`,
        description: `Entre las rocas y matorrales divisas un cofre de suministros abandonado por exploradores.`,
        biome: biomeName,
        type: 'treasure',
        reward: { gold: 75 + Math.floor(Math.random() * 50), exp: 25 },
      };
    } else {
      // Rest camp / shrine
      encounter = {
        id: `enc_${Date.now()}`,
        title: `¡Hoguera y Santuario de Descanso!`,
        description: `Encuentras un campamento protegido con brasas encendidas donde recuperas tus fuerzas.`,
        biome: biomeName,
        type: 'rest',
        reward: { gold: 20, exp: 30 },
      };
    }

    this.activeEncounter = encounter;
    globalEventBus.emit('overworld:encounter_start', encounter);
  }

  private resolveEncounter(action: 'fight' | 'flee' | 'claim') {
    if (!this.activeEncounter) return;

    const enc = this.activeEncounter;
    this.activeEncounter = null;

    if (action === 'fight' || action === 'claim') {
      const gold = enc.reward?.gold || 50;
      const exp = enc.reward?.exp || 30;

      globalEventBus.emit('combat:floating_text', {
        text: action === 'fight' ? `¡Victoria! +${gold}G +${exp}XP` : `+${gold} Oro Encontrado`,
        worldPos: this.engine.player.position.getWorldPos(),
        style: 'crit',
        isCrit: true,
      });

      // Grant gold through event
      globalEventBus.emit('inventory:add_gold', gold);
    } else {
      globalEventBus.emit('combat:floating_text', {
        text: '¡Escapaste ileso al sendero!',
        worldPos: this.engine.player.position.getWorldPos(),
        style: 'heal',
        isCrit: false,
      });
    }

    globalEventBus.emit('overworld:encounter_end', {});
  }

  // -------------------------------------------------------------
  // MAP TRANSITIONS
  // -------------------------------------------------------------
  public async loadOverworld() {
    this.inOverworld = true;
    this.activeEncounter = null;
    globalEventBus.emit('portal:near', { near: false });

    try {
      // Switch texture palette strictly to MiniWorldSprites
      this.engine.multiChunkWorld.materials.setMode('overworld');

      const resp = await fetch('/maps/overworld_map.json');
      const data = await resp.json();

      this.engine.multiChunkWorld.loadFromMapSchema(data, this.engine.renderEngine.octopathCamera.camera.quaternion);
      this.engine.renderEngine.octopathCamera.setMode('overworld', { width: data.width, depth: data.height });

      // Teleport player to last recorded overworld position (offset slightly south on road path)
      const targetPos = this.lastOverworldPos || { x: 32, z: 28 };
      const safeZ = Math.min(62, targetPos.z + 1);
      this.engine.teleportPlayerTo(targetPos.x, safeZ);

      // Cleanly despawn and remove all local enemies and projectiles from the scene
      this.engine.clearAllEnemies();

      // Hide local city NPCs in the Mapamundi
      this.engine.npcs.forEach((n) => (n.containerGroup.visible = false));

      globalEventBus.emit('combat:floating_text', {
        text: 'Continente de Argentum',
        worldPos: this.engine.player.position.getWorldPos(),
        style: 'heal',
        isCrit: false,
      });
    } catch (e) {
      console.error('Failed to load overworld', e);
    }
  }

  public async enterLocalMap(overworldX: number, overworldZ: number, poiType: string, customName?: string) {
    this.lastOverworldPos = { x: overworldX, z: overworldZ };
    this.inOverworld = false;
    this.activeEncounter = null;
    globalEventBus.emit('portal:near', { near: false });

    // Switch texture palette to Local high-res assets
    this.engine.multiChunkWorld.materials.setMode('local');

    if (poiType === 'TOWN_CASTLE') {
      // Capital de Argentum
      await this.engine.reloadDemoMap();
      this.engine.renderEngine.octopathCamera.setMode('local', { width: 256, depth: 256 });
      this.engine.teleportPlayerTo(128, 106);

      // Show City NPCs and spawn city enemies
      this.engine.npcs.forEach((n) => (n.containerGroup.visible = true));
      this.engine.spawnDefaultEnemies();

      globalEventBus.emit('combat:floating_text', {
        text: 'Capital de Argentum',
        worldPos: this.engine.player.position.getWorldPos(),
        style: 'crit',
        isCrit: false,
      });
    } else {
      // Procedurally tailored Biome Map
      const localMap = LocalMapGenerator.generateLocalMap(poiType, customName);
      this.engine.multiChunkWorld.loadFromMapSchema(localMap, this.engine.renderEngine.octopathCamera.camera.quaternion);
      this.engine.renderEngine.octopathCamera.setMode('local', { width: localMap.width, depth: localMap.height });
      this.engine.teleportPlayerTo(localMap.playerSpawn.x, localMap.playerSpawn.z);

      // Hide Capital NPCs in other local maps and spawn local POI NPC
      this.engine.npcs.forEach((n) => (n.containerGroup.visible = false));
      this.engine.spawnLocalPoiNpc(poiType);

      // Spawns thematic enemies for hostile POIs (ruins/caves), keep peaceful POIs safe
      if (poiType === 'TOWN_RUINS' || poiType === 'TOWN_CAVE') {
        this.engine.spawnThematicEnemies(poiType);
      } else {
        this.engine.clearAllEnemies();
      }

      globalEventBus.emit('combat:floating_text', {
        text: localMap.name,
        worldPos: this.engine.player.position.getWorldPos(),
        style: 'crit',
        isCrit: false,
      });
    }
  }

  private handleInteraction() {
    if (this.inOverworld) {
      if (this.currentNearbyPOI) {
        this.enterLocalMap(
          this.currentNearbyPOI.x,
          this.currentNearbyPOI.z,
          this.currentNearbyPOI.type,
          this.currentNearbyPOI.name
        );
      }
      return;
    }

    // In local map: check if standing near an exit portal
    const pos = this.engine.player.position;
    const px = pos.gridX;
    const pz = pos.gridZ;
    const props = this.engine.multiChunkWorld.billboardSystem.getProps();
    const portal = props.find(
      (p) =>
        (p.type === 'PORTAL_OVERWORLD' || p.type.includes('PORTAL')) &&
        Math.abs(p.gridX - px) <= 2 &&
        Math.abs(p.gridZ - pz) <= 2
    );

    if (portal) {
      this.loadOverworld();
    }
  }

  private getPoiDisplayName(type: string): string {
    switch (type) {
      case 'TOWN_CASTLE':
        return 'Capital de Argentum';
      case 'TOWN_VILLAGE':
        return 'Aldea del Viento';
      case 'TOWN_FARM':
      case 'WINDMILL':
        return 'Granja de Oakhaven';
      case 'TOWN_TEMPLE':
        return 'Santuario del Invierno';
      case 'TOWN_LUMBERMILL':
        return 'Bosque de los Susurros';
      case 'TOWN_RUINS':
        return 'Ruinas Antiguas de Eldoria';
      case 'TOWN_PORT':
        return 'Puerto Mareas';
      case 'TOWN_CAVE':
      case 'CAVE_ENTRANCE':
        return 'Minas de Mithril';
      default:
        return 'Punto de Interés';
    }
  }
}
