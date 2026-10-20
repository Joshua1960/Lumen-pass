export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  return `${formatDate(iso)} · ${formatTime(iso)}`;
}

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export const formatRelative = relativeTime;
export const formatShortDate = formatDate;

export function inviteLink(token: string | null | undefined): string {
  return token
    ? `${window.location.origin}/invite/${encodeURIComponent(token)}`
    : "";
}

export function countdown(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso).getTime();
  const now = Date.now();
  const diff = d - now;
  if (diff < 0) return "in progress";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `in ${days}d ${hours}h`;
  const minutes = Math.floor((diff % 3600000) / 60000);
  return `in ${hours}h ${minutes}m`;
}
