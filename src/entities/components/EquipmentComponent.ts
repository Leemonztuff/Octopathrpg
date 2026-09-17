import { Item, EquipmentSlot, CharacterStats } from '../../types';

export class EquipmentComponent {
  public equipped: Record<EquipmentSlot, Item | null> = {
    weapon: null,
    armor: null,
    helm: null,
    boots: null,
    ring: null,
    amulet: null,
    accessory: null,
  };

  public hotbar: (Item | null)[] = [
    { id: 'pocion_vida', name: 'Poción de Vida', slot: 'consumable', healAmount: 50, icon: '🧪', rarity: 'common' },
    { id: 'pocion_vida', name: 'Poción de Vida', slot: 'consumable', healAmount: 50, icon: '🧪', rarity: 'common' },
  ];

  public baseAttack: number = 10;
  public baseDefense: number = 5;
  public totalAttack: number = 10;
  public totalDefense: number = 5;
  public critChance: number = 0.05;
  public critDamage: number = 1.5;
  public lifeSteal: number = 0.0;
  public moveSpeedMod: number = 1.0;

  constructor() {}

  public applyRecalculatedStats(stats: CharacterStats): void {
    this.totalAttack = stats.totalAttack;
    this.totalDefense = stats.totalDefense;
    this.critChance = stats.critChance;
    this.critDamage = stats.critDamage;
    this.lifeSteal = stats.lifeSteal;
    this.moveSpeedMod = stats.moveSpeedMod;
  }

  public equipItem(item: Item): boolean {
    if (item.slot === 'consumable') return false;
    const slot = item.slot as EquipmentSlot;
    this.equipped[slot] = item;
    return true;
  }

  public useConsumable(slotIndex: number): Item | null {
    const item = this.hotbar[slotIndex];
    if (item && item.slot === 'consumable') {
      this.hotbar[slotIndex] = null;
      return item;
    }
    return null;
  }

  public addItemToHotbar(item: Item): boolean {
    const idx = this.hotbar.findIndex((slot) => slot === null);
    if (idx !== -1) {
      this.hotbar[idx] = item;
      return true;
    }
    return false;
  }
}

