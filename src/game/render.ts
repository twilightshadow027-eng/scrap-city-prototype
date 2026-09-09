import { COMPONENTS, EXTRACT, SCRAP_GOAL, SKINS, WORLD, type ComponentType, type Robot, type Turret } from "./types";
import { statsOf, type GameState } from "./engine";

const P = {
  void: "#080b0d", floor: "#111719", steel: "#273138", steel2: "#384248", edge: "#667277",
  rust: "#9a4e2d", rust2: "#d6783d", cyan: "#65e6ce", amber: "#e4c84a", red: "#ff6c51",
  magenta: "#d85f9d", ink: "#050708", pale: "#d7e3df",
};

export function render(ctx: CanvasRenderingContext2D, g: GameState, w: number, h: number, time: number) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = P.void;
  ctx.fillRect(0, 0, w, h);
  const shakeX = (Math.random() - 0.5) * g.shake;
  const shakeY = (Math.random() - 0.5) * g.shake;
  const camX = g.camera.x - w / 2 + shakeX;
  const camY = g.camera.y - h / 2 + shakeY;
  ctx.save();
  ctx.translate(-camX, -camY);
  drawFloor(ctx, camX, camY, w, h);
  drawRoads(ctx);
  drawHazards(ctx, g, time, camX, camY, w, h);
  drawExtract(ctx, g, time);
  for (const o of g.obstacles) {
    if (!visible(o.x, o.y, o.r + 40, camX, camY, w, h)) continue;
    drawProp(ctx, o, time);
  }
  for (const turret of g.turrets) if (visible(turret.x, turret.y, 680, camX, camY, w, h)) drawTurret(ctx, turret, time, g.robots[0]);
  for (const p of g.pickups) {
    if (!visible(p.x, p.y, 50, camX, camY, w, h)) continue;
    const bob = Math.sin(time * 2.4 + p.seed) * 3;
    if (p.kind === "scrap") drawScrap(ctx, p.x, p.y + bob, p.value, p.seed + time * 0.4);
    else if (p.ctype) drawModulePickup(ctx, p.x, p.y + bob, p.ctype, time + p.seed, p.rejected);
  }
  for (const projectile of g.projectiles) {
    ctx.save();
    ctx.translate(projectile.x, projectile.y);
    ctx.rotate(Math.atan2(projectile.vy, projectile.vx));
    ctx.shadowColor = projectile.type === "missile" ? P.red : P.amber;
    ctx.shadowBlur = 18;
    ctx.fillStyle = projectile.type === "missile" ? P.red : P.amber;
    ctx.fillRect(-9, -3, 16, 6);
    ctx.fillStyle = P.pale;
    ctx.fillRect(3, -2, 5, 4);
    ctx.restore();
  }
  for (const p of g.particles) {
    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size * 1.7, p.size * 0.7);
  }
  ctx.globalAlpha = 1;
  for (const r of g.robots) if (r.alive) drawRobot(ctx, r, time);
  for (const f of g.floats) {
    ctx.globalAlpha = Math.min(1, f.life);
    ctx.fillStyle = f.color;
    ctx.font = "700 15px 'Rajdhani', system-ui";
    ctx.textAlign = "center";
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.restore();
  ctx.globalAlpha = 1;
  const vignette = ctx.createRadialGradient(w / 2, h / 2, h * 0.28, w / 2, h / 2, h * 0.78);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,.72)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
  drawOffscreenMarker(ctx, g, w, h);
}

function visible(x: number, y: number, radius: number, camX: number, camY: number, w: number, h: number) {
  return x + radius > camX && x - radius < camX + w && y + radius > camY && y - radius < camY + h;
}

