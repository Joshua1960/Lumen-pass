import { Link } from "react-router-dom";
import { QrCode, ScanLine, ShieldCheck, Send, DoorOpen } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import myLogo from "../assets/gci-logo.png";

export default function Landing() {
  const { user, profile } = useAuth();
  const enterTo = user
    ? profile?.role === "host"
      ? "/dashboard"
      : "/my-tickets"
    : "/login";

  return (
    <div className="min-h-screen bg-[#0c0b0a] grain">
      {/* Nav */}
      <header className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2">
          <img className="h-10 w-10" src={myLogo} alt="" />
          <span className="font-display text-2xl tracking-wide text-cream">
            Lumen
          </span>
        </div>
        <Link to={enterTo} className="btn-gold px-5 py-2 rounded text-sm">
          {user ? "Continue" : "Enter"}
        </Link>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 20% 30%, rgba(201,169,98,0.18), transparent 50%), radial-gradient(circle at 80% 70%, rgba(196,120,101,0.12), transparent 50%)",
          }}
        />
        <div className=" mx-auto px-6 pt-20 pb-32 relative">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-[#c9a962] border border-[#c9a962]/30 rounded-full px-4 py-1.5 mb-8">
              Private invitations, verified doors
            </div>
            <h1 className="font-display text-6xl md:text-8xl leading-[0.95] gold-gradient-text mb-6">
              Every guest,
              <br />
              <em className="italic font-normal">expected</em>
            </h1>
            <p className="text-lg text-[#8a8178] leading-relaxed max-w-xl mx-auto mb-10">
              Lumen by GCI uses private QR passes for the invitations you send,
              then verifies them at the door. No lists shouted across the hall.
              No fumbling for names.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to={enterTo}
                className="btn-gold px-8 py-3.5 rounded text-sm tracking-wide inline-flex items-center gap-2"
              >
                Get Started
              </Link>
              <a
                href="#how"
                className="btn-ghost px-8 py-3.5 rounded text-sm tracking-wide"
              >
                How it works
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Feature triad */}
      <section id="how" className="max-w-6xl mx-auto px-6 pb-24">
        <div className="text-center mb-16">
          <div className="hairline w-24 mx-auto mb-6" />
          <h2 className="font-display text-4xl text-cream">
            A trilogy of quiet mechanics
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: Send,
              title: "Compose",
              body: "Draft invitations by name. Each one carries a private link — no public sign-ups, no surprise walk-ins.",
            },
            {
              icon: QrCode,
              title: "Confirm",
              body: "Guests accept and receive a signed QR pass tied to their ticket, downloadable and offline-ready.",
            },
            {
              icon: ScanLine,
              title: "Admit",
              body: "At the door, your team scans. A soft chime for valid, a discreet flag for anything else.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="relative bg-[#211d19] border border-[#332e28] rounded-xl p-8 card-glow"
            >
              <div className="corner-tl" />
              <div className="corner-tr" />
              <div className="corner-bl" />
              <div className="corner-br" />
              <f.icon className="w-6 h-6 text-[#c9a962] mb-6" />
              <h3 className="font-display text-2xl text-cream mb-3">
                {f.title}
              </h3>
              <p className="text-sm text-[#8a8178] leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* For hosts / for guests */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="relative bg-gradient-to-br from-[#211d19] to-[#141210] border border-[#332e28] rounded-xl p-10">
            <ShieldCheck className="w-7 h-7 text-[#c9a962] mb-6" />
            <div className="text-[11px] uppercase tracking-[0.3em] text-[#c9a962] mb-3">
              For hosts
            </div>
            <h3 className="font-display text-3xl text-cream mb-4">
              Compose the room
            </h3>
            <p className="text-sm text-[#8a8178] leading-relaxed mb-8">
              Create the evening. Send private invitations. Watch acceptances
              arrive. Scan pases at the door with duplicate detection and a live
              attendance ledger.
            </p>
            <Link
              to="/login?as=host"
              className="btn-gold px-6 py-3 rounded text-sm inline-flex items-center gap-2"
            >
              Host with Lumen
            </Link>
          </div>

          <div className="relative bg-gradient-to-br from-[#211d19] to-[#141210] border border-[#332e28] rounded-xl p-10">
            <DoorOpen className="w-7 h-7 text-[#c9a962] mb-6" />
            <div className="text-[11px] uppercase tracking-[0.3em] text-[#c9a962] mb-3">
              For guests
            </div>
            <h3 className="font-display text-3xl text-cream mb-4">
              Arrive expected
            </h3>
            <p className="text-sm text-[#8a8178] leading-relaxed mb-8">
              Accept invitations from your inbox. Keep passes in one quiet
              place. Show your QR at the door and slip in.
            </p>
            <Link
              to="/login?as=attendee"
              className="btn-ghost px-6 py-3 rounded text-sm inline-flex items-center gap-2"
            >
              Attend with Lumen
            </Link>
          </div>
        </div>
      </section>

      <footer className="max-w-6xl mx-auto px-6 py-12 border-t border-[#332e28]/40">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#6b6259] uppercase tracking-[0.2em]">
          <div>© Lumen · Private invitations · Verified doors</div>
          <div>Built by GCI Byte Busters</div>
        </div>
      </footer>
    </div>
  );
}
