import { Item, ItemAffix, ItemRarity, EquipmentSlot } from '../types';

export interface BaseItemDef {
  id: string;
  name: string;
  slot: EquipmentSlot | 'consumable';
  baseStats: {
    attack?: number;
    defense?: number;
    maxHp?: number;
    critChance?: number;
    critDamage?: number;
    lifeSteal?: number;
    speedBonus?: number;
  };
  healAmount?: number;
  manaAmount?: number;
  icon: string;
  description: string;
  baseValue: number;
  weight: number; // Probability weight
  minLevel?: number;
}

export const BASE_ITEMS: BaseItemDef[] = [
  // --- WEAPONS ---
  {
    id: 'espada_corta',
    name: 'Espada Corta',
    slot: 'weapon',
    baseStats: { attack: 8, critChance: 0.04 },
    icon: '🗡️',
    description: 'Espada de filo balanceado forjada en hierro.',
    baseValue: 25,
    weight: 20,
    minLevel: 1,
  },
  {
    id: 'daga_agil',
    name: 'Daga Sombría',
    slot: 'weapon',
    baseStats: { attack: 6, critChance: 0.12, speedBonus: 0.08 },
    icon: '🔪',
    description: 'Hoja liviana diseñada para estocadas críticas rápidas.',
    baseValue: 30,
    weight: 15,
    minLevel: 1,
  },
  {
    id: 'mandoble_pesado',
    name: 'Mandoble de Acero',
    slot: 'weapon',
    baseStats: { attack: 16, critDamage: 0.35, defense: 2 },
    icon: '⚔️',
    description: 'Enorme espada a dos manos que parte armaduras.',
    baseValue: 45,
    weight: 12,
    minLevel: 2,
  },
  {
    id: 'arco_cazador',
    name: 'Arco de Cazador',
    slot: 'weapon',
    baseStats: { attack: 11, critChance: 0.08, speedBonus: 0.05 },
    icon: '🏹',
    description: 'Arco de madera flexible con cuerda de tripa tensada.',
    baseValue: 35,
    weight: 14,
    minLevel: 1,
  },
  {
    id: 'baston_arcano',
    name: 'Bastón Arcano',
    slot: 'weapon',
    baseStats: { attack: 14, lifeSteal: 0.03, maxHp: 15 },
    icon: '🪄',
    description: 'Canalizador mágico engarzado con un orbe resplandeciente.',
    baseValue: 40,
    weight: 12,
    minLevel: 2,
  },
  {
    id: 'hacha_guerra',
    name: 'Hacha de Verdugo',
    slot: 'weapon',
    baseStats: { attack: 18, critDamage: 0.45 },
    icon: '🪓',
    description: 'Hacha pesada con filo brutal.',
    baseValue: 50,
    weight: 10,
    minLevel: 3,
  },

  // --- ARMOR (CHEST) ---
  {
    id: 'jubon_cuero',
    name: 'Jubón de Cuero',
    slot: 'armor',
    baseStats: { defense: 4, speedBonus: 0.05, maxHp: 15 },
    icon: '🥋',
    description: 'Prenda de cuero endurecido que otorga gran movilidad.',
    baseValue: 20,
    weight: 18,
    minLevel: 1,
  },
  {
    id: 'cota_malla',
    name: 'Cota de Malla',
    slot: 'armor',
    baseStats: { defense: 8, maxHp: 30 },
    icon: '🛡️',
    description: 'Entramado de anillas de acero que frena tajos profundos.',
    baseValue: 38,
    weight: 15,
    minLevel: 1,
  },
  {
    id: 'coraza_placas',
    name: 'Coraza de Placas',
    slot: 'armor',
    baseStats: { defense: 15, maxHp: 65, attack: 2 },
    icon: '🦺',
    description: 'Pesada armadura forjada por maestros herreros del reino.',
    baseValue: 60,
    weight: 10,
    minLevel: 2,
  },
  {
    id: 'tunica_magica',
    name: 'Túnica de Tejedor',
    slot: 'armor',
    baseStats: { defense: 5, maxHp: 40, critChance: 0.06 },
    icon: '🥻',
    description: 'Manto tejido con hilos arcanos que repelen energía.',
    baseValue: 35,
    weight: 12,
    minLevel: 2,
  },

  // --- HELMS (HEAD) ---
  {
    id: 'capucha_tela',
    name: 'Capucha de Sombra',
    slot: 'helm',
    baseStats: { defense: 3, critChance: 0.05, speedBonus: 0.04 },
    icon: '🥷',
    description: 'Oculta el rostro y agudiza los reflejos del portador.',
    baseValue: 20,
    weight: 16,
    minLevel: 1,
  },
  {
    id: 'yelmo_hierro',
    name: 'Yelmo de Caballero',
    slot: 'helm',
    baseStats: { defense: 7, maxHp: 25 },
    icon: '🪖',
    description: 'Casco de visera sólida que protege el cráneo.',
    baseValue: 32,
    weight: 14,
    minLevel: 1,
  },
  {
    id: 'corona_cristal',
    name: 'Corona de Cristal',
    slot: 'helm',
    baseStats: { defense: 5, critDamage: 0.2, attack: 4 },
    icon: '👑',
    description: 'Diadema resplandeciente imbuida de concentración arcana.',
    baseValue: 55,
    weight: 8,
    minLevel: 2,
  },

  // --- BOOTS ---
  {
    id: 'botas_cuero',
    name: 'Botas de Explorador',
    slot: 'boots',
    baseStats: { defense: 3, speedBonus: 0.08, maxHp: 15 },
    icon: '🥾',
    description: 'Calzado flexible y cómodo para recorrer largas distancias.',
    baseValue: 22,
    weight: 18,
    minLevel: 1,
  },
  {
    id: 'grebas_acero',
    name: 'Grebas de Vanguardia',
    slot: 'boots',
    baseStats: { defense: 7, maxHp: 35 },
    icon: '👢',
    description: 'Protecciones de metal pesado para las piernas.',
    baseValue: 36,
    weight: 14,
    minLevel: 2,
  },
  {
    id: 'sandalias_viento',
    name: 'Zancadas del Viento',
    slot: 'boots',
    baseStats: { defense: 4, speedBonus: 0.16, critChance: 0.04 },
    icon: '👟',
    description: 'Parecen levitar sutilmente sobre el suelo.',
    baseValue: 48,
    weight: 10,
    minLevel: 2,
  },

  // --- RINGS ---
  {
    id: 'anillo_rubi',
    name: 'Anillo de Rubí',
    slot: 'ring',
    baseStats: { attack: 5, critChance: 0.04 },
    icon: '💍',
    description: 'Gema escarlata que calienta la sangre en combate.',
    baseValue: 30,
    weight: 15,
    minLevel: 1,
  },
  {
    id: 'anillo_zafiro',
    name: 'Sortija de Zafiro',
    slot: 'ring',
    baseStats: { defense: 5, maxHp: 30 },
    icon: '💎',
    description: 'Piedra azul profunda que crea una tenue barrera protectora.',
    baseValue: 30,
    weight: 15,
    minLevel: 1,
  },
  {
    id: 'anillo_calavera',
    name: 'Anillo de Calavera',
    slot: 'ring',
    baseStats: { attack: 8, lifeSteal: 0.04, critDamage: 0.15 },
    icon: '💀',
    description: 'Ornamento oscuro que absorbe el vigor de los caídos.',
    baseValue: 55,
    weight: 9,
    minLevel: 2,
  },

  // --- AMULETS ---
  {
    id: 'amuleto_jade',
    name: 'Amuleto de Jade',
    slot: 'amulet',
    baseStats: { maxHp: 50, defense: 4, lifeSteal: 0.02 },
    icon: '📿',
    description: 'Reliquia serena que fomenta la vitalidad continua.',
    baseValue: 40,
    weight: 14,
    minLevel: 1,
  },
  {
    id: 'talisman_solar',
    name: 'Talismán Solar',
    slot: 'amulet',
    baseStats: { attack: 7, defense: 5, critChance: 0.06 },
    icon: '☀️',
    description: 'Medallón que irradia la bendición del sol matutino.',
    baseValue: 60,
    weight: 10,
    minLevel: 2,
  },
  {
    id: 'ojo_dragon',
    name: 'Ojo de Dragón',
    slot: 'amulet',
    baseStats: { attack: 12, critDamage: 0.3, lifeSteal: 0.05, maxHp: 40 },
    icon: '👁️',
    description: 'Fósil ancestral de poder abrumador.',
    baseValue: 85,
    weight: 5,
    minLevel: 3,
  },

  // --- CONSUMABLES ---
  {
    id: 'pocion_vida_mayor',
    name: 'Poción de Vida Mayor',
    slot: 'consumable',
    baseStats: {},
    healAmount: 75,
    icon: '🧪',
    description: 'Brebaje concentrado de hierbas curativas que restaura 75 HP.',
    baseValue: 15,
    weight: 30,
    minLevel: 1,
  },
  {
    id: 'elixir_furia',
    name: 'Elixir de Furia',
    slot: 'consumable',
    baseStats: { attack: 5 },
    healAmount: 40,
    icon: '🍷',
    description: 'Poción estimulante que cura 40 HP y vigoriza el espíritu.',
    baseValue: 20,
    weight: 20,
    minLevel: 1,
  },
];

