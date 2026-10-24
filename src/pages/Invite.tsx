import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { formatDate, formatTime } from '../lib/format';
import { Sparkles, Calendar, MapPin, Shirt, Check, X, ArrowRight } from 'lucide-react';

export default function Invite() {
  const { token } = useParams();
  const nav = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const d = await api.lookupInvite(token);
      setData(d);
      setErr('');
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Unable to load this invitation.');
    }
    finally { setLoading(false); }
  }, [token]);
  useEffect(() => { void load(); }, [load]);

  const accept = async () => {
    if (!token) return;
    if (!user) { nav(`/login?as=attendee&next=/invite/${token}`); return; }
    if (profile && profile.role !== 'attendee') { setErr('This account is a host account. Sign in as a guest to accept.'); return; }
    setBusy(true);
    try {
      await api.acceptInvite(token);
      nav('/my-tickets');
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Unable to accept this invitation.');
      setBusy(false);
    }
  };

  const decline = async () => {
    if (!token || !user) { nav(`/login?as=attendee&next=/invite/${token}`); return; }
    if (!confirm('Decline this invitation?')) return;
    setBusy(true);
    try { await api.declineInvite(token); await load(); }
    catch (error) {
      setErr(error instanceof Error ? error.message : 'Unable to decline this invitation.');
    }
    finally { setBusy(false); }
  };

  if (loading || authLoading) return <div className="min-h-screen flex items-center justify-center bg-[#0c0b0a]"><div className="gold-ring" /></div>;

  if (err && !data) return (
    <div className="min-h-screen flex flex-col bg-[#0c0b0a] grain">
      <header className="max-w-6xl w-full mx-auto px-6 py-6"><Link to="/" className="flex items-center gap-2"><span className="w-8 h-8 rounded-full border border-[#c9a962]/40 flex items-center justify-center"><Sparkles className="w-3.5 h-3.5 text-[#c9a962]" /></span><span className="font-display text-xl text-cream">Lumen</span></Link></header>
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="font-display text-4xl text-cream mb-3">Invitation unavailable</div>
          <p className="text-[#8a8178] mb-6">{err}</p>
          <Link to="/" className="btn-ghost px-6 py-3 rounded text-sm">Return home</Link>
        </div>
      </div>
    </div>
  );

  const inv = data.invitation;
  const ev = data.event;

  return (
    <div className="min-h-screen bg-[#0c0b0a] grain">
      <header className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-full border border-[#c9a962]/40 flex items-center justify-center"><Sparkles className="w-3.5 h-3.5 text-[#c9a962]" /></span>
          <span className="font-display text-xl text-cream">Lumen</span>
        </Link>
        <div className="text-xs uppercase tracking-[0.2em] text-[#8a8178]">A private invitation</div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12">
        <div className="relative bg-gradient-to-br from-[#211d19] to-[#141210] border border-[#332e28] rounded-xl p-10 md:p-14 card-glow overflow-hidden text-center">
          <div className="corner-tl" /><div className="corner-tr" /><div className="corner-bl" /><div className="corner-br" />
          <div
            className="absolute inset-0 opacity-30 pointer-events-none"
            style={{ background: 'radial-gradient(circle at 50% 0%, rgba(201,169,98,0.2), transparent 60%)' }}
          />

          <div className="relative">
            <div className="text-[11px] uppercase tracking-[0.3em] text-[#c9a962] mb-3">You are invited</div>
            <div className="font-display italic text-lg text-[#e8d5a3] mb-4">{inv.guest_name},</div>
            <h1 className="font-display text-4xl md:text-5xl gold-gradient-text mb-2 leading-tight">{ev.title}</h1>
            {ev.description && <p className="text-[#8a8178] max-w-md mx-auto mt-4 leading-relaxed">{ev.description}</p>}

            <div className="hairline w-24 mx-auto my-8" />

            <div className="space-y-3 text-sm inline-block text-left">
              <div className="flex items-center gap-3 text-cream"><Calendar className="w-4 h-4 text-[#c9a962]" /> {formatDate(ev.starts_at)} · {formatTime(ev.starts_at)}</div>
              <div className="flex items-center gap-3 text-cream"><MapPin className="w-4 h-4 text-[#c9a962]" /> {ev.venue}{ev.address ? ` · ${ev.address}` : ''}</div>
              {ev.dress_code && <div className="flex items-center gap-3 text-cream"><Shirt className="w-4 h-4 text-[#c9a962]" /> {ev.dress_code}</div>}
              {inv.plus_ones > 0 && <div className="flex items-center gap-3 text-cream"><Sparkles className="w-4 h-4 text-[#c9a962]" /> Plus {inv.plus_ones}</div>}
            </div>

            {err && <div className="mt-6 text-sm text-[#c47865] bg-[#c47865]/10 border border-[#c47865]/30 rounded px-4 py-3">{err}</div>}

            <div className="mt-10">
              {inv.status === 'accepted' ? (
                <div>
                  <div className="inline-flex items-center gap-2 text-[#7d9b7f] mb-4"><Check className="w-4 h-4" /><span className="text-sm uppercase tracking-[0.2em]">You’re on the list</span></div>
                  <div>
                    <Link to={user ? '/my-tickets' : `/login?next=/my-tickets`} className="btn-gold px-8 py-3 rounded text-sm inline-flex items-center gap-2">
                      See your ticket <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ) : inv.status === 'declined' ? (
                <div className="text-[#c47865] text-sm">You have declined this invitation.</div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button onClick={accept} disabled={busy} className="btn-gold px-8 py-3 rounded text-sm inline-flex items-center gap-2">
                    {busy ? <div className="gold-ring" style={{width:16,height:16}}/> : <><Check className="w-4 h-4"/>Accept with pleasure</>}
                  </button>
                  <button onClick={decline} disabled={busy} className="btn-ghost px-6 py-3 rounded text-sm inline-flex items-center gap-2">
                    <X className="w-4 h-4"/>Regretfully decline
                  </button>
                </div>
              )}
              {!user && inv.status === 'pending' && (
                <div className="mt-4 text-[11px] text-[#8a8178]">You’ll be asked to sign in as a guest to secure your ticket.</div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
