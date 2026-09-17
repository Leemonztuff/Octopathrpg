import { Item, EquipmentSlot } from '../types';
import { globalEventBus } from './EventBus';
import { LootGenerator } from '../data/LootTables';

export class InventorySystem {
  public inventory: (Item | null)[] = new Array(24).fill(null);
  
  public equipped: Record<EquipmentSlot, Item | null> = {
    weapon: null,
    armor: null,
    helm: null,
    boots: null,
    ring: null,
    amulet: null,
    accessory: null,
  };

  public hotbar: (Item | null)[] = new Array(4).fill(null);
  public gold: number = 150;
  public gems: number = 12;
  public energy: number = 15;
  public maxEnergy: number = 15;

  constructor() {
    this.setupStarterLoadout();
    this.loadFromStorage();
  }

  private setupStarterLoadout(): void {
    // Initial starter equipment
    this.equipped.weapon = LootGenerator.generateItem({ forcedSlot: 'weapon', forcedRarity: 'magic', level: 1 });
    this.equipped.armor = LootGenerator.generateItem({ forcedSlot: 'armor', forcedRarity: 'common', level: 1 });
    this.equipped.helm = LootGenerator.generateItem({ forcedSlot: 'helm', forcedRarity: 'common', level: 1 });
    this.equipped.boots = LootGenerator.generateItem({ forcedSlot: 'boots', forcedRarity: 'common', level: 1 });
    this.equipped.ring = LootGenerator.generateItem({ forcedSlot: 'ring', forcedRarity: 'magic', level: 1 });
    this.equipped.amulet = LootGenerator.generateItem({ forcedSlot: 'amulet', forcedRarity: 'rare', level: 1 });

    // Initial starter inventory
    this.inventory[0] = {
      id: 'pocion_hp_starter_1',
      name: 'Poción de Vida',
      slot: 'consumable',
      rarity: 'common',
      healAmount: 50,
      icon: '🧪',
      description: 'Restaura 50 puntos de salud inmediatamente.',
      value: 15,
    };
    this.inventory[1] = {
      id: 'pocion_hp_starter_2',
      name: 'Poción de Vida',
      slot: 'consumable',
      rarity: 'common',
      healAmount: 50,
      icon: '🧪',
      description: 'Restaura 50 puntos de salud inmediatamente.',
      value: 15,
    };
    this.inventory[2] = LootGenerator.generateItem({ forcedSlot: 'weapon', forcedRarity: 'rare', level: 1 });
    this.inventory[3] = LootGenerator.generateItem({ forcedSlot: 'armor', forcedRarity: 'magic', level: 1 });

    // Hotbar potions
    this.hotbar[0] = this.inventory[0];
    this.hotbar[1] = this.inventory[1];
  }

  public getEquippedList(): Item[] {
    return Object.values(this.equipped).filter(Boolean) as Item[];
  }

  public addItem(item: Item): boolean {
    const freeIdx = this.inventory.findIndex((slot) => slot === null);
    if (freeIdx === -1) {
      return false; // Inventory full
    }

    this.inventory[freeIdx] = item;
    this.saveToStorage();
    this.emitChange();
    return true;
  }

  public equipItem(item: Item, fromInventoryIndex?: number): boolean {
    if (item.slot === 'consumable') return false;

    const slot = item.slot as EquipmentSlot;
    const currentEquipped = this.equipped[slot];

    // Equip item into target slot
    this.equipped[slot] = item;

    // Swap or remove from inventory
    if (fromInventoryIndex !== undefined && fromInventoryIndex >= 0 && fromInventoryIndex < this.inventory.length) {
      this.inventory[fromInventoryIndex] = currentEquipped;
    } else {
      // If equipping without index, remove first occurrence of item from inventory
      const foundIdx = this.inventory.findIndex((i) => i?.id === item.id);
      if (foundIdx !== -1) {
        this.inventory[foundIdx] = currentEquipped;
      }
    }

    this.saveToStorage();
    this.emitChange();
    return true;
  }

  public unequipItem(slot: EquipmentSlot): boolean {
    const item = this.equipped[slot];
    if (!item) return false;

    const freeIdx = this.inventory.findIndex((s) => s === null);
    if (freeIdx === -1) {
      return false; // Cannot unequip when inventory is full
    }

    this.inventory[freeIdx] = item;
    this.equipped[slot] = null;

    this.saveToStorage();
    this.emitChange();
    return true;
  }

  public removeItem(index: number): Item | null {
    if (index < 0 || index >= this.inventory.length) return null;
    const item = this.inventory[index];
    this.inventory[index] = null;
    this.saveToStorage();
    this.emitChange();
    return item;
  }

  public useItem(index: number): Item | null {
    const item = this.inventory[index];
    if (item && item.slot === 'consumable') {
      this.inventory[index] = null;
      this.saveToStorage();
      this.emitChange();
      return item;
    }
    return null;
  }

  public sellItem(index: number): number {
    const item = this.inventory[index];
    if (!item) return 0;

    const saleValue = item.value || 10;
    this.inventory[index] = null;
    this.gold += saleValue;

    this.saveToStorage();
    this.emitChange();
    return saleValue;
  }

  public addGold(amount: number): void {
    this.gold += Math.max(0, amount);
    this.saveToStorage();
    this.emitChange();
  }

  public spendGold(amount: number): boolean {
    if (this.gold >= amount) {
      this.gold -= amount;
      this.saveToStorage();
      this.emitChange();
      return true;
    }
    return false;
  }

  public emitChange(): void {
    globalEventBus.emit('inventory:updated', {
      inventory: [...this.inventory],
      equipped: { ...this.equipped },
      gold: this.gold,
      gems: this.gems,
      energy: this.energy,
      maxEnergy: this.maxEnergy,
    });
  }

  private saveToStorage(): void {
    try {
      const data = {
        inventory: this.inventory,
        equipped: this.equipped,
        gold: this.gold,
        gems: this.gems,
        energy: this.energy,
        maxEnergy: this.maxEnergy,
      };
      localStorage.setItem('octopath_inventory_data', JSON.stringify(data));
    } catch (err) {
      console.warn('Failed to save inventory:', err);
    }
  }

  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem('octopath_inventory_data');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.inventory)) {
          this.inventory = parsed.inventory;
        }
        if (parsed.equipped) {
          this.equipped = { ...this.equipped, ...parsed.equipped };
        }
        if (typeof parsed.gold === 'number') {
          this.gold = parsed.gold;
        }
        if (typeof parsed.gems === 'number') {
          this.gems = parsed.gems;
        }
        if (typeof parsed.energy === 'number') {
          this.energy = parsed.energy;
        }
        if (typeof parsed.maxEnergy === 'number') {
          this.maxEnergy = parsed.maxEnergy;
        }
      }
    } catch (err) {
      console.warn('Failed to load inventory:', err);
    }
  }
}