// --- PREFIXES ---
export const PREFIXES: ItemAffix[] = [
  {
    id: 'pre_ardiente',
    name: 'Ardiente',
    type: 'prefix',
    tier: 1,
    stats: { attack: 6, critDamage: 0.15 },
    flavor: 'Envuelto en llamas eternas',
  },
  {
    id: 'pre_glacial',
    name: 'Glacial',
    type: 'prefix',
    tier: 1,
    stats: { defense: 5, critChance: 0.05 },
    flavor: 'Frío como el cero absoluto',
  },
  {
    id: 'pre_afilado',
    name: 'Afilado',
    type: 'prefix',
    tier: 1,
    stats: { attack: 8, critChance: 0.04 },
    flavor: 'Filo capaz de cortar el viento',
  },
  {
    id: 'pre_titanico',
    name: 'Titánico',
    type: 'prefix',
    tier: 2,
    stats: { maxHp: 45, defense: 8 },
    flavor: 'Forjado con la esencia de los gigantes',
  },
  {
    id: 'pre_vampirico',
    name: 'Vampírico',
    type: 'prefix',
    tier: 2,
    stats: { lifeSteal: 0.06, attack: 4 },
    flavor: 'Sediento de la sangre del enemigo',
  },
  {
    id: 'pre_centelleante',
    name: 'Centelleante',
    type: 'prefix',
    tier: 1,
    stats: { attack: 7, speedBonus: 0.06 },
    flavor: 'Brilla con descargas voltaicas',
  },
  {
    id: 'pre_impenetrable',
    name: 'Impenetrable',
    type: 'prefix',
    tier: 2,
    stats: { defense: 12, maxHp: 35 },
    flavor: 'Reforzado con aleaciones diamantinas',
  },
  {
    id: 'pre_furioso',
    name: 'Furioso',
    type: 'prefix',
    tier: 2,
    stats: { attack: 12, critDamage: 0.25 },
    flavor: 'Vibra con cólera berserker',
  },
  {
    id: 'pre_sagrado',
    name: 'Sagrado',
    type: 'prefix',
    tier: 3,
    stats: { attack: 10, defense: 8, maxHp: 50, lifeSteal: 0.04 },
    flavor: 'Consagrado en la Gran Catedral',
  },
];

