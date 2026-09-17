import * as THREE from 'three';
import { PropType, TileType, VoxelCell } from '../types';
import { MultiChunkWorld } from '../world/MultiChunkWorld';
import { EditorRaycaster } from './EditorRaycaster';
import { CommandHistory, EditCommand } from './CommandHistory';

export type EditorTool = 'VOXEL' | 'BILLBOARD' | 'ERASE';

export class MapEditor {
  private world: MultiChunkWorld;
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private domElement: HTMLElement;
  private raycaster: EditorRaycaster;
  public readonly commandHistory: CommandHistory;

  public activeTool: EditorTool = 'VOXEL';
  public selectedTileType: TileType = TileType.GRASS;
  public selectedPropType: PropType = PropType.PINE_TREE;
  public selectedHeight: number = 1;
  public isEditorMode: boolean = false;

  private cursorMesh: THREE.Mesh;
  private hoveredCell: { x: number; z: number } | null = null;
  private isPointerDown: boolean = false;

  constructor(
    world: MultiChunkWorld,
    scene: THREE.Scene,
    camera: THREE.Camera,
    domElement: HTMLElement
  ) {
    this.world = world;
    this.scene = scene;
    this.camera = camera;
    this.domElement = domElement;

    this.raycaster = new EditorRaycaster(this.world.grid);
    this.commandHistory = new CommandHistory();

    // Setup 3D Cursor Box Highlight
    const geo = new THREE.BoxGeometry(1.02, 0.2, 1.02);
    geo.translate(0.5, 0.1, 0.5); // Bottom-left anchor matching voxel cell
    const mat = new THREE.MeshBasicMaterial({
      color: 0x10b981, // Emerald green highlight
      wireframe: true,
      transparent: true,
      opacity: 0.8,
    });
    this.cursorMesh = new THREE.Mesh(geo, mat);
    this.cursorMesh.name = 'EditorCursorMesh';
    this.cursorMesh.visible = false;
    this.scene.add(this.cursorMesh);

    this.bindEvents();
  }

  public setEditorMode(enabled: boolean): void {
    this.isEditorMode = enabled;
    this.cursorMesh.visible = enabled;
    if (!enabled) {
      this.hoveredCell = null;
    }
  }

  private bindEvents(): void {
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.onWheel = this.onWheel.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);

