import { BillboardPropData, TileType, VoxelCell } from '../types';
import { MultiChunkWorld } from '../world/MultiChunkWorld';
import * as THREE from 'three';

export interface CellStateBackup {
  voxelCell?: VoxelCell;
  propData?: BillboardPropData;
}

export class EditCommand {
  private world: MultiChunkWorld;
  private cameraQuaternion: THREE.Quaternion;
  public readonly gridX: number;
  public readonly gridZ: number;
  private oldBackup: CellStateBackup;
  private newBackup: CellStateBackup;

  constructor(
    world: MultiChunkWorld,
    cameraQuaternion: THREE.Quaternion,
    gridX: number,
    gridZ: number,
    oldBackup: CellStateBackup,
    newBackup: CellStateBackup
  ) {
    this.world = world;
    this.cameraQuaternion = cameraQuaternion;
    this.gridX = gridX;
    this.gridZ = gridZ;
    this.oldBackup = oldBackup;
    this.newBackup = newBackup;
  }

  public execute(): void {
    this.applyState(this.newBackup);
  }

  public undo(): void {
    this.applyState(this.oldBackup);
  }

  private applyState(backup: CellStateBackup): void {
    if (backup.voxelCell) {
      this.world.grid.setCell(this.gridX, this.gridZ, { ...backup.voxelCell });
    }

    // Handle billboard prop changes
    this.world.billboardSystem.removePropAt(this.gridX, this.gridZ);
    if (backup.propData) {
      this.world.billboardSystem.addProp({ ...backup.propData }, this.cameraQuaternion);
    }

    // Rebuild meshes
    this.world.rebuildAllChunks();
    this.world.billboardSystem.buildBillboards(this.cameraQuaternion);
  }
}

export class CommandHistory {
  private undoStack: EditCommand[] = [];
  private redoStack: EditCommand[] = [];
  private maxHistory: number = 50;

  public executeCommand(cmd: EditCommand): void {
    cmd.execute();
    this.undoStack.push(cmd);
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
    this.redoStack = []; // Clear redo stack on new action
  }

  public undo(): boolean {
    const cmd = this.undoStack.pop();
    if (cmd) {
      cmd.undo();
      this.redoStack.push(cmd);
      return true;
    }
    return false;
  }

  public redo(): boolean {
    const cmd = this.redoStack.pop();
    if (cmd) {
      cmd.execute();
      this.undoStack.push(cmd);
      return true;
    }
    return false;
  }

  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  public clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}
