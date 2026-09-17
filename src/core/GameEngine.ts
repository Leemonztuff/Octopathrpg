import { OverworldManager } from '../overworld/OverworldManager';
import * as THREE from 'three';
import { RenderEngine } from '../renderer/RenderEngine';
import { WorldGrid } from '../world/WorldGrid';
import { VoxelMaterials } from '../world/VoxelMaterials';
import { MultiChunkWorld } from '../world/MultiChunkWorld';
import { PlayerEntity } from '../entities/PlayerEntity';
import { InputManager } from '../input/InputManager';
import { GameLoop } from './GameLoop';
import { globalEventBus } from './EventBus';
import { DebugUI } from '../ui/DebugUI';
import { MapEditor } from '../editor/MapEditor';
import { MapSerializer, MapSchemaJSON } from '../save/MapFormat';
import { SaveSystem } from '../save/SaveSystem';

import { EnemyEntity } from '../entities/EnemyEntity';
import { NpcEntity } from '../entities/NpcEntity';
import { ShopkeeperNPC } from '../entities/ShopkeeperNPC';
import { ProjectileEntity } from '../entities/ProjectileEntity';
import { ObjectPool } from './pooling/ObjectPool';
import { QuestManager } from '../quests/QuestManager';
import { DIALOGUES } from '../data/dialogues';
import { Item, GridPos, EquipmentSlot, PropType } from '../types';
import { InventorySystem } from './InventorySystem';
import { SkillTreeSystem } from './SkillTreeSystem';
import { ProgressionManager } from './ProgressionManager';
import { StatsObserver } from './StatsObserver';
import { LootGenerator } from '../data/LootTables';
import { AIDirector } from '../entities/ai/AIDirector';

export class GameEngine {
  public renderEngine: RenderEngine;
  public materials: VoxelMaterials;
  public multiChunkWorld: MultiChunkWorld;
  public player: PlayerEntity;
  public enemies: EnemyEntity[] = [];
  public npcs: NpcEntity[] = [];
  private projectiles: ProjectileEntity[] = [];
  private enemyPool: ObjectPool<EnemyEntity>;
  private projectilePool: ObjectPool<ProjectileEntity>;
  public questManager: QuestManager;
  public inventorySystem: InventorySystem;
  public overworldManager: OverworldManager;
  public skillTreeSystem: SkillTreeSystem;
  public progressionManager: ProgressionManager;
  public statsObserver: StatsObserver;
  public aiDirector!: AIDirector;
  private inputManager: InputManager;
  private gameLoop: GameLoop;
  private debugUI?: DebugUI;
  private mapEditor: MapEditor;
  private isInitialized: boolean = false;
  private static instance: GameEngine | null = null;

  public static getInstance(): GameEngine | null {
    return GameEngine.instance;
  }

