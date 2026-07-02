// src/components/Hero.jsx
import { memo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, ArrowUpRight, ChevronDown } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1];

const container = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 1, ease: EASE } },
};

const headingLines = ["Crafted For", "Every", "Celebration"];

const headingLine = {
  hidden: { opacity: 0, y: 40, letterSpacing: "0.18em" },
  visible: {
    opacity: 1,
    y: 0,
    letterSpacing: "0.02em",
    transition: { duration: 1, ease: EASE },
  },
};

const imageVariants = {
  hidden: { opacity: 0, scale: 1.08 },
  visible: { opacity: 1, scale: 1, transition: { duration: 1.2, ease: EASE } },
};

const HERO_IMAGE = "/placeholders/hero.jpg";

const HeroImage = memo(function HeroImage() {
  const [failed, setFailed] = useState(false);
  const onError = useCallback(() => setFailed(true), []);

  return (
    <motion.div
      variants={imageVariants}
      className="group relative h-full w-full"
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.7, ease: EASE }}
    >
      <div className="relative h-full w-full overflow-hidden rounded-[2rem] shadow-[0_40px_100px_-30px_rgba(40,30,20,0.45)] ring-1 ring-black/5 transition-shadow duration-700 group-hover:shadow-[0_55px_130px_-30px_rgba(40,30,20,0.55)]">
        {failed ? (
          <div
            role="img"
            aria-label="A Productions atelier — premium fashion and custom tailoring"
            className="absolute inset-0"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#efe7dc] via-[#e3d8c8] to-[#cdbfae]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(212,175,55,0.22),transparent_55%)]" />
            <div className="absolute inset-0 opacity-[0.06] [background-image:repeating-linear-gradient(45deg,#000_0,#000_1px,transparent_1px,transparent_6px)]" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <span className="font-serif text-3xl tracking-[0.3em] text-neutral-700/80">
                A&nbsp;PRODUCTIONS
              </span>
              <span className="text-[11px] uppercase tracking-[0.4em] text-neutral-500/80">
                Atelier
              </span>
            </div>
          </div>
        ) : (
          <img
            src={HERO_IMAGE}
            onError={onError}
            alt="A Productions atelier — premium fashion and custom tailoring"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            loading="eager"
            fetchpriority="high"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />

        {/* floating editorial caption */}
        <motion.div
          variants={fadeIn}
          className="absolute bottom-6 left-6 rounded-full bg-white/70 px-5 py-2.5 text-[11px] uppercase tracking-[0.28em] text-neutral-700 backdrop-blur-md ring-1 ring-white/40"
        >
          Bespoke · Made to Measure
        </motion.div>
      </div>
    </motion.div>
  );
});

function Hero() {
  return (
    <section
      aria-label="A Productions — Premium fashion and custom tailoring"
      className="relative min-h-screen w-full overflow-hidden lg:min-h-[920px]"
    >
      {/* Layer 1 — soft luxury gradient: warm ivory → soft charcoal */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#f6f1e9] via-[#f1ebe1] to-[#e8e2d7]" />

      {/* Layer 2 — subtle textile texture (pure CSS, no images) */}
      <div className="absolute inset-0 opacity-[0.04] [background-image:repeating-linear-gradient(45deg,#3a3127_0,#3a3127_1px,transparent_1px,transparent_7px),repeating-linear-gradient(-45deg,#3a3127_0,#3a3127_1px,transparent_1px,transparent_7px)]" />

      {/* Layer 3 — large radial lighting */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_20%,rgba(255,255,255,0.7),transparent_55%)]" />

      {/* Layer 4 — very subtle gold glow */}
      <div className="absolute -right-32 top-1/4 h-[480px] w-[480px] rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.18),transparent_65%)] blur-2xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/4 h-[300px] w-[300px] rounded-full bg-[radial-gradient(circle,rgba(58,49,39,0.06),transparent_70%)] blur-2xl" />

      {/* Content */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="visible"
        className="relative z-10 mx-auto flex min-h-screen max-w-[1400px] flex-col items-center gap-12 px-6 pb-24 pt-[120px] lg:min-h-[920px] lg:flex-row lg:gap-10 lg:px-10 lg:pb-16 lg:pt-[88px]"
      >
        {/* Left — editorial content (45%) */}
        <div className="flex w-full flex-col items-center text-center lg:w-[45%] lg:items-start lg:pr-6 lg:text-left">
          {/* Badge */}
          <motion.span
            variants={fadeUp}
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-amber-600/30 bg-white/40 px-4 py-2 text-[11px] uppercase tracking-[0.32em] text-amber-800 backdrop-blur-sm"
          >
            <span className="h-1 w-1 rounded-full bg-amber-600" />
            Premium Atelier
          </motion.span>

          {/* Headline */}
          <h1 className="font-serif text-5xl font-light leading-[1.02] tracking-tight text-neutral-900 sm:text-6xl lg:text-[5.5rem]">
            {headingLines.map((line, i) => (
              <motion.span
                key={line}
                variants={headingLine}
                className={`block ${i === 2 ? "italic text-amber-800" : ""}`}
              >
                {line}
              </motion.span>
            ))}
          </h1>

          {/* Subheadline */}
          <motion.p
            variants={fadeUp}
            className="mt-8 text-lg font-light uppercase tracking-[0.18em] text-neutral-700 sm:text-xl"
          >
            Premium Fashion &amp; Custom Tailoring
          </motion.p>

          {/* Paragraph */}
          <motion.p
            variants={fadeIn}
            className="mt-6 max-w-md text-[15px] font-light leading-relaxed text-neutral-600"
          >
            Where timeless craftsmanship meets contemporary elegance. From
            bespoke tailoring to curated collections, discover fashion designed
            around every celebration.
          </motion.p>

          {/* Buttons */}
          <motion.div
            variants={fadeUp}
            className="mt-10 flex w-full flex-col items-stretch gap-4 sm:w-auto sm:flex-row sm:items-center"
          >
            <Link
              to="/collections"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-neutral-900 px-8 py-4 text-[12px] font-medium uppercase tracking-[0.22em] text-white shadow-lg shadow-neutral-900/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-neutral-900/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60"
            >
              Explore Collections
              <ArrowRight
                className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                strokeWidth={1.5}
              />
            </Link>

            <Link
              to="/tailoring/consultation"
              className="group inline-flex items-center justify-center gap-2 rounded-full border border-neutral-900/20 bg-white/40 px-8 py-4 text-[12px] font-medium uppercase tracking-[0.22em] text-neutral-900 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-600/50 hover:bg-white/70 hover:shadow-lg hover:shadow-amber-600/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60"
            >
              Book Consultation
              <ArrowUpRight
                className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                strokeWidth={1.5}
              />
            </Link>
          </motion.div>
        </div>

        {/* Right — hero image (55%) */}
        <div className="relative h-[420px] w-full sm:h-[520px] lg:h-[760px] lg:w-[55%] lg:translate-y-12">
          <HeroImage />
        </div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 1 }}
        className="absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-2 lg:flex"
        aria-hidden="true"
      >
        <span className="text-[10px] uppercase tracking-[0.32em] text-neutral-500">
          Scroll
        </span>
        <motion.span
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="text-neutral-500"
        >
          <ChevronDown className="h-4 w-4" strokeWidth={1.5} />
        </motion.span>
      </motion.div>
    </section>
  );
}

export default memo(Hero);