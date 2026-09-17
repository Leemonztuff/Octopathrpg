# Motor Octopath Voxel 2.5D

Motor de juego 2.5D browser-based con arquitectura modular híbrida voxel + billboard y cámara Octopath Traveler.

## Características

- Renderizado 3D con Three.js y cámara Octopath (perspectiva fija ~55°)
- Terreno voxel con elevación y sistema de chunks
- Sprites billboard para vegetación, props, edificios y personajes
- Combate en tiempo real con IA (Behavior Trees + Utility AI)
- Sistema de inventario, equipación y progresión de personajes
- Editor de mapas in-game (F1)
- Efecto de mundo curvo (Animal Crossing / Mario Galaxy)
- UI responsive con controles táctiles para móvil
- Tailwind CSS v4 para la capa de UI

## Requisitos

- Node.js 18+
- npm

## Instalación

```bash
npm install
```

> **Nota Windows**: Si `npm run dev` falla con `MODULE_NOT_FOUND` para binarios nativos, ejecuta:
> ```bash
> rm -rf node_modules package-lock.json && npm install
> ```
> Esto es un bug conocido de npm ([#4828](https://github.com/npm/cli/issues/4828)).

## Desarrollo

```bash
npm run dev      # Servidor dev en http://localhost:3000
npm run build    # Build de producción
npm run lint     # Type-check (tsc --noEmit)
```

## Controles

| Tecla | Acción |
|-------|--------|
| WASD / Flechas | Mover |
| Espacio | Atacar |
| Shift | Dash |
| E | Interactuar con NPC |
| Q | Usar poción |
| R | Lanzar proyectil mágico |
| F1 | Alternar modo editor |

## Estructura del proyecto

```
src/
├── core/           # GameEngine (singleton), GameLoop, EventBus, pooling
├── renderer/       # Three.js, OctopathCamera, post-processing, curved-world
├── world/          # Voxel grid, chunks, materiales
├── entities/       # ACS: Entity + AI (Behavior Trees, Utility AI, Director)
├── ui/             # Componentes React (HUD, modales, joystick virtual)
├── data/           # Datos estáticos (diálogos, loot tables, skill tree)
├── editor/         # Editor de mapas in-game
├── save/           # Serialización y guardado de mapas
├── input/          # Teclado y controles táctiles
├── overworld/      # Mapa del mundo overworld
├── quests/         # Sistema de misiones
├── animation/      # Animación de sprites
└── billboards/     # Sistema de billboards
```

## Guías

- [ART_GUIDE.md](./ART_GUIDE.md) — Guía de arte y convenciones visuales
- [src/entities/README.md](./src/entities/README.md) — Arquitectura Actor-Component-System

## Stack

- React 19 + TypeScript
- Three.js 0.186
- Vite 6
- Tailwind CSS v4
