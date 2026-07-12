import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import React, { useRef, memo, useState } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Scissors,
  Ruler,
  Gem,
  Hourglass,
  PenTool,
  Package,
  MessageSquare,
  Heart
} from 'lucide-react';

const NOISE_SVG = 'data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjAwIDIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZmlsdGVyIGlkPSJub2lzZSI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuOCIgbnVtT2N0YXZlcz0iNCIgc3RpdGNoVGlsZXM9InN0aXRjaCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNub2lzZSkiLz48L3N2Zz4=';

// ================= CONTENT =================
// Kept separate from markup so copy can be revised without touching layout.

const philosophy = [
  {
    id: 'craftsmanship',
    title: 'Craftsmanship',
    desc: 'Every stitch is a deliberate act of artistry, honoring centuries of Indian textile heritage while embracing modern precision.',
    icon: Scissors
  },
  {
    id: 'authenticity',
    title: 'Authenticity',
    desc: 'We remain uncompromising in our materials and methods, ensuring that every garment tells a genuine story of its origin.',
    icon: Heart
  },
  {
    id: 'timeless',
    title: 'Timeless Design',
    desc: 'Beyond fleeting trends, our silhouettes are designed to be heirlooms—cherished, worn, and passed down through generations.',
    icon: Hourglass
  }
];

const processSteps = [
  {
    num: '01',
    title: 'Consultation',
    desc: 'A private dialogue to understand your vision, aesthetic, and requirements.',
    icon: MessageSquare
  },
  {
    num: '02',
    title: 'Design',
    desc: 'Sketching silhouettes and curating premium fabrics tailored to you.',
    icon: PenTool
  },
  {
    num: '03',
    title: 'Measurements',
    desc: 'Meticulous profiling to ensure an uncompromising, perfect fit.',
    icon: Ruler
  },
  {
    num: '04',
    title: 'Crafting',
    desc: 'Our master artisans hand-finish your garment with exquisite detailing.',
    icon: Scissors
  },
  {
    num: '05',
    title: 'Delivery',
    desc: 'The final fitting and presentation of your bespoke creation.',
    icon: Package
  }
];

const reasons = [
  {
    id: 1,
    label: 'ARTISTRY',
    title: 'Master Craftsmanship',
    desc: 'Handcrafted by artisans with decades of heritage expertise.',
  },
  {
    id: 2,
    label: 'BESPOKE',
    title: 'Made to Measure',
    desc: 'An uncompromising fit tailored exclusively to your silhouette.',
  },
  {
    id: 3,
    label: 'MATERIALS',
    title: 'Premium Fabrics',
    desc: 'Sourced from the finest mills globally for an unmatched tactile experience.',
  },
  {
    id: 4,
    label: 'AESTHETIC',
    title: 'Timeless Design',
    desc: 'Silhouettes that transcend seasons, blending heritage with modern luxury.',
  }
];

// ================= MOTION VARIANTS =================

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 1.4, ease: [0.16, 1, 0.3, 1] } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.2, delayChildren: 0.1 }
  }
};

const imageReveal = {
  hidden: { opacity: 0, scale: 0.97, filter: 'blur(10px)' },
  show: {
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
    transition: { duration: 1.8, ease: [0.16, 1, 0.3, 1] }
  }
};

// ================= SHARED SUB-COMPONENTS =================
// Extracted so every section header, divider and image frame reads
// identically — a quiet consistency that reads as intentional, not repeated code.

const SectionEyebrow = memo(({ children, className = '' }) => (
  <motion.span
    variants={fadeUp}
    className={`mb-8 block text-[9px] font-medium uppercase tracking-[0.4em] text-[#8C8273] ${className}`}
  >
    {children}
  </motion.span>
));
SectionEyebrow.displayName = 'SectionEyebrow';

const Divider = memo(({ className = '' }) => (
  <motion.div variants={fadeUp} className={`h-px w-[120px] bg-[#EAE8E3] ${className}`} />
));
Divider.displayName = 'Divider';

