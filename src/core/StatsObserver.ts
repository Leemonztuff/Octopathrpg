import { CharacterStats, EquipmentSlot, Item } from '../types';
import { globalEventBus } from './EventBus';
import { InventorySystem } from './InventorySystem';
import { SkillTreeSystem } from './SkillTreeSystem';
import { ProgressionManager } from './ProgressionManager';

export class StatsObserver {
  private inventorySystem: InventorySystem;
  private skillTreeSystem: SkillTreeSystem;
  private progressionManager: ProgressionManager;
  private currentStats: CharacterStats;
  private unbindHandlers: (() => void)[] = [];

  constructor(
    inventorySystem: InventorySystem,
    skillTreeSystem: SkillTreeSystem,
    progressionManager: ProgressionManager
  ) {
    this.inventorySystem = inventorySystem;
    this.skillTreeSystem = skillTreeSystem;
    this.progressionManager = progressionManager;

    // Initial stats
    this.currentStats = {
      level: 1,
      currentExp: 0,
      maxExp: 100,
      skillPoints: 2,
      currentHp: 100,
      maxHp: 100,
      baseAttack: 10,
      totalAttack: 10,
      baseDefense: 5,
      totalDefense: 5,
      critChance: 0.05,
      critDamage: 1.5,
      lifeSteal: 0.0,
      moveSpeedMod: 1.0,
      bonusExpMod: 1.0,
      gold: 150,
    };

    this.bindObservers();
    this.recalculateStats();
  }

  /**
   * Observer Pattern: Subscribes to changes in Inventory, Equipment, Skills, and Progression
   */
  private bindObservers(): void {
    const u1 = globalEventBus.on('inventory:updated', () => {
      this.recalculateStats();
    });

    const u2 = globalEventBus.on('skills:tree_updated', () => {
      this.recalculateStats();
    });

    const u3 = globalEventBus.on('progression:level_up', () => {
      this.recalculateStats();
    });

    this.unbindHandlers.push(u1, u2, u3);
  }

  public destroy(): void {
    this.unbindHandlers.forEach((u) => u());
  }

  /**
   * Pure calculation function recalculating all combat stats from Equipment + Skill Tree + Level
   */
  public recalculateStats(): CharacterStats {
    const level = this.progressionManager.level;
    const currentExp = this.progressionManager.currentExp;
    const maxExp = this.progressionManager.maxExp;
    const skillPoints = this.skillTreeSystem.availablePoints;
    const gold = this.inventorySystem.gold;

    // 1. Base Stats scaled by Level
    const baseHp = 100 + (level - 1) * 20;
    const baseAttack = 10 + (level - 1) * 3;
    const baseDefense = 5 + (level - 1) * 2;
    let baseCritChance = 0.05; // 5% default
    let baseCritDamage = 1.5;  // 150% default
    let baseLifeSteal = 0.0;
    let baseSpeedMod = 1.0;
    let baseExpMod = 1.0;

    // 2. Sum Equipment Modifiers
    let equipAttack = 0;
    let equipDefense = 0;
    let equipHp = 0;
    let equipCritChance = 0;
    let equipCritDamage = 0;
    let equipLifeSteal = 0;
    let equipSpeed = 0;
    let equipBonusExp = 0;

    const equippedItems = this.inventorySystem.getEquippedList();
    equippedItems.forEach((item) => {
      if (item.statMods) {
        if (item.statMods.attack) equipAttack += item.statMods.attack;
        if (item.statMods.defense) equipDefense += item.statMods.defense;
        if (item.statMods.maxHp) equipHp += item.statMods.maxHp;
        if (item.statMods.critChance) equipCritChance += item.statMods.critChance;
        if (item.statMods.critDamage) equipCritDamage += item.statMods.critDamage;
        if (item.statMods.lifeSteal) equipLifeSteal += item.statMods.lifeSteal;
        if (item.statMods.speedBonus) equipSpeed += item.statMods.speedBonus;
        if (item.statMods.bonusExp) equipBonusExp += item.statMods.bonusExp;
      }
    });

    // 3. Sum Skill Tree Modifiers
    const skillMods = this.skillTreeSystem.getCumulativeModifiers();

    // 4. Combined Final Stats
    const finalMaxHp = Math.round(baseHp + equipHp + skillMods.maxHp);
    const finalAttack = Math.round(baseAttack + equipAttack + skillMods.attack);
    const finalDefense = Math.round(baseDefense + equipDefense + skillMods.defense);
    const finalCritChance = Math.min(0.95, baseCritChance + equipCritChance + skillMods.critChance);
    const finalCritDamage = Math.round((baseCritDamage + equipCritDamage + skillMods.critDamage) * 100) / 100;
    const finalLifeSteal = Math.min(0.5, baseLifeSteal + equipLifeSteal + skillMods.lifeSteal);
    const finalSpeedMod = Math.round((baseSpeedMod + equipSpeed + skillMods.speedBonus) * 100) / 100;
    const finalBonusExp = Math.round((baseExpMod + equipBonusExp + skillMods.bonusExp) * 100) / 100;

    // Retain current HP safely within new maxHp
    const prevMax = this.currentStats?.maxHp || finalMaxHp;
    const currentHp = this.currentStats ? Math.min(finalMaxHp, this.currentStats.currentHp + (finalMaxHp - prevMax)) : finalMaxHp;

    this.currentStats = {
      level,
      currentExp,
      maxExp,
      skillPoints,
      currentHp: Math.max(1, currentHp),
      maxHp: finalMaxHp,
      baseAttack,
      totalAttack: finalAttack,
      baseDefense,
      totalDefense: finalDefense,
      critChance: finalCritChance,
      critDamage: finalCritDamage,
      lifeSteal: finalLifeSteal,
      moveSpeedMod: finalSpeedMod,
      bonusExpMod: finalBonusExp,
      gold,
    };

    // Emit recalculated stats event (Observer Notification)
    globalEventBus.emit('stats:recalculated', { ...this.currentStats });
    return this.currentStats;
  }

  public getStats(): CharacterStats {
    return this.currentStats;
  }
}
