# Mini Roblox – Where to Hook New Systems

**Note:** This project is TypeScript (Vite). Entry is `index.ts`, not Python.

## Entry & Flow

| File | Role | Hook points |
|------|------|-------------|
| **index.ts** | Bootstrap: menu → `game.start(root)`. | Pass shared **AudioManager** / **FeedbackManager** into games so one instance per session, or let each game create its own. |
| **engine/GameLoop.ts** | Fixed timestep `update(dt)` + `render(dt)`. | **Physics**: call from inside game's `update()`. **Screen shake**: render receives **FeedbackManager.getShakeOffset()** and applies canvas translate before drawing. |
| **engine/World.ts** | Entities, gravity, bounds. | **Material physics**: extend `WorldEntity.data` with `material?: MaterialType`; run **MaterialPhysics.applyResponse()** in collision/step (or in game's collision loop). |
| **games/game1.ts** (platformer) | Player, platforms, collision, render. | **Jump**: after setting `velocity.y = JUMP_VEL` → `feedback.onJump()` (sound + shake). **Place/break**: when adding/removing block → `feedback.onPlace()` / `feedback.onBreak()`; use **Inventory** for selected item and **MaterialPhysics** for new block material. **Render**: apply `feedback.getShakeOffset()` to canvas, draw **Hotbar** at bottom. |
| **engine/Renderer2D.ts** | Camera, worldToScreen, draw helpers. | **Shake**: caller applies `ctx.translate(shakeX, shakeY)` at start of render (or add optional shake to `worldToScreen`). **Hotbar**: separate **ui/Hotbar.ts** draws at bottom of screen (fixed UI). |

## New Modules (modular classes)

1. **AudioManager** – All audio. Play one-shots with optional pitch range for variety. Procedural sounds (Web Audio) so no asset files required.
2. **FeedbackManager** – Holds **AudioManager** reference. `onJump()`, `onPlace()`, `onBreak()` → play sound + add screen shake. `getShakeOffset(dt)` → decay and return (x, y) for render.
3. **MaterialPhysics** – Material types (normal, slippery, bouncy). `applyResponse(velocity, normal, material)` → modify velocity (friction, bounce). World/entities carry `material`.
4. **Inventory** – Slots, selected index, add/remove item. Used by games for place/break and by **Hotbar** for display.
5. **ui/Hotbar** – Renders hotbar at bottom; reads **Inventory** and selected index; number keys handled in game or Input.

## Data Flow (game1 example)

- **Update:** Input → move/jump; if jump → FeedbackManager.onJump(); collision with platforms → MaterialPhysics.applyResponse(velocity, normal, platform.material); place/break keys → Inventory + World add/remove entity → FeedbackManager.onPlace/onBreak.
- **Render:** FeedbackManager.getShakeOffset(dt) → ctx.translate; draw world + player; draw Hotbar at bottom.
