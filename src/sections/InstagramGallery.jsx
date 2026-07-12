import { memo, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Instagram } from 'lucide-react';

const EASE_LUXURY = [0.16, 1, 0.3, 1];
const INSTAGRAM_URL = 'https://instagram.com/YOUR_INSTAGRAM';

// Alternating offsets create an intentionally curated rhythm on larger
// screens instead of four images landing in a perfectly even row.
const GALLERY_IMAGES = [
  {
    id: 1,
    src: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=1200&auto=format&fit=crop',
    alt: 'A Productions on Instagram — campaign look, post 1',
    offset: false
  },
  {
    id: 2,
    src: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=1200&auto=format&fit=crop',
    alt: 'A Productions on Instagram — campaign look, post 2',
    offset: true
  },
  {
    id: 3,
    src: 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?q=80&w=1200&auto=format&fit=crop',
    alt: 'A Productions on Instagram — campaign look, post 3',
    offset: false
  },
  {
    id: 4,
    src: 'https://images.unsplash.com/photo-1617038220319-276d3cfab638?q=80&w=1200&auto=format&fit=crop',
    alt: 'A Productions on Instagram — campaign look, post 4',
    offset: true
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15 }
  }
};

/**
 * A single gallery tile. Memoized so the four tiles don't re-render
 * together whenever the parent section re-renders.
 */
const GalleryTile = memo(function GalleryTile({ image, itemVariants }) {
  return (
    <motion.li
      variants={itemVariants}
      className={`list-none ${image.offset ? 'lg:mt-12' : ''}`}
    >
      <a
        href={INSTAGRAM_URL}
        target="_blank"
        rel="noreferrer"
        aria-label="View this look on Instagram (opens in a new tab)"
        className="group relative block h-[280px] w-full overflow-hidden rounded-[1.75rem] shadow-sm transition-shadow duration-700 ease-[var(--ease-luxury)] hover:shadow-[0_30px_60px_-24px_rgba(0,0,0,0.25)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A27A]/70 focus-visible:ring-offset-4 focus-visible:ring-offset-[#F8F5F2] sm:h-[320px]"
      >
        <img
          src={image.src}
          alt={image.alt}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1400ms] ease-[var(--ease-luxury)] group-hover:scale-[1.045]"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/0 to-transparent opacity-0 transition-opacity duration-700 ease-[var(--ease-luxury)] group-hover:opacity-100" />

        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-700 ease-[var(--ease-luxury)] group-hover:opacity-100">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur-sm">
            <Instagram className="h-4 w-4 text-[#1E1E1E]" strokeWidth={1.5} aria-hidden="true" />
          </span>
        </div>
      </a>
    </motion.li>
  );
});

export default function InstagramGallery() {
  const shouldReduceMotion = useReducedMotion();

  const itemVariants = useMemo(
    () => ({
      hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 28 },
      show: {
        opacity: 1,
        y: 0,
        transition: { duration: shouldReduceMotion ? 0.4 : 1.2, ease: EASE_LUXURY }
      }
    }),
    [shouldReduceMotion]
  );

  return (
    <section
      aria-labelledby="instagram-gallery-heading"
      className="px-6 py-24 sm:px-8 lg:px-16 lg:py-32 bg-[#F8F5F2]"
      style={{ '--ease-luxury': 'cubic-bezier(0.16, 1, 0.3, 1)' }}
    >
      <motion.div
        className="mb-16 md:mb-20 flex flex-col items-center text-center"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-100px' }}
        variants={containerVariants}
      >
        <motion.p
          variants={itemVariants}
          className="mb-4 text-[10px] font-medium uppercase tracking-[0.35em] text-[#C8A27A]"
        >
          Follow Our Journey
        </motion.p>

        <motion.h2
          id="instagram-gallery-heading"
          variants={itemVariants}
          className="text-5xl font-serif text-[#1E1E1E]"
        >
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-block rounded-sm transition-colors duration-500 ease-[var(--ease-luxury)] hover:text-[#C8A27A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A27A]/70 focus-visible:ring-offset-4 focus-visible:ring-offset-[#F8F5F2]"
          >
            @AProductions
          </a>
        </motion.h2>

        <motion.p
          variants={itemVariants}
          className="mt-6 max-w-xl text-base font-light leading-relaxed text-[#6B6660] md:text-lg"
        >
          A running edit of campaign moments, atelier details and quiet
          craftsmanship from the A Productions world.
        </motion.p>
      </motion.div>

      <motion.ul
        role="list"
        className="grid grid-cols-2 gap-5 md:gap-6 lg:grid-cols-4 lg:gap-8 p-0 m-0"
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-100px' }}
      >
        {GALLERY_IMAGES.map((image) => (
          <GalleryTile key={image.id} image={image} itemVariants={itemVariants} />
        ))}
      </motion.ul>
    </section>
  );
}
