import { SkillNode } from '../types';
import { INITIAL_SKILL_TREE } from '../data/SkillTreeData';
import { globalEventBus } from './EventBus';

export class SkillTreeSystem {
  private nodes: Map<string, SkillNode> = new Map();
  public availablePoints: number = 2; // Start with 2 bonus skill points for instant ARPG gratification

  constructor() {
    this.loadInitialTree();
    this.loadFromStorage();
  }

  private loadInitialTree(): void {
    INITIAL_SKILL_TREE.forEach((node) => {
      this.nodes.set(node.id, { ...node });
    });
  }

  public getNode(id: string): SkillNode | undefined {
    return this.nodes.get(id);
  }

  public getAllNodes(): SkillNode[] {
    return Array.from(this.nodes.values());
  }

  public getUnlockedNodes(): SkillNode[] {
    return this.getAllNodes().filter((n) => n.unlocked);
  }

  /**
   * Validates if a node is unlockable based on Directed Graph Prerequisites and Point Cost
   */
  public isNodeUnlockable(id: string): { unlockable: boolean; reason?: string } {
    const node = this.nodes.get(id);
    if (!node) {
      return { unlockable: false, reason: 'El nodo no existe' };
    }

    if (node.unlocked) {
      return { unlockable: false, reason: 'Esta habilidad ya está dominada' };
    }

    if (this.availablePoints < node.cost) {
      return {
        unlockable: false,
        reason: `Puntos insuficientes (Requiere ${node.cost} pt${node.cost > 1 ? 's' : ''}, tienes ${this.availablePoints})`,
      };
    }

    // Validate Directed Graph Edges / Prerequisites
    for (const prereqId of node.prerequisites) {
      const prereqNode = this.nodes.get(prereqId);
      if (!prereqNode || !prereqNode.unlocked) {
        return {
          unlockable: false,
          reason: `Requiere desbloquear primero: ${prereqNode?.name || prereqId}`,
        };
      }
    }

    return { unlockable: true };
  }

  /**
   * Attempts to unlock a node in the graph
   */
  public unlockNode(id: string): boolean {
    const check = this.isNodeUnlockable(id);
    if (!check.unlockable) {
      return false;
    }

    const node = this.nodes.get(id)!;
    node.unlocked = true;
    this.availablePoints -= node.cost;

    this.saveToStorage();
    this.emitChange();
    return true;
  }

  /**
   * Resets all unlocked skill nodes and refunds all spent skill points
   */
  public respec(): void {
    let refunded = 0;
    this.nodes.forEach((node) => {
      if (node.unlocked) {
        refunded += node.cost;
        node.unlocked = false;
      }
    });

    this.availablePoints += refunded;
    this.saveToStorage();
    this.emitChange();
  }

  public addSkillPoints(amount: number): void {
    this.availablePoints += amount;
    this.saveToStorage();
    this.emitChange();
  }

  /**
   * Calculates the combined stat modifiers from all unlocked nodes
   */
  public getCumulativeModifiers(): {
    attack: number;
    defense: number;
    maxHp: number;
    critChance: number;
    critDamage: number;
    lifeSteal: number;
    speedBonus: number;
    bonusExp: number;
  } {
    const total = {
      attack: 0,
      defense: 0,
      maxHp: 0,
      critChance: 0,
      critDamage: 0,
      lifeSteal: 0,
      speedBonus: 0,
      bonusExp: 0,
    };

    this.getUnlockedNodes().forEach((node) => {
      if (node.modifiers.attack) total.attack += node.modifiers.attack;
      if (node.modifiers.defense) total.defense += node.modifiers.defense;
      if (node.modifiers.maxHp) total.maxHp += node.modifiers.maxHp;
      if (node.modifiers.critChance) total.critChance += node.modifiers.critChance;
      if (node.modifiers.critDamage) total.critDamage += node.modifiers.critDamage;
      if (node.modifiers.lifeSteal) total.lifeSteal += node.modifiers.lifeSteal;
      if (node.modifiers.speedBonus) total.speedBonus += node.modifiers.speedBonus;
      if (node.modifiers.bonusExp) total.bonusExp += node.modifiers.bonusExp;
    });

    return total;
  }

  private emitChange(): void {
    globalEventBus.emit('skills:tree_updated', {
      nodes: this.getAllNodes(),
      availablePoints: this.availablePoints,
    });
  }

  private saveToStorage(): void {
    try {
      const state = {
        availablePoints: this.availablePoints,
        unlockedNodeIds: this.getUnlockedNodes().map((n) => n.id),
      };
      localStorage.setItem('octopath_skill_tree', JSON.stringify(state));
    } catch (err) {
      console.warn('Failed to save skill tree:', err);
    }
  }

  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem('octopath_skill_tree');
      if (data) {
        const parsed = JSON.parse(data);
        if (typeof parsed.availablePoints === 'number') {
          this.availablePoints = parsed.availablePoints;
        }
        if (Array.isArray(parsed.unlockedNodeIds)) {
          parsed.unlockedNodeIds.forEach((id: string) => {
            const node = this.nodes.get(id);
            if (node) node.unlocked = true;
          });
        }
      }
    } catch (err) {
      console.warn('Failed to load skill tree:', err);
    }
  }
}
