import React, { useEffect, useRef } from 'react';
import { RARITY_CONFIG } from '../data/LootTables';
import { ROSTER_HEROES } from './HeroFullBodyCanvas';

interface HeroPortraitProps {
  size?: 'sm' | 'md' | 'lg';
  currentHp?: number;
  maxHp?: number;
  level?: number;
  isDamaged?: boolean;
  className?: string;
  onClick?: () => void;
  equippedWeapon?: any;
  hero?: any;
}

export const HeroPortrait: React.FC<HeroPortraitProps> = ({
  size = 'md',
  currentHp = 100,
  maxHp = 100,
  level = 5,
  isDamaged = false,
  className = '',
  onClick,
  equippedWeapon,
  hero,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const activeHero = hero || ROSTER_HEROES[0];

  const hpPercent = maxHp > 0 ? Math.max(0, Math.min(1, currentHp / maxHp)) : 1;
  const isLowHp = hpPercent <= 0.3;

  const weaponRarity = equippedWeapon?.rarity || 'common';
  const weaponCfg = RARITY_CONFIG[weaponRarity as keyof typeof RARITY_CONFIG] || RARITY_CONFIG.common;

  const sizeStyles = {
    sm: {
      container: 'w-9 h-9 min-w-[36px] min-h-[36px]',
      badge: 'text-[6px] px-0.5 -bottom-1 -right-1',
      canvasSize: 48,
    },
    md: {
      container: 'w-11 h-11 sm:w-12 sm:h-12 min-w-[44px] min-h-[44px]',
      badge: 'text-[7px] px-1 -bottom-1 -right-1',
      canvasSize: 64,
    },
    lg: {
      container: 'w-16 h-16 sm:w-20 sm:h-20 min-w-[64px] min-h-[64px]',
      badge: 'text-[9px] px-1.5 -bottom-1.5 -right-1.5',
      canvasSize: 96,
    },
  }[size];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;
    let animationFrameId: number;
    let time = 0;

    // Load assets
    const bodyImg = new Image();
    const headImg = new Image();

    let loadedCount = 0;
    const onLoaded = () => {
      loadedCount++;
    };

    bodyImg.onload = onLoaded;
    headImg.onload = onLoaded;

    bodyImg.src = activeHero.bodySpritesheetUrl;
    headImg.src = '/spritesheets/base_head_spritesheet.png';

    const render = () => {
      if (!running) return;

      time += 0.05;
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);
      ctx.imageSmoothingEnabled = false;

      // 1. Draw RPG Portrait Backdrop (Diorama Studio Gradient)
      const bgGradient = ctx.createRadialGradient(w * 0.5, h * 0.4, 2, w * 0.5, h * 0.5, w * 0.7);
      if (isLowHp) {
        bgGradient.addColorStop(0, '#5a1e28');
        bgGradient.addColorStop(1, '#1e0c12');
      } else {
        bgGradient.addColorStop(0, '#1c1b35');
        bgGradient.addColorStop(0.7, '#0f0e1d');
        bgGradient.addColorStop(1, '#080710');
      }
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, w, h);

      // Radial glowing ring
      ctx.fillStyle = isLowHp ? 'rgba(239, 68, 68, 0.2)' : 'rgba(240, 181, 65, 0.15)';
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.45, w * 0.38, 0, Math.PI * 2);
      ctx.fill();

      // Ensure sprites are fully loaded
      if (loadedCount >= 2 && bodyImg.naturalWidth > 0 && headImg.naturalWidth > 0) {
        // Idle bobbing / breathing animation
        const idleBob = Math.sin(time * 2.5) * (h * 0.02);

        // Calculate dynamic head and body offsets based on equipped gear attributes
        // More powerful / rare equipment results in a firmer, prouder posture (adjust offsets)
        let proudPostureOffset = 0;
        if (equippedWeapon) {
          if (equippedWeapon.rarity === 'legendary') proudPostureOffset = -h * 0.03;
          else if (equippedWeapon.rarity === 'epic') proudPostureOffset = -h * 0.02;
          else if (equippedWeapon.rarity === 'rare') proudPostureOffset = -h * 0.01;
        }

        const bodyX = w * 0.5;
        const bodyY = h * 0.95 + idleBob + proudPostureOffset;

        // Draw Player Spritesheet Body
        const colIndex = Math.floor((time * 2) % 2); // alternating between frames 0 and 1
        const frameW = bodyImg.naturalWidth / 4;
        const frameH = bodyImg.naturalHeight / 4;

        // Scale up to crop beautifully as a portrait bust
        const targetW = w * 1.8;
        const targetH = targetW * (frameH / frameW);

        ctx.save();
        ctx.translate(bodyX, bodyY);

        // Body bust drawing
        ctx.drawImage(
          bodyImg,
          colIndex * frameW,
          0,
          frameW,
          frameH * 0.55, // crop upper half only
          -targetW * 0.5,
          -targetH * 0.4,
          targetW,
          targetH * 0.55
        );

        // Draw Player Spritesheet Head with dynamic neck/head anchor offset
        const headFrameW = headImg.naturalWidth / 4;
        const headFrameH = headImg.naturalHeight / 4;
        const headTargetW = targetW * 0.65;
        const headTargetH = headTargetW * (headFrameH / headFrameW);

        // Dynamic headOffset constant calculates vertical position relative to body based on animation frame & equipment
        const frameOffset = colIndex === 1 ? -1.5 : 0; // slight inhale neck elevation
        let equipPostureBonus = 0;
        if (equippedWeapon) {
          const rarity = equippedWeapon.rarity;
          if (rarity === 'legendary') equipPostureBonus = -3;
          else if (rarity === 'epic') equipPostureBonus = -2;
          else if (rarity === 'rare') equipPostureBonus = -1;
        }
        const baseAnatomicalRatio = -0.28;
        const headOffset = targetH * baseAnatomicalRatio + frameOffset + equipPostureBonus;

        ctx.drawImage(
          headImg,
          colIndex * headFrameW,
          0,
          headFrameW,
          headFrameH,
          -headTargetW * 0.5,
          headOffset,
          headTargetW,
          headTargetH
        );

        ctx.restore();
      } else {
        // Fallback simple geometric representation during load
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(w * 0.5, h * 0.4, w * 0.22, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#4a5568';
        ctx.beginPath();
        ctx.ellipse(w * 0.5, h * 0.85, w * 0.4, h * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // 4. Hit Flash Overlay if Damaged
      if (isDamaged) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.45)';
        ctx.fillRect(0, 0, w, h);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      running = false;
      cancelAnimationFrame(animationFrameId);
    };
  }, [currentHp, maxHp, isDamaged, isLowHp, activeHero, equippedWeapon]);

  return (
    <div
      onClick={onClick}
      className={`relative ${sizeStyles.container} tg-slot flex items-center justify-center shrink-0 cursor-pointer overflow-visible group select-none ${className}`}
      title="Retrato del Héroe (Click para ver perfil)"
    >
      {/* Pixel Art Rendered Canvas */}
      <canvas
        ref={canvasRef}
        width={sizeStyles.canvasSize}
        height={sizeStyles.canvasSize}
        className="w-full h-full object-cover rounded-sm image-pixelated transition-transform group-hover:scale-105"
      />

      {/* Low HP Critical Pulse Vignette */}
      {isLowHp && (
        <div className="absolute inset-0 rounded-sm border-2 border-red-500/80 animate-ping pointer-events-none" />
      )}

      {/* Decorative Ornate Bevel Overlay */}
      <div className="absolute inset-0 rounded-sm pointer-events-none border border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)]" />

      {/* Equipped Weapon Icon Badge */}
      <div
        className="absolute -top-1.5 -left-1.5 w-5 h-5 sm:w-6 sm:h-6 rounded bg-[#141320] flex items-center justify-center shadow-md border z-10"
        style={{ borderColor: weaponCfg.borderColor }}
        title={equippedWeapon ? `Arma equipada: ${equippedWeapon.name}` : 'Sin arma equipada'}
      >
        <img
          src="/tiny_gui/extracted/icon_sword.png"
          alt="Arma"
          className="w-3.5 h-3.5 sm:w-4 sm:h-4 image-pixelated"
        />
      </div>

      {/* Level Badge */}
      <span
        className={`absolute font-pixel font-bold bg-[#141320] text-[#f0b541] rounded border border-[#55527a] shadow-md transition-colors ${sizeStyles.badge} group-hover:border-[#f0b541]`}
      >
        LV.{level}
      </span>
    </div>
  );
};
