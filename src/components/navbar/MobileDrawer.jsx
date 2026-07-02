// src/components/navbar/MobileDrawer.jsx
import { memo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Heart, ShoppingBag, User, Search } from "lucide-react";
import { MOBILE_ACCORDION } from "./navData";

const drawerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1], when: "beforeChildren", staggerChildren: 0.05 },
  },
  exit: { opacity: 0, transition: { duration: 0.3, ease: "easeIn" } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
  exit: { opacity: 0, y: 8 },
};

const subVariants = {
  collapsed: { height: 0, opacity: 0 },
  open: { height: "auto", opacity: 1, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
};

function MobileDrawer({ open, onClose }) {
  const [active, setActive] = useState(null);

  const toggle = useCallback((key) => {
    setActive((prev) => (prev === key ? null : key));
  }, []);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          variants={drawerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-[60] flex flex-col bg-white lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <div className="flex items-center justify-between border-b border-black/5 px-6 py-6">
            <Link
              to="/"
              onClick={onClose}
              className="font-serif text-lg tracking-[0.2em] text-neutral-900"
            >
              A&nbsp;PRODUCTIONS
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            <motion.div className="mb-6 flex items-center gap-3 rounded-full border border-black/10 px-4 py-3">
              <Search className="h-4 w-4 text-neutral-400" strokeWidth={1.5} />
              <span className="text-sm font-light text-neutral-400">
                Search the atelier…
              </span>
            </motion.div>

            <nav className="divide-y divide-black/5">
              {MOBILE_ACCORDION.map((link) => (
                <motion.div key={link.key} variants={itemVariants}>
                  {link.children ? (
                    <>
                      <button
                        type="button"
                        onClick={() => toggle(link.key)}
                        aria-expanded={active === link.key}
                        className="flex w-full items-center justify-between py-4 text-left font-serif text-xl font-light tracking-wide text-neutral-900"
                      >
                        {link.label}
                        <ChevronDown
                          className={`h-5 w-5 text-neutral-400 transition-transform duration-300 ${
                            active === link.key ? "rotate-180" : ""
                          }`}
                          strokeWidth={1.5}
                        />
                      </button>
                      <AnimatePresence initial={false}>
                        {active === link.key ? (
                          <motion.div
                            variants={subVariants}
                            initial="collapsed"
                            animate="open"
                            exit="collapsed"
                            className="overflow-hidden"
                          >
                            <ul className="space-y-1 pb-4 pl-2">
                              {link.children.map((c) => (
                                <li key={c.to}>
                                  <Link
                                    to={c.to}
                                    onClick={onClose}
                                    className="block py-2 text-[15px] font-light tracking-wide text-neutral-600 transition-colors hover:text-amber-700"
                                  >
                                    {c.label}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </motion.div>
                        ) : null}
                      </AnimatePresence>
                    </>
                  ) : (
                    <Link
                      to={link.to}
                      onClick={onClose}
                      className="block py-4 font-serif text-xl font-light tracking-wide text-neutral-900 transition-colors hover:text-amber-700"
                    >
                      {link.label}
                    </Link>
                  )}
                </motion.div>
              ))}
            </nav>
          </div>

          <motion.div
            variants={itemVariants}
            className="border-t border-black/5 px-6 py-6"
          >
            <Link
              to="/tailoring/consultation"
              onClick={onClose}
              className="mb-5 flex w-full items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-amber-600 py-4 text-sm font-medium uppercase tracking-[0.2em] text-white shadow-lg shadow-amber-600/20"
            >
              Book Consultation
            </Link>
            <div className="flex items-center justify-around">
              <Link
                to="/wishlist"
                onClick={onClose}
                aria-label="Wishlist"
                className="flex flex-col items-center gap-1.5 text-neutral-600"
              >
                <Heart className="h-5 w-5" strokeWidth={1.5} />
                <span className="text-[11px] uppercase tracking-wider">Wishlist</span>
              </Link>
              <Link
                to="/cart"
                onClick={onClose}
                aria-label="Cart"
                className="flex flex-col items-center gap-1.5 text-neutral-600"
              >
                <ShoppingBag className="h-5 w-5" strokeWidth={1.5} />
                <span className="text-[11px] uppercase tracking-wider">Cart</span>
              </Link>
              <Link
                to="/account"
                onClick={onClose}
                aria-label="Profile"
                className="flex flex-col items-center gap-1.5 text-neutral-600"
              >
                <User className="h-5 w-5" strokeWidth={1.5} />
                <span className="text-[11px] uppercase tracking-wider">Profile</span>
              </Link>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export default memo(MobileDrawer);
