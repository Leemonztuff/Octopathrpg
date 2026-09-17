import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';

import { DioramaPostProcessingConfig, DEFAULT_DIORAMA_CONFIG, DioramaPartialConfig } from './dioramaConfig';
import { TiltShiftShader } from './TiltShiftShader';
import { DioramaColorGradingShader } from './DioramaColorGradingShader';

export interface PerformanceStats {
  fps: number;
  frameTimeMs: number;
  passesCount: number;
}

export class DioramaPipeline {
  private composer: EffectComposer;
  private renderPass: RenderPass;
  private bloomPass: UnrealBloomPass;
  private tiltShiftPass: ShaderPass;
  private colorGradingPass: ShaderPass;
  private ssaoPass?: SSAOPass;
  private fxaaPass?: ShaderPass;

  private config: DioramaPostProcessingConfig;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.Camera;

  // Frame Timing & Profiling
  private lastTime: number = performance.now();
  private frameCount: number = 0;
  private accumulatedTime: number = 0;
  private currentFps: number = 60;
  private lastFrameDuration: number = 16.6;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    customConfig?: DioramaPartialConfig
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    // Deep merge configuration
    this.config = {
      ...DEFAULT_DIORAMA_CONFIG,
      ...customConfig,
      bloom: { ...DEFAULT_DIORAMA_CONFIG.bloom, ...(customConfig?.bloom || {}) },
      tiltShift: { ...DEFAULT_DIORAMA_CONFIG.tiltShift, ...(customConfig?.tiltShift || {}) },
      colorGrading: { ...DEFAULT_DIORAMA_CONFIG.colorGrading, ...(customConfig?.colorGrading || {}) },
      vignette: { ...DEFAULT_DIORAMA_CONFIG.vignette, ...(customConfig?.vignette || {}) },
      ssao: { ...DEFAULT_DIORAMA_CONFIG.ssao, ...(customConfig?.ssao || {}) },
      fxaa: { ...DEFAULT_DIORAMA_CONFIG.fxaa, ...(customConfig?.fxaa || {}) },
    };

    const size = new THREE.Vector2();
    renderer.getSize(size);

    // 1. Initialize Composer with High-Precision Render Target
    const renderTarget = new THREE.WebGLRenderTarget(size.x || 800, size.y || 600, {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
    });
    this.composer = new EffectComposer(renderer, renderTarget);

