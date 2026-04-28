const KEY_API = "mahi.geminiApiKey";
const KEY_MEMORY = "mahi.memory";

export function getApiKey(): string | null {
  try {
    return localStorage.getItem(KEY_API);
  } catch {
    return null;
  }
}

export function setApiKey(key: string): void {
  try {
    localStorage.setItem(KEY_API, key);
  } catch {
    /* noop */
  }
}

export function clearApiKey(): void {
  try {
    localStorage.removeItem(KEY_API);
  } catch {
    /* noop */
  }
}

export interface MemoryEntry {
  id: string;
  createdAt: number;
  summary: string;
}

export function getMemory(): MemoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY_MEMORY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function appendMemory(entry: MemoryEntry): void {
  try {
    const list = getMemory();
    list.push(entry);
    while (list.length > 30) list.shift();
    localStorage.setItem(KEY_MEMORY, JSON.stringify(list));
  } catch {
    /* noop */
  }
}

export function clearMemory(): void {
  try {
    localStorage.removeItem(KEY_MEMORY);
  } catch {
    /* noop */
  }
}