function drawFloor(ctx: CanvasRenderingContext2D, camX: number, camY: number, w: number, h: number) {
  ctx.fillStyle = P.floor;
  ctx.fillRect(camX, camY, w, h);
  const size = 180;
  const sx = Math.floor(camX / size) * size;
  const sy = Math.floor(camY / size) * size;
  for (let x = sx; x < camX + w + size; x += size) for (let y = sy; y < camY + h + size; y += size) {
    const n = Math.abs(Math.sin(x * 0.013 + y * 0.021));
    ctx.fillStyle = n > 0.72 ? "#151d1f" : "#101618";
    ctx.fillRect(x + 2, y + 2, size - 4, size - 4);
    ctx.strokeStyle = "rgba(122,142,145,.12)";
    ctx.strokeRect(x + 4, y + 4, size - 8, size - 8);
    ctx.fillStyle = "rgba(184,95,48,.22)";
    ctx.beginPath(); ctx.arc(x + 25 + n * 90, y + 40 + n * 80, 8 + n * 18, 0, Math.PI * 2); ctx.fill();
    for (const [bx, by] of [[12, 12], [168, 12], [12, 168], [168, 168]]) {
      ctx.fillStyle = "#566064"; ctx.beginPath(); ctx.arc(x + bx, y + by, 2, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function drawRoads(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#0b1012";
  ctx.fillRect(0, EXTRACT.y - 150, WORLD.w, 300);
  ctx.fillRect(EXTRACT.x - 150, 0, 300, WORLD.h);
  ctx.strokeStyle = "rgba(228,200,74,.2)";
  ctx.lineWidth = 3;
  ctx.setLineDash([34, 28]);
  ctx.beginPath(); ctx.moveTo(0, EXTRACT.y); ctx.lineTo(WORLD.w, EXTRACT.y); ctx.moveTo(EXTRACT.x, 0); ctx.lineTo(EXTRACT.x, WORLD.h); ctx.stroke();
  ctx.setLineDash([]);
}

function drawHazards(ctx: CanvasRenderingContext2D, g: GameState, time: number, camX: number, camY: number, w: number, h: number) {
  for (const zone of g.hazards) {
    if (!visible(zone.x, zone.y, zone.r, camX, camY, w, h)) continue;
    ctx.save(); ctx.translate(zone.x, zone.y);
    ctx.fillStyle = "rgba(140,48,25,.13)"; ctx.strokeStyle = "rgba(255,108,81,.55)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, zone.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.rotate(zone.seed);
    for (let i = -zone.r; i < zone.r; i += 24) {
      ctx.strokeStyle = "rgba(228,200,74,.25)"; ctx.beginPath(); ctx.moveTo(i, -zone.r); ctx.lineTo(i + zone.r * 2, zone.r); ctx.stroke();
    }
    ctx.fillStyle = P.red; ctx.globalAlpha = 0.45 + Math.sin(time * 5 + zone.seed) * 0.2;
    ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
}

function drawProp(ctx: CanvasRenderingContext2D, o: GameState["obstacles"][number], time: number) {
  ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.seed);
  ctx.fillStyle = "rgba(0,0,0,.5)"; ctx.beginPath(); ctx.ellipse(8, 14, o.r, o.r * .64, 0, 0, Math.PI * 2); ctx.fill();
  if (o.kind === "building") {
    ctx.fillStyle = P.steel; ctx.strokeStyle = P.edge; ctx.lineWidth = 3;
    ctx.fillRect(-o.r * .8, -o.r * .72, o.r * 1.6, o.r * 1.44); ctx.strokeRect(-o.r * .8, -o.r * .72, o.r * 1.6, o.r * 1.44);
    ctx.fillStyle = "#182023"; ctx.fillRect(-o.r * .55, -o.r * .42, o.r * 1.1, o.r * .32);
    ctx.fillStyle = Math.sin(time * 2 + o.seed) > 0 ? P.cyan : "#32524f";
    for (let x = -o.r * .42; x < o.r * .45; x += 15) ctx.fillRect(x, -o.r * .31, 7, 4);
    ctx.fillStyle = P.rust; ctx.fillRect(-o.r * .8, o.r * .34, o.r * .55, 7);
  } else if (o.kind === "tank") {
    ctx.fillStyle = "#303a39"; ctx.strokeStyle = P.rust2; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, 0, o.r * .72, o.r, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#161c1d"; ctx.fillRect(-o.r * .6, -6, o.r * 1.2, 12);
    ctx.strokeStyle = "rgba(101,230,206,.55)"; ctx.beginPath(); ctx.arc(0, -o.r * .2, o.r * .18, 0, Math.PI * 2); ctx.stroke();
  } else if (o.kind === "pipe") {
    ctx.strokeStyle = "#445155"; ctx.lineWidth = Math.max(14, o.r * .3); ctx.beginPath(); ctx.arc(0, 0, o.r * .62, .2, Math.PI * 1.5); ctx.stroke();
    ctx.strokeStyle = P.rust2; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = P.cyan; ctx.globalAlpha = .5; ctx.fillRect(o.r * .42, o.r * .35, 16, 5);
  } else {
    for (let i = 0; i < 7; i++) {
      const a = i * 2.2 + o.seed; const rr = o.r * (.2 + (i % 3) * .18);
      ctx.fillStyle = i % 2 ? P.steel2 : "#4b332b";
      ctx.save(); ctx.translate(Math.cos(a) * rr, Math.sin(a) * rr); ctx.rotate(a); ctx.fillRect(-o.r * .28, -8, o.r * .56, 16); ctx.restore();
    }
    ctx.strokeStyle = P.rust2; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, o.r * .45, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

function drawScrap(ctx: CanvasRenderingContext2D, x: number, y: number, value: number, rotation: number) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rotation); ctx.shadowColor = P.amber; ctx.shadowBlur = 12;
  ctx.fillStyle = "#75552d"; ctx.strokeStyle = P.amber; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-7 - value, -4); ctx.lineTo(3, -8); ctx.lineTo(8 + value, 2); ctx.lineTo(1, 8); ctx.lineTo(-8, 4); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = P.pale; ctx.fillRect(-2, -2, 4, 4); ctx.restore();
}

function drawModulePickup(ctx: CanvasRenderingContext2D, x: number, y: number, type: ComponentType, time: number, rejected: number) {
  const c = COMPONENTS[type];
  ctx.save(); ctx.translate(x, y); ctx.rotate(time * .65); ctx.shadowColor = c.color; ctx.shadowBlur = rejected > 0 ? 26 : 14;
  ctx.fillStyle = P.steel; ctx.strokeStyle = c.color; ctx.lineWidth = 2;
  ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; const r = i % 2 ? 10 : 14; ctx[i ? "lineTo" : "moveTo"](Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = c.color; ctx.fillRect(-4, -4, 8, 8);
  if (rejected > 0) { ctx.globalAlpha = rejected; ctx.strokeStyle = P.red; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 18 + (1 - rejected) * 24, 0, Math.PI * 2); ctx.stroke(); }
  ctx.restore();
}

function drawExtract(ctx: CanvasRenderingContext2D, g: GameState, time: number) {
  const player = g.robots[0]; if (!player) return;
  const ready = player.scrap >= SCRAP_GOAL; const color = ready ? P.cyan : P.amber;
  ctx.save(); ctx.translate(EXTRACT.x, EXTRACT.y);
  const glow = ctx.createRadialGradient(0, 0, 20, 0, 0, EXTRACT.r * 1.25);
  glow.addColorStop(0, ready ? "rgba(101,230,206,.28)" : "rgba(228,200,74,.18)"); glow.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = glow; ctx.fillRect(-EXTRACT.r * 1.3, -EXTRACT.r * 1.3, EXTRACT.r * 2.6, EXTRACT.r * 2.6);
  ctx.strokeStyle = "#536064"; ctx.lineWidth = 26; ctx.beginPath(); ctx.arc(0, 0, EXTRACT.r, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = P.rust2; ctx.lineWidth = 4; ctx.setLineDash([28, 14]); ctx.lineDashOffset = time * 22; ctx.stroke(); ctx.setLineDash([]);
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ctx.save(); ctx.rotate(a); ctx.translate(EXTRACT.r, 0); ctx.fillStyle = P.steel2; ctx.strokeStyle = color; ctx.fillRect(-16, -26, 32, 52); ctx.strokeRect(-16, -26, 32, 52); ctx.restore(); }
  for (let i = 0; i < 3; i++) { const y = -55 - i * 54; ctx.strokeStyle = color; ctx.globalAlpha = .5; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(0, y, 64 - i * 12, 20 - i * 3, 0, 0, Math.PI * 2); ctx.stroke(); }
  ctx.globalAlpha = 1; ctx.shadowColor = color; ctx.shadowBlur = 24; ctx.fillStyle = color; ctx.fillRect(-7, -185, 14, 155);
  ctx.shadowBlur = 0; ctx.fillStyle = P.ink; ctx.fillRect(-90, -15, 180, 34); ctx.strokeStyle = color; ctx.strokeRect(-90, -15, 180, 34);
  ctx.fillStyle = color; ctx.font = "800 18px 'Orbitron', system-ui"; ctx.textAlign = "center"; ctx.fillText(ready ? "BEACON ARMED" : `${SCRAP_GOAL} SCRAP REQUIRED`, 0, 8); ctx.restore();
}

function drawTurret(ctx: CanvasRenderingContext2D, turret: Turret, time: number, player: Robot | undefined) {
  const colors = { scout: P.cyan, pulse: P.magenta, missile: P.red, shield: P.amber };
  const color = colors[turret.type];
  ctx.save(); ctx.translate(turret.x, turret.y);
  if (turret.type === "shield") { ctx.strokeStyle = "rgba(228,200,74,.28)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 58 + Math.sin(time * 3) * 3, 0, Math.PI * 2); ctx.stroke(); }
  if (player && turret.telegraph > 0) { ctx.strokeStyle = color; ctx.globalAlpha = .2 + (1 - turret.telegraph) * .5; ctx.setLineDash([10, 8]); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(player.x - turret.x, player.y - turret.y); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; }
  ctx.fillStyle = "rgba(0,0,0,.5)"; ctx.beginPath(); ctx.ellipse(5, 10, 38, 22, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = P.steel2; ctx.strokeStyle = P.rust; ctx.lineWidth = 3; ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ctx[i ? "lineTo" : "moveTo"](Math.cos(a) * 34, Math.sin(a) * 34); } ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.rotate(turret.angle);
  if (turret.type === "missile") { ctx.fillStyle = "#4b3730"; ctx.fillRect(-4, -19, 33, 13); ctx.fillRect(-4, 6, 33, 13); ctx.fillStyle = color; ctx.fillRect(20, -16, 7, 7); ctx.fillRect(20, 9, 7, 7); }
  else if (turret.type === "pulse") { ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(7, 0, 17 + Math.sin(time * 5) * 2, -1, 1); ctx.stroke(); ctx.fillStyle = color; ctx.fillRect(5, -4, 29, 8); }
  else if (turret.type === "shield") { ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(4, -19); ctx.lineTo(25, -11); ctx.lineTo(25, 11); ctx.lineTo(4, 19); ctx.closePath(); ctx.fill(); }
  else { ctx.fillStyle = "#59656a"; ctx.fillRect(0, -6, 38, 12); ctx.fillStyle = color; ctx.fillRect(28, -4, 10, 8); }
  ctx.shadowColor = color; ctx.shadowBlur = 14; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ctx.save(); ctx.translate(turret.x, turret.y + 50); ctx.fillStyle = color; ctx.font = "700 10px 'Rajdhani'"; ctx.textAlign = "center"; ctx.fillText(turret.type.toUpperCase(), 0, 0); ctx.restore();
}

function drawRobot(ctx: CanvasRenderingContext2D, robot: Robot, time: number) {
  const stats = statsOf(robot); const skin = robot.isPlayer ? SKINS[robot.skin] : { body: P.steel, edge: robot.tint, light: robot.tint };
  ctx.save(); ctx.translate(robot.x, robot.y);
  ctx.fillStyle = "rgba(0,0,0,.58)"; ctx.beginPath(); ctx.ellipse(7, 12, robot.radius * 1.55, robot.radius * .85, 0, 0, Math.PI * 2); ctx.fill();
  ctx.rotate(robot.angle);
  const speed = Math.hypot(robot.vx, robot.vy);
  if (robot.parts.includes("booster") || robot.boostTimer > 0) {
    const length = 18 + (robot.boostTimer > 0 ? 30 : 4) + Math.sin(time * 32) * 4;
    ctx.shadowColor = COMPONENTS.booster.color; ctx.shadowBlur = 20; ctx.fillStyle = robot.boostTimer > 0 ? P.pale : COMPONENTS.booster.color;
    ctx.beginPath(); ctx.moveTo(-25, -7); ctx.lineTo(-25 - length, 0); ctx.lineTo(-25, 7); ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0;
  }
  if (robot.parts.includes("wheels")) drawTreads(ctx, speed, time);
  else if (robot.design === 1) drawCrawlerLegs(ctx, time, speed);
  else if (robot.design === 2) drawWheels(ctx, time, speed);
  else drawSkids(ctx);
  if (robot.parts.includes("armor")) { ctx.fillStyle = "#70432f"; ctx.strokeStyle = COMPONENTS.armor.color; ctx.lineWidth = 2; ctx.fillRect(-18, -31, 30, 9); ctx.strokeRect(-18, -31, 30, 9); ctx.fillRect(-18, 22, 30, 9); ctx.strokeRect(-18, 22, 30, 9); }
  ctx.fillStyle = skin.body; ctx.strokeStyle = skin.edge; ctx.lineWidth = robot.isPlayer ? 3 : 2;
  ctx.shadowColor = skin.edge; ctx.shadowBlur = robot.isPlayer ? 12 : 6;
  ctx.beginPath();
  if (robot.design === 3) { ctx.moveTo(29, 0); ctx.lineTo(10, -25); ctx.lineTo(-21, -18); ctx.lineTo(-30, 0); ctx.lineTo(-21, 18); ctx.lineTo(10, 25); }
  else if (robot.design === 2) { ctx.roundRect(-25, -20, 52, 40, 8); }
  else { ctx.moveTo(28, 0); ctx.lineTo(12, -24); ctx.lineTo(-22, -19); ctx.lineTo(-28, 0); ctx.lineTo(-22, 19); ctx.lineTo(12, 24); }
  ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(220,230,225,.28)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-12, -13); ctx.lineTo(12, -13); ctx.lineTo(20, 0); ctx.stroke();
  if (robot.parts.includes("magnet")) { ctx.strokeStyle = COMPONENTS.magnet.color; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(23, -14, 9, .4, Math.PI * 1.6); ctx.arc(23, 14, 9, -1.6, -.4); ctx.stroke(); }
  const core = robot.parts.includes("battery") ? COMPONENTS.battery.color : skin.light;
  ctx.fillStyle = "#080b0d"; ctx.beginPath(); ctx.arc(-3, 0, 11, 0, Math.PI * 2); ctx.fill();
  ctx.shadowColor = core; ctx.shadowBlur = 18; ctx.fillStyle = core; ctx.beginPath(); ctx.arc(-3, 0, 5 + Math.sin(time * 5) * .8, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
  if (robot.parts.includes("sensor")) { ctx.fillStyle = COMPONENTS.sensor.color; ctx.fillRect(8, -18, 14, 5); ctx.beginPath(); ctx.arc(25, 0, 5, 0, Math.PI * 2); ctx.fill(); }
  if (robot.parts.includes("booster")) { ctx.fillStyle = COMPONENTS.booster.color; ctx.fillRect(-31, -13, 9, 8); ctx.fillRect(-31, 5, 9, 8); }
  if (robot.hitFlash > 0) { ctx.globalAlpha = robot.hitFlash * .65; ctx.fillStyle = P.pale; ctx.beginPath(); ctx.arc(0, 0, 32, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
  ctx.save(); ctx.translate(robot.x, robot.y); const width = 58;
  ctx.fillStyle = "rgba(2,4,5,.82)"; ctx.fillRect(-width / 2, -43, width, 5); ctx.fillStyle = robot.hp / stats.maxHp > .4 ? skin.edge : P.red; ctx.fillRect(-width / 2, -43, width * Math.max(0, robot.hp / stats.maxHp), 5);
  ctx.font = "700 11px 'Rajdhani'"; ctx.textAlign = "center"; ctx.fillStyle = robot.isPlayer ? skin.light : P.pale; ctx.fillText(robot.name, 0, -49); ctx.restore();
}

function drawTreads(ctx: CanvasRenderingContext2D, speed: number, time: number) {
  for (const y of [-27, 27]) { ctx.fillStyle = "#080b0d"; ctx.fillRect(-23, y - 6, 44, 12); ctx.strokeStyle = COMPONENTS.wheels.color; ctx.lineWidth = 2; ctx.strokeRect(-23, y - 6, 44, 12); for (let x = -18; x < 19; x += 9) { ctx.fillStyle = (Math.floor(time * speed / 40) + x / 9) % 2 ? "#566064" : "#252e31"; ctx.fillRect(x, y - 4, 6, 8); } }
}
function drawCrawlerLegs(ctx: CanvasRenderingContext2D, time: number, speed: number) { ctx.strokeStyle = "#657075"; ctx.lineWidth = 5; for (const side of [-1, 1]) for (let i = -1; i <= 1; i++) { const x = i * 15; const swing = Math.sin(time * 8 + i) * Math.min(6, speed / 50); ctx.beginPath(); ctx.moveTo(x, side * 15); ctx.lineTo(x + swing, side * 31); ctx.stroke(); } }
function drawWheels(ctx: CanvasRenderingContext2D, time: number, speed: number) { for (const x of [-16, 14]) for (const y of [-24, 24]) { ctx.save(); ctx.translate(x, y); ctx.rotate(time * speed / 18); ctx.fillStyle = "#090c0d"; ctx.strokeStyle = "#687479"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore(); } }
function drawSkids(ctx: CanvasRenderingContext2D) { ctx.strokeStyle = "#647075"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-20, -24); ctx.lineTo(18, -24); ctx.moveTo(-20, 24); ctx.lineTo(18, 24); ctx.stroke(); }

function drawOffscreenMarker(ctx: CanvasRenderingContext2D, g: GameState, w: number, h: number) {
  const dx = EXTRACT.x - g.camera.x, dy = EXTRACT.y - g.camera.y;
  if (Math.abs(dx) < w / 2 - 70 && Math.abs(dy) < h / 2 - 70) return;
  const angle = Math.atan2(dy, dx); const radius = Math.min(w, h) / 2 - 72;
  ctx.save(); ctx.translate(w / 2 + Math.cos(angle) * radius, h / 2 + Math.sin(angle) * radius); ctx.rotate(angle);
  ctx.fillStyle = P.cyan; ctx.shadowColor = P.cyan; ctx.shadowBlur = 14; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-9, -9); ctx.lineTo(-9, 9); ctx.closePath(); ctx.fill(); ctx.restore();
}

export function renderMinimap(ctx: CanvasRenderingContext2D, g: GameState, size: number) {
  ctx.clearRect(0, 0, size, size); ctx.fillStyle = "#080c0d"; ctx.fillRect(0, 0, size, size); const scale = size / WORLD.w;
  ctx.strokeStyle = "rgba(101,230,206,.2)"; ctx.strokeRect(.5, .5, size - 1, size - 1);
  ctx.fillStyle = "rgba(117,131,134,.35)"; for (const o of g.obstacles) ctx.fillRect(o.x * scale - 1, o.y * scale - 1, 2, 2);
  for (const turret of g.turrets) { ctx.fillStyle = turret.type === "missile" ? P.red : P.amber; ctx.fillRect(turret.x * scale - 1.5, turret.y * scale - 1.5, 3, 3); }
  ctx.strokeStyle = P.cyan; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(EXTRACT.x * scale, EXTRACT.y * scale, EXTRACT.r * scale, 0, Math.PI * 2); ctx.stroke();
  for (const r of g.robots) if (r.alive) { ctx.fillStyle = r.isPlayer ? P.cyan : P.red; ctx.beginPath(); ctx.arc(r.x * scale, r.y * scale, r.isPlayer ? 4 : 2.5, 0, Math.PI * 2); ctx.fill(); }
}
