import React, { useState, useRef, useEffect } from 'react';
import { Direction } from '../types';
import { globalEventBus } from '../core/EventBus';

interface VirtualJoystickProps {
  onMoveIntent?: (dir: Direction) => void;
  onAttack?: () => void;
  onDash?: () => void;
  onInteract?: () => void;
  onUsePotion?: () => void;
  onFireProjectile?: () => void;
}

export const VirtualJoystickUI: React.FC<VirtualJoystickProps> = ({
  onMoveIntent,
  onAttack,
  onDash,
  onInteract,
  onUsePotion,
  onFireProjectile,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeDir, setActiveDir] = useState<Direction | null>(null);
  const [knobPos, setKnobPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isTouching, setIsTouching] = useState<boolean>(false);

  const radius = 50; // Joystick outer radius
  const moveIntervalRef = useRef<number | null>(null);
  const activeDirRef = useRef<Direction | null>(null);
  const secondaryDirRef = useRef<Direction | undefined>(undefined);

  const emitMovement = () => {
    const dir = activeDirRef.current;
    if (!dir) return;
    const secDir = secondaryDirRef.current;
    if (onMoveIntent) {
      onMoveIntent(dir);
    } else {
      globalEventBus.emit('input:move_intent', {
        direction: dir,
        secondaryDirection: secDir,
        source: 'touch',
      });
    }
  };

  const startMovementLoop = () => {
    if (moveIntervalRef.current === null) {
      emitMovement();
      moveIntervalRef.current = window.setInterval(() => {
        emitMovement();
      }, 125);
    }
  };

  const stopMovementLoop = () => {
    if (moveIntervalRef.current !== null) {
      clearInterval(moveIntervalRef.current);
      moveIntervalRef.current = null;
    }
    activeDirRef.current = null;
    secondaryDirRef.current = undefined;
  };

  useEffect(() => {
    return () => {
      stopMovementLoop();
    };
  }, []);

  const processPointer = (clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const clampedDist = Math.min(dist, radius);
    const angle = Math.atan2(dy, dx);
    const knobX = Math.cos(angle) * clampedDist;
    const knobY = Math.sin(angle) * clampedDist;

    setKnobPos({ x: knobX, y: knobY });

    if (dist > 10) {
      const deg = (angle * 180) / Math.PI;
      let primaryDir: Direction = 'DOWN';
      let secondaryDir: Direction | undefined = undefined;

      if (deg >= -22.5 && deg < 22.5) {
        primaryDir = 'RIGHT';
      } else if (deg >= 22.5 && deg < 67.5) {
        primaryDir = 'RIGHT';
        secondaryDir = 'DOWN';
      } else if (deg >= 67.5 && deg < 112.5) {
        primaryDir = 'DOWN';
      } else if (deg >= 112.5 && deg < 157.5) {
        primaryDir = 'DOWN';
        secondaryDir = 'LEFT';
      } else if (deg >= -67.5 && deg < -22.5) {
        primaryDir = 'RIGHT';
        secondaryDir = 'UP';
      } else if (deg >= -112.5 && deg < -67.5) {
        primaryDir = 'UP';
      } else if (deg >= -157.5 && deg < -112.5) {
        primaryDir = 'UP';
        secondaryDir = 'LEFT';
      } else {
        primaryDir = 'LEFT';
      }

      activeDirRef.current = primaryDir;
      secondaryDirRef.current = secondaryDir;
      setActiveDir(primaryDir);
      startMovementLoop();
    } else {
      stopMovementLoop();
      setActiveDir(null);
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsTouching(true);
    processPointer(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isTouching) return;
    processPointer(e.clientX, e.clientY);
  };

  const handlePointerUp = () => {
    setIsTouching(false);
    setKnobPos({ x: 0, y: 0 });
    setActiveDir(null);
    stopMovementLoop();
  };

  return (
    <div className="w-full flex items-end justify-between select-none pointer-events-none pb-4 px-4">
      {/* Left Thumb: Virtual Joystick (Compact & Semi-transparent) */}
      <div className="pointer-events-auto pl-1 pb-1">
        <div
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="relative w-28 h-28 sm:w-34 sm:h-34 rounded-full bg-[#141320]/40 backdrop-blur-[2px] border-2 border-[#474a68]/50 shadow-xl touch-none flex items-center justify-center cursor-pointer select-none"
        >
          {/* Elegant Directional Triangle Notches (Instead of keyboard WASD) */}
          <span className={`absolute top-1 text-[7px] transition-colors ${activeDir === 'UP' ? 'text-[#f0b541] scale-110' : 'text-[#474a68]/45'}`}>▲</span>
          <span className={`absolute bottom-1 text-[7px] transition-colors ${activeDir === 'DOWN' ? 'text-[#f0b541] scale-110' : 'text-[#474a68]/45'}`}>▼</span>
          <span className={`absolute left-1.5 text-[7px] transition-colors ${activeDir === 'LEFT' ? 'text-[#f0b541] scale-110' : 'text-[#474a68]/45'}`}>◀</span>
          <span className={`absolute right-1.5 text-[7px] transition-colors ${activeDir === 'RIGHT' ? 'text-[#f0b541] scale-110' : 'text-[#474a68]/45'}`}>▶</span>

          {/* Center Guide */}
          <div className="w-9 h-9 sm:w-11 sm:h-11 border border-[#474a68]/40 rounded-full pointer-events-none" />

          {/* Movable Knob */}
          <div
            style={{
              transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
            }}
            className={`absolute w-11 h-11 sm:w-13 sm:h-13 rounded-full border-2 transition-transform duration-75 ease-out shadow-lg pointer-events-none flex items-center justify-center ${
              isTouching
                ? 'bg-[#f0b541]/40 border-[#f0b541] scale-105 shadow-[#f0b541]/30'
                : 'bg-[#2a293e]/85 border-[#63688e]'
            }`}
          >
            <div className="w-4 h-4 rounded-full bg-[#dfdfe8]/80 shadow-inner" />
          </div>
        </div>
      </div>

      {/* Right Thumb: Fluid Ergonomic Combat Cluster (No Blocking Card Background) */}
      <div className="pointer-events-none relative w-48 h-48 sm:w-56 sm:h-56 select-none pr-1 pb-1">
        {/* Primary Main Attack Button (Bottom-Right: Massive scale for thumb comfort) */}
        <button
          onClick={onAttack}
          className="pointer-events-auto absolute bottom-2 right-2 w-17 h-17 sm:w-19 sm:h-19 tg-btn-gold active:scale-90 shadow-2xl flex flex-col items-center justify-center transition-transform hover:brightness-110 active:brightness-90 cursor-pointer border-none outline-none z-10"
          title="Atacar (Espacio)"
          style={{ touchAction: 'manipulation' }}
        >
          <img
            src="/tiny_gui/extracted/icon_sword.png"
            alt="Atacar"
            className="w-8 h-8 sm:w-9 sm:h-9 image-pixelated drop-shadow"
          />
          <span className="font-pixel text-[8px] text-[#222] font-black -mt-0.5">ATK</span>
        </button>

        {/* Dash Button (Ergonomic Arc: Left of ATK) */}
        <button
          onClick={onDash}
          className="pointer-events-auto absolute bottom-1.5 right-23 sm:right-26 w-11 h-11 sm:w-12 sm:h-12 tg-btn-slate active:scale-90 shadow-lg flex flex-col items-center justify-center transition-transform hover:brightness-110 active:brightness-90 cursor-pointer border-none outline-none"
          title="Dash (Shift)"
          style={{ touchAction: 'manipulation' }}
        >
          <img
            src="/tiny_gui/extracted/icon_boots.png"
            alt="Dash"
            className="w-5 h-5 image-pixelated"
          />
          <span className="font-pixel text-[5px] text-amber-200 leading-none">DASH</span>
        </button>

        {/* Magic / Ranged Projectile Button (Ergonomic Arc: Upper-Left diagonal of ATK) */}
        <button
          onClick={onFireProjectile}
          className="pointer-events-auto absolute bottom-17 right-17 sm:bottom-19 sm:right-19 w-11 h-11 sm:w-12 sm:h-12 tg-btn-slate active:scale-90 shadow-lg flex flex-col items-center justify-center transition-transform hover:brightness-110 active:brightness-90 cursor-pointer border-none outline-none"
          title="Magia / Proyectil (R)"
          style={{ touchAction: 'manipulation' }}
        >
          <img
            src="/tiny_gui/extracted/icon_spellbook.png"
            alt="Magia"
            className="w-5 h-5 image-pixelated"
          />
          <span className="font-pixel text-[5px] text-cyan-300 leading-none">MAGIA</span>
        </button>

        {/* Potion Button (Circular, Smaller, Safe distance to prevent accidental activation) */}
        <button
          onClick={onUsePotion}
          className="pointer-events-auto absolute bottom-23 right-28 sm:bottom-26 sm:right-32 w-9 h-9 sm:w-10 sm:h-10 bg-red-950/70 hover:bg-red-900 border-2 border-red-500 rounded-full active:scale-90 shadow-lg flex flex-col items-center justify-center transition-transform hover:brightness-110 active:brightness-90 cursor-pointer outline-none"
          title="Poción de Salud (Q)"
          style={{ touchAction: 'manipulation' }}
        >
          <img
            src="/tiny_gui/extracted/icon_potion_hp.png"
            alt="Poción"
            className="w-4.5 h-4.5 image-pixelated"
          />
          <span className="font-pixel text-[4.5px] text-red-300 font-bold leading-none">HP</span>
        </button>

        {/* Interact / Talk Button (Above attack, clear of action sweep) */}
        <button
          onClick={onInteract}
          className="pointer-events-auto absolute bottom-28 right-2 sm:bottom-31 sm:right-2 w-10 h-10 sm:w-11 sm:h-11 tg-btn-gold active:scale-90 shadow-lg flex flex-col items-center justify-center transition-transform hover:brightness-110 active:brightness-90 cursor-pointer border-none outline-none"
          title="Hablar / Interactuar (E)"
          style={{ touchAction: 'manipulation' }}
        >
          <img
            src="/tiny_gui/extracted/icon_chat.png"
            alt="Hablar"
            className="w-4.5 h-4.5 image-pixelated"
          />
          <span className="font-pixel text-[5px] text-[#222] font-black leading-none">HABLAR</span>
        </button>
      </div>
    </div>
  );
};
