import * as THREE from 'three';
import { CompositeSpriteComponent } from './CompositeSpriteComponent';
import { RigOffsetsConfig } from '../../animation/CompositeAnimator';

/**
 * Standard unified rig offset constants defined for the Player character
 * to ensure 100% consistency of head-and-body alignment across the game world.
 */
export const STANDARD_PLAYER_RIG_CONFIG: RigOffsetsConfig = {
  bodyFrameSize: { w: 327, h: 327 },
  headFrameSize: { w: 128, h: 128 },
  headOffsets: {
    down:  [{ x: 0, y: 0 }, { x: 0, y: 4 }, { x: 0, y: 0 }, { x: 0, y: 4 }],
    right: [{ x: 0, y: 0 }, { x: 0, y: 4 }, { x: 0, y: 0 }, { x: 0, y: 4 }],
    left:  [{ x: 0, y: 0 }, { x: 0, y: 4 }, { x: 0, y: 0 }, { x: 0, y: 4 }],
    up:    [{ x: 0, y: 0 }, { x: 0, y: 4 }, { x: 0, y: 0 }, { x: 0, y: 4 }]
  }
};

/**
 * Standard fixed rig offset constants for NPCs.
 * By keeping offsets flat at { x: 0, y: 0 }, the NPC heads remain completely steady and locked
 * to their shoulders, avoiding the player's bobbing/walking head-bouncing animation.
 */
export const STANDARD_NPC_RIG_CONFIG: RigOffsetsConfig = {
  bodyFrameSize: { w: 327, h: 327 },
  headFrameSize: { w: 128, h: 128 },
  headOffsets: {
    down:  [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }],
    right: [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }],
    left:  [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }],
    up:    [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }]
  }
};

export const STANDARD_CHARACTER_WIDTH = 1.3;
export const STANDARD_CHARACTER_HEIGHT = 1.3;
export const STANDARD_DIRECTION_MAP = { DOWN: 0, LEFT: 1, RIGHT: 2, UP: 3 };

export class NPCSpriteComponent extends CompositeSpriteComponent {
  constructor(
    bodyTexture: THREE.CanvasTexture | THREE.Texture,
    headTexture: THREE.CanvasTexture | THREE.Texture
  ) {
    super(
      bodyTexture,
      headTexture,
      STANDARD_NPC_RIG_CONFIG,
      STANDARD_CHARACTER_WIDTH,
      STANDARD_CHARACTER_HEIGHT,
      STANDARD_DIRECTION_MAP,
      'npc'
    );
  }
}
