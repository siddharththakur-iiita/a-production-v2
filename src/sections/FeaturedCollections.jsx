import React, { useState, useCallback, useMemo, memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const EASE_LUXURY = [0.16, 1, 0.3, 1];

const collections = [
  {
    id: 'ethnic',
    label: 'HERITAGE',
    title: 'Ethnic',
    desc: 'Timeless heritage crafted for modern celebrations.',
    image: '/placeholders/ethnic.jpg',
    href: '/collections/ethnic',
    className: 'md:col-span-7 h-[560px] md:h-[760px]',
    priority: true,
    fallbackGradient: 'from-amber-100 to-orange-200',
    overlay: 'from-orange-950/90 via-orange-900/30 to-transparent group-hover:from-orange-950/95',
    accentText: 'text-amber-200 group-hover:text-amber-300'
  },
  {
    id: 'formal',
    label: 'EXECUTIVE',
    title: 'Formal',
    desc: 'Sharp minimal silhouettes for the modern executive.',
    image: '/placeholders/formal.jpg',
    href: '/collections/formal',
    className: 'md:col-span-5 h-[560px] md:h-[760px]',
    fallbackGradient: 'from-gray-200 to-gray-300',
    overlay: 'from-black/90 via-black/40 to-transparent group-hover:from-black/95',
    accentText: 'text-gray-300 group-hover:text-white'
  },
  {
    id: 'festive',
    label: 'CELEBRATION',
    title: 'Festive',
    desc: 'A warm glow of deep maroons and gold for your special days.',
    image: '/placeholders/festive.jpg',
    href: '/collections/festive',
    className: 'md:col-span-5 h-[500px] md:h-[660px]',
    fallbackGradient: 'from-rose-100 to-rose-200',
    overlay: 'from-rose-950/95 via-rose-900/40 to-transparent group-hover:from-rose-950/100',
    accentText: 'text-rose-200 group-hover:text-rose-100'
  },
  {
    id: 'bridal',
    label: 'ATELIER',
    title: 'Bridal',
    desc: 'Royal elegance and premium editorial luxury for the bride.',
    image: '/placeholders/bridal.jpg',
    href: '/collections/bridal',
    className: 'md:col-span-7 h-[500px] md:h-[660px]',
    fallbackGradient: 'from-stone-200 to-stone-300',
    overlay: 'from-stone-900/80 via-stone-800/30 to-transparent group-hover:from-stone-900/90',
    accentText: 'text-stone-300 group-hover:text-stone-100'
  },
  {
    id: 'casual',
    label: 'LIFESTYLE',
    title: 'Casual',
    desc: 'Bright, soft, and modern lifestyle essentials.',
    image: '/placeholders/casual.jpg',
    href: '/collections/casual',
    className: 'md:col-span-7 h-[500px] md:h-[660px]',
    fallbackGradient: 'from-sky-100 to-blue-200',
    overlay: 'from-slate-900/80 via-slate-800/30 to-transparent group-hover:from-slate-900/95',
    accentText: 'text-sky-200 group-hover:text-sky-100'
  },
  {
    id: 'party',
    label: 'EVENING',
    title: 'Party Wear',
    desc: 'Deep navy and modern glamour for luxurious evenings.',
    image: '/placeholders/party.jpg',
    href: '/collections/party-wear',
    className: 'md:col-span-5 h-[500px] md:h-[660px]',
    fallbackGradient: 'from-indigo-200 to-slate-300',
    overlay: 'from-slate-950/95 via-indigo-950/50 to-transparent group-hover:from-slate-950/100',
    accentText: 'text-indigo-200 group-hover:text-indigo-100'
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12 }
  }
};

const headerVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 1, ease: EASE_LUXURY } }
};

const ctaVariants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 1.1, ease: EASE_LUXURY } }
};

/**
 * A single collection card. Memoized so that one image failing to load
 * (which only changes that card's local state) never forces a re-render
 * of its five siblings.
 */
