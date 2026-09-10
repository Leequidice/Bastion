import { Router } from "express";
import { redis } from "../redis.js";
import { requireAuth } from "../middleware/auth.js";
import { LEADERBOARD_LEVELS_KEY, LEADERBOARD_NAMES_KEY } from "./leaderboard.js";

const router = Router();

function stateKey(userId: string) {
  return `bastion:state:${userId}`;
}

router.get("/", requireAuth, async (req, res) => {
  const raw = await redis.get(stateKey(req.userId!));
  res.json({ state: raw ? JSON.parse(raw) : null });
});

router.put("/", requireAuth, async (req, res) => {
  const body = req.body;
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    res.status(400).json({ error: "Body must be a JSON object" });
    return;
  }
  await redis.set(stateKey(req.userId!), JSON.stringify(body));

  // Keep the public leaderboard in sync with this save. GT ensures a score never regresses.
  if (typeof body.highestLevelReached === "number") {
    await redis.zadd(LEADERBOARD_LEVELS_KEY, "GT", "CH", body.highestLevelReached, req.userId!);
    // Prefer the player's chosen game name; fall back to their wallet address.
    const displayName =
      typeof body.gameName === "string" && body.gameName.trim()
        ? body.gameName.trim()
        : typeof body.account === "string" && body.account
        ? body.account
        : null;
    if (displayName) {
      await redis.hset(LEADERBOARD_NAMES_KEY, req.userId!, displayName);
    }
  }

  res.json({ ok: true });
});

export default router;
