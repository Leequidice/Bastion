import React, { useRef, useEffect, useState } from "react";
import { BUILDINGS, COLOSSI_ARCHETYPES } from "../lib/constants";

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
}

export interface ActiveColossus {
  id: number;
  archetype: number;
  name: string;
  severity: number;
  hp: number;
  maxHp: number;
  x: number; // In canvas pixels
  y: number;
  targetX: number;
  targetY: number;
  status: "Approaching" | "Engaged" | "Repelled" | "Breached";
  siegePower: number;
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
  activeColossus: ActiveColossus | null;
  firingAnimationTrigger: number; // Increment to trigger firing animation
}

const GRID_SIZE = 12;
const TILE_SIZE = 48; // 12 * 48 = 576px canvas
const PADDING = 40;
const CANVAS_WIDTH = GRID_SIZE * TILE_SIZE + PADDING * 2;
const CANVAS_HEIGHT = GRID_SIZE * TILE_SIZE + PADDING * 2;

export const CityCanvas: React.FC<CityCanvasProps> = ({
  structures,
  selectedBuildingId,
  onTileClick,
  onSelectStructure,
  activeColossus,
  firingAnimationTrigger,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoveredTile, setHoveredTile] = useState<{ x: number; y: number } | null>(null);
  const projectilesRef = useRef<Projectile[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const damageNumbersRef = useRef<DamageNumber[]>([]);

  // Trigger projectiles when firing animation requested
  useEffect(() => {
    if (firingAnimationTrigger === 0 || !activeColossus || activeColossus.status !== "Approaching") return;

    const newProjectiles: Projectile[] = [];
    const targetX = activeColossus.x;
    const targetY = activeColossus.y;

    structures.forEach((s) => {
      if (s.condition === "Destroyed") return;
      const startX = PADDING + s.gridX * TILE_SIZE + TILE_SIZE / 2;
      const startY = PADDING + s.gridY * TILE_SIZE + TILE_SIZE / 2;

      if (s.type === "BALLISTA") {
        newProjectiles.push({
          startX,
          startY,
          currentX: startX,
          currentY: startY,
          targetX,
          targetY,
          color: "#facc15", // Gold
          damage: 450,
          progress: 0,
          type: "ballista",
        });
      } else if (s.type === "SUNSTONE_PYLON") {
        newProjectiles.push({
          startX,
          startY,
          currentX: startX,
          currentY: startY,
          targetX,
          targetY,
          color: "#06b6d4", // Cyan
          damage: 650,
          progress: 0,
          type: "beam",
        });
      } else if (s.type === "CITADEL") {
        newProjectiles.push({
          startX,
          startY,
          currentX: startX,
          currentY: startY,
          targetX,
          targetY,
          color: "#a855f7", // Purple
          damage: 300,
          progress: 0,
          type: "beam",
        });
      }
    });

    projectilesRef.current.push(...newProjectiles);
  }, [firingAnimationTrigger]);

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // 1. Draw Frontier Background
      ctx.fillStyle = "#090a12";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Grid area backdrop (Granite foundation)
      ctx.fillStyle = "#0f172a";
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 1;
      ctx.fillRect(PADDING, PADDING, GRID_SIZE * TILE_SIZE, GRID_SIZE * TILE_SIZE);

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

      // Draw Aegis Perimeter line (Outer Border)
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(PADDING - 4, PADDING - 4, GRID_SIZE * TILE_SIZE + 8, GRID_SIZE * TILE_SIZE + 8);
      ctx.setLineDash([]);

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
        ctx.strokeStyle = "rgba(6, 182, 212, 0.35)";
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
          ctx.fillStyle = s.condition === "Destroyed" ? "#450a0a" : s.condition === "Damaged" ? "#713f12" : "#334155";
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
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(tx + 4, ty + TILE_SIZE - 5, TILE_SIZE - 8, 3);
        ctx.fillStyle = hpRatio > 0.5 ? "#22c55e" : hpRatio > 0.2 ? "#eab308" : "#ef4444";
        ctx.fillRect(tx + 4, ty + TILE_SIZE - 5, (TILE_SIZE - 8) * hpRatio, 3);
      });

      // 4. Draw Hover Highlight / Placement Preview
      if (hoveredTile) {
        const hx = PADDING + hoveredTile.x * TILE_SIZE;
        const hy = PADDING + hoveredTile.y * TILE_SIZE;
        ctx.fillStyle = selectedBuildingId ? "rgba(56, 189, 248, 0.25)" : "rgba(255, 255, 255, 0.1)";
        ctx.fillRect(hx, hy, TILE_SIZE, TILE_SIZE);
        ctx.strokeStyle = selectedBuildingId ? "#38bdf8" : "#94a3b8";
        ctx.lineWidth = 2;
        ctx.strokeRect(hx + 1, hy + 1, TILE_SIZE - 2, TILE_SIZE - 2);
      }

      // 5. Draw Approaching Colossus
      if (activeColossus && (activeColossus.status === "Approaching" || activeColossus.status === "Engaged")) {
        const cx = activeColossus.x;
        const cy = activeColossus.y;
        const archetypeInfo = COLOSSI_ARCHETYPES[activeColossus.archetype] || COLOSSI_ARCHETYPES[0];

        // Threat Aura
        ctx.fillStyle = "rgba(239, 68, 68, 0.2)";
        ctx.beginPath();
        ctx.arc(cx, cy, 36, 0, Math.PI * 2);
        ctx.fill();

        // Colossus Body Silhouette
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

        // Name & Star Badge
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 11px system-ui";
        ctx.textAlign = "center";
        ctx.fillText(`${activeColossus.name} (${"★".repeat(activeColossus.severity)})`, cx, cy - 30);

        // Colossus Health Bar
        const barWidth = 60;
        const barHeight = 6;
        const hpPercent = Math.max(0, activeColossus.hp / activeColossus.maxHp);
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(cx - barWidth / 2, cy - 24, barWidth, barHeight);
        ctx.fillStyle = hpPercent > 0.5 ? "#22c55e" : hpPercent > 0.2 ? "#eab308" : "#ef4444";
        ctx.fillRect(cx - barWidth / 2, cy - 24, barWidth * hpPercent, barHeight);
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - barWidth / 2, cy - 24, barWidth, barHeight);
      }

      // 6. Update and Draw Projectiles
      const remainingProjectiles: Projectile[] = [];
      projectilesRef.current.forEach((proj) => {
        proj.progress += 0.08;
        if (proj.progress < 1) {
          proj.currentX = proj.startX + (proj.targetX - proj.startX) * proj.progress;
          proj.currentY = proj.startY + (proj.targetY - proj.startY) * proj.progress;

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
          ctx.font = "bold 13px system-ui";
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
  }, [structures, hoveredTile, selectedBuildingId, activeColossus]);

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
      (s) => s.gridX === hoveredTile.x && s.gridY === hoveredTile.y
    );

    if (existing) {
      onSelectStructure(existing);
    } else {
      onTileClick(hoveredTile.x, hoveredTile.y);
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center p-3 bg-slate-950/80 border border-slate-800 rounded-xl shadow-2xl backdrop-blur-md">
      <div className="flex items-center justify-between w-full px-4 py-2 border-b border-slate-800 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
          <span>Tactical Perimeter // 12x12 Redoubt Grid</span>
        </div>
        <div>
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
        className="cursor-crosshair rounded-lg my-2 shadow-inner"
      />

      <div className="flex items-center gap-4 text-xs text-slate-400 pb-1">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-slate-700 rounded-sm inline-block"></span> Rampart
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-yellow-500 rounded-sm inline-block"></span> Ballista
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-cyan-500 rounded-sm inline-block"></span> Sunstone Pylon
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-indigo-600 rounded-sm inline-block"></span> Citadel Core
        </span>
      </div>
    </div>
  );
};