  constructor(container: HTMLElement) {
    GameEngine.instance = this;
    // 1. Setup 3D Renderer & Camera
    this.renderEngine = new RenderEngine(container);

    // 2. Setup Multi-Chunk Voxel World & Props
    this.materials = new VoxelMaterials();
    this.multiChunkWorld = new MultiChunkWorld(this.materials);
    this.renderEngine.scene.add(this.multiChunkWorld.group);

    const camQuad = this.renderEngine.octopathCamera.camera.quaternion;

    // 3. Setup Player Entity (start at Plaza Mayor promenade x=15, z=18)
    this.player = new PlayerEntity(
      'player_hero',
      128,
      128,
      this.multiChunkWorld.grid,
      this.materials
    );
    this.renderEngine.scene.add(this.player.containerGroup);

    // Setup pools for enemies and projectiles to eliminate GC spikes
    this.enemyPool = new ObjectPool<EnemyEntity>(
      () => {
        const enemy = new EnemyEntity(
          `enemy_${Math.random().toString(36).substring(2, 9)}`,
          0,
          0,
          this.multiChunkWorld.grid,
          this.materials,
          'Slime Maligno',
          60
        );
        return enemy;
      }
    );

    this.projectilePool = new ObjectPool<ProjectileEntity>(
      () => {
        const proj = new ProjectileEntity(
          `proj_${Math.random().toString(36).substring(2, 9)}`,
          this.multiChunkWorld.grid
        );
        this.renderEngine.scene.add(proj.containerGroup);
        return proj;
      }
    );

    // Warm up pools with initial pre-allocations
    this.enemyPool.warm(8);
    this.projectilePool.warm(15);

    // 4. Spawn Initial Action RPG Enemies & NPCs
    this.spawnDefaultEnemies();
    this.spawnDefaultNpcs();
    this.overworldManager = new OverworldManager(this);
    this.questManager = new QuestManager();

    // 4b. Setup ARPG Progression, Skill Tree, Inventory & Observer
    this.skillTreeSystem = new SkillTreeSystem();
    this.progressionManager = new ProgressionManager(this.skillTreeSystem);
    this.inventorySystem = new InventorySystem();
    this.statsObserver = new StatsObserver(
      this.inventorySystem,
      this.skillTreeSystem,
      this.progressionManager
    );

    this.aiDirector = new AIDirector(
      (name, hp, aiType, attackDamage) => this.spawnEnemyAtRandomLocation(name, hp, aiType, attackDamage),
      () => this.enemies.filter(e => e.health.isAlive()).length,
      () => {
        const h = this.player.health;
        return h.maxHealth > 0 ? h.currentHealth / h.maxHealth : 1.0;
      }
    );

    // Initial sync of equipped items into player component
    this.syncPlayerEquipmentFromInventory();

    // 5. Setup Map Editor
    this.mapEditor = new MapEditor(
      this.multiChunkWorld,
      this.renderEngine.scene,
      this.renderEngine.octopathCamera.camera,
      container
    );

    // Try loading saved map from LocalStorage or demo_map.json
    this.initMapData(camQuad);

    // 6. Setup Input Manager
    this.inputManager = new InputManager();

    // Wheel zoom on canvas when not in editor mode
    const domEl = this.renderEngine.renderer.domElement;
    domEl.addEventListener('wheel', (e) => {
      if (!this.mapEditor.isEditorMode) {
        e.preventDefault();
        const delta = Math.sign(e.deltaY) * 2;
        this.renderEngine.octopathCamera.adjustZoom(delta);
      }
    }, { passive: false });

    // 7. Setup Game Loop & Register Subsystem Updates
    this.gameLoop = new GameLoop();

    // Subsystem 1: Input System (only process move inputs when not in editor mode)
    this.gameLoop.registerSystem({
      name: 'InputSystem',
      update: (dt: number) => {
        if (!this.mapEditor.isEditorMode) {
          this.inputManager.update(dt);
        }
      },
    });

    // Subsystem 2: Player Logic & Grid Movement System
    this.gameLoop.registerSystem({
      name: 'PlayerMovementSystem',
      update: (dt: number) => {
        if (!this.mapEditor.isEditorMode) {
          this.player.update(dt);

          // Consume input buffer if player returned to IDLE or MOVE
          const state = this.player.fsm.currentStateName;
          if (state === 'IDLE' || state === 'MOVE') {
            const buffered = this.player.fsm.getValidBufferedIntent(200);
            if (buffered === 'ATTACK') {
              this.player.fsm.clearBuffer();
              this.playerAttack();
            } else if (buffered === 'DODGE') {
              this.player.fsm.clearBuffer();
              this.playerDash();
            }
          }
        }
      },
    });

    // Subsystem 2.5: AI Director Spawning & Stress Regulation System
    this.gameLoop.registerSystem({
      name: 'AIDirectorSystem',
      update: (dt: number) => {
        if (this.mapEditor.isEditorMode || this.overworldManager?.isInOverworld()) return;
        this.aiDirector.update(dt);
      }
    });

    // Subsystem 3: Action RPG Enemy AI & Combat System
    this.gameLoop.registerSystem({
      name: 'EnemyCombatSystem',
      update: (dt: number) => {
        if (this.mapEditor.isEditorMode || this.overworldManager?.isInOverworld()) return;

        const pGridPos = this.player.position.getGridPos();
        const cameraQuaternion = this.renderEngine.octopathCamera.camera.quaternion;

        for (let i = this.enemies.length - 1; i >= 0; i--) {
          const enemy = this.enemies[i];
          if (!enemy.health.isAlive()) {
            this.renderEngine.scene.remove(enemy.containerGroup);
            this.enemies.splice(i, 1);
            this.enemyPool.release(enemy);
            continue;
          }

          // Distance-based update culling: skip full update for far enemies
          const ePos = enemy.position.getGridPos();
          const dx = pGridPos.x - ePos.x;
          const dz = pGridPos.z - ePos.z;
          const distSq = dx * dx + dz * dz;

          if (distSq > 400) {
            // >20 tiles away: skip update entirely (still rendered, just no AI/animation)
            continue;
          }

          enemy.updateEnemy(
            dt,
            pGridPos,
            (e) => {
              this.player.takeDamage(e.attackDamage);
              globalEventBus.emit('combat:attack_intent', {
                targetPos: { ...pGridPos },
                isPlayer: false
              });
            },
            cameraQuaternion
          );
        }

        // Find closest NPC in interaction range
        const pPos = this.player.position.getGridPos();
        let closestNpc: NpcEntity | null = null;
        let minDst = 1.75;
        if (!this.mapEditor.isEditorMode) {
          this.npcs.forEach((npc) => {
            const nPos = npc.position.getGridPos();
            const dx = pPos.x - nPos.x;
            const dz = pPos.z - nPos.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist <= minDst) {
              minDst = dist;
              closestNpc = npc;
            }
          });
        }

        // Update all independent NPCs with decoupled animations & AI behavior patterns
        for (const npc of this.npcs) {
          const isSelected = npc === closestNpc;
          npc.updateNpc(dt, cameraQuaternion, isSelected);
        }
      },
    });

