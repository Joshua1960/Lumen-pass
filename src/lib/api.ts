import supabase from "./supabase";

export async function readApiResponse(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      "The API server returned a non-JSON response. Run `npm run dev:fullstack` locally, or configure your host to serve the /api handlers.",
    );
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function req<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers = await authHeaders();
  const res = await fetch(path, {
    ...opts,
    headers: { ...headers, ...(opts.headers || {}) },
  });
  const data = await readApiResponse(res);
  if (!res.ok) {
    const message =
      data &&
      typeof data === "object" &&
      "error" in data &&
      typeof data.error === "string"
        ? data.error
        : `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data as T;
}

export const api = {
  getProfile: () => req("/api/profile"),
  updateProfile: (body: any) =>
    req("/api/profile", { method: "PUT", body: JSON.stringify(body) }),

  listEvents: () => req("/api/events"),
  getEvent: (id: string) => req(`/api/events?id=${encodeURIComponent(id)}`),
  createEvent: (body: any) =>
    req("/api/events", { method: "POST", body: JSON.stringify(body) }),
  updateEvent: (id: string, body: any) =>
    req("/api/events", {
      method: "PUT",
      body: JSON.stringify({ id, ...body }),
    }),
  deleteEvent: (id: string) =>
    req("/api/events", { method: "DELETE", body: JSON.stringify({ id }) }),

  listInvitations: (eventId: string) =>
    req(`/api/invitations?event_id=${encodeURIComponent(eventId)}`),
  createInvitation: (body: any) =>
    req("/api/invitations", { method: "POST", body: JSON.stringify(body) }),
  deleteInvitation: (id: string | number) =>
    req("/api/invitations", { method: "DELETE", body: JSON.stringify({ id }) }),

  lookupInvite: (token: string) =>
    req(`/api/invite-lookup?token=${encodeURIComponent(token)}`),
  acceptInvite: (token: string) =>
    req("/api/invite-lookup", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),
  declineInvite: (token: string) =>
    req("/api/invite-lookup", {
      method: "DELETE",
      body: JSON.stringify({ token }),
    }),

  myTickets: () => req("/api/tickets?scope=mine"),
  eventTickets: (eventId: string) =>
    req(`/api/tickets?event_id=${encodeURIComponent(eventId)}`),
  myInvitations: () => req("/api/invitations?scope=mine"),

  scan: (eventId: string, raw: string) =>
    req("/api/scan", {
      method: "POST",
      body: JSON.stringify({ event_id: eventId, raw }),
    }),
  scanLogs: (eventId: string, limit = 50) =>
    req(`/api/scan?event_id=${encodeURIComponent(eventId)}&limit=${limit}`),

  attendance: (eventId: string) =>
    req(`/api/attendance?event_id=${encodeURIComponent(eventId)}`),

  admin: () => req("/api/admin"),
};

export const apiFetch = req;
