import { globalEventBus } from '../../core/EventBus';

export type DirectorState = 'COOLDOWN' | 'BUILD_UP' | 'PEAK';

export class AIDirector {
  public currentState: DirectorState = 'COOLDOWN';
  public stressLevel: number = 0; // Scaled between 0 and 100

  private stateTimer: number = 8.0; // Starts in a short initial cooldown
  private spawnTimer: number = 0;

  // Configuration thresholds
  private readonly COOLDOWN_DURATION = 15.0; // Relax phase length
  private readonly BUILD_UP_DURATION = 25.0; // Escalation phase length
  private readonly PEAK_DURATION = 20.0;     // Climax phase length

  private readonly SPAWN_INTERVAL_BUILD_UP = 6.0; // Seconds between minor spawns

  // Stats tracked
  public totalEnemiesDefeated: number = 0;
  public eliteSpawnsCount: number = 0;

  constructor(
    private spawnEnemyCallback: (name: string, hp: number, aiType: 'UTILITY' | 'BEHAVIOR_TREE', attackDamage?: number) => void,
    private getActiveEnemiesCount: () => number,
    private getPlayerHpPercent: () => number
  ) {
    this.setupListeners();
  }

  private setupListeners() {
    globalEventBus.on('combat:enemy_defeated', () => {
      this.totalEnemiesDefeated++;
      // Defeating enemies adds a tiny instant adrenaline spike (stress)
      this.stressLevel = Math.min(100, this.stressLevel + 12);
    });
  }

  public update(dt: number): void {
    const playerHpPercent = this.getPlayerHpPercent();
    const activeEnemies = this.getActiveEnemiesCount();

    // 1. Calculate dynamic stress level
    // Stress increases when Player HP is low and when surrounded by active enemies
    const hpStress = (1.0 - playerHpPercent) * 65; // Up to 65 pts from low health
    const surroundingStress = Math.min(4, activeEnemies) * 8.75; // Up to 35 pts from mobs density
    this.stressLevel = Math.min(100, Math.round(hpStress + surroundingStress));

    // Decelerate stress slowly over time if no active threat
    if (activeEnemies === 0 && this.stressLevel > 0) {
      this.stressLevel = Math.max(0, this.stressLevel - dt * 3);
    }

    // 2. Manage director state machine
    this.stateTimer -= dt;
    if (this.stateTimer <= 0) {
      this.transitionToNextState();
    }

    // 3. Execute spawning algorithms based on active state
    this.executeDirectorBehavior(dt, activeEnemies);
  }

  private transitionToNextState() {
    switch (this.currentState) {
      case 'COOLDOWN':
        // Move to Build-up to start escalating tension
        this.currentState = 'BUILD_UP';
        this.stateTimer = this.BUILD_UP_DURATION;
        this.spawnTimer = 0;
        globalEventBus.emit('combat:enemy_damaged', {
          enemyId: 'director_notice',
          name: '📢 ¡EL DIRECTOR DE IA PREPARA UNA EMBOSCADA!',
          amount: 0,
          worldPos: { x: 15, y: 3.5, z: 18 },
          isCritical: true,
          isMagic: false
        });
        break;

      case 'BUILD_UP':
        // Transition to Peak for an elite climax, unless player is already extremely stressed / dying
        if (this.stressLevel > 80) {
          // Extend build up or give brief emergency cooldown to keep it fair and fun
          this.currentState = 'COOLDOWN';
          this.stateTimer = this.COOLDOWN_DURATION * 0.6;
        } else {
          this.currentState = 'PEAK';
          this.stateTimer = this.PEAK_DURATION;
          this.triggerPeakEncounter();
        }
        break;

      case 'PEAK':
        // Always relax back into Cooldown to provide dynamic contrast and pacing
        this.currentState = 'COOLDOWN';
        this.stateTimer = this.COOLDOWN_DURATION;
        globalEventBus.emit('combat:enemy_damaged', {
          enemyId: 'director_relax',
          name: '🕊️ FASE DE COOLDOWN: OLEADA SUPERADA',
          amount: 0,
          worldPos: { x: 15, y: 3.5, z: 18 },
          isCritical: false,
          isMagic: true
        });
        break;
    }
  }

  private executeDirectorBehavior(dt: number, activeEnemies: number) {
    if (this.currentState === 'BUILD_UP') {
      this.spawnTimer += dt;
      // Spawn minor enemies under limits
      if (this.spawnTimer >= this.SPAWN_INTERVAL_BUILD_UP && activeEnemies < 5) {
        this.spawnTimer = 0;
        this.spawnMinorMob();
      }
    }
  }

  private spawnMinorMob() {
    const mobTypes = [
      { name: 'Slime de Práctica', hp: 55, atk: 10 },
      { name: 'Slime de Fuego', hp: 65, atk: 14 },
      { name: 'Slime Sombra', hp: 70, atk: 12 }
    ];
    const picked = mobTypes[Math.floor(Math.random() * mobTypes.length)];
    this.spawnEnemyCallback(picked.name, picked.hp, 'UTILITY', picked.atk);
  }

  private triggerPeakEncounter() {
    this.eliteSpawnsCount++;
    // Spawn a mighty Boss/Elite running a complex Behavior Tree
    globalEventBus.emit('combat:enemy_damaged', {
      enemyId: 'director_boss',
      name: '⚠️ ¡JEFE SÚPER SLIME DE ÉLITE GENERADO! ⚠️',
      amount: 0,
      worldPos: { x: 15, y: 3.5, z: 18 },
      isCritical: true,
      isMagic: true
    });

    // 160 HP boss, high damage, runs a Behavior Tree
    this.spawnEnemyCallback('Súper Slime Mutante Élite', 160, 'BEHAVIOR_TREE', 22);
  }

  public getDirectorHUD() {
    return {
      state: this.currentState,
      stress: this.stressLevel,
      timer: Math.ceil(this.stateTimer),
      totalDefeated: this.totalEnemiesDefeated,
      elitesCount: this.eliteSpawnsCount
    };
  }
}
