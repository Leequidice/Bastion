# Bastion — Resource & Defense Art Asset Guide

This guide covers the visual direction and technical specifications for the six placeable
structures in Bastion, grouped as the game groups them in the Construction Palette:

- **Defenses**: Aegis Rampart, Ballista Bastion, Sunstone Battery
- **Resources**: Stone Quarry, Terrace Hydro-Farm, Sunstone Collector

It does **not** cover the Titans/Colossi (already finalized) or the Citadel Core (a fixed,
never-removable structure with its own bespoke treatment).

## 1. Art Direction — "The Manuscript"

The whole UI is styled as an aged parchment / medieval scroll document — ink and gold on
paper, brass hardware, nothing flat-digital. Structure art needs to live comfortably inside
that frame, which means:

- **Render as if hand-illustrated for a manuscript**, not as a clean vector game icon. Think
  woodcut / engraved illustration line work, or a muted painterly wash — visible linework,
  cross-hatching for shadow, texture in the strokes. Avoid smooth gradients, glossy highlights,
  drop shadows, or glow effects — those read as "modern UI," not "ink on paper."
- **Palette stays inside the manuscript's material logic**: parchment tones, iron/stone greys,
  aged brass/gold, oxblood red for damage, deep umber for shadow. No neon, no saturated
  primary colors. Reference hexes from the live theme:
  - Ink / linework: `#2c2418` (primary), `#5a4c36` (soft), `#8a7a5f` (faint)
  - Parchment ground: `#ece5d5`, lit highlight `#f4eee0`, aged shadow `#d8cbae`
  - Gold accent (used sparingly — trim, runes, metal fittings, never a large fill): `#a97f34`,
    highlight `#d9b877`, deep `#7d5411`
  - Damage/danger accent (oxblood, used for the "Damaged"/"Destroyed" condition states):
    `#7a2318`
- **Gold is jewelry, not paint.** On any structure, gold should appear as banding, rivets,
  inlay, or a small emblem — never as the dominant color of a whole building.
- Each piece should look like it was **painted or engraved on the page it sits on**, so a
  faint parchment texture / grain showing through the linework is welcome, not a flaw.

## 2. Per-Structure Specifications

Each entry includes: concept, silhouette, palette notes, and condition-state guidance. Costs/
stats are pulled from `client/src/lib/constants.ts` for reference only — not needed for the art
itself, but useful context for "how tough/important does this feel."

### Defenses

#### Aegis Rampart
- **Concept**: A squat, reinforced stretch of granite wall — the basic wall segment, cheap and
  plentiful, meant to look like it belongs in a defensive line rather than standing alone.
- **Silhouette**: Wide rectangular block, crenellated top edge (like a castle battlement),
  slightly wider than tall so it reads as "wall," not "tower."
- **Palette**: Cool grey stone (`#5a4c36`–`#8a7a5f` range) with visible mortar lines; a single
  thin gold band near the base suggesting a reinforcement collar — nothing more ornate.
- **Condition states**:
  - *Intact*: clean crenellations, tight mortar lines.
  - *Damaged*: one corner chipped/cracked, a visible fissure, some rubble at the base.
  - *Destroyed*: collapsed into a low pile of broken stone blocks, one jagged upright remnant.

#### Ballista Bastion
- **Concept**: A heavy timber-and-iron siege engine mounted on a stone platform — this is the
  precision ranged defense, so it should look mechanical and purposeful, mid-torsion-draw.
- **Silhouette**: A-frame or crossbow-style timber arms atop a compact stone/wood base, taller
  and narrower than the Rampart, with a clear "aiming" directionality (implied forward-facing
  bolt track).
- **Palette**: Dark timber brown (`#3a270d`–`#5a4c36`) for the frame, iron-grey fittings, one
  bright gold-toned bolt or tensioning mechanism as the focal detail.
- **Condition states**:
  - *Intact*: taut bowstring/torsion ropes, bolt loaded.
  - *Damaged*: snapped string hanging loose, splintered arm.
  - *Destroyed*: frame collapsed sideways, arm broken off entirely.

#### Sunstone Battery
- **Concept**: An arcane energy projector — the most magical/exotic of the three defenses,
  channeling "Sunstone" power into plasma arcs. This is the one place a *controlled* glow is
  appropriate (a faceted crystal core), but keep it a small internal light source, not a full
  neon wash over the piece.
