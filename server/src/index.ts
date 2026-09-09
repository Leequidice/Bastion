import "dotenv/config";
import cors from "cors";
import express from "express";
import stateRoutes from "./routes/state.js";
import leaderboardRoutes from "./routes/leaderboard.js";
import faucetRoutes from "./routes/faucet.js";

const app = express();
const PORT = Number(process.env.PORT) || 8787;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api/state", stateRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/faucet", faucetRoutes);

app.listen(PORT, () => {
  console.log(`Bastion server listening on http://localhost:${PORT}`);
});
