import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { api } from "../lib/api";
import { ArrowLeft, Trash2 } from "lucide-react";

export default function EventForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const nav = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [venue, setVenue] = useState("");
  const [address, setAddress] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [capacity, setCapacity] = useState(50);
  const [dressCode, setDressCode] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(editing);

  useEffect(() => {
    if (!editing || !id) return;
    (async () => {
      try {
        const e = await api.getEvent(id);
        setTitle(e.title || "");
        setDescription(e.description || "");
        setVenue(e.venue || "");
        setAddress(e.address || "");
        setStartsAt(
          e.starts_at ? new Date(e.starts_at).toISOString().slice(0, 16) : "",
        );
        setEndsAt(
          e.ends_at ? new Date(e.ends_at).toISOString().slice(0, 16) : "",
        );
        setCapacity(e.capacity ?? 50);
        setDressCode(e.dress_code || "");
        setCoverUrl(e.cover_url || "");
      } catch (e: any) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [editing, id]);

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setErr("");
    if (!title.trim()) return setErr("A title, please");
    if (!venue.trim()) return setErr("Where is the event?");
    if (!startsAt) return setErr("When does the event begin?");
    if (capacity < 1) return setErr("Capacity must be at least 1");
    setBusy(true);
    try {
      const body = {
        title: title.trim(),
        description: description.trim() || null,
        venue: venue.trim(),
        address: address.trim() || null,
        starts_at: new Date(startsAt).toISOString(),
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
        capacity: Number(capacity),
        dress_code: dressCode.trim() || null,
        cover_url: coverUrl.trim() || null,
      };
      if (editing && id) {
        await api.updateEvent(id, body);
        nav(`/events/${id}`);
      } else {
        const e = await api.createEvent(body);
        nav(`/events/${e.id}`);
      }
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!id) return;
    if (
      !confirm(
        "Delete this event and all its invitations & tickets? This cannot be undone.",
      )
    )
      return;
    setBusy(true);
    try {
      await api.deleteEvent(id);
      nav("/dashboard");
    } catch (e: any) {
      setErr(e.message);
      setBusy(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen bg-[#0c0b0a] grain">
        <Navbar />
        <div className="flex items-center justify-center py-24">
          <div className="gold-ring" />
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#0c0b0a] grain">
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 py-10">
        <Link
          to={editing && id ? `/events/${id}` : "/dashboard"}
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#8a8178] hover:text-[#c9a962] mb-6"
        >
          <ArrowLeft className="w-3 h-3" /> Back
        </Link>
        <div className="text-[11px] uppercase tracking-[0.3em] text-[#c9a962] mb-2">
          {editing ? "Refine" : "Compose"}
        </div>
        <h1 className="font-display text-5xl text-cream mb-8">
          {editing ? "Refine the event" : "A new event"}
        </h1>

        <form
          onSubmit={submit}
          className="relative bg-[#211d19] border border-[#332e28] rounded-xl p-8 card-glow space-y-6"
        >
          <div className="corner-tl" />
          <div className="corner-tr" />
          <div className="corner-bl" />
          <div className="corner-br" />

          <div>
            <label className="block text-[10px] uppercase tracking-[0.25em] text-[#c9a962] mb-2">
              Title
            </label>
            <input
              className="field"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Solstice Supper"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-[0.25em] text-[#c9a962] mb-2">
              Description
            </label>
            <textarea
              className="field min-h-[110px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A note to your guests…"
            />
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.25em] text-[#c9a962] mb-2">
                Venue
              </label>
              <input
                className="field"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="e.g. Villa Aurora"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.25em] text-[#c9a962] mb-2">
                Address
              </label>
              <input
                className="field"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.25em] text-[#c9a962] mb-2">
                Begins
              </label>
              <input
                type="datetime-local"
                className="field"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.25em] text-[#c9a962] mb-2">
                Ends
              </label>
              <input
                type="datetime-local"
                className="field"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
              />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.25em] text-[#c9a962] mb-2">
                Capacity
              </label>
              <input
                type="number"
                min={1}
                className="field"
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                required
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.25em] text-[#c9a962] mb-2">
                Dress code
              </label>
              <input
                className="field"
                value={dressCode}
                onChange={(e) => setDressCode(e.target.value)}
                placeholder="e.g. Black tie optional"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-[0.25em] text-[#c9a962] mb-2">
              Cover image URL
            </label>
            <input
              className="field"
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              placeholder="Optional · https://…"
            />
          </div>

          {err && (
            <div className="text-sm text-[#c47865] bg-[#c47865]/10 border border-[#c47865]/30 rounded px-3 py-2">
              {err}
            </div>
          )}

          <div className="flex items-center justify-between gap-4 pt-2">
            {editing ? (
              <button
                type="button"
                onClick={remove}
                disabled={busy}
                className="text-xs text-[#c47865] hover:text-[#c47865] flex items-center gap-2 px-3 py-2"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete event
              </button>
            ) : (
              <span />
            )}
            <button
              type="submit"
              disabled={busy}
              className="btn-gold px-8 py-3 rounded text-sm inline-flex items-center gap-2"
            >
              {busy ? (
                <div className="gold-ring" style={{ width: 18, height: 18 }} />
              ) : (
                <>{editing ? "Save changes" : "Create event"}</>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
