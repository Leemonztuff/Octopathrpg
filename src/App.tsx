import { OverworldNavigatorUI } from './ui/OverworldNavigatorUI';
import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from './core/GameEngine';
import { globalEventBus } from './core/EventBus';
import { Direction } from './types';
import { VirtualJoystickUI } from './ui/VirtualJoystickUI';
import { EditorToolbarUI } from './ui/EditorToolbarUI';
import { DialogueBoxUI } from './ui/DialogueBoxUI';
import { CharacterModal } from './ui/CharacterModal';
import { MobileRosterInventoryModal } from './ui/MobileRosterInventoryModal';
import { ShopModalUI } from './ui/ShopModalUI';
import { MinimapUI } from './ui/MinimapUI';
import { FloatingTextUI } from './ui/FloatingTextUI';
import { HeroPortrait } from './ui/HeroPortrait';
import { PerformanceManager, QualityLevel } from './renderer/PerformanceProfile';
import { CurvedWorldManager, CurvedWorldMode } from './renderer/CurvedWorldManager';
import { useGameState } from './context/StateContext';
import {
  Sparkles,
  Info,
  PenTool,
  Shield,
  Zap,
  Globe,
} from 'lucide-react';

export default function App() {
  const {
    engine,
    setEngine,
    playerGrid,
    setPlayerGrid,
    playerHp,
    setPlayerHp,
    playerStats,
    equipped,
    activeQuest,
    setActiveQuest,
    isMoving,
    setIsMoving,
    dialogue,
    setDialogue,
    shopData,
    setShopData,
    gold,
    toastMessage,
    showNotification,
    showCharacterModal,
    setShowCharacterModal,
    modalViewMode,
    setModalViewMode,
    syncFromEngine,
  } = useGameState();

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [isPlayerDamaged, setIsPlayerDamaged] = useState<boolean>(false);
  const [fps, setFps] = useState<number>(60);

  const setLastMessage = showNotification;

  useEffect(() => {
    // Elegant welcome trigger on mount, auto-dismissing after 3 seconds
    showNotification('¡Bienvenido! Usa el joystick y botones táctiles');
  }, []);

  const [showInfo, setShowInfo] = useState<boolean>(false);
  const [isEditorMode, setIsEditorMode] = useState<boolean>(false);
  const [qualityPreset, setQualityPreset] = useState<QualityLevel>(() =>
    PerformanceManager.getInstance().currentPreset
  );
  const [curvedWorldMode, setCurvedWorldMode] = useState<CurvedWorldMode>(() =>
    CurvedWorldManager.getInstance().mode
  );
  const [poolStats, setPoolStats] = useState<{ enemies: any; projectiles: any } | null>(null);
  const [npcPrompts, setNpcPrompts] = useState<Array<{ npcName: string; x: number; y: number }>>([]);
  const [directorStats, setDirectorStats] = useState<{
    state: string;
    stress: number;
    timer: number;
    totalDefeated: number;
    elitesCount: number;
  } | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      if (engineRef.current) {
        const stats = engineRef.current.aiDirector?.getDirectorHUD();
        if (stats) {
          setDirectorStats(stats);
        }
      }
    }, 400);
    return () => clearInterval(interval);
  }, [engine]);

  useEffect(() => {
    if (!canvasContainerRef.current) return;

    const gameEngine = new GameEngine(canvasContainerRef.current);
    engineRef.current = gameEngine;
    setEngine(gameEngine);
    gameEngine.start();

    // Trigger local damaged flash effect
    const unbindDamagedFlash = globalEventBus.on('combat:player_damaged', () => {
      setIsPlayerDamaged(true);
      setTimeout(() => setIsPlayerDamaged(false), 300);
    });

    const interval = setInterval(() => {
      if (engineRef.current) {
        setFps(engineRef.current.getFPS());
        setPoolStats(engineRef.current.getPoolStats());
      }
    }, 500);

    let animId: number;
    const updateFloatingPrompts = () => {
      if (engineRef.current) {
        const currentEngine = engineRef.current;
        const player = currentEngine.getPlayer();
        if (player) {
          const pPos = player.position.getGridPos();
          const npcs = currentEngine.getNpcs();
          const activePromptsList: Array<{ npcName: string; x: number; y: number }> = [];

          // Only pick the single closest NPC within interaction range (1.75 grid units)
          let closestNpc: { name: string; dist: number; worldPos: any } | null = null;

          if (!currentEngine.getMapEditor()?.isEditorMode) {
            npcs.forEach((npc) => {
              const nPos = npc.position.getGridPos();
              const dx = pPos.x - nPos.x;
              const dz = pPos.z - nPos.z;
              const dist = Math.sqrt(dx * dx + dz * dz);

              if (dist <= 1.75) {
                if (!closestNpc || dist < closestNpc.dist) {
                  closestNpc = {
                    name: npc.name,
                    dist,
                    worldPos: npc.containerGroup.position.clone(),
                  };
                }
              }
            });
          }

          if (closestNpc) {
            const renderEngine = currentEngine.getRenderEngine();
            if (renderEngine) {
              const camera = renderEngine.octopathCamera?.camera;
              const renderer = renderEngine.renderer;
              if (camera && renderer) {
                const canvas = renderer.domElement;
                const width = canvas.clientWidth;
                const height = canvas.clientHeight;

                // Clone the world position of the NPC container
                const worldPos = (closestNpc as any).worldPos;
                worldPos.y += 1.6; // Set the height just above their head

                // Project to 2D coordinates
                const proj = worldPos.clone();
                proj.project(camera);

                // Convert to CSS pixel coordinates relative to container
                const screenX = (proj.x * 0.5 + 0.5) * width;
                const screenY = (-(proj.y * 0.5) + 0.5) * height;

                // Only show if the target is in front of the camera
                if (proj.z >= -1 && proj.z <= 1) {
                  activePromptsList.push({
                    npcName: (closestNpc as any).name,
                    x: screenX,
                    y: screenY,
                  });
                }
              }
            }
          }

          setNpcPrompts(activePromptsList);
        }
      }
      animId = requestAnimationFrame(updateFloatingPrompts);
    };

    animId = requestAnimationFrame(updateFloatingPrompts);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        if (engineRef.current) {
          const nextState = engineRef.current.toggleEditorMode();
          setIsEditorMode(nextState);
          showNotification(nextState ? 'Modo Editor ACTIVADO (F1)' : 'Modo Juego ACTIVADO');
        }
      } else if (e.code === 'Space') {
        e.preventDefault();
        engineRef.current?.playerAttack();
      } else if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        engineRef.current?.fireProjectile();
        showNotification('🔮 ¡Proyectil mágico lanzado! (Reciclado en Pool)');
      } else if (e.key === 'Shift') {
        e.preventDefault();
        engineRef.current?.playerDash();
      } else if (e.key.toLowerCase() === 'e') {
        e.preventDefault();
        if (engineRef.current) {
          const interacted = engineRef.current.interactWithNearbyNpc();
          if (!interacted) {
            showNotification('No hay ningún NPC interactuable enfrente.');
          }
        }
      } else if (e.key.toLowerCase() === 'q') {
        e.preventDefault();
        if (engineRef.current) {
          const success = engineRef.current.useHotbarItem(0);
          if (success) {
            syncFromEngine(engineRef.current);
            showNotification('🧪 ¡Poción de vida consumida (+40 HP)!');
          } else {
            showNotification('⚠️ Slot de hotbar vacío o sin pociones.');
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearInterval(interval);
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', handleKeyDown);
      unbindDamagedFlash();
      gameEngine.destroy();
      engineRef.current = null;
      setEngine(null);
    };
  }, []);

  const handleDirectionMove = (dir: Direction) => {
    if (engineRef.current && !isEditorMode) {
      engineRef.current.getInputManager().emitMoveIntent(dir, 'touch');
    }
  };

  const handleToggleEditor = () => {
    if (engineRef.current) {
      const nextState = engineRef.current.toggleEditorMode();
      setIsEditorMode(nextState);
      showNotification(nextState ? 'Modo Editor ACTIVADO' : 'Modo Juego ACTIVADO');
    }
  };

  const handleInteract = () => {
    if (engineRef.current) {
      const interacted = engineRef.current.interactWithNearbyNpc();
      if (!interacted) {
        showNotification('No hay ningún NPC interactuable enfrente.');
      }
    }
  };

  const handleUsePotion = (idx: number) => {
    if (engineRef.current) {
      const success = engineRef.current.useHotbarItem(idx);
      if (success) {
        syncFromEngine(engineRef.current);
        showNotification('🧪 ¡Usaste poción de vida (+40 HP)!');
      } else {
        showNotification('⚠️ Slot vacío o sin consumible.');
      }
    }
  };

  return (
    <div
      className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans text-slate-100 select-none"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      {/* 3D Game Viewport Canvas Container */}
      <div ref={canvasContainerRef} className="absolute inset-0 w-full h-full" />

      {/* --- RESPONSIVE TOP HUD HEADER BAR (TINY GUI PACK V2) --- */}
      <div
        className="absolute z-20 left-3 right-3 sm:left-4 sm:right-4 flex flex-nowrap items-center justify-between gap-2 pointer-events-none"
        style={{
          top: 'calc(env(safe-area-inset-top, 0px) + 12px)',
        }}
      >
        {/* TOP-LEFT: HERO HUD (Compact Pixel Card) */}
        <div
          onClick={() => setShowCharacterModal(true)}
          className="pointer-events-auto tg-card px-2.5 py-1.5 rounded-lg flex items-center gap-2.5 cursor-pointer hover:brightness-110 active:brightness-95 transition-all group shrink-0 select-none text-[#f4f4f8] max-w-[220px]"
        >
          {/* Authentic Pixel Art Hero Portrait & Badge */}
          <HeroPortrait
            size="md"
            currentHp={playerHp.current}
            maxHp={playerHp.max}
            level={5}
            isDamaged={isPlayerDamaged}
            equippedWeapon={equipped.weapon}
          />

          <div className="flex flex-col gap-0.5 min-w-0 pr-0.5">
            {/* Header / Name & Numeric HP */}
            <div className="flex items-center justify-between gap-1.5">
              <span className="font-pixel text-[8px] sm:text-[9px] text-[#f0b541] tracking-wider truncate">
                HÉROE
              </span>
              <span className="font-silkscreen text-[8px] text-red-400 font-bold shrink-0">
                {playerHp.current}/{playerHp.max}
              </span>
            </div>

            {/* Pixel Hearts Row from Tiny GUI Pack */}
            <div className="flex items-center gap-0.5">
              {[0, 1, 2, 3, 4].map((idx) => {
                const threshold = (idx + 1) * 20;
                const halfThreshold = idx * 20 + 10;
                const heartSrc =
                  playerHp.current >= threshold
                    ? '/tiny_gui/extracted/heart_full.png'
                    : playerHp.current >= halfThreshold
                    ? '/tiny_gui/extracted/heart_half.png'
                    : '/tiny_gui/extracted/heart_empty.png';
                return (
                  <img
                    key={idx}
                    src={heartSrc}
                    alt="Corazón"
                    className="w-3 h-3 sm:w-3.5 sm:h-3.5 image-pixelated"
                  />
                );
              })}

              {/* Mana drops */}
              <div className="flex items-center gap-0.5 ml-1 pl-1 border-l border-[#3b3a56]">
                {[0, 1, 2].map((idx) => (
                  <img
                    key={idx}
                    src="/tiny_gui/extracted/mana_full.png"
                    alt="Maná"
                    className="w-2.5 h-2.5 sm:w-3 sm:h-3 image-pixelated"
                  />
                ))}
              </div>
            </div>

            {/* Stat Badges */}
            <div className="flex items-center gap-2 pt-0.5 font-pixel text-[6px] text-slate-300">
              <span className="flex items-center gap-0.5 text-amber-300">
                <img src="/tiny_gui/extracted/icon_sword.png" alt="ATK" className="w-2 h-2 image-pixelated" />
                {playerStats.attack}
              </span>
              <span className="flex items-center gap-0.5 text-cyan-300">
                <img src="/tiny_gui/extracted/icon_shield.png" alt="DEF" className="w-2 h-2 image-pixelated" />
                {playerStats.defense}
              </span>
            </div>
          </div>
        </div>

        {/* TOP-RIGHT: HUD & ACTIONS */}
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2 flex-nowrap justify-end shrink-0 select-none">
          {/* Active Quest Card */}
          {activeQuest && (
            <div className="hidden sm:flex tg-card px-2.5 py-1 text-xs items-center gap-2 rounded-lg relative animate-in slide-in-from-right duration-200">
              <img src="/tiny_gui/extracted/icon_spellbook.png" alt="Quest" className="w-4 h-4 image-pixelated shrink-0" />
              <div className="flex flex-col">
                <span className="font-pixel text-[#f0b541] text-[8px] leading-tight truncate max-w-[120px]">
                  {activeQuest.title}
                </span>
                <span className="font-silkscreen text-[7px] text-slate-300 leading-none mt-0.5">
                  {activeQuest.status === 'completed'
                    ? '¡Completada!'
                    : `Slimes: ${activeQuest.objective.currentCount}/${activeQuest.objective.count}`}
                </span>
              </div>
            </div>
          )}

          {/* Gold Counter */}
          <div className="flex items-center gap-1 tg-card px-2 py-1 rounded-lg">
            <img src="/tiny_gui/extracted/icon_coin.png" alt="Oro" className="w-3.5 h-3.5 image-pixelated" />
            <span className="font-pixel text-[8px] text-amber-300">145</span>
          </div>

          {/* FPS & Performance Profile Toggle (Fluid 60FPS Low-End Optimization) */}
          <button
            onClick={() => {
              const pm = PerformanceManager.getInstance();
              const next: QualityLevel =
                pm.currentPreset === 'low'
                  ? 'medium'
                  : pm.currentPreset === 'medium'
                  ? 'high'
                  : 'low';
              pm.setPreset(next);
              setQualityPreset(next);
              const label =
                next === 'low'
                  ? '⚡ MODO FLUIDO 60 FPS (Bajo consumo / Gama baja)'
                  : next === 'medium'
                  ? '⚖️ MODO EQUILIBRADO'
                  : '✨ MODO HD-2D DIORAMA (Post-Processing)';
              setLastMessage(label);
            }}
            className={`h-8 sm:h-9 px-2 sm:px-2.5 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer border-none outline-none shadow-lg transition-all ${
              qualityPreset === 'low'
                ? 'tg-btn-green'
                : qualityPreset === 'medium'
                ? 'tg-btn-slate'
                : 'tg-btn-gold'
            }`}
            title="Alternar Modo de Rendimiento (Toca para 60 FPS fluidos en móviles)"
          >
            {qualityPreset === 'low' ? (
              <>
                <Zap className="w-3.5 h-3.5 text-emerald-300" />
                <span className="font-silkscreen text-[8px] font-bold text-emerald-100">60FPS</span>
              </>
            ) : qualityPreset === 'medium' ? (
              <>
                <Shield className="w-3.5 h-3.5 text-cyan-300" />
                <span className="font-silkscreen text-[8px] font-bold text-cyan-100">MED</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span className="font-silkscreen text-[8px] font-bold text-amber-100">HD-2D</span>
              </>
            )}
          </button>

          {/* Curved World (Animal Crossing / Rolling Log / Spherical Planetoid) Toggle */}
          <button
            onClick={() => {
              const cm = CurvedWorldManager.getInstance();
              const next: CurvedWorldMode =
                cm.mode === 'off'
                  ? 'horizon'
                  : cm.mode === 'horizon'
                  ? 'spherical'
                  : 'off';
              cm.setMode(next);
              setCurvedWorldMode(next);
              const label =
                next === 'horizon'
                  ? '🌍 MUNDO CURVO: Animal Crossing (Rolling Log)'
                  : next === 'spherical'
                  ? '🪐 MUNDO ESFÉRICO: Planetoide 360°'
                  : '🗺️ MUNDO PLANO: Clásico';
              setLastMessage(label);
            }}
            className={`h-8 sm:h-9 px-2 sm:px-2.5 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer border-none outline-none shadow-lg transition-all ${
              curvedWorldMode === 'horizon'
                ? 'tg-btn-gold border border-amber-300/40'
                : curvedWorldMode === 'spherical'
                ? 'tg-btn-blue border border-cyan-300/40'
                : 'tg-btn-slate opacity-75'
            }`}
            title="Alternar Efecto de Mundo Redondo / Curvatura (Estilo Animal Crossing / Mario Galaxy)"
          >
            <Globe className={`w-3.5 h-3.5 ${curvedWorldMode !== 'off' ? 'text-cyan-300 animate-spin-slow' : 'text-slate-300'}`} />
            <span className="font-silkscreen text-[8px] font-bold text-slate-100 hidden xs:inline">
              {curvedWorldMode === 'off' ? 'PLANO' : curvedWorldMode === 'horizon' ? 'CURVO' : 'ESFERA'}
            </span>
          </button>

          {/* Character / Bag Button */}
          <button
            onClick={() => setShowCharacterModal(true)}
            className="tg-btn-slate w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center cursor-pointer border-none outline-none shadow-lg hover:brightness-110 active:brightness-90"
            title="Personaje e Inventario"
          >
            <img src="/tiny_gui/extracted/icon_bag.png" alt="Bolsa" className="w-4 h-4 sm:w-5 sm:h-5 image-pixelated" />
          </button>

          {/* Map / Editor Button */}
          <button
            onClick={handleToggleEditor}
            className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center cursor-pointer border-none outline-none shadow-lg hover:brightness-110 active:brightness-90 ${
              isEditorMode ? 'tg-btn-green animate-pulse' : 'tg-btn-slate'
            }`}
            title="Modo Editor (F1)"
          >
            <PenTool className="w-3.5 h-3.5 text-amber-200" />
          </button>

          {/* Info Button */}
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="tg-btn-slate w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center cursor-pointer border-none outline-none shadow-lg hover:brightness-110 active:brightness-90"
            title="Ayuda / Controles"
          >
            <Info className="w-3.5 h-3.5 text-slate-200" />
          </button>
        </div>
      </div>

      {/* --- AI DIRECTOR RADAR WIDGET --- */}
      {directorStats && (
        <div
          className="absolute z-20 right-3 sm:right-4 pointer-events-auto tg-card p-2.5 rounded-lg w-44 text-slate-200 flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-4 duration-200"
          style={{
            top: 'calc(env(safe-area-inset-top, 0px) + 54px)',
          }}
        >
          <div className="flex items-center justify-between border-b border-[#2d2a44] pb-1">
            <span className="font-pixel text-[8px] text-[#f49c12] font-bold uppercase tracking-wide flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
              Director IA
            </span>
            <span className={`font-silkscreen text-[7px] font-bold ${
              directorStats.state === 'PEAK' ? 'text-red-400' : directorStats.state === 'BUILD_UP' ? 'text-amber-400' : 'text-emerald-400'
            }`}>
              {directorStats.state}
            </span>
          </div>

          {/* Stress Progress Bar */}
          <div className="space-y-0.5">
            <div className="flex justify-between text-[6.5px] font-silkscreen">
              <span className="text-slate-400">Estrés Jugador</span>
              <span className={`font-bold ${directorStats.stress > 70 ? 'text-red-400 animate-pulse' : directorStats.stress > 35 ? 'text-amber-300' : 'text-emerald-400'}`}>
                {directorStats.stress}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-[#12111d] rounded-full overflow-hidden border border-[#2d2a44]">
              <div
                className={`h-full transition-all duration-300 ${
                  directorStats.stress > 70 ? 'bg-red-500' : directorStats.stress > 35 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${directorStats.stress}%` }}
              />
            </div>
          </div>

          {/* Counter Badges */}
          <div className="grid grid-cols-2 gap-1 text-[6.5px] font-silkscreen bg-[#0f0e1a] p-1 rounded border border-[#26243a]">
            <div className="flex flex-col">
              <span className="text-slate-500 uppercase leading-none mb-0.5">Derrotados</span>
              <span className="text-white font-bold leading-none">{directorStats.totalDefeated}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-500 uppercase leading-none mb-0.5">Élites BT</span>
              <span className="text-amber-400 font-bold leading-none">{directorStats.elitesCount}</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[6px] font-silkscreen text-slate-400 pt-0.5">
            <span>Cambio fase:</span>
            <span className="text-white font-bold">{directorStats.timer}s</span>
          </div>
        </div>
      )}

      {/* --- TOP-CENTER AUTO-DISMISSING FLOATING EVENT TOAST (Non-Obtrusive) --- */}
      {toastMessage && (
        <div
          className="absolute left-1/2 -translate-x-1/2 z-35 pointer-events-none max-w-xs px-4 animate-in fade-in slide-in-from-top-1 duration-200"
          style={{
            top: 'calc(env(safe-area-inset-top, 0px) + 12px)',
          }}
        >
          <div className="tg-card px-2.5 py-1 rounded-full text-center pointer-events-auto border border-[#55527a]/60 bg-[#12111d]/95 shadow-md">
            <p className="font-silkscreen text-[7px] text-[#f0b541] flex items-center justify-center gap-1">
              <span className="w-1 h-1 rounded-full bg-amber-400 animate-pulse shrink-0" />
              <span className="text-center font-bold tracking-wide">{toastMessage}</span>
            </p>
          </div>
        </div>
      )}

      {/* Floating NPC Interactive Key Prompts ('Press E' / 'Tocar para hablar') */}
      {!dialogue && (
        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden w-full h-full">
          {npcPrompts.map((prompt, idx) => (
            <div
              key={idx}
              className="absolute -translate-x-1/2 -translate-y-full flex flex-col items-center gap-0.5 transition-all duration-75"
              style={{
                left: `${prompt.x}px`,
                top: `${prompt.y}px`,
              }}
            >
              {/* Compact Sleek Pixel prompt badge */}
              <div
                onClick={handleInteract}
                className="tg-card px-2 py-0.5 rounded-full flex items-center gap-1.5 shadow-xl animate-bounce pointer-events-auto cursor-pointer active:scale-95"
              >
                <img src="/tiny_gui/extracted/icon_chat.png" alt="Hablar" className="w-3.5 h-3.5 image-pixelated" />
                <span className="font-pixel text-[7px] text-[#f4f4f8] tracking-wider whitespace-nowrap">
                  {prompt.npcName}
                </span>
                <span className="font-pixel text-[6px] bg-[#f0b541] text-[#141320] px-1 rounded font-bold">
                  E
                </span>
              </div>
              {/* Tiny pointer arrow */}
              <div className="w-0 h-0 border-l-[3px] border-r-[3px] border-t-[3px] border-l-transparent border-r-transparent border-t-[#f0b541] -mt-0.5" />
            </div>
          ))}
        </div>
      )}

      {/* --- RAGNAROK ONLINE FLOATING DAMAGE TEXT SYSTEM --- */}
      <FloatingTextUI engine={engine} />

      {/* --- MINIMALIST MINIMAP --- */}
      <MinimapUI engine={engineRef.current} />

      {/* Dialogue Box Overlay */}
      {dialogue && (
        <DialogueBoxUI
          npcName={dialogue.npcName}
          lines={dialogue.lines}
          questId={dialogue.questId}
          onAcceptQuest={(qId) => {
            engineRef.current?.acceptQuest(qId);
            const q = engineRef.current?.questManager.getQuest(qId);
            if (q) setActiveQuest({ ...q });
            setLastMessage(`📜 Misión aceptada: ${q?.title}`);
          }}
          onClose={() => setDialogue(null)}
        />
      )}

      {/* Shop Modal Overlay */}
      {shopData && (
        <ShopModalUI
          isOpen={!!shopData}
          onClose={() => setShopData(null)}
          shopName={shopData.shopName}
          npcName={shopData.npcName}
          items={shopData.items}
          playerGold={gold}
          onBuyItem={(shopItem) => {
            if (engineRef.current) {
              const success = engineRef.current.inventorySystem.removeGold(shopItem.price);
              if (success) {
                engineRef.current.inventorySystem.addItem(shopItem.item);
                syncFromEngine(engineRef.current);
                showNotification(`¡Has comprado ${shopItem.name} por ${shopItem.price} Oro!`);
              } else {
                showNotification('¡No tienes suficiente oro!');
              }
            }
          }}
        />
      )}

      {/* Character Sheet & Inventory Modal (Mobile RPG Roster or Classic Sheet) */}
      {showCharacterModal && modalViewMode === 'mobile_roster' && (
        <MobileRosterInventoryModal
          isOpen={showCharacterModal}
          onClose={() => setShowCharacterModal(false)}
          onSwitchToClassic={() => setModalViewMode('classic')}
        />
      )}

      {showCharacterModal && modalViewMode === 'classic' && (
        <div className="relative">
          <CharacterModal
            isOpen={showCharacterModal}
            onClose={() => setShowCharacterModal(false)}
          />
          <button
            onClick={() => setModalViewMode('mobile_roster')}
            className="absolute top-3 right-16 z-50 bg-cyan-600 hover:bg-cyan-500 text-white font-pixel text-[7px] px-2.5 py-1 rounded shadow cursor-pointer"
          >
            📱 MÓVIL ROSTER VIEW
          </button>
        </div>
      )}

      {/* Info Modal */}
      {showInfo && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-40 flex items-center justify-center p-4 select-none">
          <div className="tg-box-popup max-w-md w-full p-4 shadow-2xl space-y-3 text-[#f4f4f8]">
            <div className="flex items-center justify-between border-b-2 border-[#3b3a56] pb-2">
              <h3 className="font-pixel text-[10px] text-[#f0b541] flex items-center gap-2">
                <span>📜</span> GUÍA DE CONTROLES & UI
              </h3>
              <button
                onClick={() => setShowInfo(false)}
                className="w-5 h-5 cursor-pointer border-none outline-none bg-transparent p-0 flex items-center justify-center"
              >
                <img src="/tiny_gui/extracted/btn_close_red.png" alt="Cerrar" className="w-5 h-5 image-pixelated" />
              </button>
            </div>
            <div className="font-silkscreen text-[10px] text-slate-200 space-y-2 leading-relaxed">
              <p className="flex items-start gap-2">
                <img src="/tiny_gui/extracted/btn_check_green.png" alt="OK" className="w-3.5 h-3.5 image-pixelated shrink-0 mt-0.5" />
                <span><strong>Nueva UI Tiny GUI Pack:</strong> Diseñada al 100% con los sprites, marcos de 32x32 y botones pixel-art del pack.</span>
              </p>
              <p className="flex items-start gap-2">
                <img src="/tiny_gui/extracted/btn_check_green.png" alt="OK" className="w-3.5 h-3.5 image-pixelated shrink-0 mt-0.5" />
                <span><strong>Controles Ergonómicos:</strong> Joystick virtual táctil y clúster de combate con botones de ataque, dash, magia y poción.</span>
              </p>
              <p className="flex items-start gap-2">
                <img src="/tiny_gui/extracted/btn_check_green.png" alt="OK" className="w-3.5 h-3.5 image-pixelated shrink-0 mt-0.5" />
                <span><strong>Efecto Mundo Curvo (Estilo Animal Crossing):</strong> Toca el botón de planeta en el HUD para curvar el horizonte o crear un mini-planetoide esférico en tiempo real con 0 costo de rendimiento.</span>
              </p>
              <p className="flex items-start gap-2">
                <img src="/tiny_gui/extracted/btn_check_green.png" alt="OK" className="w-3.5 h-3.5 image-pixelated shrink-0 mt-0.5" />
                <span><strong>Teclado PC:</strong> WASD o Flechas para mover, Espacio para Atacar, Shift para Dash, E para interactuar, Q para Poción, R para Magia.</span>
              </p>
            </div>
            <div className="pt-2 flex justify-end border-t border-[#3b3a56]/50">
              <button
                onClick={() => setShowInfo(false)}
                className="tg-btn-rect-gold font-pixel text-[8px] font-bold text-[#222] h-7 px-4 flex items-center justify-center cursor-pointer border-none outline-none hover:brightness-110 active:brightness-90"
              >
                ¡ENTENDIDO!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editor Toolbar */}
      {isEditorMode && (
        <div
          className="absolute left-4 right-4 md:left-6 md:right-6 z-20 pointer-events-auto flex justify-center"
          style={{
            top: 'calc(env(safe-area-inset-top, 0px) + 80px)',
          }}
        >
          <EditorToolbarUI
            engine={engineRef.current}
            isEditorMode={isEditorMode}
            onToggleEditor={handleToggleEditor}
            onNotify={(msg) => setLastMessage(msg)}
          />
        </div>
      )}

      {/* --- ERGONOMIC MOBILE ACTION RPG CONTROLS & HOTBAR (Notch Safe) --- */}
      <footer
        className="absolute left-2.5 right-2.5 sm:left-6 sm:right-6 pointer-events-none flex items-end justify-between gap-2 z-20"
        style={{
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
          left: 'calc(env(safe-area-inset-left, 0px) + 8px)',
          right: 'calc(env(safe-area-inset-right, 0px) + 8px)',
        }}
      >
        {!isEditorMode && (
          <div className="w-full pointer-events-auto">
            <VirtualJoystickUI
              onMoveIntent={handleDirectionMove}
              onAttack={() => engineRef.current?.playerAttack()}
              onDash={() => engineRef.current?.playerDash()}
              onInteract={handleInteract}
              onUsePotion={() => handleUsePotion(0)}
              onFireProjectile={() => {
                engineRef.current?.fireProjectile();
                setLastMessage('🔮 ¡Proyectil mágico lanzado! (Reciclado en Pool)');
              }}
            />
          </div>
        )}
      </footer>
    </div>
  );
}
