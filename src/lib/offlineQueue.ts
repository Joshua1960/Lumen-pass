// Small localStorage-backed queue of scans captured while offline (or while a
// verify request failed). Drained automatically when connectivity returns.

export interface QueuedScan {
  id: string;
  event_id: string;
  raw: string;
  captured_at: number;
}

const KEY = 'lumen.scanQueue.v1';

function read(): QueuedScan[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}
function write(list: QueuedScan[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    throw new Error('Could not save the scan on this device. Check available browser storage and try again.');
  }
}

export function enqueue(event_id: string, raw: string): QueuedScan {
  const entry: QueuedScan = {
    id: Math.random().toString(36).slice(2) + Date.now().toString(36),
    event_id, raw, captured_at: Date.now(),
  };
  const list = read();
  list.push(entry);
  write(list);
  return entry;
}

export function list(event_id?: string): QueuedScan[] {
  const all = read();
  return event_id ? all.filter(q => q.event_id === event_id) : all;
}

export function count(event_id?: string): number {
  return list(event_id).length;
}

export function remove(id: string) {
  write(read().filter(q => q.id !== id));
}

export function clear(event_id?: string) {
  if (!event_id) { write([]); return; }
  write(read().filter(q => q.event_id !== event_id));
}
