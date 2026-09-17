import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { GameEngine } from '../core/GameEngine';
import { globalEventBus } from '../core/EventBus';
import { Direction, GridPos, Quest, Item, EquipmentSlot, CharacterStats, SkillNode, ShopItem } from '../types';

interface StateContextType {
  engine: GameEngine | null;
  setEngine: (engine: GameEngine | null) => void;
  playerGrid: GridPos;
  setPlayerGrid: (pos: GridPos) => void;
  playerHp: { current: number; max: number };
  setPlayerHp: (hp: { current: number; max: number }) => void;
  playerStats: { attack: number; defense: number };
  setPlayerStats: (stats: { attack: number; defense: number }) => void;
  inventory: (Item | null)[];
  setInventory: (inv: (Item | null)[]) => void;
  equipped: Record<EquipmentSlot, Item | null>;
  setEquipped: (equipped: Record<EquipmentSlot, Item | null>) => void;
  gold: number;
  setGold: (gold: number) => void;
  skillNodes: SkillNode[];
  setSkillNodes: (nodes: SkillNode[]) => void;
  availableSkillPoints: number;
  setAvailableSkillPoints: (pts: number) => void;
  activeQuest: Quest | null;
  setActiveQuest: (quest: Quest | null) => void;
  isMoving: boolean;
  setIsMoving: (moving: boolean) => void;
  dialogue: { npcName: string; lines: string[]; questId?: string } | null;
  setDialogue: (dialogue: { npcName: string; lines: string[]; questId?: string } | null) => void;
  shopData: { shopName: string; npcName: string; items: ShopItem[] } | null;
  setShopData: (data: { shopName: string; npcName: string; items: ShopItem[] } | null) => void;
  toastMessage: string | null;
  showNotification: (msg: string) => void;
  showCharacterModal: boolean;
  setShowCharacterModal: (show: boolean) => void;
  modalViewMode: 'mobile_roster' | 'classic';
  setModalViewMode: (mode: 'mobile_roster' | 'classic') => void;
  syncFromEngine: (engine: GameEngine) => void;
}

const StateContext = createContext<StateContextType | undefined>(undefined);

