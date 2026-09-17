import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { globalEventBus } from '../core/EventBus';
import { GameEngine } from '../core/GameEngine';
import { FloatingTextStyle, WorldPos } from '../types';

export interface FloatingLabelData {
  id: string;
  text: string;
  style: FloatingTextStyle;
  isCrit: boolean;
  worldX: number;
  worldY: number;
  worldZ: number;
  createdAt: number;
  duration: number;
  driftX: number;
  burstScale: number;
  jumpHeight: number;
}

interface FloatingTextUIProps {
  engine?: GameEngine | null;
}

export const FloatingTextUI: React.FC<FloatingTextUIProps> = ({ engine: engineProp }) => {
  const [labels, setLabels] = useState<FloatingLabelData[]>([]);
  const labelsRef = useRef<FloatingLabelData[]>([]);
  const domMapRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const tempVec = useRef(new THREE.Vector3());

  // Helper to add a new floating damage label
  const spawnFloatingText = (
    text: string,
    worldPos: WorldPos,
    style: FloatingTextStyle = 'damage',
    isCrit: boolean = false
  ) => {
    const now = performance.now();
    const duration = isCrit ? 1150 : 950;
    // Ragnarok Online horizontal scatter jitter (-18px to +18px)
    const driftX = (Math.random() - 0.5) * 36;
    const burstScale = isCrit ? 1.75 : 1.4;
    const jumpHeight = isCrit ? 44 : 32;

    const newLabel: FloatingLabelData = {
      id: `ro_dmg_${now.toFixed(0)}_${Math.random().toString(36).substring(2, 7)}`,
      text,
      style,
      isCrit,
      worldX: worldPos.x,
      worldY: worldPos.y,
      worldZ: worldPos.z,
      createdAt: now,
      duration,
      driftX,
      burstScale,
      jumpHeight,
    };

    labelsRef.current.push(newLabel);
    setLabels([...labelsRef.current]);
  };

  // Subscribe to Combat Events
  useEffect(() => {
    // 1. Enemy Damaged event (Melee or Magic Projectile)
    const unbindEnemyDmg = globalEventBus.on('combat:enemy_damaged', (payload) => {
      const style: FloatingTextStyle = payload.isMagic ? 'magic' : (payload.isCritical ? 'crit' : 'damage');
      spawnFloatingText(`${payload.amount}`, payload.worldPos, style, !!payload.isCritical);
    });

    // 2. Player Damaged event
    const unbindPlayerDmg = globalEventBus.on('combat:player_damaged', (payload) => {
      if (payload.worldPos) {
        spawnFloatingText(`-${payload.amount}`, payload.worldPos, 'player_damage', false);
      }
    });

    // 3. Player Healed event
    const unbindPlayerHeal = globalEventBus.on('combat:player_healed', (payload) => {
      if (payload.worldPos) {
        spawnFloatingText(`+${payload.amount}`, payload.worldPos, 'heal', false);
      }
    });

    // 4. Generic floating text trigger
    const unbindCustomText = globalEventBus.on('combat:floating_text', (payload) => {
      spawnFloatingText(payload.text, payload.worldPos, payload.style || 'damage', !!payload.isCrit);
    });

    return () => {
      unbindEnemyDmg();
      unbindPlayerDmg();
      unbindPlayerHeal();
      unbindCustomText();
    };
  }, []);

  // Continuous high-performance requestAnimationFrame loop
  useEffect(() => {
    let animId: number;

    const tick = () => {
      const now = performance.now();
      const engine = engineProp || GameEngine.getInstance();
      const currentLabels = labelsRef.current;

      if (engine && currentLabels.length > 0) {
        const renderEngine = engine.getRenderEngine();
        const camera = renderEngine?.octopathCamera?.camera;
        const renderer = renderEngine?.renderer;

        if (camera && renderer) {
          const canvas = renderer.domElement;
          const width = canvas.clientWidth;
          const height = canvas.clientHeight;
          let hasExpired = false;

          for (let i = 0; i < currentLabels.length; i++) {
            const item = currentLabels[i];
            const age = now - item.createdAt;

            if (age >= item.duration) {
              hasExpired = true;
              continue;
            }

            const el = domMapRef.current.get(item.id);
            if (!el) continue;

            // Project 3D world coordinates to 2D screen coordinates
            tempVec.current.set(item.worldX, item.worldY, item.worldZ);
            tempVec.current.project(camera);

            // Hide if behind or outside the view frustum
            if (tempVec.current.z < -1 || tempVec.current.z > 1) {
              el.style.display = 'none';
              continue;
            }
            el.style.display = '';

            const screenX = (tempVec.current.x * 0.5 + 0.5) * width;
            const screenY = (-(tempVec.current.y * 0.5) + 0.5) * height;

            // --- RAGNAROK ONLINE DAMAGE PHYSICS ---
            // 1. Initial spring jump curve (0 to 220ms)
            const jumpP = Math.min(1, age / 220);
            const jumpY = -Math.sin(jumpP * (Math.PI / 2)) * item.jumpHeight;

            // 2. Gentle upward float after jump apex (220ms to end)
            const floatP = Math.max(0, (age - 220) / (item.duration - 220));
            const floatY = -floatP * 26;

            // 3. Horizontal scatter drift
            const driftP = Math.min(1, age / 240);
            const driftOffset = item.driftX * driftP;

            // 4. Elastic scale down from burst scale
            let scale = 1.0;
            if (age < 180) {
              scale = 1.0 + (item.burstScale - 1.0) * (1 - age / 180);
            } else if (item.isCrit) {
              scale = 1.18;
            }

            // 5. Fade out in final 35% of duration
            const fadeStart = item.duration * 0.65;
            let opacity = 1.0;
            if (age > fadeStart) {
              opacity = Math.max(0, 1 - (age - fadeStart) / (item.duration - fadeStart));
            }

            const finalX = screenX + driftOffset;
            const finalY = screenY + jumpY + floatY;

            // Apply direct GPU-accelerated CSS transform
            el.style.transform = `translate3d(${finalX.toFixed(1)}px, ${finalY.toFixed(1)}px, 0) translate(-50%, -50%) scale(${scale.toFixed(3)})`;
            el.style.opacity = opacity.toFixed(3);
          }

          if (hasExpired) {
            labelsRef.current = currentLabels.filter((it) => now - it.createdAt < it.duration);
            setLabels([...labelsRef.current]);
          }
        }
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(animId);
    };
  }, [engineProp]);

  return (
    <div
      id="floating-text-container"
      className="pointer-events-none fixed inset-0 z-30 overflow-hidden w-full h-full select-none"
    >
      {labels.map((label) => {
        let styleClass = 'ro-damage-normal text-xl sm:text-2xl';
        if (label.style === 'crit') {
          styleClass = 'ro-damage-crit text-2xl sm:text-3xl';
        } else if (label.style === 'magic') {
          styleClass = 'ro-damage-magic text-xl sm:text-2xl';
        } else if (label.style === 'player_damage') {
          styleClass = 'ro-damage-player text-lg sm:text-xl';
        } else if (label.style === 'heal') {
          styleClass = 'ro-damage-heal text-lg sm:text-xl';
        } else if (label.style === 'gold') {
          styleClass = 'font-pixel text-amber-300 font-bold text-lg sm:text-xl drop-shadow-[0_2px_4px_rgba(245,158,11,0.8)]';
        } else if (label.style === 'miss') {
          styleClass = 'ro-damage-miss text-sm sm:text-base';
        }

        return (
          <div
            key={label.id}
            id={label.id}
            ref={(el) => {
              if (el) {
                domMapRef.current.set(label.id, el);
              } else {
                domMapRef.current.delete(label.id);
              }
            }}
            className="absolute top-0 left-0 will-change-transform flex flex-col items-center justify-center ro-damage-text"
            style={{
              transform: 'translate3d(-9999px, -9999px, 0)',
              opacity: 0,
            }}
          >
            {label.isCrit && (
              <span className="font-pixel text-[7px] text-amber-300 bg-red-950/90 px-1 py-0.5 rounded border border-amber-400 mb-0.5 tracking-wider shadow-md animate-pulse">
                CRIT!
              </span>
            )}
            <span className={styleClass}>{label.text}</span>
          </div>
        );
      })}
    </div>
  );
};
