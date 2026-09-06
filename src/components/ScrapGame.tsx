import { useCallback, useEffect, useRef, useState } from "react";
import {
  createGame,
  leaderboard,
  statsOf,
  update,
  type GameState,
  type Input,
} from "@/game/engine";
import { render, renderMinimap } from "@/game/render";
import { COMPONENTS, SCRAP_GOAL, type ComponentType, type Phase } from "@/game/types";
import {
  calculateExtractionReward,
  loadProfile,
  recordGame,
  type PlayerProfile,
} from "@/game/progression";

interface HudData {
  hp: number;
  maxHp: number;
  energy: number;
  scrap: number;
  parts: ComponentType[];
  speed: number;
  ram: number;
  magnet: number;
  board: ReturnType<typeof leaderboard>;
  extract: number;
  message: string;
  time: number;
}

const EMPTY_HUD: HudData = {
  hp: 100,
  maxHp: 100,
  energy: 100,
  scrap: 0,
  parts: [],
  speed: 190,
  ram: 20,
  magnet: 46,
  board: [],
  extract: 0,
  message: "",
  time: 0,
};

export function ScrapGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const miniRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameState | null>(null);
  const inputRef = useRef<Input>({
    up: false,
    down: false,
    left: false,
    right: false,
    boost: false,
    drop: false,
  });
  const [phase, setPhase] = useState<Phase>("menu");
  const [hud, setHud] = useState<HudData>(EMPTY_HUD);
  const [result, setResult] = useState<GameState["result"]>(null);
  const [profile, setProfile] = useState<PlayerProfile>(() => loadProfile());
  const phaseRef = useRef<Phase>("menu");
  const settledRunRef = useRef(false);

  const start = useCallback(() => {
    gameRef.current = createGame();
    settledRunRef.current = false;
    setResult(null);
    phaseRef.current = "playing";
    setPhase("playing");
  }, []);

  useEffect(() => {
    const map: Record<string, keyof Input> = {
      keyw: "up",
      arrowup: "up",
      keys: "down",
      arrowdown: "down",
      keya: "left",
      arrowleft: "left",
      keyd: "right",
      arrowright: "right",
      space: "boost",
      shiftleft: "boost",
    };
    const down = (e: KeyboardEvent) => {
      const k = map[e.code.toLowerCase()];
      if (k) {
        inputRef.current[k] = true;
        e.preventDefault();
      }
      if (e.code === "Enter" && phaseRef.current !== "playing") start();
      if (e.code === "KeyR" && phaseRef.current !== "playing") start();
    };
    const up = (e: KeyboardEvent) => {
      const k = map[e.code.toLowerCase()];
      if (k) inputRef.current[k] = false;
    };
    const blur = () => {
      inputRef.current = {
        up: false,
        down: false,
        left: false,
        right: false,
        boost: false,
        drop: false,
      };
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, [start]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let last = performance.now();
    let hudAcc = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const g = gameRef.current;
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (!g) return;
      update(g, dt, inputRef.current, w, h);
      render(ctx, g, w, h, now / 1000);

      const mini = miniRef.current;
      if (mini) {
        const mctx = mini.getContext("2d");
        if (mctx) renderMinimap(mctx, g, mini.width);
      }

      hudAcc += dt;
      if (hudAcc > 0.12) {
        hudAcc = 0;
        const p = g.robots[0]!;
        const st = statsOf(p);
        setHud({
          hp: Math.max(0, p.hp),
          maxHp: st.maxHp,
          energy: p.energy,
          scrap: p.scrap,
          parts: [...p.parts],
          speed: st.speed,
          ram: st.ram,
          magnet: st.magnet,
          board: leaderboard(g),
          extract: g.extractProgress,
          message: g.messageTimer > 0 ? g.message : "",
          time: g.time,
        });
      }
      if (g.phase !== phaseRef.current) {
        phaseRef.current = g.phase;
        setPhase(g.phase);
        setResult(g.result);

        if (!settledRunRef.current && g.result) {
          settledRunRef.current = true;
          setProfile((current) => recordGame(current, g.result!, g.phase === "won"));
        }
      }
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const playing = phase === "playing";

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background">
      <canvas ref={canvasRef} className="absolute inset-0 block" />

      {playing && (
        <>
          {/* top-left status */}
          <div className="pointer-events-none absolute left-5 top-5 w-72 space-y-3">
            <div className="panel px-4 py-3">
              <div className="flex items-baseline justify-between">
                <span className="font-display text-lg tracking-widest text-primary">SCRAP.IO</span>
                <span className="text-xs text-muted-foreground">
                  {profile.scrapPoints.toLocaleString()} PTS · {Math.floor(hud.time / 60)}:{String(Math.floor(hud.time % 60)).padStart(2, "0")}
                </span>
              </div>
              <Bar label="HULL" value={hud.hp / hud.maxHp} tone="hull" />
              <Bar label="ENERGY" value={hud.energy / 100} tone="energy" />
              <div className="mt-3 flex items-end justify-between">
                <div>
                  <div className="text-[11px] tracking-widest text-muted-foreground">SCRAP</div>
                  <div className="font-display text-2xl text-scrap">
                    {hud.scrap}
                    <span className="text-sm text-muted-foreground"> / {SCRAP_GOAL}</span>
                  </div>
                </div>
                <div className="text-right text-[11px] leading-4 text-muted-foreground">
                  <div>SPD {Math.round(hud.speed)}</div>
                  <div>RAM {Math.round(hud.ram)}</div>
                  <div>MAG {Math.round(hud.magnet)}</div>
                </div>
              </div>
            </div>

            <div className="panel px-4 py-3">
              <div className="mb-2 text-[11px] tracking-widest text-muted-foreground">
                CHASSIS · {hud.parts.length}/6
              </div>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 6 }).map((_, i) => {
                  const t = hud.parts[i];
                  const c = t ? COMPONENTS[t] : null;
                  return (
                    <div
                      key={i}
                      className="slot"
                      style={
                        c
                          ? { borderColor: c.color, boxShadow: `0 0 14px ${c.glow}`, color: c.color }
                          : undefined
                      }
                      title={c ? `${c.name} — ${c.desc}` : "Empty mount"}
                    >
                      {c ? c.name.split(" ")[0]![0] + (c.name.split(" ")[1]?.[0] ?? "") : "—"}
                    </div>
                  );
                })}
              </div>
              {hud.parts.length > 0 && (
                <ul className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
                  {hud.parts.map((t, i) => (
                    <li key={i} style={{ color: COMPONENTS[t].color }}>
                      {COMPONENTS[t].name} <span className="opacity-60">{COMPONENTS[t].desc}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* leaderboard */}
          <div className="pointer-events-none absolute right-5 top-5 w-56">
            <div className="panel px-4 py-3">
              <div className="mb-2 text-[11px] tracking-widest text-muted-foreground">
                SALVAGE RANKING
              </div>
              {hud.board.map((b, i) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between py-0.5 text-sm"
                  style={{ color: b.isPlayer ? "var(--primary)" : undefined }}
                >
                  <span className="truncate">
                    <span className="mr-2 text-muted-foreground">{i + 1}</span>
                    <span style={{ color: b.isPlayer ? undefined : b.tint }}>{b.name}</span>
                  </span>
                  <span className="tabular-nums">{b.score}</span>
                </div>
              ))}
            </div>
          </div>

          {/* minimap */}
          <div className="pointer-events-none absolute bottom-5 right-5">
            <div className="panel p-2">
              <canvas ref={miniRef} width={180} height={180} className="block rounded-sm" />
            </div>
          </div>

          {/* controls */}
          <div className="pointer-events-none absolute bottom-5 left-5">
            <div className="panel px-4 py-3 text-[11px] leading-5 text-muted-foreground">
              <div>
                <kbd>WASD</kbd> / <kbd>ARROWS</kbd> drive
              </div>
              <div>
                <kbd>SPACE</kbd> ion boost — ram rivals to steal parts
              </div>
              <div>
                Bank <span className="text-scrap">{SCRAP_GOAL} scrap</span>, then hold the
                extraction ring
              </div>
            </div>
          </div>

          {/* extraction progress */}
          {hud.extract > 0 && (
            <div className="pointer-events-none absolute bottom-28 left-1/2 w-80 -translate-x-1/2">
              <div className="panel px-4 py-3 text-center">
                <div className="font-display text-sm tracking-widest text-primary">
                  EXTRACTING…
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-[width] duration-100"
                    style={{ width: `${hud.extract * 100}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {hud.message && (
            <div className="pointer-events-none absolute left-1/2 top-8 -translate-x-1/2">
              <div className="panel animate-fade-in px-5 py-2 font-display text-sm tracking-widest text-primary">
                {hud.message}
              </div>
            </div>
          )}
        </>
      )}

      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center bg-[rgba(4,7,14,0.82)] px-4 backdrop-blur-sm">
          <div className="panel w-full max-w-xl px-8 py-10 text-center">
            <h1 className="font-display text-5xl tracking-[0.2em] text-primary drop-shadow-[0_0_24px_rgba(56,246,201,0.5)]">
              SCRAP<span className="text-accent">.IO</span>
            </h1>
            {phase === "menu" && (
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                You are a salvage drone loose in a dead neon megacity. Collect scrap, bolt on
                components that reshape your chassis, and ram rival bots to tear their parts off —
                then reach the extraction ring before they do.
              </p>
            )}
            {phase === "won" && result && (
              <>
                <p className="mt-4 font-display text-2xl text-primary">EXTRACTION COMPLETE</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Banked {result.scrap} scrap with {result.parts} components in{" "}
                  {Math.floor(result.time)}s · {result.kills} rivals wrecked.
                  <br />
                  <span className="text-primary">+{calculateExtractionReward(result)} SCRAP POINTS</span>
                </p>
              </>
            )}
            {phase === "lost" && result && (
              <>
                <p className="mt-4 font-display text-2xl text-destructive">CHASSIS DESTROYED</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Survived {Math.floor(result.time)}s · {result.kills} rivals wrecked. Your parts
                  are now somebody else's.
                </p>
              </>
            )}

            <div className="mt-7 grid grid-cols-3 gap-2 text-left text-[11px]">
              {(Object.keys(COMPONENTS) as ComponentType[]).map((t) => {
                const c = COMPONENTS[t];
                return (
                  <div
                    key={t}
                    className="rounded-md border px-2 py-2"
                    style={{ borderColor: c.color + "55", color: c.color }}
                  >
                    <div className="font-semibold">{c.name}</div>
                    <div className="text-muted-foreground">{c.desc}</div>
                  </div>
                );
              })}
            </div>

            <button onClick={start} className="btn-neon mt-8">
              {phase === "menu" ? "DEPLOY DRONE" : "REDEPLOY"}
            </button>
            <div className="mt-4 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs">
              <span className="text-primary">SCRAP POINTS</span>{" "}
              <span className="font-display text-lg text-scrap">{profile.scrapPoints.toLocaleString()}</span>
              <span className="ml-2 text-muted-foreground">permanent currency</span>
            </div>
            <div className="mt-3 text-[11px] tracking-widest text-muted-foreground">
              PRESS ENTER · WASD TO DRIVE · SPACE TO BOOST
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Bar({ label, value, tone }: { label: string; value: number; tone: "hull" | "energy" }) {
  return (
    <div className="mt-2">
      <div className="flex justify-between text-[10px] tracking-widest text-muted-foreground">
        <span>{label}</span>
        <span>{Math.round(Math.max(0, value) * 100)}%</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={tone === "hull" ? "h-full bg-primary" : "h-full bg-scrap"}
          style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }}
        />
      </div>
    </div>
  );
}
