import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, X, LogOut } from "lucide-react";
import { useAuth } from "../contexts/useAuth";

export default function Navbar() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const signOut = () => {
    localStorage.removeItem("auth_user");
    window.location.href = "/";
  };

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `text-sm tracking-wide ${isActive ? "text-gold-2" : "text-cream/70 hover:text-cream"} transition-colors`;

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-ink/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
        <Link
          to={user ? "/dashboard" : "/"}
          className="flex items-center gap-2.5"
        >
          <img
            src="/images/mark.png"
            alt=""
            className="w-8 h-8 object-contain"
          />
          <span className="font-display text-2xl tracking-[0.18em] text-cream">
            LUMEN
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-7">
          {user ? (
            <>
              <NavLink to="/dashboard" className={linkCls}>
                Desk
              </NavLink>
              <NavLink to="/events/new" className={linkCls}>
                New event
              </NavLink>
              <span className="text-xs text-muted hidden lg:inline max-w-[180px] truncate">
                {user.email}
              </span>
              <button
                onClick={signOut}
                className="inline-flex items-center gap-1.5 text-sm text-cream/70 hover:text-gold-2 transition-colors"
              >
                <LogOut size={14} /> Sign out
              </button>
            </>
          ) : (
            <>
              <a
                href="/#how"
                className="text-sm text-cream/70 hover:text-cream"
              >
                How it works
              </a>
              <Link
                to="/login"
                className="px-4 py-1.5 rounded-full border border-gold/40 text-gold-2 text-sm hover:bg-gold/10 transition-colors"
              >
                Enter
              </Link>
            </>
          )}
        </nav>

        <button
          className="md:hidden text-cream"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-line px-5 py-4 flex flex-col gap-3 bg-ink">
          {user ? (
            <>
              <NavLink
                to="/dashboard"
                onClick={() => setOpen(false)}
                className={linkCls}
              >
                Desk
              </NavLink>
              <NavLink
                to="/events/new"
                onClick={() => setOpen(false)}
                className={linkCls}
              >
                New event
              </NavLink>
              <button
                onClick={signOut}
                className="text-left text-sm text-cream/70"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <a
                href="/#how"
                onClick={() => setOpen(false)}
                className="text-sm text-cream/70"
              >
                How it works
              </a>
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="text-sm text-gold-2"
              >
                Enter
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
