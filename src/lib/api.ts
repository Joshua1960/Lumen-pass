import type { EventRecord, Invitation } from "./types";
import {
  mockEvents,
  mockInvitations,
  mockAttendanceLogs,
  mockStats,
} from "./mockData";

// Mock data storage for development
let events = [...mockEvents];
let invitations = [...mockInvitations];
// eslint-disable-next-line prefer-const
let logs = [...mockAttendanceLogs];

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Parse the path to determine what data to return
  const url = new URL(path, "http://localhost");
  const method = options.method || "GET";

  // GET /api/events - Get all events
  if (method === "GET" && path === "/api/events") {
    return events as T;
  }

  // GET /api/events?id=X - Get specific event
  if (method === "GET" && url.searchParams.has("id")) {
    const id = parseInt(url.searchParams.get("id") || "0");
    const event = events.find((e) => e.id === id);
    if (!event) throw new Error("Event not found");
    return event as T;
  }

  // GET /api/invitations?event_id=X - Get invitations for event
  if (method === "GET" && url.searchParams.has("event_id")) {
    const eventId = parseInt(url.searchParams.get("event_id") || "0");
    return invitations.filter((i) => i.event_id === eventId) as T;
  }

  // GET /api/attendance?event_id=X - Get attendance logs and stats for event
  if (method === "GET" && path.startsWith("/api/attendance")) {
    const eventId = url.searchParams.get("event_id")
      ? parseInt(url.searchParams.get("event_id") || "0")
      : 1;
    const eventLogs = logs.filter((l) => l.event_id === eventId);
    const eventInvitations = invitations.filter((i) => i.event_id === eventId);
    const event = events.find((e) => e.id === eventId);

    return {
      event,
      logs: eventLogs,
      invitations: eventInvitations,
      stats: {
        ...mockStats,
        guest_count: eventInvitations.length,
        checked_in_count: eventInvitations.filter(
          (i) => i.status === "checked_in",
        ).length,
      },
    } as T;
  }

  // GET /api/attendance (no params) - Get all attendance data
  if (method === "GET" && path === "/api/attendance") {
    const stats = {
      ...mockStats,
      guest_count: invitations.length,
      checked_in_count: invitations.filter((i) => i.status === "checked_in")
        .length,
    };
    return {
      logs,
      stats,
    } as T;
  }

  // GET /api/invite?token=X - Get public invite
  if (method === "GET" && url.searchParams.has("token")) {
    const token = url.searchParams.get("token");
    // Find invitation by qr_token
    const inv = invitations.find((i) => i.qr_token === token);
    if (!inv) throw new Error("Invitation not found");
    const event = events.find((e) => e.id === inv.event_id);
    if (!event) throw new Error("Event not found");
    return { invitation: inv, event } as T;
  }

  // POST /api/events - Create new event
  if (method === "POST" && path === "/api/events") {
    const body = JSON.parse(options.body as string);
    const newEvent: EventRecord = {
      id: Math.max(...events.map((e) => e.id)) + 1,
      user_id: "local-user-123",
      created_at: new Date().toISOString(),
      guest_count: 0,
      checked_in_count: 0,
      accepted_count: 0,
      declined_count: 0,
      ...body,
    };
    events.push(newEvent);
    return newEvent as T;
  }

  // PUT /api/events - Update event
  if (method === "PUT" && path === "/api/events") {
    const body = JSON.parse(options.body as string);
    const index = events.findIndex((e) => e.id === body.id);
    if (index === -1) throw new Error("Event not found");
    events[index] = { ...events[index], ...body };
    return events[index] as T;
  }

  // DELETE /api/events?id=X - Delete event
  if (method === "DELETE" && url.searchParams.has("id")) {
    const id = parseInt(url.searchParams.get("id") || "0");
    events = events.filter((e) => e.id !== id);
    invitations = invitations.filter((i) => i.event_id !== id);
    return { success: true } as T;
  }

  // POST /api/invitations - Create invitation
  if (method === "POST" && path === "/api/invitations") {
    const body = JSON.parse(options.body as string);
    const newInvite: Invitation = {
      id: Math.max(...invitations.map((i) => i.id), 0) + 1,
      qr_token: "qr_token_" + Date.now(),
      status: "pending",
      checked_in_at: null,
      created_at: new Date().toISOString(),
      ...body,
    };
    invitations.push(newInvite);
    return newInvite as T;
  }

  // PUT /api/invitations - Update invitation (e.g., RSVP status)
  if (method === "PUT" && path === "/api/invitations") {
    const body = JSON.parse(options.body as string);
    const index = invitations.findIndex((i) => i.id === body.id);
    if (index === -1) throw new Error("Invitation not found");
    invitations[index] = { ...invitations[index], ...body };
    return invitations[index] as T;
  }

  // POST /api/attendance - Record attendance (check in/undo)
  if (method === "POST" && path === "/api/attendance") {
    const body = JSON.parse(options.body as string);
    const invitationId = body.invitation_id as number;
    const action = body.action as "check_in" | "undo";

    const invitation = invitations.find((i) => i.id === invitationId);
    if (!invitation) throw new Error("Invitation not found");

    if (action === "check_in") {
      invitation.status = "checked_in";
      invitation.checked_in_at = new Date().toISOString();
      logs.push({
        id: Math.max(...logs.map((l) => l.id), 0) + 1,
        invitation_id: invitationId,
        event_id: invitation.event_id,
        result: "success",
        guest_name: invitation.guest_name,
        scanned_by: "admin",
        created_at: new Date().toISOString(),
      });
    } else if (action === "undo") {
      invitation.status = "accepted";
      invitation.checked_in_at = null;
      logs.push({
        id: Math.max(...logs.map((l) => l.id), 0) + 1,
        invitation_id: invitationId,
        event_id: invitation.event_id,
        result: "undo",
        guest_name: invitation.guest_name,
        scanned_by: "admin",
        created_at: new Date().toISOString(),
      });
    }

    return { success: true } as T;
  }

  // PUT /api/invite - RSVP to public invite
  if (method === "PUT" && path === "/api/invite") {
    const body = JSON.parse(options.body as string);
    const token = body.token;
    const status = body.status;

    const inv = invitations.find((i) => i.qr_token === token);
    if (!inv) throw new Error("Invitation not found");

    inv.status = status;
    const event = events.find((e) => e.id === inv.event_id);
    if (!event) throw new Error("Event not found");

    return { invitation: inv, event } as T;
  }

  throw new Error(`Endpoint not found: ${method} ${path}`);
}
