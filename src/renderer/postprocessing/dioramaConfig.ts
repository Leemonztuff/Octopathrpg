/**
 * Central Configuration for the HD-2D Diorama Post-Processing Pipeline.
 * All parameters can be tuned in real-time without modifying shader or pass code.
 */
export interface DioramaPostProcessingConfig {
  // Master switch
  enabled: boolean;

  // 1. Unreal Bloom (Emissive lights, hit flashes, torches, magic)
  bloom: {
    enabled: boolean;
    strength: number;    // Bloom radiance intensity (e.g. 0.5 - 1.2)
    radius: number;      // Dispersion spread radius (0.1 - 1.0)
    threshold: number;   // Luminance cutoff before glowing (0.7 - 0.95)
  };

  // 2. Depth of Field / Miniature Tilt-Shift
  tiltShift: {
    enabled: boolean;
    focusPosition: number; // Normalized Y center for crisp focus (0.0 bottom -> 1.0 top, 0.48 is player line)
    focusRange: number;    // Vertical size of the sharp band (0.15 - 0.45)
    maxBlur: number;       // Blur intensity on top/bottom peripheries (0.001 - 0.008)
    smoothStep: number;    // Feathering softness between sharp & blur zones
  };

  // 3. Color Grading & Lighting Atmosphere
  colorGrading: {
    enabled: boolean;
    contrast: number;      // Slight pop (1.0 = neutral, 1.08 = rich)
    saturation: number;    // Rich pigment (1.0 = neutral, 1.15 = vibrant HD-2D)
    warmth: number;        // Warm sun vs cool shadows (-0.2 cold -> +0.2 warm)
    brightness: number;    // Exposure lift (1.0 = default)
  };

  // 4. Subtle Cinematic Vignette
  vignette: {
    enabled: boolean;
    offset: number;        // Vignette distance from center (0.6 - 1.5)
    darkness: number;      // Edge darkening strength (0.1 - 0.6)
  };

  // 5. Ambient Occlusion (SSAO)
  ssao: {
    enabled: boolean;      // Off by default for high performance on mobile/tablets
    radius: number;
    intensity: number;
  };

  // 6. Anti-Aliasing (FXAA)
  // IMPORTANT: Keep disabled by default to preserve crisp 1:1 pixel art sprites
  fxaa: {
    enabled: boolean;
  };
}

export type DioramaPartialConfig = {
  enabled?: boolean;
  bloom?: Partial<DioramaPostProcessingConfig['bloom']>;
  tiltShift?: Partial<DioramaPostProcessingConfig['tiltShift']>;
  colorGrading?: Partial<DioramaPostProcessingConfig['colorGrading']>;
  vignette?: Partial<DioramaPostProcessingConfig['vignette']>;
  ssao?: Partial<DioramaPostProcessingConfig['ssao']>;
  fxaa?: Partial<DioramaPostProcessingConfig['fxaa']>;
};

export const DEFAULT_DIORAMA_CONFIG: DioramaPostProcessingConfig = {
  enabled: true,

  bloom: {
    enabled: true,
    strength: 0.65,
    radius: 0.45,
    threshold: 0.82,
  },

  tiltShift: {
    enabled: true,
    focusPosition: 0.48,   // Aligned with the hero character plane
    focusRange: 0.32,      // Generous crisp gameplay zone
    maxBlur: 0.0038,       // Elegant miniature diorama bokeh
    smoothStep: 0.18,
  },

  colorGrading: {
    enabled: true,
    contrast: 1.08,
    saturation: 1.18,
    warmth: 0.06,          // Subtle golden hour warm tone
    brightness: 1.02,
  },

  vignette: {
    enabled: true,
    offset: 1.05,
    darkness: 0.38,
  },

  ssao: {
    enabled: false,        // Heavy pass, optional toggle
    radius: 0.5,
    intensity: 0.25,
  },

  fxaa: {
    enabled: false,        // Pixel art preservation: no softening over sprites
  },
};
