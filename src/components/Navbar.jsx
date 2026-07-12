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

// Stable object reference: sets the shared easing curve once via CSS custom
// property instead of recreating an inline style object on every render.
const EASE_STYLE = { "--ease-luxury": "cubic-bezier(0.16, 1, 0.3, 1)" };

const ActionIcon = memo(function ActionIcon({
  to,
  label,
  icon: Icon,
  scrolled,
  visibilityClass = "",
}) {
  return (
    <Link
      to={to}
      aria-label={label}
      className={`group relative flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full transition-colors duration-300 ease-[var(--ease-luxury)] focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/70 focus-visible:ring-offset-2 ${
        scrolled
          ? "text-neutral-800 hover:text-neutral-950"
          : "text-white hover:text-white/70"
      } ${visibilityClass}`}
    >
      <Icon className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
    </Link>
  );
});

const NavItem = memo(function NavItem({ link, isActive, isCurrentPage, solid, onEnter, onLeave }) {
  const handleMouseEnter = useCallback(() => {
    if (link.hasMega) {
      onEnter(link.key);
    } else {
      onLeave();
    }
  }, [link, onEnter, onLeave]);

  const showIndicator = isActive || isCurrentPage;

  return (
    <div onMouseEnter={handleMouseEnter}>
      <Link
        to={link.to}
        aria-haspopup={link.hasMega ? "true" : undefined}
        aria-expanded={link.hasMega ? isActive : undefined}
        aria-current={isCurrentPage ? "page" : undefined}
        className={`group relative flex items-center gap-1 py-2 text-[13px] uppercase tracking-[0.18em] transition-colors duration-300 ease-[var(--ease-luxury)] focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/70 focus-visible:ring-offset-2 ${
          solid
            ? "text-neutral-700 hover:text-neutral-950"
            : "text-white/90 hover:text-white"
        }`}
      >
        {link.label}
        {link.hasMega ? (
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform duration-300 ease-[var(--ease-luxury)] ${
              isActive ? "rotate-180" : ""
            }`}
            strokeWidth={1.5}
            aria-hidden="true"
          />
        ) : null}
        {/* Monochrome indicator — matches current text colour via bg-current
            rather than a separate accent hue, keeping the mark quiet. */}
        <span
          className={`absolute -bottom-0.5 left-0 h-px bg-current transition-all duration-300 ease-[var(--ease-luxury)] ${
            showIndicator ? "w-full" : "w-0 group-hover:w-full"
          }`}
        />
      </Link>
    </div>
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
        style={EASE_STYLE}
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ease-[var(--ease-luxury)] ${
          solid
            ? "border-b border-black/5 bg-white/80 shadow-[0_20px_60px_-24px_rgba(0,0,0,0.18)] backdrop-blur-xl"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-[88px] max-w-[1400px] items-center justify-between px-6 lg:px-10">
          {/* Logo */}
          <Link
            to="/"
            className={`rounded-sm font-serif text-xl tracking-[0.22em] transition-colors duration-300 ease-[var(--ease-luxury)] focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/70 focus-visible:ring-offset-4 ${
              solid
                ? "text-neutral-900 hover:text-neutral-700"
                : "text-white hover:text-white/80"
            }`}
          >
            A&nbsp;PRODUCTIONS
          </Link>

          {/* Center nav */}
          <nav
            className="hidden items-center gap-9 lg:flex"
            aria-label="Primary"
          >
            {NAV_LINKS.map((link) => (
              <NavItem
                key={link.key}
                link={link}
                isActive={activeMega === link.key}
                isCurrentPage={location.pathname === link.to}
                solid={solid}
                onEnter={openMega}
                onLeave={closeMega}
              />
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-1 lg:gap-2">
            <ActionIcon
              to="/search"
              label="Search"
              icon={Search}
              scrolled={solid}
              visibilityClass="hidden sm:flex"
            />
            <ActionIcon
              to="/wishlist"
              label="Wishlist"
              icon={Heart}
              scrolled={solid}
              visibilityClass="hidden sm:flex"
            />
            <ActionIcon to="/cart" label="Cart" icon={ShoppingBag} scrolled={solid} />
            <ActionIcon
              to="/account"
              label="Profile"
              icon={User}
              scrolled={solid}
              visibilityClass="hidden sm:flex"
            />

            <Link
              to="/custom-tailoring"
              className="ml-2 hidden items-center rounded-full bg-neutral-900 px-6 py-3 text-[11px] font-medium uppercase tracking-[0.2em] text-white transition-all duration-500 ease-[var(--ease-luxury)] hover:-translate-y-0.5 hover:bg-black hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.35)] focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/70 focus-visible:ring-offset-2 lg:inline-flex"
            >
              Book Consultation
            </Link>

            {/* Mobile toggle */}
            <button
              type="button"
              onClick={toggleMobile}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              className={`ml-1 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full transition-colors duration-300 ease-[var(--ease-luxury)] focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/70 focus-visible:ring-offset-2 lg:hidden ${
                solid ? "text-neutral-900" : "text-white"
              }`}
            >
              {mobileOpen ? (
                <X className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
              ) : (
                <Menu className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
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