// --- SUFFIXES ---
export const SUFFIXES: ItemAffix[] = [
  {
    id: 'suf_fuerza',
    name: 'de la Fuerza',
    type: 'suffix',
    tier: 1,
    stats: { attack: 7, maxHp: 20 },
    flavor: 'Incrementa el poder muscular',
  },
  {
    id: 'suf_dragon',
    name: 'del Dragón',
    type: 'suffix',
    tier: 3,
    stats: { attack: 12, defense: 7, maxHp: 40 },
    flavor: 'Imbuido con escamas de dragón rojo',
  },
  {
    id: 'suf_huracan',
    name: 'del Huracán',
    type: 'suffix',
    tier: 1,
    stats: { speedBonus: 0.1, critChance: 0.06 },
    flavor: 'Ligero y veloz como una tempestad',
  },
  {
    id: 'suf_sombra',
    name: 'de la Sombra',
    type: 'suffix',
    tier: 2,
    stats: { critChance: 0.09, critDamage: 0.25 },
    flavor: 'Favorece las estocadas letales por la espalda',
  },
  {
    id: 'suf_devocion',
    name: 'de la Devoción',
    type: 'suffix',
    tier: 1,
    stats: { defense: 8, maxHp: 35 },
    flavor: 'Otorga calma y serenidad defensiva',
  },
  {
    id: 'suf_fenix',
    name: 'del Fénix',
    type: 'suffix',
    tier: 3,
    stats: { maxHp: 60, lifeSteal: 0.05, attack: 6 },
    flavor: 'Resurge victorioso entre cenizas',
  },
  {
    id: 'suf_asesino',
    name: 'del Asesino',
    type: 'suffix',
    tier: 2,
    stats: { critChance: 0.12, critDamage: 0.4 },
    flavor: 'Diseñado para muertes instantáneas',
  },
  {
    id: 'suf_celeridad',
    name: 'de la Celeridad',
    type: 'suffix',
    tier: 1,
    stats: { speedBonus: 0.12, attack: 3 },
    flavor: 'Agilidad sin parangón',
  },
];

