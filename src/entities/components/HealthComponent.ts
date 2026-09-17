/**
 * HealthComponent for Action RPG stats system, invulnerability frames, and damage feedback.
 */
export class HealthComponent {
  public maxHealth: number;
  public currentHealth: number;

  public isInvulnerable: boolean = false;
  public invulnerableTimer: number = 0;
  public isFlashing: boolean = false;
  public damageFlashTimer: number = 0;

  constructor(maxHealth: number = 100) {
    this.maxHealth = maxHealth;
    this.currentHealth = maxHealth;
  }

  public isAlive(): boolean {
    return this.currentHealth > 0;
  }
}
