import React, { useRef, useEffect, useState } from "react";
import {
  BUILDINGS,
  GRID_SIZE,
  TILE_SIZE,
  PADDING,
  LANE_GRID_COLUMN,
} from "../lib/constants";
import { BattleState, QuirkEvents } from "../lib/battleEngine";
import towerAsset from "../assets/tower.png";
import ballistaAsset from "../assets/ballista.png";
import crystalAsset from "../assets/crystal.png";
import quarryAsset from "../assets/quarry.png";
import farmlandAsset from "../assets/farmland.png";
import solarShrineAsset from "../assets/solar_shrine.png";
import lavaGolemAsset from "../assets/lava_golem.png";
import spiderAsset from "../assets/spider.png";
import mechBoarAsset from "../assets/mech_boar.png";
import lightningElementalAsset from "../assets/lightning_elemental.png";
import lightningShardAsset from "../assets/lightning_shard.png";
import fireAsset from "../assets/fire.png";
import arrowAsset from "../assets/arrow_1.png";
import citadelAsset from "../assets/Citadel.png";

// Structure art — loaded once at module scope since it's shared across every
// CityCanvas instance and every placed structure of that type.
const CITADEL_IMAGE = new Image();
CITADEL_IMAGE.src = citadelAsset;
const RAMPART_IMAGE = new Image();
RAMPART_IMAGE.src = towerAsset;
const BALLISTA_IMAGE = new Image();
BALLISTA_IMAGE.src = ballistaAsset;
const SUNSTONE_PYLON_IMAGE = new Image();
SUNSTONE_PYLON_IMAGE.src = crystalAsset;
const QUARRY_IMAGE = new Image();
QUARRY_IMAGE.src = quarryAsset;
const FARM_IMAGE = new Image();
FARM_IMAGE.src = farmlandAsset;
const ENERGY_COLLECTOR_IMAGE = new Image();
ENERGY_COLLECTOR_IMAGE.src = solarShrineAsset;

// Titan art, keyed by archetype index (see COLOSSI_ARCHETYPES in constants.ts).
const MOUNTAIN_COLOSSUS_IMAGE = new Image();
MOUNTAIN_COLOSSUS_IMAGE.src = lavaGolemAsset;
const DREAD_STRIDER_IMAGE = new Image();
DREAD_STRIDER_IMAGE.src = spiderAsset;
const IRONCLAD_GORGER_IMAGE = new Image();
IRONCLAD_GORGER_IMAGE.src = mechBoarAsset;
const TEMPEST_GOLIATH_IMAGE = new Image();
TEMPEST_GOLIATH_IMAGE.src = lightningElementalAsset;
const TITAN_IMAGES_BY_ARCHETYPE: Record<number, HTMLImageElement> = {
  0: MOUNTAIN_COLOSSUS_IMAGE,
  1: DREAD_STRIDER_IMAGE,
  2: IRONCLAD_GORGER_IMAGE,
  3: TEMPEST_GOLIATH_IMAGE,
};
const MINION_IMAGE = new Image();
MINION_IMAGE.src = lightningShardAsset;

// Attack effects: Rampart hurls fire, Ballista fires an arrow, Sunstone fires a beam.
const FIRE_IMAGE = new Image();
FIRE_IMAGE.src = fireAsset;
const ARROW_IMAGE = new Image();
ARROW_IMAGE.src = arrowAsset;

// Canvas 2D `filter` string applied per condition so a single piece of art can
// still communicate Intact/Damaged/Destroyed without needing three source images.
function conditionFilter(
  condition: "Intact" | "Damaged" | "Destroyed",
): string {
  if (condition === "Damaged")
    return "sepia(0.35) saturate(0.7) brightness(0.85)";
  if (condition === "Destroyed") return "grayscale(0.85) brightness(0.45)";
  return "none";
}

export interface PlacedStructure {
  id: string;
  type: string;
  gridX: number;
  gridY: number;
  durability: number;
  maxDurability: number;
  level: number;
  condition: "Intact" | "Damaged" | "Destroyed";
  tokenId?: number;
  attestationHash?: string;
  /** Ticks left before this structure can fire again in the real-time battle loop. */
  cooldownRemaining?: number;
}

