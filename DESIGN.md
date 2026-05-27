# Game Design Document: Water

## Overview

**Water** is a 2D side-scrolling platformer built with a 1-bit monochrome aesthetic. The player navigates a single large level, collecting coins scattered across platforms while avoiding patrolling monsters. Every 10 coins collected, the player's jump power permanently increases. Once all coins are collected, a water cup spawns, and reaching it triggers the win state. The player has 3 health; touching a monster deals 1 damage with a knockback and a 3-second invincibility window. Falling off the map is an instant kill.

---

## Game Flow

1. **Title Screen** — Animated title "Water" with a "Start" button. Background music loops.
2. **Gameplay** — Player spawns at the left side of the level. Collect all coins, avoid monsters, reach the water cup.
3. **Death** — Triggered by losing all 3 health or falling off the map. Shows "You Died" overlay with a "Restart" button (replays the same level).
4. **Win** — Triggered by overlapping the water cup after all coins are collected. Shows "You drank the water" overlay with a "Play Again" button (returns to title screen).

### Scene Transition

- Title → Gameplay: 400ms fade-out (black), then scene starts with 400ms fade-in (black).
- Death → Gameplay (restart): 300ms fade-out (black), scene restarts with 400ms fade-in.
- Win → Title: 300ms fade-out (black), scene transition with 400ms fade-in.

---

## Player

### Spawn Position

- World coordinates: **x=50, y=200**

### Movement Parameters

| Parameter | Value | Notes |
|-----------|-------|-------|
| Horizontal acceleration | 300 px/s² | Applied while left/right key held |
| Horizontal drag | 2000 px/s² | Applied when no directional key held (deceleration) |
| Jump velocity | -400 px/s (initial) | Applied instantaneously on jump; negative = upward |
| Jump upgrade increment | -75 px/s | Subtracted from jump velocity each upgrade (makes jump stronger) |
| Gravity | 1500 px/s² | Downward, global arcade physics gravity |

### Movement Behavior

- **Left/Right arrow keys**: Apply horizontal acceleration in the pressed direction. When no key is held, acceleration is zeroed and drag is applied to decelerate.
- **Up arrow key**: Jump, but only when the player's body is blocked downward (standing on ground). Jump is triggered on key-press (not hold) — must be released and pressed again for a new jump.
- **Player sprite flips horizontally** to face the direction of movement.

### Animations

| Animation | Frames | Frame Rate | Loop |
|-----------|--------|------------|------|
| `walk` | 284 → 283 | 8 fps | Yes |
| `idle` | 280 (single frame) | 1 fps | No |
| `jump` | 285 (single frame) | 1 fps | No |

All frames come from the sprite sheet `monochrome_tilemap_transparent_packed.png` (16×16 px per frame).

### Collision

- Player collides with all tiles that have the custom property `collides: true` in the tileset.
- Player is bounded by the physics world bounds (`setCollideWorldBounds(true)`).
- Player overlaps coins, the water cup, and monsters (no physics separation with these objects).

### Health

- Maximum health: **3**
- Starting health: **3**
- Damage source: overlapping a monster (see Monsters section).
- Fall death: if `player.y > map.heightInPixels`, instant death regardless of health.
- Health display: 3 square pips rendered above the player's head (world-space, following the player each frame). Filled white = current health, outline-only = lost health. "HP" label above the pips.

### Invincibility

- Triggered when the player takes damage from a monster and survives (health > 0 after damage).
- Duration: **3 seconds**
- Effect: player sprite toggles visibility every 150ms (blink effect). Player cannot take damage from monsters during this period.
- Knockback on hit: horizontal velocity of 200 px/s away from the monster; vertical velocity of -200 px/s (upward).

---

## Coins

### Spawning

- Coins are spawned from the **Objects** tile layer in the level file.
- Any tile with **index 63** in the Objects layer becomes a coin.
- Coins are placed at the center of their tile: `tile.pixelX + tile.width/2`, `tile.pixelY + tile.height/2`.
- Coins are **static physics bodies** (they do not move; use a static group).
- Visual frame: **62** from the transparent sprite sheet.
- The Objects layer is **invisible** (not rendered); only the coin sprites are shown.

### Collection