// --- RARITY STAT MULTIPLIERS & COLORS ---
export const RARITY_CONFIG: Record<ItemRarity, {
  name: string;
  multiplier: number;
  textColor: string;
  borderColor: string;
  bgColor: string;
  glowColor: string;
  prefixCount: number;
  suffixCount: number;
  dropWeight: number;
}> = {
  common: {
    name: 'Común',
    multiplier: 1.0,
    textColor: '#cbd5e1', // slate-300
    borderColor: '#475569',
    bgColor: '#1e293b',
    glowColor: 'transparent',
    prefixCount: 0,
    suffixCount: 0,
    dropWeight: 50,
  },
  magic: {
    name: 'Mágico',
    multiplier: 1.25,
    textColor: '#60a5fa', // blue-400
    borderColor: '#3b82f6',
    bgColor: '#172554',
    glowColor: 'rgba(59, 130, 246, 0.4)',
    prefixCount: 1,
    suffixCount: 0,
    dropWeight: 30,
  },
  rare: {
    name: 'Raro',
    multiplier: 1.55,
    textColor: '#facc15', // yellow-400
    borderColor: '#eab308',
    bgColor: '#422006',
    glowColor: 'rgba(234, 179, 8, 0.45)',
    prefixCount: 1,
    suffixCount: 1,
    dropWeight: 14,
  },
  epic: {
    name: 'Épico',
    multiplier: 1.9,
    textColor: '#c084fc', // purple-400
    borderColor: '#a855f7',
    bgColor: '#3b0764',
    glowColor: 'rgba(168, 85, 247, 0.55)',
    prefixCount: 1,
    suffixCount: 1,
    dropWeight: 5,
  },
  legendary: {
    name: 'Legendario',
    multiplier: 2.35,
    textColor: '#fb923c', // orange-400
    borderColor: '#f97316',
    bgColor: '#431407',
    glowColor: 'rgba(249, 115, 22, 0.7)',
    prefixCount: 2,
    suffixCount: 1,
    dropWeight: 1,
  },
};

/**
 * Procedural Loot Generator Engine with Weighted Tables
 */
export class LootGenerator {
  /**
   * Rolls a random rarity based on weighted probabilities and level luck bonus
   */
  public static rollRarity(level: number = 1, isBoss: boolean = false): ItemRarity {
    const weights = { ...RARITY_CONFIG };
    
    // Bosses or higher levels increase rare/epic/legendary odds
    let wCommon = isBoss ? 10 : Math.max(20, weights.common.dropWeight - level * 2);
    let wMagic = isBoss ? 35 : Math.max(25, weights.magic.dropWeight);
    let wRare = isBoss ? 35 : weights.rare.dropWeight + level * 1.5;
    let wEpic = isBoss ? 15 : weights.epic.dropWeight + level * 0.8;
    let wLegendary = isBoss ? 5 : weights.legendary.dropWeight + level * 0.3;

    const totalWeight = wCommon + wMagic + wRare + wEpic + wLegendary;
    const roll = Math.random() * totalWeight;

    if (roll < wCommon) return 'common';
    if (roll < wCommon + wMagic) return 'magic';
    if (roll < wCommon + wMagic + wRare) return 'rare';
    if (roll < wCommon + wMagic + wRare + wEpic) return 'epic';
    return 'legendary';
  }