    // Subsystem 3: Octopath Camera Follow & Clamp System
    this.gameLoop.registerSystem({
      name: 'CameraFollowSystem',
      update: (dt: number) => {
        const cam = this.renderEngine.octopathCamera;
        const playerWorldPos = this.player.position.getWorldPos();
        cam.setTarget(playerWorldPos);

        // Dynamic framing: lead the focus in the direction of movement.
        const pState = this.player.fsm.currentStateName;
        const moving =
          this.player.movement.isMoving ||
          pState === 'MOVE' ||
          pState === 'DODGE';
        cam.setLookAhead(this.player.movement.facingDirection || 'DOWN', moving);

        cam.update(dt);
      },
    });

    // Subsystem 3b: Projectile Movement & Collision System
    this.gameLoop.registerSystem({
      name: 'ProjectileSystem',
      update: (dt: number) => {
        if (this.mapEditor.isEditorMode || this.overworldManager?.isInOverworld()) return;

        for (let i = this.projectiles.length - 1; i >= 0; i--) {
          const proj = this.projectiles[i];
          if (!proj.isActive) {
            this.projectiles.splice(i, 1);
            this.projectilePool.release(proj);
            continue;
          }

          proj.update(dt);

          // Check collision with enemies
          let hit = false;
          for (const enemy of this.enemies) {
            if (!enemy.health.isAlive()) continue;

            const enemyGrid = enemy.position.getGridPos();
            const dx = proj.position.worldX - (enemyGrid.x + 0.5);
            const dz = proj.position.worldZ - (enemyGrid.z + 0.5);
            const dist = Math.sqrt(dx * dx + dz * dz);

            if (dist < 0.6) { // Collision radius
              enemy.takeDamage(proj.damage, true);
              this.createSlashEffect({ x: enemyGrid.x, z: enemyGrid.z });
              proj.deactivate();
              hit = true;
              break;
            }
          }

          if (hit) {
            this.projectiles.splice(i, 1);
            this.projectilePool.release(proj);
          }
        }
      },
    });

    // Subsystem 4: Billboard Orientation Alignment & Curved World Origin System
    this.gameLoop.registerSystem({
      name: 'BillboardAlignmentSystem',
      update: () => {
        const cameraQuaternion = this.renderEngine.octopathCamera.camera.quaternion;
        this.player.updateBillboardOrientation(cameraQuaternion);
        this.multiChunkWorld.updateCameraOrientation(cameraQuaternion);

        // Synchronize Curved World origin with player center
        const pPos = this.player.position.getWorldPos();
        this.renderEngine.curvedWorldManager.updateOrigin(new THREE.Vector3(pPos.x, pPos.y, pPos.z));
      },
    });

    // Subsystem 5: Performance & Dynamic FPS Monitor (Ensures solid 60FPS on low-end mobile)
    let perfTimer = 0;
    this.gameLoop.registerSystem({
      name: 'PerformanceMonitorSystem',
      update: (dt: number) => {
        perfTimer += dt;
        if (perfTimer >= 1.0) {
          perfTimer = 0;
          const currentFps = this.gameLoop.getFPS();
          this.renderEngine.performanceManager.reportFps(currentFps);
        }
      },
    });

    // Set RenderCallback
    this.gameLoop.setRenderCallback(() => {
      this.renderEngine.render();
    });

    // 7. Setup Debug UI
    this.debugUI = new DebugUI(this);

    // 8. Event Listeners
    
    // Camera feel: subtle screen-shake for impactful combat moments
    globalEventBus.on('combat:player_damaged', () => {
      this.renderEngine.octopathCamera.addShake(0.55);
    });
    globalEventBus.on('combat:player_dash', () => {
      this.renderEngine.octopathCamera.addShake(0.22);
    });

    globalEventBus.on('player:died', (payload) => {
      // Spawn gravestone
      const { x, z } = payload;
      const height = this.multiChunkWorld.grid.getVoxelHeight(x, z);
      this.multiChunkWorld.billboardSystem.addProp({
        id: 'grave_' + Date.now(),
        type: PropType.ROCK_BOULDER,
        gridX: x,
        gridZ: z,
        width: 1.5,
        height: 1.5,
        footprintWidth: 1,
        footprintDepth: 1,
        walkable: false,
      }, this.renderEngine.octopathCamera.camera.quaternion);
      
      globalEventBus.emit('combat:floating_text', {
        text: '¡HAS MUERTO! Recupera tu cuerpo.',
        worldPos: { x, y: height + 2, z },
        style: 'crit',
        isCrit: true,
      });
      
      // We can also wipe inventory or drop gold here if needed
      // this.inventorySystem.addGold(-this.inventorySystem.gold); // lose all gold?
    });

    globalEventBus.on('player:recovered_body', () => {
      // Find and remove gravestone at player position
      const px = this.player.position.gridX;
      const pz = this.player.position.gridZ;
      // Ideally we would specifically target the tombstone, but we can just remove all props at (px, pz) for simplicity
      const props = this.multiChunkWorld.billboardSystem.getProps();
      
      
        this.multiChunkWorld.billboardSystem.removePropAt(px, pz);
      
      globalEventBus.emit('combat:floating_text', {
        text: '¡CUERPO RECUPERADO!',
        worldPos: this.player.position.getWorldPos(),
        style: 'heal',
        isCrit: false,
      });
      
      // Full heal
      this.player.health.currentHealth = this.player.health.maxHealth;
    });