interface Projectile {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  targetX: number;
  targetY: number;
  color: string;
  damage: number;
  progress: number; // 0 to 1
  type: "ballista" | "beam";
  /** Structure type that fired this shot, when known — drives which attack art/effect renders. */
  sourceType?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  radius: number;
}

interface DamageNumber {
  x: number;
  y: number;
  value: number;
  alpha: number;
}

interface CityCanvasProps {
  structures: PlacedStructure[];
  selectedBuildingId: string | null;
  onTileClick: (x: number, y: number) => void;
  onSelectStructure: (structure: PlacedStructure | null) => void;
  battleState: BattleState | null;
  wallStatus: "standing" | "breached";
  lastFiredStructureIds: string[];
  lastQuirkEvents: QuirkEvents | null;
}

const CANVAS_WIDTH = GRID_SIZE * TILE_SIZE + PADDING * 2;
const CANVAS_HEIGHT = GRID_SIZE * TILE_SIZE + PADDING * 2;

// The Titan marches down a fixed vertical lane (bound to LANE_GRID_COLUMN) from
// just above the grid to the Wall just below it; its distance-based `progress`
// (0..1) interpolates here.
const LANE_X = PADDING + LANE_GRID_COLUMN * TILE_SIZE + TILE_SIZE / 2;
const LANE_SPAWN_Y = 18;
const LANE_WALL_Y = PADDING + GRID_SIZE * TILE_SIZE + 18;

const PROJECTILE_COLORS: Record<string, string> = {
  RAMPART: "#f97316",
  BALLISTA: "#facc15",
  SUNSTONE_PYLON: "#7dd3fc", // light/sky blue
  CITADEL: "#fbbf24", // yellow, with orange edge tint below
};

// Beam edge tint per source — the gradient fades from this to the beam's core
// color and back, so each beam-firing structure gets its own glow character.
const BEAM_EDGE_COLORS: Record<string, string> = {
  SUNSTONE_PYLON: "rgba(224, 242, 254, 0)", // light blue, fading to transparent
  CITADEL: "rgba(251, 146, 60, 0)", // orange, fading to transparent
};

// Beam thickness (3rem @ 16px base) for the glowing gradient beam effect (Sunstone/Citadel).
const BEAM_THICKNESS = 48;

const PROJECTILE_TYPES: Record<string, "ballista" | "beam"> = {
  RAMPART: "ballista",
  BALLISTA: "ballista",
  SUNSTONE_PYLON: "beam",
  CITADEL: "beam",
};

