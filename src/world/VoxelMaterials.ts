import * as THREE from 'three';
import { TileType, PropType } from '../types';
import { CurvedWorldManager } from '../renderer/CurvedWorldManager';

function createPixelTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D) => void
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  draw(ctx);

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function loadPixelTexture(url: string): THREE.Texture {
  const loader = new THREE.TextureLoader();
  const texture = loader.load(url, (tex) => {
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
  });
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}


export function extractTileFromSheet(url: string, sx: number, sy: number, w: number, h: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  
  const img = new Image();
  img.onload = () => {
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, sx, sy, w, h, 0, 0, w, h);
    texture.needsUpdate = true;
  };
  img.src = url;
  
  return texture;
}

export class VoxelMaterials {
  private materials: Map<TileType, THREE.Material | THREE.Material[]> = new Map();
  private overworldMaterials: Map<TileType, THREE.Material | THREE.Material[]> = new Map();
  private propTextures: Map<PropType, THREE.Texture> = new Map();
  private overworldPropTypes: Map<PropType, THREE.Texture> = new Map();
  private currentMode: 'local' | 'overworld' = 'local';
  private playerSpritesheetTexture!: THREE.Texture;
  private archerSpritesheetTexture!: THREE.Texture;
  private enemySpritesheetTexture!: THREE.CanvasTexture;
  private slashEffectTexture!: THREE.CanvasTexture;

  constructor() {
    this.initBlockTextures();
    this.initPropTextures();
    this.initPlayer4x4Spritesheet();
    this.initArcherPlayerSpritesheet();
    this.initHeadSpritesheet();
    this.initEnemy4x4Spritesheet();
    this.initSlashEffectTexture();
  }

