// src/components/Navbar.jsx
import {
  useState,
  useEffect,
  useRef,
  useCallback,
  memo,
} from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Heart,
  ShoppingBag,
  User,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";
import { NAV_LINKS, MEGA_MENUS } from "./navbar/navData";
import MegaMenu from "./navbar/MegaMenu";
import MobileDrawer from "./navbar/MobileDrawer";

const SCROLL_THRESHOLD = 80;

const ActionIcon = memo(function ActionIcon({
  to,
  label,
  icon: Icon,
  scrolled,
}) {
  return (
    <Link
      to={to}
      aria-label={label}
      className={`group relative rounded-full p-2 transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 ${scrolled
        ? "text-neutral-800 hover:text-amber-700"
        : "text-white hover:text-amber-200"
        }`}
    >
      <Icon className="h-5 w-5" strokeWidth={1.5} />
    </Link>
  );
});

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [activeMega, setActiveMega] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeTimer = useRef(null);
  const navRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > SCROLL_THRESHOLD);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setActiveMega(null);
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setActiveMega(null);
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const onClick = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setActiveMega(null);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const openMega = useCallback(
    (key) => {
      clearCloseTimer();
      setActiveMega(key);
    },
    [clearCloseTimer]
  );

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => setActiveMega(null), 140);
  }, [clearCloseTimer]);

  const closeMega = useCallback(() => setActiveMega(null), []);
  const toggleMobile = useCallback(() => setMobileOpen((p) => !p), []);

  const solid = scrolled || activeMega !== null;

  return (
    <>
      <motion.header
        ref={navRef}
        initial={false}
        onMouseLeave={scheduleClose}
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${solid
          ? "border-b border-black/5 bg-white/80 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.15)] backdrop-blur-xl"
          : "bg-transparent"
          }`}
      >
        <div className="mx-auto flex h-[88px] max-w-[1400px] items-center justify-between px-6 lg:px-10">
          {/* Logo */}
          <Link
            to="/"
            className={`font-serif text-xl tracking-[0.22em] transition-colors duration-300 ${solid ? "text-neutral-900" : "text-white"
              }`}
          >
            A&nbsp;PRODUCTIONS
          </Link>

          {/* Center nav */}
          <nav
            className="hidden items-center gap-9 lg:flex"
            aria-label="Primary"
          >
            {NAV_LINKS.map((link) => {
              const isActive = activeMega === link.key;
              return (
                <div
                  key={link.key}
                  onMouseEnter={() =>
                    link.hasMega ? openMega(link.key) : closeMega()
                  }
                >
                  <Link
                    to={link.to}
                    aria-haspopup={link.hasMega ? "true" : undefined}
                    aria-expanded={link.hasMega ? isActive : undefined}
                    className={`group relative flex items-center gap-1 py-2 text-[13px] uppercase tracking-[0.18em] transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 ${solid
                      ? "text-neutral-700 hover:text-neutral-950"
                      : "text-white/90 hover:text-white"
                      }`}
                  >
                    {link.label}
                    {link.hasMega ? (
                      <ChevronDown
                        className={`h-3.5 w-3.5 transition-transform duration-300 ${isActive ? "rotate-180" : ""
                          }`}
                        strokeWidth={1.5}
                      />
                    ) : null}
                    <span
                      className={`absolute -bottom-0.5 left-0 h-px bg-amber-500 transition-all duration-300 ${isActive ? "w-full" : "w-0 group-hover:w-full"
                        }`}
                    />
                  </Link>
                </div>
              );
            })}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-1 lg:gap-2">
            <Link
              to="/search"
              aria-label="Search"
              className={`group hidden rounded-full p-2 transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 sm:block ${solid
                  ? "text-neutral-800 hover:text-amber-700"
                  : "text-white hover:text-amber-200"
                }`}
            >
              <Search className="h-5 w-5" strokeWidth={1.5} />
            </Link>

            <div className="hidden sm:block">
              <ActionIcon to="/wishlist" label="Wishlist" icon={Heart} scrolled={solid} />
            </div>
            <ActionIcon to="/cart" label="Cart" icon={ShoppingBag} scrolled={solid} />
            <div className="hidden sm:block">
              <ActionIcon to="/account" label="Profile" icon={User} scrolled={solid} />
            </div>

            <Link
              to="/custom-tailoring"
              className="ml-2 hidden items-center rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.2em] text-white shadow-lg shadow-amber-600/20 transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/40 hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 lg:inline-flex"
            >
              Book Consultation

            </Link>

            {/* Mobile toggle */}
            <button
              type="button"
              onClick={toggleMobile}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              className={`ml-1 rounded-full p-2 transition-colors duration-300 lg:hidden ${solid ? "text-neutral-900" : "text-white"
                }`}
            >
              {mobileOpen ? (
                <X className="h-6 w-6" strokeWidth={1.5} />
              ) : (
                <Menu className="h-6 w-6" strokeWidth={1.5} />
              )}
            </button>
          </div>
        </div>

        {/* Mega menu */}
        <AnimatePresence>
          {activeMega && MEGA_MENUS[activeMega] ? (
            <div
              onMouseEnter={clearCloseTimer}
              onMouseLeave={scheduleClose}
            >
              <MegaMenu data={MEGA_MENUS[activeMega]} onNavigate={closeMega} />
            </div>
          ) : null}
        </AnimatePresence>
      </motion.header>

      <MobileDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  );
}

export default memo(Navbar);
