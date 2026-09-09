import { Router } from "express";
import { ethers } from "ethers";
import { redis } from "../redis.js";
import { requireAuth } from "../middleware/auth.js";
import { operatorWallet, DRIP_AMOUNT_CTC, OPERATOR_MIN_BALANCE_CTC, getOperatorBalanceCTC } from "../operatorWallet.js";

const router = Router();

function drippedKey(userId: string) {
  return `bastion:faucet:dripped:${userId}`;
}

function rateLimitKey(ip: string) {
  return `bastion:faucet:ratelimit:${ip}`;
}

router.post("/", requireAuth, async (req, res) => {
  const { address } = req.body;
  if (typeof address !== "string" || !ethers.isAddress(address)) {
    res.status(400).json({ error: "A valid recipient address is required" });
    return;
  }

  const userId = req.userId!;

  // Atomically claim this user's one-time drip before doing anything else, so two
  // concurrent requests (e.g. a double-mount effect) can't both slip through.
  const claimed = await redis.set(drippedKey(userId), "pending", "NX");
  if (!claimed) {
    res.json({ ok: true, skipped: true, reason: "already dripped" });
    return;
  }

  try {
    // Abuse guard: cap drip attempts per IP per hour, since a bad actor could churn
    // Privy accounts to keep farming the one-drip-per-user rule otherwise.
    const ip = req.ip || "unknown";
    const attempts = await redis.incr(rateLimitKey(ip));
    if (attempts === 1) await redis.expire(rateLimitKey(ip), 3600);
    if (attempts > 5) {
      await redis.del(drippedKey(userId));
      res.status(429).json({ error: "Too many faucet requests from this network. Try again later." });
      return;
    }

    const operatorBalance = await getOperatorBalanceCTC();
    if (operatorBalance < Number(OPERATOR_MIN_BALANCE_CTC)) {
      console.error(`Operator wallet balance low (${operatorBalance} CTC) — refusing drip`);
      await redis.del(drippedKey(userId));
      res.status(503).json({ error: "Faucet is temporarily out of funds. Try the community faucet instead." });
      return;
    }

    const tx = await operatorWallet.sendTransaction({
      to: address,
      value: ethers.parseEther(DRIP_AMOUNT_CTC),
    });
    await redis.set(drippedKey(userId), tx.hash);
    res.json({ ok: true, txHash: tx.hash, amount: DRIP_AMOUNT_CTC });
  } catch (err) {
    console.error("Faucet drip failed:", err);
    await redis.del(drippedKey(userId));
    res.status(500).json({ error: "Drip transaction failed" });
  }
});

export default router;