  private initBlockTextures(): void {
    const grassTopTex = createPixelTexture(16, 16, (ctx) => {
      ctx.fillStyle = '#4a8535';
      ctx.fillRect(0, 0, 16, 16);
      const greens = ['#5a9c3e', '#3b6e29', '#68ae46', '#42782e'];
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          if ((x + y * 7) % 3 === 0) {
            ctx.fillStyle = greens[(x * 3 + y * 5) % greens.length];
            ctx.fillRect(x, y, 1, 1);
          }
        }
      }
    });

    const dirtSideTex = createPixelTexture(16, 16, (ctx) => {
      ctx.fillStyle = '#6b482b';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#4a8535';
      ctx.fillRect(0, 0, 16, 3);
      ctx.fillStyle = '#3b6e29';
      ctx.fillRect(2, 3, 2, 1);
      ctx.fillRect(7, 3, 3, 1);
      ctx.fillRect(12, 3, 2, 1);
      const browns = ['#583b22', '#7a5433', '#4d331c'];
      for (let x = 0; x < 16; x++) {
        for (let y = 4; y < 16; y++) {
          if ((x * 11 + y * 13) % 4 === 0) {
            ctx.fillStyle = browns[(x + y) % browns.length];
            ctx.fillRect(x, y, 1, 1);
          }
        }
      }
    });

    const stoneTex = createPixelTexture(16, 16, (ctx) => {
      ctx.fillStyle = '#67727e';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#4c545e';
      ctx.fillRect(0, 0, 16, 1);
      ctx.fillRect(0, 8, 16, 1);
      ctx.fillRect(8, 0, 1, 8);
      ctx.fillRect(4, 8, 1, 8);
    });

    const pathTex = createPixelTexture(16, 16, (ctx) => {
      ctx.fillStyle = '#a89476';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#877458';
      for (let x = 1; x < 15; x += 4) {
        for (let y = 1; y < 15; y += 4) {
          ctx.fillRect(x, y, 3, 3);
        }
      }
    });

    const waterTex = createPixelTexture(16, 16, (ctx) => {
      ctx.fillStyle = '#2b6cb0';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#3182ce';
      ctx.fillRect(1, 3, 5, 1);
      ctx.fillRect(8, 7, 6, 1);
      ctx.fillStyle = '#63b3ed';
      ctx.fillRect(2, 3, 2, 1);
    });

    const grassTopMat = new THREE.MeshStandardMaterial({ map: grassTopTex, roughness: 0.8 });
    const dirtSideMat = new THREE.MeshStandardMaterial({ map: dirtSideTex, roughness: 0.9 });

    // Helper to generate beautifully blended pixel-art transition textures
    const createTransitionTex = (dir: 'N' | 'S' | 'E' | 'W' | 'NE' | 'NW' | 'SE' | 'SW') => {
      return createPixelTexture(16, 16, (ctx) => {
        const greens = ['#5a9c3e', '#3b6e29', '#68ae46', '#42782e'];
        const browns = ['#583b22', '#7a5433', '#4d331c'];
        
        for (let x = 0; x < 16; x++) {
          for (let y = 0; y < 16; y++) {
            let isDirt = false;
            // Generate a jagged transition edge using sine/cosine pseudo-noise
            const noise = Math.sin(x * 1.5) * 1.2 + Math.cos(y * 1.5) * 1.2;
            const threshold = 8 + noise;
            
            if (dir === 'N') {
              isDirt = y < threshold - 2;
            } else if (dir === 'S') {
              isDirt = y > threshold + 2;
            } else if (dir === 'W') {
              isDirt = x < threshold - 2;
            } else if (dir === 'E') {
              isDirt = x > threshold + 2;
            } else if (dir === 'NE') {
              isDirt = y < threshold - 2 || x > 15 - (threshold - 2);
            } else if (dir === 'NW') {
              isDirt = y < threshold - 2 || x < threshold - 2;
            } else if (dir === 'SE') {
              isDirt = y > threshold + 2 || x > 15 - (threshold - 2);
            } else if (dir === 'SW') {
              isDirt = y > threshold + 2 || x < threshold - 2;
            }
            
            if (isDirt) {
              ctx.fillStyle = '#6b482b';
              ctx.fillRect(x, y, 1, 1);
              if ((x * 11 + y * 13) % 4 === 0) {
                ctx.fillStyle = browns[(x + y) % browns.length];
                ctx.fillRect(x, y, 1, 1);
              }
            } else {
              ctx.fillStyle = '#4a8535';
              ctx.fillRect(x, y, 1, 1);
              if ((x + y * 7) % 3 === 0) {
                ctx.fillStyle = greens[(x * 3 + y * 5) % greens.length];
                ctx.fillRect(x, y, 1, 1);
              }
            }
          }
        }
      });
    };

    const transitionTexN = createTransitionTex('N');
    const transitionTexS = createTransitionTex('S');
    const transitionTexE = createTransitionTex('E');
    const transitionTexW = createTransitionTex('W');
    const transitionTexNE = createTransitionTex('NE');
    const transitionTexNW = createTransitionTex('NW');
    const transitionTexSE = createTransitionTex('SE');
    const transitionTexSW = createTransitionTex('SW');

    const transitionMatN = new THREE.MeshStandardMaterial({ map: transitionTexN, roughness: 0.8 });
    const transitionMatS = new THREE.MeshStandardMaterial({ map: transitionTexS, roughness: 0.8 });
    const transitionMatE = new THREE.MeshStandardMaterial({ map: transitionTexE, roughness: 0.8 });
    const transitionMatW = new THREE.MeshStandardMaterial({ map: transitionTexW, roughness: 0.8 });
    const transitionMatNE = new THREE.MeshStandardMaterial({ map: transitionTexNE, roughness: 0.8 });
    const transitionMatNW = new THREE.MeshStandardMaterial({ map: transitionTexNW, roughness: 0.8 });
    const transitionMatSE = new THREE.MeshStandardMaterial({ map: transitionTexSE, roughness: 0.8 });
    const transitionMatSW = new THREE.MeshStandardMaterial({ map: transitionTexSW, roughness: 0.8 });

    // Textures extracted directly from GRASS_PLUS.png tilesheet
    const grassTopTilesheet = loadPixelTexture('/tiles/grass_top.png');
    const dirtTopTilesheet = loadPixelTexture('/tiles/dirt_top.png');
    const stoneCliffTilesheet = loadPixelTexture('/tiles/stone_cliff.png');
    const pathTilesheet = loadPixelTexture('/tiles/path.png');
    const waterTilesheet = loadPixelTexture('/tiles/water.png');

    // Procedural stone cobblestone pavers (engine native)
    const cobbleGroundTex = createPixelTexture(16, 16, (ctx) => {
      ctx.fillStyle = '#64748b';
      ctx.fillRect(0, 0, 16, 16);
      const stones = [
        { x: 0, y: 0, w: 7, h: 4, c: '#94a3b8' },
        { x: 8, y: 0, w: 8, h: 4, c: '#64748b' },
        { x: 0, y: 5, w: 4, h: 5, c: '#475569' },
        { x: 5, y: 5, w: 6, h: 5, c: '#94a3b8' },
        { x: 12, y: 5, w: 4, h: 5, c: '#64748b' },
        { x: 0, y: 11, w: 7, h: 5, c: '#64748b' },
        { x: 8, y: 11, w: 8, h: 5, c: '#475569' },
      ];
      stones.forEach((s) => {
        ctx.fillStyle = s.c;
        ctx.fillRect(s.x, s.y, s.w, s.h);
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(s.x, s.y, s.w - 1, 1);
        ctx.fillRect(s.x, s.y, 1, s.h - 1);
        ctx.fillStyle = '#334155';
        ctx.fillRect(s.x, s.y + s.h - 1, s.w, 1);
        ctx.fillRect(s.x + s.w - 1, s.y, 1, s.h);
      });
    });

    // Procedural castle stone wall block (engine native)
    const castleWallTex = createPixelTexture(16, 16, (ctx) => {
      ctx.fillStyle = '#334155';
      ctx.fillRect(0, 0, 16, 16);
      // Row 1
      ctx.fillStyle = '#475569';
      ctx.fillRect(0, 0, 7, 7);
      ctx.fillRect(8, 0, 8, 7);
      // Row 2
      ctx.fillRect(0, 8, 15, 7);
      // Mortar highlights
      ctx.fillStyle = '#64748b';
      ctx.fillRect(0, 0, 7, 1);
      ctx.fillRect(8, 0, 8, 1);
      ctx.fillRect(0, 8, 15, 1);
      // Mortar shadows
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 7, 16, 1);
      ctx.fillRect(7, 0, 1, 7);
      ctx.fillRect(0, 15, 16, 1);
    });

    const transNTex = loadPixelTexture('/tiles/trans_n.png');
    const transSTex = loadPixelTexture('/tiles/trans_s.png');
    const transETex = loadPixelTexture('/tiles/trans_e.png');
    const transWTex = loadPixelTexture('/tiles/trans_w.png');
    const transNETex = loadPixelTexture('/tiles/trans_ne.png');
    const transNWTex = loadPixelTexture('/tiles/trans_nw.png');
    const transSETex = loadPixelTexture('/tiles/trans_se.png');
    const transSWTex = loadPixelTexture('/tiles/trans_sw.png');

    
    // Local Ground Materials (for towns, dungeons, cities)
    const localSandTex = createPixelTexture(16, 16, (ctx) => {
      ctx.fillStyle = '#f6d89b';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#eed18f';
      for (let x = 0; x < 16; x += 3) {
        for (let y = 0; y < 16; y += 3) {
          ctx.fillRect(x, y, 1, 1);
        }
      }
    });

    const localSnowTex = createPixelTexture(16, 16, (ctx) => {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(2, 2, 4, 3);
      ctx.fillRect(10, 8, 4, 4);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(6, 12, 3, 2);
    });

    this.materials.set(TileType.GRASS, new THREE.MeshStandardMaterial({ map: grassTopTilesheet, roughness: 0.85 }));
    this.materials.set(TileType.DIRT, new THREE.MeshStandardMaterial({ map: dirtTopTilesheet, roughness: 0.9 }));
    this.materials.set(TileType.STONE, new THREE.MeshStandardMaterial({ map: stoneCliffTilesheet, roughness: 0.7 }));
    this.materials.set(TileType.PATH, new THREE.MeshStandardMaterial({ map: pathTilesheet, roughness: 0.8 }));
    this.materials.set(TileType.STONE_COBBLE, new THREE.MeshStandardMaterial({ map: cobbleGroundTex, roughness: 0.75 }));
    this.materials.set(TileType.CASTLE_WALL, new THREE.MeshStandardMaterial({ map: castleWallTex, roughness: 0.7 }));
    this.materials.set(TileType.WATER, new THREE.MeshStandardMaterial({ map: waterTilesheet, transparent: true, opacity: 0.85 }));
    this.materials.set(TileType.SAND, new THREE.MeshStandardMaterial({ map: localSandTex, roughness: 0.9 }));
    this.materials.set(TileType.SNOW, new THREE.MeshStandardMaterial({ map: localSnowTex, roughness: 0.85 }));
    
    this.materials.set(TileType.GRASS_DIRT_N, new THREE.MeshStandardMaterial({ map: transNTex, roughness: 0.85 }));
    this.materials.set(TileType.GRASS_DIRT_S, new THREE.MeshStandardMaterial({ map: transSTex, roughness: 0.85 }));
    this.materials.set(TileType.GRASS_DIRT_E, new THREE.MeshStandardMaterial({ map: transETex, roughness: 0.85 }));
    this.materials.set(TileType.GRASS_DIRT_W, new THREE.MeshStandardMaterial({ map: transWTex, roughness: 0.85 }));
    this.materials.set(TileType.GRASS_DIRT_NE, new THREE.MeshStandardMaterial({ map: transNETex, roughness: 0.85 }));
    this.materials.set(TileType.GRASS_DIRT_NW, new THREE.MeshStandardMaterial({ map: transNWTex, roughness: 0.85 }));
    this.materials.set(TileType.GRASS_DIRT_SE, new THREE.MeshStandardMaterial({ map: transSETex, roughness: 0.85 }));
    this.materials.set(TileType.GRASS_DIRT_SW, new THREE.MeshStandardMaterial({ map: transSWTex, roughness: 0.85 }));

    // Overworld Mapamundi Materials (Strictly MiniWorldSprites)
    const overworldGrass = extractTileFromSheet('/map/MiniWorldSprites/Ground/Grass.png', 0, 0, 16, 16);
    const overworldSand = extractTileFromSheet('/map/MiniWorldSprites/Ground/Shore.png', 16, 0, 16, 16);
    const overworldWater = extractTileFromSheet('/map/MiniWorldSprites/Ground/Cliff-Water.png', 0, 0, 16, 16);
    const overworldDeadGrass = extractTileFromSheet('/map/MiniWorldSprites/Ground/DeadGrass.png', 0, 0, 16, 16);
    const overworldCliff = extractTileFromSheet('/map/MiniWorldSprites/Ground/Cliff.png', 0, 0, 16, 16);
    const overworldWinter = extractTileFromSheet('/map/MiniWorldSprites/Ground/Winter.png', 0, 0, 16, 16);

    this.overworldMaterials.set(TileType.GRASS, new THREE.MeshStandardMaterial({ map: overworldGrass, roughness: 0.9 }));
    this.overworldMaterials.set(TileType.DIRT, new THREE.MeshStandardMaterial({ map: overworldDeadGrass, roughness: 0.9 }));
    this.overworldMaterials.set(TileType.PATH, new THREE.MeshStandardMaterial({ map: overworldDeadGrass, roughness: 0.9 }));
    this.overworldMaterials.set(TileType.STONE, new THREE.MeshStandardMaterial({ map: overworldCliff, roughness: 0.8 }));
    this.overworldMaterials.set(TileType.STONE_COBBLE, new THREE.MeshStandardMaterial({ map: overworldCliff, roughness: 0.8 }));
    this.overworldMaterials.set(TileType.CASTLE_WALL, new THREE.MeshStandardMaterial({ map: overworldCliff, roughness: 0.8 }));
    this.overworldMaterials.set(TileType.SAND, new THREE.MeshStandardMaterial({ map: overworldSand, roughness: 0.9 }));
    this.overworldMaterials.set(TileType.WATER, new THREE.MeshStandardMaterial({ map: overworldWater, transparent: true, opacity: 0.88, roughness: 0.3 }));
    this.overworldMaterials.set(TileType.SNOW, new THREE.MeshStandardMaterial({ map: overworldWinter, roughness: 0.9 }));

    // Inject Curved World shader support to all terrain materials
    const curvedMgr = CurvedWorldManager.getInstance();
    this.materials.forEach((mat) => {
      if (Array.isArray(mat)) {
        mat.forEach((m) => curvedMgr.injectCurvedWorld(m));
      } else {
        curvedMgr.injectCurvedWorld(mat);
      }
    });
    this.overworldMaterials.forEach((mat) => {
      if (Array.isArray(mat)) {
        mat.forEach((m) => curvedMgr.injectCurvedWorld(m));
      } else {
        curvedMgr.injectCurvedWorld(mat);
      }
    });
  }

  private initPropTextures(): void {
    // High-resolution props extracted from GRASS_PLUS.png
    const pineTreeTex = loadPixelTexture('/props/tree_pine.png');
    const oakTreeTex = loadPixelTexture('/props/tree_oak.png');
    const bushSmallTex = loadPixelTexture('/props/bush_small.png');
    const bushLargeTex = loadPixelTexture('/props/bush_large.png');
    const fenceWoodTex = loadPixelTexture('/props/fence_wood.png');
    const flowersRedTex = loadPixelTexture('/props/flowers_red.png');
    const flowersBlueTex = loadPixelTexture('/props/flowers_blue.png');
    const rockTex = loadPixelTexture('/props/rock.png');
    const signpostTex = loadPixelTexture('/props/signpost.png');
    const crateTex = loadPixelTexture('/props/crate.png');

    // 2. Bush (24x24)
    const bushTex = createPixelTexture(24, 24, (ctx) => {
      ctx.clearRect(0, 0, 24, 24);
      ctx.fillStyle = '#2f7027';
      ctx.fillRect(4, 8, 16, 14);
      ctx.fillRect(2, 10, 20, 10);
      ctx.fillStyle = '#419237';
      ctx.fillRect(6, 6, 12, 4);
      ctx.fillRect(8, 4, 8, 4);
      // Highlights
      ctx.fillStyle = '#5ab34e';
      ctx.fillRect(6, 6, 3, 2);
      ctx.fillRect(14, 10, 3, 2);
    });

    // 3. Flower & Rock (24x24)
    const flowerRockTex = createPixelTexture(24, 24, (ctx) => {
      ctx.clearRect(0, 0, 24, 24);
      // Rock
      ctx.fillStyle = '#525b66';
      ctx.fillRect(4, 12, 14, 10);
      ctx.fillStyle = '#727d8c';
      ctx.fillRect(6, 10, 10, 4);
      // Yellow / Red Flowers
      ctx.fillStyle = '#ecc94b';
      ctx.fillRect(2, 16, 3, 3);
      ctx.fillRect(18, 14, 3, 3);
      ctx.fillStyle = '#e53e3e';
      ctx.fillRect(15, 18, 3, 3);
      ctx.fillRect(5, 8, 3, 3);
    });

    // 4. House Facade (48x48)
    const houseFacadeTex = createPixelTexture(48, 48, (ctx) => {
      ctx.clearRect(0, 0, 48, 48);

      // Roof (Slate roof)
      ctx.fillStyle = '#4a5568';
      ctx.beginPath();
      ctx.moveTo(24, 2);
      ctx.lineTo(46, 20);
      ctx.lineTo(2, 20);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#2d3748';
      ctx.fillRect(2, 20, 44, 3);

      // Walls (Timber + Stone)
      ctx.fillStyle = '#dd6b20';
      ctx.fillRect(6, 23, 36, 25);
      // Plaster / Stucco center
      ctx.fillStyle = '#feebc8';
      ctx.fillRect(8, 25, 32, 23);

      // Wooden beams
      ctx.fillStyle = '#7b341e';
      ctx.fillRect(8, 25, 3, 23);
      ctx.fillRect(37, 25, 3, 23);
      ctx.fillRect(22, 25, 4, 23);
      ctx.fillRect(8, 34, 32, 3);

      // Door
      ctx.fillStyle = '#5c2c16';
      ctx.fillRect(20, 36, 8, 12);
      ctx.fillStyle = '#d69e2e';
      ctx.fillRect(26, 42, 1.5, 1.5); // Brass handle

      // Windows with warm glow
      ctx.fillStyle = '#ecc94b';
      ctx.fillRect(12, 27, 6, 6);
      ctx.fillRect(30, 27, 6, 6);
      ctx.fillStyle = '#7b341e';
      ctx.fillRect(14, 27, 2, 6);
      ctx.fillRect(12, 29, 6, 2);
      ctx.fillRect(32, 27, 2, 6);
      ctx.fillRect(30, 29, 6, 2);
    });

    // Authentic assets from GRASS_PLUS.png
    const pineTreeLargeTex = loadPixelTexture('/props/tree_pine_large.png');
    const treeOakAltTex = loadPixelTexture('/props/tree_oak_alt.png');
    const treeOakGreenTex = loadPixelTexture('/props/tree_oak_green.png');

    // Engine-native procedural pixel art for city elements (zero external tilesheets)
    const fountainTex = createPixelTexture(48, 48, (ctx) => {
      ctx.clearRect(0, 0, 48, 48);
      // Outer stone basin
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.ellipse(24, 34, 22, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.ellipse(24, 33, 20, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      // Water pool
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.ellipse(24, 34, 18, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.ellipse(24, 33, 14, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      // Central stone pedestal
      ctx.fillStyle = '#64748b';
      ctx.fillRect(21, 16, 6, 18);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(21, 16, 2, 18);
      // Upper tier bowl
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.ellipse(24, 16, 10, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.ellipse(24, 15, 8, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
      // Water spray & sparkles
      ctx.fillStyle = '#e0f2fe';
      ctx.fillRect(23, 6, 2, 9);
      ctx.fillRect(21, 9, 2, 3);
      ctx.fillRect(25, 9, 2, 3);
      ctx.fillRect(19, 13, 2, 3);
      ctx.fillRect(27, 13, 2, 3);
    });

    const streetLampTex = createPixelTexture(16, 32, (ctx) => {
      ctx.clearRect(0, 0, 16, 32);
      // Iron post base
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(6, 29, 4, 3);
      ctx.fillRect(7, 8, 2, 21);
      // Lamp bracket
      ctx.fillRect(5, 7, 6, 2);
      ctx.fillRect(4, 5, 8, 2);
      // Glowing Lantern
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(5, 9, 6, 7);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(6, 10, 4, 5);
      // Metal cap and finial
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(5, 7, 6, 2);
      ctx.fillRect(7, 5, 2, 2);
      ctx.fillRect(5, 16, 6, 1);
    });

    const marketStallRedTex = extractTileFromSheet('/map/PandaMaru_MV_market1.png', 0, 192, 192, 192);

    const marketStallBlueTex = extractTileFromSheet('/map/PandaMaru_MV_market1.png', 192, 192, 192, 192);

    const barrelsStackTex = createPixelTexture(24, 24, (ctx) => {
      ctx.clearRect(0, 0, 24, 24);
      // Helper to draw one barrel
      const drawBarrel = (bx: number, by: number) => {
        ctx.fillStyle = '#92400e';
        ctx.fillRect(bx + 1, by, 8, 11);
        ctx.fillRect(bx, by + 2, 10, 7);
        // Hoops
        ctx.fillStyle = '#475569';
        ctx.fillRect(bx, by + 2, 10, 1);
        ctx.fillRect(bx, by + 8, 10, 1);
        // Highlight & shadow
        ctx.fillStyle = '#b45309';
        ctx.fillRect(bx + 2, by + 3, 2, 5);
        ctx.fillStyle = '#451a03';
        ctx.fillRect(bx + 8, by + 3, 1, 5);
      };
      drawBarrel(1, 12);
      drawBarrel(13, 12);
      drawBarrel(7, 2);
    });

    const barrelSingleTex = createPixelTexture(16, 16, (ctx) => {
      ctx.clearRect(0, 0, 16, 16);
      ctx.fillStyle = '#92400e';
      ctx.fillRect(4, 2, 8, 12);
      ctx.fillRect(3, 4, 10, 8);
      ctx.fillStyle = '#475569';
      ctx.fillRect(3, 4, 10, 1);
      ctx.fillRect(3, 11, 10, 1);
      ctx.fillStyle = '#b45309';
      ctx.fillRect(5, 5, 2, 6);
      ctx.fillStyle = '#451a03';
      ctx.fillRect(11, 5, 1, 6);
    });

    const crateStackTex = createPixelTexture(20, 24, (ctx) => {
      ctx.clearRect(0, 0, 20, 24);
      // Bottom crate
      ctx.fillStyle = '#b45309';
      ctx.fillRect(1, 11, 18, 12);
      ctx.fillStyle = '#78350f';
      ctx.strokeRect(1.5, 11.5, 17, 11);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(3, 13, 14, 8);
      // Top crate
      ctx.fillStyle = '#b45309';
      ctx.fillRect(3, 1, 14, 11);
      ctx.fillStyle = '#78350f';
      ctx.strokeRect(3.5, 1.5, 13, 10);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(5, 3, 10, 7);
    });

    const benchWoodTex = createPixelTexture(24, 16, (ctx) => {
      ctx.clearRect(0, 0, 24, 16);
      // Metal frame legs
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(3, 9, 2, 7);
      ctx.fillRect(19, 9, 2, 7);
      ctx.fillRect(2, 8, 4, 2);
      ctx.fillRect(18, 8, 4, 2);
      // Wooden backrest slats
      ctx.fillStyle = '#a16207';
      ctx.fillRect(2, 2, 20, 2);
      ctx.fillRect(2, 5, 20, 2);
      // Wooden seat planks
      ctx.fillStyle = '#ca8a04';
      ctx.fillRect(1, 8, 22, 3);
      ctx.fillStyle = '#713f12';
      ctx.fillRect(1, 10, 22, 1);
    });

    // Shop Houses procedural pixel facades
    const shopHouse1Tex = createPixelTexture(48, 64, (ctx) => {
      ctx.clearRect(0, 0, 48, 64);
      // Roof
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(24, 2);
      ctx.lineTo(47, 24);
      ctx.lineTo(1, 24);
      ctx.closePath();
      ctx.fill();
      // Wall
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(4, 24, 40, 39);
      // Timber beams
      ctx.fillStyle = '#78350f';
      ctx.fillRect(4, 24, 4, 39);
      ctx.fillRect(40, 24, 4, 39);
      ctx.fillRect(4, 38, 40, 3);
      // Shop Awning
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(8, 38, 32, 6);
      ctx.fillStyle = '#bae6fd';
      ctx.fillRect(12, 38, 4, 6);
      ctx.fillRect(20, 38, 4, 6);
      ctx.fillRect(28, 38, 4, 6);
      // Display window & door
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(10, 46, 12, 14);
      ctx.fillStyle = '#451a03';
      ctx.fillRect(26, 45, 12, 18);
      // Upper window
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(20, 27, 8, 8);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(23, 27, 2, 8);
      ctx.fillRect(20, 30, 8, 2);
    });

    const shopHouse2Tex = createPixelTexture(48, 64, (ctx) => {
      ctx.clearRect(0, 0, 48, 64);
      // Blacksmith Stone Chimney
      ctx.fillStyle = '#475569';
      ctx.fillRect(36, 4, 7, 24);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(35, 2, 9, 3);
      // Roof
      ctx.fillStyle = '#7f1d1d';
      ctx.beginPath();
      ctx.moveTo(24, 6);
      ctx.lineTo(47, 26);
      ctx.lineTo(1, 26);
      ctx.closePath();
      ctx.fill();
      // Stone walls
      ctx.fillStyle = '#64748b';
      ctx.fillRect(4, 26, 40, 37);
      // Forge archway with glowing embers
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(8, 42, 16, 20);
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(10, 50, 12, 11);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(12, 54, 8, 6);
      // Heavy Door
      ctx.fillStyle = '#451a03';
      ctx.fillRect(28, 43, 12, 20);
      // Anvil hanging sign
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(27, 30, 10, 4);
      ctx.fillRect(29, 33, 6, 4);
    });

    const shopHouse3Tex = createPixelTexture(48, 64, (ctx) => {
      ctx.clearRect(0, 0, 48, 64);
      // Tavern Roof
      ctx.fillStyle = '#1e3a5f';
      ctx.beginPath();
      ctx.moveTo(24, 2);
      ctx.lineTo(47, 24);
      ctx.lineTo(1, 24);
      ctx.closePath();
      ctx.fill();
      // Timber + plaster wall
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(4, 24, 40, 39);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(4, 24, 4, 39);
      ctx.fillRect(40, 24, 4, 39);
      ctx.fillRect(4, 40, 40, 3);
      ctx.fillRect(22, 24, 4, 16);
      // Warm lit windows
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(8, 27, 10, 9);
      ctx.fillRect(30, 27, 10, 9);
      ctx.fillRect(8, 46, 12, 12);
      // Tavern Double Doors
      ctx.fillStyle = '#451a03';
      ctx.fillRect(24, 44, 16, 19);
      ctx.fillStyle = '#d97706';
      ctx.fillRect(31, 53, 2, 2);
    });

    const manorHouseTex = createPixelTexture(64, 64, (ctx) => {
      ctx.clearRect(0, 0, 64, 64);
      // Manor Roof
      ctx.fillStyle = '#312e81';
      ctx.beginPath();
      ctx.moveTo(32, 2);
      ctx.lineTo(62, 24);
      ctx.lineTo(2, 24);
      ctx.closePath();
      ctx.fill();
      // Stone facade
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(6, 24, 52, 39);
      // Pillars
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(6, 24, 6, 39);
      ctx.fillRect(52, 24, 6, 39);
      ctx.fillRect(22, 38, 4, 25);
      ctx.fillRect(38, 38, 4, 25);
      // Grand Arched Door
      ctx.fillStyle = '#451a03';
      ctx.fillRect(26, 42, 12, 21);
      // Windows with curtains
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(15, 28, 10, 8);
      ctx.fillRect(39, 28, 10, 8);
      ctx.fillRect(10, 44, 8, 10);
      ctx.fillRect(46, 44, 8, 10);
    });

    const guildHallTex = createPixelTexture(64, 64, (ctx) => {
      ctx.clearRect(0, 0, 64, 64);
      // Guild Roof with golden crest
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(32, 2);
      ctx.lineTo(62, 22);
      ctx.lineTo(2, 22);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#eab308';
      ctx.fillRect(30, 2, 4, 6);
      // Solid Castle Ashlar
      ctx.fillStyle = '#64748b';
      ctx.fillRect(6, 22, 52, 41);
      // Guild Banners
      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(12, 26, 6, 18);
      ctx.fillRect(46, 26, 6, 18);
      // Archway entrance
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(22, 38, 20, 25);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(24, 41, 16, 22);
      // Upper Hall Windows
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(24, 25, 16, 8);
    });

    // Local Props (City / Dungeons / Local Maps)
    this.propTextures.set(PropType.PINE_TREE, pineTreeTex);
    this.propTextures.set(PropType.TREE_PINE, pineTreeLargeTex);
    this.propTextures.set(PropType.TREE_OAK, oakTreeTex);
    this.propTextures.set(PropType.TREE_GRAND_OAK, treeOakAltTex);
    this.propTextures.set(PropType.TREE_LUSH_PINE, pineTreeLargeTex);
    this.propTextures.set(PropType.TREE_TOWN_GREEN, treeOakGreenTex);
    this.propTextures.set(PropType.BUSH, bushSmallTex);
    this.propTextures.set(PropType.BUSH_DETAILED, bushLargeTex);
    this.propTextures.set(PropType.BUSH_FLOWERING, bushLargeTex);
    this.propTextures.set(PropType.BUSH_ROUND, bushSmallTex);
    this.propTextures.set(PropType.FENCE_WOOD, fenceWoodTex);
    this.propTextures.set(PropType.FLOWER_ROCK, flowersRedTex);
    this.propTextures.set(PropType.FLOWERS_WILD, flowersRedTex);
    this.propTextures.set(PropType.FLOWERS_BLUE, flowersBlueTex);
    this.propTextures.set(PropType.ROCK_BOULDER, rockTex);
    this.propTextures.set(PropType.SIGNPOST, signpostTex);
    this.propTextures.set(PropType.CRATE, crateTex);
    this.propTextures.set(PropType.HOUSE_FACADE, houseFacadeTex);
    this.propTextures.set(PropType.BUSH_BERRY, bushSmallTex);

    // Overworld Mapamundi Props (Exclusively MiniWorldSprites)
    this.overworldPropTypes.set(PropType.TOWN_CASTLE, extractTileFromSheet('/map/MiniWorldSprites/Buildings/Wood/Keep.png', 0, 0, 32, 32));
    this.overworldPropTypes.set(PropType.TOWN_VILLAGE, extractTileFromSheet('/map/MiniWorldSprites/Buildings/Wood/Houses.png', 0, 0, 16, 16));
    this.overworldPropTypes.set(PropType.TOWN_FARM, extractTileFromSheet('/map/MiniWorldSprites/Buildings/Wood/Resources.png', 0, 32, 32, 32));
    this.overworldPropTypes.set(PropType.TOWN_TEMPLE, extractTileFromSheet('/map/MiniWorldSprites/Buildings/Wood/Chapels.png', 0, 0, 32, 32));
    this.overworldPropTypes.set(PropType.TOWN_LUMBERMILL, extractTileFromSheet('/map/MiniWorldSprites/Buildings/Wood/Resources.png', 0, 0, 32, 32));
    this.overworldPropTypes.set(PropType.TOWN_RUINS, extractTileFromSheet('/map/MiniWorldSprites/Buildings/Enemy/Mausoleum.png', 0, 0, 32, 32));
    this.overworldPropTypes.set(PropType.TOWN_PORT, extractTileFromSheet('/map/MiniWorldSprites/Buildings/Wood/Docks.png', 0, 0, 32, 32));
    this.overworldPropTypes.set(PropType.TOWN_CAVE, extractTileFromSheet('/map/MiniWorldSprites/Buildings/Wood/CaveV2.png', 0, 0, 32, 32));
    this.overworldPropTypes.set(PropType.CAVE_ENTRANCE, extractTileFromSheet('/map/MiniWorldSprites/Buildings/Wood/CaveV2.png', 0, 0, 32, 32));
    this.overworldPropTypes.set(PropType.WINDMILL, extractTileFromSheet('/map/MiniWorldSprites/Buildings/Wood/Resources.png', 0, 32, 32, 32));
    this.overworldPropTypes.set(PropType.WHEATFIELD, extractTileFromSheet('/map/MiniWorldSprites/Nature/Wheatfield.png', 0, 0, 16, 16));
    this.overworldPropTypes.set(PropType.TREE_OAK, extractTileFromSheet('/map/MiniWorldSprites/Nature/Trees.png', 0, 0, 16, 16));
    this.overworldPropTypes.set(PropType.TREE_PINE, extractTileFromSheet('/map/MiniWorldSprites/Nature/PineTrees.png', 0, 0, 16, 16));
    this.overworldPropTypes.set(PropType.PINE_TREE, extractTileFromSheet('/map/MiniWorldSprites/Nature/PineTrees.png', 0, 0, 16, 16));
    this.overworldPropTypes.set(PropType.TREE_PALM, extractTileFromSheet('/map/MiniWorldSprites/Nature/CoconutTrees.png', 0, 0, 16, 16));
    this.overworldPropTypes.set(PropType.TREE_WINTER, extractTileFromSheet('/map/MiniWorldSprites/Nature/WinterTrees.png', 0, 0, 16, 16));
    this.overworldPropTypes.set(PropType.ROCK_BOULDER, extractTileFromSheet('/map/MiniWorldSprites/Nature/Rocks.png', 0, 0, 16, 16));
    this.overworldPropTypes.set(PropType.BOAT, extractTileFromSheet('/map/MiniWorldSprites/Miscellaneous/Boat.png', 0, 0, 16, 16));
    this.overworldPropTypes.set(PropType.BUSH_BERRY, extractTileFromSheet('/map/MiniWorldSprites/Nature/Trees.png', 16, 0, 16, 16));
    this.overworldPropTypes.set(PropType.SIGNPOST, extractTileFromSheet('/map/MiniWorldSprites/Miscellaneous/Signs.png', 0, 0, 16, 16));
    this.overworldPropTypes.set(PropType.PORTAL_OVERWORLD, extractTileFromSheet('/map/MiniWorldSprites/Miscellaneous/Portal.png', 0, 0, 16, 16));

    // City Mappings (using engine procedural pixel art until custom sprites are supplied)
    // Arcane Overworld Portal (48x64)
    const portalOverworldTex = createPixelTexture(48, 64, (ctx) => {
      ctx.clearRect(0, 0, 48, 64);
      // Outer runic stone pillar arch
      ctx.fillStyle = '#1e1b4b'; // Dark obsidian / indigo stone
      ctx.fillRect(4, 12, 8, 50); // Left pillar
      ctx.fillRect(36, 12, 8, 50); // Right pillar
      ctx.fillRect(6, 6, 36, 10); // Arch top
      ctx.fillRect(10, 2, 28, 6); // Crown

      // Stone highlights and bevels
      ctx.fillStyle = '#312e81';
      ctx.fillRect(6, 12, 4, 48);
      ctx.fillRect(38, 12, 4, 48);
      ctx.fillRect(8, 4, 32, 4);

      // Carved gold / cyan glowing runes on pillars
      ctx.fillStyle = '#38bdf8'; // Glowing cyan runes
      ctx.fillRect(6, 18, 4, 3);
      ctx.fillRect(7, 28, 3, 4);
      ctx.fillRect(6, 40, 4, 3);
      ctx.fillRect(7, 52, 3, 3);

      ctx.fillStyle = '#f59e0b'; // Gold runes
      ctx.fillRect(38, 18, 4, 3);
      ctx.fillRect(38, 30, 3, 4);
      ctx.fillRect(38, 42, 4, 3);
      ctx.fillRect(37, 52, 4, 3);

      // Keystone crystal on arch top
      ctx.fillStyle = '#a855f7';
      ctx.fillRect(21, 2, 6, 8);
      ctx.fillStyle = '#e9d5ff';
      ctx.fillRect(23, 4, 2, 4);

      // Swirling vortex interior
      const grad = ctx.createRadialGradient(24, 38, 2, 24, 38, 20);
      grad.addColorStop(0, '#f0abfc'); // Bright magenta core
      grad.addColorStop(0.3, '#818cf8'); // Indigo shimmer
      grad.addColorStop(0.6, '#06b6d4'); // Cyan vortex
      grad.addColorStop(0.9, '#3b0764'); // Deep purple edge
      grad.addColorStop(1, 'transparent');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(24, 38, 15, 23, 0, 0, Math.PI * 2);
      ctx.fill();

      // Magical stars and sparkles inside vortex
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(23, 30, 2, 2);
      ctx.fillRect(28, 42, 2, 2);
      ctx.fillRect(18, 44, 2, 2);
      ctx.fillRect(20, 26, 1.5, 1.5);
      ctx.fillRect(27, 24, 1.5, 1.5);
      ctx.fillRect(24, 48, 2, 2);

      // Base runic altar / step
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(2, 60, 44, 4);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(8, 61, 32, 2);
    });

    this.propTextures.set(PropType.PORTAL_OVERWORLD, portalOverworldTex);
    this.propTextures.set(PropType.FOUNTAIN, fountainTex);
    this.propTextures.set(PropType.STREET_LAMP, streetLampTex);
    this.propTextures.set(PropType.STREET_LAMP_ALT, streetLampTex);
    this.propTextures.set(PropType.MARKET_STALL_RED, marketStallRedTex);
    this.propTextures.set(PropType.MARKET_STALL_BLUE, marketStallBlueTex);
    this.propTextures.set(PropType.BARRELS_STACK, barrelsStackTex);
    this.propTextures.set(PropType.BARREL_SINGLE, barrelSingleTex);
    this.propTextures.set(PropType.CRATE_STACK, crateStackTex);
    this.propTextures.set(PropType.BENCH_WOOD, benchWoodTex);
    this.propTextures.set(PropType.SHOP_HOUSE_1, shopHouse1Tex);
    this.propTextures.set(PropType.SHOP_HOUSE_2, shopHouse2Tex);
    this.propTextures.set(PropType.SHOP_HOUSE_3, shopHouse3Tex);
    this.propTextures.set(PropType.MANOR_HOUSE, manorHouseTex);
    this.propTextures.set(PropType.GUILD_HALL, guildHallTex);
  }

  private initPlayer4x4Spritesheet(): void {
    const textureLoader = new THREE.TextureLoader();
    this.playerSpritesheetTexture = textureLoader.load('/spritesheets/frame_000.webp', (tex) => {
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      tex.generateMipmaps = false;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
    });
  }

  public setMode(mode: 'local' | 'overworld'): void {
    this.currentMode = mode;
  }

  public getMode(): 'local' | 'overworld' {
    return this.currentMode;
  }

  public getMaterial(tileType: TileType): THREE.Material | THREE.Material[] {
    if (this.currentMode === 'overworld') {
      return this.overworldMaterials.get(tileType) || this.overworldMaterials.get(TileType.GRASS) || this.materials.get(TileType.GRASS)!;
    }
    return this.materials.get(tileType) || this.materials.get(TileType.GRASS)!;
  }

  public getPropTexture(type: PropType): THREE.Texture {
    if (this.currentMode === 'overworld') {
      return this.overworldPropTypes.get(type) || this.overworldPropTypes.get(PropType.TREE_OAK) || this.propTextures.get(type)!;
    }
    return this.propTextures.get(type) || this.propTextures.get(PropType.PINE_TREE)!;
  }

  public getPlayerSpritesheetTexture(): THREE.Texture {
    return this.playerSpritesheetTexture;
  }

  private initArcherPlayerSpritesheet(): void {
    const textureLoader = new THREE.TextureLoader();
    this.archerSpritesheetTexture = textureLoader.load('/spritesheets/frame_001.webp', (tex) => {
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      tex.generateMipmaps = false;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
    });
  }

  public getArcherPlayerSpritesheetTexture(): THREE.Texture {
    return this.archerSpritesheetTexture;
  }

  private headSpritesheetTexture!: THREE.Texture;

  private initHeadSpritesheet(): void {
    const textureLoader = new THREE.TextureLoader();
    this.headSpritesheetTexture = textureLoader.load('/spritesheets/base_head_spritesheet.png', (tex) => {
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      tex.generateMipmaps = false;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
    });
  }

  public getHeadSpritesheetTexture(): THREE.Texture {
    return this.headSpritesheetTexture;
  }

  private initEnemy4x4Spritesheet(): void {
    // 64x96 Canvas = 4 columns (16px) x 4 rows (24px) for Slime/Goblin enemy
    this.enemySpritesheetTexture = createPixelTexture(64, 96, (ctx) => {
      ctx.clearRect(0, 0, 64, 96);

      const drawEnemyFrame = (col: number, row: number, dir: 'DOWN' | 'UP' | 'LEFT' | 'RIGHT', stepFrame: number) => {
        const x0 = col * 16;
        const y0 = row * 24;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(x0 + 2, y0 + 20, 12, 3);

        // Slime body pulse / squish animation
        let squishY = 0;
        let squishX = 0;
        if (stepFrame === 1 || stepFrame === 3) {
          squishY = 1;
          squishX = -1;
        }

        // Dark Purple/Crimson Slime Body
        ctx.fillStyle = '#6b21a8'; // Deep Purple
        ctx.fillRect(x0 + 2 + squishX, y0 + 10 + squishY, 12, 11);
        ctx.fillRect(x0 + 4 + squishX, y0 + 8 + squishY, 8, 2);

        // Highlight
        ctx.fillStyle = '#a855f7';
        ctx.fillRect(x0 + 4 + squishX, y0 + 10 + squishY, 4, 3);

        // Glowing Red / Yellow Eyes
        ctx.fillStyle = '#facc15'; // Glowing Yellow eyes
        if (dir === 'DOWN') {
          ctx.fillRect(x0 + 4, y0 + 13 + squishY, 3, 3);
          ctx.fillRect(x0 + 9, y0 + 13 + squishY, 3, 3);
          ctx.fillStyle = '#dc2626'; // Red pupils
          ctx.fillRect(x0 + 5, y0 + 14 + squishY, 1, 1);
          ctx.fillRect(x0 + 10, y0 + 14 + squishY, 1, 1);
        } else if (dir === 'LEFT') {
          ctx.fillRect(x0 + 3, y0 + 13 + squishY, 3, 3);
          ctx.fillStyle = '#dc2626';
          ctx.fillRect(x0 + 4, y0 + 14 + squishY, 1, 1);
        } else if (dir === 'RIGHT') {
          ctx.fillRect(x0 + 10, y0 + 13 + squishY, 3, 3);
          ctx.fillStyle = '#dc2626';
          ctx.fillRect(x0 + 11, y0 + 14 + squishY, 1, 1);
        }
      };

      const directions: Array<'DOWN' | 'RIGHT' | 'UP' | 'LEFT'> = ['DOWN', 'RIGHT', 'UP', 'LEFT'];

      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          drawEnemyFrame(c, r, directions[r], c);
        }
      }
    });
  }

  private initSlashEffectTexture(): void {
    // 32x32 Canvas for attack slash arc
    this.slashEffectTexture = createPixelTexture(32, 32, (ctx) => {
      ctx.clearRect(0, 0, 32, 32);

      // Crescent Slash Arc
      ctx.fillStyle = '#fef08a'; // Glowing yellow/white
      ctx.beginPath();
      ctx.arc(16, 16, 12, Math.PI * 0.8, Math.PI * 1.8);
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#fde047';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(16, 16, 10, Math.PI * 0.9, Math.PI * 1.7);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
    });
  }

  public getEnemySpritesheetTexture(): THREE.CanvasTexture {
    return this.enemySpritesheetTexture;
  }

  public getSlashEffectTexture(): THREE.CanvasTexture {
    return this.slashEffectTexture;
  }
}
