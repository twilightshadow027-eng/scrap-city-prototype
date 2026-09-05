import {
  COMPONENTS,
  COMPONENT_TYPES,
  EXTRACT,
  SCRAP_GOAL,
  WORLD,
  type ComponentType,
  type FloatText,
  type Obstacle,
  type Particle,
  type Phase,
  type Pickup,
  type Robot,
  type Stats,
} from "./types";

const BOT_NAMES = [
  "RUSTPIKE",
  "VOLTHOUND",
  "SCRAPWRAITH",
  "NULLJAW",
  "COGSPINE",
  "HEXCRAWLER",
  "SLAGFANG",
  "DRIFTMAW",
];

export function rand(a: number, b: number) {
  return a + Math.random() * (b - a);
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

let pickupId = 1;

export interface GameState {
  phase: Phase;
  time: number;
  robots: Robot[];
  pickups: Pickup[];
  obstacles: Obstacle[];
  particles: Particle[];
  floats: FloatText[];
  camera: { x: number; y: number };
  shake: number;
  extractProgress: number;
  message: string;
  messageTimer: number;
  result: { scrap: number; parts: number; kills: number; time: number } | null;
  kills: number;
}

export function statsOf(r: Robot): Stats {
  let speed = 190,
    maxHp = 100,
    magnet = 46,
    ram = 20,
    vision = 620;
  for (const p of r.parts) {
    const c = COMPONENTS[p];
    speed += c.speed;
    maxHp += c.hp;
    magnet += c.magnet;
    ram += c.boost;
    vision += c.vision;
  }
  return {
    speed: Math.max(70, speed),
    maxHp,
    magnet,
    ram,
    vision,
  };
}

function makeRobot(id: string, isPlayer: boolean, name: string, tint: string): Robot {
  let x = 0,
    y = 0;
  do {
    x = rand(300, WORLD.w - 300);
    y = rand(300, WORLD.h - 300);
  } while (Math.hypot(x - EXTRACT.x, y - EXTRACT.y) < 900);
  return {
    id,
    name,
    isPlayer,
    x,
    y,
    vx: 0,
    vy: 0,
    angle: rand(0, Math.PI * 2),
    radius: 22,
    hp: 100,
    maxHp: 100,
    energy: 100,
    scrap: 0,
    parts: [],
    alive: true,
    hitFlash: 0,
    boostTimer: 0,
    boostCooldown: 0,
    respawnAt: 0,
    extracted: false,
    aiState: "roam",
    aiTarget: null,
    aiTimer: 0,
    aiTargetId: null,
    tint,
  };
}

const BOT_TINTS = [
  "#ff5c7a",
  "#ffa63f",
  "#7bff5c",
  "#5cc8ff",
  "#c78bff",
  "#ff8bd1",
  "#f5f16a",
  "#5cffe0",
];

export function createGame(): GameState {
  pickupId = 1;
  const robots: Robot[] = [makeRobot("player", true, "YOU", "#38f6c9")];
  const names = [...BOT_NAMES].sort(() => Math.random() - 0.5);
  for (let i = 0; i < 7; i++) {
    const b = makeRobot("bot" + i, false, names[i]!, BOT_TINTS[i % BOT_TINTS.length]!);
    b.parts = Array.from({ length: Math.floor(rand(0, 3)) }, () => pick(COMPONENT_TYPES));
    b.maxHp = statsOf(b).maxHp;
    b.hp = b.maxHp;
    b.scrap = Math.floor(rand(0, 12));
    robots.push(b);
  }

  const obstacles: Obstacle[] = [];
  for (let i = 0; i < 150; i++) {
    const x = rand(120, WORLD.w - 120);
    const y = rand(120, WORLD.h - 120);
    if (Math.hypot(x - EXTRACT.x, y - EXTRACT.y) < EXTRACT.r + 140) continue;
    obstacles.push({ x, y, r: rand(30, 92), seed: Math.random() * 999 });
  }

  const g: GameState = {
    phase: "playing",
    time: 0,
    robots,
    pickups: [],
    obstacles,
    particles: [],
    floats: [],
    camera: { x: robots[0]!.x, y: robots[0]!.y },
    shake: 0,
    extractProgress: 0,
    message: "",
    messageTimer: 0,
    result: null,
    kills: 0,
  };
  for (let i = 0; i < 420; i++) spawnPickup(g, Math.random() < 0.16);
  return g;
}

export function spawnPickup(g: GameState, component: boolean, at?: { x: number; y: number }) {
  const x = at ? at.x + rand(-30, 30) : rand(80, WORLD.w - 80);
  const y = at ? at.y + rand(-30, 30) : rand(80, WORLD.h - 80);
  g.pickups.push({
    id: pickupId++,
    x,
    y,
    kind: component ? "component" : "scrap",
    ctype: component ? pick(COMPONENT_TYPES) : undefined,
    value: component ? 0 : Math.ceil(rand(1, 4)),
    seed: Math.random() * 999,
  });
}

export function burst(
  g: GameState,
  x: number,
  y: number,
  color: string,
  count = 14,
  power = 200,
) {
  for (let i = 0; i < count; i++) {
    const a = rand(0, Math.PI * 2);
    const s = rand(power * 0.25, power);
    g.particles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: rand(0.3, 0.85),
      maxLife: 0.85,
      color,
      size: rand(1.5, 4),
    });
  }
}

