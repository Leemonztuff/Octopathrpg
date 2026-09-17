import React from 'react';
import { ShopItem } from '../types';
import { X, ShoppingBag, Coins } from 'lucide-react';

interface ShopModalUIProps {
  isOpen: boolean;
  onClose: () => void;
  shopName: string;
  npcName: string;
  items: ShopItem[];
  playerGold: number;
  onBuyItem: (item: ShopItem) => void;
}

export const ShopModalUI: React.FC<ShopModalUIProps> = ({
  isOpen,
  onClose,
  shopName,
  npcName,
  items,
  playerGold,
  onBuyItem,
}) => {
  const [isFlashing, setIsFlashing] = React.useState(false);
  const prevGoldRef = React.useRef(playerGold);

  React.useEffect(() => {
    if (playerGold < prevGoldRef.current) {
      setIsFlashing(true);
      const timer = setTimeout(() => setIsFlashing(false), 900);
      return () => clearTimeout(timer);
    }
    prevGoldRef.current = playerGold;
  }, [playerGold]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="relative w-full max-w-xl bg-slate-900 border-4 border-amber-600 rounded-xl shadow-2xl overflow-hidden flex flex-col text-slate-100">
        
        {/* Header with PandaMaru Market banner styling */}
        <div className="relative h-28 bg-gradient-to-r from-amber-900 via-amber-800 to-amber-950 p-4 border-b-2 border-amber-600 flex items-center justify-between overflow-hidden">
          <div className="absolute inset-0 opacity-25 bg-cover bg-center pointer-events-none" style={{ backgroundImage: 'url("/map/PandaMaru_MV_market1.png")' }} />
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-700/80 border-2 border-amber-400 rounded-lg flex items-center justify-center shadow-inner">
              <ShoppingBag className="w-6 h-6 text-amber-200" />
            </div>
            <div>
              <h2 className="font-pixel text-sm text-amber-300 font-bold tracking-wider">{shopName}</h2>
              <p className="font-pixel text-[10px] text-amber-200/80">Comerciante: {npcName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="relative z-10 w-8 h-8 bg-red-800 hover:bg-red-700 border-2 border-red-500 rounded-lg flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Player Gold Bar */}
        <div className="bg-slate-950 px-6 py-2.5 border-b border-slate-800 flex items-center justify-between">
          <span className="font-pixel text-[10px] text-slate-400">Tus Fondos Disponibles:</span>
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full transition-all duration-300 ${
            isFlashing 
              ? 'bg-amber-400 border-2 border-amber-200 shadow-lg shadow-amber-400/80 scale-110 text-slate-950 animate-bounce' 
              : 'bg-amber-950/60 border border-amber-600/50 text-amber-300'
          }`}>
            <Coins className={`w-4 h-4 ${isFlashing ? 'text-slate-950 animate-spin' : 'text-amber-400'}`} />
            <span className={`font-pixel text-xs font-bold ${isFlashing ? 'text-slate-950' : 'text-amber-300'}`}>{playerGold} Oro</span>
          </div>
        </div>

        {/* Items List */}
        <div className="p-6 max-h-[350px] overflow-y-auto space-y-3 custom-scrollbar">
          {items.map((shopItem) => {
            const canAfford = playerGold >= shopItem.price;
            return (
              <div
                key={shopItem.id}
                className="bg-slate-800/80 border-2 border-slate-700 hover:border-amber-500/60 p-3.5 rounded-lg flex items-center justify-between transition-all"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 bg-slate-900 border-2 border-slate-600 rounded-lg flex items-center justify-center text-2xl shadow-inner">
                    {shopItem.item.icon || '📦'}
                  </div>
                  <div>
                    <h3 className="font-pixel text-xs text-slate-100 font-bold">{shopItem.name}</h3>
                    <p className="font-pixel text-[9px] text-slate-400 capitalize">
                      Ranura: {shopItem.item.slot} {shopItem.item.statMods ? `(Stat: +${shopItem.item.statMods.attack || shopItem.item.statMods.defense || 0})` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 text-amber-400 font-pixel text-xs font-bold">
                    <Coins className="w-3.5 h-3.5" />
                    <span>{shopItem.price} G</span>
                  </div>
                  <button
                    disabled={!canAfford}
                    onClick={() => onBuyItem(shopItem)}
                    className={`font-pixel text-[10px] font-bold px-4 py-2 rounded-lg border-2 transition-all cursor-pointer ${
                      canAfford
                        ? 'bg-amber-600 hover:bg-amber-500 text-slate-950 border-amber-400 shadow-md active:scale-95'
                        : 'bg-slate-700 text-slate-400 border-slate-600 cursor-not-allowed opacity-60'
                    }`}
                  >
                    {canAfford ? 'Comprar' : 'Sin Oro'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="bg-slate-950 px-6 py-3 border-t border-slate-800 text-center">
          <p className="font-pixel text-[9px] text-slate-400">
            Los objetos comprados se añadirán directamente a tu inventario.
          </p>
        </div>

      </div>
    </div>
  );
};
