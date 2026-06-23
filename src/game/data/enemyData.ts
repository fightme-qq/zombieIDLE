export type EnemyId =
  | 'zombie'
  | 'zombie-bruiser'
  | 'zombie-toxic'
  | 'zombie-tank'
  | 'zombie-runner'
  | 'zombie-berserker'
  | 'zombie-armored'
  | 'zombie-crawler'
  | 'zombie-mutant';

export type EnemyRole = 'grunt' | 'bruiser' | 'skirmisher' | 'tank' | 'runner' | 'berserker' | 'juggernaut' | 'swarm' | 'elite';

export type EnemyDefinition = {
  id: EnemyId;
  name: string;
  role: EnemyRole;
  hpBase: number;
  hpPerStage: number;
  speedBase: number;
  speedPerStage: number;
  damage: number;
  attackCooldownMs: number;
  walkFrameRate: number;
  displaySize: number;
};

export const ENEMIES: readonly EnemyDefinition[] = [
  {
    id: 'zombie',
    name: 'Zombie',
    role: 'grunt',
    hpBase: 28,
    hpPerStage: 6,
    speedBase: 54,
    speedPerStage: 5,
    damage: 8,
    attackCooldownMs: 700,
    walkFrameRate: 8,
    displaySize: 48,
  },
  {
    id: 'zombie-bruiser',
    name: 'Bruiser Zombie',
    role: 'bruiser',
    hpBase: 42,
    hpPerStage: 8,
    speedBase: 50,
    speedPerStage: 4,
    damage: 10,
    attackCooldownMs: 760,
    walkFrameRate: 8,
    displaySize: 130,
  },
  {
    id: 'zombie-toxic',
    name: 'Toxic Zombie',
    role: 'skirmisher',
    hpBase: 56,
    hpPerStage: 9,
    speedBase: 62,
    speedPerStage: 5,
    damage: 12,
    attackCooldownMs: 720,
    walkFrameRate: 9,
    displaySize: 125,
  },
  {
    id: 'zombie-tank',
    name: 'Tank Zombie',
    role: 'tank',
    hpBase: 82,
    hpPerStage: 12,
    speedBase: 42,
    speedPerStage: 3,
    damage: 16,
    attackCooldownMs: 850,
    walkFrameRate: 6,
    displaySize: 145,
  },
  {
    id: 'zombie-runner',
    name: 'Runner Zombie',
    role: 'runner',
    hpBase: 22,
    hpPerStage: 4,
    speedBase: 92,
    speedPerStage: 6,
    damage: 6,
    attackCooldownMs: 420,
    walkFrameRate: 12,
    displaySize: 108,
  },
  {
    id: 'zombie-berserker',
    name: 'Berserker Zombie',
    role: 'berserker',
    hpBase: 38,
    hpPerStage: 7,
    speedBase: 68,
    speedPerStage: 5,
    damage: 22,
    attackCooldownMs: 520,
    walkFrameRate: 8,
    displaySize: 135,
  },
  {
    id: 'zombie-armored',
    name: 'Armored Zombie',
    role: 'juggernaut',
    hpBase: 120,
    hpPerStage: 16,
    speedBase: 32,
    speedPerStage: 2,
    damage: 14,
    attackCooldownMs: 1000,
    walkFrameRate: 6,
    displaySize: 155,
  },
  {
    id: 'zombie-crawler',
    name: 'Feral Crawler',
    role: 'swarm',
    hpBase: 16,
    hpPerStage: 3,
    speedBase: 78,
    speedPerStage: 6,
    damage: 5,
    attackCooldownMs: 460,
    walkFrameRate: 10,
    displaySize: 95,
  },
  {
    id: 'zombie-mutant',
    name: 'Alpha Mutant',
    role: 'elite',
    hpBase: 150,
    hpPerStage: 20,
    speedBase: 58,
    speedPerStage: 4,
    damage: 24,
    attackCooldownMs: 650,
    walkFrameRate: 7,
    displaySize: 165,
  },
];

export function getEnemyDefinition(enemyId: EnemyId): EnemyDefinition {
  const definition = ENEMIES.find((enemy) => enemy.id === enemyId);
  if (!definition) throw new Error(`Unknown enemy id: ${enemyId}`);
  return definition;
}
