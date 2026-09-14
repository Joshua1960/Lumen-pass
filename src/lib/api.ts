import type {
  AttendanceLog,
  DispatchedInvite,
  EventRecord,
  HostStats,
  Invitation,
  Profile,
  ScanResponse,
} from "./types";
import {
  mockAttendanceLogs,
  mockEvents,
  mockInvitations,
  mockStats,
} from "./mockData";

// ---------------------------------------------------------------------------
// Persistent local store (localStorage) so the door book survives reloads.
// Seeds from mockData on first run.
// ---------------------------------------------------------------------------

const K_EVENTS = "lumen_events_v1";
const K_INVITES = "lumen_invites_v1";
const K_LOGS = "lumen_logs_v1";
const K_STREAM = "lumen_stream_v1";

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full / private mode — run in-memory only */
  }
}

let events: EventRecord[] = load(K_EVENTS, [...mockEvents]);
let invitations: Invitation[] = load(K_INVITES, [...mockInvitations]);
let logs: AttendanceLog[] = load(K_LOGS, [...mockAttendanceLogs]);

// First-run seed guard: if storage was empty but mocks exist, persist them.
if (!localStorage.getItem(K_EVENTS)) save(K_EVENTS, events);
if (!localStorage.getItem(K_INVITES)) save(K_INVITES, invitations);
if (!localStorage.getItem(K_LOGS)) save(K_LOGS, logs);

function persist(notify = true) {
  save(K_EVENTS, events);
  save(K_INVITES, invitations);
  save(K_LOGS, logs);
  if (notify) {
    // Real-time data stream: every mutation broadcasts a version bump so all
    // open tabs/views (host dashboard, attendance, event detail, scanner)
    // refresh instantly without a page reload — same-tab via CustomEvent,
    // cross-tab via the storage event on the version key.
    try {
      const v = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      localStorage.setItem(K_STREAM, v);
      window.dispatchEvent(new CustomEvent("lumen:stream", { detail: { v } }));
    } catch {
      /* noop */
    }
  }
}

// ---------------------------------------------------------------------------
// Secure token helpers — unguessable single-use door seals.
// ---------------------------------------------------------------------------

/**
 * Algorithmic QR seal for a User–Event pairing.
 * HMAC-style construction: binding = sha-like hash(event_id, email, nonce)
 * bound to a random nonce so the same user+event never collides, then sealed
 * as `LP2-<userhash>-<eventhash>-<nonce>`. Unguessable (192-bit entropy),
 * unique per pairing, and verifiable by exact-match lookup at the door.
 */
export function mintPairingToken(eventId: number, email: string): string {
  const clean = (email || "guest").trim().toLowerCase() || "guest";
  const nonce = (() => {
    try {
      const b = new Uint8Array(24);
      crypto.getRandomValues(b);
      return Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");
    } catch {
      return Date.now().toString(36) + Math.random().toString(36).slice(2, 14) + Math.random().toString(36).slice(2, 14);
    }
  })();
  // FNV-1a 32-bit binding hash over user+event — deterministic per pairing.
  let h1 = 0x811c9dc5;
  let h2 = 0x811c9dc5 ^ 0x9e3779b9;
  const src = `${clean}::${eventId}::${nonce}`;
  for (let i = 0; i < src.length; i++) {
    const c = src.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ (c + (i & 0xff)), 0x01000193) >>> 0;
  }
  const hex = (n: number) => n.toString(16).padStart(8, "0");
  return `LP2-${hex(h1)}${hex(h2)}-${nonce}`.toUpperCase();
}

function secureToken(): string {
  try {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    const hex = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return `LP-${hex}`;
  } catch {
    return (
      "LP-" +
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2, 14) +
      Math.random().toString(36).slice(2, 14)
    );
  }
}