    this.domElement.addEventListener('pointermove', this.onPointerMove);
    this.domElement.addEventListener('pointerdown', this.onPointerDown);
    this.domElement.addEventListener('pointerup', this.onPointerUp);
    this.domElement.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('keydown', this.onKeyDown);
  }

  public unbindEvents(): void {
    this.domElement.removeEventListener('pointermove', this.onPointerMove);
    this.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.domElement.removeEventListener('pointerup', this.onPointerUp);
    this.domElement.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('keydown', this.onKeyDown);
    if (this.cursorMesh.parent) {
      this.scene.remove(this.cursorMesh);
    }
  }

  private updateCursorFromPointer(e: PointerEvent): void {
    if (!this.isEditorMode) return;

    const rect = this.domElement.getBoundingClientRect();
    const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const res = this.raycaster.raycastGrid(this.camera, ndcX, ndcY);

    if (res) {
      this.hoveredCell = { x: res.gridX, z: res.gridZ };
      const height = this.world.grid.getVoxelHeight(res.gridX, res.gridZ);
      this.cursorMesh.position.set(res.gridX, height, res.gridZ);
      this.cursorMesh.visible = true;

      // Cursor color indicator based on tool
      if (this.activeTool === 'ERASE') {
        (this.cursorMesh.material as THREE.MeshBasicMaterial).color.setHex(0xef4444); // Red
      } else if (this.activeTool === 'BILLBOARD') {
        (this.cursorMesh.material as THREE.MeshBasicMaterial).color.setHex(0xf59e0b); // Amber
      } else {
        (this.cursorMesh.material as THREE.MeshBasicMaterial).color.setHex(0x10b981); // Emerald
      }
    } else {
      this.hoveredCell = null;
      this.cursorMesh.visible = false;
    }
  }

  private onPointerMove(e: PointerEvent): void {
    this.updateCursorFromPointer(e);
    if (this.isPointerDown && this.hoveredCell && e.buttons === 1) {
      // Continuous drag painting
      this.paintCell(this.hoveredCell.x, this.hoveredCell.z, false);
    }
  }

  private onPointerDown(e: PointerEvent): void {
    if (!this.isEditorMode) return;

    this.isPointerDown = true;
    this.updateCursorFromPointer(e);

    if (this.hoveredCell) {
      const isEraseAction = e.button === 2 || e.shiftKey || this.activeTool === 'ERASE';
      if (isEraseAction) {
        this.eraseCell(this.hoveredCell.x, this.hoveredCell.z);
      } else {
        this.paintCell(this.hoveredCell.x, this.hoveredCell.z, true);
      }
    }
  }

  private onPointerUp(): void {
    this.isPointerDown = false;
  }

  private onWheel(e: WheelEvent): void {
    if (!this.isEditorMode || !this.hoveredCell) return;
    e.preventDefault();

    // Adjust voxel height using scroll wheel
    if (e.deltaY < 0) {
      this.selectedHeight = Math.min(5, this.selectedHeight + 1);
    } else if (e.deltaY > 0) {
      this.selectedHeight = Math.max(1, this.selectedHeight - 1);
    }

    if (this.activeTool === 'VOXEL') {
      this.paintCell(this.hoveredCell.x, this.hoveredCell.z, true);
    }
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'F1') {
      e.preventDefault();
      this.setEditorMode(!this.isEditorMode);
    }

    if (!this.isEditorMode) return;

    // Shortcuts: Ctrl+Z (Undo), Ctrl+Y / Ctrl+Shift+Z (Redo)
    if (e.ctrlKey || e.metaKey) {
      if (e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          this.commandHistory.redo();
        } else {
          this.commandHistory.undo();
        }
      } else if (e.key.toLowerCase() === 'y') {
        e.preventDefault();
        this.commandHistory.redo();
      }
    }
  }

  public paintCell(x: number, z: number, forceNewCommand = true): void {
    if (!this.world.grid.isInBounds(x, z)) return;

    const oldCell = this.world.grid.getCell(x, z);
    const existingProps = this.world.billboardSystem.getProps();
    const oldProp = existingProps.find(
      (p) => x >= p.gridX && x < p.gridX + p.footprintWidth && z >= p.gridZ && z < p.gridZ + p.footprintDepth
    );

    const camQuad = this.camera.quaternion;

    if (this.activeTool === 'VOXEL') {
      const isWater = this.selectedTileType === TileType.WATER;
      const isStoneWall = this.selectedTileType === TileType.STONE && this.selectedHeight > 1;

      const newCell: VoxelCell = {
        x,
        z,
        height: this.selectedHeight,
        walkable: !isWater && !isStoneWall && !oldProp,
        type: this.selectedTileType,
      };

      const cmd = new EditCommand(
        this.world,
        camQuad,
        x,
        z,
        { voxelCell: oldCell ? { ...oldCell } : undefined, propData: oldProp ? { ...oldProp } : undefined },
        { voxelCell: newCell, propData: oldProp ? { ...oldProp } : undefined }
      );

      this.commandHistory.executeCommand(cmd);
    } else if (this.activeTool === 'BILLBOARD') {
      let fw = 1;
      let fh = 1;
      let w = 2.0;
      let h = 3.0;
      let walkable = false;

      if (this.selectedPropType === PropType.FOUNTAIN) {
        fw = 3;
        fh = 3;
        w = 3.6;
        h = 2.8;
        walkable = false;
      } else if (this.selectedPropType === PropType.STREET_LAMP || this.selectedPropType === PropType.STREET_LAMP_ALT) {
        fw = 1;
        fh = 1;
        w = 1.2;
        h = 2.5;
        walkable = false;
      } else if (this.selectedPropType === PropType.MARKET_STALL_RED || this.selectedPropType === PropType.MARKET_STALL_BLUE) {
        fw = 2;
        fh = 2;
        w = 2.5;
        h = 2.2;
        walkable = false;
      } else if (this.selectedPropType === PropType.BARRELS_STACK) {
        fw = 2;
        fh = 1;
        w = 1.6;
        h = 2.0;
        walkable = false;
      } else if (this.selectedPropType === PropType.BARREL_SINGLE) {
        fw = 1;
        fh = 1;
        w = 1.0;
        h = 1.1;
        walkable = false;
      } else if (this.selectedPropType === PropType.CRATE_STACK) {
        fw = 1;
        fh = 1;
        w = 1.2;
        h = 1.6;
        walkable = false;
      } else if (this.selectedPropType === PropType.BENCH_WOOD) {
        fw = 1;
        fh = 1;
        w = 1.5;
        h = 1.1;
        walkable = false;
      } else if (
        this.selectedPropType === PropType.SHOP_HOUSE_1 ||
        this.selectedPropType === PropType.SHOP_HOUSE_2 ||
        this.selectedPropType === PropType.SHOP_HOUSE_3
      ) {
        fw = 3;
        fh = 3;
        w = 3.5;
        h = 4.8;
        walkable = false;
      } else if (this.selectedPropType === PropType.MANOR_HOUSE || this.selectedPropType === PropType.GUILD_HALL) {
        fw = 4;
        fh = 4;
        w = 5.0;
        h = 5.0;
        walkable = false;
      } else if (this.selectedPropType === PropType.TREE_GRAND_OAK) {
        fw = 2;
        fh = 2;
        w = 4.5;
        h = 5.5;
        walkable = false;
      } else if (this.selectedPropType === PropType.TREE_LUSH_PINE) {
        fw = 2;
        fh = 2;
        w = 3.5;
        h = 5.0;
        walkable = false;
      } else if (this.selectedPropType === PropType.TREE_TOWN_GREEN) {
        fw = 1;
        fh = 1;
        w = 3.2;
        h = 4.5;
        walkable = false;
      } else if (this.selectedPropType === PropType.BUSH_FLOWERING || this.selectedPropType === PropType.BUSH_ROUND) {
        fw = 1;
        fh = 1;
        w = 1.5;
        h = 1.4;
        walkable = false;
      } else if (this.selectedPropType === PropType.HOUSE_FACADE) {
        fw = 4;
        fh = 3;
        w = 3.5;
        h = 3.5;
      } else if (this.selectedPropType === PropType.TREE_OAK) {
        w = 3.2;
        h = 4.2;
        walkable = false;
      } else if (this.selectedPropType === PropType.TREE_PINE || this.selectedPropType === PropType.PINE_TREE) {
        w = 2.8;
        h = 3.8;
        walkable = false;
      } else if (this.selectedPropType === PropType.BUSH_DETAILED) {
        w = 1.8;
        h = 1.8;
        walkable = false;
      } else if (this.selectedPropType === PropType.BUSH) {
        w = 1.2;
        h = 1.2;
        walkable = false;
      } else if (this.selectedPropType === PropType.FENCE_WOOD) {
        w = 1.8;
        h = 1.0;
        walkable = false;
      } else if (
        this.selectedPropType === PropType.FLOWERS_WILD ||
        this.selectedPropType === PropType.FLOWERS_BLUE ||
        this.selectedPropType === PropType.FLOWER_ROCK
      ) {
        w = 1.0;
        h = 1.0;
        walkable = true;
      } else if (this.selectedPropType === PropType.ROCK_BOULDER) {
        w = 1.1;
        h = 1.0;
        walkable = false;
      } else if (this.selectedPropType === PropType.SIGNPOST || this.selectedPropType === PropType.CRATE) {
        w = 1.0;
        h = 1.0;
        walkable = false;
      }

      const newProp = {
        id: `prop_${Date.now()}_${x}_${z}`,
        type: this.selectedPropType,
        gridX: x,
        gridZ: z,
        width: w,
        height: h,
        footprintWidth: fw,
        footprintDepth: fh,
        walkable,
      };

      const cmd = new EditCommand(
        this.world,
        camQuad,
        x,
        z,
        { voxelCell: oldCell ? { ...oldCell } : undefined, propData: oldProp ? { ...oldProp } : undefined },
        { voxelCell: oldCell ? { ...oldCell } : undefined, propData: newProp }
      );

      this.commandHistory.executeCommand(cmd);
    }
  }

  public eraseCell(x: number, z: number): void {
    if (!this.world.grid.isInBounds(x, z)) return;

    const oldCell = this.world.grid.getCell(x, z);
    const existingProps = this.world.billboardSystem.getProps();
    const oldProp = existingProps.find(
      (p) => x >= p.gridX && x < p.gridX + p.footprintWidth && z >= p.gridZ && z < p.gridZ + p.footprintDepth
    );

    const defaultCell: VoxelCell = {
      x,
      z,
      height: 1,
      walkable: true,
      type: TileType.GRASS,
    };

    const cmd = new EditCommand(
      this.world,
      this.camera.quaternion,
      x,
      z,
      { voxelCell: oldCell ? { ...oldCell } : undefined, propData: oldProp ? { ...oldProp } : undefined },
      { voxelCell: defaultCell, propData: undefined }
    );

    this.commandHistory.executeCommand(cmd);
  }
}
