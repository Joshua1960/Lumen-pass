import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Check, Copy, Search, X } from 'lucide-react';
import { apiFetch } from '../lib/api';
import type { DispatchedInvite, EventRecord, Invitation, Profile } from '../lib/types';

type Tab = 'directory' | 'magic' | 'bulk';

export default function InviteEngine({
  event,
  invites,
  onClose,
  onChanged,
}: {
  event: EventRecord;
  invites: Invitation[];
  onClose: () => void;
  onChanged: () => Promise<void> | void;
}) {
  const [tab, setTab] = useState<Tab>('directory');
  const [q, setQ] = useState('');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<Profile[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [plusOnes, setPlusOnes] = useState(0);
  const [note, setNote] = useState('');
  const [bulk, setBulk] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<DispatchedInvite[] | null>(null);
  const [copied, setCopied] = useState(false);

  const taken = useMemo(
    () => new Set(invites.map((i) => (i.guest_email || '').toLowerCase()).filter(Boolean)),
    [invites]
  );
  const remaining = Math.max(0, event.capacity - invites.length);

  useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const rows = await apiFetch<Profile[]>(`/api/profiles?q=${encodeURIComponent(q)}&limit=20`);
        if (alive) setProfiles(Array.isArray(rows) ? rows : []);
      } catch {
        if (alive) setProfiles([]);
      } finally {
        if (alive) setSearching(false);
      }
    }, 180);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q]);

  const toggle = (p: Profile) => {
    if (taken.has((p.email || '').toLowerCase())) return;
    setPicked((cur) => (cur.some((x) => x.id === p.id) ? cur.filter((x) => x.id !== p.id) : [...cur, p]));
  };

  const dispatch = async (guests?: Partial<Invitation>[], bulkText?: string, ids?: number[]) => {
    setBusy(true);
    setError('');
    try {
      const data = await apiFetch<{ invitations: DispatchedInvite[] }>('/api/dispatch', {
        method: 'POST',
        body: JSON.stringify({
          event_id: event.id,
          guests,
          bulk_text: bulkText,
          invitation_ids: ids,
          origin: window.location.origin,
          mark_sent: true,
        }),
      });
      setReceipt(data.invitations || []);
      await onChanged();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to dispatch invitations');
    } finally {
      setBusy(false);
    }
  };

  const inviteDirectory = async (e: FormEvent) => {
    e.preventDefault();
    if (!picked.length) {
      setError('Select at least one registered guest.');
      return;
    }
    await dispatch(
      picked.map((p) => ({
        guest_name: p.display_name || p.username || p.email,
        guest_email: p.email,
        note: `Directory · @${p.username}`,
        status: 'sent',
      }))
    );
    setPicked([]);
  };

  const inviteMagic = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('A guest name is required.');
      return;
    }
    await dispatch([
      {
        guest_name: name.trim(),
        guest_email: email.trim(),
        guest_phone: phone.trim(),
        plus_ones: plusOnes,
        note: note.trim() || 'Magic link',
        status: 'sent',
      },
    ]);
    setName('');
    setEmail('');
    setPhone('');
    setPlusOnes(0);
    setNote('');
  };

  const inviteBulk = async (e: FormEvent) => {
    e.preventDefault();
    if (!bulk.trim()) {
      setError('Paste at least one name or email.');
      return;
    }
    await dispatch(undefined, bulk);
    setBulk('');
  };

  const copyAll = async () => {
    if (!receipt?.length) return;
    const text = receipt.map((r) => `${r.guest_name}\t${r.guest_email || ''}\t${r.magic_link}`).join('\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const mailto = () => {
    if (!receipt?.length) return;
    const first = receipt.find((r) => r.guest_email) || receipt[0];
    const subject = encodeURIComponent(`Your invitation to ${event.title}`);
    const body = encodeURIComponent(
      `You are invited to ${event.title}.\n\nOpen your private seal:\n${first.magic_link}\n\nPresent the QR at the door.`
    );
    window.open(`mailto:${first.guest_email || ''}?subject=${subject}&body=${body}`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-2xl bg-card border border-line p-6 max-h-[92vh] overflow-auto">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-gold">Invitation engine</p>
            <h3 className="font-display text-2xl">Seal and send</h3>
            <p className="text-xs text-muted mt-1">
              {remaining} of {event.capacity} seats still open · {invites.length} already listed
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-muted hover:text-cream">
            <X size={18} />
          </button>
        </div>

        {!receipt && (
          <div className="flex gap-1.5 mb-5">
            {([
              ['directory', 'Directory'],
              ['magic', 'Magic link'],
              ['bulk', 'Bulk send'],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                onClick={() => {
                  setTab(id);
                  setError('');
                }}
                className={`px-3 py-1.5 rounded-full text-[11px] uppercase tracking-wider border ${
                  tab === id ? 'border-gold/50 text-gold-2 bg-gold/10' : 'border-line text-muted'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {error && <p className="text-sm text-rose mb-3">{error}</p>}

        {receipt ? (
          <div>
            <p className="text-sm text-sage mb-3">{receipt.length} unique magic link{receipt.length === 1 ? '' : 's'} issued.</p>
            <div className="space-y-2 max-h-64 overflow-auto mb-4">
              {receipt.map((r) => (
                <div key={r.id} className="rounded-xl border border-line px-3 py-2">
                  <p className="text-sm text-cream">{r.guest_name}</p>
                  <p className="text-[11px] text-muted truncate">{r.guest_email || 'No email'}</p>
                  <p className="text-[11px] text-gold-2 break-all mt-1">{r.magic_link}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={copyAll} className="px-4 py-2 rounded-full bg-gold text-ink text-sm inline-flex items-center gap-1.5">
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy all links'}
              </button>
              <button onClick={mailto} className="px-4 py-2 rounded-full border border-line text-sm text-cream">
                Open email draft
              </button>
              <button onClick={() => setReceipt(null)} className="px-4 py-2 rounded-full border border-line text-sm text-muted">
                Send more
              </button>
            </div>
          </div>
        ) : tab === 'directory' ? (
          <form onSubmit={inviteDirectory}>
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-3 text-muted" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search registered guests by name, @username, or email"
                className="w-full bg-surface border border-line rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none focus:border-gold/50"
              />
            </div>
            <div className="rounded-xl border border-line max-h-56 overflow-auto mb-3">
              {searching && <p className="text-xs text-muted px-3 py-3">Searching the book…</p>}
              {!searching && !profiles.length && <p className="text-xs text-muted px-3 py-3">No registered guests match.</p>}
              {profiles.map((p) => {
                const already = taken.has((p.email || '').toLowerCase());
                const on = picked.some((x) => x.id === p.id);
                return (
                  <button
                    type="button"
                    key={p.id}
                    disabled={already}
                    onClick={() => toggle(p)}
                    className={`w-full text-left px-3 py-2.5 border-t border-line/70 first:border-t-0 ${
                      already ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white/3'
                    } ${on ? 'bg-gold/10' : ''}`}
                  >
                    <p className="text-sm text-cream">{p.display_name}</p>
                    <p className="text-[11px] text-muted">
                      @{p.username} · {p.email}
                      {already ? ' · already invited' : ''}
                    </p>
                  </button>
                );
              })}
            </div>
            {picked.length > 0 && (
              <p className="text-xs text-gold-2 mb-3">{picked.length} selected from the directory</p>
            )}
            <button type="submit" disabled={busy} className="w-full py-2.5 rounded-full bg-gold text-ink text-sm disabled:opacity-60">
              {busy ? 'Sealing…' : `Invite ${picked.length || ''}`.trim()}
            </button>
          </form>
        ) : tab === 'magic' ? (
          <form onSubmit={inviteMagic} className="space-y-3">
            <p className="text-xs text-muted">
              Issue a single-use seal for someone outside the platform. They never need an account.
            </p>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className="w-full bg-surface border border-line rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gold/50"
            />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email (optional, for the draft)"
              type="email"
              className="w-full bg-surface border border-line rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gold/50"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone"
                className="w-full bg-surface border border-line rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gold/50"
              />
              <input
                type="number"
                min={0}
                value={plusOnes}
                onChange={(e) => setPlusOnes(Number(e.target.value))}
                placeholder="Plus ones"
                className="w-full bg-surface border border-line rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gold/50"
              />
            </div>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Private note"
              className="w-full bg-surface border border-line rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gold/50"
            />
            <button type="submit" disabled={busy} className="w-full py-2.5 rounded-full bg-gold text-ink text-sm disabled:opacity-60">
              {busy ? 'Issuing…' : 'Generate magic link'}
            </button>
          </form>
        ) : (
          <form onSubmit={inviteBulk} className="space-y-3">
            <p className="text-xs text-muted">
              One guest per line. Accepted: <span className="text-cream/70">Name, email</span> ·{' '}
              <span className="text-cream/70">Name &lt;email&gt;</span> · or a bare email.
            </p>
            <textarea
              value={bulk}
              onChange={(e) => setBulk(e.target.value)}
              rows={8}
              placeholder={'Clara Voss, clara@halcyon.quartet\nowen.blake@wire.press\nKenji Sato <kenji.sato@folio.jp>'}
              className="w-full bg-surface border border-line rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gold/50 font-mono"
            />
            <button type="submit" disabled={busy} className="w-full py-2.5 rounded-full bg-gold text-ink text-sm disabled:opacity-60">
              {busy ? 'Dispatching…' : 'Create seals and mark sent'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
