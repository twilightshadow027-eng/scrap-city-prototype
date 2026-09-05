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
}

export interface Pickup {
  id: number;
  x: number;
  y: number;
  kind: "scrap" | "component";
  ctype?: ComponentType;
  value: number;
  seed: number;
}

export interface Obstacle {
  x: number;
  y: number;
  r: number;
  seed: number;
}

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