- **Silhouette**: A vertical crystalline spire or faceted gem mounted in a stone/brass cradle,
  narrower footprint than the other two, reads as "tower," not "wall."
- **Palette**: Stone/brass cradle in the standard ink/gold palette, with the crystal itself in
  a restrained cyan-through-amber gradient (a *contained* magical accent, the one deliberate
  exception to "no saturated color" — think stained glass, not neon).
  Suggested crystal tone: `#5fa8a0` to `#d9b877` gradient, faceted, not smooth.
- **Condition states**:
  - *Intact*: crystal fully lit, facets clean.
  - *Damaged*: crystal cracked, light dimmed/flickering, one facet shattered.
  - *Destroyed*: crystal shattered into shards around a dark, burnt-out cradle.

### Resources

#### Stone Quarry
- **Concept**: A small open excavation pit with extracted stone blocks and rough-hewn boulders
  — an industrious, unglamorous economy building.
- **Silhouette**: Low and wide, a shallow pit/mound shape with piled stone at one edge; reads
  as "extraction site" rather than a building with walls.
- **Palette**: Warm grey/tan stone and dirt tones (`#8a7a5f`, `#d8cbae`), a simple wooden
  support beam or pulley as the one man-made accent, no gold trim (economy buildings should
  read as humbler than defenses — reserve gold accenting mostly for defense structures and the
  Citadel).
- **Condition states**: mirror the Rampart's treatment (chipped/collapsed) but scaled down —
  minor rubble on Damaged, a caved-in pit on Destroyed.

#### Terrace Hydro-Farm
- **Concept**: Stepped agricultural terraces with visible crop rows — the "food" building,
  should feel organic and cultivated against the otherwise stony palette.
- **Silhouette**: Layered horizontal terraces (2–3 steps), wider than tall, similar footprint
  to the Quarry but with a "growing" texture instead of a "dug" one.
