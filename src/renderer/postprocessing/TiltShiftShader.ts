import * as THREE from 'three';

/**
 * Custom 2-Band Miniature Tilt-Shift Shader for HD-2D Diorama Effect.
 * Maintains a razor-sharp horizontal strip where the hero/camera is focused,
 * with graduated soft optical blur towards top (sky/background) and bottom (foreground edge).
 */
export const TiltShiftShader = {
  name: 'TiltShiftShader',

  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    focusPosition: { value: 0.48 },
    focusRange: { value: 0.32 },
    maxBlur: { value: 0.0038 },
    smoothStep: { value: 0.18 },
    resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    enabled: { value: 1.0 },
  },

  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float focusPosition;
    uniform float focusRange;
    uniform float maxBlur;
    uniform float smoothStep;
    uniform vec2 resolution;
    uniform float enabled;
    varying vec2 vUv;

    void main() {
      if (enabled < 0.5) {
        gl_FragColor = texture2D(tDiffuse, vUv);
        return;
      }

      // Compute distance from focal line
      float dist = abs(vUv.y - focusPosition);
      float halfRange = focusRange * 0.5;

      // Smoothstep factor: 0.0 inside sharp center band, smoothly rising to 1.0 towards margins
      float blurFactor = smoothstep(halfRange, halfRange + smoothStep, dist);

      if (blurFactor <= 0.001) {
        // Fast path: perfect 1:1 crisp sprite rendering in focal band
        gl_FragColor = texture2D(tDiffuse, vUv);
        return;
      }

      float blurAmount = blurFactor * maxBlur;
      vec2 texel = resolution.y * vec2(1.0 / resolution.x, 1.0 / resolution.y) * blurAmount;

      // Fully unrolled 9-tap disk sample (Eliminates HLSL dynamic loop gradient warnings & maximizes GPU parallelism)
      vec4 sum = texture2D(tDiffuse, vUv) * 0.22;
      sum += texture2D(tDiffuse, vUv + vec2(-0.707, -0.707) * texel) * 0.10;
      sum += texture2D(tDiffuse, vUv + vec2( 0.707, -0.707) * texel) * 0.10;
      sum += texture2D(tDiffuse, vUv + vec2(-0.707,  0.707) * texel) * 0.10;
      sum += texture2D(tDiffuse, vUv + vec2( 0.707,  0.707) * texel) * 0.10;
      sum += texture2D(tDiffuse, vUv + vec2( 0.0,   -1.500) * texel) * 0.095;
      sum += texture2D(tDiffuse, vUv + vec2( 0.0,    1.500) * texel) * 0.095;
      sum += texture2D(tDiffuse, vUv + vec2(-1.500,  0.0  ) * texel) * 0.095;
      sum += texture2D(tDiffuse, vUv + vec2( 1.500,  0.0  ) * texel) * 0.095;

      gl_FragColor = sum;
    }
  `,
};