export const CityCanvas: React.FC<CityCanvasProps> = ({
  structures,
  selectedBuildingId,
  onTileClick,
  onSelectStructure,
  battleState,
  wallStatus,
  lastFiredStructureIds,
  lastQuirkEvents,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoveredTile, setHoveredTile] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const projectilesRef = useRef<Projectile[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const damageNumbersRef = useRef<DamageNumber[]>([]);
  const sprintFlashRef = useRef(0); // alpha of the Armored sprint flash, fades each frame

  // React to this tick's quirk events: Armored sprint flash + Beast strike projectile
  useEffect(() => {
    if (!lastQuirkEvents || !battleState) return;

    if (lastQuirkEvents.sprinted) {
      sprintFlashRef.current = 1;
    }

    if (lastQuirkEvents.beastAttackTargetId) {
      const target = structures.find(
        (s) => s.id === lastQuirkEvents.beastAttackTargetId,
      );
      if (target) {
        const progress =
          1 - battleState.distanceRemaining / battleState.totalDistance;
        const startX = LANE_X;
        const startY = LANE_SPAWN_Y + (LANE_WALL_Y - LANE_SPAWN_Y) * progress;
        const endX = PADDING + target.gridX * TILE_SIZE + TILE_SIZE / 2;
        const endY = PADDING + target.gridY * TILE_SIZE + TILE_SIZE / 2;
        projectilesRef.current.push({
          startX,
          startY,
          currentX: startX,
          currentY: startY,
          targetX: endX,
          targetY: endY,
          color: "#dc2626",
          damage: battleState.titan.siegePower,
          progress: 0,
          type: "beam",
        });
      }
    }
  }, [lastQuirkEvents, battleState, structures]);

  // Trigger projectiles from every structure that fired this battle tick
  useEffect(() => {
    if (lastFiredStructureIds.length === 0 || !battleState) return;

    const progress =
      1 - battleState.distanceRemaining / battleState.totalDistance;
    const targetX = LANE_X;
    const targetY = LANE_SPAWN_Y + (LANE_WALL_Y - LANE_SPAWN_Y) * progress;

    const newProjectiles: Projectile[] = [];
    lastFiredStructureIds.forEach((id) => {
      const s = structures.find((st) => st.id === id);
      const def = s ? BUILDINGS[s.type] : null;
      if (!s || !def) return;

      const startX = PADDING + s.gridX * TILE_SIZE + TILE_SIZE / 2;
      const startY = PADDING + s.gridY * TILE_SIZE + TILE_SIZE / 2;

      newProjectiles.push({
        startX,
        startY,
        currentX: startX,
        currentY: startY,
        targetX,
        targetY,
        color: PROJECTILE_COLORS[s.type] || "#facc15",
        damage: def.defensePower * s.level,
        progress: 0,
        type: PROJECTILE_TYPES[s.type] || "ballista",
        sourceType: s.type,
      });
    });

    projectilesRef.current.push(...newProjectiles);
  }, [lastFiredStructureIds, battleState, structures]);

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // 1. Draw Frontier Background — the map is drawn in ink on aged parchment
      ctx.fillStyle = "#d8cbae";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Grid area backdrop (parchment foundation)
      ctx.fillStyle = "#ece5d5";
      ctx.strokeStyle = "rgba(44, 36, 24, 0.18)";
      ctx.lineWidth = 1;
      ctx.fillRect(
        PADDING,
        PADDING,
        GRID_SIZE * TILE_SIZE,
        GRID_SIZE * TILE_SIZE,
      );

      // Draw Grid Lines
      for (let i = 0; i <= GRID_SIZE; i++) {
        const pos = PADDING + i * TILE_SIZE;
        ctx.beginPath();
        ctx.moveTo(pos, PADDING);
        ctx.lineTo(pos, PADDING + GRID_SIZE * TILE_SIZE);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(PADDING, pos);
        ctx.lineTo(PADDING + GRID_SIZE * TILE_SIZE, pos);
        ctx.stroke();
      }

      // Draw Aegis Perimeter line (Outer Border) — gold ink, never a filled shape
      ctx.strokeStyle = "#a97f34";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(
        PADDING - 4,
        PADDING - 4,
        GRID_SIZE * TILE_SIZE + 8,
        GRID_SIZE * TILE_SIZE + 8,
      );
      ctx.setLineDash([]);

      // Armored sprint flash — briefly highlights the lane column, fading out
      if (sprintFlashRef.current > 0) {
        ctx.fillStyle = `rgba(122, 35, 24, ${sprintFlashRef.current * 0.4})`;
        ctx.fillRect(
          PADDING + LANE_GRID_COLUMN * TILE_SIZE,
          PADDING,
          TILE_SIZE,
          GRID_SIZE * TILE_SIZE,
        );
        sprintFlashRef.current = Math.max(0, sprintFlashRef.current - 0.05);
      }

      // 2. Draw Energy Conduit Lines between Pylons & Citadel
      const pylonCoords: Array<{ x: number; y: number }> = [];
      let citadelCoord: { x: number; y: number } | null = null;

      structures.forEach((s) => {
        const px = PADDING + s.gridX * TILE_SIZE + TILE_SIZE / 2;
        const py = PADDING + s.gridY * TILE_SIZE + TILE_SIZE / 2;
        if (s.type === "CITADEL") citadelCoord = { x: px, y: py };
        if (s.type === "SUNSTONE_PYLON") pylonCoords.push({ x: px, y: py });
      });

      if (citadelCoord) {
        ctx.strokeStyle = "rgba(169, 127, 52, 0.4)";
        ctx.lineWidth = 1.5;
        pylonCoords.forEach((p) => {
          ctx.beginPath();
          ctx.moveTo(citadelCoord!.x, citadelCoord!.y);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        });
      }

      // 3. Draw Placed Structures
      structures.forEach((s) => {
        const tx = PADDING + s.gridX * TILE_SIZE;
        const ty = PADDING + s.gridY * TILE_SIZE;

        // Base tile fill
        if (s.type === "CITADEL") {
          // Same footprint as the old placeholder: inset 2px, (TILE_SIZE - 4) square.
          ctx.filter = conditionFilter(s.condition);
          if (CITADEL_IMAGE.complete) {
            ctx.drawImage(
              CITADEL_IMAGE,
              tx + 2,
              ty + 2,
              TILE_SIZE - 4,
              TILE_SIZE - 4,
            );
          }
          ctx.filter = "none";
        } else if (s.type === "RAMPART") {
          // Same footprint as the old placeholder: inset 3px, (TILE_SIZE - 6) square.
          ctx.filter = conditionFilter(s.condition);
          if (RAMPART_IMAGE.complete) {
            ctx.drawImage(
              RAMPART_IMAGE,
              tx + 3,
              ty + 3,
              TILE_SIZE - 6,
              TILE_SIZE - 6,
            );
          }
          ctx.filter = "none";
        } else if (s.type === "BALLISTA") {
          // Same footprint as the old placeholder: inset 4px, (TILE_SIZE - 8) square.
          ctx.filter = conditionFilter(s.condition);
          if (BALLISTA_IMAGE.complete) {
            ctx.drawImage(
              BALLISTA_IMAGE,
              tx + 4,
              ty + 4,
              TILE_SIZE - 8,
              TILE_SIZE - 8,
            );
          }
          ctx.filter = "none";
        } else if (s.type === "SUNSTONE_PYLON") {
          // Same footprint as the old placeholder: inset 4px, (TILE_SIZE - 8) square.
          ctx.filter = conditionFilter(s.condition);
          if (SUNSTONE_PYLON_IMAGE.complete) {
            ctx.drawImage(
              SUNSTONE_PYLON_IMAGE,
              tx + 4,
              ty + 4,
              TILE_SIZE - 8,
              TILE_SIZE - 8,
            );
          }
          ctx.filter = "none";
        } else if (s.type === "QUARRY") {
          // Same footprint as the old placeholder: inset 3px, (TILE_SIZE - 6) square.
          ctx.filter = conditionFilter(s.condition);
          if (QUARRY_IMAGE.complete) {
            ctx.drawImage(
              QUARRY_IMAGE,
              tx + 3,
              ty + 3,
              TILE_SIZE - 6,
              TILE_SIZE - 6,
            );
          }
          ctx.filter = "none";
        } else if (s.type === "FARM") {
          // Same footprint as the old placeholder: inset 3px, (TILE_SIZE - 6) square.
          ctx.filter = conditionFilter(s.condition);
          if (FARM_IMAGE.complete) {
            ctx.drawImage(
              FARM_IMAGE,
              tx + 3,
              ty + 3,
              TILE_SIZE - 6,
              TILE_SIZE - 6,
            );
          }
          ctx.filter = "none";
        } else if (s.type === "ENERGY_COLLECTOR") {
          // Same footprint as the old placeholder: inset 3px, (TILE_SIZE - 6) square.
          ctx.filter = conditionFilter(s.condition);
          if (ENERGY_COLLECTOR_IMAGE.complete) {
            ctx.drawImage(
              ENERGY_COLLECTOR_IMAGE,
              tx + 3,
              ty + 3,
              TILE_SIZE - 6,
              TILE_SIZE - 6,
            );
          }
          ctx.filter = "none";
        }

        // Mini Durability Bar
        const hpRatio = s.durability / s.maxDurability;
        ctx.fillStyle = "#5a4c36";
        ctx.fillRect(tx + 4, ty + TILE_SIZE - 5, TILE_SIZE - 8, 3);
        ctx.fillStyle =
          hpRatio > 0.5 ? "#22c55e" : hpRatio > 0.2 ? "#eab308" : "#ef4444";
        ctx.fillRect(tx + 4, ty + TILE_SIZE - 5, (TILE_SIZE - 8) * hpRatio, 3);
      });

      // 4. Draw Hover Highlight / Placement Preview
      if (hoveredTile) {
        const hx = PADDING + hoveredTile.x * TILE_SIZE;
        const hy = PADDING + hoveredTile.y * TILE_SIZE;
        ctx.fillStyle = selectedBuildingId
          ? "rgba(169, 127, 52, 0.22)"
          : "rgba(44, 36, 24, 0.08)";
        ctx.fillRect(hx, hy, TILE_SIZE, TILE_SIZE);
        ctx.strokeStyle = selectedBuildingId ? "#a97f34" : "#8a7a5f";
        ctx.lineWidth = 2;
        ctx.strokeRect(hx + 1, hy + 1, TILE_SIZE - 2, TILE_SIZE - 2);
      }

      // 5a. Draw the Wall — humanity's last line, spanning the base of the lane
      const wallY = LANE_WALL_Y;
      const breached = wallStatus === "breached";
      ctx.fillStyle = breached ? "#3a1610" : "#5a4c36";
      ctx.fillRect(PADDING - 10, wallY - 8, GRID_SIZE * TILE_SIZE + 20, 20);
      // Crenelations along the wall
      ctx.fillStyle = breached ? "#7a2318" : "#8a7a5f";
      for (let i = 0; i < GRID_SIZE + 1; i++) {
        ctx.fillRect(PADDING - 8 + i * TILE_SIZE, wallY - 12, 10, 8);
      }
      ctx.fillStyle = breached ? "#c65c4e" : "#000";
      ctx.font = "bold 10px 'Lora', Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillText(
        breached ? "THE WALL HAS FALLEN" : "THE CITY WALLS",
        LANE_X,
        wallY + 22,
      );

      // 5b. Draw the Marching Titan
      if (battleState) {
        const progress =
          1 - battleState.distanceRemaining / battleState.totalDistance;
        const cx = LANE_X;
        const cy = LANE_SPAWN_Y + (LANE_WALL_Y - LANE_SPAWN_Y) * progress;

        // Titan body size: base titans are +30% over the prior 44px radius (~57px);
        // the Mountain Colossus is bigger still, at 1.8x that base (~103px).
        const BASE_TITAN_RADIUS = 57;
        const COLOSSUS_TITAN_RADIUS = Math.round(BASE_TITAN_RADIUS * 1.8);
        const titanRadius =
          battleState.titan.class === "colossus"
            ? COLOSSUS_TITAN_RADIUS
            : BASE_TITAN_RADIUS;
        const titanSize = titanRadius * 2;
        // Aura/ring radii scale with the active titan's own size, not a fixed constant.
        const auraRadius = titanRadius * 1.64;

        // Colossus: pulsing radioactive ring, intensifying as it nears the Wall
        if (battleState.titan.class === "colossus") {
          const pulse = titanRadius * 0.18 * Math.sin(Date.now() / 150);
          ctx.strokeStyle = `rgba(132, 204, 22, ${0.3 + progress * 0.5})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(cx, cy, titanRadius * 1.91 + pulse, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Threat Aura
        ctx.fillStyle = "rgba(239, 68, 68, 0.2)";
        ctx.beginPath();
        ctx.arc(cx, cy, auraRadius, 0, Math.PI * 2);
        ctx.fill();

        // Titan Body
        const titanImage =
          TITAN_IMAGES_BY_ARCHETYPE[battleState.titan.archetype] ||
          MOUNTAIN_COLOSSUS_IMAGE;
        if (titanImage.complete) {
          ctx.drawImage(
            titanImage,
            cx - titanRadius,
            cy - titanRadius,
            titanSize,
            titanSize,
          );
        }

        // Female: shielding minions orbit her, spaced evenly around a ring sized
        // to clear the body (minion art itself stays a fixed size).
        const orbitRadius = titanRadius + 24;
        const orbitAngle = Date.now() / 600;
        battleState.titan.minions.forEach((minion, i) => {
          const angle =
            orbitAngle +
            (i * Math.PI * 2) / Math.max(1, battleState.titan.minions.length);
          const mx = cx + Math.cos(angle) * orbitRadius;
          const my = cy + Math.sin(angle) * orbitRadius * 0.6; // squashed for the top-down lane view
          if (MINION_IMAGE.complete) {
            ctx.drawImage(MINION_IMAGE, mx - 9, my - 9, 18, 18);
          }

          const minionHpPercent = Math.max(0, minion.hp / minion.maxHp);
          ctx.fillStyle = "#5a4c36";
          ctx.fillRect(mx - 12, my + 12, 24, 3);
          ctx.fillStyle = "#22c55e";
          ctx.fillRect(mx - 12, my + 12, 24 * minionHpPercent, 3);
        });

        // Name, Level & Class Badge
        ctx.fillStyle = "#8b0000";
        ctx.font = "bold 11px 'Lora', Georgia, serif";
        ctx.textAlign = "center";
        ctx.fillText(
          `${battleState.titan.name} (Lv.${battleState.titan.level}) [${battleState.titan.class.toUpperCase()}]`,
          cx,
          cy - titanRadius - 16,
        );

        // Titan Health Bar
        const barWidth = 60;
        const barHeight = 6;
        const hpPercent = Math.max(
          0,
          battleState.titan.hp / battleState.titan.maxHp,
        );
        ctx.fillStyle = "#5a4c36";
        ctx.fillRect(
          cx - barWidth / 2,
          cy - titanRadius - 6,
          barWidth,
          barHeight,
        );
        ctx.fillStyle =
          hpPercent > 0.5 ? "#22c55e" : hpPercent > 0.2 ? "#eab308" : "#ef4444";
        ctx.fillRect(
          cx - barWidth / 2,
          cy - titanRadius - 6,
          barWidth * hpPercent,
          barHeight,
        );
        ctx.strokeStyle = "#8a7a5f";
        ctx.lineWidth = 1;
        ctx.strokeRect(
          cx - barWidth / 2,
          cy - titanRadius - 6,
          barWidth,
          barHeight,
        );
      }

      // 6. Update and Draw Projectiles
      const remainingProjectiles: Projectile[] = [];
      projectilesRef.current.forEach((proj) => {
        // Fireballs travel 30% slower than every other attack.
        proj.progress += proj.sourceType === "RAMPART" ? 0.056 : 0.08;
        if (proj.progress < 1) {
          proj.currentX =
            proj.startX + (proj.targetX - proj.startX) * proj.progress;
          proj.currentY =
            proj.startY + (proj.targetY - proj.startY) * proj.progress;

          if (proj.sourceType === "RAMPART") {
            // Aegis Rampart: a drifting fireball, glowing orange via canvas shadow blur.
            if (FIRE_IMAGE.complete) {
              const size = 26;
              ctx.save();
              ctx.shadowColor = "rgba(249, 115, 22, 0.9)";
              ctx.shadowBlur = 18;
              ctx.drawImage(
                FIRE_IMAGE,
                proj.currentX - size / 2,
                proj.currentY - size / 2,
                size,
                size,
              );
              ctx.restore();
            }
          } else if (proj.sourceType === "BALLISTA") {
            // Ballista Bastion: an arrow, rotated to face its direction of travel.
            if (ARROW_IMAGE.complete) {
              const angle = Math.atan2(
                proj.targetY - proj.startY,
                proj.targetX - proj.startX,
              );
              const w = 34;
              const h = 8;
              ctx.save();
              ctx.translate(proj.currentX, proj.currentY);
              ctx.rotate(angle);
              ctx.drawImage(ARROW_IMAGE, -w / 2, -h / 2, w, h);
              ctx.restore();
            }
          } else if (proj.type === "beam") {
            // Sunstone Battery / Citadel: a glowing gradient beam, faded at the
            // edges and solid-colored at the core, with a drop-shadow-style glow.
            const dx = proj.currentX - proj.startX;
            const dy = proj.currentY - proj.startY;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            const nx = -dy / len;
            const ny = dx / len;
            const half = BEAM_THICKNESS / 2;

            ctx.save();
            ctx.shadowColor = proj.color;
            ctx.shadowBlur = 18;

            const gradient = ctx.createLinearGradient(
              proj.startX + nx * half,
              proj.startY + ny * half,
              proj.startX - nx * half,
              proj.startY - ny * half,
            );
            const edgeColor =
              (proj.sourceType && BEAM_EDGE_COLORS[proj.sourceType]) ||
              "rgba(224, 242, 254, 0)";
            gradient.addColorStop(0, edgeColor);
            gradient.addColorStop(0.5, proj.color);
            gradient.addColorStop(1, edgeColor);

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.moveTo(proj.startX + nx * half, proj.startY + ny * half);
            ctx.lineTo(proj.currentX + nx * half, proj.currentY + ny * half);
            ctx.lineTo(proj.currentX - nx * half, proj.currentY - ny * half);
            ctx.lineTo(proj.startX - nx * half, proj.startY - ny * half);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          } else {
            ctx.strokeStyle = proj.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(proj.startX, proj.startY);
            ctx.lineTo(proj.currentX, proj.currentY);
            ctx.stroke();
          }

          // Projectile head spark
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(proj.currentX, proj.currentY, 4, 0, Math.PI * 2);
          ctx.fill();

          remainingProjectiles.push(proj);
        } else {
          // Impact: Create hit particles and floating damage number
          for (let p = 0; p < 8; p++) {
            particlesRef.current.push({
              x: proj.targetX,
              y: proj.targetY,
              vx: (Math.random() - 0.5) * 4,
              vy: (Math.random() - 0.5) * 4,
              color: proj.color,
              alpha: 1,
              radius: Math.random() * 3 + 2,
            });
          }
          damageNumbersRef.current.push({
            x: proj.targetX + (Math.random() - 0.5) * 20,
            y: proj.targetY - 10,
            value: proj.damage,
            alpha: 1,
          });
        }
      });
      projectilesRef.current = remainingProjectiles;

      // 7. Update and Draw Impact Particles
      const remainingParticles: Particle[] = [];
      particlesRef.current.forEach((part) => {
        part.x += part.vx;
        part.y += part.vy;
        part.alpha -= 0.04;
        if (part.alpha > 0) {
          ctx.fillStyle = part.color;
          ctx.globalAlpha = Math.max(0, part.alpha);
          ctx.beginPath();
          ctx.arc(part.x, part.y, part.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1.0;
          remainingParticles.push(part);
        }
      });
      particlesRef.current = remainingParticles;

      // 8. Update and Draw Floating Damage Numbers
      const remainingDamage: DamageNumber[] = [];
      damageNumbersRef.current.forEach((dmg) => {
        dmg.y -= 0.8;
        dmg.alpha -= 0.025;
        if (dmg.alpha > 0) {
          ctx.fillStyle = `rgba(250, 204, 21, ${dmg.alpha})`;
          ctx.font = "bold 13px 'Lora', Georgia, serif";
          ctx.textAlign = "center";
          ctx.fillText(`-${dmg.value}`, dmg.x, dmg.y);
          remainingDamage.push(dmg);
        }
      });
      damageNumbersRef.current = remainingDamage;

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [structures, hoveredTile, selectedBuildingId, battleState, wallStatus]);

  // Handle Canvas Mouse Move
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left - PADDING;
    const mouseY = e.clientY - rect.top - PADDING;

    if (
      mouseX >= 0 &&
      mouseX < GRID_SIZE * TILE_SIZE &&
      mouseY >= 0 &&
      mouseY < GRID_SIZE * TILE_SIZE
    ) {
      const gx = Math.floor(mouseX / TILE_SIZE);
      const gy = Math.floor(mouseY / TILE_SIZE);
      setHoveredTile({ x: gx, y: gy });
    } else {
      setHoveredTile(null);
    }
  };

  // Handle Canvas Click
  const handleClick = () => {
    if (!hoveredTile) return;
    const existing = structures.find(
      (s) => s.gridX === hoveredTile.x && s.gridY === hoveredTile.y,
    );

    if (existing) {
      onSelectStructure(existing);
    } else {
      onTileClick(hoveredTile.x, hoveredTile.y);
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center p-3 panel-parchment rounded-md shadow-2xl">
      <div className="flex items-center justify-between w-full px-4 py-2 border-b border-rule text-xs text-ink-faint">
        <div className="flex items-center gap-2">
          {/* <span className="w-2.5 h-2.5 rounded-full bg-accent-500 animate-ping"></span> */}
          <span className="kicker text-[10px]">
            Tactical Perimeter — 12x12 Redoubt Grid
          </span>
        </div>
        <div className="font-mono">
          {hoveredTile
            ? `Sector: [${hoveredTile.x}, ${hoveredTile.y}]`
            : "Hover to target sector"}
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredTile(null)}
        onClick={handleClick}
        className="cursor-crosshair rounded-sm my-2 shadow-inner border border-rule"
      />

      <div className="flex items-center gap-4 text-xs text-ink-faint pb-1">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-ink-soft rounded-sm inline-block"></span>{" "}
          Rampart
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-[#c9a227] rounded-sm inline-block"></span>{" "}
          Ballista
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-accent-500 rounded-sm inline-block"></span>{" "}
          Sunstone Pylon
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-accent-900 rounded-sm inline-block"></span>{" "}
          Citadel Core
        </span>
      </div>
    </div>
  );
};
