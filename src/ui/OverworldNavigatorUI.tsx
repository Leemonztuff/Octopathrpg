import React, { useState, useEffect } from 'react';
import {
  Map as MapIcon,
  X,
  MapPin,
  Sparkles,
  Navigation,
  Compass,
  Sword,
  ShieldAlert,
  Gift,
  Flame,
  ArrowRight,
} from 'lucide-react';
import { globalEventBus } from '../core/EventBus';
import { motion, AnimatePresence } from 'motion/react';
import { OverworldEncounter } from '../overworld/OverworldManager';

interface POIData {
  id: string;
  name: string;
  type: string;
  x: number;
  z: number;
  top: string;
  left: string;
  biome: string;
  desc: string;
  unlocked: boolean;
}

const CONTINENT_POIS: POIData[] = [
  {
    id: 'poi_temple',
    name: 'Santuario del Invierno',
    type: 'TOWN_TEMPLE',
    x: 32,
    z: 10,
    top: '16%',
    left: '50%',
    biome: 'Picos Nevados',
    desc: 'Templo sagrado en las cumbres nevadas del norte con altares ancestrales.',
    unlocked: true,
  },
  {
    id: 'poi_village',
    name: 'Aldea del Viento',
    type: 'TOWN_VILLAGE',
    x: 16,
    z: 16,
    top: '25%',
    left: '25%',
    biome: 'Colinas del Viento',
    desc: 'Tranquilo pueblo montañoso con taberna rústica, herrería y molinos.',
    unlocked: true,
  },
  {
    id: 'poi_cave',
    name: 'Minas de Mithril',
    type: 'TOWN_CAVE',
    x: 48,
    z: 14,
    top: '22%',
    left: '75%',
    biome: 'Canteras Rocosas',
    desc: 'Galerías subterráneas con vetas luminosas de mineral puro y pozos mineros.',
    unlocked: true,
  },
  {
    id: 'poi_capital',
    name: 'Capital de Argentum',
    type: 'TOWN_CASTLE',
    x: 32,
    z: 28,
    top: '44%',
    left: '50%',
    biome: 'Valle Imperial',
    desc: 'Gran metrópolis imperial con castillo real, mercado de artesanos y hermandades.',
    unlocked: true,
  },
  {
    id: 'poi_port',
    name: 'Puerto Mareas',
    type: 'TOWN_PORT',
    x: 52,
    z: 28,
    top: '44%',
    left: '82%',
    biome: 'Costa de Coral',
    desc: 'Muelle marítimo con tabernas de marineros, barcos mercantes y brisa marina.',
    unlocked: true,
  },
  {
    id: 'poi_farm',
    name: 'Granja de Oakhaven',
    type: 'TOWN_FARM',
    x: 18,
    z: 36,
    top: '56%',
    left: '28%',
    biome: 'Campos Dorados',
    desc: 'Vastos sembradíos de trigo dorado, canales de agua y molinos de grano.',
    unlocked: true,
  },
  {
    id: 'poi_lumbermill',
    name: 'Bosque de los Susurros',
    type: 'TOWN_LUMBERMILL',
    x: 16,
    z: 48,
    top: '75%',
    left: '25%',
    biome: 'Selva Profunda',
    desc: 'Espeso bosque ancestral con robles centenarios, ríos y aserradero.',
    unlocked: true,
  },
  {
    id: 'poi_ruins',
    name: 'Ruinas de Eldoria',
    type: 'TOWN_RUINS',
    x: 48,
    z: 48,
    top: '75%',
    left: '75%',
    biome: 'Meseta Desolada',
    desc: 'Restos de una civilización olvidada con criptas de piedra y sombras errantes.',
    unlocked: true,
  },
];

