import * as THREE from 'three';
import { BillboardPropData, PropType } from '../types';
import { VoxelMaterials } from '../world/VoxelMaterials';
import { WorldGrid } from '../world/WorldGrid';
import { CurvedWorldManager } from '../renderer/CurvedWorldManager';

export class BillboardSystem {
  public readonly group: THREE.Group;
  private materials: VoxelMaterials;
  private worldGrid: WorldGrid;
  private props: BillboardPropData[] = [];
  private instancedMeshes: Map<PropType, THREE.InstancedMesh> = new Map();

  // Per-instance cache & alignment state to make alignAllToCamera allocation-free
  // and O(n) only when the camera quaternion actually changes.
  private instancePositions: Map<PropType, Float32Array> = new Map();
  private alignDummy: THREE.Object3D = new THREE.Object3D();
  private lastAppliedQuaternion: THREE.Quaternion | null = null;

  constructor(worldGrid: WorldGrid, materials: VoxelMaterials) {
    this.worldGrid = worldGrid;
    this.materials = materials;
    this.group = new THREE.Group();
    this.group.name = 'BillboardSystemGroup';
  }

  public getProps(): BillboardPropData[] {
    return this.props;
  }

  /**
   * Removes all registered billboard props and clears grid references.
   */
  public clearProps(): void {
    this.props = [];
    // Dispose geometries and materials before removing children
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.InstancedMesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material instanceof THREE.Material) child.material.dispose();
      }
    });
    while (this.group.children.length > 0) {
      this.group.remove(this.group.children[0]);
    }
    this.instancedMeshes.clear();
    this.instancePositions.clear();
    this.lastAppliedQuaternion = null;
  }

  /**
   * Removes prop at (gridX, gridZ) if present and restores cell walkability.
   */
  public removePropAt(gridX: number, gridZ: number): boolean {
    const propIndex = this.props.findIndex((p) => {
      return (
        gridX >= p.gridX &&
        gridX < p.gridX + p.footprintWidth &&
        gridZ >= p.gridZ &&
        gridZ < p.gridZ + p.footprintDepth
      );
    });

    if (propIndex === -1) return false;

    const removedProp = this.props[propIndex];
    this.props.splice(propIndex, 1);

    // Free grid walkability for all footprint cells
    for (let dx = 0; dx < removedProp.footprintWidth; dx++) {
      for (let dz = 0; dz < removedProp.footprintDepth; dz++) {
        const tx = removedProp.gridX + dx;
        const tz = removedProp.gridZ + dz;
        const cell = this.worldGrid.getCell(tx, tz);
        if (cell) {
          cell.walkable = true;
          cell.prop = undefined;
        }
      }
    }

    return true;
  }

  /**
   * Spawns a billboard prop at (gridX, gridZ) and registers non-walkable collision in WorldGrid.
   */
  public addProp(prop: BillboardPropData, cameraQuaternion: THREE.Quaternion): void {
    this.props.push(prop);

    // Register grid collision for all occupied footprint cells
    if (!prop.walkable) {
      for (let dx = 0; dx < prop.footprintWidth; dx++) {
        for (let dz = 0; dz < prop.footprintDepth; dz++) {
          const targetX = prop.gridX + dx;
          const targetZ = prop.gridZ + dz;
          const cell = this.worldGrid.getCell(targetX, targetZ);
          if (cell) {
            cell.walkable = false;
            cell.prop = prop;
          }
        }
      }
    }
  }

  /**
   * Builds 3D billboard meshes and InstancedMeshes for all registered props.
   */
  public buildBillboards(cameraQuaternion: THREE.Quaternion): void {
    // Dispose previous objects
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.InstancedMesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material instanceof THREE.Material) child.material.dispose();
      }
    });
    while (this.group.children.length > 0) {
      this.group.remove(this.group.children[0]);
    }

    // Group props by type for instancing
    const propsByType: Map<PropType, BillboardPropData[]> = new Map();
    for (const prop of this.props) {
      if (!propsByType.has(prop.type)) {
        propsByType.set(prop.type, []);
      }
      propsByType.get(prop.type)!.push(prop);
    }

    const complexPropTypes = new Set<PropType>([
      PropType.HOUSE_FACADE,
      PropType.FOUNTAIN,
      PropType.SHOP_HOUSE_1,
      PropType.SHOP_HOUSE_2,
      PropType.SHOP_HOUSE_3,
      PropType.MANOR_HOUSE,
      PropType.GUILD_HALL,
      PropType.MARKET_STALL_RED,
      PropType.MARKET_STALL_BLUE,
      PropType.STREET_LAMP,
      PropType.STREET_LAMP_ALT,
      PropType.PORTAL_OVERWORLD,
    ]);

    propsByType.forEach((list, type) => {
      const texture = this.materials.getPropTexture(type);
      const mat = new THREE.MeshStandardMaterial({
        map: texture,
        transparent: true,
        alphaTest: 0.4, // Prevents Z-sorting artifacts and black outlines!
        depthWrite: true,
        side: THREE.DoubleSide,
        roughness: 0.8,
      });

      // Inject Curved World support to prop billboards
      CurvedWorldManager.getInstance().injectCurvedWorld(mat);

      // Sample dimensions from first prop in list
      const first = list[0];
      const geo = new THREE.PlaneGeometry(first.width, first.height);
      geo.translate(0, first.height / 2, 0); // Bottom anchor

      if (list.length > 1 && !complexPropTypes.has(type)) {
        // Use InstancedMesh for repeated vegetation
        const instMesh = new THREE.InstancedMesh(geo, mat, list.length);
        instMesh.castShadow = false;
        instMesh.receiveShadow = true;
        instMesh.frustumCulled = true;
        instMesh.userData.propType = type;

        // Cache per-instance translations so alignAllToCamera can rebuild matrices
        // from position + shared camera quaternion without decompose round-trips.
        const positions = new Float32Array(list.length * 3);
        const dummy = new THREE.Object3D();
        list.forEach((propData, index) => {
          const height = this.worldGrid.getVoxelHeight(propData.gridX, propData.gridZ);
          const worldX = propData.gridX + propData.footprintWidth / 2;
          const worldZ = propData.gridZ + propData.footprintDepth / 2;

          positions[index * 3 + 0] = worldX;
          positions[index * 3 + 1] = height;
          positions[index * 3 + 2] = worldZ;

          dummy.position.set(worldX, height, worldZ);
          dummy.quaternion.copy(cameraQuaternion);
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();

          instMesh.setMatrixAt(index, dummy.matrix);
        });

        instMesh.instanceMatrix.needsUpdate = true;
        this.instancePositions.set(type, positions);
        this.group.add(instMesh);
        this.instancedMeshes.set(type, instMesh);
      } else {
        // Single mesh or complex building / structure / interactive prop
        list.forEach((propData) => {
          const mesh = new THREE.Mesh(geo, mat);
          mesh.castShadow = false;
          mesh.receiveShadow = true;
          mesh.frustumCulled = true;

          const height = this.worldGrid.getVoxelHeight(propData.gridX, propData.gridZ);
          const worldX = propData.gridX + propData.footprintWidth / 2;
          const worldZ = propData.gridZ + propData.footprintDepth / 2;

          mesh.position.set(worldX, height, worldZ);
          mesh.quaternion.copy(cameraQuaternion);

          // Warm street lamp illumination
          if (type === PropType.STREET_LAMP || type === PropType.STREET_LAMP_ALT) {
            const lampLight = new THREE.PointLight(0xffb347, 1.2, 5.5);
            lampLight.position.set(0, propData.height * 0.75, 0.2);
            lampLight.castShadow = false;
            mesh.add(lampLight);
          } else if (type === PropType.PORTAL_OVERWORLD) {
            const portalLight = new THREE.PointLight(0x818cf8, 2.5, 7.5);
            portalLight.position.set(0, propData.height * 0.5, 0.3);
            portalLight.castShadow = false;
            mesh.add(portalLight);
          }

          this.group.add(mesh);
        });
      }
    });

    // Force a fresh alignment on the next frame: the quaternion captured during
    // build may not match the live camera quaternion yet.
    this.lastAppliedQuaternion = null;
  }

  public alignAllToCamera(cameraQuaternion: THREE.Quaternion): void {
    // Fast path: every billboard shares the camera quaternion, so we only need to
    // rebuild instance matrices when the camera actually rotated. While the player
    // stands still this is a single quaternion comparison (~O(1)) instead of O(n).
    if (this.lastAppliedQuaternion && this.lastAppliedQuaternion.equals(cameraQuaternion)) {
      return;
    }
    if (!this.lastAppliedQuaternion) {
      this.lastAppliedQuaternion = new THREE.Quaternion();
    }
    this.lastAppliedQuaternion.copy(cameraQuaternion);

    const dummy = this.alignDummy;
    dummy.scale.set(1, 1, 1);

    this.group.children.forEach((child) => {
      if (child instanceof THREE.InstancedMesh) {
        const positions = this.instancePositions.get(child.userData.propType as PropType);
        if (positions && positions.length === child.count * 3) {
          // Fast path: compose matrices directly from cached translations.
          // No getMatrixAt/decompose round-trip, no allocation per instance.
          for (let i = 0; i < child.count; i++) {
            dummy.position.fromArray(positions, i * 3);
            dummy.quaternion.copy(cameraQuaternion);
            dummy.updateMatrix();
            child.setMatrixAt(i, dummy.matrix);
          }
        } else {
          // Fallback: retain translations from the current instance matrices.
          for (let i = 0; i < child.count; i++) {
            child.getMatrixAt(i, dummy.matrix);
            dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
            dummy.quaternion.copy(cameraQuaternion);
            dummy.updateMatrix();
            child.setMatrixAt(i, dummy.matrix);
          }
        }
        child.instanceMatrix.needsUpdate = true;
      } else if (child instanceof THREE.Mesh) {
        child.quaternion.copy(cameraQuaternion);
      }
    });
  }
}
