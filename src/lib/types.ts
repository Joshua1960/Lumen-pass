export type Role = "host" | "attendee";

export interface Profile {
  id?: string;
  user_id: string;
  email: string;
  display_name: string;
  username?: string;
  role: Role;
  created_at?: string;
}

export interface Event {
  id: string;
  host_id: string;
  title: string;
  description: string | null;
  venue: string;
  address: string | null;
  starts_at: string;
  ends_at: string | null;
  capacity: number;
  dress_code: string | null;
  cover_url: string | null;
  created_at: string;
}

export interface Invitation {
  id: string | number;
  event_id: string | number;
  token?: string;
  guest_name: string;
  guest_email: string;
  guest_phone?: string;
  plus_ones: number;
  status: "pending" | "accepted" | "declined" | "sent" | "checked_in";
  claimed_by?: string | null;
  claimed_at?: string | null;
  qr_token?: string;
  note?: string;
  checked_in_at?: string | null;
  created_at: string;
  event?: Event;
}

export interface EventRecord {
  id: string | number;
  user_id?: string;
  host_id?: string;
  title: string;
  description: string | null;
  venue: string;
  address: string | null;
  starts_at: string;
  ends_at: string | null;
  capacity: number;
  dress_code: string | null;
  cover_url?: string | null;
  cover_image: string | null;
  status?: string;
  created_at: string;
  guest_count?: number;
  checked_in_count?: number;
  accepted_count?: number;
  declined_count?: number;
}

export interface AttendanceLog {
  id: string | number;
  invitation_id: string | number | null;
  event_id: string | number;
  result:
    | "success"
    | "override"
    | "duplicate"
    | "invalid"
    | "declined"
    | "cancelled"
    | "undo";
  guest_name: string | null;
  scanned_by?: string;
  scanner_id?: string;
  event_title?: string;
  created_at: string;
}

export interface HostStats {
  guest_count: number;
  checked_in_count: number;
  accepted_count: number;
  declined_count: number;
  pending_count: number;
  sent_count: number;
  plus_ones: number;
  event_count: number;
  active_events: number;
}

export interface DispatchedInvite extends Invitation {
  magic_link: string;
}

export interface Ticket {
  id: string;
  invitation_id: string;
  event_id: string;
  attendee_id: string;
  qr_secret: string;
  checked_in_at: string | null;
  checked_in_by: string | null;
  created_at: string;
  event?: Event;
  invitation?: Invitation;
}

export interface ScanLog {
  id: number;
  event_id: string;
  ticket_id: string | null;
  result: "valid" | "duplicate" | "invalid";
  guest_name: string | null;
  scanner_id: string;
  created_at: string;
}
