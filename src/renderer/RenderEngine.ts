import * as THREE from 'three';
import { OctopathCamera } from './OctopathCamera';
import { DioramaPipeline } from './postprocessing/DioramaPipeline';
import { DioramaPostProcessingConfig, DioramaPartialConfig } from './postprocessing/dioramaConfig';
import { PerformanceManager, PerformanceConfig } from './PerformanceProfile';
import { CurvedWorldManager } from './CurvedWorldManager';

export class RenderEngine {
  public readonly scene: THREE.Scene;
  public readonly renderer: THREE.WebGLRenderer;
  public readonly octopathCamera: OctopathCamera;
  public readonly dioramaPipeline: DioramaPipeline;
  public readonly performanceManager: PerformanceManager;
  public readonly curvedWorldManager: CurvedWorldManager;
  private container: HTMLElement;
  private dirLight: THREE.DirectionalLight;
  private ambientLight: THREE.AmbientLight;
  private hemiLight: THREE.HemisphereLight;
  private resizeObserver?: ResizeObserver;
  private unbindPerformanceListener?: () => void;

  constructor(container: HTMLElement, customConfig?: DioramaPartialConfig) {
    this.container = container;
    this.performanceManager = PerformanceManager.getInstance();
    this.curvedWorldManager = CurvedWorldManager.getInstance();
    const perfConfig = this.performanceManager.getConfig();

    // 1. Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x7dd3fc); // Vivid HD-2D sky cyan
    this.scene.fog = new THREE.FogExp2(0x93c5fd, 0.012); // Subtle atmospheric depth fog

    // 2. Camera setup
    const aspect = container.clientWidth / container.clientHeight || 1;
    this.octopathCamera = new OctopathCamera(aspect);

    // 3. WebGL Renderer setup (Tailored for mobile fill-rate efficiency)
    this.renderer = new THREE.WebGLRenderer({
      antialias: false, // Turned off to maintain razor-sharp pixel art textures & max performance
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
      precision: perfConfig.isMobile ? 'mediump' : 'highp',
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(perfConfig.pixelRatio);
    this.renderer.shadowMap.enabled = perfConfig.shadowsEnabled;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    container.appendChild(this.renderer.domElement);

    // 4. Lighting setup (Diorama HD-2D: Golden sunlight + Sky ambient fill + Ground bounce)
    this.ambientLight = new THREE.AmbientLight(0xffedd5, 0.6);
    this.scene.add(this.ambientLight);

    // Hemisphere light for subtle vertical voxel contrast
    this.hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x475569, 0.45);
    this.scene.add(this.hemiLight);

    // Golden directional sun with mobile-optimized tight frustum
    this.dirLight = new THREE.DirectionalLight(0xfff7ed, 1.4);
    this.dirLight.position.set(16, 28, 22);
    this.dirLight.castShadow = perfConfig.shadowsEnabled;
    this.dirLight.shadow.mapSize.width = perfConfig.shadowMapSize;
    this.dirLight.shadow.mapSize.height = perfConfig.shadowMapSize;
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 65;
    const shadowCamSize = 22;
    this.dirLight.shadow.camera.left = -shadowCamSize;
    this.dirLight.shadow.camera.right = shadowCamSize;
    this.dirLight.shadow.camera.top = shadowCamSize;
    this.dirLight.shadow.camera.bottom = -shadowCamSize;
    this.dirLight.shadow.bias = -0.0004;

    this.scene.add(this.dirLight);

    // 5. Initialize Diorama Post-Processing Pipeline
    this.dioramaPipeline = new DioramaPipeline(
      this.renderer,
      this.scene,
      this.octopathCamera.camera,
      {
        ...customConfig,
        enabled: perfConfig.postProcessingEnabled,
        bloom: { enabled: perfConfig.bloomEnabled },
        tiltShift: { enabled: perfConfig.tiltShiftEnabled },
        colorGrading: { enabled: perfConfig.colorGradingEnabled },
        vignette: { enabled: perfConfig.vignetteEnabled },
      }
    );

    // 6. Listen for dynamic performance profile changes
    this.unbindPerformanceListener = this.performanceManager.onChange((config) => {
      this.applyPerformanceConfig(config);
    });

    // 7. Setup auto-resize listener
    this.setupResizeHandler();
  }

  public applyPerformanceConfig(config: PerformanceConfig): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.renderer.setPixelRatio(config.pixelRatio);
    this.renderer.setSize(width, height);

    this.renderer.shadowMap.enabled = config.shadowsEnabled;
    this.dirLight.castShadow = config.shadowsEnabled;
    if (this.dirLight.shadow.map) {
      this.dirLight.shadow.mapSize.width = config.shadowMapSize;
      this.dirLight.shadow.mapSize.height = config.shadowMapSize;
      this.dirLight.shadow.map.dispose();
      this.dirLight.shadow.map = null as any;
    }

    this.dioramaPipeline.updateConfig({
      enabled: config.postProcessingEnabled,
      bloom: { enabled: config.bloomEnabled },
      tiltShift: { enabled: config.tiltShiftEnabled },
      colorGrading: { enabled: config.colorGradingEnabled },
      vignette: { enabled: config.vignetteEnabled },
    });
    this.dioramaPipeline.setSize(width, height);
  }

  private setupResizeHandler(): void {
    this.resizeObserver = new ResizeObserver(() => {
      this.onWindowResize();
    });
    this.resizeObserver.observe(this.container);
  }

  public onWindowResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width === 0 || height === 0) return;

    this.octopathCamera.handleResize(width / height);
    this.renderer.setSize(width, height);
    this.dioramaPipeline.setSize(width, height);
  }

  public render(dt: number = 0.016): void {
    this.dioramaPipeline.render(dt);
  }

  public destroy(): void {
    if (this.unbindPerformanceListener) {
      this.unbindPerformanceListener();
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    this.dioramaPipeline.dispose();
    this.renderer.dispose();
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
  }

  public setLightIntensity(dir: number, ambient: number): void {
    this.dirLight.intensity = dir;
    this.ambientLight.intensity = ambient;
  }
}

