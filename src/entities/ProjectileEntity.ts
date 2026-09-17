import * as THREE from 'three';
import { Entity } from './Entity';
import { Direction } from '../types';
import { WorldGrid } from '../world/WorldGrid';

export class ProjectileEntity extends Entity {
  public speed: number = 12; // tiles per second
  public direction: Direction = 'DOWN';
  public range: number = 8; // max tiles range
  public traveled: number = 0;
  public isActive: boolean = false;
  public damage: number = 15;
  
  private mesh: THREE.Mesh;
  private worldGrid: WorldGrid;

  constructor(id: string, worldGrid: WorldGrid) {
    // Spawn inactive far away initially
    super(id, 0, 0, -10);
    this.worldGrid = worldGrid;

    // A beautiful glowing magic orb mesh
    const geo = new THREE.SphereGeometry(0.12, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ 
      color: 0x38bdf8, // Cyan magical glow
      transparent: true, 
      opacity: 0.9 
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.containerGroup.add(this.mesh);
    this.containerGroup.visible = false;
  }

  public launch(gridX: number, gridZ: number, height: number, dir: Direction): void {
    this.direction = dir;
    this.position.setGridPos(gridX, gridZ, height + 0.45); // slight elevation from ground (chest height)
    this.syncContainerPosition();
    this.traveled = 0;
    this.isActive = true;
    this.containerGroup.visible = true;
  }

  public update(dt: number): void {
    if (!this.isActive) return;

    let dx = 0;
    let dz = 0;
    switch (this.direction) {
      case 'UP': dz = -1; break;
      case 'DOWN': dz = 1; break;
      case 'LEFT': dx = -1; break;
      case 'RIGHT': dx = 1; break;
    }

    // Move in real world space
    const step = this.speed * dt;
    this.position.worldX += dx * step;
    this.position.worldZ += dz * step;
    this.containerGroup.position.set(this.position.worldX, this.position.worldY, this.position.worldZ);

    this.traveled += step;
    
    // Check range limit
    if (this.traveled >= this.range) {
      this.deactivate();
      return;
    }

    // Check bounds
    const curGridX = Math.floor(this.position.worldX);
    const curGridZ = Math.floor(this.position.worldZ);
    if (!this.worldGrid.isInBounds(curGridX, curGridZ)) {
      this.deactivate();
    }
  }

  public deactivate(): void {
    this.isActive = false;
    this.containerGroup.visible = false;
    this.position.setGridPos(0, 0, -10); // Move out of range/view
    this.syncContainerPosition();
  }

  public syncContainerPosition(): void {
    const world = this.position.getWorldPos();
    this.containerGroup.position.set(world.x, world.y, world.z);
  }
}
