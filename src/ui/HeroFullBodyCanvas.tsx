import React, { useEffect, useRef, useState } from 'react';
import { Item, EquipmentSlot } from '../types';

export interface RosterHeroData {
  id: string;
  unitNo: number;
  name: string;
  title: string;
  element: 'water' | 'fire' | 'thunder' | 'earth' | 'light' | 'dark';
  elementIcon: string;
  stars: number;
  cost: number;
  heroType: 'Oracle' | 'Lord' | 'Breaker' | 'Anima' | 'Guardian';
  typeColor: string;
  leaderSkill: {
    name: string;
    description: string;
  };
  braveBurst: {
    name: string;
    level: number;
    description: string;
  };
  bodySpritesheetUrl: string;
  weaponType: 'sword' | 'bow' | 'staff' | 'daggers';
  weaponColor: string;
  lore: string;
}

export const ROSTER_HEROES: RosterHeroData[] = [
  {
    id: 'sergio',
    unitNo: 125,
    name: 'Knight Sergio',
    title: 'Paladín de la Vanguardia Cristalina',
    element: 'water',
    elementIcon: '💧',
    stars: 5,
    cost: 15,
    heroType: 'Oracle',
    typeColor: '#f59e0b',
    leaderSkill: {
      name: 'Valiant Power',
      description: '15% de aumento al Poder de Ataque y +10% de probabilidad de crítico a todo el grupo.',
    },
    braveBurst: {
      name: 'Frigid Combo',
      level: 1,
      description: 'Combo de 5 impactos de elemento Agua sobre el enemigo, con alta probabilidad de debilitar su defensa.',
    },
    bodySpritesheetUrl: '/spritesheets/frame_000.webp',
    weaponType: 'sword',
    weaponColor: '#38bdf8',
    lore: 'Un leal caballero templario que empuña la mítica Hoja del Glaciar, canalizando la pureza del maná elemental para proteger a los indefensos.',
  },
  {
    id: 'lyra',
    unitNo: 126,
    name: 'Ranger Lyra',
    title: 'Cazadora de los Bosques Esmeralda',
    element: 'earth',
    elementIcon: '🌿',
    stars: 4,
    cost: 12,
    heroType: 'Breaker',
    typeColor: '#ef4444',
    leaderSkill: {
      name: 'Forest Swiftness',
      description: '+20% de velocidad de movimiento y +15% de daño con ataques a distancia.',
    },
    braveBurst: {
      name: 'Arrow Rainstorm',
      level: 2,
      description: 'Dispara una lluvia de flechas envenenadas que perforan armaduras y aplican daño continuo.',
    },
    bodySpritesheetUrl: '/spritesheets/frame_001.webp',
    weaponType: 'bow',
    weaponColor: '#22c55e',
    lore: 'Maestra arquera de las tierras salvajes, capaz de acertar al corazón de una bestia a cientos de metros en plena ventisca.',
  },
  {
    id: 'ignis',
    unitNo: 127,
    name: 'Archmage Ignis',
    title: 'Evocador de la Llama Primordial',
    element: 'fire',
    elementIcon: '🔥',
    stars: 5,
    cost: 18,
    heroType: 'Lord',
    typeColor: '#3b82f6',
    leaderSkill: {
      name: 'Pyre Dominion',
      description: '+25% de daño de fuego y regeneración de maná por cada enemigo derrotado.',
    },
    braveBurst: {
      name: 'Inferno Nova',
      level: 3,
      description: 'Desata un pilar de fuego volcánico que incinera el campo de batalla infligiendo quemaduras graves.',
    },
    bodySpritesheetUrl: '/spritesheets/frame_000.webp',
    weaponType: 'staff',
    weaponColor: '#f97316',
    lore: 'Un erudito de la academia arcana que aprendió los secretos prohibidos del fuego cósmico para erradicar las sombras.',
  },
  {
    id: 'kael',
    unitNo: 128,
    name: 'Shadowblade Kael',
    title: 'Segador del Eclipse Sombrío',
    element: 'dark',
    elementIcon: '🌑',
    stars: 5,
    cost: 16,
    heroType: 'Anima',
    typeColor: '#a855f7',
    leaderSkill: {
      name: 'Vampiric Shadow',
      description: '+8% de robo de vida pasivo y +30% de daño de golpe crítico en emboscadas.',
    },
    braveBurst: {
      name: 'Eclipse Execution',
      level: 2,
      description: 'Se desliza a través de las sombras ejecutando un tajo mortal que anula la armadura del objetivo.',
    },
    bodySpritesheetUrl: '/spritesheets/frame_000.webp',
    weaponType: 'daggers',
    weaponColor: '#c084fc',
    lore: 'Nacido en las catacumbas olvidadas, Kael manipula las sombras para desvanecerse ante sus enemigos y asestar golpes letales.',
  },
];

/**
 * Standardized utility component for rendering perfectly aligned hero portraits with precise offset calculations.
 */
