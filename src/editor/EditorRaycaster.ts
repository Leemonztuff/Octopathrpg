import * as THREE from 'three';
import { WorldGrid } from '../world/WorldGrid';

export interface RaycastGridResult {
  gridX: number;
  gridZ: number;
  height: number;
  intersectionPoint: THREE.Vector3;
}

export class EditorRaycaster {
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private groundPlane: THREE.Plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private worldGrid: WorldGrid;

  constructor(worldGrid: WorldGrid) {
    this.worldGrid = worldGrid;
  }

  /**
   * Raycasts from camera through normalized device coordinates (ndcX, ndcY)
   * to calculate the corresponding grid cell (gridX, gridZ).
   */
  public raycastGrid(
    camera: THREE.Camera,
    ndcX: number,
    ndcY: number
  ): RaycastGridResult | null {
    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);

    const hitPoint = new THREE.Vector3();
    const hit = this.raycaster.ray.intersectPlane(this.groundPlane, hitPoint);

    if (!hit) return null;

    const gridX = Math.floor(hitPoint.x);
    const gridZ = Math.floor(hitPoint.z);

    if (!this.worldGrid.isInBounds(gridX, gridZ)) {
      return null;
    }

    const currentHeight = this.worldGrid.getVoxelHeight(gridX, gridZ);

    return {
      gridX,
      gridZ,
      height: currentHeight,
      intersectionPoint: hitPoint,
    };
  }
}
