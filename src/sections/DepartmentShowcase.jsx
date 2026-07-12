import React, { memo, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const EASE_LUXURY = [0.16, 1, 0.3, 1];

const departments = [
  {
    id: 'women',
    label: 'ATELIER',
    title: 'Women',
    desc: 'Elegant styles for every celebration.',
    image: '/placeholders/women.jpg',
    badge: 'New Collection',
    href: '/women',
    className: 'md:col-span-6 h-[560px] md:h-[760px]',
    priority: true,
    fallbackGradient: 'from-stone-200 to-stone-300'
  },
  {
    id: 'men',
    label: 'MENSWEAR',
    title: 'Men',
    desc: 'Modern tailoring with timeless craftsmanship.',
    image: '/placeholders/men.jpg',
    badge: "Editor's Pick",
    href: '/men',
    className: 'md:col-span-6 h-[560px] md:h-[760px]',
    fallbackGradient: 'from-gray-300 to-gray-400'
  },
  {
    id: 'kids',
    label: 'MINIATURE',
    title: 'Kids',
    desc: 'Premium fashion for little celebrations.',
    image: '/placeholders/kids.jpg',
    badge: 'Luxury Craft',
    href: '/kids',
    className: 'md:col-span-5 h-[460px] md:h-[610px]',
    fallbackGradient: 'from-slate-200 to-slate-300'
  },
  {
    id: 'tailoring',
    label: 'BESPOKE',
    title: 'Custom Tailoring',
    desc: 'Designed exclusively for you.',
    image: '/placeholders/tailoring.jpg',
    badge: 'Bespoke',
    href: '/tailoring',
    className: 'md:col-span-7 h-[460px] md:h-[610px]',
    fallbackGradient: 'from-zinc-800 to-zinc-900'
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.14 }
  }
};

const headerVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 1, ease: EASE_LUXURY } }
};

/**
 * A single department panel. Memoized — this section renders no local state,
 * so the only thing that would ever cause a re-render is the parent
 * re-rendering; memo keeps each panel stable independently of its siblings.
 */
const DepartmentCard = memo(function DepartmentCard({ dept, itemVariants }) {
  const { label, title, desc, image, badge, href, className, priority, fallbackGradient } = dept;

  return (
    <motion.li variants={itemVariants} className={`w-full list-none ${className}`}>
      <Link
        to={href}
        className={`group relative block h-full w-full overflow-hidden rounded-[1.5rem] md:rounded-[2.25rem] bg-gradient-to-br ${fallbackGradient} shadow-sm transition-[transform,box-shadow] duration-700 ease-[var(--ease-luxury)] will-change-transform hover:-translate-y-1.5 hover:shadow-[0_35px_70px_-25px_rgba(0,0,0,0.35)] focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-4 ring-1 ring-black/5`}
        aria-label={`Explore the ${title} department — ${badge}. ${desc}`}
      >
        <div className="absolute inset-0 z-10 rounded-[1.5rem] md:rounded-[2.25rem] ring-1 ring-inset ring-white/10 pointer-events-none" />

        <img
          src={image}
          alt=""
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1400ms] ease-[var(--ease-luxury)] group-hover:scale-[1.04]"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent transition-opacity duration-700 ease-[var(--ease-luxury)] group-hover:from-black/70" />

        <div className="absolute top-6 left-6 z-20">
          <span className="inline-flex items-center rounded-full bg-white/10 px-3.5 py-1.5 text-[10px] font-medium uppercase tracking-[0.15em] text-white backdrop-blur-md ring-1 ring-white/20 shadow-sm transition-colors duration-500 ease-[var(--ease-luxury)] group-hover:bg-white/20 group-hover:ring-white/30">
            {badge}
          </span>
        </div>

        <div className="absolute bottom-0 left-0 flex w-full flex-col justify-end p-7 sm:p-9 md:p-11 lg:p-12 text-white z-20">
          <span className="mb-3 block text-[10px] font-medium uppercase tracking-[0.25em] text-white/70 transition-all duration-700 ease-[var(--ease-luxury)] group-hover:-translate-y-2 group-hover:text-white/90 md:group-focus-visible:-translate-y-2 md:group-focus-visible:text-white/90">
            {label}
          </span>

          <h3 className="mb-3 text-3xl md:text-4xl lg:text-5xl font-light tracking-tight transition-transform duration-700 ease-[var(--ease-luxury)] group-hover:-translate-y-2 md:group-focus-visible:-translate-y-2 [text-shadow:0_2px_24px_rgba(0,0,0,0.25)]">
            {title}
          </h3>

          <p className="max-w-sm text-sm md:text-base font-light text-white/80 transition-all duration-700 ease-[var(--ease-luxury)] leading-relaxed group-hover:-translate-y-2 group-hover:text-white md:group-focus-visible:-translate-y-2 md:group-focus-visible:text-white">
            {desc}
          </p>

          <div className="mt-6 flex items-center overflow-hidden h-7">
            <div
              className="flex items-center transform transition-all duration-700 ease-[var(--ease-luxury)]
                         translate-y-0 opacity-100
                         md:translate-y-8 md:opacity-0
                         md:group-hover:translate-y-0 md:group-hover:opacity-100
                         md:group-focus-visible:translate-y-0 md:group-focus-visible:opacity-100"
            >
              <span className="text-xs font-medium uppercase tracking-[0.2em]">
                Explore
              </span>
              <div className="relative ml-4 flex items-center justify-center overflow-hidden w-6 h-6 shrink-0">
                <ArrowRight
                  className="absolute w-5 h-5 md:-translate-x-full transition-transform duration-700 delay-100 ease-[var(--ease-luxury)] md:group-hover:translate-x-0 md:group-focus-visible:translate-x-0"
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

export default function DepartmentShowcase() {
  const shouldReduceMotion = useReducedMotion();

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
      className="w-full bg-white px-4 py-24 md:px-8 md:py-36"
      style={{ '--ease-luxury': 'cubic-bezier(0.16, 1, 0.3, 1)' }}
    >
      <div className="mx-auto max-w-[1800px]">

        <motion.div
          className="mb-20 md:mb-28 flex flex-col md:flex-row md:items-end md:justify-between gap-8"
          variants={headerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-100px' }}
        >
          <div className="max-w-2xl">
            <span className="mb-4 block text-[10px] font-medium uppercase tracking-[0.3em] text-neutral-500">
              SHOP BY DEPARTMENT
            </span>
            <h2 className="text-balance text-4xl md:text-6xl lg:text-7xl font-light tracking-tight text-neutral-900 leading-[1.1]">
              Something <br className="hidden md:block" />
              <span className="text-neutral-500 italic">for Everyone</span>
            </h2>
          </div>
          <p className="max-w-md text-base md:text-lg font-light text-neutral-600 leading-relaxed">
            Discover curated collections crafted for every generation, every celebration and every style.
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
          {departments.map((dept) => (
            <DepartmentCard key={dept.id} dept={dept} itemVariants={itemVariants} />
          ))}
        </motion.ul>
      </div>
    </section>
  );
}
