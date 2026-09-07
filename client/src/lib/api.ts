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