    // 2. Base Scene Render Pass (Ground truth)
    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);

    // 3. Optional SSAO Pass (Ambient Occlusion for voxel crevices)
    if (this.config.ssao.enabled) {
      this.initSsaoPass(size);
    }

    // 4. Unreal Bloom Pass (Glowing torches, hit flashes, sun highlights)
    this.bloomPass = new UnrealBloomPass(
      size,
      this.config.bloom.strength,
      this.config.bloom.radius,
      this.config.bloom.threshold
    );
    this.bloomPass.enabled = this.config.bloom.enabled;
    this.composer.addPass(this.bloomPass);

    // 5. Miniature Tilt-Shift / Depth-of-Field Shader Pass
    this.tiltShiftPass = new ShaderPass(TiltShiftShader);
    this.updateTiltShiftUniforms(size.x, size.y);
    this.composer.addPass(this.tiltShiftPass);

    // 6. Color Grading & Subtle Vignette Shader Pass (Single-pass)
    this.colorGradingPass = new ShaderPass(DioramaColorGradingShader);
    this.updateColorGradingUniforms();
    this.composer.addPass(this.colorGradingPass);

    // 7. Optional FXAA Pass (Kept off by default to preserve pixel art)
    if (this.config.fxaa.enabled) {
      this.initFxaaPass(size);
    }
  }

  private initSsaoPass(size: THREE.Vector2): void {
    try {
      this.ssaoPass = new SSAOPass(this.scene, this.camera, size.x, size.y);
      this.ssaoPass.kernelRadius = this.config.ssao.radius;
      this.ssaoPass.minDistance = 0.001;
      this.ssaoPass.maxDistance = 0.1;
      this.ssaoPass.enabled = this.config.ssao.enabled;
      // Insert after render pass
      this.composer.insertPass(this.ssaoPass, 1);
    } catch (e) {
      console.warn('SSAO could not be initialized:', e);
    }
  }

  private initFxaaPass(size: THREE.Vector2): void {
    this.fxaaPass = new ShaderPass(FXAAShader);
    const pixelRatio = this.renderer.getPixelRatio();
    this.fxaaPass.material.uniforms['resolution'].value.x = 1 / (size.x * pixelRatio);
    this.fxaaPass.material.uniforms['resolution'].value.y = 1 / (size.y * pixelRatio);
    this.fxaaPass.enabled = this.config.fxaa.enabled;
    this.composer.addPass(this.fxaaPass);
  }

  private updateTiltShiftUniforms(width: number, height: number): void {
    const u = this.tiltShiftPass.uniforms;
    u.focusPosition.value = this.config.tiltShift.focusPosition;
    u.focusRange.value = this.config.tiltShift.focusRange;
    u.maxBlur.value = this.config.tiltShift.maxBlur;
    u.smoothStep.value = this.config.tiltShift.smoothStep;
    u.resolution.value.set(width, height);
    u.enabled.value = (this.config.enabled && this.config.tiltShift.enabled) ? 1.0 : 0.0;
  }

  private updateColorGradingUniforms(): void {
    const u = this.colorGradingPass.uniforms;
    u.contrast.value = this.config.colorGrading.contrast;
    u.saturation.value = this.config.colorGrading.saturation;
    u.warmth.value = this.config.colorGrading.warmth;
    u.brightness.value = this.config.colorGrading.brightness;
    u.vignetteOffset.value = this.config.vignette.offset;
    u.vignetteDarkness.value = this.config.vignette.darkness;
    u.vignetteEnabled.value = (this.config.enabled && this.config.vignette.enabled) ? 1.0 : 0.0;
    u.colorGradingEnabled.value = (this.config.enabled && this.config.colorGrading.enabled) ? 1.0 : 0.0;
  }

  public setSize(width: number, height: number): void {
    if (width <= 0 || height <= 0) return;
    this.composer.setSize(width, height);

    if (this.bloomPass) {
      this.bloomPass.setSize(width, height);
    }
    if (this.tiltShiftPass) {
      this.tiltShiftPass.uniforms.resolution.value.set(width, height);
    }
    if (this.ssaoPass) {
      this.ssaoPass.setSize(width, height);
    }
    if (this.fxaaPass) {
      const pixelRatio = this.renderer.getPixelRatio();
      this.fxaaPass.material.uniforms['resolution'].value.x = 1 / (width * pixelRatio);
      this.fxaaPass.material.uniforms['resolution'].value.y = 1 / (height * pixelRatio);
    }
  }

  public updateConfig(newConfig: DioramaPartialConfig): void {
    // Merge new config
    if (newConfig.enabled !== undefined) this.config.enabled = newConfig.enabled;
    if (newConfig.bloom) Object.assign(this.config.bloom, newConfig.bloom);
    if (newConfig.tiltShift) Object.assign(this.config.tiltShift, newConfig.tiltShift);
    if (newConfig.colorGrading) Object.assign(this.config.colorGrading, newConfig.colorGrading);
    if (newConfig.vignette) Object.assign(this.config.vignette, newConfig.vignette);
    if (newConfig.ssao) Object.assign(this.config.ssao, newConfig.ssao);
    if (newConfig.fxaa) Object.assign(this.config.fxaa, newConfig.fxaa);

    // Apply to passes
    if (this.bloomPass) {
      this.bloomPass.enabled = this.config.enabled && this.config.bloom.enabled;
      this.bloomPass.strength = this.config.bloom.strength;
      this.bloomPass.radius = this.config.bloom.radius;
      this.bloomPass.threshold = this.config.bloom.threshold;
    }

    if (this.tiltShiftPass) {
      const size = new THREE.Vector2();
      this.renderer.getSize(size);
      this.updateTiltShiftUniforms(size.x, size.y);
    }

    if (this.colorGradingPass) {
      this.updateColorGradingUniforms();
    }

    if (this.ssaoPass) {
      this.ssaoPass.enabled = this.config.enabled && this.config.ssao.enabled;
      this.ssaoPass.kernelRadius = this.config.ssao.radius;
    }

    if (this.fxaaPass) {
      this.fxaaPass.enabled = this.config.enabled && this.config.fxaa.enabled;
    }
  }

  public getConfig(): DioramaPostProcessingConfig {
    return JSON.parse(JSON.stringify(this.config));
  }

  public render(delta: number = 0.016): void {
    const startTime = performance.now();

    if (!this.config.enabled) {
      // Direct raw render fallback (0 overhead)
      this.renderer.render(this.scene, this.camera);
    } else {
      // Full Diorama Post-processing chain
      this.composer.render(delta);
    }

    const endTime = performance.now();
    this.lastFrameDuration = endTime - startTime;

    // Calculate FPS
    this.frameCount++;
    this.accumulatedTime += (endTime - this.lastTime);
    this.lastTime = endTime;

    if (this.accumulatedTime >= 500) { // Update FPS counter every half second
      this.currentFps = Math.round((this.frameCount * 1000) / this.accumulatedTime);
      this.frameCount = 0;
      this.accumulatedTime = 0;
    }
  }

  public getPerformanceStats(): PerformanceStats {
    let activePasses = 1; // RenderPass
    if (this.config.enabled) {
      if (this.config.bloom.enabled) activePasses++;
      if (this.config.tiltShift.enabled) activePasses++;
      if (this.config.colorGrading.enabled || this.config.vignette.enabled) activePasses++;
      if (this.config.ssao.enabled && this.ssaoPass) activePasses++;
      if (this.config.fxaa.enabled && this.fxaaPass) activePasses++;
    }

    return {
      fps: this.currentFps,
      frameTimeMs: Number(this.lastFrameDuration.toFixed(2)),
      passesCount: activePasses,
    };
  }

  public dispose(): void {
    this.composer.dispose();
  }
}
