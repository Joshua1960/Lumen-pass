import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import VenueMap from '../components/VenueMap';
import { apiFetch } from '../lib/api';
import type { EventRecord } from '../lib/types';

const PRESETS = [
  { src: '/covers/gala.jpg', label: 'Ballroom' },
  { src: '/covers/garden.jpg', label: 'Garden' },
  { src: '/covers/summit.jpg', label: 'Summit' },
  { src: '/covers/supper.jpg', label: 'Supper' },
  { src: '/covers/neon.jpg', label: 'Night' },
  { src: '/covers/recital.jpg', label: 'Recital' },
];

function toLocalInput(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EventForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(id);
  const [loading, setLoading] = useState(editing);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [venue, setVenue] = useState('');
  const [address, setAddress] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [capacity, setCapacity] = useState(80);
  const [dressCode, setDressCode] = useState('Black tie');
  const [cover, setCover] = useState('/covers/gala.jpg');
  const [status, setStatus] = useState('published');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const ev = await apiFetch<EventRecord>(`/api/events?id=${id}`);
        setTitle(ev.title);
        setDescription(ev.description || '');
        setVenue(ev.venue);
        setAddress(ev.address || '');
        setStartsAt(toLocalInput(ev.starts_at));
        setEndsAt(toLocalInput(ev.ends_at));
        setCapacity(ev.capacity);
        setDressCode(ev.dress_code || '');
        setCover(ev.cover_image);
        setStatus(ev.status);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Unable to load event');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const onUpload = async (file: File) => {
    setUploading(true);
    setError('');
    try {
      const reader = new FileReader();
      const base64: string = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
        reader.onerror = () => reject(new Error('Read failed'));
        reader.readAsDataURL(file);
      });
      const { url } = await apiFetch<{ url: string }>('/api/upload', {
        method: 'POST',
        body: JSON.stringify({ fileName: file.name, fileBase64: base64, contentType: file.type }),
      });
      setCover(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!title.trim() || !venue.trim() || !startsAt) {
      setError('Title, venue, and the opening of the time window are required.');
      return;
    }
    if (endsAt && new Date(endsAt) < new Date(startsAt)) {
      setError('The window cannot end before it begins.');
      return;
    }
    if (!capacity || capacity < 1) {
      setError('Maximum capacity must be at least 1.');
      return;
    }
    if (!description.trim()) {
      setError('A detailed description helps guests understand the evening.');
      return;
    }
    setBusy(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        venue: venue.trim(),
        address: address.trim(),
        starts_at: new Date(startsAt).toISOString(),
        ends_at: endsAt ? new Date(endsAt).toISOString() : new Date(startsAt).toISOString(),
        capacity: Number(capacity) || 80,
        dress_code: dressCode,
        cover_image: cover,
        status,
      };
      if (editing) {
        const ev = await apiFetch<EventRecord>('/api/events', {
          method: 'PUT',
          body: JSON.stringify({ id: Number(id), ...payload }),
        });
        navigate(`/events/${ev.id}`);
      } else {
        const ev = await apiFetch<EventRecord>('/api/events', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        navigate(`/events/${ev.id}`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to save event');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-ink">
        <Navbar />
        <div className="flex justify-center py-24">
          <div className="gold-ring" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink">
      <Navbar />
      <main className="max-w-3xl mx-auto px-5 py-10">
        <p className="text-[11px] uppercase tracking-[0.3em] text-gold mb-2">Compose</p>
        <h1 className="font-display text-4xl mb-2">{editing ? 'Edit the evening' : 'A new evening'}</h1>
        <p className="text-sm text-muted mb-8">
          Title, description, the date window, a mapped venue, and a hard capacity. The invitation engine comes after.
        </p>

        <form onSubmit={onSubmit} className="space-y-6">
          <div>
            <label className="block text-[11px] uppercase tracking-[0.16em] text-muted mb-1.5">Event title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-card border border-line rounded-xl px-4 py-3 outline-none focus:border-gold/50 font-display text-xl"
              placeholder="Midnight Garden Gala"
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-[0.16em] text-muted mb-1.5">Detailed description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className="w-full bg-card border border-line rounded-xl px-4 py-3 outline-none focus:border-gold/50 text-sm leading-relaxed"
              placeholder="What happens, who it is for, and how the night should feel…"
            />
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted mb-2">Date & time window</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted mb-1.5">Opens</label>
                <input
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  className="w-full bg-card border border-line rounded-xl px-4 py-3 outline-none focus:border-gold/50"
                />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1.5">Closes</label>
                <input
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  className="w-full bg-card border border-line rounded-xl px-4 py-3 outline-none focus:border-gold/50"
                />
              </div>
            </div>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted mb-2">Venue & map pin</p>
            <div className="grid sm:grid-cols-2 gap-4 mb-3">
              <div>
                <label className="block text-xs text-muted mb-1.5">Venue name</label>
                <input
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  className="w-full bg-card border border-line rounded-xl px-4 py-3 outline-none focus:border-gold/50"
                  placeholder="The Conservatory at Orchard House"
                />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1.5">Street address for Maps</label>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-card border border-line rounded-xl px-4 py-3 outline-none focus:border-gold/50"
                  placeholder="18 Orchard Lane, Upper West"
                />
              </div>
            </div>
            <VenueMap venue={venue} address={address} height={200} />
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] uppercase tracking-[0.16em] text-muted mb-1.5">Maximum capacity</label>
              <input
                type="number"
                min={1}
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="w-full bg-card border border-line rounded-xl px-4 py-3 outline-none focus:border-gold/50"
              />
              <p className="text-[11px] text-muted mt-1.5">Hard ceiling for issued invitations.</p>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-[0.16em] text-muted mb-1.5">Dress</label>
              <input
                value={dressCode}
                onChange={(e) => setDressCode(e.target.value)}
                className="w-full bg-card border border-line rounded-xl px-4 py-3 outline-none focus:border-gold/50"
                placeholder="Black tie"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-[0.16em] text-muted mb-1.5">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-card border border-line rounded-xl px-4 py-3 outline-none focus:border-gold/50"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-[0.16em] text-muted mb-2">Cover</label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
              {PRESETS.map((p) => (
                <button
                  type="button"
                  key={p.src}
                  onClick={() => setCover(p.src)}
                  className={`relative rounded-lg overflow-hidden h-16 border-2 ${
                    cover === p.src ? 'border-gold' : 'border-transparent'
                  }`}
                >
                  <img src={p.src} alt={p.label} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-gold-2 cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
              />
              {uploading ? 'Uploading…' : 'Upload your own'}
            </label>
            {cover && (
              <div className="mt-3 rounded-xl overflow-hidden h-40">
                <img src={cover} alt="" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          {error && <p className="text-sm text-rose">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={busy}
              className="px-6 py-2.5 rounded-full bg-gold text-ink text-sm hover:bg-gold-2 disabled:opacity-60"
            >
              {busy ? 'Saving…' : editing ? 'Save changes' : 'Create evening'}
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-2.5 rounded-full border border-line text-sm text-muted hover:text-cream"
            >
              Cancel
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
