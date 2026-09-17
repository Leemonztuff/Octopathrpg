import * as THREE from 'three';
import { NpcEntity, NPCBehaviorType } from './NpcEntity';
import { WorldGrid } from '../world/WorldGrid';
import { VoxelMaterials } from '../world/VoxelMaterials';
import { ShopItem } from '../types';
import { globalEventBus } from '../core/EventBus';

export class ShopkeeperNPC extends NpcEntity {
  public shopItems: ShopItem[];
  public shopName: string;

  constructor(
    id: string,
    npcId: string,
    name: string,
    shopName: string,
    initialGridX: number,
    initialGridZ: number,
    worldGrid: WorldGrid,
    materials: VoxelMaterials,
    spriteIndex?: number,
    behaviorType: NPCBehaviorType = 'MERCHANT',
    shopItems?: ShopItem[]
  ) {
    super(id, npcId, name, initialGridX, initialGridZ, worldGrid, materials, spriteIndex, behaviorType);
    this.shopName = shopName;
    this.shopItems = shopItems || [
      {
        id: 'hp_potion',
        name: 'Poción de Vida Mayor',
        price: 40,
        item: { id: 'potion_hp', name: 'Poción de Vida Mayor', slot: 'consumable', rarity: 'common', value: 40, icon: '🧪', healAmount: 100 }
      },
      {
        id: 'mana_potion',
        name: 'Poción de Maná',
        price: 30,
        item: { id: 'potion_mp', name: 'Poción de Maná', slot: 'consumable', rarity: 'common', value: 30, icon: '✨', manaAmount: 100 }
      },
      {
        id: 'iron_sword',
        name: 'Espada del Mercado (Atq +18)',
        price: 180,
        item: { id: 'market_sword', name: 'Espada del Mercado', slot: 'weapon', rarity: 'rare', value: 180, icon: '⚔️', statMods: { attack: 18 } }
      },
      {
        id: 'market_armor',
        name: 'Coraza Reforzada (Def +15)',
        price: 200,
        item: { id: 'market_armor', name: 'Coraza Reforzada', slot: 'armor', rarity: 'rare', value: 200, icon: '🛡️', statMods: { defense: 15 } }
      }
    ];
  }

  public openShop(): void {
    const worldPos = this.position.getWorldPos();
    globalEventBus.emit('combat:floating_text', {
      text: '🛒 ¡Tienda Abierta!',
      worldPos: { x: worldPos.x, y: worldPos.y + 1.8, z: worldPos.z },
      style: 'gold',
    });
    globalEventBus.emit('shop:open', {
      shopName: this.shopName,
      npcName: this.name,
      items: this.shopItems,
    });
  }
}