const LuxuryImage = memo(({ src, alt, className, fallbackText, style }) => {
  const [error, setError] = useState(false);

  return (
    <motion.div style={style} className={`group relative overflow-hidden ${className}`}>
      {!error ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-[2.5s] ease-[0.16,1,0.3,1] group-hover:scale-[1.03]"
          onError={() => setError(true)}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#FDFCFB] to-[#F2EFE9]">
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: `url(${NOISE_SVG})` }}
          />
          <div className="relative z-10 flex flex-col items-center gap-4 opacity-70">
            <span className="text-[9px] font-medium uppercase tracking-[0.5em] text-[#8C8273]">
              A Productions
            </span>
            <span className="font-serif text-2xl font-light italic text-[#333333]">
              {fallbackText}
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
});
LuxuryImage.displayName = 'LuxuryImage';

const About = memo(() => {
  const pageRef = useRef(null);
  const shouldReduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: pageRef,
    offset: ["start start", "end end"]
  });

  const heroY = useTransform(scrollYProgress, [0, 0.2], shouldReduceMotion ? [0, 0] : [0, 150]);
  const storyImgY = useTransform(scrollYProgress, [0.1, 0.4], shouldReduceMotion ? [0, 0] : [30, -30]);
  const atelierImgY = useTransform(scrollYProgress, [0.4, 0.7], shouldReduceMotion ? [0, 0] : [40, -40]);

  return (
    <main ref={pageRef} className="relative w-full bg-[#FCFBF9] text-[#111111] overflow-hidden">

      {/* Global Texture */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-50 opacity-[0.02] mix-blend-multiply"
        style={{ backgroundImage: `url(${NOISE_SVG})` }}
      />

      {/* ================= SECTION 1: HERO ================= */}
      <section
        aria-label="Introduction"
        className="relative flex min-h-[90vh] flex-col items-center justify-center px-4 pt-32 pb-20 md:px-8 overflow-hidden"
      >
        {/* Editorial background image with restrained ambient scale + parallax */}
        <motion.div
          aria-hidden="true"
          style={{ y: heroY }}
          className="absolute -top-[10%] left-0 right-0 z-0 h-[120%]"
        >
          <motion.img
            src="/about-hero.jpg"
            alt=""
            loading="eager"
            className="h-full w-full object-cover origin-center"
            animate={shouldReduceMotion ? { scale: 1 } : { scale: [1, 1.03] }}
            transition={{
              duration: 25,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut"
            }}
          />
          <div className="absolute inset-0 bg-black/20" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#FCFBF9_0%,_transparent_65%)] opacity-50" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#FCFBF9] via-[#FCFBF9]/80 to-transparent" />
        </motion.div>

        {/* Hero content — shifted left on desktop for an editorial, off-center composition */}
        <div className="relative z-10 mt-12 flex w-full max-w-[1800px] flex-col items-center md:items-start md:pl-[8%] lg:pl-[10%]">
          <motion.div
            className="flex flex-col items-center text-center md:items-start md:text-left"
            variants={staggerContainer}
            initial="hidden"
            animate="show"
          >
            <SectionEyebrow>The Heritage</SectionEyebrow>
            <motion.h1
              variants={fadeUp}
              className="mb-12 text-6xl font-light leading-[1.05] tracking-tight text-[#111111] md:text-8xl lg:text-[9rem]"
            >
              ABOUT <br />
              <span className="font-serif italic text-[#333333]">A Productions</span>
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="max-w-3xl text-lg font-light leading-[1.9] text-[#555555] md:text-2xl"
            >
              Redefining Indian luxury through an uncompromising dedication to craftsmanship, timeless elegance, and bespoke artistry.
            </motion.p>
          </motion.div>
        </div>

        {/* Minimal scroll indicator */}
        <motion.div
          aria-hidden="true"
          className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="relative h-16 w-px overflow-hidden bg-[#111111]/15">
            <motion.div
              className="absolute -left-[1px] top-0 h-[3px] w-[3px] rounded-full bg-[#111111]"
              animate={shouldReduceMotion ? { y: 0 } : { y: [0, 64] }}
              transition={{
                repeat: shouldReduceMotion ? 0 : Infinity,
                duration: 2.5,
                ease: [0.25, 0.1, 0.25, 1]
              }}
            />
          </div>
        </motion.div>
      </section>

      {/* ================= SECTION 2: OUR STORY ================= */}
      <section aria-labelledby="our-story-heading" className="relative w-full px-4 py-32 md:px-8 md:py-48 lg:py-56">
        <div className="mx-auto max-w-[1800px]">
          <div className="grid grid-cols-1 items-center gap-20 lg:grid-cols-12 lg:gap-28">

            {/* Editorial text column */}
            <motion.div
              className="flex flex-col justify-center lg:col-span-5 lg:pr-16"
              variants={staggerContainer}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-100px" }}
            >
              <SectionEyebrow>Our Story</SectionEyebrow>

              <motion.h2
                id="our-story-heading"
                variants={fadeUp}
                className="mb-10 text-4xl font-light leading-[1.1] tracking-tight text-[#111111] md:text-5xl lg:text-6xl"
              >
                A Legacy of <br />
                <span className="font-serif italic text-[#333333]">Elegance</span>
              </motion.h2>

              <Divider className="mb-12" />

              <motion.div
                variants={fadeUp}
                className="flex flex-col gap-10 text-base font-light leading-[2] text-[#555555] md:text-lg"
              >
                <p>
                  A Productions was born from a profound reverence for the unseen details. In an era of fleeting trends, we anchored our identity in the timeless artistry of Indian heritage, seamlessly woven into the fabric of modern luxury.
                </p>
                <p>
                  Every silhouette begins with a personal conversation and culminates in a sartorial masterpiece — thoughtfully sculpted to honor the individual who will wear it, not the season it was made in.
                </p>
              </motion.div>
            </motion.div>

            {/* Prominent image column */}
            <motion.div
              className="lg:col-span-7"
              variants={imageReveal}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-100px" }}
            >
              <LuxuryImage
                src="/placeholders/about-story.jpg"
                alt="Artisans at work crafting a luxury garment by hand"
                fallbackText="Our Heritage"
                className="w-full rounded-[2.5rem] bg-[#F7F5F0] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] ring-1 ring-black/[0.03] aspect-[4/5] lg:aspect-[4/3]"
                style={{ y: storyImgY }}
              />
            </motion.div>

          </div>
        </div>
      </section>

      {/* ================= SECTION 3: A QUIET WORD (EDITORIAL PAUSE) ================= */}
      {/* A single reflective line between chapters — the pause a reader takes
          between passages, giving the page room to breathe before Philosophy. */}
      <section aria-label="Our guiding thought" className="relative w-full px-4 py-12 md:px-8 md:py-20">
        <motion.div
          className="mx-auto max-w-4xl text-center"
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
        >
          <p className="font-serif text-2xl font-light italic leading-[1.5] text-[#333333] md:text-3xl lg:text-4xl">
            "Quiet luxury is not what is added.
            <br className="hidden md:block" /> It is everything left after what is unnecessary has been removed."
          </p>
        </motion.div>
      </section>

      {/* ================= SECTION 4: OUR PHILOSOPHY ================= */}
      <section aria-labelledby="philosophy-heading" className="relative w-full px-4 py-32 md:px-8 md:py-40 border-t border-black/[0.03]">
        <div className="mx-auto max-w-[1800px]">
          <motion.div
            className="mb-24 flex flex-col items-center text-center"
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
          >
            <SectionEyebrow>The Ethos</SectionEyebrow>
            <motion.h2 id="philosophy-heading" variants={fadeUp} className="text-4xl font-light leading-[1.1] tracking-tight md:text-5xl lg:text-6xl">
              Our <span className="font-serif italic text-[#333333]">Philosophy</span>
            </motion.h2>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 gap-16 md:grid-cols-3 md:gap-12 lg:gap-24"
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
          >
            {philosophy.map((item) => {
              const Icon = item.icon;
              return (
                <motion.div key={item.id} variants={fadeUp} className="flex flex-col items-center text-center group">
                  <div className="mb-10 flex h-16 w-16 items-center justify-center rounded-full bg-[#FAFAFA] border border-black/[0.03] transition-colors duration-700 group-hover:bg-white group-hover:shadow-sm">
                    <Icon className="h-5 w-5 text-[#8C8273]" strokeWidth={1.5} aria-hidden="true" />
                  </div>
                  <h3 className="mb-6 font-serif text-2xl font-light text-[#111111]">
                    {item.title}
                  </h3>
                  <p className="text-base font-light leading-[1.9] text-[#555555]">
                    {item.desc}
                  </p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ================= SECTION 5: THE ATELIER ================= */}
      <section aria-labelledby="atelier-heading" className="relative w-full px-4 py-32 md:px-8 md:py-48 lg:py-56 bg-[#FDFCFB]">
        <div className="mx-auto max-w-[1800px]">
          <motion.div
            className="relative"
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
          >
            <motion.div variants={imageReveal}>
              <LuxuryImage
                src="/placeholders/about-atelier.jpg"
                alt="Inside the A Productions atelier"
                fallbackText="The Atelier"
                className="w-full rounded-[2.5rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.03] aspect-[4/5] md:aspect-[21/9]"
                style={{ y: atelierImgY }}
              />
            </motion.div>

            <motion.div
              variants={fadeUp}
              className="absolute -bottom-16 left-4 right-4 md:-bottom-24 md:left-24 md:right-auto md:w-[500px]"
            >
              <div className="rounded-[2rem] bg-white/80 p-10 backdrop-blur-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-white/50 md:p-14">
                <SectionEyebrow className="mb-6">Inside the Studio</SectionEyebrow>
                <h2 id="atelier-heading" className="mb-6 font-serif text-3xl font-light leading-[1.1] text-[#111111] md:text-4xl">
                  The <span className="italic text-[#333333]">Atelier</span>
                </h2>
                <p className="text-sm font-light leading-[1.9] text-[#555555] md:text-base">
                  Our atelier is a sanctuary of creation, where premium fabrics from the world's finest mills meet the masterful hands of our tailors — from the first personal consultation to the final hand-finished detail.
                </p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ================= SECTION 6: OUR PROCESS ================= */}
      <section aria-labelledby="process-heading" className="relative w-full px-4 pt-48 pb-32 md:px-8 md:pt-64 md:pb-48">
        <div className="mx-auto max-w-[1800px]">
          <motion.div
            className="mb-24"
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
          >
            <SectionEyebrow>How We Work</SectionEyebrow>
            <motion.h2 id="process-heading" variants={fadeUp} className="text-4xl font-light leading-[1.1] tracking-tight md:text-5xl lg:text-6xl">
              The <span className="font-serif italic text-[#333333]">Process</span>
            </motion.h2>
          </motion.div>

          <motion.ol
            className="grid grid-cols-1 gap-12 md:grid-cols-5 md:gap-8"
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
          >
            {processSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <motion.li key={step.num} variants={fadeUp} className="relative group flex flex-col list-none">
                  {index !== processSteps.length - 1 && (
                    <div aria-hidden="true" className="hidden md:block absolute top-6 left-16 right-0 h-px bg-gradient-to-r from-black/[0.05] to-transparent" />
                  )}
                  <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-full border border-black/[0.05] bg-white transition-all duration-700 group-hover:shadow-md group-hover:-translate-y-1 z-10">
                    <Icon className="h-4 w-4 text-[#8C8273]" strokeWidth={1.5} aria-hidden="true" />
                  </div>
                  <span aria-hidden="true" className="mb-4 text-[9px] font-medium uppercase tracking-[0.2em] text-[#8C8273]">
                    {step.num}
                  </span>
                  <h3 className="mb-4 font-serif text-xl font-light text-[#111111]">
                    {step.title}
                  </h3>
                  <p className="text-sm font-light leading-[1.8] text-[#555555]">
                    {step.desc}
                  </p>
                </motion.li>
              );
            })}
          </motion.ol>
        </div>
      </section>

      {/* ================= SECTION 7: WHY A PRODUCTIONS ================= */}
      <section aria-labelledby="why-heading" className="relative w-full px-4 py-32 md:px-8 md:py-48 border-t border-black/[0.03]">
        <div className="mx-auto max-w-[1800px]">
          <div className="grid grid-cols-1 gap-20 lg:grid-cols-12 lg:gap-16 xl:gap-24">

            <motion.div
              className="flex flex-col justify-center lg:col-span-5 lg:pr-8"
              variants={staggerContainer}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-100px" }}
            >
              <SectionEyebrow className="mb-12">The Difference</SectionEyebrow>
              <motion.h2 id="why-heading" variants={fadeUp} className="mb-14 text-5xl font-light leading-[1.05] tracking-tight text-[#111111] md:text-6xl lg:text-[6rem]">
                Why <br />
                <span className="font-serif italic text-[#333333]">A Productions</span>
              </motion.h2>
              <motion.p variants={fadeUp} className="mb-12 max-w-lg text-base font-light leading-[1.9] text-[#555555] md:text-xl">
                We believe that true luxury lies in the unseen details. Every garment we create is a testament to the uncompromising pursuit of perfection, blending profound artistry with refined modern elegance.
              </motion.p>
              <Divider className="mb-14" />
            </motion.div>

            <motion.div
              className="lg:col-span-7 lg:col-start-6"
              variants={staggerContainer}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-100px" }}
            >
              <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 sm:gap-16 lg:gap-x-12 lg:gap-y-20">
                {reasons.map((reason, index) => {
                  const isEven = index % 2 !== 0;
                  return (
                    <motion.article
                      key={reason.id}
                      variants={fadeUp}
                      className={`flex flex-col items-start ${isEven ? 'sm:mt-16 lg:mt-24' : ''}`}
                    >
                      <span className="mb-6 block text-[8px] font-medium uppercase tracking-[0.3em] text-[#8C8273]">
                        {reason.label}
                      </span>
                      <h3 className="mb-6 font-serif text-2xl font-light tracking-wide text-[#111111] md:text-3xl">
                        {reason.title}
                      </h3>
                      <p className="text-sm font-light leading-[1.9] text-[#555555] md:text-base">
                        {reason.desc}
                      </p>
                    </motion.article>
                  );
                })}
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ================= SECTION 8: LUXURY CTA ================= */}
      <section aria-labelledby="cta-heading" className="relative w-full overflow-hidden px-4 py-32 md:px-8 md:py-48">
        <motion.div
          className="relative mx-auto max-w-[1800px] overflow-hidden rounded-[2.5rem] bg-[#111111] px-6 py-24 md:px-12 md:py-32 lg:py-40"
          variants={imageReveal}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
        >
          <div aria-hidden="true" className="absolute inset-0 z-0">
            <img
              src="/placeholders/about-cta.jpg"
              alt=""
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover opacity-30 mix-blend-luminosity"
              onError={(e) => e.currentTarget.style.display = 'none'}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#111111] via-transparent to-transparent opacity-80" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_#111111_100%)] opacity-60" />
          </div>

          <div className="relative z-10 flex flex-col items-center text-center">
            <motion.span
              variants={fadeUp}
              className="mb-8 block text-[9px] font-medium uppercase tracking-[0.4em] text-[#D9D2C5]"
            >
              By Private Appointment
            </motion.span>
            <motion.h2
              id="cta-heading"
              variants={fadeUp}
              className="mb-8 max-w-3xl text-4xl font-light leading-[1.1] tracking-tight text-white md:text-6xl lg:text-7xl"
            >
              Let's Create Something <br />
              <span className="font-serif italic text-[#D9D2C5]">Extraordinary</span>
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className="mb-14 max-w-md text-sm font-light leading-[1.8] text-[#B8B2A6] md:text-base"
            >
              A private conversation is where every commission begins. We would be glad to listen.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-col items-center gap-6">
              <Link
                className="group inline-flex items-center justify-center rounded-full bg-white px-10 py-4 text-[11px] font-medium uppercase tracking-[0.2em] text-[#111111] outline-none ring-1 ring-transparent transition-all duration-700 ease-[0.16,1,0.3,1] hover:-translate-y-1 hover:bg-[#FDFCFB] hover:shadow-[0_20px_40px_-10px_rgba(255,255,255,0.15)] focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-[#111111]"
                to="/tailoring/consultation"
              >
                <span>Reserve a Consultation</span>
                <ArrowRight className="ml-4 h-4 w-4 transition-transform duration-700 ease-[0.16,1,0.3,1] group-hover:translate-x-2" strokeWidth={1.5} aria-hidden="true" />
              </Link>
              <span className="text-[10px] font-light uppercase tracking-[0.3em] text-[#7A7469]">
                Held in confidence
              </span>
            </motion.div>
          </div>
        </motion.div>
      </section>

    </main>
  );
});

About.displayName = 'About';

export default About;