export const GameStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [engine, setEngineState] = useState<GameEngine | null>(null);
  const [playerGrid, setPlayerGrid] = useState<GridPos>({ x: 15, z: 15 });
  const [playerHp, setPlayerHp] = useState<{ current: number; max: number }>({ current: 100, max: 100 });
  const [playerStats, setPlayerStats] = useState<{ attack: number; defense: number }>({ attack: 10, defense: 5 });
  const [inventory, setInventory] = useState<(Item | null)[]>([]);
  const [equipped, setEquipped] = useState<Record<EquipmentSlot, Item | null>>({
    weapon: null,
    armor: null,
    helm: null,
    boots: null,
    ring: null,
    amulet: null,
    accessory: null,
  });
  const [gold, setGold] = useState<number>(150);
  const [skillNodes, setSkillNodes] = useState<SkillNode[]>([]);
  const [availableSkillPoints, setAvailableSkillPoints] = useState<number>(0);
  const [activeQuest, setActiveQuest] = useState<Quest | null>(null);
  const [isMoving, setIsMoving] = useState<boolean>(false);
  const [dialogue, setDialogue] = useState<{ npcName: string; lines: string[]; questId?: string } | null>(null);
  const [shopData, setShopData] = useState<{ shopName: string; npcName: string; items: ShopItem[] } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showCharacterModal, setShowCharacterModal] = useState<boolean>(false);
  const [modalViewMode, setModalViewMode] = useState<'mobile_roster' | 'classic'>('mobile_roster');

  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const syncFromEngine = (engineInstance: GameEngine) => {
    const player = engineInstance.getPlayer();
    if (player) {
      if (engineInstance.statsObserver) {
        const statsObj = engineInstance.statsObserver.getStats();
        setPlayerHp({ current: statsObj.currentHp, max: statsObj.maxHp });
        setPlayerStats({ attack: statsObj.totalAttack, defense: statsObj.totalDefense });
      }
      if (engineInstance.inventorySystem) {
        setInventory([...engineInstance.inventorySystem.inventory]);
        setEquipped({ ...engineInstance.inventorySystem.equipped });
        setGold(engineInstance.inventorySystem.gold);
      }
      if (engineInstance.skillTreeSystem) {
        setSkillNodes([...engineInstance.skillTreeSystem.getAllNodes()]);
        setAvailableSkillPoints(engineInstance.skillTreeSystem.availablePoints);
      }
    }
    const q = engineInstance.questManager.getQuest('derrotar_slimes');
    if (q) {
      setActiveQuest({ ...q });
    }
  };

  const setEngine = (newEngine: GameEngine | null) => {
    setEngineState(newEngine);
    if (newEngine) {
      syncFromEngine(newEngine);
    }
  };

  // Setup Event Bus Subscriptions (Centralized State Loop)
  useEffect(() => {
    if (!engine) return;

    const unbindStart = globalEventBus.on('player:move_start', () => {
      setIsMoving(true);
    });

    const unbindComplete = globalEventBus.on('player:move_complete', (payload) => {
      setIsMoving(false);
      setPlayerGrid(payload.to);
    });

    const unbindBlocked = globalEventBus.on('player:move_blocked', () => {
      // Intentionally silent: standard RPG behavior when encountering impassable walls
    });

    const unbindAttack = globalEventBus.on('combat:player_attack', (payload) => {
      if (payload.hit) {
        showNotification(`⚔️ ¡Impacto a ${payload.enemyName} (${payload.damage} DMG)!`);
      } else {
        showNotification(`⚔️ Golpe al aire`);
      }
    });

    const unbindDash = globalEventBus.on('combat:player_dash', () => {
      showNotification(`⚡ ¡Esquiva rápida evasiva!`);
    });

    const unbindDamaged = globalEventBus.on('combat:player_damaged', (payload) => {
      setPlayerHp({ current: payload.currentHp, max: payload.maxHp });
      showNotification(`💥 ¡Recibiste ${payload.amount} de daño!`);
    });

    const unbindHealed = globalEventBus.on('combat:player_healed', (payload) => {
      setPlayerHp({ current: payload.currentHp, max: payload.maxHp });
      showNotification(`💚 ¡Curación de ${payload.amount} HP!`);
    });

    const unbindDefeated = globalEventBus.on('combat:enemy_defeated', (payload) => {
      showNotification(`🏆 ¡Derrotaste a ${payload.name}!`);
      const q = engine.questManager.getQuest('derrotar_slimes');
      if (q) setActiveQuest({ ...q });
    });

    const unbindDialogue = globalEventBus.on('dialogue:start', (payload) => {
      setDialogue(payload);
    });

    const unbindStats = globalEventBus.on('stats:recalculated', (statsObj) => {
      setPlayerHp({ current: statsObj.currentHp, max: statsObj.maxHp });
      setPlayerStats({ attack: statsObj.totalAttack, defense: statsObj.totalDefense });
      setGold(statsObj.gold);
    });

    const unbindInventory = globalEventBus.on('inventory:updated', (payload) => {
      setInventory([...payload.inventory]);
      setEquipped({ ...payload.equipped });
      setGold(payload.gold);
    });

    const unbindSkills = globalEventBus.on('skills:tree_updated', (payload) => {
      setSkillNodes([...payload.nodes]);
      setAvailableSkillPoints(payload.availablePoints);
    });

    const unbindLevelUp = globalEventBus.on('progression:level_up', (payload) => {
      showNotification(`★ ¡SUBISTE AL NIVEL ${payload.newLevel}! (+1 Habilidad) ★`);
    });

    const unbindLoot = globalEventBus.on('loot:dropped', (payload) => {
      if (payload.item) {
        showNotification(`🎁 ¡Nuevo Botín: ${payload.item.name}!`);
      }
    });

    const unbindQuest = globalEventBus.on('quest:updated', () => {
      const q = engine.questManager.getQuest('derrotar_slimes');
      if (q) {
        setActiveQuest({ ...q });
        showNotification(`📜 Misión actualizada: ${q.title} (${q.status})`);
      }
    });

    const unbindShop = globalEventBus.on('shop:open', (payload) => {
      setShopData(payload);
    });

    return () => {
      unbindStart();
      unbindComplete();
      unbindBlocked();
      unbindAttack();
      unbindDash();
      unbindDamaged();
      unbindHealed();
      unbindDefeated();
      unbindDialogue();
      unbindStats();
      unbindInventory();
      unbindSkills();
      unbindLevelUp();
      unbindLoot();
      unbindQuest();
      unbindShop();
    };
  }, [engine]);

  return (
    <StateContext.Provider
      value={{
        engine,
        setEngine,
        playerGrid,
        setPlayerGrid,
        playerHp,
        setPlayerHp,
        playerStats,
        setPlayerStats,
        inventory,
        setInventory,
        equipped,
        setEquipped,
        gold,
        setGold,
        skillNodes,
        setSkillNodes,
        availableSkillPoints,
        setAvailableSkillPoints,
        activeQuest,
        setActiveQuest,
        isMoving,
        setIsMoving,
        dialogue,
        setDialogue,
        toastMessage,
        showNotification,
        showCharacterModal,
        setShowCharacterModal,
        modalViewMode,
        setModalViewMode,
        syncFromEngine,
        shopData,
        setShopData,
      }}
    >
      {children}
    </StateContext.Provider>
  );
};

export const useGameState = () => {
  const context = useContext(StateContext);
  if (context === undefined) {
    throw new Error('useGameState must be used within a GameStateProvider');
  }
  return context;
};
