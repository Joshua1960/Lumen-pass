import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  QrCode,
  PenLine,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Clock,
} from "lucide-react";
import Navbar from "../components/Navbar";
import { useAuth } from "../contexts/useAuth";

const steps = [
  {
    icon: PenLine,
    n: "01",
    title: "Compose",
    body: "Set the evening — venue, hour, dress, and a cover that feels like the room.",
  },
  {
    icon: QrCode,
    n: "02",
    title: "Seal",
    body: "Each guest receives a unique invitation with a private QR that cannot be reused.",
  },
  {
    icon: ScanLine,
    n: "03",
    title: "Admit",
    body: "At the door, scan once. Instant verification. Attendance written to the book.",
  },
];

const features = [
  {
    icon: ShieldCheck,
    title: "One-time tokens",
    body: "Every invitation carries a cryptographic QR. Duplicates are refused on sight.",
  },
  {
    icon: Clock,
    title: "Live attendance",
    body: "A running log of every scan — welcome, already in, declined, or unknown.",
  },
  {
    icon: Sparkles,
    title: "Guest-facing beauty",
    body: "Invites look like stationery, not software. RSVP and present the seal at the door.",
  },
];

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-ink text-cream">
      <Navbar />

      <section className="relative min-h-[88vh] flex items-end overflow-hidden grain">
        <img
          src="/images/hero.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-45"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-ink/30" />
        <div className="relative max-w-6xl mx-auto px-5 pb-20 pt-32 w-full">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[11px] uppercase tracking-[0.38em] text-gold mb-5"
          >
            Private evenings · Verified doors
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="font-display text-5xl sm:text-7xl lg:text-8xl leading-[0.92] max-w-4xl"
          >
            Invitations that know who arrived.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
            className="mt-6 max-w-xl text-cream/70 text-lg leading-relaxed"
          >
            Lumen is the quiet system behind a well-run door. Compose the
            evening, seal each guest with a unique QR, and admit them in a
            single scan.
          </motion.p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.28 }}
            className="mt-10 flex flex-wrap gap-3"
          >
            <Link
              to={user ? (user.role === "attendee" ? "/my-invitations" : "/dashboard") : "/login"}
              className="px-7 py-3 rounded-full bg-gold text-ink text-sm tracking-wide hover:bg-gold-2 transition-colors"
            >
              {user
                ? user.role === "attendee"
                  ? "View my invitations"
                  : "Open the book"
                : "Begin an evening"}
            </Link>
            <a
              href="#how"
              className="px-7 py-3 rounded-full border border-cream/20 text-cream text-sm tracking-wide hover:border-gold/50 transition-colors"
            >
              How the door works
            </a>
          </motion.div>
        </div>
      </section>

      <section id="how" className="max-w-6xl mx-auto px-5 py-24">
        <div className="flex justify-center mb-14">
          <img
            src="/images/flourish.png"
            alt=""
            className="h-10 object-contain opacity-80"
          />
        </div>
        <div className="grid md:grid-cols-3 gap-10">
          {steps.map((s) => (
            <div key={s.n} className="relative">
              <p className="font-display text-5xl text-gold/25 absolute -top-6 -left-1">
                {s.n}
              </p>
              <s.icon className="text-gold mb-4" size={22} />
              <h3 className="font-display text-3xl mb-3">{s.title}</h3>
              <p className="text-muted leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-ink-2">
        <div className="max-w-6xl mx-auto px-5 py-20 grid lg:grid-cols-2 gap-12 items-center">
          <div className="relative rounded-2xl overflow-hidden h-80 lg:h-[420px]">
            <img
              src="/images/scan.jpg"
              alt="Scanning an invitation"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent" />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-gold mb-3">
              At the threshold
            </p>
            <h2 className="font-display text-4xl sm:text-5xl leading-tight mb-5">
              Instant authentication, written into the evening.
            </h2>
            <p className="text-muted leading-relaxed mb-8">
              Staff open the scanner, the guest presents their seal, and Lumen
              decides in a breath — welcome, already admitted, declined, or
              unknown. Every result is logged.
            </p>
            <div className="space-y-5">
              {features.map((f) => (
                <div key={f.title} className="flex gap-4">
                  <div className="mt-0.5 w-9 h-9 rounded-full border border-gold/30 flex items-center justify-center shrink-0">
                    <f.icon size={16} className="text-gold" />
                  </div>
                  <div>
                    <h4 className="text-cream mb-1">{f.title}</h4>
                    <p className="text-sm text-muted leading-relaxed">
                      {f.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-5 py-24 grid md:grid-cols-2 gap-8">
        <div className="relative rounded-2xl overflow-hidden min-h-[280px] grain">
          <img
            src="/images/arrive.jpg"
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
          <div className="relative p-8 h-full flex flex-col justify-end">
            <h3 className="font-display text-3xl mb-2">For hosts</h3>
            <p className="text-sm text-cream/70 max-w-sm">
              A living guest book — capacity, RSVPs, and a door you can trust.
            </p>
          </div>
        </div>
        <div className="relative rounded-2xl overflow-hidden min-h-[280px] grain">
          <img
            src="/images/seal.jpg"
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-55"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
          <div className="relative p-8 h-full flex flex-col justify-end">
            <h3 className="font-display text-3xl mb-2">For guests</h3>
            <p className="text-sm text-cream/70 max-w-sm">
              A private page, a considered RSVP, and a QR that is theirs alone.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="max-w-6xl mx-auto px-5 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img
              src="/images/mark.png"
              alt=""
              className="w-6 h-6 object-contain"
            />
            <span className="font-display tracking-[0.2em] text-cream/80">
              LUMEN
            </span>
          </div>
          <p className="text-xs text-muted tracking-wide">
            The door remembers. The evening proceeds.
          </p>
        </div>
      </footer>
    </div>
  );
}
