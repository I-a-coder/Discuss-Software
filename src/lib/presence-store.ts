/** In-memory org presence — last seen per user (single-node / dev) */

const ONLINE_MS = 45_000;
const store = new Map<string, number>();

export function heartbeat(userId: string) {
  store.set(userId, Date.now());
}

export function isOnline(userId: string): boolean {
  const last = store.get(userId);
  if (!last) return false;
  return Date.now() - last < ONLINE_MS;
}

export function getOnlineUserIds(userIds: string[]): Set<string> {
  const now = Date.now();
  const online = new Set<string>();
  for (const id of userIds) {
    const last = store.get(id);
    if (last && now - last < ONLINE_MS) online.add(id);
  }
  return online;
}

export function pruneStale() {
  const now = Date.now();
  for (const [id, last] of store) {
    if (now - last >= ONLINE_MS * 2) store.delete(id);
  }
}
