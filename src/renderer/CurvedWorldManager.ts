import * as THREE from 'three';

export type CurvedWorldMode = 'off' | 'horizon' | 'spherical';

export interface CurvedWorldConfig {
  mode: CurvedWorldMode;
  curvature: number;
}

export class CurvedWorldManager {
  private static instance: CurvedWorldManager | null = null;

  public mode: CurvedWorldMode = 'off';
  public curvature: number = 0.007; // Pronounced curved world (Animal Crossing / Rolling Log style)
  public origin: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  // Shared uniforms across all materials
  public uniforms: {
    uCurvature: { value: number };
    uCurvatureOrigin: { value: THREE.Vector3 };
    uCurvatureMode: { value: number };
  };

  private listeners: Array<(config: CurvedWorldConfig) => void> = [];
  private processedMaterials: WeakSet<THREE.Material> = new WeakSet();

  constructor() {
    // Restore saved preference or default to 'off'
    const saved = (typeof localStorage !== 'undefined' ? localStorage.getItem('hd2d_curved_world_mode') : null) as CurvedWorldMode | null;
    if (saved && (saved === 'off' || saved === 'horizon' || saved === 'spherical')) {
      this.mode = saved;
    }

    const modeInt = this.mode === 'horizon' ? 1 : this.mode === 'spherical' ? 2 : 0;

    this.uniforms = {
      uCurvature: { value: this.curvature },
      uCurvatureOrigin: { value: this.origin },
      uCurvatureMode: { value: modeInt },
    };
  }

  public static getInstance(): CurvedWorldManager {
    if (!CurvedWorldManager.instance) {
      CurvedWorldManager.instance = new CurvedWorldManager();
    }
    return CurvedWorldManager.instance;
  }

  public setMode(mode: CurvedWorldMode): void {
    this.mode = mode;
    this.uniforms.uCurvatureMode.value = mode === 'horizon' ? 1 : mode === 'spherical' ? 2 : 0;
    try {
      localStorage.setItem('hd2d_curved_world_mode', mode);
    } catch {
      // Ignore in restricted iframe contexts
    }
    this.notifyListeners();
  }

  public setCurvature(val: number): void {
    this.curvature = val;
    this.uniforms.uCurvature.value = val;
  }

  public updateOrigin(playerPos: THREE.Vector3): void {
    this.origin.copy(playerPos);
    this.uniforms.uCurvatureOrigin.value.copy(playerPos);
  }

  public onChange(cb: (config: CurvedWorldConfig) => void): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private notifyListeners(): void {
    const cfg: CurvedWorldConfig = { mode: this.mode, curvature: this.curvature };
    for (const cb of this.listeners) {
      cb(cfg);
    }
  }

  /**
   * Injects curved world vertex transformation into any Three.js Material
   */
  public injectCurvedWorld(material: THREE.Material): void {
    if (!material || this.processedMaterials.has(material)) return;
    this.processedMaterials.add(material);

    const prevOnBeforeCompile = material.onBeforeCompile;

    material.onBeforeCompile = (shader, renderer) => {
      if (prevOnBeforeCompile) {
        prevOnBeforeCompile(shader, renderer);
      }

      // Link shared uniforms
      shader.uniforms.uCurvature = this.uniforms.uCurvature;
      shader.uniforms.uCurvatureOrigin = this.uniforms.uCurvatureOrigin;
      shader.uniforms.uCurvatureMode = this.uniforms.uCurvatureMode;

      // 1. Inject uniforms declarations into Vertex Shader header
      shader.vertexShader = `
        uniform float uCurvature;
        uniform vec3 uCurvatureOrigin;
        uniform int uCurvatureMode;
        ${shader.vertexShader}
      `;

      // 2. Replace the project_vertex include to bend vertices in world space before projection
      const projectVertexHook = '#include <project_vertex>';
      const curvedVertexChunk = `
        vec4 worldPos = vec4( transformed, 1.0 );
        #ifdef USE_INSTANCING
          worldPos = instanceMatrix * worldPos;
        #endif
        worldPos = modelMatrix * worldPos;

        if (uCurvatureMode > 0 && uCurvature > 0.0) {
          vec2 diff = worldPos.xz - uCurvatureOrigin.xz;
          float distSq = 0.0;
          if (uCurvatureMode == 1) {
            // Animal Crossing Horizon Roll: Curvature along Z depth with proportional lateral curvature
            distSq = (diff.y * diff.y * 1.1) + (diff.x * diff.x * 0.4);
          } else if (uCurvatureMode == 2) {
            // Spherical Little Prince / Galaxy planetoid: Full radial curvature
            distSq = dot(diff, diff);
          }
          worldPos.y -= distSq * uCurvature;
        }

        vec4 mvPosition = viewMatrix * worldPos;
        gl_Position = projectionMatrix * mvPosition;
      `;

      if (shader.vertexShader.includes(projectVertexHook)) {
        shader.vertexShader = shader.vertexShader.replace(projectVertexHook, curvedVertexChunk);
      }
    };

    material.needsUpdate = true;
  }

  /**
   * Recursively traverses a scene or object group and ensures all materials have the curved shader hook.
   */
  public hookSceneObjects(root: THREE.Object3D): void {
    root.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh || (obj as THREE.Sprite).isSprite) {
        const mesh = obj as THREE.Mesh;
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((mat) => this.injectCurvedWorld(mat));
        } else if (mesh.material) {
          this.injectCurvedWorld(mesh.material);
        }
      }
    });
  }
}
