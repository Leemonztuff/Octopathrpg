import { Quest, Item } from '../types';
import { globalEventBus } from '../core/EventBus';

export class QuestManager {
  private quests: Quest[] = [
    {
      id: 'derrotar_slimes',
      title: 'Limpieza de Slimes',
      giver: 'npc_herrero',
      description: 'Derrota a 2 slimes en los alrededores de la aldea.',
      objective: {
        type: 'defeat_enemy',
        count: 2,
        currentCount: 0,
      },
      reward: {
        id: 'espada_hierro',
        name: 'Espada de Hierro',
        slot: 'weapon',
        statMods: { attack: 8 },
        icon: '⚔️',
      },
      status: 'not_started',
    },
  ];

  private unbindHandlers: (() => void)[] = [];

  constructor() {
    this.loadFromStorage();
    this.bindEvents();
  }

  private bindEvents(): void {
    const unbind = globalEventBus.on('combat:enemy_defeated', () => {
      this.checkEnemyDefeatedObjectives();
    });
    this.unbindHandlers.push(unbind);
  }

  public destroy(): void {
    this.unbindHandlers.forEach((u) => u());
  }

  public getQuest(id: string): Quest | undefined {
    return this.quests.find((q) => q.id === id);
  }

  public getAllQuests(): Quest[] {
    return this.quests;
  }

  public acceptQuest(id: string): boolean {
    const quest = this.getQuest(id);
    if (quest && quest.status === 'not_started') {
      quest.status = 'in_progress';
      this.saveToStorage();
      globalEventBus.emit('quest:updated', { questId: id, status: 'in_progress' });
      return true;
    }
    return false;
  }

  public checkEnemyDefeatedObjectives(): void {
    this.quests.forEach((q) => {
      if (q.status === 'in_progress' && q.objective.type === 'defeat_enemy') {
        if (q.objective.currentCount !== undefined && q.objective.count !== undefined) {
          q.objective.currentCount = Math.min(q.objective.count, q.objective.currentCount + 1);
          if (q.objective.currentCount >= q.objective.count) {
            q.status = 'completed';
            globalEventBus.emit('quest:updated', { questId: q.id, status: 'completed' });
          }
          this.saveToStorage();
        }
      }
    });
  }

  public completeQuest(id: string): Item | null {
    const quest = this.getQuest(id);
    if (quest && quest.status === 'completed') {
      quest.status = 'completed'; // or reward claimed
      this.saveToStorage();
      return quest.reward;
    }
    return null;
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem('octopath_quests', JSON.stringify(this.quests));
    } catch (err) {
      console.error('Failed to save quests:', err);
    }
  }

  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem('octopath_quests');
      if (data) {
        const parsed = JSON.parse(data) as Quest[];
        this.quests = parsed;
      }
    } catch (err) {
      console.error('Failed to load quests:', err);
    }
  }
}