- **Palette**: Muted olive/sage greens for crop rows (`#6b7a4a`-ish, kept desaturated to stay
  in the manuscript's muted register — avoid bright spring green) over the same tan/parchment
  earth tones as the Quarry.
- **Condition states**: Damaged = wilted/browned crop rows, a collapsed terrace edge; Destroyed
  = scorched earth, terraces caved into each other.

#### Sunstone Collector
- **Concept**: The economy counterpart to the Sunstone Battery — a simpler geothermal/solar
  collection array, gathering the same arcane energy without weaponizing it.
- **Silhouette**: A shallow dish or fan of angled collector panels around a small central
  crystal node — wider and lower than the Battery to visually distinguish "gathering" from
  "firing."
- **Palette**: Same restrained crystal accent as the Sunstone Battery, but smaller/dimmer, set
  into a plainer stone base (no gold banding — again, keep economy buildings visually humbler
  than defenses).
- **Condition states**: Damaged = panels askew, dim node; Destroyed = collapsed dish, dark
  cracked node.

## 3. Level & Progression Cues (optional but recommended)

Structures level up to a cap of 50 (`MAX_STRUCTURE_LEVEL` in `constants.ts`), gaining
durability and defense power each level. If producing multiple art tiers per structure,
suggest three visual tiers rather than fifty:

| Tier | Levels | Visual treatment |
|---|---|---|
| Bare | 1–15 | Base design as described above, no embellishment |
| Reinforced | 16–35 | Add one additional gold band/rivet row, slightly bulkier silhouette |
| Veteran | 36–50 | Visible battle-worn patina (scorch marks, repaired patches) *plus* the gold banding — a structure that has clearly survived many waves, without looking damaged |

This is a nice-to-have for later; the base (Bare tier) set is what's needed first.

## 4. Technical Specifications

- **Source resolution**: generate at **1024×1024px**, square canvas, structure centered with
  ~10% padding on all sides (leaves room for consistent in-game downscaling and cropping).
- **Format**: PNG with a **transparent background** (alpha channel) — these render on the
  in-game parchment/canvas backdrop, not on their own background.
- **In-game display size**: the build grid uses 48×48px tiles (`TILE_SIZE` in
  `client/src/lib/constants.ts`); the palette icons in the Construction Palette render around
  16×16px. Generating at 1024×1024 and downscaling covers both comfortably — do not generate
  natively at 48×48.
- **Perspective**: top-down / slight isometric lean (roughly a 30–45° tilt looking down),
  matching a city-builder grid — not a straight side-on elevation.
- **Lighting**: single implied light source from the upper-left (consistent with the parchment
  page's own "lamplit" highlight described in the UI theme), soft directional shadow falling
  down-right. No ambient occlusion halos or soft glows beyond the Sunstone crystal exception
  noted above.
- **Line weight**: consistent medium-weight ink linework across all six pieces so they read as
  one cohesive set, not six different styles.
- **Deliverables per structure**: 3 files (Intact / Damaged / Destroyed), named:
  `{structure-id}-{condition}.png`, e.g. `rampart-intact.png`, `rampart-damaged.png`,
  `rampart-destroyed.png`. Structure IDs match `client/src/lib/constants.ts`: `rampart`,
  `ballista`, `sunstone-pylon`, `quarry`, `farm`, `energy-collector`.

## 5. Ready-to-Use Generation Prompts

Drop these into an image generator as a starting point; adjust condition state per the notes
above by swapping the bracketed clause.

> **Aegis Rampart**: "A squat medieval stone wall segment with crenellated battlements, ink and
> wash illustration in the style of an aged manuscript woodcut, muted grey stone with visible
> mortar lines, a single thin worn-gold reinforcement band near the base, [intact and clean /
> cracked with a chipped corner and rubble / collapsed into broken stone blocks], top-down
> isometric city-builder perspective, light from upper-left, transparent background, no
> gradients, no glow, engraved line-art texture, square 1:1 composition."

> **Ballista Bastion**: "A heavy timber siege crossbow mounted on a compact stone platform,
> ink and wash manuscript illustration style, dark aged-wood frame with iron fittings and one
> brass tensioning mechanism, [bowstring taut and bolt loaded / string snapped and arm
> splintered / frame collapsed and arm broken off], top-down isometric city-builder
> perspective, light from upper-left, transparent background, engraved line-art texture,
> square 1:1 composition."

> **Sunstone Battery**: "A faceted crystal spire mounted in a stone-and-brass cradle, medieval
> manuscript ink-and-wash illustration style with a restrained stained-glass-like glow in
> the crystal only (cyan to warm gold gradient), [crystal fully lit and clean-faceted /
> cracked and flickering with one shattered facet / shattered into dark shards around a
> burnt-out cradle], top-down isometric city-builder perspective, transparent background,
> engraved line-art texture, square 1:1 composition."

> **Stone Quarry**: "A shallow open stone quarry pit with piled rough-hewn boulders and a
> simple wooden support beam, medieval manuscript ink-and-wash illustration style, warm grey
> and tan earth tones, no metal ornamentation, [tidy piled stone / minor rubble and a chipped
> ledge / caved-in pit], top-down isometric city-builder perspective, light from upper-left,
> transparent background, engraved line-art texture, square 1:1 composition."

> **Terrace Hydro-Farm**: "Stepped agricultural terraces with visible crop rows, medieval
> manuscript ink-and-wash illustration style, muted desaturated olive-green crops over tan
> earth terraces, [healthy full crop rows / wilted browned crops with a collapsed terrace edge
> / scorched earth with caved-in terraces], top-down isometric city-builder perspective, light
> from upper-left, transparent background, engraved line-art texture, square 1:1 composition."

> **Sunstone Collector**: "A shallow fan of angled stone collector panels around a small dim
> crystal node, medieval manuscript ink-and-wash illustration style, plain stone base with no
> gold ornamentation, small restrained crystal glow, [panels aligned and node glowing softly /
> panels askew and node dim / collapsed dish around a dark cracked node], top-down isometric
> city-builder perspective, transparent background, engraved line-art texture, square 1:1
> composition."

## 6. Consistency Checklist

Before finalizing a batch, confirm every asset:
- [ ] Uses the same implied light direction (upper-left) and line weight as the others
- [ ] Stays within the manuscript palette (no saturated primaries outside the Sunstone crystal
      exception)
- [ ] Has a transparent background with no drop shadow baked in (shadows are handled by the
      game's own rendering)
- [ ] Reserves gold accenting for Defenses only — Resources stay visually humbler
- [ ] Has all three condition states (Intact / Damaged / Destroyed) generated as a matched set