    globalEventBus.on('combat:attack_intent', (payload) => {
      this.createSlashEffect(payload.targetPos);
    });

    // ARPG Core Loop: Kill -> Loot -> Upgrade
    globalEventBus.on('combat:enemy_defeated', (payload) => {
      const drop = LootGenerator.rollEnemyDrop(payload.name, this.progressionManager.level);
      if (drop.gold > 0) {
        this.inventorySystem.addGold(drop.gold);
      }
      if (drop.item) {
        const added = this.inventorySystem.addItem(drop.item);
        globalEventBus.emit('loot:dropped', {
          item: drop.item,
          gold: drop.gold,
          worldPos: payload.worldPos,
        });

        // Ragnarok / Diablo-style Loot notification floating text
        if (payload.worldPos) {
          const rarityName = drop.item.rarity ? drop.item.rarity.toUpperCase() : 'COMÚN';
          globalEventBus.emit('combat:floating_text', {
            text: `¡BOTÍN ${rarityName}! ${drop.item.name}`,
            worldPos: {
              x: payload.worldPos.x,
              y: payload.worldPos.y + 0.6,
              z: payload.worldPos.z,
            },
            style: drop.item.rarity === 'legendary' ? 'crit' : 'heal',
            isCrit: drop.item.rarity === 'legendary' || drop.item.rarity === 'epic',
          });
        }
      }
    });

    globalEventBus.on('progression:level_up', (payload) => {
      const pPos = this.player.position.getWorldPos();
      globalEventBus.emit('combat:floating_text', {
        text: `★ ¡NIVEL ${payload.newLevel}! (+1 HABILIDAD) ★`,
        worldPos: {
          x: pPos.x,
          y: pPos.y + 1.8,
          z: pPos.z,
        },
        style: 'crit',
        isCrit: true,
      });
      // Full heal on level up
      this.player.heal(9999);
    });

