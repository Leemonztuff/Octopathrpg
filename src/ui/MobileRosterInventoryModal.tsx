import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameEngine } from '../core/GameEngine';
import { Item, EquipmentSlot, CharacterStats, ItemRarity } from '../types';
import { RARITY_CONFIG, LootGenerator } from '../data/LootTables';
import { HeroFullBodyCanvas, HeroPortraitCanvas, ROSTER_HEROES, RosterHeroData } from './HeroFullBodyCanvas';
import { ItemTooltipManager } from './ItemTooltipManager';
import { GameButton } from './components/GameButton';
import { useGameState } from '../context/StateContext';
import {
  Shield,
  Zap,
  Backpack,
  ChevronRight,
  ChevronLeft,
  Flame,
  Grid3X3,
} from 'lucide-react';

interface MobileRosterInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToClassic?: () => void;
}

type BottomTab = 'skills' | 'equipment' | 'inventory' | 'fusion';

export const MobileRosterInventoryModal: React.FC<MobileRosterInventoryModalProps> = ({
  isOpen,
  onClose,
  onSwitchToClassic,
}) => {
  const {
    engine,
    activeQuest,
    inventory,
    equipped,
    gold,
  } = useGameState();

  const [selectedHeroIndex, setSelectedHeroIndex] = useState<number>(0);
  const currentHero = ROSTER_HEROES[selectedHeroIndex] || ROSTER_HEROES[0];

  const [activeBottomTab, setActiveBottomTab] = useState<BottomTab>('skills');

  // Direct derivations from active engine instance to eliminate redundant syncing states
  const stats: CharacterStats | null = engine?.statsObserver ? engine.statsObserver.getStats() : null;
  const gems = engine?.inventorySystem?.gems ?? 12;
  const karma = 100;
  const energy = {
    current: engine?.inventorySystem?.energy ?? 15,
    max: engine?.inventorySystem?.maxEnergy ?? 15,
  };

  const [selectedItem, setSelectedItem] = useState<{
    item: Item;
    index?: number;
    isEquippedSlot?: EquipmentSlot;
    rect?: { top: number; left: number; width: number; height: number };
  } | null>(null);
  const [slotPickerModal, setSlotPickerModal] = useState<EquipmentSlot | null>(null);
  const [toastNotification, setToastNotification] = useState<string | null>(null);
  const [showHeroGrid, setShowHeroGrid] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState<'left' | 'right'>('right');
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastNotification(msg);
    setTimeout(() => setToastNotification(null), 2000);
  };

  const handlePrevHero = () => {
    setTransitionDirection('left');
    setSelectedHeroIndex((p) => (p > 0 ? p - 1 : ROSTER_HEROES.length - 1));
  };
  const handleNextHero = () => {
    setTransitionDirection('right');
    setSelectedHeroIndex((p) => (p < ROSTER_HEROES.length - 1 ? p + 1 : 0));
  };
  const handleSelectHero = (index: number) => {
    setTransitionDirection(index > selectedHeroIndex ? 'right' : 'left');
    setSelectedHeroIndex(index);
    setShowHeroGrid(false);
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0) handleNextHero();
      else handlePrevHero();
    }
    touchStartRef.current = null;
  }, [handleNextHero, handlePrevHero]);

  const handleEquipItem = (item: Item, inventoryIdx?: number) => {
    if (!engine) return;
    engine.equipItem(item, inventoryIdx);
    setSelectedItem(null);
    setSlotPickerModal(null);
    showToast(`¡${item.name} equipado con éxito!`);
  };

  const handleUnequipItem = (slot: EquipmentSlot) => {
    if (!engine) return;
    engine.unequipItem(slot);
    setSelectedItem(null);
    showToast(`Desequipado de ${slot.toUpperCase()}`);
  };

  const handleUseItem = (index: number) => {
    if (!engine) return;
    const used = engine.inventorySystem.useItem(index);
    if (used && used.healAmount) {
      engine.getPlayer().heal(used.healAmount);
      showToast(`¡Poción usada! +${used.healAmount} HP`);
    }
    setSelectedItem(null);
  };

  const handleSellItem = (index: number) => {
    if (!engine) return;
    const itemToSell = inventory[index];
    if (itemToSell) {
      engine.inventorySystem.sellItem(index);
      showToast(`Vendido por +${itemToSell.value || 10} Oro`);
    }
    setSelectedItem(null);
  };

  const currentLevel = stats?.level || engine?.progressionManager?.level || 1;
  const maxHp = stats?.maxHp || 100;
  const currentExp = stats?.currentExp || engine?.progressionManager?.currentExp || 0;
  const maxExp = stats?.maxExp || engine?.progressionManager?.maxExp || 100;
  const expPercent = Math.min(100, Math.max(0, Math.round((currentExp / maxExp) * 100)));

  const displayAtk = Math.round(stats?.totalAttack || 10);
  const displayDef = Math.round(stats?.totalDefense || 5);
  const displayRec = Math.round(((stats?.critChance || 0.05) * 100));
  const combatRating = Math.round(maxHp * 0.2 + displayAtk * 15 + displayDef * 12 + displayRec * 10);

  const SLOTS: Array<{ slot: EquipmentSlot; label: string; icon: string }> = [
    { slot: 'weapon', label: 'ARMA', icon: '⚔️' },
    { slot: 'armor', label: 'ARMADURA', icon: '🛡️' },
    { slot: 'helm', label: 'YELMO', icon: '🪖' },
    { slot: 'boots', label: 'BOTAS', icon: '🥾' },
    { slot: 'ring', label: 'ANILLO', icon: '💍' },
    { slot: 'amulet', label: 'AMULETO', icon: '📿' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-1 sm:p-3 select-none overflow-y-auto">
      
      {/* Mobile RPG Enclosure Container styled with unified 'tg-box-popup' style */}
      <div className="w-full max-w-[425px] h-[92vh] max-h-[700px] tg-box-popup flex flex-col relative overflow-hidden text-slate-100 bg-[#0e0d18]">

        {/* 1. TOP MOBILE RPG STATUS & CURRENCIES HEADER BAR */}
        <div className="bg-[#181628] border-b-2 border-[#3d3a5a] px-2.5 py-1.5 shrink-0 flex items-center justify-between gap-1 shadow-md">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <span className="font-silkscreen text-[7px] text-amber-300">Octopath</span>
              <span className="font-pixel text-[9px] text-[#f0b541] font-bold">Lv. {currentLevel}</span>
              <span className="font-silkscreen text-[7px] text-cyan-300">RC {combatRating}</span>
            </div>
            {/* EXP Bar */}
            <div className="flex items-center gap-1">
              <span className="font-silkscreen text-[6px] text-amber-400 w-5">EXP</span>
              <div className="w-20 h-1.5 bg-[#0a0a10] rounded-full border border-[#443f60] overflow-hidden">
                <div className="h-full bg-gradient-to-r from-orange-500 to-amber-300" style={{ width: `${expPercent}%` }} />
              </div>
            </div>
            {/* Energy Bar */}
            <div className="flex items-center gap-1">
              <span className="font-silkscreen text-[6px] text-emerald-400 w-5">NRG</span>
              <div className="w-20 h-1.5 bg-[#0a0a10] rounded-full border border-[#443f60] overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-600 to-green-300" style={{ width: `${Math.min(100, Math.max(0, (energy.current / energy.max) * 100))}%` }} />
              </div>
              <span className="font-silkscreen text-[6px] text-emerald-300">{energy.current}/{energy.max}</span>
            </div>
          </div>

          {/* Center Unit Header Title */}
          <div className="flex flex-col items-center justify-center px-1">
            <div className="bg-[#12111d] border border-[#f0b541]/40 rounded px-3 py-1 text-center shadow">
              <span className="font-pixel text-[8px] text-[#f0b541] font-bold block tracking-wider">UNIDAD</span>
              <span className="font-silkscreen text-[6px] text-slate-300">DETALLES</span>
            </div>
          </div>

          {/* Right Currencies */}
          <div className="flex flex-col gap-0.5 text-right font-silkscreen text-[7px]">
            <div className="flex items-center justify-end gap-1 bg-[#100f1c] px-1.5 py-0.5 rounded border border-[#2b2a42]">
              <img src="/tiny_gui/extracted/gem_ruby.png" alt="Gems" className="w-3 h-3 image-pixelated flex items-center justify-center" />
              <span className="text-cyan-300 font-bold">{gems}</span>
            </div>
            <div className="flex items-center justify-end gap-1 bg-[#100f1c] px-1.5 py-0.5 rounded border border-[#2b2a42]">
              <img src="/tiny_gui/extracted/coin_gold.png" alt="Gold" className="w-3 h-3 image-pixelated flex items-center justify-center" />
              <span className="text-amber-300 font-bold">{gold}</span>
            </div>
          </div>
        </div>

        {/* 2. HERO NAVIGATION HEADER */}
        <div className="flex items-center justify-between px-2 py-1 bg-[#141222] border-b border-[#353350] shrink-0">
          <div className="flex items-center gap-1">
            <button
              onClick={onClose}
              className="bg-[#2b254a] hover:bg-[#3b3368] text-white px-2.5 py-1 rounded flex items-center justify-center gap-1 font-pixel text-[8px] font-bold cursor-pointer border border-cyan-400/50 shadow"
            >
              <ChevronLeft className="w-3 h-3" />
              Atrás
            </button>
            {onSwitchToClassic && (
              <button
                onClick={onSwitchToClassic}
                className="bg-[#242238] hover:bg-[#343154] text-amber-300 font-pixel text-[7px] px-2 py-1 rounded flex items-center justify-center border border-amber-400/30 cursor-pointer"
              >
                CLASSIC
              </button>
            )}
          </div>

          {/* Unit Header Badge */}
          <div className="flex-1 mx-2 bg-[#0c0b16] border border-[#3b3a58] rounded px-2 py-0.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              <HeroPortraitCanvas hero={currentHero} size={32} className="shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <span className="font-silkscreen text-[6px] text-slate-400">Unit No.{currentHero.unitNo}</span>
                  <span className="text-amber-400 text-[7px]">{'★'.repeat(currentHero.stars)}</span>
                </div>
                <h3 className="font-pixel text-[8px] text-[#f0b541] font-bold truncate leading-tight">
                  {currentHero.name}
                </h3>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowHeroGrid(!showHeroGrid)}
                className={`w-5 h-5 rounded border flex items-center justify-center cursor-pointer transition-colors ${
                  showHeroGrid ? 'bg-amber-500/30 border-amber-400 text-amber-300' : 'bg-[#1b1a2c] hover:bg-[#2c2a44] border-[#444266] text-slate-300'
                }`}
                title="Ver todos los héroes"
              >
                <Grid3X3 className="w-3 h-3" />
              </button>
              <button
                onClick={handlePrevHero}
                className="w-5 h-5 bg-[#1b1a2c] hover:bg-[#2c2a44] rounded border border-[#444266] flex items-center justify-center cursor-pointer text-slate-300"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              <button
                onClick={handleNextHero}
                className="w-5 h-5 bg-[#1b1a2c] hover:bg-[#2c2a44] rounded border border-[#444266] flex items-center justify-center cursor-pointer text-slate-300"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Dots */}
        <div className="flex items-center justify-center gap-1.5 py-1 bg-[#0f0e1c] border-b border-[#2a2840] shrink-0">
          {ROSTER_HEROES.map((hero, idx) => (
            <button
              key={hero.id}
              onClick={() => handleSelectHero(idx)}
              className={`transition-all duration-200 rounded-full cursor-pointer ${
                idx === selectedHeroIndex
                  ? 'w-4 h-1.5 bg-amber-400'
                  : 'w-1.5 h-1.5 bg-[#3b3a58] hover:bg-slate-400'
              }`}
              title={hero.name}
            />
          ))}
          <span className="font-silkscreen text-[6px] text-slate-500 ml-1">{selectedHeroIndex + 1}/{ROSTER_HEROES.length}</span>
        </div>

        {/* Hero Grid Overlay */}
        {showHeroGrid && (
          <div className="absolute inset-x-0 top-[105px] bottom-0 z-40 bg-[#0c0b16]/98 backdrop-blur-sm overflow-y-auto p-2">
            <div className="flex items-center justify-between mb-2">
              <span className="font-pixel text-[8px] text-[#f0b541] font-bold">SELECCIONAR UNIDAD</span>
              <button onClick={() => setShowHeroGrid(false)} className="text-slate-400 font-pixel text-[8px] cursor-pointer hover:text-white">✕ CERRAR</button>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {ROSTER_HEROES.map((hero, idx) => (
                <button
                  key={hero.id}
                  onClick={() => handleSelectHero(idx)}
                  className={`relative flex flex-col items-center p-1.5 rounded border transition-all cursor-pointer ${
                    idx === selectedHeroIndex
                      ? 'bg-amber-500/20 border-amber-400 scale-105'
                      : 'bg-[#151424] border-[#2d2b44] hover:border-slate-400 hover:bg-[#1e1d32]'
                  }`}
                >
                  <HeroPortraitCanvas hero={hero} size={36} className="mb-1" />
                  <span className="font-pixel text-[6px] text-amber-300 font-bold truncate w-full text-center">{hero.name.split(' ')[1] || hero.name}</span>
                  <span className="font-silkscreen text-[5px] text-slate-400">{'★'.repeat(hero.stars)}</span>
                  <div
                    className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full border border-black/50"
                    style={{ backgroundColor: hero.typeColor }}
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 3. HERO SHOWCASE ROSTER & LEFT STATS PILLAR */}
        <div
          className="relative flex-1 min-h-[190px] max-h-[250px] bg-[#080710] flex overflow-hidden border-b-2 border-[#383552]"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          
          {/* Left Column Tactical Attribute Frame */}
          <div className="w-[125px] sm:w-[135px] shrink-0 p-1.5 flex flex-col justify-between z-20 bg-gradient-to-r from-black/80 to-transparent">
            <div className="space-y-1">
              {/* Type Pill */}
              <div className="bg-[#12111e]/90 border border-[#393754] rounded px-1.5 py-0.5 flex items-center justify-between">
                <span className="font-silkscreen text-[6px] text-slate-400">TYPE</span>
                <span
                  className="font-pixel text-[7px] font-bold uppercase px-1 rounded flex items-center justify-center"
                  style={{ backgroundColor: `${currentHero.typeColor}22`, color: currentHero.typeColor }}
                >
                  {currentHero.heroType}
                </span>
              </div>
              {/* Level & EXP */}
              <div className="bg-[#12111e]/90 border border-[#393754] rounded p-1">
                <div className="flex justify-between items-center font-pixel text-[7px]">
                  <span className="text-slate-400">Lv.</span>
                  <span className="text-amber-300 font-bold">{currentLevel}/40</span>
                </div>
                <div className="w-full h-1 bg-[#09090f] rounded-full border border-[#2d2b42] overflow-hidden mt-1">
                  <div className="h-full bg-gradient-to-r from-amber-500 to-yellow-300" style={{ width: `${expPercent}%` }} />
                </div>
              </div>
            </div>

            {/* Stat Pillars */}
            <div className="space-y-0.5 bg-[#12111f]/95 border border-[#383756] rounded p-1.5">
              <div className="flex items-center justify-between font-pixel text-[8px] border-b border-[#29283f] pb-0.5">
                <span className="text-amber-400 font-bold">HP</span>
                <span className="text-slate-100 font-bold">{maxHp}</span>
              </div>
              <div className="flex items-center justify-between font-pixel text-[8px] border-b border-[#29283f] pb-0.5">
                <span className="text-amber-400 font-bold">ATK</span>
                <span className="text-slate-100 font-bold">{displayAtk}</span>
              </div>
              <div className="flex items-center justify-between font-pixel text-[8px] border-b border-[#29283f] pb-0.5">
                <span className="text-amber-400 font-bold">DEF</span>
                <span className="text-slate-100 font-bold">{displayDef}</span>
              </div>
              <div className="flex items-center justify-between font-pixel text-[8px]">
                <span className="text-amber-400 font-bold">REC</span>
                <span className="text-slate-100 font-bold">{displayRec}</span>
              </div>
            </div>
          </div>

          {/* Center/Right Full-Body Sprite Roster Stage with Floating Equipped Gear Quick Slots */}
          <div className="flex-1 relative h-full flex items-center justify-center">
            
            {/* Left Equipped Gear Mini-Slots Vertical Strip with Tooltip / Tap Info */}
            <div className="absolute left-1.5 top-1.5 bottom-1.5 flex flex-col justify-around z-25 gap-1">
              {(['weapon', 'armor', 'helm'] as EquipmentSlot[]).map((slot) => {
                const item = equipped[slot];
                const slotIcons: Record<EquipmentSlot, string> = {
                  weapon: '⚔️',
                  armor: '🛡️',
                  helm: '🪖',
                  boots: '🥾',
                  ring: '💍',
                  amulet: '📿',
                  accessory: '✨',
                };
                return (
                  <div
                    key={slot}
                    onClick={() => {
                      if (item) setSelectedItem({ item, isEquippedSlot: slot });
                      else setSlotPickerModal(slot);
                    }}
                    onMouseEnter={() => {
                      if (item) setSelectedItem({ item, isEquippedSlot: slot });
                    }}
                    className="w-7 h-7 bg-[#121120]/95 border border-[#4a466e] rounded flex items-center justify-center cursor-pointer hover:border-amber-400 shadow-md group relative transition-transform hover:scale-110"
                    title={item ? `${item.name} (${slot.toUpperCase()})` : `Ranura ${slot.toUpperCase()} vacía`}
                  >
                    <span className="text-xs">{item?.icon || slotIcons[slot]}</span>
                    {item && <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400 border border-black" />}
                  </div>
                );
              })}
            </div>

            {/* Right Equipped Gear Mini-Slots Vertical Strip with Tooltip / Tap Info */}
            <div className="absolute right-1.5 top-1.5 bottom-1.5 flex flex-col justify-around z-25 gap-1">
              {(['boots', 'ring', 'amulet'] as EquipmentSlot[]).map((slot) => {
                const item = equipped[slot];
                const slotIcons: Record<EquipmentSlot, string> = {
                  weapon: '⚔️',
                  armor: '🛡️',
                  helm: '🪖',
                  boots: '🥾',
                  ring: '💍',
                  amulet: '📿',
                  accessory: '✨',
                };
                return (
                  <div
                    key={slot}
                    onClick={() => {
                      if (item) setSelectedItem({ item, isEquippedSlot: slot });
                      else setSlotPickerModal(slot);
                    }}
                    onMouseEnter={() => {
                      if (item) setSelectedItem({ item, isEquippedSlot: slot });
                    }}
                    className="w-7 h-7 bg-[#121120]/95 border border-[#4a466e] rounded flex items-center justify-center cursor-pointer hover:border-amber-400 shadow-md group relative transition-transform hover:scale-110"
                    title={item ? `${item.name} (${slot.toUpperCase()})` : `Ranura ${slot.toUpperCase()} vacía`}
                  >
                    <span className="text-xs">{item?.icon || slotIcons[slot]}</span>
                    {item && <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400 border border-black" />}
                  </div>
                );
              })}
            </div>

            <div
              key={currentHero.id}
              className={`w-full h-full flex items-center justify-center transition-all duration-300 ease-out ${
                transitionDirection === 'right'
                  ? 'animate-[slideInRight_0.3s_ease-out]'
                  : 'animate-[slideInLeft_0.3s_ease-out]'
              }`}
            >
              <HeroFullBodyCanvas
                hero={currentHero}
                equippedWeapon={equipped.weapon}
                equippedArmor={equipped.armor}
                onHeroTap={() => showToast(`⚔️ ¡${currentHero.name} ejecuta su pose de batalla!`)}
              />
            </div>
            <div className="absolute bottom-1 right-8 bg-[#12111e]/90 border border-[#f0b541] rounded px-1.5 py-0.5 shadow flex items-center justify-center gap-1 z-20">
              <span className="font-silkscreen text-[6px] text-[#f0b541] font-bold">COST</span>
              <span className="font-pixel text-[8px] text-white font-bold">{currentHero.cost}</span>
            </div>
          </div>

          {toastNotification && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 pointer-events-none bg-[#161528]/95 border border-[#f0b541] text-[#f0b541] font-silkscreen text-[7px] px-3 py-1 rounded-full shadow-lg">
              {toastNotification}
            </div>
          )}
        </div>

        {/* 4. BOTTOM TABS NAVIGATION */}
        <div className="bg-[#12111d] border-b border-[#353350] px-2 py-1 flex items-center justify-between gap-1 shrink-0">
          <GameButton
            variant="tab"
            size="sm"
            active={activeBottomTab === 'skills'}
            onClick={() => setActiveBottomTab('skills')}
            className="flex-1"
          >
            <Zap className="w-3 h-3 text-amber-500" />
            HABILIDADES
          </GameButton>
          <GameButton
            variant="tab"
            size="sm"
            active={activeBottomTab === 'inventory'}
            onClick={() => setActiveBottomTab('inventory')}
            className="flex-1"
          >
            <Backpack className="w-3 h-3 text-emerald-400" />
            MOCHILA ({inventory.filter(Boolean).length}/24)
          </GameButton>
          <GameButton
            variant="tab"
            size="sm"
            active={activeBottomTab === 'fusion'}
            onClick={() => setActiveBottomTab('fusion')}
            className="flex-1"
          >
            <Flame className="w-3 h-3 text-orange-400" />
            FUSIÓN
          </GameButton>
        </div>

        {/* 5. TAB CONTENT CONTAINER */}
        <div className="flex-1 overflow-y-auto p-2 bg-[#0c0b16] space-y-2">

          {activeBottomTab === 'skills' && (
            <div className="space-y-2">
              <div className="bg-[#151424] border border-[#383756] rounded p-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="font-pixel text-[7px] bg-orange-600 text-white px-1.5 py-0.5 rounded font-bold">Leader Skill</span>
                  <h4 className="font-pixel text-[8px] text-[#f0b541] font-bold">{currentHero.leaderSkill.name}</h4>
                </div>
                <p className="font-silkscreen text-[7px] text-slate-200 leading-relaxed">{currentHero.leaderSkill.description}</p>
              </div>

              <div className="bg-[#151424] border border-[#383756] rounded p-2">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-pixel text-[7px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-bold">Brave Burst</span>
                    <h4 className="font-pixel text-[8px] text-cyan-300 font-bold">{currentHero.braveBurst.name}</h4>
                  </div>
                  <span className="font-silkscreen text-[6px] text-amber-300 bg-[#0c0b16] px-1 py-0.5 rounded border border-[#3b3a58]">
                    Lv.{currentHero.braveBurst.level}
                  </span>
                </div>
                <p className="font-silkscreen text-[7px] text-slate-200 leading-relaxed">{currentHero.braveBurst.description}</p>
              </div>

              <div className="bg-[#11101d] border border-[#2d2b44] rounded p-1.5 text-[6px] font-silkscreen text-slate-400 italic">
                📖 "{currentHero.lore}"
              </div>
            </div>
          )}

          {activeBottomTab === 'inventory' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-[#2d2b44]">
                <span className="font-pixel text-[7px] text-[#f0b541]">MOCHILA ({inventory.filter(Boolean).length}/24) - Toca un objeto para equipar o usar</span>
              </div>

              <div className="grid grid-cols-6 gap-1 content-start">
                {inventory.map((item, idx) => {
                  const rarity = item?.rarity || 'common';
                  const rConfig = RARITY_CONFIG[rarity];
                  const isSelected = selectedItem?.item?.id === item?.id;

                  return (
                    <button
                      key={idx}
                      onClick={(e) => {
                        if (!item) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        const containerRect = e.currentTarget.closest('.tg-box-popup')?.getBoundingClientRect() || { top: 0, left: 0 };
                        setSelectedItem({
                          item,
                          index: idx,
                          rect: {
                            top: rect.top - containerRect.top + rect.height + 4,
                            left: Math.min(rect.left - containerRect.left, 180),
                            width: rect.width,
                            height: rect.height,
                          },
                        });
                      }}
                      className={`aspect-square rounded border relative flex items-center justify-center cursor-pointer ${
                        item ? 'bg-[#171628] hover:scale-105' : 'bg-[#0f0e1a]/60 border-[#26243a]'
                      } ${isSelected ? 'ring-2 ring-[#f0b541]' : ''}`}
                      style={{ borderColor: item ? rConfig.borderColor : undefined }}
                    >
                      {item ? <span className="text-sm flex items-center justify-center">{item.icon || '📦'}</span> : <span className="font-silkscreen text-[5px] text-[#33314b] flex items-center justify-center">{idx + 1}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {activeBottomTab === 'fusion' && (
            <div className="space-y-2 text-center py-3">
              <h4 className="font-pixel text-[8px] text-[#f0b541]">FUSIÓN DE EXPERIENCIA</h4>
              <p className="font-silkscreen text-[7px] text-slate-300 px-2">Mejora el nivel de {currentHero.name} consumiendo cristales de maná y oro.</p>
              <GameButton
                variant="primary"
                size="sm"
                onClick={() => {
                  if (engine?.progressionManager) {
                    engine.progressionManager.addExperience(50);
                    showToast(`¡Fusión exitosa! +50 EXP`);
                  }
                }}
                className="mx-auto"
              >
                FUSIONAR CRISTAL (+50 EXP)
              </GameButton>
            </div>
          )}

          {/* ITEM TOOLTIP BOX WITH AUTO-DISMISS & LARGE ILLUSTRATION */}
          {selectedItem && (
            <ItemTooltipManager
              key={selectedItem.item.id + (selectedItem.index ?? 'eq')}
              item={selectedItem.item}
              index={selectedItem.index}
              isEquippedSlot={selectedItem.isEquippedSlot}
              onClose={() => setSelectedItem(null)}
              onUnequip={handleUnequipItem}
              onUse={handleUseItem}
              onEquip={handleEquipItem}
              onSell={handleSellItem}
            />
          )}

          {/* TAP SLOT PICKER MODAL */}
          {slotPickerModal && (
            <div className="bg-[#17162b] border border-cyan-400 rounded p-2 space-y-2 animate-in fade-in">
              <div className="flex justify-between items-center text-[7px] font-pixel">
                <span className="text-cyan-300 font-bold">SELECCIONAR {slotPickerModal.toUpperCase()} DE MOCHILA</span>
                <button onClick={() => setSlotPickerModal(null)} className="text-slate-400 cursor-pointer">✕</button>
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1">
                {inventory
                  .map((it, idx) => ({ it, idx }))
                  .filter(({ it }) => it && it.slot === slotPickerModal)
                  .map(({ it, idx }) => (
                    <div
                      key={idx}
                      onClick={() => handleEquipItem(it!, idx)}
                      className="bg-[#100f1c] hover:bg-[#201e38] p-1.5 rounded border border-[#3b3a58] flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm flex items-center justify-center">{it!.icon}</span>
                        <span className="font-pixel text-[7px] text-amber-300">{it!.name}</span>
                      </div>
                      <span className="font-pixel text-[6px] bg-cyan-600 text-white px-2 py-0.5 rounded flex items-center justify-center">Equipar</span>
                    </div>
                  ))}
                {inventory.filter((it) => it && it.slot === slotPickerModal).length === 0 && (
                  <p className="font-silkscreen text-[6px] text-slate-400 text-center py-2">No hay objetos compatibles en la mochila.</p>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