function float(g: GameState, x: number, y: number, text: string, color: string) {
  g.floats.push({ x, y, text, life: 1.1, color });
}

export interface Input {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  boost: boolean;
  drop: boolean;
}

function say(g: GameState, msg: string) {
  g.message = msg;
  g.messageTimer = 2.6;
}

export function update(g: GameState, dt: number, input: Input, viewW: number, viewH: number) {
  if (g.phase !== "playing") return;
  g.time += dt;
  g.messageTimer = Math.max(0, g.messageTimer - dt);

  const player = g.robots[0]!;

  for (const r of g.robots) {
    if (!r.alive) {
      if (!r.isPlayer && g.time >= r.respawnAt) reviveBot(r);
      continue;
    }
    const st = statsOf(r);
    r.maxHp = st.maxHp;
    if (r.hp > r.maxHp) r.hp = r.maxHp;

    let ax = 0,
      ay = 0;
    if (r.isPlayer) {
      ax = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      ay = (input.down ? 1 : 0) - (input.up ? 1 : 0);
      if (input.boost && r.boostCooldown <= 0 && r.energy > 22) {
        r.boostTimer = 0.32;
        r.boostCooldown = 1.5;
        r.energy -= 22;
        burst(g, r.x, r.y, "#38f6c9", 16, 240);
      }
    } else {
      const t = aiThink(g, r, st);
      ax = t.x;
      ay = t.y;
    }

    const len = Math.hypot(ax, ay);
    if (len > 0) {
      ax /= len;
      ay /= len;
      r.angle = Math.atan2(ay, ax);
    }
    const boostMul = r.boostTimer > 0 ? 2.3 : 1;
    const target = st.speed * boostMul;
    r.vx += (ax * target - r.vx) * Math.min(1, dt * 9);
    r.vy += (ay * target - r.vy) * Math.min(1, dt * 9);
    if (len === 0) {
      r.vx *= Math.exp(-4 * dt);
      r.vy *= Math.exp(-4 * dt);
    }
    r.x += r.vx * dt;
    r.y += r.vy * dt;
    r.x = Math.max(r.radius, Math.min(WORLD.w - r.radius, r.x));
    r.y = Math.max(r.radius, Math.min(WORLD.h - r.radius, r.y));

    r.boostTimer = Math.max(0, r.boostTimer - dt);
    r.boostCooldown = Math.max(0, r.boostCooldown - dt);
    r.hitFlash = Math.max(0, r.hitFlash - dt * 3);
    let regen = 8;
    for (const p of r.parts) regen += COMPONENTS[p].energy;
    r.energy = Math.min(100, r.energy + regen * dt);
    if (r.hp < r.maxHp) r.hp = Math.min(r.maxHp, r.hp + 2.2 * dt);

    // engine trail
    if (Math.hypot(r.vx, r.vy) > 60 && Math.random() < 0.5) {
      g.particles.push({
        x: r.x - Math.cos(r.angle) * 16,
        y: r.y - Math.sin(r.angle) * 16,
        vx: rand(-20, 20),
        vy: rand(-20, 20),
        life: 0.35,
        maxLife: 0.35,
        color: r.boostTimer > 0 ? "#ffffff" : r.tint,
        size: rand(1, 2.6),
      });
    }

    // obstacles
    for (const o of g.obstacles) {
      const dx = r.x - o.x,
        dy = r.y - o.y;
      const d = Math.hypot(dx, dy);
      const min = o.r + r.radius;
      if (d < min && d > 0) {
        r.x += (dx / d) * (min - d);
        r.y += (dy / d) * (min - d);
        r.vx *= 0.7;
        r.vy *= 0.7;
      }
    }
  }

  // pickups
  for (let i = g.pickups.length - 1; i >= 0; i--) {
    const p = g.pickups[i]!;
    for (const r of g.robots) {
      if (!r.alive) continue;
      const st = statsOf(r);
      const d = Math.hypot(p.x - r.x, p.y - r.y);
      if (d < st.magnet + 24) {
        const pull = Math.min(1, dt * 6);
        p.x += (r.x - p.x) * pull;
        p.y += (r.y - p.y) * pull;
      }
      if (d < r.radius + 12) {
        if (p.kind === "scrap") {
          r.scrap += p.value;
          if (r.isPlayer) {
            float(g, p.x, p.y, "+" + p.value, "#ffd23f");
            burst(g, p.x, p.y, "#ffd23f", 7, 110);
          }
        } else if (p.ctype) {
          if (r.parts.length >= 6) {
            if (r.isPlayer) float(g, p.x, p.y, "FRAME FULL", "#ff6b57");
            continue;
          }
          r.parts.push(p.ctype);
          const c = COMPONENTS[p.ctype];
          if (r.isPlayer) {
            float(g, p.x, p.y, c.name, c.color);
            say(g, `${c.name} attached — ${c.desc}`);
            burst(g, p.x, p.y, c.color, 20, 180);
          }
        }
        g.pickups.splice(i, 1);
        if (g.pickups.length < 430) spawnPickup(g, Math.random() < 0.16);
        break;
      }
    }
  }

  // robot vs robot
  for (let i = 0; i < g.robots.length; i++) {
    for (let j = i + 1; j < g.robots.length; j++) {
      const a = g.robots[i]!,
        b = g.robots[j]!;
      if (!a.alive || !b.alive) continue;
      const dx = b.x - a.x,
        dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 1;
      const min = a.radius + b.radius;
      if (d < min) {
        const nx = dx / d,
          ny = dy / d;
        const push = (min - d) / 2;
        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;
        const rel = Math.hypot(a.vx - b.vx, a.vy - b.vy);
        if (rel > 90) {
          const sa = statsOf(a),
            sb = statsOf(b);
          const pa = sa.ram * (a.boostTimer > 0 ? 2.4 : 1) * (Math.hypot(a.vx, a.vy) / 200 + 0.4);
          const pb = sb.ram * (b.boostTimer > 0 ? 2.4 : 1) * (Math.hypot(b.vx, b.vy) / 200 + 0.4);
          damage(g, b, pa * 0.9);
          damage(g, a, pb * 0.9);
          const win = pa > pb ? a : b;
          const lose = pa > pb ? b : a;
          if (Math.abs(pa - pb) > 8 && lose.parts.length > 0 && Math.random() < 0.45) {
            const stolen = lose.parts.splice(Math.floor(Math.random() * lose.parts.length), 1)[0]!;
            if (win.parts.length < 6) win.parts.push(stolen);
            else spawnPickup(g, true, lose);
            const c = COMPONENTS[stolen];
            float(g, lose.x, lose.y - 30, "STOLEN " + c.name, c.color);
            if (win.isPlayer) say(g, `Ripped ${c.name} off ${lose.name}!`);
            if (lose.isPlayer) say(g, `${win.name} tore off your ${c.name}!`);
          }
          a.vx -= nx * 260;
          a.vy -= ny * 260;
          b.vx += nx * 260;
          b.vy += ny * 260;
          burst(g, (a.x + b.x) / 2, (a.y + b.y) / 2, "#ffffff", 16, 240);
          if (a.isPlayer || b.isPlayer) g.shake = Math.min(18, g.shake + 10);
        }
      }
    }
  }

  // extraction
  const inZone =
    player.alive && Math.hypot(player.x - EXTRACT.x, player.y - EXTRACT.y) < EXTRACT.r;
  if (inZone && player.scrap >= SCRAP_GOAL) {
    g.extractProgress = Math.min(1, g.extractProgress + dt / 4);
    if (Math.random() < 0.6) burst(g, player.x, player.y, "#38f6c9", 3, 120);
    if (g.extractProgress >= 1) {
      g.phase = "won";
      g.result = {
        scrap: player.scrap,
        parts: player.parts.length,
        kills: g.kills,
        time: g.time,
      };
    }
  } else {
    g.extractProgress = Math.max(0, g.extractProgress - dt / 3);
  }

  // bots extracting = they just bank scrap and reset
  for (const r of g.robots) {
    if (r.isPlayer || !r.alive) continue;
    if (Math.hypot(r.x - EXTRACT.x, r.y - EXTRACT.y) < EXTRACT.r && r.scrap >= SCRAP_GOAL) {
      r.scrap = Math.floor(r.scrap * 0.4);
    }
  }

  // particles / floats
  for (let i = g.particles.length - 1; i >= 0; i--) {
    const p = g.particles[i]!;
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= Math.exp(-3 * dt);
    p.vy *= Math.exp(-3 * dt);
    if (p.life <= 0) g.particles.splice(i, 1);
  }
  for (let i = g.floats.length - 1; i >= 0; i--) {
    const f = g.floats[i]!;
    f.life -= dt;
    f.y -= 26 * dt;
    if (f.life <= 0) g.floats.splice(i, 1);
  }
  g.shake *= Math.exp(-6 * dt);

  // camera
  const camTarget = player.alive ? player : g.camera;
  g.camera.x += (camTarget.x - g.camera.x) * Math.min(1, dt * 5);
  g.camera.y += (camTarget.y - g.camera.y) * Math.min(1, dt * 5);
  g.camera.x = Math.max(viewW / 2, Math.min(WORLD.w - viewW / 2, g.camera.x));
  g.camera.y = Math.max(viewH / 2, Math.min(WORLD.h - viewH / 2, g.camera.y));

  if (!player.alive && g.phase === "playing") {
    g.phase = "lost";
    g.result = { scrap: 0, parts: 0, kills: g.kills, time: g.time };
  }
}

