# Scrap.io — Industrial Gameplay Upgrade

## Goal
Turn the current playable prototype into the requested repeatable salvage run while applying the selected Version 2 direction directly inside the game: dark steel, oxidized metal, practical neon lighting, chunky machine silhouettes, and readable industrial hazards.

## What will change

### 1. Complete the repeatable run loop
- Replace the single deploy/redeploy overlay with a real Home screen showing points, best score, equipped skin, Play, Shop, and Settings.
- Award points during a run for scrap recovery, surviving turret threats, wrecking rivals, and successful extraction; show a clear run breakdown afterward.
- Return players to Home after a win or loss, with immediate replay available.
- Persist points, best score, purchased/equipped skins, and settings in the browser.

### 2. Add skins, shop, settings, and audio
- Add several visually distinct robot skins with prices and locked, owned, and equipped states.
- Build a compact skin shop and settings panel that match the industrial control-console style.
- Add ambient synthesized scrapyard audio and gameplay sound effects using browser audio, with persistent music/SFX toggles and volume controls.
- Add visual-effects quality controls that reduce glow and particles without changing gameplay.

### 3. Expand gameplay hazards and chassis behavior
- Add fairly spaced industrial turrets with target telegraphs, cooldowns, visible projectiles, damage, hit feedback, and point rewards for surviving pressure.
- Preserve the six-slot chassis limit. When full, component pickups will be physically pushed away with sparks, force rings, motion, and a readable “FRAME FULL” response instead of silently remaining or disappearing.
- Keep movement, boosting, AI pursuit/fleeing/collection, collisions, stealing, extraction, minimap, and leaderboard intact.

### 4. Apply the selected art direction in-game
- Redraw player, rivals, attachments, turrets, pickups, obstacles, and extraction beacon as cohesive layered machine forms rather than simple geometric markers.
- Build a richer scrapyard floor from procedural original canvas shapes: oxidized steel plates, seams, hazard stripes, pipes, wreckage, cable coils, vents, lamps, and scattered debris.
- Add restrained cyan/amber/magenta status lighting, metal highlights, cast shadows, sparks, smoke, projectile trails, extraction energy, and impact animation.
- Restyle HUD, Home, Shop, Settings, results, leaderboard, and minimap as compact steel instrumentation with stronger typography and responsive sizing.

## Technical approach
- Extend the existing canvas engine state with turrets, projectiles, prop variants, run scoring, and repulsion state while keeping simulation and drawing separated.
- Keep visuals procedural and cached where useful; cull off-screen world objects and cap particles/projectiles for smooth browser performance.
- Split large UI sections into focused React components and use the existing button/control system.
- Use semantic color and material tokens in the global styles; keep canvas colors in a shared game palette so the world remains cohesive.
- Add/update route metadata for the upgraded playable game.

## Validation
- Verify keyboard movement/boost, pickups, six-slot repulsion, AI encounters, turret targeting/damage, extraction, loss, scoring, shop purchases/equipping, settings persistence, audio controls, minimap, and replay.
- Test at desktop and compact browser sizes, confirm readable non-overlapping UI, and check the live preview for console/runtime errors.
