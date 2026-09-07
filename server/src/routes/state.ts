import { Router } from "express";
import { redis } from "../redis.js";
import { requireAuth } from "../middleware/auth.js";

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
  res.json({ ok: true });
});

export default router;
