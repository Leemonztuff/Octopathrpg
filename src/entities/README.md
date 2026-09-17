# Arquitectura Actor-Component-System (ACS)

Este documento detalla la justificación técnica, estructura de diseño y el mapa de componentes dinámicos implementado en el motor RPG de este proyecto, así como las directrices para justificar una futura migración hacia un sistema de rendimiento masivo ECS (**Entity Component System**) como `bitecs`.

---

## 1. Racional del Patrón Actor-Component-System (ACS)

El proyecto utiliza un enfoque híbrido **Actor-Component-System (ACS)** estructurado para maximizar tanto la legibilidad como la composición dinámica en TypeScript:

*   **Actor (Entity)**: La clase base `/src/entities/Entity.ts` actúa como un contenedor de identidad (`id`) y coordenadas de escena (`containerGroup`). No contiene lógica de negocio pesada, sino que delega la simulación en sistemas especializados.
*   **Componentes (Components)**: Clases puras de datos o estado (como `PositionComponent`, `HealthComponent`, `MovementComponent`, `EquipmentComponent`) que encapsulan el estado de un dominio de manera aislada y sin interactuar directamente con otros componentes.
*   **Sistemas (Systems)**: Funciones estáticas o utilidades puras desacopladas (ubicadas en `/src/entities/systems/EntitySystems.ts`) encargadas de procesar porciones de datos específicas.

### El Mapa de Componentes Dinámicos

Para mejorar el desacoplamiento dinámico sin sacrificar la seguridad de tipos estáticos de TypeScript, la clase base `Entity` incorpora un registro genérico basado en mapas (`Map<string, any>`):

```typescript
// Registro dinámico de componentes en el Actor
public addComponent<T>(key: string, component: T): T;
public getComponent<T>(key: string): T | undefined;
public hasComponent(key: string): boolean;
```

Esto permite consultar la disponibilidad de un sistema en tiempo de ejecución de manera limpia (p. ej., verificar si una entidad tiene `health` antes de causarle daño) a la vez que mantiene propiedades estáticas de acceso directo (`this.health`, `this.movement`) para rutas críticas y mayor rendimiento.

---

## 2. Mapa de Asociación de Componentes por Entidad

| Entidad (`Actor`) | Componentes Registrados en el Mapa (`Key`) | Propósito del Dominio |
| :--- | :--- | :--- |
| **Todas (`Entity`)** | `position` (`PositionComponent`) | Manejo de coordenadas en la grilla y posicionamiento 3D de Three.js. |
| **Jugador (`PlayerEntity`)** | `movement` (`MovementComponent`), `sprite` (`CompositeSpriteComponent`), `health` (`HealthComponent`), `equipment` (`EquipmentComponent`), `fsm` (`CharacterStateMachine`) | Gestión de control del usuario, equipación del inventario, barra de vida y máquina de estados del personaje. |
| **Enemigos (`EnemyEntity`)** | `movement` (`MovementComponent`), `sprite` (`SpriteComponent`), `health` (`HealthComponent`), `aiController` (`AIController`), `fsm` (`CharacterStateMachine`) | Simulación de comportamiento inteligente mediante Árboles de Comportamiento o IA de Utilidad y control de daño. |
| **NPCs (`NpcEntity`)** | `sprite` (`NPCSpriteComponent`) | Renderizado unificado de personajes de soporte con alineación estandarizada cabeza-cuerpo. |
| **Proyectiles (`ProjectileEntity`)**| `position` (`PositionComponent`) | Desplazamiento balístico directo sin componentes de interacción física pesados. |

---

## 3. Justificación de Migración a un Framework ECS Puro (`bitecs`)

La arquitectura actual basada en clases y mapas es óptima para simulaciones de **hasta 100-200 agentes simultáneos** en el navegador, ya que prioriza la legibilidad del código y la integración directa con la jerarquía de grafos de escena de Three.js.

### ¿Cuándo migrar a un ECS orientado a datos puros como `bitecs`?

Se requiere justificar formalmente una migración total si el juego cruza al menos uno de los siguientes **detonantes de rendimiento cuantitativos**:

1.  **Escala masiva de agentes (>1,000 entidades simultáneas)**:
    *   *Razón:* La instanciación de clases, la asignación de memoria dinámica de JavaScript (recolección de basura) y la búsqueda en mapas en cada ciclo causan microtirones (framerates inconsistentes).
    *   *Solución de `bitecs`:* Representa entidades como índices numéricos planos (`uint32`) y componentes como vistas de matrices binarias tipadas (`Float32Array`, `Int8Array`), logrando una asignación contigua en memoria L1/L2.
2.  **Cuello de botella en recolección de basura (Garbage Collection >5ms por frame)**:
    *   *Razón:* Crear y destruir instancias de proyectiles o partículas de impacto en el recolector de basura nativo genera fluctuaciones de FPS.
    *   *Solución de `bitecs`:* Reutiliza arreglos nativos de tamaño fijo sin crear objetos JSON temporales en tiempo de renderizado.
3.  **Computación Paralela Compleja (Web Workers + SharedArrayBuffers)**:
    *   *Razón:* El hilo principal de renderizado de Three.js compite con los cálculos de IA y colisiones físicas.
    *   *Solución de `bitecs`:* Permite compartir el estado del juego (`SharedArrayBuffer`) directamente entre hilos paralelos de ejecución para que la lógica de sistemas corra en hilos de fondo sin bloquear el hilo gráfico principal.
