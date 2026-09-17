import React, { useState, useEffect } from 'react';
import { GameEngine } from '../core/GameEngine';
import { Item, EquipmentSlot, CharacterStats, SkillNode, ItemRarity } from '../types';
import { RARITY_CONFIG, LootGenerator } from '../data/LootTables';
import { HeroPortrait } from './HeroPortrait';
import { GameButton } from './components/GameButton';
import { useGameState } from '../context/StateContext';
import {
  Shield,
  Sword,
  Heart,
  Zap,
  Sparkles,
  Award,
  BookOpen,
  Backpack,
  RotateCcw,
  Check,
  Lock,
  ChevronRight,
  TrendingUp,
  Coins,
  Crosshair,
  Flame,
  Info,
} from 'lucide-react';

interface CharacterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'inventory' | 'skills' | 'stats' | 'forge';

export const CharacterModal: React.FC<CharacterModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    engine,
    activeQuest,
    playerStats,
    inventory,
    equipped,
    gold,
    skillNodes,
    availableSkillPoints,
  } = useGameState();

  const [activeTab, setActiveTab] = useState<TabType>('inventory');
  
  // Calculate stats directly from engine if needed, or fallback
  const stats: CharacterStats | null = engine?.statsObserver ? engine.statsObserver.getStats() : null;

  const [selectedSkillBranch, setSelectedSkillBranch] = useState<'all' | 'warrior' | 'guardian' | 'shadow' | 'mystic'>('all');

  // Selected item / skill for inspector tooltip
  const [selectedItem, setSelectedItem] = useState<{ item: Item; index?: number; isEquippedSlot?: EquipmentSlot } | null>(null);
  const [selectedSkillNode, setSelectedSkillNode] = useState<SkillNode | null>(null);

  // Sync auto-selection whenever modal opens
  useEffect(() => {
    if (!engine) return;

    // Auto-select first item or skill
    if (engine.inventorySystem && !selectedItem) {
      const firstItem = engine.inventorySystem.inventory.find(Boolean);
      if (firstItem) {
        setSelectedItem({ item: firstItem, index: 0 });
      }
    }
    if (engine.skillTreeSystem && !selectedSkillNode) {
      const firstNode = engine.skillTreeSystem.getAllNodes()[0];
      if (firstNode) {
        setSelectedSkillNode(firstNode);
      }
    }
  }, [isOpen, engine]);

  // Keep selectedSkillNode updated if it changes in context
  useEffect(() => {
    if (selectedSkillNode && skillNodes.length > 0) {
      const updated = skillNodes.find((n: SkillNode) => n.id === selectedSkillNode.id);
      if (updated) setSelectedSkillNode(updated);
    }
  }, [skillNodes]);

  if (!isOpen) return null;

  // Actions
  const handleEquipItem = (item: Item, inventoryIdx?: number) => {
    if (!engine) return;
    engine.equipItem(item, inventoryIdx);
    setSelectedItem(null);
  };

  const handleUnequipItem = (slot: EquipmentSlot) => {
    if (!engine) return;
    engine.unequipItem(slot);
    setSelectedItem(null);
  };

  const handleUseItem = (index: number) => {
    if (!engine) return;
    const used = engine.inventorySystem.useItem(index);
    if (used && used.healAmount) {
      engine.getPlayer().heal(used.healAmount);
    }
    setSelectedItem(null);
  };

  const handleSellItem = (index: number) => {
    if (!engine) return;
    engine.inventorySystem.sellItem(index);
    setSelectedItem(null);
  };

  const handleUnlockSkill = (nodeId: string) => {
    if (!engine) return;
    const success = engine.unlockSkill(nodeId);
    if (success && engine.skillTreeSystem) {
      const updated = engine.skillTreeSystem.getNode(nodeId);
      if (updated) setSelectedSkillNode(updated);
    }
  };

  const handleRespec = () => {
    if (!engine) return;
    engine.respecSkills();
  };

  const handleForgeTestLoot = (rarity?: ItemRarity) => {
    if (!engine) return;
    const generated = LootGenerator.generateItem({
      level: stats?.level || 1,
      forcedRarity: rarity,
    });
    engine.inventorySystem.addItem(generated);
    setSelectedItem({ item: generated });
  };

  const currentLevel = stats?.level || 1;
  const currentHp = stats?.currentHp || 100;
  const maxHp = stats?.maxHp || 100;
  const currentExp = stats?.currentExp || 0;
  const maxExp = stats?.maxExp || 100;
  const expPercent = Math.min(100, Math.round((currentExp / maxExp) * 100));

  // Equipment Slot definitions for the paperdoll view
  const SLOTS: Array<{ slot: EquipmentSlot; label: string; icon: string }> = [
    { slot: 'helm', label: 'YELMO', icon: '🪖' },
    { slot: 'amulet', label: 'AMULETO', icon: '📿' },
    { slot: 'weapon', label: 'ARMA PRINCIPAL', icon: '⚔️' },
    { slot: 'armor', label: 'ARMADURA', icon: '🛡️' },
    { slot: 'ring', label: 'ANILLO', icon: '💍' },
    { slot: 'boots', label: 'BOTAS', icon: '🥾' },
  ];

  return (
    <div className="absolute inset-0 bg-black/85 backdrop-blur-md z-40 flex items-center justify-center p-2 sm:p-4 select-none animate-in fade-in duration-150">
      {/* Outer Window Box */}
      <div className="tg-box-popup max-w-4xl w-full max-h-[95vh] flex flex-col relative text-[#f4f4f8] shadow-[0_16px_48px_rgba(0,0,0,0.95)] overflow-hidden">
        
        {/* ==================================================== */}
        {/* --- HEADER BAR WITH HERO OVERVIEW & LEVEL / EXP --- */}
        {/* ==================================================== */}
        <div className="flex items-center justify-between pb-2.5 mb-2 border-b-2 border-[#3b3a56]/80 shrink-0">
          <div className="flex items-center gap-3">
            <HeroPortrait
              size="sm"
              currentHp={currentHp}
              maxHp={maxHp}
              level={currentLevel}
              equippedWeapon={equipped.weapon}
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-pixel text-xs text-[#f0b541] tracking-wider">
                  HÉROE VANGUARDIA
                </h2>
                <span className="font-silkscreen text-[8px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/40">
                  NIVEL {currentLevel}
                </span>
                {availableSkillPoints > 0 && (
                  <span className="font-pixel text-[8px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/50 animate-pulse flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                    +{availableSkillPoints} PTS HABILIDAD
                  </span>
                )}
              </div>
              {/* EXP Bar */}
              <div className="flex items-center gap-2 mt-1">
                <span className="font-silkscreen text-[8px] text-slate-400">EXP</span>
                <div className="w-36 sm:w-48 h-2 bg-[#12111c] rounded-full border border-[#3b3a56] overflow-hidden relative">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 transition-all duration-300"
                    style={{ width: `${expPercent}%` }}
                  />
                </div>
                <span className="font-silkscreen text-[8px] text-slate-300">
                  {currentExp} / {maxExp} ({expPercent}%)
                </span>
              </div>
            </div>
          </div>

          {/* Right Header info: Gold & Close Button */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-[#141320] border border-[#3b3a56] px-2.5 py-1 rounded">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-pixel text-[9px] text-amber-300">{gold} ORO</span>
            </div>

            <button
              onClick={onClose}
              className="w-7 h-7 hover:scale-105 active:scale-95 transition-transform cursor-pointer border-none outline-none bg-transparent p-0 flex items-center justify-center"
              title="Cerrar (Esc)"
            >
              <img
                src="/tiny_gui/extracted/btn_close_red.png"
                alt="Cerrar"
                className="w-6 h-6 image-pixelated"
              />
            </button>
          </div>
        </div>

        {/* ==================================================== */}
        {/* --- NAVIGATION TABS --- */}
        {/* ==================================================== */}
        <div className="flex items-center gap-1 border-b border-[#383752] pb-1.5 mb-2 shrink-0 overflow-x-auto custom-scroll">
          <GameButton
            variant="tab"
            size="sm"
            active={activeTab === 'inventory'}
            onClick={() => setActiveTab('inventory')}
          >
            <Backpack className="w-3 h-3" />
            INVENTARIO & EQUIPO
          </GameButton>

          <GameButton
            variant="tab"
            size="sm"
            active={activeTab === 'skills'}
            onClick={() => setActiveTab('skills')}
            className="relative"
          >
            <Zap className="w-3 h-3 text-emerald-400" />
            ÁRBOL DE HABILIDADES
            {availableSkillPoints > 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping absolute -top-0.5 -right-0.5" />
            )}
          </GameButton>

          <GameButton
            variant="tab"
            size="sm"
            active={activeTab === 'stats'}
            onClick={() => setActiveTab('stats')}
          >
            <TrendingUp className="w-3 h-3 text-cyan-400" />
            ESTADÍSTICAS
          </GameButton>

          <GameButton
            variant="tab"
            size="sm"
            active={activeTab === 'forge'}
            onClick={() => setActiveTab('forge')}
          >
            <Flame className="w-3 h-3 text-orange-400" />
            FORJA DE BOTÍN
          </GameButton>
        </div>

        {/* ==================================================== */}
        {/* --- MAIN CONTENT AREA --- */}
        {/* ==================================================== */}
        <div className="flex-1 overflow-y-auto custom-scroll pr-1">

          {/* ---------------------------------------------------- */}
          {/* TAB 1: INVENTORY & PAPERDOLL EQUIPMENT */}
          {/* ---------------------------------------------------- */}
          {activeTab === 'inventory' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 text-xs">
              
              {/* Left Column: Paperdoll Equipment (6 Slots) */}
              <div className="lg:col-span-5 bg-[#171624]/90 border-2 border-[#383752] p-3 rounded flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-[#383752] pb-1.5 mb-2.5">
                    <span className="font-pixel text-[9px] text-[#f0b541] flex items-center gap-1.5">
                      <Shield className="w-3 h-3 text-cyan-400" />
                      EQUIPO DEL HÉROE
                    </span>
                    <span className="font-silkscreen text-[7px] text-slate-400">
                      6 RANURAS ACTIVAS
                    </span>
                  </div>

                  {/* 6 Equipment Slots Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {SLOTS.map(({ slot, label, icon }) => {
                      const item = equipped[slot];
                      const rarity = item?.rarity || 'common';
                      const rConfig = RARITY_CONFIG[rarity];

                      return (
                        <div
                          key={slot}
                          onClick={() => {
                            if (item) {
                              setSelectedItem({ item, isEquippedSlot: slot });
                            }
                          }}
                          className={`p-2 rounded border transition-all cursor-pointer flex items-center gap-2 ${
                            item
                              ? 'bg-[#13121f] hover:brightness-125'
                              : 'bg-[#11101a]/60 border-dashed border-[#333147] opacity-70 hover:opacity-100'
                          }`}
                          style={{
                            borderColor: item ? rConfig.borderColor : undefined,
                            boxShadow: item && item.rarity !== 'common' ? `0 0 8px ${rConfig.glowColor}` : 'none',
                          }}
                        >
                          <div className="w-8 h-8 tg-slot flex items-center justify-center shrink-0 text-base">
                            {item?.icon || icon}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="font-silkscreen text-[7px] text-slate-400 block leading-none truncate">
                              {label}
                            </span>
                            <span
                              className="font-pixel text-[8px] truncate block leading-tight mt-0.5"
                              style={{ color: item ? rConfig.textColor : '#71717a' }}
                            >
                              {item ? item.name : 'Vacío'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Derived Quick Stats Summary */}
                <div className="bg-[#12111c] border border-[#3b3a56] p-2 rounded mt-3 grid grid-cols-3 gap-1 text-center">
                  <div>
                    <span className="font-silkscreen text-[7px] text-slate-400 block">ATAQUE</span>
                    <span className="font-pixel text-[9px] text-amber-300 font-bold">
                      ⚔️ {stats?.totalAttack || 10}
                    </span>
                  </div>
                  <div className="border-x border-[#3b3a56]">
                    <span className="font-silkscreen text-[7px] text-slate-400 block">DEFENSA</span>
                    <span className="font-pixel text-[9px] text-cyan-300 font-bold">
                      🛡️ {stats?.totalDefense || 5}
                    </span>
                  </div>
                  <div>
                    <span className="font-silkscreen text-[7px] text-slate-400 block">CRÍTICO</span>
                    <span className="font-pixel text-[9px] text-red-300 font-bold">
                      🎯 {Math.round((stats?.critChance || 0.05) * 100)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Middle Column: Inventory Grid (24 Slots) */}
              <div className="lg:col-span-4 bg-[#171624]/90 border-2 border-[#383752] p-3 rounded flex flex-col">
                <div className="flex items-center justify-between border-b border-[#383752] pb-1.5 mb-2.5">
                  <span className="font-pixel text-[9px] text-[#f0b541] flex items-center gap-1.5">
                    <Backpack className="w-3 h-3 text-amber-400" />
                    MOCHILA (24 ESPACIOS)
                  </span>
                  <span className="font-silkscreen text-[7px] text-slate-400">
                    {inventory.filter(Boolean).length} / 24
                  </span>
                </div>

                {/* 24-slot Item Grid */}
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 flex-1 content-start">
                  {inventory.map((item, idx) => {
                    const rarity = item?.rarity || 'common';
                    const rConfig = RARITY_CONFIG[rarity];
                    const isSelected = selectedItem?.item?.id === item?.id;

                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          if (item) {
                            setSelectedItem({ item, index: idx });
                          } else {
                            setSelectedItem(null);
                          }
                        }}
                        className={`aspect-square rounded border relative flex items-center justify-center transition-all cursor-pointer ${
                          item
                            ? 'bg-[#141322] hover:scale-105 active:scale-95'
                            : 'bg-[#100f1a]/50 border-[#28273d]'
                        } ${isSelected ? 'ring-2 ring-[#f0b541] brightness-125' : ''}`}
                        style={{
                          borderColor: item ? rConfig.borderColor : undefined,
                          boxShadow: item && item.rarity !== 'common' ? `0 0 6px ${rConfig.glowColor}` : 'none',
                        }}
                      >
                        {item ? (
                          <>
                            <span className="text-lg leading-none">{item.icon || '📦'}</span>
                            {item.rarity && item.rarity !== 'common' && (
                              <span
                                className="w-1.5 h-1.5 rounded-full absolute top-1 right-1"
                                style={{ backgroundColor: rConfig.borderColor }}
                              />
                            )}
                          </>
                        ) : (
                          <span className="font-silkscreen text-[7px] text-[#33314b]">{idx + 1}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Item Inspector Tooltip & Actions */}
              <div className="lg:col-span-3 bg-[#171624]/90 border-2 border-[#383752] p-3 rounded flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-[#383752] pb-1.5 mb-2.5">
                    <span className="font-pixel text-[9px] text-[#f0b541]">INSPECTOR</span>
                    <span className="font-silkscreen text-[7px] text-slate-400">DETALLES</span>
                  </div>

                  {selectedItem ? (
                    <div className="space-y-2 animate-in fade-in duration-100">
                      {/* Rarity & Name */}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className="font-silkscreen text-[7px] px-1.5 py-0.5 rounded uppercase font-bold"
                            style={{
                              backgroundColor: RARITY_CONFIG[selectedItem.item.rarity || 'common'].bgColor,
                              color: RARITY_CONFIG[selectedItem.item.rarity || 'common'].textColor,
                              border: `1px solid ${RARITY_CONFIG[selectedItem.item.rarity || 'common'].borderColor}`,
                            }}
                          >
                            {RARITY_CONFIG[selectedItem.item.rarity || 'common'].name}
                          </span>
                          <span className="font-silkscreen text-[7px] text-slate-400 uppercase">
                            {selectedItem.item.slot}
                          </span>
                        </div>
                        <h4
                          className="font-pixel text-[10px] mt-1 leading-snug font-bold"
                          style={{ color: RARITY_CONFIG[selectedItem.item.rarity || 'common'].textColor }}
                        >
                          {selectedItem.item.name}
                        </h4>
                      </div>

                      {/* Affix Breakdown */}
                      {(selectedItem.item.prefix || selectedItem.item.suffix) && (
                        <div className="bg-[#12111c] p-1.5 rounded border border-[#2e2d45] space-y-0.5 text-[7px] font-silkscreen">
                          {selectedItem.item.prefix && (
                            <p className="text-amber-200">
                              ⚡ <strong>Prefijo:</strong> {selectedItem.item.prefix.name} ({selectedItem.item.prefix.flavor})
                            </p>
                          )}
                          {selectedItem.item.suffix && (
                            <p className="text-cyan-200">
                              ✨ <strong>Sufijo:</strong> {selectedItem.item.suffix.name} ({selectedItem.item.suffix.flavor})
                            </p>
                          )}
                        </div>
                      )}

                      {/* Stats Table */}
                      <div className="bg-[#12111c] p-2 rounded border border-[#3b3a56] space-y-1">
                        <span className="font-silkscreen text-[7px] text-slate-400 block border-b border-[#2e2d45] pb-0.5">
                          MODIFICADORES DE ATRIBUTOS
                        </span>
                        {selectedItem.item.statMods && Object.keys(selectedItem.item.statMods).length > 0 ? (
                          Object.entries(selectedItem.item.statMods).map(([stat, val]) => (
                            <div key={stat} className="flex justify-between items-center text-[8px] font-pixel">
                              <span className="text-slate-300 uppercase">
                                {stat === 'attack'
                                  ? 'Ataque'
                                  : stat === 'defense'
                                  ? 'Defensa'
                                  : stat === 'maxHp'
                                  ? 'Vida Máxima'
                                  : stat === 'critChance'
                                  ? 'Prob. Crítica'
                                  : stat === 'critDamage'
                                  ? 'Daño Crítico'
                                  : stat === 'lifeSteal'
                                  ? 'Robo de Vida'
                                  : stat === 'speedBonus'
                                  ? 'Velocidad'
                                  : stat}
                              </span>
                              <span className="text-emerald-400 font-bold">
                                +{typeof val === 'number' && val < 1 && val > 0 ? `${Math.round(val * 100)}%` : val}
                              </span>
                            </div>
                          ))
                        ) : selectedItem.item.healAmount ? (
                          <div className="flex justify-between items-center text-[8px] font-pixel text-emerald-400">
                            <span>CURACIÓN</span>
                            <span>+{selectedItem.item.healAmount} HP</span>
                          </div>
                        ) : (
                          <span className="font-silkscreen text-[8px] text-slate-500">Sin modificadores</span>
                        )}
                      </div>

                      {/* Description & Value */}
                      <p className="font-silkscreen text-[8px] text-slate-300 leading-relaxed italic">
                        "{selectedItem.item.description || 'Objeto de aventurero forjado en las tierras del reino.'}"
                      </p>

                      <div className="flex items-center justify-between text-[8px] font-pixel text-amber-300">
                        <span>VALOR EN ORO:</span>
                        <span>💰 {selectedItem.item.value || 10}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="h-44 flex flex-col items-center justify-center text-center p-3 opacity-60">
                      <Info className="w-6 h-6 text-slate-400 mb-1" />
                      <p className="font-silkscreen text-[8px] text-slate-400">
                        Selecciona cualquier ítem del equipo o de la mochila para ver sus afijos y estadísticas.
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions on Selected Item */}
                {selectedItem && (
                  <div className="pt-2 border-t border-[#383752] space-y-1 mt-2">
                    {selectedItem.isEquippedSlot ? (
                      <button
                        onClick={() => handleUnequipItem(selectedItem.isEquippedSlot!)}
                        className="w-full bg-red-600/80 hover:bg-red-500 text-white font-pixel text-[8px] py-1.5 rounded cursor-pointer transition-colors"
                      >
                        DESEQUIPAR
                      </button>
                    ) : selectedItem.item.slot === 'consumable' ? (
                      <button
                        onClick={() => handleUseItem(selectedItem.index!)}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-pixel text-[8px] py-1.5 rounded cursor-pointer transition-colors"
                      >
                        USAR POCIÓN
                      </button>
                    ) : (
                      <button
                        onClick={() => handleEquipItem(selectedItem.item, selectedItem.index)}
                        className="w-full bg-[#f0b541] hover:brightness-110 text-[#141320] font-pixel text-[8px] font-bold py-1.5 rounded cursor-pointer transition-all"
                      >
                        EQUIPAR EN {selectedItem.item.slot.toUpperCase()}
                      </button>
                    )}

                    {!selectedItem.isEquippedSlot && (
                      <button
                        onClick={() => handleSellItem(selectedItem.index!)}
                        className="w-full bg-[#252438] hover:bg-[#34334f] text-amber-300 font-pixel text-[7px] py-1 rounded cursor-pointer transition-colors flex items-center justify-center gap-1"
                      >
                        <Coins className="w-2.5 h-2.5" />
                        VENDER POR {selectedItem.item.value || 10} ORO
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ---------------------------------------------------- */}
          {/* TAB 2: SKILL TREE DIRECTED GRAPH */}
          {/* ---------------------------------------------------- */}
          {activeTab === 'skills' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 text-xs">
              
              {/* Left Column: Directed Graph Visualizer */}
              <div className="lg:col-span-8 bg-[#171624]/90 border-2 border-[#383752] p-3 rounded flex flex-col">
                
                {/* Header with branch filters & points count */}
                <div className="flex flex-wrap items-center justify-between border-b border-[#383752] pb-2 mb-2 gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-pixel text-[9px] text-[#f0b541] flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-emerald-400" />
                      GRAFO DE HABILIDADES
                    </span>
                    <span className="font-pixel text-[8px] bg-[#12111c] border border-emerald-500/40 text-emerald-300 px-2 py-0.5 rounded">
                      PUNTOS DISPONIBLES: {availableSkillPoints}
                    </span>
                  </div>

                  {/* Respec Button */}
                  <button
                    onClick={handleRespec}
                    className="bg-[#242338] hover:bg-[#35344f] text-slate-300 font-pixel text-[7px] px-2.5 py-1 rounded border border-[#484666] flex items-center gap-1 cursor-pointer transition-colors"
                    title="Devuelve todos los puntos invertidos"
                  >
                    <RotateCcw className="w-2.5 h-2.5 text-amber-400" />
                    REINICIAR ÁRBOL
                  </button>
                </div>

                {/* Graph Canvas Container */}
                <div className="relative w-full h-80 sm:h-96 bg-[#11101d] border border-[#2b2a40] rounded overflow-hidden p-2 flex items-center justify-center">
                  
                  {/* Directed Graph SVG Connection Edges */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    <defs>
                      <linearGradient id="edgeActive" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#f59e0b" />
                      </linearGradient>
                      <linearGradient id="edgeLocked" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#374151" />
                        <stop offset="100%" stopColor="#1f2937" />
                      </linearGradient>
                    </defs>

                    {skillNodes.map((node) =>
                      node.prerequisites.map((prereqId) => {
                        const parent = skillNodes.find((n) => n.id === prereqId);
                        if (!parent) return null;

                        const isEdgeActive = parent.unlocked && node.unlocked;
                        const isEdgeUnlockable = parent.unlocked && !node.unlocked;

                        return (
                          <line
                            key={`${parent.id}->${node.id}`}
                            x1={`${parent.position.x}%`}
                            y1={`${parent.position.y}%`}
                            x2={`${node.position.x}%`}
                            y2={`${node.position.y}%`}
                            stroke={
                              isEdgeActive
                                ? '#10b981'
                                : isEdgeUnlockable
                                ? '#f59e0b'
                                : '#374151'
                            }
                            strokeWidth={isEdgeActive ? 3 : isEdgeUnlockable ? 2 : 1.5}
                            strokeDasharray={isEdgeUnlockable ? '4 3' : 'none'}
                            className="transition-all duration-300"
                          />
                        );
                      })
                    )}
                  </svg>

                  {/* Branch Labels across columns */}
                  <div className="absolute top-2 inset-x-0 grid grid-cols-4 px-4 text-center font-silkscreen text-[7px] text-slate-400 pointer-events-none">
                    <span className="text-red-400">VANGUARDIA</span>
                    <span className="text-cyan-400">GUARDIÁN</span>
                    <span className="text-purple-400">SOMBRA</span>
                    <span className="text-emerald-400">MÍSTICO</span>
                  </div>

                  {/* Graph Node Elements */}
                  {skillNodes.map((node) => {
                    const isSelected = selectedSkillNode?.id === node.id;
                    const isUnlockable = engine?.skillTreeSystem.isNodeUnlockable(node.id).unlockable;

                    return (
                      <div
                        key={node.id}
                        onClick={() => setSelectedSkillNode(node)}
                        className={`absolute -translate-x-1/2 -translate-y-1/2 w-11 h-11 sm:w-12 sm:h-12 rounded-lg flex flex-col items-center justify-center transition-all duration-200 cursor-pointer ${
                          node.unlocked
                            ? 'bg-[#1e3a2b] border-2 border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                            : isUnlockable
                            ? 'bg-[#2b2518] border-2 border-amber-400 animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                            : 'bg-[#151421] border border-[#3b3a56] opacity-60 hover:opacity-90'
                        } ${isSelected ? 'scale-110 ring-2 ring-white z-10' : 'hover:scale-105'}`}
                        style={{
                          left: `${node.position.x}%`,
                          top: `${node.position.y}%`,
                        }}
                      >
                        <span className="text-base sm:text-lg leading-none">{node.icon}</span>
                        
                        {/* Status badge */}
                        {node.unlocked ? (
                          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center border border-[#111]">
                            <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                          </span>
                        ) : !isUnlockable ? (
                          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#232233] rounded-full flex items-center justify-center border border-[#484666]">
                            <Lock className="w-2 h-2 text-slate-400" />
                          </span>
                        ) : (
                          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center font-pixel text-[7px] text-[#111] font-bold">
                            {node.cost}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Node Inspector & Unlock Action */}
              <div className="lg:col-span-4 bg-[#171624]/90 border-2 border-[#383752] p-3 rounded flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-[#383752] pb-1.5 mb-2.5">
                    <span className="font-pixel text-[9px] text-[#f0b541]">HABILIDAD</span>
                    <span className="font-silkscreen text-[7px] text-slate-400">
                      RAMA: {selectedSkillNode?.branch.toUpperCase() || 'GENERAL'}
                    </span>
                  </div>

                  {selectedSkillNode ? (
                    <div className="space-y-2.5 animate-in fade-in duration-100">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 tg-slot flex items-center justify-center text-xl shrink-0">
                          {selectedSkillNode.icon}
                        </div>
                        <div>
                          <h3 className="font-pixel text-[10px] text-amber-300 font-bold leading-tight">
                            {selectedSkillNode.name}
                          </h3>
                          <span className="font-silkscreen text-[7px] text-slate-400">
                            NIVEL {selectedSkillNode.tier} • COSTE: {selectedSkillNode.cost} PUNTO(S)
                          </span>
                        </div>
                      </div>

                      <p className="font-silkscreen text-[8px] text-slate-200 leading-relaxed bg-[#12111c] p-2 rounded border border-[#2e2d45]">
                        {selectedSkillNode.description}
                      </p>

                      {/* Modifiers List */}
                      <div className="bg-[#12111c] p-2 rounded border border-[#383752] space-y-1">
                        <span className="font-silkscreen text-[7px] text-slate-400 block border-b border-[#2e2d45] pb-0.5">
                          BENEFICIOS PERMANENTES
                        </span>
                        {Object.entries(selectedSkillNode.modifiers).map(([k, v]) => (
                          <div key={k} className="flex justify-between items-center text-[8px] font-pixel">
                            <span className="text-slate-300 uppercase">
                              {k === 'attack'
                                ? 'Ataque Físico'
                                : k === 'defense'
                                ? 'Defensa'
                                : k === 'maxHp'
                                ? 'Vida Máxima'
                                : k === 'critChance'
                                ? 'Prob. Crítica'
                                : k === 'critDamage'
                                ? 'Daño Crítico'
                                : k === 'lifeSteal'
                                ? 'Robo de Vida'
                                : k === 'speedBonus'
                                ? 'Velocidad'
                                : k === 'bonusExp'
                                ? 'Bono de Experiencia'
                                : k}
                            </span>
                            <span className="text-emerald-400 font-bold">
                              +{typeof v === 'number' && v < 1 && v > 0 ? `${Math.round(v * 100)}%` : v}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Prerequisites Validation Status */}
                      <div className="bg-[#12111c] p-2 rounded border border-[#2e2d45] space-y-1 text-[7px] font-silkscreen">
                        <span className="text-slate-400 block">PRERREQUISITOS DEL GRAFO:</span>
                        {selectedSkillNode.prerequisites.length === 0 ? (
                          <span className="text-emerald-400 flex items-center gap-1">
                            ✓ Habilidad raíz inicial (Sin requisitos)
                          </span>
                        ) : (
                          selectedSkillNode.prerequisites.map((pId) => {
                            const pNode = skillNodes.find((n) => n.id === pId);
                            const isMet = pNode?.unlocked;
                            return (
                              <div
                                key={pId}
                                className={`flex items-center gap-1 ${
                                  isMet ? 'text-emerald-400' : 'text-red-400'
                                }`}
                              >
                                <span>{isMet ? '✓' : '✗'}</span>
                                <span>Requiere: {pNode?.name || pId}</span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="font-silkscreen text-[8px] text-slate-400 text-center py-6">
                      Selecciona un nodo del grafo para ver detalles y desbloquearlo.
                    </p>
                  )}
                </div>

                {/* Unlock Button */}
                {selectedSkillNode && (
                  <div className="pt-2 border-t border-[#383752] mt-3">
                    {selectedSkillNode.unlocked ? (
                      <div className="w-full bg-emerald-900/60 border border-emerald-500/50 text-emerald-300 font-pixel text-[8px] py-2 rounded text-center flex items-center justify-center gap-1.5">
                        <Check className="w-3.5 h-3.5" />
                        HABILIDAD DOMINADA
                      </div>
                    ) : (
                      (() => {
                        const check = engine?.skillTreeSystem.isNodeUnlockable(selectedSkillNode.id);
                        const canUnlock = check?.unlockable;

                        return (
                          <div className="space-y-1">
                            <button
                              onClick={() => handleUnlockSkill(selectedSkillNode.id)}
                              disabled={!canUnlock}
                              className={`w-full font-pixel text-[8px] py-2 rounded font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                                canUnlock
                                  ? 'bg-[#f0b541] hover:brightness-110 text-[#141320] shadow-[0_0_12px_rgba(240,181,65,0.4)]'
                                  : 'bg-[#222133] text-slate-500 border border-[#3b3a56] cursor-not-allowed'
                              }`}
                            >
                              <Sparkles className="w-3 h-3" />
                              APRENDER ({selectedSkillNode.cost} PUNTO{selectedSkillNode.cost > 1 ? 'S' : ''})
                            </button>
                            {!canUnlock && check?.reason && (
                              <span className="font-silkscreen text-[7px] text-red-400 block text-center">
                                {check.reason}
                              </span>
                            )}
                          </div>
                        );
                      })()
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ---------------------------------------------------- */}
          {/* TAB 3: DETAILED STATS SHEET */}
          {/* ---------------------------------------------------- */}
          {activeTab === 'stats' && (
            <div className="space-y-3 text-xs">
              <div className="bg-[#171624]/90 border-2 border-[#383752] p-3 rounded">
                <div className="flex items-center justify-between border-b border-[#383752] pb-1.5 mb-3">
                  <span className="font-pixel text-[9px] text-[#f0b541] flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                    HOJA DE ATRIBUTOS DERIVADOS EN COMBATE
                  </span>
                  <span className="font-silkscreen text-[7px] text-slate-400">
                    SISTEMA OBSERVER PATTERN AUTOMATIZADO
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Combat Offense */}
                  <div className="bg-[#12111c] p-2.5 rounded border border-[#3b3a56] space-y-1.5">
                    <h4 className="font-pixel text-[8px] text-amber-400 border-b border-[#2e2d45] pb-1">
                      POTENCIA OFENSIVA
                    </h4>
                    <div className="flex justify-between items-center text-[8px] font-pixel">
                      <span className="text-slate-300">Ataque Total:</span>
                      <span className="text-amber-300 font-bold">{stats?.totalAttack} DMG</span>
                    </div>
                    <div className="flex justify-between items-center text-[8px] font-pixel">
                      <span className="text-slate-300">Probabilidad Crítica:</span>
                      <span className="text-red-400 font-bold">{Math.round((stats?.critChance || 0.05) * 100)}%</span>
                    </div>
                    <div className="flex justify-between items-center text-[8px] font-pixel">
                      <span className="text-slate-300">Multiplicador Crítico:</span>
                      <span className="text-red-300 font-bold">{Math.round((stats?.critDamage || 1.5) * 100)}%</span>
                    </div>
                    <div className="flex justify-between items-center text-[8px] font-pixel">
                      <span className="text-slate-300">Robo de Vida (Vampirismo):</span>
                      <span className="text-purple-400 font-bold">{Math.round((stats?.lifeSteal || 0) * 100)}%</span>
                    </div>
                  </div>

                  {/* Combat Defense & Utility */}
                  <div className="bg-[#12111c] p-2.5 rounded border border-[#3b3a56] space-y-1.5">
                    <h4 className="font-pixel text-[8px] text-cyan-400 border-b border-[#2e2d45] pb-1">
                      DEFENSA Y SUPERVIVENCIA
                    </h4>
                    <div className="flex justify-between items-center text-[8px] font-pixel">
                      <span className="text-slate-300">Salud Máxima:</span>
                      <span className="text-emerald-400 font-bold">{stats?.maxHp} HP</span>
                    </div>
                    <div className="flex justify-between items-center text-[8px] font-pixel">
                      <span className="text-slate-300">Defensa Total:</span>
                      <span className="text-cyan-300 font-bold">{stats?.totalDefense} DEF</span>
                    </div>
                    <div className="flex justify-between items-center text-[8px] font-pixel">
                      <span className="text-slate-300">Modificador de Velocidad:</span>
                      <span className="text-blue-300 font-bold">x{stats?.moveSpeedMod || 1.0}</span>
                    </div>
                    <div className="flex justify-between items-center text-[8px] font-pixel">
                      <span className="text-slate-300">Bono de Experiencia:</span>
                      <span className="text-yellow-300 font-bold">x{stats?.bonusExpMod || 1.0}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Quest Section */}
              <div className="bg-[#171624]/90 border-2 border-[#383752] p-3 rounded space-y-1.5">
                <div className="flex items-center justify-between border-b border-[#383752] pb-1">
                  <span className="font-pixel text-[9px] text-[#f0b541] flex items-center gap-1.5">
                    <span>📜</span> {activeQuest ? activeQuest.title : 'Limpieza de Slimes'}
                  </span>
                  <span className="font-pixel text-[8px] text-emerald-400">
                    {activeQuest && activeQuest.status === 'completed' ? '¡COMPLETADA!' : 'EN CURSO'}
                  </span>
                </div>
                <p className="font-silkscreen text-[8px] text-slate-300 leading-relaxed">
                  {activeQuest
                    ? activeQuest.description
                    : 'Derrota a los slimes salvajes que amenazan los alrededores del poblado.'}
                </p>
                <div className="flex items-center justify-between pt-1 font-silkscreen text-[8px]">
                  <span className="text-slate-400">OBJETIVO:</span>
                  <span className="font-pixel text-[8px] text-amber-200">
                    Slimes: {activeQuest ? activeQuest.objective.currentCount : 0} / {activeQuest ? activeQuest.objective.count : 5}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ---------------------------------------------------- */}
          {/* TAB 4: PROCEDURAL LOOT FORGE (TEST & SIMULATOR) */}
          {/* ---------------------------------------------------- */}
          {activeTab === 'forge' && (
            <div className="space-y-3 text-xs">
              <div className="bg-[#171624]/90 border-2 border-[#383752] p-3 rounded">
                <div className="flex items-center justify-between border-b border-[#383752] pb-1.5 mb-3">
                  <span className="font-pixel text-[9px] text-[#f0b541] flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-orange-400" />
                    SIMULADOR DE GENERACIÓN PROCEDURAL DE BOTÍN (LOOT TABLES)
                  </span>
                  <span className="font-silkscreen text-[7px] text-slate-400">
                    BASE + PREFIJOS + SUFIJOS + RAREZA
                  </span>
                </div>

                <p className="font-silkscreen text-[8px] text-slate-300 leading-relaxed mb-3">
                  Genera piezas de equipo combinando dinámicamente tablas ponderadas de ítems base, prefijos elementales, sufijos de maestría y niveles de rareza escalonados.
                </p>

                {/* Forging Buttons for each rarity */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {(['common', 'magic', 'rare', 'epic', 'legendary'] as ItemRarity[]).map((r) => {
                    const cfg = RARITY_CONFIG[r];
                    return (
                      <button
                        key={r}
                        onClick={() => handleForgeTestLoot(r)}
                        className="p-2.5 rounded border flex flex-col items-center gap-1 cursor-pointer transition-all hover:scale-105 active:scale-95 text-center"
                        style={{
                          backgroundColor: cfg.bgColor,
                          borderColor: cfg.borderColor,
                          color: cfg.textColor,
                          boxShadow: `0 0 10px ${cfg.glowColor}`,
                        }}
                      >
                        <span className="font-pixel text-[8px] font-bold uppercase">{cfg.name}</span>
                        <span className="font-silkscreen text-[7px] opacity-80">
                          {cfg.prefixCount} Pref. + {cfg.suffixCount} Suf.
                        </span>
                        <span className="font-pixel text-[7px] mt-1 bg-black/40 px-1.5 py-0.5 rounded">
                          x{cfg.multiplier} STATS
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ==================================================== */}
        {/* --- FOOTER BAR --- */}
        {/* ==================================================== */}
        <div className="pt-2 mt-2 border-t-2 border-[#3b3a56]/80 flex items-center justify-between shrink-0">
          <span className="font-silkscreen text-[7px] text-slate-400">
            SISTEMAS ARPG DE PROGRESIÓN E INVENTARIO CONECTADOS
          </span>
          <button
            onClick={onClose}
            className="tg-btn-rect-gold font-pixel text-[8px] font-bold text-[#222] h-7 px-5 flex items-center justify-center cursor-pointer border-none outline-none hover:brightness-110 active:brightness-90"
          >
            VOLVER AL JUEGO
          </button>
        </div>
      </div>
    </div>
  );
};
