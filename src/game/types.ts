export type ComponentType =
  | "wheels"
  | "battery"
  | "armor"
  | "magnet"
  | "booster"
  | "sensor";

export interface ComponentDef {
  type: ComponentType;
  name: string;
  color: string;
  glow: string;
  desc: string;
  /** stat deltas per stack */
  speed: number;
  hp: number;
  magnet: number;
  boost: number;
  vision: number;
  energy: number;
}

export const COMPONENTS: Record<ComponentType, ComponentDef> = {
  wheels: {
    type: "wheels",
    name: "Tread Drive",
    color: "#38f6c9",
    glow: "rgba(56,246,201,0.55)",
    desc: "+Speed",
    speed: 42,
    hp: 0,
    magnet: 0,
    boost: 0,
    vision: 0,
    energy: 0,
  },
  battery: {
    type: "battery",
    name: "Fusion Cell",
    color: "#ffd23f",
    glow: "rgba(255,210,63,0.55)",
    desc: "+Energy regen",
    speed: 0,
    hp: 6,
    magnet: 0,
    boost: 0,
    vision: 0,
    energy: 9,
  },
  armor: {
    type: "armor",
    name: "Slag Plating",
    color: "#ff6b57",
    glow: "rgba(255,107,87,0.55)",
    desc: "+Hull, -Speed",
    speed: -14,
    hp: 34,
    magnet: 0,
    boost: 0,
    vision: 0,
    energy: 0,
  },
  magnet: {
    type: "magnet",
    name: "Grav Magnet",
    color: "#8b5cff",
    glow: "rgba(139,92,255,0.55)",
    desc: "+Pickup range",
    speed: 0,
    hp: 0,
    magnet: 95,
    boost: 0,
    vision: 20,
    energy: 0,
  },
  booster: {
    type: "booster",
    name: "Ion Booster",
    color: "#ff3fa4",
    glow: "rgba(255,63,164,0.55)",
    desc: "+Ram power",
    speed: 10,
    hp: 0,
    magnet: 0,
    boost: 26,
    vision: 0,
    energy: -3,
  },
  sensor: {
    type: "sensor",
    name: "Optic Array",
    color: "#4fc3ff",
    glow: "rgba(79,195,255,0.55)",
    desc: "+Radar range",
    speed: 4,
    hp: 0,
    magnet: 18,
    boost: 0,
    vision: 300,
    energy: 2,
  },
};

export const COMPONENT_TYPES = Object.keys(COMPONENTS) as ComponentType[];

export interface Vec {
  x: number;
  y: number;
}

export interface Robot {
  id: string;
  name: string;
  isPlayer: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  radius: number;
  hp: number;
  maxHp: number;
  energy: number;
  scrap: number;
  parts: ComponentType[];
  alive: boolean;
  hitFlash: number;
  boostTimer: number;
  boostCooldown: number;
  respawnAt: number;
  extracted: boolean;
  // ai
  aiState: "roam" | "hunt" | "flee" | "collect";
  aiTarget: Vec | null;
  aiTimer: number;
  aiTargetId: string | null;
  tint: string;
  skin: SkinId;
  design: number;
}

export interface Pickup {
  id: number;
  x: number;
  y: number;
  kind: "scrap" | "component";
  ctype?: ComponentType;
  value: number;
  seed: number;
  vx: number;
  vy: number;
  rejected: number;
}

export interface Obstacle {
  x: number;
  y: number;
  r: number;
  seed: number;
  kind: "building" | "junk" | "tank" | "pipe";
}

export type TurretType = "scout" | "pulse" | "missile" | "shield";

export interface Turret {
  id: number;
  x: number;
  y: number;
  type: TurretType;
  angle: number;
  cooldown: number;
  telegraph: number;
  hp: number;
  maxHp: number;
  disabled: number;
  seed: number;
}

export interface Projectile {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  life: number;
  type: TurretType;
  targetId: string;
}

export interface Hazard {
  x: number;
  y: number;
  r: number;
  seed: number;
}

export type SkinId = "foundry" | "oxide" | "hazard" | "spectre" | "royal";

export interface SkinDef {
  id: SkinId;
  name: string;
  price: number;
  body: string;
  edge: string;
  light: string;
  description: string;
}

export const SKINS: Record<SkinId, SkinDef> = {
  foundry: {
    id: "foundry",
    name: "Foundry Standard",
    price: 0,
    body: "#273138",
    edge: "#65e6ce",
    light: "#b7fff1",
    description: "Factory steel with a cool arc core.",
  },
  oxide: {
    id: "oxide",
    name: "Oxide Runner",
    price: 450,
    body: "#4a3027",
    edge: "#ef8b4e",
    light: "#ffd28b",
    description: "Heat-scored armor and furnace optics.",
  },
  hazard: {
    id: "hazard",
    name: "Hazard Unit",
    price: 800,
    body: "#34372f",
    edge: "#e4c84a",
    light: "#fff29b",
    description: "Industrial warning livery for close calls.",
  },
  spectre: {
    id: "spectre",
    name: "Night Spectre",
    price: 1300,
    body: "#202833",
    edge: "#c47cff",
    light: "#ead0ff",
    description: "Black alloy with ultraviolet sensors.",
  },
  royal: {
    id: "royal",
    name: "Salvage Royal",
    price: 2200,
    body: "#3b3540",
    edge: "#ff5b8d",
    light: "#ffd3df",
    description: "A rare magenta command chassis.",
  },
};

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface FloatText {
  x: number;
  y: number;
  text: string;
  life: number;
  color: string;
}

export type Phase = "menu" | "playing" | "won" | "lost";

export interface Stats {
  speed: number;
  maxHp: number;
  magnet: number;
  ram: number;
  vision: number;
}

export const WORLD = { w: 5200, h: 5200 };
export const EXTRACT = { x: 2600, y: 2600, r: 260 };
export const SCRAP_GOAL = 60;
