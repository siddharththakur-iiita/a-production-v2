// src/components/navbar/MegaMenu.jsx
import { memo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

const panelVariants = {
  hidden: { opacity: 0, y: 12, filter: "blur(6px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    y: 8,
    filter: "blur(4px)",
    transition: { duration: 0.2, ease: "easeIn" },
  },
};

const listContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04, delayChildren: 0.06 } },
};

const listItem = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" } },
};

function MegaMenu({ data, onNavigate }) {
  const { categories, featured, promo, tagline, icon: Icon } = data;

  return (
    <motion.div
      variants={panelVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="absolute left-0 right-0 top-full"
      role="region"
      aria-label={tagline}
    >
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <div className="overflow-hidden rounded-b-2xl border border-black/5 bg-white/95 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.25)] backdrop-blur-xl">
          <div className="grid grid-cols-12 gap-0">
            {/* Column 1 — Categories */}
            <div className="col-span-4 border-r border-black/5 px-10 py-10">
              <div className="mb-6 flex items-center gap-2">
                {Icon ? (
                  <Icon className="h-4 w-4 text-amber-600" strokeWidth={1.5} />
                ) : null}
                <span className="text-[11px] uppercase tracking-[0.28em] text-neutral-400">
                  {tagline}
                </span>
              </div>
              <motion.ul
                variants={listContainer}
                initial="hidden"
                animate="visible"
                className="space-y-1"
              >
                {categories.map((c) => (
                  <motion.li key={c.to} variants={listItem}>
                    <Link
                      to={c.to}
                      onClick={onNavigate}
                      className="group flex items-center justify-between py-2 text-[15px] font-light tracking-wide text-neutral-800 transition-colors duration-300 hover:text-amber-700"
                    >
                      <span className="relative">
                        {c.label}
                        <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-amber-600 transition-all duration-300 group-hover:w-full" />
                      </span>
                      <ArrowUpRight
                        className="h-3.5 w-3.5 -translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
                        strokeWidth={1.5}
                      />
                    </Link>
                  </motion.li>
                ))}
              </motion.ul>
            </div>

            {/* Column 2 — Featured Collections */}
            <div className="col-span-4 border-r border-black/5 px-10 py-10">
              <span className="mb-6 block text-[11px] uppercase tracking-[0.28em] text-neutral-400">
                Featured
              </span>
              <motion.ul
                variants={listContainer}
                initial="hidden"
                animate="visible"
                className="space-y-3"
              >
                {featured.map((f) => (
                  <motion.li key={f.to} variants={listItem}>
                    <Link
                      to={f.to}
                      onClick={onNavigate}
                      className="group block text-[15px] font-light leading-snug text-neutral-700 transition-colors duration-300 hover:text-amber-700"
                    >
                      {f.label}
                    </Link>
                  </motion.li>
                ))}
              </motion.ul>
            </div>

            {/* Column 3 — Promotional Image */}
            <div className="col-span-4 p-3">
              <Link
                to={promo.to}
                onClick={onNavigate}
                className="group relative block h-full min-h-[280px] overflow-hidden rounded-xl"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-neutral-200 via-neutral-100 to-amber-50 transition-transform duration-700 ease-out group-hover:scale-105" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(212,175,55,0.18),transparent_60%)]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 p-8">
                  <span className="text-[11px] uppercase tracking-[0.28em] text-white/70">
                    A Productions
                  </span>
                  <h3 className="mt-2 font-serif text-2xl font-light tracking-wide text-white">
                    {promo.title}
                  </h3>
                  <p className="mt-2 max-w-[240px] text-sm font-light text-white/80">
                    {promo.subtitle}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-amber-200">
                    Discover
                    <ArrowUpRight
                      className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      strokeWidth={1.5}
                    />
                  </span>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default memo(MegaMenu);