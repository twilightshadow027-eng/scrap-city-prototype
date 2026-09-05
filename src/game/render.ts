import { COMPONENTS, EXTRACT, SCRAP_GOAL, WORLD, type Robot } from "./types";
import { statsOf, type GameState } from "./engine";

export function render(
  ctx: CanvasRenderingContext2D,
  g: GameState,
  w: number,
  h: number,
  time: number,
) {
  ctx.clearRect(0, 0, w, h);
  // backdrop
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, "#080d18");
  bg.addColorStop(1, "#0d0713");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const shakeX = (Math.random() - 0.5) * g.shake;
  const shakeY = (Math.random() - 0.5) * g.shake;
  const camX = g.camera.x - w / 2 + shakeX;
  const camY = g.camera.y - h / 2 + shakeY;

  ctx.save();
  ctx.translate(-camX, -camY);

  drawGrid(ctx, camX, camY, w, h, time);
  drawBounds(ctx);
  drawExtract(ctx, g, time);

  // obstacles
  for (const o of g.obstacles) {
    if (o.x + o.r < camX || o.x - o.r > camX + w || o.y + o.r < camY || o.y - o.r > camY + h)
      continue;
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.rotate(o.seed);
    ctx.fillStyle = "#141a2a";
    ctx.strokeStyle = "rgba(120,160,220,0.28)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    const sides = 6;
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2;
      const rr = o.r * (0.72 + ((Math.sin(o.seed + i * 2.3) + 1) / 2) * 0.35);
      ctx[i === 0 ? "moveTo" : "lineTo"](Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(255,107,87,0.5)";
    ctx.fillRect(-o.r * 0.2, -o.r * 0.12, o.r * 0.4, o.r * 0.06);
    ctx.restore();
  }

  // pickups
  for (const p of g.pickups) {
    if (p.x < camX - 40 || p.x > camX + w + 40 || p.y < camY - 40 || p.y > camY + h + 40) continue;
    const bob = Math.sin(time * 2.4 + p.seed) * 3;
    if (p.kind === "scrap") {
      ctx.save();
      ctx.translate(p.x, p.y + bob);
      ctx.rotate(time * 0.8 + p.seed);
      ctx.shadowColor = "rgba(255,210,63,0.9)";
      ctx.shadowBlur = 14;
      ctx.fillStyle = "#ffd23f";
      const s = 4 + p.value;
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.lineTo(s, 0);
      ctx.lineTo(0, s);
      ctx.lineTo(-s, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else if (p.ctype) {
      const c = COMPONENTS[p.ctype];
      ctx.save();
      ctx.translate(p.x, p.y + bob);
      ctx.rotate(time * 1.2 + p.seed);
      ctx.shadowColor = c.glow;
      ctx.shadowBlur = 20;
      ctx.strokeStyle = c.color;
      ctx.lineWidth = 3;
      ctx.strokeRect(-9, -9, 18, 18);
      ctx.fillStyle = c.color;
      ctx.globalAlpha = 0.35;
      ctx.fillRect(-9, -9, 18, 18);
      ctx.restore();
    }
  }

  // particles
  for (const p of g.particles) {
    const a = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;

  for (const r of g.robots) if (r.alive) drawRobot(ctx, r, time);

  for (const f of g.floats) {
    ctx.globalAlpha = Math.min(1, f.life);
    ctx.fillStyle = f.color;
    ctx.font = "bold 15px 'Rajdhani', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // vignette
  const vg = ctx.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, h * 0.85);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.7)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);

  drawOffscreenMarkers(ctx, g, w, h);
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  camX: number,
  camY: number,
  w: number,
  h: number,
  time: number,
) {
  const step = 120;
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(56,246,201,0.07)";
  ctx.beginPath();
  const sx = Math.floor(camX / step) * step;
  const sy = Math.floor(camY / step) * step;
  for (let x = sx; x < camX + w + step; x += step) {
    ctx.moveTo(x, camY);
    ctx.lineTo(x, camY + h);
  }
  for (let y = sy; y < camY + h + step; y += step) {
    ctx.moveTo(camX, y);
    ctx.lineTo(camX + w, y);
  }
  ctx.stroke();
  // scan pulse
  const py = ((time * 90) % (WORLD.h + 400)) - 200;
  const grad = ctx.createLinearGradient(0, py - 120, 0, py + 120);
  grad.addColorStop(0, "rgba(139,92,255,0)");
  grad.addColorStop(0.5, "rgba(139,92,255,0.07)");
  grad.addColorStop(1, "rgba(139,92,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(camX, py - 120, w, 240);
}

function drawBounds(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = "rgba(255,63,164,0.5)";
  ctx.lineWidth = 6;
  ctx.shadowColor = "rgba(255,63,164,0.6)";
  ctx.shadowBlur = 24;
  ctx.strokeRect(0, 0, WORLD.w, WORLD.h);
  ctx.shadowBlur = 0;
}

function drawExtract(ctx: CanvasRenderingContext2D, g: GameState, time: number) {
  const p = g.robots[0]!;
  const ready = p.scrap >= SCRAP_GOAL;
  const col = ready ? "56,246,201" : "255,210,63";
  ctx.save();
  ctx.translate(EXTRACT.x, EXTRACT.y);
  const grd = ctx.createRadialGradient(0, 0, 20, 0, 0, EXTRACT.r);
  grd.addColorStop(0, `rgba(${col},0.16)`);
  grd.addColorStop(1, `rgba(${col},0)`);
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(0, 0, EXTRACT.r, 0, Math.PI * 2);
  ctx.fill();

  for (let i = 0; i < 3; i++) {
    const t = (time * 0.35 + i / 3) % 1;
    ctx.strokeStyle = `rgba(${col},${0.5 * (1 - t)})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, EXTRACT.r * (0.25 + t * 0.75), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.setLineDash([26, 18]);
  ctx.lineDashOffset = -time * 40;
  ctx.strokeStyle = `rgba(${col},0.85)`;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, EXTRACT.r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = `rgba(${col},0.9)`;
  ctx.font = "bold 30px 'Orbitron', system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("EXTRACTION", 0, -8);
  ctx.font = "600 18px 'Rajdhani', system-ui, sans-serif";
  ctx.fillText(ready ? "HOLD POSITION" : `NEEDS ${SCRAP_GOAL} SCRAP`, 0, 20);
  ctx.restore();
}

function drawRobot(ctx: CanvasRenderingContext2D, r: Robot, time: number) {
  const st = statsOf(r);
  ctx.save();
  ctx.translate(r.x, r.y);

  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.beginPath();
  ctx.ellipse(0, 8, r.radius * 1.1, r.radius * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.rotate(r.angle);

  const has = (t: keyof typeof COMPONENTS) => r.parts.includes(t);

  // booster flame
  if (r.boostTimer > 0 || (has("booster") && Math.hypot(r.vx, r.vy) > 100)) {
    ctx.fillStyle = r.boostTimer > 0 ? "#ffffff" : COMPONENTS.booster.color;
    ctx.shadowColor = COMPONENTS.booster.glow;
    ctx.shadowBlur = 20;
    const l = 18 + Math.sin(time * 40) * 6 + (r.boostTimer > 0 ? 22 : 0);
    ctx.beginPath();
    ctx.moveTo(-r.radius, -6);
    ctx.lineTo(-r.radius - l, 0);
    ctx.lineTo(-r.radius, 6);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // wheels / treads
  if (has("wheels")) {
    ctx.fillStyle = COMPONENTS.wheels.color;
    ctx.shadowColor = COMPONENTS.wheels.glow;
    ctx.shadowBlur = 12;
    ctx.fillRect(-16, -r.radius - 7, 30, 7);
    ctx.fillRect(-16, r.radius, 30, 7);
    ctx.shadowBlur = 0;
  }

  // armor plates
  if (has("armor")) {
    ctx.strokeStyle = COMPONENTS.armor.color;
    ctx.lineWidth = 5;
    ctx.shadowColor = COMPONENTS.armor.glow;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(0, 0, r.radius + 6, -1.1, 1.1);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // magnet arms
  if (has("magnet")) {
    ctx.strokeStyle = COMPONENTS.magnet.color;
    ctx.lineWidth = 4;
    ctx.shadowColor = COMPONENTS.magnet.glow;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(r.radius + 6, -10, 8, Math.PI * 0.5, Math.PI * 1.9);
    ctx.arc(r.radius + 6, 10, 8, Math.PI * 0.1, Math.PI * 1.5);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // body
  ctx.fillStyle = "#131b2c";
  ctx.strokeStyle = r.tint;
  ctx.lineWidth = 3;
  ctx.shadowColor = r.tint;
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.moveTo(r.radius, 0);
  ctx.lineTo(2, -r.radius);
  ctx.lineTo(-r.radius + 2, -r.radius * 0.7);
  ctx.lineTo(-r.radius + 2, r.radius * 0.7);
  ctx.lineTo(2, r.radius);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;

  // battery core
  ctx.fillStyle = has("battery") ? COMPONENTS.battery.color : "rgba(120,160,220,0.5)";
  ctx.shadowColor = has("battery") ? COMPONENTS.battery.glow : "transparent";
  ctx.shadowBlur = has("battery") ? 16 : 0;
  ctx.fillRect(-6, -5, 10, 10);
  ctx.shadowBlur = 0;

  // sensor eye
  if (has("sensor")) {
    ctx.fillStyle = COMPONENTS.sensor.color;
    ctx.shadowColor = COMPONENTS.sensor.glow;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(r.radius - 6, 0, 4.5 + Math.sin(time * 6) * 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  if (r.hitFlash > 0) {
    ctx.globalAlpha = r.hitFlash * 0.7;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(0, 0, r.radius + 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.restore();

  // name + hp
  ctx.save();
  ctx.translate(r.x, r.y);
  const bw = 52;
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(-bw / 2, -r.radius - 24, bw, 5);
  ctx.fillStyle = r.hp / st.maxHp > 0.4 ? "#38f6c9" : "#ff6b57";
  ctx.fillRect(-bw / 2, -r.radius - 24, bw * Math.max(0, r.hp / st.maxHp), 5);
  ctx.font = "600 12px 'Rajdhani', system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = r.isPlayer ? "#38f6c9" : "rgba(220,235,255,0.75)";
  ctx.fillText(r.name, 0, -r.radius - 30);
  ctx.restore();
}

function drawOffscreenMarkers(
  ctx: CanvasRenderingContext2D,
  g: GameState,
  w: number,
  h: number,
) {
  const cx = w / 2,
    cy = h / 2;
  const dx = EXTRACT.x - g.camera.x;
  const dy = EXTRACT.y - g.camera.y;
  if (Math.abs(dx) < w / 2 - 60 && Math.abs(dy) < h / 2 - 60) return;
  const a = Math.atan2(dy, dx);
  const rad = Math.min(w, h) / 2 - 70;
  const x = cx + Math.cos(a) * rad;
  const y = cy + Math.sin(a) * rad;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.fillStyle = "#38f6c9";
  ctx.shadowColor = "rgba(56,246,201,0.8)";
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.moveTo(12, 0);
  ctx.lineTo(-8, -8);
  ctx.lineTo(-8, 8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function renderMinimap(ctx: CanvasRenderingContext2D, g: GameState, size: number) {
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = "rgba(6,10,20,0.85)";
  ctx.fillRect(0, 0, size, size);
  const s = size / WORLD.w;
  ctx.strokeStyle = "rgba(56,246,201,0.25)";
  ctx.strokeRect(0, 0, size, size);

  ctx.fillStyle = "rgba(120,160,220,0.18)";
  for (const o of g.obstacles) ctx.fillRect(o.x * s - 1, o.y * s - 1, 2, 2);

  ctx.strokeStyle = "rgba(56,246,201,0.9)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(EXTRACT.x * s, EXTRACT.y * s, EXTRACT.r * s, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "rgba(255,210,63,0.5)";
  for (const p of g.pickups) {
    if (p.kind === "component") ctx.fillRect(p.x * s - 1, p.y * s - 1, 2.5, 2.5);
  }

  for (const r of g.robots) {
    if (!r.alive) continue;
    ctx.fillStyle = r.isPlayer ? "#38f6c9" : "#ff5c7a";
    ctx.beginPath();
    ctx.arc(r.x * s, r.y * s, r.isPlayer ? 4 : 2.6, 0, Math.PI * 2);
    ctx.fill();
  }
}