/** Accept a raw token OR a full invite URL / QR payload and return the token. */
export function extractToken(input: string): string {
  const t = (input || "").trim();
  if (!t) return "";
  // Full URL like https://host/invite/LP-abc123
  const m = t.match(/\/invite\/([^\s?#/]+)/i);
  if (m) return decodeURIComponent(m[1].trim());
  // Bare token possibly with query string
  const cut = t.split(/[?#\s]/)[0];
  const slash = cut.lastIndexOf("/");
  return slash >= 0 ? cut.slice(slash + 1).trim() : cut.trim();
}

function nextId(rows: { id: number }[]): number {
  return rows.length ? Math.max(...rows.map((r) => r.id)) + 1 : 1;
}

function eventCounts(eventId: number) {
  const list = invitations.filter((i) => i.event_id === eventId);
  return {
    guest_count: list.length,
    checked_in_count: list.filter((i) => i.status === "checked_in").length,
    accepted_count: list.filter((i) => i.status === "accepted").length,
    declined_count: list.filter((i) => i.status === "declined").length,
  };
}

function withCounts(e: EventRecord): EventRecord {
  return { ...e, ...eventCounts(e.id) };
}

function globalStats(): HostStats {
  const checked = invitations.filter((i) => i.status === "checked_in").length;
  const accepted = invitations.filter((i) => i.status === "accepted").length;
  const declined = invitations.filter((i) => i.status === "declined").length;
  const pending = invitations.filter((i) => i.status === "pending").length;
  const sent = invitations.filter((i) => i.status === "sent").length;
  const plus = invitations.reduce((a, i) => a + (i.plus_ones || 0), 0);
  const publishedUpcoming = events.filter((e) => {
    try {
      return e.status === "published" && new Date(e.starts_at).getTime() > Date.now();
    } catch {
      return false;
    }
  }).length;
  return {
    ...mockStats,
    guest_count: invitations.length,
    checked_in_count: checked,
    accepted_count: accepted,
    declined_count: declined,
    pending_count: pending,
    sent_count: sent,
    plus_ones: plus,
    event_count: events.length,
    active_events: publishedUpcoming,
  };
}

// Small built-in directory so "Directory" tab works out of the box.
const DIRECTORY: Profile[] = [
  { id: 101, user_id: "dir-101", email: "clara@halcyon.quartet", display_name: "Clara Voss", username: "claravoss" },
  { id: 102, user_id: "dir-102", email: "owen.blake@wire.press", display_name: "Owen Blake", username: "owenblake" },
  { id: 103, user_id: "dir-103", email: "kenji.sato@folio.jp", display_name: "Kenji Sato", username: "kenjisato" },
  { id: 104, user_id: "dir-104", email: "amara.okafor@example.com", display_name: "Amara Okafor", username: "amarao" },
  { id: 105, user_id: "dir-105", email: "luis.ferrer@example.com", display_name: "Luis Ferrer", username: "luisferrer" },
  { id: 106, user_id: "dir-106", email: "priya.nair@example.com", display_name: "Priya Nair", username: "priyanair" },
  { id: 107, user_id: "dir-107", email: "sofia.marchetti@example.com", display_name: "Sofia Marchetti", username: "sofiam" },
  { id: 108, user_id: "dir-108", email: "theo.lindqvist@example.com", display_name: "Theo Lindqvist", username: "theol" },
];

function parseBulkLine(line: string): { name: string; email: string } | null {
  const t = line.trim();
  if (!t) return null;
  // Name <email>
  const angle = t.match(/^(.*?)\s*<\s*([^<>\s@]+@[^<>\s@]+\.[^<>\s@]+)\s*>$/);
  if (angle) {
    return { name: (angle[1] || "").trim() || angle[2], email: angle[2].trim() };
  }
  // Name, email
  if (t.includes(",")) {
    const parts = t.split(",").map((s) => s.trim()).filter(Boolean);
    const emailPart = parts.find((p) => /.+@.+\..+/.test(p)) || "";
    const namePart = parts.find((p) => p !== emailPart) || emailPart.split("@")[0] || t;
    if (emailPart) return { name: namePart, email: emailPart };
    return { name: t, email: "" };
  }
  // Bare email
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) {
    const name = t.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return { name, email: t };
  }
  // Bare name
  return { name: t, email: "" };
}

/** Instantaneous, secure QR authentication for the venue door. */
function scanToken(eventId: number, rawToken: string): ScanResponse {
  const token = extractToken(rawToken);
  const event = events.find((e) => e.id === eventId);
  if (!event) throw new Error("Event not found");
  const capacity = event.capacity;
  const checkedNow = () =>
    invitations.filter((i) => i.event_id === eventId && i.status === "checked_in").length;

  const pushLog = (result: AttendanceLog["result"], guest: string, invId: number | null) => {
    logs.push({
      id: nextId(logs),
      invitation_id: invId,
      event_id: eventId,
      result,
      guest_name: guest,
      scanned_by: "door",
      created_at: new Date().toISOString(),
      event_title: event.title,
    });
    persist();
  };

  if (!token) {
    pushLog("invalid", "Unknown seal", null);
    return {
      result: "invalid",
      guest_name: "",
      plus_ones: 0,
      status: null,
      checked_in_at: null,
      message: "Access Denied — Fraudulent or unassigned ticket.",
      event_title: event.title,
      checked_in_count: checkedNow(),
      capacity,
    };
  }

  const inv = invitations.find((i) => i.qr_token === token);

  if (!inv || inv.event_id !== eventId) {
    pushLog("invalid", "Unknown seal", null);
    return {
      result: "invalid",
      guest_name: "",
      plus_ones: 0,
      status: null,
      checked_in_at: null,
      message: "Access Denied — Fraudulent or unassigned ticket.",
      event_title: event.title,
      checked_in_count: checkedNow(),
      capacity,
    };
  }

  if (event.status === "cancelled") {
    pushLog("cancelled", inv.guest_name, inv.id);
    return {
      result: "cancelled",
      guest_name: inv.guest_name,
      plus_ones: inv.plus_ones,
      status: inv.status,
      checked_in_at: inv.checked_in_at,
      message: "This evening has been cancelled. No admissions.",
      event_title: event.title,
      checked_in_count: checkedNow(),
      capacity,
    };
  }

  if (inv.status === "checked_in") {
    pushLog("duplicate", inv.guest_name, inv.id);
    const when = inv.checked_in_at
      ? new Date(inv.checked_in_at).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
      : "earlier";
    return {
      result: "duplicate",
      guest_name: inv.guest_name,
      plus_ones: inv.plus_ones,
      status: inv.status,
      checked_in_at: inv.checked_in_at,
      message: `Warning — Ticket already scanned at ${when}.`,
      event_title: event.title,
      checked_in_count: checkedNow(),
      capacity,
    };
  }

  if (inv.status === "declined") {
    pushLog("declined", inv.guest_name, inv.id);
    return {
      result: "declined",
      guest_name: inv.guest_name,
      plus_ones: inv.plus_ones,
      status: inv.status,
      checked_in_at: null,
      message: `${inv.guest_name} declined this invitation. Refer to the host.`,
      event_title: event.title,
      checked_in_count: checkedNow(),
      capacity,
    };
  }

  // pending / sent / accepted → admit instantly
  inv.status = "checked_in";
  inv.checked_in_at = new Date().toISOString();
  pushLog("success", inv.guest_name, inv.id);

  return {
    result: "success",
    guest_name: inv.guest_name,
    plus_ones: inv.plus_ones,
    status: inv.status,
    checked_in_at: inv.checked_in_at,
    message: `Access Granted — Welcome ${inv.guest_name}.`,
    event_title: event.title,
    checked_in_count: checkedNow(),
    capacity,
  };
}

// ---------------------------------------------------------------------------
// Mock API router — mirrors the original repo's /api/* surface, fully local.
// ---------------------------------------------------------------------------

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  await new Promise((resolve) => setTimeout(resolve, 90));

  const url = new URL(path, "http://localhost");
  const pathname = url.pathname;
  const method = (options.method || "GET").toUpperCase();
  const body = options.body ? JSON.parse(options.body as string) : {};

  // ---- GET /api/events (all, with live counts) ----
  if (method === "GET" && pathname === "/api/events" && !url.searchParams.has("id")) {
    return events.map(withCounts) as T;
  }

  // ---- GET /api/events?id=X ----
  if (method === "GET" && pathname === "/api/events" && url.searchParams.has("id")) {
    const id = parseInt(url.searchParams.get("id") || "0", 10);
    const event = events.find((e) => e.id === id);
    if (!event) throw new Error("Event not found");
    return withCounts(event) as T;
  }

  // ---- GET /api/invitations?event_id=X  OR  ?email=Y (attendee timeline) ----
  if (method === "GET" && pathname === "/api/invitations") {
    if (url.searchParams.has("email")) {
      const email = (url.searchParams.get("email") || "").trim().toLowerCase();
      const mine = invitations.filter(
        (i) => (i.guest_email || "").toLowerCase() === email,
      );
      const eventIds = [...new Set(mine.map((i) => i.event_id))];
      return {
        invitations: mine,
        events: events.filter((e) => eventIds.includes(e.id)).map(withCounts),
      } as T;
    }
    const eventId = parseInt(url.searchParams.get("event_id") || "0", 10);
    return invitations.filter((i) => i.event_id === eventId) as T;
  }

  // ---- GET /api/attendance (global, no params) ----
  if (method === "GET" && pathname === "/api/attendance" && !url.searchParams.has("event_id")) {
    return { logs: [...logs].reverse(), stats: globalStats() } as T;
  }

  // ---- GET /api/attendance?event_id=X ----
  if (method === "GET" && pathname === "/api/attendance" && url.searchParams.has("event_id")) {
    const eventId = parseInt(url.searchParams.get("event_id") || "0", 10);
    const event = events.find((e) => e.id === eventId);
    const eventInvites = invitations.filter((i) => i.event_id === eventId);
    const eventLogs = logs.filter((l) => l.event_id === eventId).reverse();
    const plus = eventInvites.reduce((a, i) => a + (i.plus_ones || 0), 0);
    const stats: HostStats = {
      ...mockStats,
      guest_count: eventInvites.length,
      checked_in_count: eventInvites.filter((i) => i.status === "checked_in").length,
      accepted_count: eventInvites.filter((i) => i.status === "accepted").length,
      declined_count: eventInvites.filter((i) => i.status === "declined").length,
      pending_count: eventInvites.filter((i) => i.status === "pending").length,
      sent_count: eventInvites.filter((i) => i.status === "sent").length,
      plus_ones: plus,
    };
    return { event: event ? withCounts(event) : undefined, logs: eventLogs, invitations: eventInvites, stats } as T;
  }

  // ---- GET /api/invite?token=X (public guest page) ----
  if (method === "GET" && pathname === "/api/invite") {
    const raw = url.searchParams.get("token") || "";
    const token = extractToken(raw);
    const inv = invitations.find((i) => i.qr_token === token);
    if (!inv) throw new Error("Invitation not found");
    const event = events.find((e) => e.id === inv.event_id);
    if (!event) throw new Error("Event not found");
    return { invitation: inv, event: withCounts(event) } as T;
  }

  // ---- GET /api/profiles?q=&limit= (directory search) ----
  if (method === "GET" && pathname === "/api/profiles") {
    const q = (url.searchParams.get("q") || "").trim().toLowerCase();
    const limit = parseInt(url.searchParams.get("limit") || "20", 10) || 20;
    // Merge built-in directory with real guests seen so far (as profiles)
    const guestProfiles: Profile[] = invitations
      .filter((i) => i.guest_email)
      .map((i, n) => ({
        id: 1000 + i.id,
        user_id: `guest-${i.id}`,
        email: i.guest_email,
        display_name: i.guest_name || i.guest_email,
        username: (i.guest_email.split("@")[0] || `guest${n}`).toLowerCase(),
      }));
    const all = [...DIRECTORY, ...guestProfiles];
    const seen = new Set<string>();
    const deduped = all.filter((p) => {
      const k = (p.email || "").toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    const rows = q
      ? deduped.filter(
          (p) =>
            p.display_name.toLowerCase().includes(q) ||
            p.username.toLowerCase().includes(q) ||
            p.email.toLowerCase().includes(q),
        )
      : deduped;
    return rows.slice(0, limit) as T;
  }

  // ---- POST /api/events ----
  if (method === "POST" && pathname === "/api/events") {
    const newEvent: EventRecord = {
      id: nextId(events),
      user_id: "local-user-123",
      created_at: new Date().toISOString(),
      guest_count: 0,
      checked_in_count: 0,
      accepted_count: 0,
      declined_count: 0,
      ...body,
    };
    events.push(newEvent);
    persist();
    return withCounts(newEvent) as T;
  }

  // ---- PUT /api/events ----
  if (method === "PUT" && pathname === "/api/events") {
    const index = events.findIndex((e) => e.id === body.id);
    if (index === -1) throw new Error("Event not found");
    events[index] = { ...events[index], ...body };
    persist();
    return withCounts(events[index]) as T;
  }

  // ---- DELETE /api/events (query ?id= or body {id}) ----
  if (method === "DELETE" && pathname === "/api/events") {
    const id = body?.id ?? parseInt(url.searchParams.get("id") || "0", 10);
    events = events.filter((e) => e.id !== id);
    invitations = invitations.filter((i) => i.event_id !== id);
    logs = logs.filter((l) => l.event_id !== id);
    persist();
    return { success: true } as T;
  }

  // ---- POST /api/upload (cover image → data URL, works fully static) ----
  if (method === "POST" && pathname === "/api/upload") {
    const { fileBase64, contentType } = body as {
      fileName?: string;
      fileBase64?: string;
      contentType?: string;
    };
    if (!fileBase64) throw new Error("No file data");
    return { url: `data:${contentType || "image/jpeg"};base64,${fileBase64}` } as T;
  }

  // ---- POST /api/invitations ----
  if (method === "POST" && pathname === "/api/invitations") {
    const newInvite: Invitation = {
      id: nextId(invitations),
      qr_token: secureToken(),
      status: "pending",
      checked_in_at: null,
      created_at: new Date().toISOString(),
      ...body,
    };
    invitations.push(newInvite);
    persist();
    return newInvite as T;
  }

  // ---- PUT /api/invitations ----
  if (method === "PUT" && pathname === "/api/invitations") {
    const index = invitations.findIndex((i) => i.id === body.id);
    if (index === -1) throw new Error("Invitation not found");
    invitations[index] = { ...invitations[index], ...body };
    persist();
    return invitations[index] as T;
  }

  // ---- DELETE /api/invitations (body {id}) ----
  if (method === "DELETE" && pathname === "/api/invitations") {
    const id = body?.id ?? parseInt(url.searchParams.get("id") || "0", 10);
    invitations = invitations.filter((i) => i.id !== id);
    persist();
    return { success: true } as T;
  }

  // ---- POST /api/dispatch (invitation engine: directory + magic + bulk) ----
  if (method === "POST" && pathname === "/api/dispatch") {
    const {
      event_id,
      guests,
      bulk_text,
      invitation_ids,
      origin,
      mark_sent,
    } = body as {
      event_id: number;
      guests?: Partial<Invitation>[];
      bulk_text?: string;
      invitation_ids?: number[];
      origin?: string;
      mark_sent?: boolean;
    };
    const event = events.find((e) => e.id === event_id);
    if (!event) throw new Error("Event not found");
    const base = (origin || (typeof window !== "undefined" ? window.location.origin : "")).replace(/\/$/, "");
    const issued: DispatchedInvite[] = [];
    const taken = new Set(
      invitations
        .filter((i) => i.event_id === event_id)
        .map((i) => (i.guest_email || "").toLowerCase())
        .filter(Boolean),
    );

    const makeInvite = (g: Partial<Invitation>): DispatchedInvite => {
      const token = secureToken();
      const inv: Invitation = {
        id: nextId(invitations),
        event_id,
        guest_name: (g.guest_name || "Guest").trim() || "Guest",
        guest_email: (g.guest_email || "").trim(),
        guest_phone: (g.guest_phone || "").trim(),
        plus_ones: Number(g.plus_ones) || 0,
        status: (g.status as Invitation["status"]) || (mark_sent ? "sent" : "pending"),
        qr_token: token,
        note: (g.note || "").trim(),
        checked_in_at: null,
        created_at: new Date().toISOString(),
      };
      invitations.push(inv);
      if (inv.guest_email) taken.add(inv.guest_email.toLowerCase());
      return { ...inv, magic_link: `${base}/invite/${token}` };
    };

    const remaining = () => Math.max(0, event.capacity - invitations.filter((i) => i.event_id === event_id).length);

    // Resend existing pending invitations
    if (Array.isArray(invitation_ids) && invitation_ids.length) {
      for (const gid of invitation_ids) {
        const inv = invitations.find((i) => i.id === gid && i.event_id === event_id);
        if (!inv) continue;
        if (mark_sent !== false && inv.status === "pending") inv.status = "sent";
        issued.push({ ...inv, magic_link: `${base}/invite/${inv.qr_token}` });
      }
      persist();
      return { invitations: issued } as T;
    }

    // Bulk paste
    if (bulk_text && bulk_text.trim()) {
      const lines = bulk_text.split("\n").map((l) => l.trim()).filter(Boolean);
      if (!lines.length) throw new Error("Paste at least one name or email.");
      if (lines.length > remaining()) {
        throw new Error(`Only ${remaining()} of ${event.capacity} seats remain. Remove ${lines.length - remaining()} line(s).`);
      }
      for (const line of lines) {
        const parsed = parseBulkLine(line);
        if (!parsed) continue;
        if (parsed.email && taken.has(parsed.email.toLowerCase())) continue; // skip dupes
        issued.push(makeInvite({ guest_name: parsed.name, guest_email: parsed.email, note: "Bulk send", status: "sent" }));
      }
      persist();
      if (!issued.length) throw new Error("Every address on that list is already invited.");
      return { invitations: issued } as T;
    }

    // Explicit guest objects (directory + magic link)
    if (Array.isArray(guests) && guests.length) {
      const fresh = guests.filter((g) => {
        const em = (g.guest_email || "").toLowerCase().trim();
        return !em || !taken.has(em);
      });
      if (!fresh.length) throw new Error("Everyone selected is already on the list.");
      if (fresh.length > remaining()) {
        throw new Error(`Only ${remaining()} of ${event.capacity} seats remain.`);
      }
      for (const g of fresh) {
        if (!((g.guest_name || "").trim() || (g.guest_email || "").trim())) continue;
        issued.push(makeInvite(g));
      }
      persist();
      return { invitations: issued } as T;
    }

    throw new Error("Nothing to dispatch.");
  }

  // ---- POST /api/scan (the door: instantaneous QR authentication) ----
  // Verifies: token authentic? assigned to this event? already scanned?
  if (method === "POST" && pathname === "/api/scan") {
    const { event_id, token } = body as { event_id: number; token: string };
    return scanToken(Number(event_id), String(token || "")) as T;
  }

  // ---- POST /api/scan/batch (offline fallback: flush queued check-ins) ----
  // Replays payloads cached in IndexedDB while the door was offline. Each
  // item resolves independently; already-checked-in seals report `duplicate`.
  if (method === "POST" && pathname === "/api/scan/batch") {
    const { event_id, tokens } = body as { event_id: number; tokens: string[] };
    const list = Array.isArray(tokens) ? tokens.slice(0, 100) : [];
    const results = list.map((t) => {
      try {
        return scanToken(Number(event_id), String(t || ""));
      } catch (err: unknown) {
        return {
          result: "invalid" as const,
          guest_name: "",
          plus_ones: 0,
          status: null,
          checked_in_at: null,
          message: err instanceof Error ? err.message : "Scan failed",
        };
      }
    });
    const ok = results.filter((r) => r.result === "success" || r.result === "override").length;
    return { results, synced: ok, total: results.length } as T;
  }

  // ---- POST /api/attendance (manual admit / undo override) ----
  if (method === "POST" && pathname === "/api/attendance") {
    const invitationId = body.invitation_id as number;
    const action = body.action as "check_in" | "undo";
    const invitation = invitations.find((i) => i.id === invitationId);
    if (!invitation) throw new Error("Invitation not found");

    if (action === "check_in") {
      if (invitation.status === "checked_in") throw new Error("Guest is already checked in.");
      invitation.status = "checked_in";
      invitation.checked_in_at = new Date().toISOString();
      logs.push({
        id: nextId(logs),
        invitation_id: invitationId,
        event_id: invitation.event_id,
        result: "override",
        guest_name: invitation.guest_name,
        scanned_by: "host",
        created_at: new Date().toISOString(),
      });
    } else if (action === "undo") {
      invitation.status = "accepted";
      invitation.checked_in_at = null;
      logs.push({
        id: nextId(logs),
        invitation_id: invitationId,
        event_id: invitation.event_id,
        result: "undo",
        guest_name: invitation.guest_name,
        scanned_by: "host",
        created_at: new Date().toISOString(),
      });
    }
    persist();
    return { success: true } as T;
  }

  // ---- PUT /api/invite (guest RSVP on public page) ----
  // On "accept", the engine mints a fresh cryptographic User–Event pairing
  // token (token rotation), so the QR rendered after acceptance is a new,
  // single-use seal unique to this guest + evening.
  if (method === "PUT" && pathname === "/api/invite") {
    const token = extractToken(String(body.token || ""));
    const status = body.status as Invitation["status"];
    const inv = invitations.find((i) => i.qr_token === token);
    if (!inv) throw new Error("Invitation not found");
    if (status === "accepted" && inv.status !== "accepted" && inv.status !== "checked_in") {
      inv.qr_token = mintPairingToken(inv.event_id, inv.guest_email || inv.guest_name);
    }
    inv.status = status;
    persist();
    const event = events.find((e) => e.id === inv.event_id);
    if (!event) throw new Error("Event not found");
    return { invitation: inv, event: withCounts(event) } as T;
  }

  // ---- POST /api/pairing-token (attendee registration → fresh seal) ----
  // Called when an attendee completes registration / claims a ticket: mints
  // (or re-mints) the cryptographic token for that User–Event pairing.
  if (method === "POST" && pathname === "/api/pairing-token") {
    const { event_id, email, guest_name } = body as {
      event_id: number;
      email: string;
      guest_name?: string;
    };
    const clean = String(email || "").trim().toLowerCase();
    if (!clean) throw new Error("An email is required to seal a ticket.");
    const eid = Number(event_id);
    const event = events.find((e) => e.id === eid);
    if (!event) throw new Error("Event not found");
    let inv = invitations.find(
      (i) => i.event_id === eid && (i.guest_email || "").toLowerCase() === clean,
    );
    if (inv) {
      inv.qr_token = mintPairingToken(eid, clean);
      if (inv.status === "pending" || inv.status === "sent") inv.status = "accepted";
    } else {
      inv = {
        id: nextId(invitations),
        event_id: eid,
        guest_name: (guest_name || "").trim() || clean.split("@")[0],
        guest_email: clean,
        guest_phone: "",
        plus_ones: 0,
        status: "accepted",
        qr_token: mintPairingToken(eid, clean),
        note: "Attendee registration",
        checked_in_at: null,
        created_at: new Date().toISOString(),
      };
      invitations.push(inv);
    }
    persist();
    return { invitation: inv, event: withCounts(event) } as T;
  }

  throw new Error(`Endpoint not found: ${method} ${path}`);
}