    this.isInitialized = true;
    globalEventBus.emit('engine:state_changed', { state: 'READY' });
  }

  public syncPlayerEquipmentFromInventory(): void {
    const equipped = this.inventorySystem.equipped;
    for (const [slot, item] of Object.entries(equipped)) {
      if (item) {
        this.player.equipment.equipped[slot as EquipmentSlot] = item;
      }
    }
  }

  public equipItem(item: Item, fromInventoryIndex?: number): boolean {
    const success = this.inventorySystem.equipItem(item, fromInventoryIndex);
    if (success) {
      this.syncPlayerEquipmentFromInventory();
      if (item.slot === 'armor') {
        if (item.id.includes('arquero') || item.id.includes('ranger') || item.id.includes('cuerda') || item.id.includes('cuero')) {
          this.player.sprite.setBodyTexture(this.materials.getArcherPlayerSpritesheetTexture());
        } else {
          this.player.sprite.setBodyTexture(this.materials.getPlayerSpritesheetTexture());
        }
      }
    }
    return success;
  }

  public unequipItem(slot: EquipmentSlot): boolean {
    const success = this.inventorySystem.unequipItem(slot);
    if (success) {
      this.player.equipment.equipped[slot] = null;
    }
    return success;
  }

  public unlockSkill(nodeId: string): boolean {
    return this.skillTreeSystem.unlockNode(nodeId);
  }

  public respecSkills(): void {
    this.skillTreeSystem.respec();
  }

  private createSlashEffect(targetPos: GridPos): void {
    const targetHeight = this.multiChunkWorld.grid.getVoxelHeight(targetPos.x, targetPos.z);
    
    const slashGeo = new THREE.PlaneGeometry(1.4, 1.4);
    const slashMat = new THREE.MeshBasicMaterial({
      map: this.materials.getSlashEffectTexture(),
      transparent: true,
      opacity: 1.0,
      side: THREE.DoubleSide,
      depthTest: false,
    });

    const slashMesh = new THREE.Mesh(slashGeo, slashMat);
    slashMesh.position.set(targetPos.x + 0.5, targetHeight + 0.7, targetPos.z + 0.5);
    slashMesh.quaternion.copy(this.renderEngine.octopathCamera.camera.quaternion);
    this.renderEngine.scene.add(slashMesh);

    const startTime = performance.now();
    const duration = 200;

    const animateSlash = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      
      const scale = 0.6 + progress * 0.8;
      slashMesh.scale.set(scale, scale, scale);
      slashMat.opacity = 1 - progress;

      if (progress < 1) {
        requestAnimationFrame(animateSlash);
      } else {
        this.renderEngine.scene.remove(slashMesh);
        slashGeo.dispose();
        slashMat.dispose();
      }
    };
    requestAnimationFrame(animateSlash);
  }

  private async initMapData(camQuad: THREE.Quaternion): Promise<void> {
    const localData = SaveSystem.loadFromLocalStorage();
    const hasPortal = localData?.billboards?.some((b: any) => b.type === 'PORTAL_OVERWORLD');
    const hasSufficientProps = (localData?.billboards?.length ?? 0) >= 600;

    if (localData && localData.width === 256 && hasPortal && hasSufficientProps) {
      this.multiChunkWorld.loadFromMapSchema(localData, camQuad);
      this.renderEngine.octopathCamera.setMode('local', { width: localData.width, depth: localData.height });
    } else {
      const demoData = await SaveSystem.fetchDemoMap();
      if (demoData) {
        this.multiChunkWorld.loadFromMapSchema(demoData, camQuad);
        this.renderEngine.octopathCamera.setMode('local', { width: demoData.width, depth: demoData.height });
        SaveSystem.saveToLocalStorage(demoData);
      } else {
        // Fallback default sample props
        this.multiChunkWorld.spawnSampleProps(camQuad);
        this.renderEngine.octopathCamera.setMode('local', { width: 256, depth: 256 });
      }
    }

    this.ensurePlayerOnValidCell();
  }

  public setEditorMode(enabled: boolean): void {
    this.mapEditor.setEditorMode(enabled);

    if (!enabled) {
      // Exiting editor mode: ensure player is not trapped in an obstacle or elevation mismatch
      this.ensurePlayerOnValidCell();
    }
  }

  public toggleEditorMode(): boolean {
    const next = !this.mapEditor.isEditorMode;
    this.setEditorMode(next);
    return next;
  }

  /**
   * Ensures the player is standing on a valid, walkable grid cell with matching voxel height.
   */
  public ensurePlayerOnValidCell(): void {
    const grid = this.multiChunkWorld.grid;
    let px = this.player.position.gridX;
    let pz = this.player.position.gridZ;

    if (!grid.isWalkable(px, pz)) {
      // Search radial ring for nearest walkable cell
      let found = false;
      for (let radius = 1; radius < 15 && !found; radius++) {
        for (let dx = -radius; dx <= radius && !found; dx++) {
          for (let dz = -radius; dz <= radius && !found; dz++) {
            const tx = px + dx;
            const tz = pz + dz;
            if (grid.isWalkable(tx, tz)) {
              px = tx;
              pz = tz;
              found = true;
            }
          }
        }
      }
    }

    const groundY = grid.getVoxelHeight(px, pz);
    this.player.position.setGridPos(px, pz, groundY);
    this.player.syncContainerPosition();
    this.renderEngine.octopathCamera.snapToTarget(this.player.position.getWorldPos());
  }

  public saveCurrentMap(): void {
    const mapData = MapSerializer.serialize(
      this.multiChunkWorld.grid,
      this.multiChunkWorld.billboardSystem.getProps()
    );
    SaveSystem.saveToLocalStorage(mapData);
  }

  public exportCurrentMapFile(): void {
    const mapData = MapSerializer.serialize(
      this.multiChunkWorld.grid,
      this.multiChunkWorld.billboardSystem.getProps()
    );
    SaveSystem.exportMapAsFile(mapData, 'octopath_map.json');
  }

  public teleportPlayerTo(gridX: number, gridZ: number): void {
    const height = this.multiChunkWorld.grid.getVoxelHeight(gridX, gridZ);
    this.player.position.setGridPos(gridX, gridZ, height);
    this.player.movement.isMoving = false;
    this.player.movement.progress = 0;
    this.player.sprite.group.position.set(0, 0, 0);
    this.player.syncContainerPosition();
    this.renderEngine.octopathCamera.snapToTarget(this.player.position.getWorldPos());
  }

  public async reloadDemoMap(): Promise<void> {
    const demoData = await SaveSystem.fetchDemoMap();
    const camQuad = this.renderEngine.octopathCamera.camera.quaternion;
    if (demoData) {
      this.multiChunkWorld.loadFromMapSchema(demoData, camQuad);
      this.renderEngine.octopathCamera.setMode('local', { width: demoData.width, depth: demoData.height });
      SaveSystem.saveToLocalStorage(demoData);
    } else {
      this.multiChunkWorld.spawnSampleProps(camQuad);
      this.renderEngine.octopathCamera.setMode('local', { width: 256, depth: 256 });
    }
    this.ensurePlayerOnValidCell();
  }

  public start(): void {
    if (!this.isInitialized) return;
    this.gameLoop.start();
    globalEventBus.emit('engine:state_changed', { state: 'RUNNING' });
  }

  public stop(): void {
    this.gameLoop.stop();
    globalEventBus.emit('engine:state_changed', { state: 'PAUSED' });
  }

  public destroy(): void {
    this.stop();
    this.inputManager.unbindEvents();
    this.mapEditor.unbindEvents();
    this.player.destroy();
    if (this.debugUI) {
      this.debugUI.destroy();
    }
    this.renderEngine.destroy();
    globalEventBus.clear();
  }

  public clearAllEnemies(): void {
    this.enemies.forEach((e) => {
      this.renderEngine.scene.remove(e.containerGroup);
      this.enemyPool.release(e);
    });
    this.enemies = [];
    this.projectiles.forEach((p) => {
      this.renderEngine.scene.remove(p.containerGroup);
      this.projectilePool.release(p);
    });
    this.projectiles = [];
  }

  public spawnThematicEnemies(poiType: string): void {
    this.clearAllEnemies();

    if (poiType === 'TOWN_RUINS') {
      const ruinsSpawns = [
        { id: 'ruin_1', x: 20, z: 18, name: 'Guardián Esquelético', hp: 70, aiType: 'UTILITY' as const, atk: 14 },
        { id: 'ruin_2', x: 26, z: 18, name: 'Espectro de Eldoria', hp: 55, aiType: 'BEHAVIOR_TREE' as const, atk: 16 },
        { id: 'ruin_3', x: 23, z: 12, name: 'Señor de la Cripta', hp: 110, aiType: 'BEHAVIOR_TREE' as const, atk: 22 },
      ];
      ruinsSpawns.forEach((s) => {
        const enemy = this.enemyPool.acquire();
        enemy.reset(s.id, s.x, s.z, s.name, s.hp, s.aiType, s.atk);
        this.enemies.push(enemy);
        this.renderEngine.scene.add(enemy.containerGroup);
      });
    } else if (poiType === 'TOWN_CAVE' || poiType === 'CAVE_ENTRANCE') {
      const caveSpawns = [
        { id: 'cave_1', x: 20, z: 20, name: 'Troll de las Cavernas', hp: 90, aiType: 'UTILITY' as const, atk: 18 },
        { id: 'cave_2', x: 26, z: 22, name: 'Murciélago de Cueva', hp: 45, aiType: 'UTILITY' as const, atk: 10 },
        { id: 'cave_3', x: 23, z: 15, name: 'Gólem de Mithril', hp: 130, aiType: 'BEHAVIOR_TREE' as const, atk: 24 },
      ];
      caveSpawns.forEach((s) => {
        const enemy = this.enemyPool.acquire();
        enemy.reset(s.id, s.x, s.z, s.name, s.hp, s.aiType, s.atk);
        this.enemies.push(enemy);
        this.renderEngine.scene.add(enemy.containerGroup);
      });
    }
  }

  public spawnDefaultEnemies(): void {
    this.clearAllEnemies();

    const spawns = [
      { id: 'enemy_1', x: 170, z: 170, name: 'Bandido de los Suburbios', hp: 60, aiType: 'UTILITY' as const },
      { id: 'enemy_2', x: 180, z: 180, name: 'Matón Sombra', hp: 75, aiType: 'UTILITY' as const },
      { id: 'enemy_3', x: 160, z: 175, name: 'Ladrón Furtivo', hp: 60, aiType: 'UTILITY' as const },
      { id: 'enemy_4', x: 185, z: 165, name: 'Rey de los Suburbios', hp: 95, aiType: 'BEHAVIOR_TREE' as const, atk: 18 },
      { id: 'enemy_5', x: 128, z: 130, name: 'Gladiador de Práctica', hp: 100, aiType: 'UTILITY' as const, atk: 15 },
      { id: 'enemy_6', x: 30, z: 30, name: 'Lobo de Bosque', hp: 45, aiType: 'UTILITY' as const, atk: 10 },
      { id: 'enemy_7', x: 40, z: 20, name: 'Oso Furioso', hp: 120, aiType: 'BEHAVIOR_TREE' as const, atk: 25 },
    ];

    spawns.forEach((s) => {
      const enemy = this.enemyPool.acquire();
      enemy.reset(s.id, s.x, s.z, s.name, s.hp, s.aiType, s.atk || 12);
      this.enemies.push(enemy);
      this.renderEngine.scene.add(enemy.containerGroup);
    });
  }

  public spawnEnemyAtRandomLocation(
    name: string,
    hp: number,
    aiType: 'UTILITY' | 'BEHAVIOR_TREE',
    attackDamage: number = 12
  ): void {
    const pPos = this.player.position.getGridPos();
    let spawnX = pPos.x;
    let spawnZ = pPos.z;
    let found = false;

    for (let attempts = 0; attempts < 15; attempts++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 5 + Math.floor(Math.random() * 4); // 5 to 8 units away
      const tx = Math.round(pPos.x + Math.cos(angle) * radius);
      const tz = Math.round(pPos.z + Math.sin(angle) * radius);

      if (this.multiChunkWorld.grid.isWalkable(tx, tz)) {
        spawnX = tx;
        spawnZ = tz;
        found = true;
        break;
      }
    }

    if (!found) {
      // Fallback if not found
      spawnX = pPos.x + 5;
      spawnZ = pPos.z + 5;
    }

    const enemy = this.enemyPool.acquire();
    enemy.reset(
      `enemy_dir_${Math.random().toString(36).substring(2, 9)}`,
      spawnX,
      spawnZ,
      name,
      hp,
      aiType,
      attackDamage
    );
    this.enemies.push(enemy);
    this.renderEngine.scene.add(enemy.containerGroup);
  }

  public spawnDefaultNpcs(): void {
    this.npcs.forEach((n) => this.renderEngine.scene.remove(n.containerGroup));
    this.npcs = [];

    const npcData = [
      { id: 'npc_1', npcId: 'npc_herrero', name: 'Maestro Herrero Garan', x: 75, z: 125, spriteIndex: 2, behavior: 'MERCHANT' },
      { id: 'npc_2', npcId: 'npc_anciano', name: 'Anciano Sabio de la Capital', x: 170, z: 125, spriteIndex: 5, behavior: 'IDLE' },
      { id: 'npc_3', npcId: 'npc_mago', name: 'Mago Real Elion', x: 165, z: 130, spriteIndex: 12, behavior: 'WANDER' },
      { id: 'npc_4', npcId: 'npc_guardia_norte', name: 'Guardia del Norte Lionel', x: 128, z: 104, spriteIndex: 20, behavior: 'GUARD' },
      { id: 'npc_5', npcId: 'npc_guardia_sur', name: 'Guardia del Sur Roderick', x: 128, z: 152, spriteIndex: 24, behavior: 'GUARD' },
      { id: 'npc_6', npcId: 'npc_comerciante', name: 'Mercader Alaric', x: 85, z: 125, spriteIndex: 8, behavior: 'MERCHANT' },
      { id: 'npc_7', npcId: 'npc_sacerdotisa', name: 'Sacerdotisa Selene', x: 128, z: 205, spriteIndex: 15, behavior: 'IDLE' },
      { id: 'npc_8', npcId: 'npc_arquera', name: 'Guardabosques Kaelen', x: 90, z: 85, spriteIndex: 1, behavior: 'WANDER' },
      { id: 'npc_9', npcId: 'npc_bibliotecaria', name: 'Archivera Moira', x: 165, z: 115, spriteIndex: 18, behavior: 'IDLE' },
      { id: 'npc_10', npcId: 'npc_pescador', name: 'Pescador Jaro', x: 48, z: 185, spriteIndex: 4, behavior: 'IDLE' },
      { id: 'npc_11', npcId: 'npc_bardo', name: 'Bardo Lyra', x: 90, z: 120, spriteIndex: 30, behavior: 'WANDER' },
      { id: 'npc_12', npcId: 'npc_granjero', name: 'Abastecedor Tomas', x: 20, z: 50, spriteIndex: 3, behavior: 'WANDER' },
      { id: 'npc_13', npcId: 'npc_posadero', name: 'Posadero Barnaby', x: 120, z: 85, spriteIndex: 35, behavior: 'MERCHANT' },
      { id: 'npc_14', npcId: 'npc_minero', name: 'Minero Flint', x: 160, z: 160, spriteIndex: 40, behavior: 'WANDER' },
      { id: 'npc_15', npcId: 'npc_alquimista', name: 'Alquimista Vesper', x: 80, z: 135, spriteIndex: 45, behavior: 'MERCHANT' },
    ];
    
    // Add dynamic walkers
    const roadPoints = [
        [125, 60], [125, 80], [125, 100], [125, 160], [125, 180], [125, 200], // N-S Road
        [70, 125], [90, 125], [105, 125], [150, 125], [170, 125], [190, 125], // E-W Road
        [75, 75], [95, 75], [160, 75], [180, 75], // Res
        [75, 95], [95, 95], [160, 95], [180, 95], // Res
        [80, 115], [90, 135], [155, 115], [165, 135],
        [80, 80], [170, 80], [160, 160], [180, 180]
    ];
    
    let dynCount = 16;
    for(let pt of roadPoints) {
       npcData.push({
          id: 'npc_' + dynCount,
          npcId: 'npc_aldeano_default',
          name: 'Ciudadano',
          x: pt[0] + Math.floor(Math.random() * 5),
          z: pt[1] + Math.floor(Math.random() * 5),
          spriteIndex: Math.floor(Math.random() * 50),
          behavior: 'WANDER'
       });
       dynCount++;
    }

    npcData.forEach((d) => {
      let npc: NpcEntity;
      if (d.behavior === 'MERCHANT') {
        npc = new ShopkeeperNPC(
          d.id,
          d.npcId,
          d.name,
          `Bazar de ${d.name}`,
          d.x,
          d.z,
          this.multiChunkWorld.grid,
          this.materials,
          d.spriteIndex,
          'MERCHANT'
        );
      } else {
        npc = new NpcEntity(
          d.id,
          d.npcId,
          d.name,
          d.x,
          d.z,
          this.multiChunkWorld.grid,
          this.materials,
          d.spriteIndex,
          d.behavior as any
        );
      }
      this.renderEngine.scene.add(npc.containerGroup);
      this.npcs.push(npc);
    });
  }

  public spawnLocalPoiNpc(poiType: string): void {
    this.npcs.forEach((n) => this.renderEngine.scene.remove(n.containerGroup));
    this.npcs = [];

    if (poiType === 'TOWN_RUINS' || poiType === 'TOWN_CAVE') {
      return; // Dangerous zones have no friendly NPCs
    }

    let name = 'Habitante del Lugar';
    let spriteIndex = 2;
    if (poiType === 'TOWN_VILLAGE') { name = 'Anciano de la Aldea'; spriteIndex = 5; }
    else if (poiType === 'TOWN_FARM') { name = 'Granjero Oakhaven'; spriteIndex = 8; }
    else if (poiType === 'TOWN_TEMPLE') { name = 'Sumo Sacerdote'; spriteIndex = 15; }
    else if (poiType === 'TOWN_PORT') { name = 'Capitán del Puerto'; spriteIndex = 20; }
    else if (poiType === 'TOWN_LUMBERMILL') { name = 'Maestro Leñador'; spriteIndex = 2; }

    const npc = new NpcEntity(
      'local_npc_1',
      'npc_local',
      name,
      23,
      20,
      this.multiChunkWorld.grid,
      this.materials,
      spriteIndex,
      'IDLE'
    );
    this.renderEngine.scene.add(npc.containerGroup);
    this.npcs.push(npc);
  }

  public interactWithNearbyNpc(): boolean {
    if (this.mapEditor.isEditorMode) return false;

    const pPos = this.player.position.getGridPos();
    const facing = this.player.movement.facingDirection || 'DOWN';
    let targetX = pPos.x;
    let targetZ = pPos.z;

    switch (facing) {
      case 'UP':
        targetZ -= 1;
        break;
      case 'DOWN':
        targetZ += 1;
        break;
      case 'LEFT':
        targetX -= 1;
        break;
      case 'RIGHT':
        targetX += 1;
        break;
    }

    const foundNpc = this.npcs.find((n) => {
      const nPos = n.position.getGridPos();
      return nPos.x === targetX && nPos.z === targetZ;
    });

    if (foundNpc) {
      if (foundNpc instanceof ShopkeeperNPC) {
        foundNpc.openShop();
        return true;
      }

      const dialogue = DIALOGUES[foundNpc.npcId] || {
        npcName: foundNpc.name,
        lines: [
          `¡Saludos, viajero! Soy ${foundNpc.name}.`,
          'Espero que tu aventura en las tierras de Argentum sea próspera y segura.',
        ],
      };

      const quest = dialogue.questId ? this.questManager.getQuest(dialogue.questId) : undefined;
        
        // If quest is completed, deliver reward
        if (quest && quest.status === 'completed') {
          const reward = this.questManager.completeQuest(quest.id);
          if (reward) {
            this.player.equipment.equipItem(reward);
            globalEventBus.emit('dialogue:start', {
              npcName: foundNpc.name,
              lines: ['¡Excelente trabajo derrotando a los slimes!', 'Has obtenido y equipado la Espada de Hierro.'],
            });
            return true;
          }
        }

        // If quest is not started yet, offer quest
        if (quest && quest.status === 'not_started') {
          globalEventBus.emit('dialogue:start', {
            npcName: foundNpc.name,
            lines: dialogue.lines,
            questId: quest.id,
          });
          return true;
        }

        // Default dialogue
        globalEventBus.emit('dialogue:start', {
          npcName: foundNpc.name,
          lines: dialogue.lines,
        });
        return true;
    }
    return false;
  }

  public acceptQuest(questId: string): void {
    this.questManager.acceptQuest(questId);
  }

  public useHotbarItem(slotIdx: number): boolean {
    return this.player.useConsumable(slotIdx);
  }

  public playerEquipItem(item: Item): boolean {
    return this.player.equipItem(item);
  }

  public playerAttack(): void {
    if (this.mapEditor.isEditorMode) return;
    this.player.performAttack(
      this.enemies,
      this.renderEngine.scene,
      this.materials.getSlashEffectTexture(),
      this.renderEngine.octopathCamera.camera.quaternion
    );
  }

  public playerDash(): void {
    if (this.mapEditor.isEditorMode) return;
    this.player.performDash();
  }

  public fireProjectile(): void {
    if (this.mapEditor.isEditorMode) return;

    const playerGrid = this.player.position.getGridPos();
    const playerHeight = this.multiChunkWorld.grid.getVoxelHeight(playerGrid.x, playerGrid.z);
    const facing = this.player.movement.facingDirection || 'DOWN';

    const proj = this.projectilePool.acquire();
    proj.launch(playerGrid.x, playerGrid.z, playerHeight, facing);
    this.projectiles.push(proj);

    globalEventBus.emit('combat:projectile_fired', {
      from: playerGrid,
      direction: facing,
    });
  }

  public getPoolStats() {
    return {
      enemies: this.enemyPool.getStats(),
      projectiles: this.projectilePool.getStats(),
    };
  }

  public getEnemies(): EnemyEntity[] {
    return this.enemies;
  }
  public getNpcs(): NpcEntity[] {
    return this.npcs;
  }
  public getRenderEngine(): RenderEngine {
    return this.renderEngine;
  }

  public getWorldGrid(): WorldGrid {
    return this.multiChunkWorld.grid;
  }

  public getMultiChunkWorld(): MultiChunkWorld {
    return this.multiChunkWorld;
  }

  public getPlayer(): PlayerEntity {
    return this.player;
  }

  public getInputManager(): InputManager {
    return this.inputManager;
  }

  public getMapEditor(): MapEditor {
    return this.mapEditor;
  }

  public getFPS(): number {
    return this.gameLoop.getFPS();
  }
}
