# Giant quads: the build plan and the agent contract

The staircase is 8 zones of 4 giants ("quads"), climbing away from the spawn, with
an empty spacer terrace between quads. This file is the brief every agent works
from. Read `CLAUDE.md` first; its invariants outrank anything here.

## Quads

Giants are listed bottom to top. ★ marks a giant that has no prefab yet: the
prefab agent builds it (see "New giants").

| #   | Theme      | Giants (prefab Id)                                                                  |
| --- | ---------- | ----------------------------------------------------------------------------------- |
| 1   | Grassland  | Noob, Goblin, Viking, Baron                                                         |
| 2   | Desert     | Peasant, SunGladiator, SandMage, DesertGeneral                                      |
| 3   | Forest     | ★MosslingScout, ForestTroll, LeafNinja, ★AncientTreant                              |
| 4   | Castle     | Archer, Mage, Knight, Commander                                                     |
| 5   | Frost      | WinterAssassin, FrostMage, IceKing, ★YetiWarlord                                    |
| 6   | Chaos      | DemonNinja, ChaosMage, ChaosSummoner, ★VoidTyrant                                   |
| 7   | Volcanic   | FireTroll, RedOrc, ★MagmaBrute, DoomBoss                                            |
| 8   | Neon Arena | BuffNoob ("Buffnoob"), FeatherweightChamp ("Brawk Tyson"), ★IronChampion, CyberLord |

Display names for existing prefabs are in `docs/giants-roster.md`.

## Who owns what

Every agent works in its own git worktree and edits only the files it owns. The
orchestrator merges, tests and commits; agents never commit to `development`.

| Agent                     | Owns                                                                                                             |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Giant agent, quad N       | `src/server/features/encounter/roster/quad-N-*.ts`                                                               |
| Environment agent, quad N | `src/server/features/encounter/zones/quad-N-*.ts`, plus new files under `zones/quad-N/`                          |
| Prefab agent              | `tools/giants/derive_giants.luau`, new `assets/ServerStorage/Giants/<Id>.rbxm`, `docs/giants-roster.md` (append) |
| Scaling agent             | `src/server/features/encounter/giant-models.ts`, new client files for the fix-up                                 |

Anything outside your files (a shared type, the layout, another quad): stop and
report what you need instead of editing it.

## Rules for every agent

- **Never launch Roblox Studio.** That means no `npm test`, `npm run studio`,
  `npm run open`, `npm run dev` or `run-in-roblox`: Studio is shared, and only the
  orchestrator tests, one item at a time. You may run `npm run build` and
  `npm run lint` (delete `out/` first in a fresh worktree).
- Write specs (`*.spec.ts`) for any pure logic you add; the orchestrator runs them.
- Match the surrounding code: comment density, naming, idiom. Pure functions for
  rules, thin shells for instance building.
- Finish with: what you built, what to look at in a playtest, anything you could
  not verify, and the exact files you changed.

## Giant agents (one per quad)

Fill your quad's `giants` array in order, bottom to top. For the giant at
staircase index `i` (quad N's giants are indices `4(N-1)` to `4(N-1)+3`), start
from `tierTuning(i)` in `roster/tuning.ts` for `scale`, `recommendedStrength`,
`winsPayout` and `resistancePerSecond`; change a value only with a reason in a
comment. Give each giant a `surge` style that suits its character (a twitchy
ninja surges often and short; a lumbering troll rarely and long), within:
`minGap` 1–5 s, `warning` 0.4–1.2 s, `duration` 0.25–0.6 s, `share` 0.5–0.9. A
style never changes fight length, only its rhythm. A ★ giant's `modelId` is the
Id in the table; its prefab arrives from the prefab agent.

## Environment agents (one per quad)

Export a `ZoneBuilder` from your `zones/quad-N-*.ts`. It runs once on the server
with a `ZoneContext` (`zones/types.ts`): your zone's folder, its terraces and
their parts, its ramps, and keep-clear boxes.

- Restyle your terraces (`terraceParts`: color, material) and dress them with
  props built from Parts, in your theme. Use only engine materials, colors,
  lights, particle emitters with `rbxasset://` textures, and `Terrain` if useful;
  no uploaded asset ids.
- No collidable prop may overlap a `clearZones` box (pedestals, where players
  stand and land, and the walking lane). Put placement in pure functions and spec
  that guarantee.
- Budget: at most 600 parts per zone; anchor everything; nothing moves on the
  server (client-side motion can come later).
- Scale props with the zone: a quad 7 terrace is far bigger than a quad 1 one.

## Prefab agent: the new giants

Build the 6 ★ giants as normalised R15 prefabs, like the existing 26, from a new
Lune script `tools/giants/derive_giants.luau` that reads existing prefabs and
writes `assets/ServerStorage/Giants/<Id>.rbxm`. Python and the original source
repos are not available on this machine, so derive from the prefabs already here:
recolor parts, move accessories between giants, adjust proportions. Each must
keep the prefab contract in `docs/giant-scaling.md` §2.1 (15 parts + HRP, Motor6Ds,
Humanoid with Animator and scale values at 1, feet on y = 0, unanchored,
attributes `DisplayName`, `Height`, `RosterIndex`, `Zone`).

Criteria each new giant must meet:

- Derived from a related rig, so it shares the zone's look.
- Its silhouette reads as its size tier: bulkier and more armoured as tiers rise.
- Its palette is unmistakably its zone's.

| Id            | Quad, place     | Derive from   | Look                                                 |
| ------------- | --------------- | ------------- | ---------------------------------------------------- |
| MosslingScout | Forest, 1st     | LeafNinja     | small and nimble; moss greens and bark browns        |
| AncientTreant | Forest, 4th     | ForestTroll   | hulking; dark bark, leafy crown, branch shoulders    |
| YetiWarlord   | Frost, 4th      | IceKing       | broad; white fur, ice-blue armour, horned helm       |
| VoidTyrant    | Chaos, 4th      | ChaosSummoner | towering; violet and black, crown, glowing accents   |
| MagmaBrute    | Volcanic, 3rd   | RedOrc        | heavy; charcoal body with glowing lava-orange cracks |
| IronChampion  | Neon Arena, 3rd | BuffNoob      | champion boxer; steel plating, gold title belt       |

## Giant size

Up to 2.5x a giant is sized through its Humanoid's body-scale values; above,
through `Model:ScaleTo` plus a client per-frame fix-up that divides each joint
Transform's translation by the scale, applied only when a probe shows the engine
still double-scales (`docs/giant-scaling.md` §5–7). The scaling agent builds this.

## Test queue (orchestrator only, one at a time)

1. Scaling framework
2. Quad 1 giants (Baron), then quad 1 environment
3. Quads 2–8 in order, each: giants, then environment
4. Each ★ giant when its quad's turn comes

Each item: merge, build, lint, Jest, a run-in-roblox probe (stands at the right
height, feet on the floor, animates at its size), a playtest with screenshots,
then commit. A failure goes back to its agent with the evidence.