const CollectionCard = memo(function CollectionCard({ collection, hasImageError, onImageError, itemVariants }) {
  const {
    id, label, title, desc, image, href, className,
    priority, fallbackGradient, overlay, accentText
  } = collection;

  return (
    <motion.li variants={itemVariants} className={`w-full list-none ${className}`}>
      <Link
        to={href}
        className={`group relative block h-full w-full overflow-hidden rounded-[1.5rem] md:rounded-[2.25rem] shadow-sm transition-[transform,box-shadow] duration-700 ease-[var(--ease-luxury)] will-change-transform hover:-translate-y-1.5 hover:shadow-[0_35px_70px_-25px_rgba(0,0,0,0.35)] focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-4 ring-1 ring-black/5 bg-gradient-to-br ${fallbackGradient}`}
        aria-label={`Explore the ${title} collection — ${desc}`}
      >
        <div className="absolute inset-0 z-10 rounded-[1.5rem] md:rounded-[2.25rem] ring-1 ring-inset ring-white/15 pointer-events-none transition-colors duration-700 ease-[var(--ease-luxury)] group-hover:ring-white/25" />

        {!hasImageError && (
          <img
            src={image}
            alt=""
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1400ms] ease-[var(--ease-luxury)] group-hover:scale-[1.06]"
            onError={() => onImageError(id)}
          />
        )}

        <div className={`absolute inset-0 bg-gradient-to-t ${overlay} transition-all duration-1000 ease-[var(--ease-luxury)]`} />

        <div className="absolute bottom-0 left-0 flex w-full flex-col justify-end p-7 sm:p-9 md:p-11 lg:p-14 text-white z-20">
          <span className={`mb-3 md:mb-4 block text-[10px] font-medium uppercase tracking-[0.3em] transition-colors duration-700 ease-[var(--ease-luxury)] ${accentText}`}>
            {label}
          </span>

          <h3 className="mb-3 md:mb-4 text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight transition-transform duration-700 ease-[var(--ease-luxury)] group-hover:-translate-y-2 md:group-focus-visible:-translate-y-2 [text-shadow:0_2px_24px_rgba(0,0,0,0.25)]">
            {title}
          </h3>

          <p className="max-w-md text-sm md:text-base font-light text-white/80 transition-all duration-700 ease-[var(--ease-luxury)] leading-relaxed group-hover:-translate-y-2 group-hover:text-white/95 md:group-focus-visible:-translate-y-2 md:group-focus-visible:text-white/95">
            {desc}
          </p>

          <div className="mt-7 md:mt-8 flex items-center overflow-hidden h-11">
            <div
              className="flex items-center transform transition-all duration-700 ease-[var(--ease-luxury)]
                         translate-y-0 opacity-100
                         md:translate-y-10 md:opacity-0
                         md:group-hover:translate-y-0 md:group-hover:opacity-100
                         md:group-focus-visible:translate-y-0 md:group-focus-visible:opacity-100"
            >
              <div className="relative overflow-hidden rounded-full bg-white/10 backdrop-blur-md px-6 py-3 ring-1 ring-white/20 transition-colors duration-500 group-hover:bg-white/20">
                <span className="relative z-10 text-[11px] font-medium uppercase tracking-[0.15em] text-white">
                  Explore Collection
                </span>
                <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent group-hover:animate-[aprod-shimmer_1.6s_ease-in-out_infinite]" />
              </div>

              <div className="relative ml-4 flex items-center justify-center overflow-hidden w-6 h-6 shrink-0">
                <ArrowRight
                  className="absolute w-5 h-5 md:-translate-x-full text-white transition-transform duration-700 delay-100 ease-[var(--ease-luxury)] md:group-hover:translate-x-0 md:group-focus-visible:translate-x-0"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.li>
  );
});

export default function FeaturedCollections() {
  const [imageErrors, setImageErrors] = useState({});
  const shouldReduceMotion = useReducedMotion();

  const handleImageError = useCallback((id) => {
    setImageErrors((prev) => (prev[id] ? prev : { ...prev, [id]: true }));
  }, []);

  const itemVariants = useMemo(
    () => ({
      hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 36 },
      show: {
        opacity: 1,
        y: 0,
        transition: { duration: shouldReduceMotion ? 0.4 : 1.1, ease: EASE_LUXURY }
      }
    }),
    [shouldReduceMotion]
  );

  return (
    <section
      className="w-full bg-stone-50 px-4 py-24 md:px-8 md:py-36"
      style={{ '--ease-luxury': 'cubic-bezier(0.16, 1, 0.3, 1)' }}
    >
      {/* Self-contained keyframes so this section never depends on an external Tailwind config. */}
      <style>{`
        @keyframes aprod-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .group-hover\\:animate-\\[aprod-shimmer_1\\.6s_ease-in-out_infinite\\]:hover { animation: none; }
        }
      `}</style>

      <div className="mx-auto max-w-[1800px]">

        <motion.div
          className="mb-20 md:mb-28 flex flex-col items-center text-center max-w-4xl mx-auto"
          variants={headerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-100px' }}
        >
          <span className="mb-6 block text-[10px] font-medium uppercase tracking-[0.35em] text-neutral-500">
            Curated Collections
          </span>
          <h2 className="mb-8 text-balance text-4xl md:text-6xl lg:text-7xl font-light tracking-tight text-neutral-900 leading-[1.1]">
            Every Occasion <br className="hidden md:block" />
            <span className="text-neutral-500 italic">Has Its Own Story</span>
          </h2>
          <p className="max-w-xl text-base md:text-lg font-light text-neutral-600 leading-relaxed">
            Discover collections thoughtfully curated for every celebration, every milestone and every personal style.
          </p>
        </motion.div>

        <motion.ul
          role="list"
          className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-7 lg:gap-10 p-0 m-0"
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-100px' }}
        >
          {collections.map((collection) => (
            <CollectionCard
              key={collection.id}
              collection={collection}
              hasImageError={!!imageErrors[collection.id]}
              onImageError={handleImageError}
              itemVariants={itemVariants}
            />
          ))}
        </motion.ul>

        <motion.div
          variants={ctaVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-100px' }}
          className="mt-24 md:mt-36 w-full overflow-hidden rounded-[2rem] md:rounded-[2.5rem] bg-[#FAFAFA] px-6 py-16 md:px-12 md:py-24 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-black/5"
        >
          <div className="mx-auto max-w-2xl">
            <span className="mb-6 block text-[10px] font-medium uppercase tracking-[0.35em] text-neutral-500">
              Can't Find Your Style?
            </span>
            <h3 className="mb-6 text-balance text-3xl md:text-5xl lg:text-6xl font-light tracking-tight text-neutral-900">
              Create Something <br />
              <span className="italic text-neutral-500">Exclusively Yours</span>
            </h3>
            <p className="mb-10 text-base md:text-lg font-light text-neutral-600 leading-relaxed">
              Every garment begins with your vision. Our expert tailoring team will design, measure and craft a piece made exclusively for you.
            </p>

            <Link
              to="/tailoring/consultation"
              className="group inline-flex items-center justify-center rounded-full bg-neutral-900 px-8 py-4 text-sm font-light text-white transition-all duration-500 ease-[var(--ease-luxury)] hover:bg-neutral-800 hover:shadow-xl hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 ring-1 ring-transparent"
            >
              <span>Book Custom Consultation</span>
              <ArrowRight className="ml-3 h-4 w-4 transition-transform duration-500 group-hover:translate-x-1" strokeWidth={1.5} aria-hidden="true" />
            </Link>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
