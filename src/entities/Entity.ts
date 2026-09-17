import * as THREE from 'three';
import { PositionComponent } from './components/PositionComponent';

export abstract class Entity {
  public id: string;
  public readonly position: PositionComponent;
  public readonly containerGroup: THREE.Group;
  private components: Map<string, any> = new Map();

  constructor(id: string, initialGridX: number = 0, initialGridZ: number = 0, initialHeight: number = 1) {
    this.id = id;
    this.position = new PositionComponent(initialGridX, initialGridZ, initialHeight);
    this.addComponent('position', this.position);
    this.containerGroup = new THREE.Group();
    this.containerGroup.name = `Entity_${id}`;
    this.containerGroup.position.set(
      this.position.worldX,
      this.position.worldY,
      this.position.worldZ
    );
  }

  /**
   * Registers a component associated with a unique string identifier.
   */
  public addComponent<T>(key: string, component: T): T {
    this.components.set(key, component);
    return component;
  }

  /**
   * Retrieves a typed component by its identifier.
   */
  public getComponent<T>(key: string): T | undefined {
    return this.components.get(key) as T;
  }

  /**
   * Checks for the presence of a component.
   */
  public hasComponent(key: string): boolean {
    return this.components.has(key);
  }

  /**
   * Removes a component by identifier.
   */
  public removeComponent(key: string): boolean {
    return this.components.delete(key);
  }

  /**
   * Lists all currently registered component identifiers.
   */
  public getComponentKeys(): string[] {
    return Array.from(this.components.keys());
  }

  public abstract update(dt: number): void;
}