interface HeroPortraitCanvasProps {
  hero: RosterHeroData;
  size?: number;
  className?: string;
}

export const HeroPortraitCanvas: React.FC<HeroPortraitCanvasProps> = ({ hero, size = 64, className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const bodyImg = new Image();
    const headImg = new Image();

    let loadedCount = 0;
    const onLoaded = () => {
      loadedCount++;
      if (loadedCount === 2) {
        // Draw head/bust portrait with calculated offset
        const frameW = bodyImg.naturalWidth / 4;
        const frameH = bodyImg.naturalHeight / 4;
        const headW = headImg.naturalWidth / 4;
        const headH = headImg.naturalHeight / 4;

        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height * 0.7);

        // Body bust slice
        ctx.drawImage(bodyImg, 0, 0, frameW, frameH * 0.6, -size * 0.4, -size * 0.3, size * 0.8, size * 0.7);

        // Dynamic headOffset constant calculates vertical position relative to body based on frame & equipment
        const frameOffset = 0; // Static preview utilizes default frame
        const baseAnatomicalRatio = -0.65;
        const headOffset = size * baseAnatomicalRatio + frameOffset;

        // Head aligned precisely on neck anchor
        ctx.drawImage(headImg, 0, 0, headW, headH, -size * 0.35, headOffset, size * 0.7, size * 0.7);

        ctx.restore();
      }
    };

    bodyImg.src = hero.bodySpritesheetUrl;
    bodyImg.onload = onLoaded;
    headImg.src = '/spritesheets/base_head_spritesheet.png';
    headImg.onload = onLoaded;
  }, [hero, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={`image-pixelated rounded-full border border-amber-400/50 bg-[#12111f] ${className}`}
    />
  );
};


interface HeroFullBodyCanvasProps {
  hero: RosterHeroData;
  equippedWeapon?: Item | null;
  equippedArmor?: Item | null;
  isInspecting?: boolean;
  onHeroTap?: () => void;
  className?: string;
}