  /**
   * Generates a procedural Item combining Base + Prefixes + Suffixes + Rarity
   */
  public static generateItem(options?: {
    forcedSlot?: EquipmentSlot | 'consumable';
    forcedRarity?: ItemRarity;
    level?: number;
    isBoss?: boolean;
  }): Item {
    const level = options?.level || 1;
    const isBoss = options?.isBoss || false;

    // 1. Filter base items by slot & level
    let candidateBases = BASE_ITEMS.filter((b) => {
      if (options?.forcedSlot && b.slot !== options.forcedSlot) return false;
      if (b.minLevel && b.minLevel > level + 1) return false;
      return true;
    });

    if (candidateBases.length === 0) {
      candidateBases = BASE_ITEMS;
    }

    // Weighted random selection of Base Item
    const totalBaseWeight = candidateBases.reduce((acc, b) => acc + b.weight, 0);
    let rBase = Math.random() * totalBaseWeight;
    let base = candidateBases[0];
    for (const b of candidateBases) {
      if (rBase < b.weight) {
        base = b;
        break;
      }
      rBase -= b.weight;
    }

    // Consumables don't roll complex affixes
    if (base.slot === 'consumable') {
      return {
        id: `${base.id}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        name: base.name,
        baseId: base.id,
        baseName: base.name,
        slot: 'consumable',
        rarity: 'common',
        itemLevel: level,
        healAmount: base.healAmount,
        manaAmount: base.manaAmount,
        icon: base.icon,
        description: base.description,
        value: base.baseValue,
        statMods: { ...base.baseStats },
      };
    }

    // 2. Determine Rarity
    const rarity = options?.forcedRarity || this.rollRarity(level, isBoss);
    const rConfig = RARITY_CONFIG[rarity];

    // 3. Roll Prefixes and Suffixes
    let prefix: ItemAffix | undefined;
    let suffix: ItemAffix | undefined;
    const extraAffixes: ItemAffix[] = [];

    if (rConfig.prefixCount >= 1) {
      prefix = PREFIXES[Math.floor(Math.random() * PREFIXES.length)];
    }

    if (rConfig.suffixCount >= 1) {
      // Pick suffix (or ensure not duplicate if prefix was chosen)
      suffix = SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)];
    }

    if (rConfig.prefixCount >= 2) {
      const secondPrefix = PREFIXES.filter((p) => p.id !== prefix?.id)[
        Math.floor(Math.random() * (PREFIXES.length - 1))
      ];
      if (secondPrefix) extraAffixes.push(secondPrefix);
    }

    // 4. Construct Procedural Name
    // Format: "[Prefix] [Base Name] [Suffix]" (e.g. "Espada Corta Ardiente de la Fuerza")
    let fullName = base.name;
    if (prefix && suffix) {
      fullName = `${base.name} ${prefix.name} ${suffix.name}`;
    } else if (prefix) {
      fullName = `${base.name} ${prefix.name}`;
    } else if (suffix) {
      fullName = `${base.name} ${suffix.name}`;
    }

    if (rarity === 'legendary') {
      fullName = `★ ${fullName}`;
    }

    // 5. Calculate Final Combined Stats
    const combinedStats: Record<string, number> = {};

    // Apply base stats scaled by rarity multiplier
    for (const [k, val] of Object.entries(base.baseStats)) {
      if (val !== undefined) {
        combinedStats[k] = Math.round((val as number) * rConfig.multiplier * 10) / 10;
      }
    }

    // Add prefix stats
    const allAffixes = [prefix, suffix, ...extraAffixes].filter(Boolean) as ItemAffix[];
    for (const affix of allAffixes) {
      for (const [k, val] of Object.entries(affix.stats)) {
        if (val !== undefined) {
          combinedStats[k] = (combinedStats[k] || 0) + (val as number);
        }
      }
    }

    // Calculate Gold Value
    const totalValue = Math.round(
      base.baseValue * rConfig.multiplier + allAffixes.length * 20
    );

    const uniqueId = `item_${base.id}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    return {
      id: uniqueId,
      name: fullName,
      baseId: base.id,
      baseName: base.name,
      slot: base.slot,
      rarity,
      itemLevel: level,
      prefix,
      suffix,
      extraAffixes,
      statMods: combinedStats,
      healAmount: base.healAmount,
      manaAmount: base.manaAmount,
      icon: base.icon,
      description: base.description,
      value: totalValue,
    };
  }

  /**
   * Generates loot drops when an enemy is defeated
   */
  public static rollEnemyDrop(enemyName: string, level: number = 1): { item?: Item; gold: number } {
    const isBoss = enemyName.toLowerCase().includes('jefe') || enemyName.toLowerCase().includes('dragón') || enemyName.toLowerCase().includes('rey');
    
    // Gold roll
    const baseGold = isBoss ? 75 + Math.floor(Math.random() * 80) : 10 + Math.floor(Math.random() * 20);
    const gold = baseGold * level;

    // Item drop probability: 65% for regular enemies, 100% for bosses
    const dropRoll = Math.random();
    const shouldDropItem = isBoss || dropRoll < 0.65;

    let item: Item | undefined;
    if (shouldDropItem) {
      item = this.generateItem({ level, isBoss });
    }

    return { item, gold };
  }
}
