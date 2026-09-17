import { globalEventBus } from './EventBus';
import { SkillTreeSystem } from './SkillTreeSystem';

export class ProgressionManager {
  public level: number = 1;
  public currentExp: number = 0;
  public maxExp: number = 100;
  private skillTreeSystem?: SkillTreeSystem;
  private unbindHandlers: (() => void)[] = [];

  constructor(skillTreeSystem?: SkillTreeSystem) {
    this.skillTreeSystem = skillTreeSystem;
    this.loadFromStorage();
    this.calculateMaxExp();
    this.bindCombatEvents();
  }

  public setSkillTreeSystem(skillTree: SkillTreeSystem): void {
    this.skillTreeSystem = skillTree;
  }

  private calculateMaxExp(): void {
    this.maxExp = Math.round(100 * Math.pow(1.35, this.level - 1));
  }

  private bindCombatEvents(): void {
    const unbind = globalEventBus.on('combat:enemy_defeated', (payload) => {
      // Award EXP per enemy kill
      const baseExp = payload.name.toLowerCase().includes('jefe') ? 120 : 35;
      this.addExp(baseExp);
    });
    this.unbindHandlers.push(unbind);
  }

  public destroy(): void {
    this.unbindHandlers.forEach((u) => u());
  }

  public addExp(amount: number): boolean {
    this.currentExp += amount;
    let leveledUp = false;

    while (this.currentExp >= this.maxExp) {
      this.currentExp -= this.maxExp;
      this.level += 1;
      this.calculateMaxExp();
      leveledUp = true;

      // Award +1 skill point
      if (this.skillTreeSystem) {
        this.skillTreeSystem.addSkillPoints(1);
      }

      globalEventBus.emit('progression:level_up', {
        newLevel: this.level,
        skillPointsGained: 1,
      });
    }

    this.saveToStorage();
    return leveledUp;
  }

  private saveToStorage(): void {
    try {
      const data = {
        level: this.level,
        currentExp: this.currentExp,
      };
      localStorage.setItem('octopath_progression', JSON.stringify(data));
    } catch (err) {
      console.warn('Failed to save progression:', err);
    }
  }

  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem('octopath_progression');
      if (data) {
        const parsed = JSON.parse(data);
        if (typeof parsed.level === 'number') this.level = Math.max(1, parsed.level);
        if (typeof parsed.currentExp === 'number') this.currentExp = Math.max(0, parsed.currentExp);
      }
    } catch (err) {
      console.warn('Failed to load progression:', err);
    }
  }
}
