import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import StatusBadge from '../components/StatusBadge';
import { api } from '../lib/api';
import { formatDate, formatTime } from '../lib/format';
import { Calendar, MapPin, ArrowRight, Mail } from 'lucide-react';

export default function MyInvitations() {
  const [invites, setInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.myInvitations();
      setInvites(data);
    } catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="min-h-screen bg-[#0c0b0a] grain">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <div className="text-[11px] uppercase tracking-[0.3em] text-[#c9a962] mb-2">Your inbox</div>
          <h1 className="font-display text-5xl text-cream">Invitations</h1>
          <p className="text-[#8a8178] mt-2">Evenings that have called for you.</p>
        </div>

        {loading && <div className="flex items-center justify-center py-24"><div className="gold-ring" /></div>}
        {err && <div className="text-sm text-[#c47865] bg-[#c47865]/10 border border-[#c47865]/30 rounded px-4 py-3 mb-6">{err}</div>}

        {!loading && invites.length === 0 && (
          <div className="relative bg-[#211d19] border border-[#332e28] rounded-xl p-14 text-center">
            <div className="corner-tl" /><div className="corner-tr" /><div className="corner-bl" /><div className="corner-br" />
            <Mail className="w-10 h-10 text-[#c9a962]/60 mx-auto mb-4" />
            <h2 className="font-display text-3xl text-cream mb-2">No invitations yet</h2>
            <p className="text-[#8a8178] text-sm">When a host sends you an invitation, it will appear here. If you have a private link, open it directly.</p>
          </div>
        )}

        <div className="space-y-4">
          {invites.map(i => (
            <div key={i.id} className="relative bg-[#211d19] border border-[#332e28] rounded-xl p-6 card-glow">
              <div className="corner-tl" /><div className="corner-tr" /><div className="corner-bl" /><div className="corner-br" />
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex-1 min-w-[240px]">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="text-[10px] uppercase tracking-[0.3em] text-[#c9a962]">Invitation</div>
                    <StatusBadge status={i.status} />
                  </div>
                  <h3 className="font-display text-2xl text-cream mb-3">{i.event?.title}</h3>
                  <div className="space-y-1.5 text-sm text-[#8a8178]">
                    <div className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5" />{formatDate(i.event?.starts_at)} · {formatTime(i.event?.starts_at)}</div>
                    <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" />{i.event?.venue}</div>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {i.status === 'pending' && (
                    <Link to={`/invite/${i.token}`} className="btn-gold px-5 py-2.5 rounded text-sm inline-flex items-center gap-2">Respond <ArrowRight className="w-3.5 h-3.5" /></Link>
                  )}
                  {i.status === 'accepted' && (
                    <Link to="/my-tickets" className="btn-ghost px-5 py-2.5 rounded text-sm inline-flex items-center gap-2">Ticket <ArrowRight className="w-3.5 h-3.5" /></Link>
                  )}
                  {i.status === 'declined' && (
                    <Link to={`/invite/${i.token}`} className="btn-ghost px-5 py-2.5 rounded text-sm inline-flex items-center gap-2">View</Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