function damage(g: GameState, r: Robot, amount: number) {
  r.hp -= amount;
  r.hitFlash = 1;
  if (r.hp <= 0) {
    r.alive = false;
    burst(g, r.x, r.y, r.tint, 46, 380);
    burst(g, r.x, r.y, "#ffd23f", 24, 260);
    // drop loot
    const drop = Math.min(r.scrap, 40);
    for (let i = 0; i < Math.ceil(drop / 3); i++) spawnPickup(g, false, r);
    for (const p of r.parts) {
      g.pickups.push({
        id: Math.random() * 1e9,
        x: r.x + rand(-40, 40),
        y: r.y + rand(-40, 40),
        kind: "component",
        ctype: p,
        value: 0,
        seed: Math.random() * 999,
      });
    }
    r.parts = [];
    r.scrap = 0;
    r.respawnAt = g.time + 5;
    if (!r.isPlayer) g.kills++;
    g.shake = 22;
  }
}

function reviveBot(r: Robot) {
  r.alive = true;
  r.x = rand(200, WORLD.w - 200);
  r.y = rand(200, WORLD.h - 200);
  r.parts = Array.from({ length: Math.floor(rand(0, 3)) }, () => {
    return COMPONENT_TYPES[Math.floor(Math.random() * COMPONENT_TYPES.length)]!;
  }) as ComponentType[];
  r.maxHp = statsOf(r).maxHp;
  r.hp = r.maxHp;
  r.scrap = 0;
  r.vx = r.vy = 0;
}

