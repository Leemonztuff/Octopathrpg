import React, { useEffect } from 'react';
import { Item, EquipmentSlot } from '../types';
import { RARITY_CONFIG } from '../data/LootTables';

interface ItemTooltipManagerProps {
  item: Item;
  onClose: () => void;
  isEquippedSlot?: EquipmentSlot;
  onUnequip?: (slot: EquipmentSlot) => void;
  onUse?: (index: number) => void;
  onEquip?: (item: Item, index?: number) => void;
  onSell?: (index: number) => void;
  index?: number;
}

export const ItemTooltipManager: React.FC<ItemTooltipManagerProps> = ({
  item,
  onClose,
  isEquippedSlot,
  onUnequip,
  onUse,
  onEquip,
  onSell,
  index,
}) => {
  // 3-second auto-dismissal timer
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [item, onClose]);

  const rarity = item.rarity || 'common';
  const rConfig = RARITY_CONFIG[rarity] || RARITY_CONFIG.common;

  // Render stats / modifications safely
  const renderStatRow = (label: string, value: number | undefined, isPercent = false) => {
    if (value === undefined || value === 0) return null;
    const sign = value > 0 ? '+' : '';
    const displayVal = isPercent ? `${Math.round(value * 100)}%` : Math.round(value);
    return (
      <div key={label} className="flex justify-between items-center text-[8px] font-pixel border-b border-[#2d2b44]/40 py-1">
        <span className="text-slate-400 uppercase">{label}</span>
        <span className="text-emerald-400 font-bold">{sign}{displayVal}</span>
      </div>
    );
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm pointer-events-auto"
      onClick={onClose}
    >
      <div 
        className="w-80 tg-box-popup flex flex-col gap-3 relative shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute -top-1 -right-1 w-6 h-6 bg-[#211e30] hover:bg-[#34314c] border border-[#55527a] rounded flex items-center justify-center cursor-pointer text-[10px] text-slate-400 font-pixel z-50 hover:text-white"
        >
          ✕
        </button>

        {/* Top Header Card */}
        <div className="flex gap-3.5 items-start mt-1">
          {/* Item Large Illustration / Icon Slot */}
          <div 
            className="w-14 h-14 bg-[#11101c] rounded flex items-center justify-center shrink-0 border-2 shadow-inner"
            style={{ borderColor: rConfig.borderColor }}
          >
            <span className="text-3xl filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
              {item.icon || '⚔️'}
            </span>
          </div>

          {/* Title & Metadata */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span 
                className="font-silkscreen text-[6px] px-1.5 py-0.5 rounded uppercase font-bold text-center tracking-wider"
                style={{ 
                  backgroundColor: rConfig.bgColor,
                  color: rConfig.textColor,
                  border: `1px solid ${rConfig.borderColor}`
                }}
              >
                {rConfig.name}
              </span>
              <span className="font-silkscreen text-[6px] text-slate-400 uppercase bg-[#141320] px-1.5 py-0.5 rounded border border-[#2b2a42]">
                {isEquippedSlot ? `EQUIPADO [${isEquippedSlot.toUpperCase()}]` : (item.slot || 'OBJETO')}
              </span>
            </div>
            <h3 
              className="font-pixel text-[11px] mt-1.5 leading-snug font-bold filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
              style={{ color: rConfig.textColor }}
            >
              {item.name}
            </h3>
          </div>
        </div>

        {/* Stats Table / Description */}
        <div className="bg-[#0f0e1a]/90 rounded border border-[#2e2d45] p-2 space-y-1 mt-1">
          <span className="font-silkscreen text-[7px] text-[#f0b541] font-bold block border-b border-[#2d2b44] pb-1">
            ATRIBUTOS & EFECTOS
          </span>

          <div className="max-h-28 overflow-y-auto pr-0.5">
            {/* Show item stat modifications */}
            {item.statMods ? (
              <>
                {renderStatRow('Ataque', item.statMods.attack)}
                {renderStatRow('Defensa', item.statMods.defense)}
                {renderStatRow('Vida Máxima', item.statMods.maxHp)}
                {renderStatRow('Prob. Crítica', item.statMods.critChance, true)}
                {renderStatRow('Daño Crítico', item.statMods.critDamage, true)}
                {renderStatRow('Robo de Vida', item.statMods.lifeSteal, true)}
                {renderStatRow('Velocidad', item.statMods.speedBonus)}
              </>
            ) : item.stats ? (
              <>
                {renderStatRow('Ataque', item.stats.attack)}
                {renderStatRow('Defensa', item.stats.defense)}
                {renderStatRow('Vida Máxima', item.stats.health)}
              </>
            ) : (
              <p className="text-[7px] font-silkscreen text-slate-400 italic py-1">Sin atributos adicionales.</p>
            )}

            {/* Consumable Info */}
            {item.healAmount && (
              <div className="flex justify-between items-center text-[8px] font-pixel py-1 border-b border-[#2d2b44]/40">
                <span className="text-emerald-400 font-bold uppercase">RESTAURACIÓN HP</span>
                <span className="text-emerald-300 font-bold">+{item.healAmount} HP</span>
              </div>
            )}
          </div>
        </div>

        {/* Item Description / Lore */}
        {item.description && (
          <div className="bg-[#141320]/70 p-1.5 rounded border border-[#26243a] text-[7px] font-silkscreen text-slate-300 leading-relaxed italic">
            "{item.description}"
          </div>
        )}

        {/* Actions Row */}
        {(onUnequip || onUse || onEquip || onSell) && (
          <div className="flex gap-1.5 pt-1 border-t border-[#2e2d45] mt-1">
            {isEquippedSlot && onUnequip ? (
              <button
                onClick={() => onUnequip(isEquippedSlot)}
                className="flex-1 bg-[#421b5c] hover:bg-[#5a247e] text-white font-pixel text-[7px] py-1.5 rounded cursor-pointer text-center font-bold shadow border border-[#76379c]"
              >
                Desequipar
              </button>
            ) : item.slot === 'consumable' && onUse ? (
              <button
                onClick={() => onUse(index ?? 0)}
                className="flex-1 bg-[#1b5c32] hover:bg-[#247e45] text-white font-pixel text-[7px] py-1.5 rounded cursor-pointer text-center font-bold shadow border border-[#2ea057]"
              >
                Usar
              </button>
            ) : onEquip ? (
              <button
                onClick={() => onEquip(item, index)}
                className="flex-1 bg-[#5c461b] hover:bg-[#7e6224] text-white font-pixel text-[7px] py-1.5 rounded cursor-pointer text-center font-bold shadow border border-[#a37e33]"
              >
                Equipar
              </button>
            ) : null}
            {!isEquippedSlot && onSell && (
              <button
                onClick={() => onSell(index ?? 0)}
                className="bg-[#5c351b] hover:bg-[#7e4a24] text-amber-200 font-pixel text-[7px] px-2.5 py-1.5 rounded cursor-pointer text-center font-bold shadow border border-[#9e5d32]"
              >
                Vender
              </button>
            )}
          </div>
        )}

        {/* Auto dismiss banner */}
        <div className="flex justify-between items-center font-silkscreen text-[6px] text-slate-400 bg-[#0f0e1a] px-1.5 py-1 rounded border border-[#26243a]">
          <span>Se cerrará automáticamente...</span>
          <div className="w-12 h-1 bg-[#1c1a2d] rounded-full overflow-hidden">
            <div className="h-full bg-amber-400 animate-[shrinkBar_3s_linear_forwards]" style={{ transformOrigin: 'left' }} />
          </div>
        </div>
      </div>
    </div>
  );
};
