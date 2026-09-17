/**
 * High-Performance Generic Object Pool to prevent GC allocation spikes
 */
export class ObjectPool<T> {
  private inactiveInstances: T[] = [];
  private inactiveSet: Set<T> = new Set();
  private createFn: () => T;
  private resetFn?: (obj: T) => void;

  // Track metrics for pool performance reporting
  public totalCreated: number = 0;
  public totalAcquired: number = 0;
  public totalReleased: number = 0;

  constructor(createFn: () => T, resetFn?: (obj: T) => void) {
    this.createFn = createFn;
    this.resetFn = resetFn;
  }

  /**
   * Acquires an inactive instance from the pool or spawns a new one if exhausted.
   */
  public acquire(): T {
    this.totalAcquired++;
    if (this.inactiveInstances.length > 0) {
      const obj = this.inactiveInstances.pop()!;
      this.inactiveSet.delete(obj);
      if (this.resetFn) {
        this.resetFn(obj);
      }
      return obj;
    }

    this.totalCreated++;
    const obj = this.createFn();
    return obj;
  }

  /**
   * Deactivates the instance and returns it safely to the pool.
   */
  public release(obj: T): void {
    this.totalReleased++;
    // O(1) duplicate check via Set
    if (!this.inactiveSet.has(obj)) {
      this.inactiveInstances.push(obj);
      this.inactiveSet.add(obj);
    }
  }

  /**
   * Pre-allocates a set number of instances in the pool.
   */
  public warm(size: number): void {
    for (let i = 0; i < size; i++) {
      this.totalCreated++;
      const obj = this.createFn();
      this.inactiveInstances.push(obj);
      this.inactiveSet.add(obj);
    }
  }

  /**
   * Returns current pool stats
   */
  public getStats() {
    return {
      inactiveCount: this.inactiveInstances.length,
      totalCreated: this.totalCreated,
      totalAcquired: this.totalAcquired,
      totalReleased: this.totalReleased,
    };
  }
}