- Collected via **overlap** with the player.
- On collection: coin is destroyed, coin counter increments, particle burst (gold, 12 particles), sound effect plays.
- Total coin count is tracked; the HUD displays `Coins: collected/total`.

### Jump Upgrade System

- Every **10 coins** collected, the player's jump velocity is permanently upgraded by subtracting 75 from the jump velocity (making the negative value more negative = higher jump).
- An upgrade message is displayed centered on screen for 2 seconds: `Jump upgraded! (old → new)`, showing the absolute velocity values.
- The HUD also shows: `Upgrades: count` and `Next in: coins until next upgrade`.

---

## Monsters

### Spawning

- 4 monsters are spawned at hardcoded world X positions: **300, 600, 900, 1200**.
- Y position: automatically placed on top of the first collidable tile found at each X position (scanning from row 0 downward in the tilemap).
- If no ground is found at an X position, fallback Y = 200.
- Monsters use sprite frame **340** (idle) from the transparent sprite sheet.

### Movement

| Parameter | Value |
|-----------|-------|
| Patrol speed | 60 px/s (absolute value) |
| Bounce | 0 (no bounce) |
| Collide with world bounds | Yes |
| Collide with ground layer | Yes |

- Monsters walk horizontally at a constant speed, alternating direction at spawn: monsters at index 0 and 2 walk left; monsters at index 1 and 3 walk right.
- **Wall reversal**: When a monster's body is blocked on the left side, it reverses to walk right; when blocked on the right, it reverses to walk left. The sprite flips horizontally to face the direction of movement.
- **Edge detection**: When a monster is on the ground, it checks 10px ahead of its current position (in the direction of movement) for a solid tile below its feet. If no solid tile is found below that forward position, the monster reverses direction before walking off the edge. This prevents monsters from falling off platforms.

### Animation

| Animation | Frames | Frame Rate | Loop |
|-----------|--------|------------|------|
| `monsterWalk` | 341 → 342 | 6 fps | Yes |

### Player Contact

- Player-monster contact is detected via **overlap** (no physics separation).
- On contact: player loses 1 health. If health reaches 0, player dies. Otherwise, player enters invincibility (see Player section).
- Monsters are **not destroyable** by the player.

---

## Water Cup

### Spawning

- The water cup exists from the start of the level but is **invisible and disabled**.
- Visual frame: **52** from the transparent sprite sheet.
- It is a dynamic physics sprite that collides with the ground layer.

### Activation

- When the player collects **all coins** in the level, a 3-second dramatic sequence begins:
  1. Player controls are locked (acceleration and velocity zeroed).
  2. Background music is paused.
  3. `water_unlock` sound plays at volume 0.9.
  4. Camera shakes for 3 seconds at intensity 0.01.
  5. After 3 seconds: controls unlock, BGM resumes, water cup becomes visible/active at position **x=50, y=50** with its physics body enabled. A particle burst (20 gold particles) plays at the spawn point.

### Collection (Win Condition)

- Collected via **overlap** with the player when the cup is active.
- On collection: player becomes invisible and inactive. All VFX stop. BGM stops. Win music plays (looping). Win overlay is shown (dark blue tint, semi-transparent). Text "You drank the water" is displayed. "Play Again" button returns to the title screen.
- The win trigger can only fire once (guarded by a flag).

---

## Level & Tilemap

### Level File

- **File**: `assets/1bit_platformer.tmj` (Tiled JSON format, version 1.10)
- **Orientation**: Orthogonal
- **Render order**: Right-down
- **Dimensions**: 100 tiles wide × 20 tiles tall
- **Tile size**: 16×16 pixels
- **World pixel size**: 1600×320 pixels

### Layers

| Layer Name | Type | Purpose |
|------------|------|---------|
| `background` | Tile layer | Primary visible and collision layer. Contains terrain, decorations, and water visuals. |
| `Objects` | Tile layer | Invisible metadata layer. Tile index 63 = coin spawn position. |

### Tilesets

Two image assets are used for the tilemap:

1. **`monochrome_tilemap_packed.png`** — Referenced as `tilemap_tiles`. Used for the background layer rendering. Dimensions: 320×320 px, 20 columns, 400 tiles total (16×16 each, no spacing/margin).

