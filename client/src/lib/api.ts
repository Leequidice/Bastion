const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8787";

export async function getState(token: string): Promise<unknown | null> {
  const res = await fetch(`${API_URL}/api/state`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`getState failed: ${res.status}`);
  const { state } = await res.json();
  return state;
}

export async function saveState(token: string, state: unknown): Promise<void> {
  const res = await fetch(`${API_URL}/api/state`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(state),
  });
  if (!res.ok) throw new Error(`saveState failed: ${res.status}`);
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string | null;
  level: number;
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const res = await fetch(`${API_URL}/api/leaderboard`);
  if (!res.ok) throw new Error(`getLeaderboard failed: ${res.status}`);
  const { entries } = await res.json();
  return entries;
}