export const OverworldNavigatorUI: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [nearPortal, setNearPortal] = useState(false);
  const [portalName, setPortalName] = useState<string>('');
  const [selectedPoi, setSelectedPoi] = useState<POIData | null>(null);
  const [encounter, setEncounter] = useState<OverworldEncounter | null>(null);

  useEffect(() => {
    const unbindNear = globalEventBus.on('portal:near', (payload) => {
      setNearPortal(payload.near);
      if (payload.portalName) {
        setPortalName(payload.portalName);
      }
    });

    const unbindToggle = globalEventBus.on('input:toggle_map', () => {
      setIsOpen((prev) => !prev);
    });

    const unbindEncStart = globalEventBus.on('overworld:encounter_start', (enc: OverworldEncounter) => {
      setEncounter(enc);
    });

    const unbindEncEnd = globalEventBus.on('overworld:encounter_end', () => {
      setEncounter(null);
    });

    return () => {
      unbindNear();
      unbindToggle();
      unbindEncStart();
      unbindEncEnd();
    };
  }, []);

  const handleTravelToOverworldFree = (poi?: POIData) => {
    const targetX = poi ? poi.x : 32;
    const targetZ = poi ? poi.z : 28;
    globalEventBus.emit('player:fast_travel', {
      overworldX: targetX,
      overworldZ: targetZ,
      poiType: 'OVERWORLD_MAP',
    });
    setIsOpen(false);
    setSelectedPoi(null);
  };

  const handleEnterLocalMap = (poi: POIData) => {
    globalEventBus.emit('player:fast_travel', {
      overworldX: poi.x,
      overworldZ: poi.z,
      poiType: poi.type,
      name: poi.name,
    });
    setIsOpen(false);
    setSelectedPoi(null);
  };

  const handleResolveEncounter = (action: 'fight' | 'flee' | 'claim') => {
    globalEventBus.emit('overworld:resolve_encounter', action);
  };

  return (
    <>
      {/* 1. Proximity Banner for POI / Portal Interaction */}
      <AnimatePresence>
        {nearPortal && !isOpen && !encounter && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.92 }}
            className="pointer-events-auto absolute top-20 left-1/2 -translate-x-1/2 z-40"
          >
            <button
              onClick={() => {
                globalEventBus.emit('input:interact', {});
              }}
              className="flex items-center gap-3 bg-gradient-to-r from-amber-950/95 via-slate-900/95 to-indigo-950/95 text-amber-200 border-2 border-amber-500/80 px-5 py-2.5 rounded-full shadow-[0_0_24px_rgba(245,158,11,0.4)] hover:scale-105 hover:border-amber-300 transition-all font-pixel text-xs tracking-wide group"
            >
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
              <span className="text-white font-bold">{portalName || 'Interactuar'}</span>
              <span className="bg-amber-600/90 text-white text-[10px] px-2.5 py-0.5 rounded font-mono shadow-sm">
                [E] Entrar
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Top-Right Dedicated Map Navigation Trigger */}
      <div className="pointer-events-auto absolute top-20 right-3 sm:top-24 sm:right-4 z-40 flex flex-col items-end gap-2">
        <button
          onClick={() => setIsOpen(true)}
          className={`flex items-center gap-2 bg-gradient-to-br from-slate-900/95 via-amber-950/90 to-slate-900/95 text-amber-200 px-3.5 py-2 rounded-xl shadow-xl border border-amber-500/60 hover:border-amber-300 hover:text-white transition-all backdrop-blur-md ${
            nearPortal ? 'ring-2 ring-amber-400/80 animate-pulse' : ''
          }`}
          title="Abrir Mapamundi de Argentum"
        >
          <Compass size={18} className="text-amber-400" />
          <span className="text-xs font-bold font-pixel tracking-wide hidden sm:inline">Mapamundi</span>
        </button>
      </div>

      {/* 3. Option 3 Hybrid Encounter Modal */}
      <AnimatePresence>
        {encounter && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <div className="relative w-full max-w-md bg-slate-950 rounded-2xl shadow-2xl border-2 border-amber-600/90 p-5 flex flex-col gap-4 text-center">
              <div className="flex justify-center">
                {encounter.type === 'combat' && (
                  <div className="p-3 bg-red-950/80 border-2 border-red-500 rounded-full shadow-[0_0_20px_rgba(239,68,68,0.5)]">
                    <ShieldAlert size={36} className="text-red-400 animate-pulse" />
                  </div>
                )}
                {encounter.type === 'treasure' && (
                  <div className="p-3 bg-amber-950/80 border-2 border-amber-500 rounded-full shadow-[0_0_20px_rgba(245,158,11,0.5)]">
                    <Gift size={36} className="text-amber-400 animate-bounce" />
                  </div>
                )}
                {encounter.type === 'rest' && (
                  <div className="p-3 bg-emerald-950/80 border-2 border-emerald-500 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.5)]">
                    <Flame size={36} className="text-emerald-400 animate-pulse" />
                  </div>
                )}
              </div>

              <div>
                <span className="text-[11px] font-pixel text-amber-400 uppercase tracking-widest">
                  {encounter.biome}
                </span>
                <h3 className="text-lg font-bold font-pixel text-white mt-1">{encounter.title}</h3>
                <p className="text-xs font-pixel text-slate-300 mt-2 leading-relaxed">
                  {encounter.description}
                </p>
              </div>

              {encounter.reward && (
                <div className="bg-slate-900/90 border border-amber-500/30 rounded-lg py-2 px-3 flex justify-around text-xs font-pixel text-amber-300">
                  <span>Recompensa: +{encounter.reward.gold} Oro</span>
                  <span>+{encounter.reward.exp} EXP</span>
                </div>
              )}

              <div className="flex gap-2 justify-center mt-2">
                {encounter.type === 'combat' ? (
                  <>
                    <button
                      onClick={() => handleResolveEncounter('fight')}
                      className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-pixel text-xs py-2.5 px-4 rounded-xl border border-red-400 shadow-lg transition-transform active:scale-95"
                    >
                      <Sword size={16} />
                      <span>Combatir</span>
                    </button>
                    <button
                      onClick={() => handleResolveEncounter('flee')}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-pixel text-xs py-2.5 px-4 rounded-xl border border-slate-600 shadow transition-colors"
                    >
                      Huir al Sendero
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleResolveEncounter('claim')}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-500 hover:to-emerald-500 text-white font-pixel text-xs py-2.5 px-4 rounded-xl border border-amber-300 shadow-lg transition-transform active:scale-95"
                  >
                    <span>Continuar Viaje</span>
                    <ArrowRight size={16} />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. Continental Mapamundi Navigator Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md"
          >
            <div className="relative w-full max-w-5xl aspect-[16/10] bg-slate-950 rounded-2xl shadow-2xl border-2 border-amber-600/80 overflow-hidden flex flex-col">
              {/* Header */}
              <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-indigo-950 text-amber-100 px-5 py-3.5 flex justify-between items-center border-b border-amber-600/40">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-600/20 border border-amber-500/50 rounded-lg">
                    <Compass size={22} className="text-amber-400 animate-spin-slow" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold font-pixel tracking-wider text-amber-200">
                      Continente de Argentum
                    </h2>
                    <p className="text-[10px] text-amber-400/80 font-pixel">
                      Mapamundi 2D y Red de Asentamientos
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTravelToOverworldFree()}
                    className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-700 to-purple-700 hover:from-indigo-600 hover:to-purple-600 text-white text-xs font-pixel px-3 py-1.5 rounded-lg border border-indigo-400 shadow-md transition-all active:scale-95"
                  >
                    <Sparkles size={14} />
                    <span>Explorar Continente</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      setSelectedPoi(null);
                    }}
                    className="hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors text-slate-400"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Interactive Schematic Continent Map */}
              <div className="flex-1 relative bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/70 overflow-hidden p-4">
                {/* SVG Continental Highway Network */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-60">
                  <defs>
                    <linearGradient id="roadGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.4" />
                    </linearGradient>
                  </defs>
                  {/* Highway connections between POIs */}
                  {/* Capital (50, 44) to others */}
                  <line x1="50%" y1="44%" x2="50%" y2="16%" stroke="url(#roadGrad)" strokeWidth="3" strokeDasharray="6,6" />
                  <line x1="50%" y1="44%" x2="25%" y2="25%" stroke="url(#roadGrad)" strokeWidth="3" strokeDasharray="6,6" />
                  <line x1="50%" y1="44%" x2="75%" y2="22%" stroke="url(#roadGrad)" strokeWidth="3" strokeDasharray="6,6" />
                  <line x1="50%" y1="44%" x2="28%" y2="56%" stroke="url(#roadGrad)" strokeWidth="3" strokeDasharray="6,6" />
                  <line x1="50%" y1="44%" x2="82%" y2="44%" stroke="url(#roadGrad)" strokeWidth="3" strokeDasharray="6,6" />
                  <line x1="50%" y1="44%" x2="25%" y2="75%" stroke="url(#roadGrad)" strokeWidth="3" strokeDasharray="6,6" />
                  <line x1="50%" y1="44%" x2="75%" y2="75%" stroke="url(#roadGrad)" strokeWidth="3" strokeDasharray="6,6" />

                  {/* Ring road */}
                  <line x1="25%" y1="25%" x2="28%" y2="56%" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4,4" opacity="0.5" />
                  <line x1="28%" y1="56%" x2="25%" y2="75%" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4,4" opacity="0.5" />
                  <line x1="25%" y1="75%" x2="75%" y2="75%" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4,4" opacity="0.5" />
                  <line x1="75%" y1="75%" x2="82%" y2="44%" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4,4" opacity="0.5" />
                  <line x1="82%" y1="44%" x2="75%" y2="22%" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4,4" opacity="0.5" />
                  <line x1="75%" y1="22%" x2="50%" y2="16%" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4,4" opacity="0.5" />
                </svg>

                {/* POI Markers */}
                {CONTINENT_POIS.map((poi) => {
                  const isCapital = poi.type === 'TOWN_CASTLE';
                  const isSelected = selectedPoi?.id === poi.id;

                  return (
                    <button
                      key={poi.id}
                      onClick={() => setSelectedPoi(poi)}
                      className={`absolute flex flex-col items-center justify-center transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer transition-transform ${
                        isSelected ? 'scale-125 z-20' : 'hover:scale-110 z-10'
                      }`}
                      style={{ top: poi.top, left: poi.left }}
                    >
                      <div
                        className={`p-2.5 sm:p-3 rounded-full border-2 shadow-xl mb-1 relative flex items-center justify-center transition-all ${
                          isCapital
                            ? 'bg-amber-600 border-amber-300 shadow-amber-500/60'
                            : isSelected
                            ? 'bg-emerald-600 border-emerald-300 shadow-emerald-500/60'
                            : 'bg-indigo-700 border-indigo-400 shadow-indigo-500/40'
                        }`}
                      >
                        <MapPin size={isCapital ? 20 : 16} className="text-white drop-shadow" />
                        {isCapital && (
                          <span className="absolute inset-0 rounded-full border-2 border-amber-300 animate-ping opacity-60"></span>
                        )}
                      </div>

                      <div
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-pixel whitespace-nowrap border shadow-md transition-colors ${
                          isSelected
                            ? 'bg-emerald-950 text-emerald-200 border-emerald-400'
                            : isCapital
                            ? 'bg-amber-950 text-amber-200 border-amber-400'
                            : 'bg-black/90 text-slate-200 border-slate-700 group-hover:border-amber-400 group-hover:text-amber-200'
                        }`}
                      >
                        {poi.name}
                      </div>
                    </button>
                  );
                })}

                {/* Selected POI Details Panel */}
                <AnimatePresence>
                  {selectedPoi && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      className="absolute bottom-4 left-4 right-4 bg-slate-950/95 border-2 border-amber-500/80 rounded-xl p-4 shadow-2xl backdrop-blur-md flex flex-col sm:flex-row justify-between items-center gap-3 z-30"
                    >
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <span className="bg-amber-600/30 text-amber-300 border border-amber-500/40 text-[9px] font-pixel px-2 py-0.5 rounded">
                            {selectedPoi.biome}
                          </span>
                          <h4 className="text-sm font-bold font-pixel text-amber-100">{selectedPoi.name}</h4>
                        </div>
                        <p className="text-[11px] font-pixel text-slate-300 mt-1 max-w-xl">
                          {selectedPoi.desc}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => handleTravelToOverworldFree(selectedPoi)}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-pixel py-2 px-3 rounded-lg border border-slate-600 shadow transition-colors"
                        >
                          <Navigation size={14} />
                          <span>Ver en Mapamundi</span>
                        </button>
                        <button
                          onClick={() => handleEnterLocalMap(selectedPoi)}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-xs font-pixel py-2 px-4 rounded-lg border border-amber-300 shadow-md transition-transform active:scale-95"
                        >
                          <MapIcon size={14} />
                          <span>Entrar al Asentamiento</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer */}
              <div className="bg-slate-900/95 text-slate-400 px-5 py-2.5 text-[11px] font-pixel flex justify-between items-center border-t border-slate-800">
                <span className="text-amber-400/90">
                  🗺️ 8 Puntos de Interés con tiles específicos de cada bioma y recursos MiniWorldSprites
                </span>
                <span>Toca un punto para viajar o presiona ESC para cerrar</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
