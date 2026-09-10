# Bastion — Titan / Colossi Art Guide

This is a **description-only** reference, produced for planning/generation purposes. The
Titans' current in-canvas rendering (procedural silhouettes drawn in `CityCanvas.tsx`) is
intentionally left as-is — the mechanics and feel of the four Titan classes were called out as
already working well, so nothing here should be treated as a request to replace that code.
Use this doc only if/when real illustrated Titan art gets commissioned or generated later.

Titan definitions live in `client/src/lib/constants.ts` (`COLOSSI_ARCHETYPES`), and their
mechanical quirks are implemented in `client/src/lib/battleEngine.ts`. All four share one
mandatory constraint: they march down a single fixed grid lane toward the Wall, so any art
needs a clear "facing forward, advancing" read from directly above (matching the
top-down/isometric perspective used for structures in `docs/ART_ASSET_GUIDE.md`).

## Shared Direction

- **Scale**: each Titan should visually dominate the 48px grid tile it occupies — these are
  the threat, not another building. Bigger, heavier silhouette than any single structure.
- **Palette**: unlike the structures (which stay inside the muted manuscript palette), Titans
  are allowed genuine saturated color per their class — they're the one place in the game
  where danger should read as vivid rather than restrained ink-and-parchment. Each archetype
  already has a signature accent color defined in code (see below); keep that hue as the
  primary "tell" so players can identify a Titan's class at a glance even at small size.
  Combine that saturated accent with an otherwise dark, weathered body (charcoal, rust,
  slag-grey) so the color reads as *emanating from* the creature (glowing cracks, eyes, energy)
  rather than being its base skin tone.
  Reason for the contrast: the whole rest of the UI is deliberately ink/parchment-muted, so
  Titans being the one saturated, alarming element reinforces "the invading threat doesn't
  belong on this page."
- **Silhouette read**: since these are rendered small on a battle lane, prioritize a strong,
  simple outline over fine detail — a player should be able to tell the four classes apart from
  silhouette alone at a glance while the Titan is moving.
- **Mood**: menacing, foreign, industrial/geological rather than organic-fantasy — think siege
  golem or corrupted machine more than dragon or beast-from-folklore, in keeping with the
  Attestcoin/testnet "siege" framing of the game.

## The Four Archetypes

### Mountain Colossus — "The Fallout Breaker"
- **Class**: `colossus` · **Signature color**: orange (`#f97316`)
- **Mechanic to reflect visually**: continuous radioactive area damage that intensifies the
  closer it gets to the Wall (see `RADIOACTIVE_BASE_DAMAGE_PER_TICK` in `constants.ts`) — no
  second timer-based quirk, just a constant escalating aura.
- **Concept**: a hulking, mountain-sized rock/magma body, cracked open in glowing orange
  fault-lines that visibly widen/brighten as it nears the Wall. Radioactive fallout should read
  as drifting embers or ash particles trailing behind it, not a cartoon green-goo aesthetic.
- **Silhouette**: widest and most vertically massive of the four — a slow, unstoppable-looking
  boulder-golem shape, hunched shoulders, small head relative to body.

### Dread Strider — "The Skittering Nightmare"
- **Class**: `beast` · **Signature color**: purple (`#a855f7`)
- **Mechanic to reflect visually**: periodically lashes out at the nearest defense structure on
  a fixed interval (`BEAST_ATTACK_INTERVAL_MS`, no escalation) while continuing to advance.
- **Concept**: a fast, insectoid/arachnid predator — many-legged, low-slung, built for
  quick lateral strikes rather than brute force. Purple bioluminescent markings along the
  joints/legs that could flash or pulse at the moment of its strike.
- **Silhouette**: the leanest and lowest of the four, wide stance, an implied "about to lunge"
  posture even when idle — reads as agile/dangerous rather than tanky.

### Ironclad Gorger — "The Ore Devourer"
- **Class**: `armored` · **Signature color**: yellow (`#eab308`)
- **Mechanic to reflect visually**: heavy plate armor (+10% HP per `ARMORED_HP_BONUS_MULTIPLIER`)
  and a periodic sprint (`ARMORED_TIMER_SEQUENCE_MS`, escalating cadence that holds at its
  final interval) that flattens structures in its path.
- **Concept**: a bulky quadruped or bipedal siege-beast encased in riveted slag-iron plating,
  yellow hazard-style banding at the joints (echoing heavy machinery warning markings). Should
  look armored enough that the sprint reads as "a battering ram," not "a sprinter."
  Consider a lowered, horn-like or ram-plate head component that visually telegraphs the
  charge attack.
- **Silhouette**: blocky and rectangular, heaviest visual weight of the four, low center of
  gravity implying it's built to plow forward.

### Tempest Goliath — "The Storm Bringer"
- **Class**: `female` · **Signature color**: cyan (`#06b6d4`)
- **Mechanic to reflect visually**: periodically summons two shielding minions
  (`FEMALE_TIMER_SEQUENCE_MS`, each minion at `FEMALE_MINION_HP_RATIO` of her max HP) that must
  be destroyed before she takes damage.
- **Concept**: a tall, crackling storm-elemental figure — cyan lightning arcing across a dark,
  almost translucent body. The two summoned minions should read as smaller "lightning wisp"
  fragments of the same design language (same cyan arcing, same material), so it's visually
  obvious they're extensions of her rather than unrelated creatures.
- **Silhouette**: the tallest and narrowest of the four, an implied "channeling/casting" posture
  (arms or limbs raised/spread) rather than a hunched combat stance — reads as caster/support,
  distinct from the other three melee-coded archetypes.

## Technical Notes (if art is commissioned later)

- Match the structure-art specs in `docs/ART_ASSET_GUIDE.md` for format/delivery: 1024×1024
  transparent PNG, top-down/isometric perspective, single upper-left light source.
- Unlike structures, Titans do **not** need Intact/Damaged/Destroyed variants — HP is
  communicated via the existing on-canvas health bar, not the art itself. A single "alive" pose
  per archetype is sufficient; a brief death/defeat pose is a nice-to-have, not required.
- For the Tempest Goliath's minions specifically, deliver them as a separate smaller asset
  sharing the same visual language as the main body (see concept notes above).
