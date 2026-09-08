import { Router } from "express";
import { redis } from "../redis.js";

export const LEADERBOARD_LEVELS_KEY = "bastion:leaderboard:levels";
export const LEADERBOARD_NAMES_KEY = "bastion:leaderboard:names";

const router = Router();

router.get("/", async (_req, res) => {
  const raw = await redis.zrevrange(LEADERBOARD_LEVELS_KEY, 0, 19, "WITHSCORES");

  const userIds: string[] = [];
  const levels: number[] = [];
  for (let i = 0; i < raw.length; i += 2) {
    userIds.push(raw[i]);
    levels.push(Number(raw[i + 1]));
  }

  const names = userIds.length > 0 ? await redis.hmget(LEADERBOARD_NAMES_KEY, ...userIds) : [];

  const entries = userIds.map((userId, i) => ({
    rank: i + 1,
    userId,
    displayName: names[i] || null,
    level: levels[i],
  }));

  res.json({ entries });
});

export default router;
