import * as THREE from 'three';

export type QualityLevel = 'low' | 'medium' | 'high' | 'auto';

export interface PerformanceConfig {
  preset: QualityLevel;
  actualLevel: 'low' | 'medium' | 'high';
  pixelRatio: number;
  shadowMapSize: number;
  shadowsEnabled: boolean;
  postProcessingEnabled: boolean;
  bloomEnabled: boolean;
  tiltShiftEnabled: boolean;
  colorGradingEnabled: boolean;
  vignetteEnabled: boolean;
  isMobile: boolean;
}

export class PerformanceManager {
  private static instance: PerformanceManager | null = null;
  public readonly isMobile: boolean;
  public currentPreset: QualityLevel = 'auto';
  private actualLevel: 'low' | 'medium' | 'high' = 'medium';
  private listeners: Array<(config: PerformanceConfig) => void> = [];

  // Dynamic FPS auto-adaptation
  private lowFpsCounter: number = 0;
  private highFpsCounter: number = 0;

  constructor() {
    this.isMobile = this.detectMobile();
    // Default preset: in mobile start in low/fluid for buttery 60fps
    const saved = localStorage.getItem('hd2d_quality_preset') as QualityLevel | null;
    this.currentPreset = saved || (this.isMobile ? 'low' : 'high');
    this.recalculateActualLevel();
  }

  public static getInstance(): PerformanceManager {
    if (!PerformanceManager.instance) {
      PerformanceManager.instance = new PerformanceManager();
    }
    return PerformanceManager.instance;
  }

  private detectMobile(): boolean {
    if (typeof window === 'undefined') return false;
    const ua = navigator.userAgent || '';
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua);
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isSmallScreen = window.innerWidth <= 840;
    return isMobileUA || (isTouch && isSmallScreen);
  }

  public setPreset(preset: QualityLevel): void {
    this.currentPreset = preset;
    try {
      localStorage.setItem('hd2d_quality_preset', preset);
    } catch {
      // Ignore localStorage errors in iframe
    }
    this.recalculateActualLevel();
    this.notifyListeners();
  }

  private recalculateActualLevel(): void {
    if (this.currentPreset === 'auto') {
      this.actualLevel = this.isMobile ? 'low' : 'medium';
    } else {
      this.actualLevel = this.currentPreset;
    }
  }

  public getConfig(): PerformanceConfig {
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio : 1;

    switch (this.actualLevel) {
      case 'low': // Fluid 60 FPS for Low-End Mobile & Battery Saving
        return {
          preset: this.currentPreset,
          actualLevel: 'low',
          pixelRatio: 1.0, // Strict 1.0 DPR stops GPU fillrate bottleneck on high-res mobile screens
          shadowMapSize: 512,
          shadowsEnabled: true,
          postProcessingEnabled: false, // Direct raw pipeline = 0 pass overhead
          bloomEnabled: false,
          tiltShiftEnabled: false,
          colorGradingEnabled: false,
          vignetteEnabled: false,
          isMobile: this.isMobile,
        };

      case 'medium': // Balanced for modern phones / laptops
        return {
          preset: this.currentPreset,
          actualLevel: 'medium',
          pixelRatio: Math.min(dpr, 1.25),
          shadowMapSize: 1024,
          shadowsEnabled: true,
          postProcessingEnabled: true,
          bloomEnabled: true,
          tiltShiftEnabled: true,
          colorGradingEnabled: true,
          vignetteEnabled: true,
          isMobile: this.isMobile,
        };

      case 'high': // Full HD-2D Diorama for Desktop / Flagships
      default:
        return {
          preset: this.currentPreset,
          actualLevel: 'high',
          pixelRatio: Math.min(dpr, 1.75),
          shadowMapSize: 1024,
          shadowsEnabled: true,
          postProcessingEnabled: true,
          bloomEnabled: true,
          tiltShiftEnabled: true,
          colorGradingEnabled: true,
          vignetteEnabled: true,
          isMobile: this.isMobile,
        };
    }
  }

  /**
   * Called periodically by the game loop with the current FPS.
   * In 'auto' mode, if FPS drops below 35 for 3 consecutive checks,
   * automatically scales down to maintain 60 FPS smoothness.
   */
  public reportFps(fps: number): void {
    if (this.currentPreset !== 'auto') return;

    if (fps < 38) {
      this.lowFpsCounter++;
      this.highFpsCounter = 0;
      if (this.lowFpsCounter >= 3 && this.actualLevel !== 'low') {
        this.actualLevel = 'low';
        this.lowFpsCounter = 0;
        this.notifyListeners();
      }
    } else if (fps > 55) {
      this.highFpsCounter++;
      this.lowFpsCounter = 0;
      if (this.highFpsCounter >= 10 && this.actualLevel === 'low' && !this.isMobile) {
        this.actualLevel = 'medium';
        this.highFpsCounter = 0;
        this.notifyListeners();
      }
    }
  }

  public onChange(callback: (config: PerformanceConfig) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private notifyListeners(): void {
    const config = this.getConfig();
    for (const cb of this.listeners) {
      cb(config);
    }
  }
}
