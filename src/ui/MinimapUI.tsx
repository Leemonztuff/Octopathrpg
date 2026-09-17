import React, { useState, useEffect } from 'react';
import { GameEngine } from '../core/GameEngine';
import { Map, Minimize2, Compass } from 'lucide-react';

interface MinimapUIProps {
  engine: GameEngine | null;
}

export const MinimapUI: React.FC<MinimapUIProps> = ({ engine }) => {
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isInOverworld, setIsInOverworld] = useState<boolean>(false);
  const [playerGrid, setPlayerGrid] = useState<{ x: number; z: number }>({ x: 32, z: 28 });
  const [mapTitle, setMapTitle] = useState<string>('Capital de Argentum');

  useEffect(() => {
    const interval = setInterval(() => {
      if (engine) {
        const overworld = engine.overworldManager?.isInOverworld() || false;
        setIsInOverworld(overworld);
        const pPos = engine.player?.position.getGridPos();
        if (pPos) {
          setPlayerGrid({ x: pPos.x, z: pPos.z });
        }
        setMapTitle(overworld ? 'Mapa del Overworld' : (engine.mapEditor?.getCurrentMapName() || 'Ciudad de Argentum'));
      }
    }, 250);
    return () => clearInterval(interval);
  }, [engine]);

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  if (isMinimized) {
    return (
      <div className="absolute top-20 right-4 z-30 pointer-events-auto">
        <button
          onClick={toggleMinimize}
          className="bg-slate-900/90 hover:bg-slate-800 text-amber-300 border-2 border-amber-600/70 p-2.5 rounded-full shadow-xl flex items-center justify-center gap-1.5 cursor-pointer transition-transform hover:scale-105 active:scale-95"
          title="Abrir Minimapa"
        >
          <Map className="w-5 h-5 text-amber-400" />
          <span className="font-pixel text-[8px] font-bold hidden sm:inline">MINIMAPA</span>
        </button>
      </div>
    );
  }

  return (
    <div className="absolute top-20 right-4 z-30 pointer-events-auto w-48 sm:w-56 bg-slate-950/90 border-2 border-amber-600/70 rounded-xl shadow-2xl overflow-hidden flex flex-col text-slate-100 backdrop-blur-md animate-fadeIn">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-950 to-slate-900 px-3 py-1.5 border-b border-amber-600/50 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: '12s' }} />
          <span className="font-pixel text-[9px] text-amber-300 font-bold truncate max-w-[120px]">{mapTitle}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleMinimize}
            className="w-5 h-5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded flex items-center justify-center cursor-pointer text-slate-300 hover:text-white"
            title="Minimizar a botón"
          >
            <Minimize2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Map Radar Viewport */}
      <div className="relative w-full h-40 bg-slate-900/80 flex items-center justify-center overflow-hidden border-b border-slate-800">
        {/* Grid pattern background */}
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:12px_12px]" />

        {isInOverworld ? (
          /* Overworld Mini Radar */
          <div className="relative w-full h-full p-2 flex items-center justify-center">
            <div className="absolute inset-4 border border-amber-500/30 rounded-lg flex flex-col items-center justify-between p-2 text-[8px] font-pixel text-amber-200/60">
              <span className="text-[7px]">[ S ANTAURIO ]</span>
              <div className="w-full flex justify-between px-2">
                <span>[ ALDEA ]</span>
                <span className="text-amber-400 font-bold">★ CAPITAL</span>
                <span>[ PUERTO ]</span>
              </div>
              <span className="text-[7px]">[ RUINAS ]</span>
            </div>
            {/* Player marker */}
            <div 
              className="absolute w-3 h-3 bg-amber-400 border-2 border-white rounded-full shadow-lg animate-ping"
              style={{
                left: `${Math.max(10, Math.min(90, (playerGrid.x / 64) * 100))}%`,
                top: `${Math.max(10, Math.min(90, (playerGrid.z / 64) * 100))}%`,
              }}
            />
            <div 
              className="absolute w-2.5 h-2.5 bg-amber-400 border-2 border-slate-950 rounded-full shadow-md z-10"
              style={{
                left: `${Math.max(10, Math.min(90, (playerGrid.x / 64) * 100))}%`,
                top: `${Math.max(10, Math.min(90, (playerGrid.z / 64) * 100))}%`,
              }}
            />
          </div>
        ) : (
          /* City / Local Map Mini Radar */
          <div className="relative w-full h-full flex items-center justify-center">
            <div className="absolute inset-2 border border-cyan-500/30 rounded-lg bg-slate-950/40 flex items-center justify-center">
              <span className="font-pixel text-[8px] text-cyan-300/40 tracking-widest">ZONA LOCAL</span>
            </div>
            {/* Player marker in local city grid */}
            <div 
              className="absolute w-3 h-3 bg-cyan-400 border-2 border-white rounded-full shadow-lg animate-ping"
              style={{
                left: `${Math.max(15, Math.min(85, 50 + (playerGrid.x - 32) * 1.5))}%`,
                top: `${Math.max(15, Math.min(85, 50 + (playerGrid.z - 32) * 1.5))}%`,
              }}
            />
            <div 
              className="absolute w-2.5 h-2.5 bg-cyan-400 border-2 border-slate-950 rounded-full shadow-md z-10"
              style={{
                left: `${Math.max(15, Math.min(85, 50 + (playerGrid.x - 32) * 1.5))}%`,
                top: `${Math.max(15, Math.min(85, 50 + (playerGrid.z - 32) * 1.5))}%`,
              }}
            />
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="bg-slate-950 px-3 py-1.5 flex items-center justify-between font-pixel text-[8px] text-slate-400">
        <span>X: {playerGrid.x} | Z: {playerGrid.z}</span>
        <span className="text-amber-400 font-bold">{isInOverworld ? 'Overworld' : 'Ciudad'}</span>
      </div>
    </div>
  );
};
