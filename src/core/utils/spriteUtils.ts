export interface RigOffsetEntry {
  x: number;
  y: number;
}

/**
 * Standardized utility to compute head alignment offsets for both Player and NPCs.
 * To eliminate erratic or bouncy head movements ("no quiero que se muevan"), this returns 
 * a perfectly flat and static adjustment offset. This locks the head mesh steadily onto 
 * the shoulders regardless of the current animation frame.
 */
export function getAlignmentOffset(
  entityType: 'player' | 'npc' | string,
  animationFrame: number
): RigOffsetEntry {
  // Fixed constant alignment offset per entity type.
  // By returning a constant 0,0 offset for all animation frames, we completely disable frame-based bouncing/bobbing.
  switch (entityType) {
    case 'player':
      return { x: 0, y: 0 };
    case 'npc':
    default:
      return { x: 0, y: 0 };
  }
}
