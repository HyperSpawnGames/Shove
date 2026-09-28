# Ridge prototype: a greybox of the ascending world

**Date:** 2026-09-26
**Status:** Implemented; Studio Play checklist and findings pending
**Builds on:** `docs/push-a-giant-gdd.md` ("An ascending world and a growing
player"), `docs/giant-scaling.md` (sizing rigs at runtime)

## Purpose

The GDD describes a staircase of terraces, each holding a larger giant, with
players who grow as they train. Three things about that world were unclear:
whether ramps and terraces should grow with the giants, how a grown player
gets back to their frontier, and whether a grown player still fits the early
ramps. The design conversation settled on a **ridge**: one long mountain
ridge rising away from the base, its crest a staircase of flat terraces, each
exactly as wide as its arena so the left and right edges are cliffs.
Progression runs up the crest; combat runs across it, so a giant is still
thrown sideways off a cliff.

This prototype builds that ridge from plain Parts, generated from a handful of
tunable numbers, and adds dev commands to resize the player, jump between
terraces and throw a giant. It exists to answer these questions in Studio:

1. From the base, can a player see the giants lined up the ridge, each bigger
   than the last? (The ridge is ~6 km long; streaming and atmosphere haze may
   hide it.)
2. Do terrace, ramp and giant proportions read correctly at every tier?
3. At a terrace's arrival size, is the ramp the only way up? Once larger, can
   a player hop the steps instead? Is there a size at which a player is stuck
   (too big for a ramp, too small to hop its step)?
4. Does a giant thrown sideways off the cliff read well at small and large
   tiers?
5. How do walking, jumping and the camera feel at 10×?

**Out of scope:** training, fights, Strength, persistence, working shops,
fast-travel UI, per-player barriers, simultaneous fights, art, and animated
giants. Nothing here writes the profile.

## Decisions

- **Terraces grow geometrically with the player.** Terrace _n_ is built for
  the player size on arrival, `s(n) = g^(n−1)`, with `g = 10^(1/25) ≈ 1.0965`,
  so terrace 26 is built for a 10× player and its giant is ~100 studs tall
  (the user chose "last giant about 20× a new player"). Every dimension of a
  terrace is a multiple of its arrival player's height `h(n) = 5 · s(n)`, so
  every terrace looks the same to a player arriving at the intended size.
- **Each step is two arrival-player heights.** The riser from terrace _n_ to
  _n+1_ is `2 · h(n)`. Jump height scales with size (7.2 studs at 1×, about
  1.44 body heights), so the arriving player cannot jump it, while a player
  about 1.4× larger can. At 10% growth per terrace that is about four
  terraces later. Ramps are wide enough (3 arrival heights) to stay
  comfortable up to 2×, so no size should leave a player stuck. These are the
  numbers the prototype tests.
- **Challenge order, not geometry, is the real gate.** A large player can hop
  past any barrier. The barrier on each ramp is a translucent, non-colliding
  marker here; later, the rule "challenge giants in order" does the gating.
- **The world is generated from code at server start.** A pure layout
  function turns `RIDGE_CONFIG` into boxes and points; a thin builder turns
  those into Parts. Changing a number and pressing Play shows the new ridge,
  the layout gets specs, and the same layout later answers "where does giant
  _n_ stand" and "where does a player respawn". The cost: the ridge only
  exists in Play (or Run), not in Edit mode. Rejected: a pre-generated
  `.rbxm` (extra tooling to keep the layout in one place) and building by
  hand (26 terraces cannot be re-tuned).
- **The ridge replaces the baseplate.** `default.project.json` loses
  `Baseplate` and `SpawnLocation`; the builder makes the base, its
  `SpawnLocation`, and the valley floor. It builds in `RidgeService.onInit`,
  which runs before `PlayerService.onStart` tags anyone, so no player can
  spawn before the world exists.
- **Terrace models stream persistently.** `Workspace.StreamingEnabled` stays
  on, but every terrace model uses `ModelStreamingMode.Persistent`, so the far
  giants reach every client. Whether that is affordable is one of the
  findings.
- **Giants stand still.** Each terrace clones its roster giant, sizes it with
  `Model:ScaleTo`, anchors it in its rest pose and plays no animation, so
  the Animator fix-up is not needed for giants yet. A thrown giant is
  unanchored and tumbles limp (`PlatformStand`) with no animation playing.
- **Throws are aimed, not sized.** A thrown giant is launched at a fixed
  angle with the speed that brings it back down to the lane's height
  `throwClearance` giant heights past the cliff edge. (The first draft
  launched at a speed in giant heights per second; gravity does not grow
  with the giants, so that lands short of the edge at every roster size.)
- **Player size goes through one per-player component.** `PlayerSize`
  (bound to `PlayerLoaded`) holds the current scale and applies it to every
  body: `Model:ScaleTo`, feet kept on the ground, walk speed through
  `PlayerCharacter.setWalkSpeed`, jump height, and the camera zoom range. It
  is not saved. Later, Strength drives the same `setScale`.
- **Scaled avatars get the Animator fix-up on every client.** Per
  `docs/giant-scaling.md`, a `ScaleTo`'d rig animates with k² joint
  translations, and `Motor6D.Transform` does not replicate. The server tags a
  scaled body `ScaledRig`; a client component bound to that tag divides each
  `Motor6D` and `AnimationConstraint` `Transform` translation by the model's
  scale on `Stepped` (Flamework `OnPhysics`). Player avatars use
  `AnimationConstraint` joints, so both classes are collected.
- **The camera frames the player the same way at every size.** The Player's
  `CameraMinZoomDistance` becomes `12.5 · k` (the default framing distance
  times the scale), which pushes the camera out when a player grows, and
  `CameraMaxZoomDistance` becomes the StarterPlayer default times _k_. The
  rule holds at 1× too, so in the prototype nobody can zoom closer than the
  default framing (no first person); acceptable for a greybox.
- **Falling off returns you to the terrace you fell from.** A per-player
  component checks each frame whether the body has dropped well below the
  terrace under it, or is standing on the valley floor, and if so puts it at
  that terrace's arrival point with no velocity.
- **No new network events.** Everything is server-driven; the client reads a
  tag.

## The layout

Coordinates: the valley floor is at `y = 0`; the ridge runs along **+Z**
(progression); **±X** is the combat axis (player left at −X, giant right at
+X, giants thrown toward +X). The base spans `z ∈ [−depth, 0]`; terrace 1
starts at `z = 0`, and each terrace starts where the previous one ends.

### Tunables (`RIDGE_CONFIG`)

| Name              | Default          | Meaning                                                               |
| ----------------- | ---------------- | --------------------------------------------------------------------- |
| `terraceCount`    | 26               | One per roster giant (terrace _n_ shows the giant with `RosterIndex` _n_) |
| `growth`          | `10^(1/25)`      | Arrival-scale ratio between consecutive terraces                      |
| `playerHeight`    | 5                | Studs, a 1× avatar                                                    |
| `giantToPlayer`   | 2                | Giant height ÷ arrival player height                                  |
| `terraceWidth`    | 12               | Arrival heights, along X (the fight lane spans it edge to edge)       |
| `arrivalDepth`    | 4                | Arrival heights, along Z                                              |
| `shopDepth`       | 4                | Arrival heights, added on shop terraces                               |
| `fightDepth`      | 3                | Arrival heights                                                       |
| `stepHeight`      | 2                | Arrival heights, the riser up to the next terrace                     |
| `rampSlope`       | 30°              | Ramp run = `stepHeight / tan(rampSlope)` ≈ 3.46 arrival heights       |
| `rampWidth`       | 3                | Arrival heights                                                       |
| `fighterOffset`   | 2                | Arrival heights from the lane's centre to each fighter's mark         |
| `shopEvery`       | 4                | Terraces 5, 9, 13, 17, 21, 25 carry a shop strip; the base always does |
| `baseWidth`       | 24               | 1× heights (120 studs)                                                |
| `baseSpawnDepth`  | 6                | 1× heights; then a shop strip and the ramp to terrace 1               |
| `cliffDrop`       | 12               | 1× heights: the base's top above the valley floor (60 studs)          |
| `postSpacing`     | 2                | Arrival heights between the 1× lamp posts along each cliff edge       |
| `throwClearance`  | 1                | Giant heights past the +X edge where a thrown giant is back at lane height |
| `throwAngle`      | 35°              | Launch angle above the horizontal                                     |
| `throwSpin`       | 1.5              | Radians per second of tumble toward the cliff                         |
| `throwResetAfter` | 6                | Seconds before a thrown giant is replaced                             |

### What that produces

| Terrace     | Arrival player | Giant | Width × depth | Top above valley | Step to next |
| ----------- | -------------- | ----- | ------------- | ---------------- | ------------ |
| 1 (Noob)    | 5.0            | 10    | 60 × 52       | 70               | 10           |
| 5 (shop)    | 7.2            | 14.5  | 87 × 105      | 116              | 14.5         |
| 10          | 11.5           | 23    | 137 × 120     | 204              | 23           |
| 15          | 18.2           | 36    | 218 × 190     | 343              | 36           |
| 20          | 28.8           | 58    | 345 × 301     | 563              | 58           |
| 26 (Archer) | 50             | 100   | 600 × 523     | 1003             | —            |

The ridge is ~5.9 km long from terrace 1 to the summit. No box exceeds the
2048-stud part limit at these defaults; the builder splits any box that
would, so re-tuning cannot break the build. At the intended size with walk
speed `16 · k`, crossing any terrace takes ~3.5 s.

### One terrace, top-down

```
                    ramp up to terrace n+1 (with barrier at its top)
                              ▲
   cliff ┌────────────────────┴────────────────────┐ cliff
   (−X)  │ ∘                                     ∘ │ (+X)
         │        [player]  ──▶ ◀──  [GIANT]       │   ◀─ fight lane
         │ ∘   [Arms]    [Aura]    [Eggs]        ∘ │   ◀─ shop strip (shop terraces)
         │ ∘            arrival zone             ∘ │
         └────────────────────┬────────────────────┘
                              ▼ ramp from terrace n−1          ∘ = 1× lamp post
```

Each terrace is a solid block from the valley floor to its top, colored by
group of four, with thin colored slabs marking the arrival zone, shop strip
and fight lane; the fighter marks are pads on the lane. The ramp is a wedge
on the terrace's back edge rising to the next terrace's front edge. The
giant stands on its mark facing −X with a label (terrace number, name,
arrival scale, giant height). Shop placeholders are labelled boxes about one
arrival height tall. The last terrace has no ramp.

## Units

Pure modules have a `*.spec.ts` beside them.

**Feature `ridge`** (`src/server/features/ridge/`)

- `ridge-config.ts` — `RIDGE_CONFIG`, the tunables above.
- `ridge-layout.ts` (pure) — `layoutRidge(config): RidgeLayout` with the
  base and every terrace as boxes (block, zone slabs, ramp, barrier, shop
  boxes, posts) and points (arrival, fighter marks); `terraceIndexAt(layout,
  z)` clamped to the base and the summit.
- `box.ts` (pure) — the `Box` type and `splitBox`, which splits a box
  larger than 2048 on any axis.
- `fall-policy.ts` (pure) — `hasFallen(rootY, surfaceY, valleyY,
  bodyHeight)`: true when the root is more than three body heights below the
  surface, or low enough to be standing on the valley floor.
- `throw-arc.ts` (pure) — `throwVelocity(distance, angle, gravity)`.
- `src/server/util/place-body.ts` (pure core) — the root CFrame that puts a
  body's feet on a point, from `HipHeight` and the root's height; used by
  teleport, recovery, giant placement and `PlayerSize`, so it sits outside
  both features.
- `ridge-builder.ts` — creates the Parts, models, labels, spawn and valley
  floor from a layout.
- `ridge-giants.ts` — clones, sizes, places and anchors a terrace's giant;
  throws it (unanchor, server network owner, `PlatformStand`, velocity) and
  replaces it after `throwResetAfter`.
- `ridge-service.ts` — builds in `onInit`; exposes `getLayout()`,
  `arrivalCFrame(index)`, `teleport(body, index)` and `throwGiant(index)`.
- `fall-recovery.ts` — component on `PlayerLoaded`; each frame applies
  `hasFallen` to the current body and returns it to its terrace's arrival
  point, then leaves it alone for a second while the client catches up.

**Feature `player-size`** (`src/server/features/player-size/`)

- `body-tuning.ts` (pure) — `bodyTuning(scale, defaults)`: walk speed, jump
  height, camera min and max zoom.
- `player-size.ts` — component `PlayerSize` on `PlayerLoaded`: `getScale()`,
  `setScale(k)`. On each body, after its appearance has loaded, it calls
  `ScaleTo(k)`, keeps the feet where they were, sets jump height and tags
  the body `ScaledRig` when `k ≠ 1`. On change it also sets walk speed
  through `PlayerCharacter` and the camera zoom range on the Player.

**Feature `scaled-rigs`**

- `src/shared/features/scaled-rigs/scaled-rigs.ts` — `SCALED_RIG_TAG`, and
  the Workspace attribute that switches the fix-up off for comparison.
- `src/client/features/scaled-rigs/scaled-rig.ts` — client component bound
  to the tag; collects `Motor6D` and `AnimationConstraint` joints (re-collect
  on descendant changes) and on `OnPhysics` sets each `Transform` to its
  rotation plus its translation divided by `model.GetScale()`.

**Dev commands** (`src/server/commands/`, admin-guarded like `admin.ts`)

- `size <k> [player]` — `PlayerSize.setScale`, `0.5 ≤ k ≤ 25`.
- `tp <terrace> [player]` — to a terrace's arrival point; 0 is the base.
- `throw <terrace>` — throws that terrace's giant.
- `fixup <true|false>` — the scaled-rig animation fix-up on every client, to
  compare with it off.

The admin guard moves out of `admin.ts` into `admin-guard.ts` so the new
command files (`player-size.ts`, `ridge.ts`, `scaled-rigs.ts`) use the same
check.

## Engine behaviour relied on, and risks

- `Model:ScaleTo` on a player character from the server, applied after
  `CharacterAppearanceLoaded` so late accessories are included. Unverified
  for player avatars in this repo.
- The k² animation behaviour and its fix-up were measured on Motor6D giants
  in Studio, with the fix-up running where the animation ran. For player
  avatars it must run on each client, on `AnimationConstraint` joints. The
  Play checklist confirms it; if player avatars turn out not to need it, the
  tag stays off them.
- `Player.CameraMinZoomDistance` set on the server replicates and the
  default camera clamps to it.
- Persistent streaming of ~30 models and roughly 1,000 parts; atmosphere haze
  (`Density` 0.3) may hide the far ridge. Both are findings, not blockers.

## Testing

**Specs:** layout (terrace count, growth ratio, contiguous terraces, risers
of `stepHeight · h(n−1)`, ramp endpoints on consecutive tops within the
terrace footprint, shop terraces, no ramp on the last terrace,
`terraceIndexAt` including clamping, throws landing past the edge),
`splitBox`, `hasFallen`, `throwVelocity`, the feet placement, `bodyTuning`
and `isValidScale`.

**Headless build check** (`npm run check:ridge`,
`tools/ridge/check-ridge.luau`): runs the game place's server scripts and
asserts the ridge: every terrace a persistent model, a spawn at the base
facing +Z, 26 giants at their scale on their marks facing −X, each ramp
rising from its terrace's top to the next one's, no part over 2048 studs,
no warnings logged; then throws giants 1 and 26 with the game's launch code
and checks each goes down past the +X edge.

**Studio Play checklist** (`npm run studio`, Play):

1. Spawn at the base facing terrace 1; the Noob giant is ahead and larger
   giants rise behind it.
2. At 1×, walk the base → 1 → 2 → 3 by ramps; the risers cannot be jumped.
3. `size 1.5`: the risers of terraces 1–3 can be hopped; ramps still fit.
4. `size 2`: ramps on terraces 1–5 still comfortable; no stuck size between.
5. `tp 26`, `size 10`: walking, jumping and camera feel right; look back
   down the ridge.
6. Walk off a side cliff at 1× and at 10×: returned to that terrace.
7. `throw 1` and `throw 26`: the fall reads; the giant comes back.
8. At 10×, running: head and limbs stay attached (the fix-up works).

## Findings

To be filled in after the Play session: answers to questions 1–5, the
numbers that changed, and what the real world feature keeps.