2. **`monochrome_tilemap_transparent_packed.png`** — Referenced as `tilemap_sheet`. Used as a sprite sheet for all dynamic game objects (player, coins, monsters, water cup). Same dimensions and layout as the packed image but with transparent background for sprites.

### Collision Rules

- All tiles with the custom property `collides: true` in the tileset definition are solid.
- The `collides` property is a boolean. Tiles without this property defined are treated as non-solid (the game calls `setCollisionByProperty({ collides: true })`).
- The tileset defines `collides: true` on a large number of tile IDs (see `1bit_platformer_tileset.tsj`). Tile ID 0 is explicitly set to `collides: false`.
- Tile ID 62 has `type: "coin"` and `collides: true` in the tileset (used for coin rendering, but coin *spawning* is driven by tile index 63 in the Objects layer).
- Tile ID 52 has `type: "cup"` (used for the water cup visual).

### Important Tile Frame Indices (Transparent Sprite Sheet)

| Object | Frame Index | Notes |
|--------|-------------|-------|
| Player idle | 280 | Single frame |
| Player walk | 283–284 | Two-frame loop |
| Player jump | 285 | Single frame |
| Coin | 62 | Single static frame |
| Coin spawn marker (Objects layer) | 63 | Placed in Objects layer to mark coin positions; not rendered directly |
| Water cup | 52 | Single static frame |
| Monster idle | 340 | Single frame (used as default/creation frame) |
| Monster walk | 341–342 | Two-frame loop |

### Physics World Bounds

- Set to `(0, 0, map.widthInPixels, map.heightInPixels * 3)` — the world is 3× taller than the tilemap. This allows the player to fall below the visible tile area before triggering the fall-death check.

---

## Camera

| Setting | Value |
|---------|-------|
| Bounds | `(0, 0, map.widthInPixels, map.heightInPixels)` |
| Follow target | Player sprite |
| Follow lerp | 0.25 horizontal, 0.25 vertical |
| Deadzone | 50×50 pixels |
| Zoom | 3.0× (configured as `SCALE`) |
| Fade-in on scene start | 400ms, black |

---

## Visual Effects (Particle Systems)

All particles use a single 4×4 white pixel texture (`particle`), generated programmatically. Each emitter uses a different tint and configuration:

| Eitter | Tint | Speed | Angle | Scale | Lifespan | Quantity/Frequency | Trigger |
|---------|------|-------|-------|-------|----------|---------------------|---------|
| `runLeft` | Gray (0xaaaaaa) | 10–40 | 0°–40° | 0.6→0 | 250ms | 1 per 60ms | Emitting while running left on ground |
| `runRight` | Gray (0xaaaaaa) | 10–40 | 140°–180° | 0.6→0 | 250ms | 1 per 60ms | Emitting while running right on ground |
| `jump` | White (0xffffff) | 40–120 | 220°–320° | 0.8→0 | 300ms | Burst of 10 | On jump press, at player's feet |
| `land` | White (0xffffff) | 30–100 | 180°–360° | 0.7→0 | 300ms | Burst of 14 | On first frame touching ground after airborne |
| `collect` | Gold (0xffdd00) | 60–180 | 0°–360° | 0.9→0 | 400ms | Burst of 12 (coin) or 20 (cup) | On coin collected; on water cup spawn |

- Run emitters are positioned at the player's feet, offset slightly in the direction of movement (±4px from center).
- Jump and land emitters are positioned at the player's bottom edge (`y + height/2`).
- Collect emitter is positioned at the collected object's location.
- All emitters start in `emitting: false` mode and are started/stopped or burst manually.

---

## Audio

| Sound Key | File | Loop | Volume | When Played |
|-----------|------|------|--------|-------------|
| `titlescreen_bgm` | `titlescreen_bgm.mp3` | Yes | 0.7 | Title screen, loops until Start pressed |
| `ingame_bgm` | `ingame_bgm.mp3` | Yes | 0.6 | Gameplay, plays continuously; paused during water-unlock sequence; resumes after |
| `footsteps` | `footsteps.mp3` | Yes | 0.5 | While player is moving on ground; stops when idle, airborne, or controls locked |
| `landed` | `landed.mp3` | No | 0.6 | On the frame the player transitions from airborne to grounded |
| `coincollect` | `coincollect.mp3` | No | 0.8 | On each coin collected |
| `water_unlock` | `water_unlock.mp3` | No | 0.9 | Once, when all coins are collected |
| `win_song` | `win_song.mp3` | Yes | 0.8 | On win, loops until player exits |

