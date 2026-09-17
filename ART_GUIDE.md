# ART_GUIDE.md — Guía de Arte del Proyecto (v2)

> v2: actualizada tras las decisiones de mundo híbrido voxel+billboard, cámara Octopath (fija, sin rotación) y la capa de sistemas (combate, NPCs, equipo). Reemplaza la v1, que asumía cámara top-down pura y no cubría enemigos/NPCs/UI.

---

## 1. Filosofía visual

- **Terreno y estructuras con volumen** (suelo con elevación, muros, bases de edificios): geometría **voxel** (bloques con textura pixel art por cara).
- **Vegetación, props y fachadas de edificios**: **billboards** — planos pixel art con alfa, orientados una sola vez hacia la posición fija de la cámara (no rotan por frame).
- **Personajes** (jugador, NPCs, enemigos): spritesheet pixel art, billboard, mismo esquema para todos.
- **Cámara Octopath**: perspectiva fija en ángulo curado (~50-60° desde el eje Y), **sin rotación**. Esto es clave para el arte: todo billboard se diseña **para ese único ángulo**, no para verse bien desde cualquier lado.
- Nítido siempre: nearest neighbor, sin blur, sin importar la resolución de pantalla.

---

## 2. Resolución base (no cambiar a mitad de proyecto)

| Parámetro | Valor recomendado | Notas |
|---|---|---|
| Textura por cara de voxel | **32×32 px** | Aplica a todas las caras (top, side) del bloque unitario. |
| Tamaño de celda/voxel en mundo 3D | **1×1×1 unidad** | Coincide con la grilla lógica del motor. |
| Frame de personaje (jugador/NPC/enemigo) | **32×32 px** o **32×48 px** si el personaje debe sobresalir por encima del tile | Mantené el mismo criterio para *todos* los personajes del juego (jugador, NPCs, enemigos) — no mezcles alturas de canvas entre ellos. |
| Billboards pequeños (vegetación, cofres, props chicos) | 32×32 a 64×64 px | Múltiplo de la base. |
| Billboards grandes (casas, castillos, templos) | 64×64, 96×96 o 128×128 px | Múltiplo exacto de la base. |

**Regla de oro**: toda resolución es múltiplo de 32px.

---

## 3. Paleta de color

```
Paleta base:
#22c55e  - suelo / pasto
#78350f  - suelo / tierra
#475569  - piedra / ruinas / voxel de muro
#854d0e  - madera / edificios
#3b82f6  - agua
#ef4444  - acento de peligro (enemigos, daño)
#10b981  - acento de aliado/interacción (NPCs, ítems)
```

- Reservar 1-2 colores de acento **exclusivos** para lectura de gameplay: rojo para hostiles/daño, esmeralda para interactuables/NPCs.
- Material recomendado en Three.js: `MeshBasicMaterial` o `MeshToonMaterial` (pocos steps) para voxels y billboards — evita que la iluminación PBR "manche" el pixel art ya sombreado a mano.

---

## 4. Atlas de texturas

| Atlas | Archivo | Contenido |
|---|---|---|
| Voxels | `voxels_atlas.png` | Caras de bloques: pasto, tierra, piedra/muro, madera, agua |
| Props / edificios | `props_atlas.png` | Árboles, arbustos, casas, castillos, ruinas, templos, **cofres** |
| Personajes — jugador | `player_atlas.png` | Spritesheet 4×4 del jugador (+ variantes de equipo si aplica) |
| Personajes — NPCs | `npcs_atlas.png` | Spritesheets 4×4 (o estáticos) de NPCs amistosos |
| Personajes — enemigos | `enemies_atlas.png` | Spritesheets 4×4 de cada tipo de enemigo |
| UI | `ui_atlas.png` | Iconos de HUD, marcos de caja de diálogo, iconos de ítems/equipo |

---

## 5. Voxels (terreno y estructuras)

- Cada tipo de voxel necesita textura de **cara superior** y **cara lateral**.
- Diseñar pensando en el **ángulo Octopath**: la cámara ve principalmente caras superiores y las laterales que dan hacia ella.

---

## 6. Billboards (vegetación, edificios, cofres, props)

- Vista frontal/¾ fija, diseñada **para el ángulo de cámara Octopath específico**.
- **Pivot en la base** (pies del sprite = punto de apoyo en el tile).
- **Cofres**: 2 estados como mínimo — cerrado / abierto.

---

## 7. Personajes: jugador, NPCs y enemigos

- **Spritesheet 4×4** (4 filas = direcciones, 4 columnas = frames de caminata, pivot en los pies).
- **Enemigos**: frame o secuencia de ataque opcional.
- **Feedback de daño**: flash de color (blanco/rojo) en código, no en arte.
- **NPCs estáticos**: 1 dirección con 1-2 frames de idle.

---

## 8. Equipo visual (opcional)

- **Mínimo (MVP)**: el equipo solo afecta stats (actualmente implementado).

---

## 9. UI: HUD y caja de diálogo

- **HUD**: barra de HP, slots de equipo, hotbar de consumibles (ya implementado).
- **Caja de diálogo**: marco pixel art ubicado en la parte inferior.

---

## 10. Convención de nombres de archivo

```
voxels_atlas.png
props_atlas.png
player_atlas.png
npcs_atlas.png
enemies_atlas.png
ui_atlas.png
```

---

## 11. Configuración técnica obligatoria (Three.js)

```ts
texture.magFilter = THREE.NearestFilter;
texture.minFilter = THREE.NearestFilter;
texture.generateMipmaps = false;
texture.colorSpace = THREE.SRGBColorSpace;
```

---

## 12. Checklist antes de agregar un asset nuevo

- [ ] ¿Resolución múltiplo de 32px?
- [ ] ¿Usa solo colores de la paleta?
- [ ] ¿Pivot en la base/pies?
- [ ] ¿Probado en el motor con NearestFilter y ángulo Octopath?
