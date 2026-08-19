export type EventStatus = "draft" | "published" | "cancelled";
export type InviteStatus =
  | "pending"
  | "sent"
  | "accepted"
  | "declined"
  | "checked_in";
export type ScanResult =
  | "success"
  | "duplicate"
  | "invalid"
  | "declined"
  | "cancelled"
  | "override"
  | "undo";

export interface HostStats {
  guest_count: number;
  checked_in_count: number;
  accepted_count: number;
  declined_count: number;
  pending_count: number;
  sent_count: number;
  plus_ones: number;
  event_count?: number;
  active_events?: number;
}

export interface EventRecord {
  id: number;
  user_id: string;
  title: string;
  description: string;
  venue: string;
  address: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  dress_code: string;
  cover_image: string;
  status: EventStatus;
  created_at: string;
  guest_count?: number;
  checked_in_count?: number;
  accepted_count?: number;
  declined_count?: number;
}

export interface Invitation {
  id: number;
  event_id: number;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  plus_ones: number;
  status: InviteStatus;
  qr_token: string;
  note: string;
  checked_in_at: string | null;
  created_at: string;
}

export interface AttendanceLog {
  id: number;
  invitation_id: number | null;
  event_id: number;
  result: ScanResult;
  guest_name: string;
  scanned_by: string;
  created_at: string;
  event_title?: string;
}

export interface PublicInvite {
  invitation: Invitation;
  event: EventRecord;
}

export interface Profile {
  id: number;
  user_id: string;
  email: string;
  display_name: string;
  username: string;
}

export interface DispatchedInvite extends Invitation {
  magic_link: string;
}

export interface ScanResponse {
  result: ScanResult;
  guest_name: string;
  plus_ones: number;
  status: InviteStatus | null;
  checked_in_at: string | null;
  message: string;
  event_title?: string;
  checked_in_count?: number;
  capacity?: number;
}
