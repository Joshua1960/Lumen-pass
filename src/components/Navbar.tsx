import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Sparkles, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import myLogo from "../assets/gci-logo.png";

export default function Navbar() {
  const { user, profile, signOut } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState(false);

  const hostLinks = [
    { to: "/dashboard", label: "Events" },
    { to: "/admin", label: "Admin" },
  ];
  const attendeeLinks = [
    { to: "/my-invitations", label: "Invitations" },
    { to: "/my-tickets", label: "Tickets" },
  ];
  const links =
    profile?.role === "host"
      ? hostLinks
      : profile?.role === "attendee"
        ? attendeeLinks
        : [];

  const handleSignOut = async () => {
    await signOut();
    nav("/");
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0c0b0a]/85 backdrop-blur border-b border-[#332e28]/60">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link
          to={
            user
              ? profile?.role === "host"
                ? "/dashboard"
                : "/my-tickets"
              : "/"
          }
          className="flex items-center gap-2 group"
        >
          <img className="h-10 w-10" src={myLogo} alt="" />
          <span className="font-display text-2xl tracking-wide text-cream">
            Lumen
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`text-sm tracking-wide uppercase transition-colors ${loc.pathname === l.to ? "text-[#c9a962]" : "text-[#8a8178] hover:text-cream"}`}
            >
              {l.label}
            </Link>
          ))}
          {user && (
            <Link
              to="/profile"
              className={`text-sm tracking-wide uppercase transition-colors ${loc.pathname === "/profile" ? "text-[#c9a962]" : "text-[#8a8178] hover:text-cream"}`}
            >
              Profile
            </Link>
          )}
        </nav>

        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <>
              <button
                onClick={handleSignOut}
                className="btn-ghost text-sm px-4 py-2 rounded flex items-center gap-2"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link to="/login" className="btn-gold text-sm px-5 py-2 rounded">
              Enter
            </Link>
          )}
        </div>

        <button
          className="md:hidden p-2 text-cream"
          onClick={() => setOpen(!open)}
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-[#332e28]/60 bg-[#141210] px-6 py-4 space-y-3">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className="block text-sm uppercase tracking-wide text-[#8a8178] hover:text-cream"
            >
              {l.label}
            </Link>
          ))}
          {user && (
            <Link
              to="/profile"
              onClick={() => setOpen(false)}
              className="block text-sm uppercase tracking-wide text-[#8a8178] hover:text-cream"
            >
              Profile
            </Link>
          )}
          {user ? (
            <button
              onClick={() => {
                setOpen(false);
                handleSignOut();
              }}
              className="btn-ghost text-sm px-4 py-2 rounded flex items-center gap-2"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign out
            </button>
          ) : (
            <Link
              to="/login"
              onClick={() => setOpen(false)}
              className="btn-gold text-sm px-5 py-2 rounded inline-block"
            >
              Enter
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
