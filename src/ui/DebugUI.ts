import GUI from 'lil-gui';
import { GameEngine } from '../core/GameEngine';

export class DebugUI {
  private gui: GUI;

  constructor(engine: GameEngine) {
    this.gui = new GUI({ title: 'Engine & Diorama Controls', autoPlace: true });
    this.gui.close(); // Closed by default

    const renderEngine = engine.getRenderEngine();
    const pipeline = renderEngine.dioramaPipeline;
    const config = pipeline.getConfig();

    // 1. Post-Processing Diorama Master Folder
    const dioramaFolder = this.gui.addFolder('HD-2D Diorama Pipeline');
    dioramaFolder.open();

    dioramaFolder
      .add(config, 'enabled')
      .name('Post-Processing Master')
      .onChange((v: boolean) => pipeline.updateConfig({ enabled: v }));

    // 1a. Bloom Controls
    const bloomFolder = dioramaFolder.addFolder('Unreal Bloom');
    bloomFolder
      .add(config.bloom, 'enabled')
      .name('Bloom Enabled')
      .onChange((v: boolean) => pipeline.updateConfig({ bloom: { ...config.bloom, enabled: v } }));
    bloomFolder
      .add(config.bloom, 'strength', 0.1, 2.0, 0.05)
      .name('Strength')
      .onChange((v: number) => pipeline.updateConfig({ bloom: { ...config.bloom, strength: v } }));
    bloomFolder
      .add(config.bloom, 'radius', 0.1, 1.5, 0.05)
      .name('Radius')
      .onChange((v: number) => pipeline.updateConfig({ bloom: { ...config.bloom, radius: v } }));
    bloomFolder
      .add(config.bloom, 'threshold', 0.5, 1.0, 0.02)
      .name('Threshold')
      .onChange((v: number) => pipeline.updateConfig({ bloom: { ...config.bloom, threshold: v } }));

    // 1b. Tilt-Shift / Miniature Depth of Field Controls
    const tiltFolder = dioramaFolder.addFolder('Tilt-Shift Depth of Field');
    tiltFolder
      .add(config.tiltShift, 'enabled')
      .name('Tilt-Shift Enabled')
      .onChange((v: boolean) => pipeline.updateConfig({ tiltShift: { ...config.tiltShift, enabled: v } }));
    tiltFolder
      .add(config.tiltShift, 'focusPosition', 0.1, 0.9, 0.02)
      .name('Focus Y Center')
      .onChange((v: number) => pipeline.updateConfig({ tiltShift: { ...config.tiltShift, focusPosition: v } }));
    tiltFolder
      .add(config.tiltShift, 'focusRange', 0.1, 0.7, 0.02)
      .name('Sharp Band Width')
      .onChange((v: number) => pipeline.updateConfig({ tiltShift: { ...config.tiltShift, focusRange: v } }));
    tiltFolder
      .add(config.tiltShift, 'maxBlur', 0.001, 0.01, 0.0005)
      .name('Max Peripheral Blur')
      .onChange((v: number) => pipeline.updateConfig({ tiltShift: { ...config.tiltShift, maxBlur: v } }));

    // 1c. Color Grading & Warmth Controls
    const colorFolder = dioramaFolder.addFolder('Color Grading');
    colorFolder
      .add(config.colorGrading, 'enabled')
      .name('Grading Enabled')
      .onChange((v: boolean) => pipeline.updateConfig({ colorGrading: { ...config.colorGrading, enabled: v } }));
    colorFolder
      .add(config.colorGrading, 'contrast', 0.8, 1.3, 0.02)
      .name('Contrast')
      .onChange((v: number) => pipeline.updateConfig({ colorGrading: { ...config.colorGrading, contrast: v } }));
    colorFolder
      .add(config.colorGrading, 'saturation', 0.8, 1.6, 0.05)
      .name('Saturation')
      .onChange((v: number) => pipeline.updateConfig({ colorGrading: { ...config.colorGrading, saturation: v } }));
    colorFolder
      .add(config.colorGrading, 'warmth', -0.2, 0.25, 0.01)
      .name('Sun Warmth')
      .onChange((v: number) => pipeline.updateConfig({ colorGrading: { ...config.colorGrading, warmth: v } }));
    colorFolder
      .add(config.colorGrading, 'brightness', 0.8, 1.3, 0.02)
      .name('Brightness')
      .onChange((v: number) => pipeline.updateConfig({ colorGrading: { ...config.colorGrading, brightness: v } }));

    // 1d. Vignette Controls
    const vignetteFolder = dioramaFolder.addFolder('Vignette');
    vignetteFolder
      .add(config.vignette, 'enabled')
      .name('Vignette Enabled')
      .onChange((v: boolean) => pipeline.updateConfig({ vignette: { ...config.vignette, enabled: v } }));
    vignetteFolder
      .add(config.vignette, 'darkness', 0.0, 0.8, 0.05)
      .name('Edge Darkness')
      .onChange((v: number) => pipeline.updateConfig({ vignette: { ...config.vignette, darkness: v } }));

    // 1e. Performance Stats Monitor
    const perfFolder = dioramaFolder.addFolder('Pipeline Profiler');
    const perfObj = { fps: 60, frameTime: '16.6 ms', passes: 3 };
    const fpsCtrl = perfFolder.add(perfObj, 'fps').name('Render FPS').listen().disable();
    const frameTimeCtrl = perfFolder.add(perfObj, 'frameTime').name('Frame Duration').listen().disable();
    const passesCtrl = perfFolder.add(perfObj, 'passes').name('Active Passes').listen().disable();

    setInterval(() => {
      const stats = pipeline.getPerformanceStats();
      perfObj.fps = stats.fps;
      perfObj.frameTime = `${stats.frameTimeMs} ms`;
      perfObj.passes = stats.passesCount;
    }, 400);

    // 2. Camera Controls Folder
    const cameraFolder = this.gui.addFolder('Octopath Camera');
    const cam = renderEngine.octopathCamera;

    cameraFolder
      .add({ pitch: cam.getPitchDegrees() }, 'pitch', 30, 75, 1)
      .name('Pitch Angle (°)')
      .onChange((v: number) => cam.setPitchDegrees(v));

    cameraFolder
      .add({ fov: cam.getFOV() }, 'fov', 30, 75, 1)
      .name('FOV')
      .onChange((v: number) => cam.setFOV(v));

    cameraFolder
      .add({ distance: cam.getDistance() }, 'distance', 10, 30, 0.5)
      .name('Distance')
      .onChange((v: number) => cam.setDistance(v));

    cameraFolder
      .add({ lerp: cam.getLerpSpeed() }, 'lerp', 1, 15, 0.5)
      .name('Lerp Speed')
      .onChange((v: number) => cam.setLerpSpeed(v));

    // 3. Player Folder
    const playerFolder = this.gui.addFolder('Player & Controls');
    const player = engine.getPlayer();

    playerFolder
      .add(player.movement, 'moveDuration', 0.08, 0.4, 0.01)
      .name('Step Duration (s)');

    playerFolder
      .add(
        {
          reset: () => {
            player.position.setGridPos(15, 18, engine.getWorldGrid().getVoxelHeight(15, 18));
            player.syncContainerPosition();
            cam.snapToTarget(player.position.getWorldPos());
          },
        },
        'reset'
      )
      .name('Reset Player Pos');
  }

  public destroy(): void {
    this.gui.destroy();
  }
}

