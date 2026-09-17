import * as THREE from 'three';

/**
 * Single-pass Color Grading and Subtle Vignette Shader for HD-2D Diorama look.
 * Applies contrast curves, rich saturation, sun-kissed warmth and gentle vignette.
 */
export const DioramaColorGradingShader = {
  name: 'DioramaColorGradingShader',

  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    contrast: { value: 1.08 },
    saturation: { value: 1.18 },
    warmth: { value: 0.06 },
    brightness: { value: 1.02 },
    vignetteOffset: { value: 1.05 },
    vignetteDarkness: { value: 0.38 },
    vignetteEnabled: { value: 1.0 },
    colorGradingEnabled: { value: 1.0 },
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
    uniform float contrast;
    uniform float saturation;
    uniform float warmth;
    uniform float brightness;
    uniform float vignetteOffset;
    uniform float vignetteDarkness;
    uniform float vignetteEnabled;
    uniform float colorGradingEnabled;
    varying vec2 vUv;

    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec3 color = texel.rgb;

      if (colorGradingEnabled > 0.5) {
        // 1. Exposure / Brightness
        color *= brightness;

        // 2. Contrast around mid-gray (0.5)
        color = (color - 0.5) * contrast + 0.5;

        // 3. Saturation using standard ITU-R BT.709 luma coefficients
        float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
        color = mix(vec3(luma), color, saturation);

        // 4. Color Warmth (Golden sun highlights, deep sky shadows)
        color.r += warmth * 0.5;
        color.b -= warmth * 0.3;
        color = clamp(color, 0.0, 1.0);
      }

      // 5. Subtle Vignette
      if (vignetteEnabled > 0.5) {
        vec2 uv = (vUv - 0.5) * 2.0;
        float dist = length(uv);
        float vignette = smoothstep(vignetteOffset, vignetteOffset - 0.6, dist);
        color = mix(color * (1.0 - vignetteDarkness), color, vignette);
      }

      gl_FragColor = vec4(color, texel.a);
    }
  `,
};