export const HeroFullBodyCanvas: React.FC<HeroFullBodyCanvasProps> = ({
  hero,
  equippedWeapon,
  equippedArmor,
  isInspecting = false,
  onHeroTap,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isAttacking, setIsAttacking] = useState(false);
  const [clickBurstEffect, setClickBurstEffect] = useState<{ x: number; y: number } | null>(null);

  const animFrameRef = useRef<number>(0);
  const timeRef = useRef<number>(0);

  const bodyImgRef = useRef<HTMLImageElement | null>(null);
  const headImgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const bodyImg = new Image();
    bodyImg.src = hero.bodySpritesheetUrl;
    bodyImg.onload = () => {
      bodyImgRef.current = bodyImg;
    };

    const headImg = new Image();
    headImg.src = '/spritesheets/base_head_spritesheet.png';
    headImg.onload = () => {
      headImgRef.current = headImg;
    };

    return () => {
      bodyImgRef.current = null;
      headImgRef.current = null;
    };
  }, [hero.bodySpritesheetUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      alpha: number;
      maxLife: number;
      life: number;
      color: string;
    }> = [];

    const elementColorMap = {
      water: ['#38bdf8', '#0284c7', '#93c5fd', '#e0f2fe'],
      fire: ['#f97316', '#ef4444', '#facc15', '#fef08a'],
      thunder: ['#facc15', '#eab308', '#fef08a', '#ffffff'],
      earth: ['#22c55e', '#16a34a', '#86efac', '#dcfce7'],
      light: ['#fef08a', '#fde047', '#ffffff', '#fed7aa'],
      dark: ['#a855f7', '#7e22ce', '#c084fc', '#f3e8ff'],
    };

    const colors = elementColorMap[hero.element] || elementColorMap.water;

    const render = () => {
      if (!running) return;

      timeRef.current += 0.03;
      const t = timeRef.current;

      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);
      ctx.imageSmoothingEnabled = false;

      // Pedestal & Ground Glow
      const pedestalX = w * 0.5;
      const pedestalY = h * 0.82;
      const pedestalRadiusX = w * 0.38;
      const pedestalRadiusY = h * 0.12;

      const groundGlow = ctx.createRadialGradient(
        pedestalX,
        pedestalY,
        5,
        pedestalX,
        pedestalY,
        pedestalRadiusX * 1.3
      );
      groundGlow.addColorStop(0, `${colors[0]}55`);
      groundGlow.addColorStop(0.6, `${colors[1]}22`);
      groundGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = groundGlow;
      ctx.beginPath();
      ctx.ellipse(pedestalX, pedestalY, pedestalRadiusX * 1.4, pedestalRadiusY * 1.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Rotating Magic Circle
      ctx.save();
      ctx.translate(pedestalX, pedestalY);
      ctx.scale(1, pedestalRadiusY / pedestalRadiusX);

      ctx.rotate(t * 0.4);
      ctx.strokeStyle = colors[0];
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, pedestalRadiusX, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();

      // Ambient Particles
      if (particles.length < 30 && Math.random() < 0.5) {
        particles.push({
          x: pedestalX + (Math.random() - 0.5) * pedestalRadiusX * 1.5,
          y: pedestalY + (Math.random() - 0.5) * 10,
          vx: (Math.random() - 0.5) * 0.6,
          vy: -1.0 - Math.random() * 1.5,
          size: 2 + Math.random() * 2.5,
          alpha: 0.8,
          maxLife: 60 + Math.random() * 30,
          life: 0,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        const progress = p.life / p.maxLife;

        if (progress >= 1 || p.y < h * 0.1) {
          particles.splice(i, 1);
          continue;
        }

        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, (1 - progress) * p.alpha);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;

      // Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.beginPath();
      ctx.ellipse(pedestalX, pedestalY, w * 0.2, h * 0.035, 0, 0, Math.PI * 2);
      ctx.fill();

      // Idle Breathing
      const idleBob = Math.sin(t * 2.5) * 3;
      const heroCenterX = w * 0.5;
      const heroCenterY = h * 0.56 + idleBob;

      ctx.save();
      ctx.translate(heroCenterX, heroCenterY);

      const bodyImg = bodyImgRef.current;
      const headImg = headImgRef.current;

      if (bodyImg && bodyImg.complete && bodyImg.naturalWidth > 0) {
        const colIndex = isAttacking ? 2 : Math.floor((t * 2) % 2);
        const rowIndex = 0;

        const frameW = bodyImg.naturalWidth / 4;
        const frameH = bodyImg.naturalHeight / 4;

        const targetW = w * 0.68;
        const targetH = targetW * (frameH / frameW);

        // Draw Body
        ctx.drawImage(
          bodyImg,
          colIndex * frameW,
          rowIndex * frameH,
          frameW,
          frameH,
          -targetW * 0.5,
          -targetH * 0.5,
          targetW,
          targetH
        );

        // Draw Head (Pixel-perfect anatomical anchor on neck/shoulders)
        if (headImg && headImg.complete && headImg.naturalWidth > 0) {
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
          const baseAnatomicalRatio = -0.29;
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
        }
      } else {
        drawIllustratedFullBodyHero(ctx, hero, t);
      }

      // Weapon
      drawEquippedWeaponVisuals(ctx, hero, equippedWeapon, t, isAttacking);

      ctx.restore();

      // Click Slash Effect
      if (clickBurstEffect) {
        ctx.strokeStyle = hero.weaponColor;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(clickBurstEffect.x, clickBurstEffect.y, 40, -Math.PI * 0.75, Math.PI * 0.25);
        ctx.stroke();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      running = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [hero, equippedWeapon, isAttacking, clickBurstEffect]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    setIsAttacking(true);
    setClickBurstEffect({ x: clickX, y: clickY });

    setTimeout(() => setClickBurstEffect(null), 250);
    setTimeout(() => setIsAttacking(false), 450);

    onHeroTap?.();
  };

  return (
    <div className={`relative w-full h-full flex items-center justify-center select-none overflow-hidden ${className}`}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(20,18,50,0.8)_0%,rgba(5,5,10,0.98)_90%)] pointer-events-none" />
      <canvas
        ref={canvasRef}
        width={340}
        height={420}
        onClick={handleCanvasClick}
        className="relative z-10 w-full h-full object-contain cursor-pointer active:scale-95 transition-transform"
        title="Toca al Héroe"
      />
      <div className="absolute bottom-1 right-2 z-20 pointer-events-none bg-black/70 border border-white/20 rounded-full px-2 py-0.5 flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
        <span className="font-silkscreen text-[6px] text-slate-300">TOCAR</span>
      </div>
      <div className="absolute top-1 right-2 z-20 pointer-events-none flex items-center gap-0.5 bg-black/60 border border-amber-500/30 px-1.5 py-0.5 rounded-full">
        {Array.from({ length: hero.stars }).map((_, i) => (
          <span key={i} className="text-amber-400 text-[10px]">★</span>
        ))}
      </div>
    </div>
  );
};

function drawIllustratedFullBodyHero(ctx: CanvasRenderingContext2D, hero: RosterHeroData, t: number) {
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-18, 15, 12, 35);
  ctx.fillRect(6, 15, 12, 35);

  ctx.fillStyle = hero.element === 'water' ? '#1e3a8a' : '#7f1d1d';
  ctx.beginPath();
  ctx.roundRect(-24, -25, 48, 50, 6);
  ctx.fill();

  ctx.fillStyle = '#fde047';
  ctx.beginPath();
  ctx.arc(0, -42, 16, 0, Math.PI * 2);
  ctx.fill();
}

function drawEquippedWeaponVisuals(
  ctx: CanvasRenderingContext2D,
  hero: RosterHeroData,
  equippedWeapon: Item | null | undefined,
  t: number,
  isAttacking: boolean
) {
  // Disabled crude shape overlays. The high-quality pixel art of the character spritesheet already contains the weapon.
}
