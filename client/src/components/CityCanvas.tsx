import React, { useRef, useEffect, useState } from "react";
import {
  BUILDINGS,
  COLOSSI_ARCHETYPES,
  GRID_SIZE,
  TILE_SIZE,
  PADDING,
  LANE_GRID_COLUMN,
} from "../lib/constants";
import { BattleState, QuirkEvents } from "../lib/battleEngine";

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
  RAMPART: "#94a3b8",
  BALLISTA: "#facc15",
  SUNSTONE_PYLON: "#06b6d4",
  CITADEL: "#a855f7",
};

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
          ctx.fillStyle = "#1e1b4b";
          ctx.fillRect(tx + 2, ty + 2, TILE_SIZE - 4, TILE_SIZE - 4);
          // Glowing inner crest
          ctx.fillStyle = "#6366f1";
          ctx.beginPath();
          ctx.arc(tx + TILE_SIZE / 2, ty + TILE_SIZE / 2, 14, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#fbbf24";
          ctx.beginPath();
          ctx.arc(tx + TILE_SIZE / 2, ty + TILE_SIZE / 2, 6, 0, Math.PI * 2);
          ctx.fill();
        } else if (s.type === "RAMPART") {
          ctx.fillStyle =
            s.condition === "Destroyed"
              ? "#450a0a"
              : s.condition === "Damaged"
                ? "#713f12"
                : "#334155";
          ctx.fillRect(tx + 3, ty + 3, TILE_SIZE - 6, TILE_SIZE - 6);
          // Crenelations
          ctx.fillStyle = "#64748b";
          ctx.fillRect(tx + 4, ty + 4, 8, 8);
          ctx.fillRect(tx + TILE_SIZE - 12, ty + 4, 8, 8);
          ctx.fillRect(tx + 4, ty + TILE_SIZE - 12, 8, 8);
          ctx.fillRect(tx + TILE_SIZE - 12, ty + TILE_SIZE - 12, 8, 8);
        } else if (s.type === "BALLISTA") {
          ctx.fillStyle = "#1c1917";
          ctx.fillRect(tx + 4, ty + 4, TILE_SIZE - 8, TILE_SIZE - 8);
          // Turret crossbar
          ctx.strokeStyle = "#eab308";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(tx + 8, ty + TILE_SIZE / 2);
          ctx.lineTo(tx + TILE_SIZE - 8, ty + TILE_SIZE / 2);
          ctx.moveTo(tx + TILE_SIZE / 2, ty + 8);
          ctx.lineTo(tx + TILE_SIZE / 2, ty + TILE_SIZE - 8);
          ctx.stroke();
        } else if (s.type === "SUNSTONE_PYLON") {
          ctx.fillStyle = "#083344";
          ctx.fillRect(tx + 4, ty + 4, TILE_SIZE - 8, TILE_SIZE - 8);
          // Pylon crystal
          ctx.fillStyle = "#06b6d4";
          ctx.beginPath();
          ctx.moveTo(tx + TILE_SIZE / 2, ty + 6);
          ctx.lineTo(tx + TILE_SIZE - 10, ty + TILE_SIZE / 2);
          ctx.lineTo(tx + TILE_SIZE / 2, ty + TILE_SIZE - 6);
          ctx.lineTo(tx + 10, ty + TILE_SIZE / 2);
          ctx.closePath();
          ctx.fill();
        } else if (s.type === "QUARRY") {
          ctx.fillStyle = "#292524";
          ctx.fillRect(tx + 3, ty + 3, TILE_SIZE - 6, TILE_SIZE - 6);
          ctx.fillStyle = "#78716c";
          ctx.beginPath();
          ctx.arc(tx + 16, ty + 18, 8, 0, Math.PI * 2);
          ctx.arc(tx + 32, ty + 28, 10, 0, Math.PI * 2);
          ctx.fill();
        } else if (s.type === "FARM") {
          ctx.fillStyle = "#14532d";
          ctx.fillRect(tx + 3, ty + 3, TILE_SIZE - 6, TILE_SIZE - 6);
          // Crop rows
          ctx.fillStyle = "#84cc16";
          ctx.fillRect(tx + 6, ty + 8, TILE_SIZE - 12, 4);
          ctx.fillRect(tx + 6, ty + 20, TILE_SIZE - 12, 4);
          ctx.fillRect(tx + 6, ty + 32, TILE_SIZE - 12, 4);
        } else if (s.type === "ENERGY_COLLECTOR") {
          ctx.fillStyle = "#3b0764";
          ctx.fillRect(tx + 3, ty + 3, TILE_SIZE - 6, TILE_SIZE - 6);
          ctx.fillStyle = "#c084fc";
          ctx.beginPath();
          ctx.arc(tx + TILE_SIZE / 2, ty + TILE_SIZE / 2, 10, 0, Math.PI * 2);
          ctx.fill();
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
        const archetypeInfo =
          COLOSSI_ARCHETYPES[battleState.titan.archetype] ||
          COLOSSI_ARCHETYPES[0];

        // Colossus: pulsing radioactive ring, intensifying as it nears the Wall
        if (battleState.titan.class === "colossus") {
          const pulse = 4 * Math.sin(Date.now() / 150);
          ctx.strokeStyle = `rgba(132, 204, 22, ${0.3 + progress * 0.5})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(cx, cy, 42 + pulse, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Threat Aura
        ctx.fillStyle = "rgba(239, 68, 68, 0.2)";
        ctx.beginPath();
        ctx.arc(cx, cy, 36, 0, Math.PI * 2);
        ctx.fill();

        // Titan Body Silhouette
        ctx.fillStyle = archetypeInfo.color;
        ctx.beginPath();
        ctx.arc(cx, cy, 22, 0, Math.PI * 2);
        ctx.fill();

        // Glowing Eyes / Core
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(cx - 6, cy - 4, 3, 0, Math.PI * 2);
        ctx.arc(cx + 6, cy - 4, 3, 0, Math.PI * 2);
        ctx.fill();

        // Female: shielding minions, drifting either side of her
        battleState.titan.minions.forEach((minion, i) => {
          const mx = cx + (i === 0 ? -34 : 34);
          const my = cy + 8;
          ctx.fillStyle = "#22d3ee";
          ctx.beginPath();
          ctx.arc(mx, my, 9, 0, Math.PI * 2);
          ctx.fill();

          const minionHpPercent = Math.max(0, minion.hp / minion.maxHp);
          ctx.fillStyle = "#5a4c36";
          ctx.fillRect(mx - 12, my + 12, 24, 3);
          ctx.fillStyle = "#22c55e";
          ctx.fillRect(mx - 12, my + 12, 24 * minionHpPercent, 3);
        });

        // Name, Level & Class Badge
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 11px 'Lora', Georgia, serif";
        ctx.textAlign = "center";
        ctx.fillText(
          `${battleState.titan.name} (Lv.${battleState.titan.level}) [${battleState.titan.class.toUpperCase()}]`,
          cx,
          cy - 30,
        );

        // Titan Health Bar
        const barWidth = 60;
        const barHeight = 6;
        const hpPercent = Math.max(
          0,
          battleState.titan.hp / battleState.titan.maxHp,
        );
        ctx.fillStyle = "#5a4c36";
        ctx.fillRect(cx - barWidth / 2, cy - 24, barWidth, barHeight);
        ctx.fillStyle =
          hpPercent > 0.5 ? "#22c55e" : hpPercent > 0.2 ? "#eab308" : "#ef4444";
        ctx.fillRect(
          cx - barWidth / 2,
          cy - 24,
          barWidth * hpPercent,
          barHeight,
        );
        ctx.strokeStyle = "#8a7a5f";
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - barWidth / 2, cy - 24, barWidth, barHeight);
      }

      // 6. Update and Draw Projectiles
      const remainingProjectiles: Projectile[] = [];
      projectilesRef.current.forEach((proj) => {
        proj.progress += 0.08;
        if (proj.progress < 1) {
          proj.currentX =
            proj.startX + (proj.targetX - proj.startX) * proj.progress;
          proj.currentY =
            proj.startY + (proj.targetY - proj.startY) * proj.progress;

          ctx.strokeStyle = proj.color;
          ctx.lineWidth = proj.type === "beam" ? 3 : 2;
          ctx.beginPath();
          ctx.moveTo(proj.startX, proj.startY);
          ctx.lineTo(proj.currentX, proj.currentY);
          ctx.stroke();

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