---

## HUD

### Coin/Upgrade Display

- Fixed to the camera (scroll factor 0).
- Position: top-left (16, 16).
- Font: pixelzone, 8px, scaled 2×.
- White text on black background, with 4px padding.
- Format: `Coins: X/Y  |  Upgrades: N  |  Next in: M`
  - X = coins collected, Y = total coins
  - N = number of jump upgrades earned (floor of coinCount / 10)
  - M = coins until next upgrade (10 - coinCount % 10)
- Updated on every coin collection.

### Health Display

- Rendered in world space, following above the player's head each frame.
- 3 square pips (4×4 px each, scaled 2×) with 1px gap between them, centered horizontally above the player.
- Each pip is a pair of rectangles: black background with 1px white stroke (outline), and a white fill rectangle on top.
- Filled pip = current health; outline-only pip = lost health.
- "HP" text label above the pips (pixelzone font, 8px, white, scaled 1×).

---

## End Screens

### Death Screen

- Semi-transparent black overlay (65% opacity) covering the full camera viewport.
- "You Died" text in red (#ff3333), centered, large scale (5×).
- "Restart" button: white background, black text. On hover: inverted (dark background, white text). On click: stops all audio, fades out 300ms (black), restarts the gameplay scene.

### Win Screen

- Semi-transparent dark blue overlay (#001133, 75% opacity) covering the full camera viewport.
- "You drank the water" text in light blue (#66ccff), centered.
- "Play Again" button: light blue (#66ccff) background, black text. On hover: dark blue (#004466) background, white text. On click: stops all audio, fades out 300ms (black), transitions to title scene.

---

## Controls

| Input | Action |
|-------|--------|
| Left arrow | Move left |
| Right arrow | Move right |
| Up arrow | Jump (only when grounded) |
| R | Restart level (immediate, no confirmation) |
| D (toggle) | Toggle physics debug drawing on/off |

---

## Rendering Configuration

| Setting | Value |
|---------|-------|
| Renderer | Canvas (Phaser.CANVAS) |
| Pixel art mode | Enabled (`pixelArt: true`) |
| Game resolution | 1440×900 |
| Camera zoom | 3.0× |

---

## Font

- **Name**: pixelzone
- **Source file**: `assets/pixelzone.ttf`
- **Loaded via**: CSS `@font-face` in the HTML file, plus JavaScript `FontFace` API in the Load scene to ensure availability before gameplay starts.

---

## Asset File Manifest

All assets are located in the `assets/` directory:

| File | Type | Purpose |
|------|------|---------|
| `1bit_platformer.tmj` | Tiled map JSON | Level data (tile layers, collision, coin positions) |
| `1bit_platformer_tileset.tsj` | Tiled tileset JSON | Tile properties (collision flags, types), frame layout |
| `monochrome_tilemap_packed.png` | PNG image (320×320) | Background layer tileset image (opaque) |
| `monochrome_tilemap_transparent_packed.png` | PNG image (320×320) | Sprite sheet for dynamic objects (transparent background, 16×16 frames, 20 columns) |
| `pixelzone.ttf` | TrueType font | In-game UI font |
| `titlescreen_bgm.mp3` | Audio | Title screen background music |
| `ingame_bgm.mp3` | Audio | Gameplay background music |
| `footsteps.mp3` | Audio | Footstep loop |
| `landed.mp3` | Audio | Landing impact |
| `coincollect.mp3` | Audio | Coin pickup |
| `water_unlock.mp3` | Audio | All-coins-collected stinger |
| `win_song.mp3` | Audio | Win screen music |

### Sprite Sheet Layout

The transparent sprite sheet (`monochrome_tilemap_transparent_packed.png`) is organized as a 20-column grid of 16×16 pixel frames. Frame indices are calculated as: `row × 20 + column`, where row and column are 0-indexed. Total frames: 400.