function aiThink(g: GameState, r: Robot, st: Stats) {
  r.aiTimer -= 1 / 60;
  const player = g.robots[0]!;

  // flee when hurt
  if (r.hp < r.maxHp * 0.3) r.aiState = "flee";

  if (r.aiTimer <= 0) {
    r.aiTimer = 1.2;
    let best: Pickup | null = null;
    let bd = st.vision;
    for (const p of g.pickups) {
      const d = Math.hypot(p.x - r.x, p.y - r.y);
      const w = p.kind === "component" ? d * 0.55 : d;
      if (w < bd) {
        bd = w;
        best = p;
      }
    }
    let prey: Robot | null = null;
    for (const o of g.robots) {
      if (o === r || !o.alive) continue;
      const d = Math.hypot(o.x - r.x, o.y - r.y);
      if (d < st.vision * 0.8 && statsOf(o).ram < st.ram * 1.05 && o.parts.length + o.scrap > 4) {
        prey = o;
        break;
      }
    }
    if (r.hp < r.maxHp * 0.3) {
      r.aiState = "flee";
      r.aiTargetId = null;
    } else if (prey && Math.random() < 0.7) {
      r.aiState = "hunt";
      r.aiTargetId = prey.id;
    } else if (best) {
      r.aiState = "collect";
      r.aiTarget = { x: best.x, y: best.y };
    } else {
      r.aiState = "roam";
      r.aiTarget = { x: rand(200, WORLD.w - 200), y: rand(200, WORLD.h - 200) };
    }
    if (r.scrap >= SCRAP_GOAL) {
      r.aiState = "collect";
      r.aiTarget = { x: EXTRACT.x, y: EXTRACT.y };
    }
  }

  let tx = r.aiTarget?.x ?? r.x;
  let ty = r.aiTarget?.y ?? r.y;
  if (r.aiState === "hunt" && r.aiTargetId) {
    const t = g.robots.find((o) => o.id === r.aiTargetId);
    if (t && t.alive) {
      tx = t.x;
      ty = t.y;
      const d = Math.hypot(tx - r.x, ty - r.y);
      if (d < 200 && r.boostCooldown <= 0 && r.energy > 25) {
        r.boostTimer = 0.32;
        r.boostCooldown = 2.2;
        r.energy -= 25;
      }
    } else r.aiTimer = 0;
  } else if (r.aiState === "flee") {
    const d = Math.hypot(player.x - r.x, player.y - r.y);
    if (d < 700) {
      tx = r.x - (player.x - r.x);
      ty = r.y - (player.y - r.y);
    }
  } else if (r.aiState === "collect") {
    const near = g.pickups.reduce<{ p: Pickup | null; d: number }>(
      (acc, p) => {
        const d = Math.hypot(p.x - r.x, p.y - r.y);
        return d < acc.d ? { p, d } : acc;
      },
      { p: null, d: st.vision },
    );
    if (near.p && r.scrap < SCRAP_GOAL) {
      tx = near.p.x;
      ty = near.p.y;
    }
  }

  let dx = tx - r.x,
    dy = ty - r.y;
  // simple obstacle avoidance
  for (const o of g.obstacles) {
    const ox = r.x - o.x,
      oy = r.y - o.y;
    const d = Math.hypot(ox, oy);
    if (d < o.r + 90 && d > 0) {
      dx += (ox / d) * (o.r + 90 - d) * 2.2;
      dy += (oy / d) * (o.r + 90 - d) * 2.2;
    }
  }
  const l = Math.hypot(dx, dy) || 1;
  return { x: dx / l, y: dy / l };
}

export function leaderboard(g: GameState) {
  return [...g.robots]
    .map((r) => ({
      id: r.id,
      name: r.name,
      isPlayer: r.isPlayer,
      score: r.scrap + r.parts.length * 8,
      alive: r.alive,
      tint: r.tint,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}
