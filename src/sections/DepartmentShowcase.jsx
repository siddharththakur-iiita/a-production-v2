import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const departments = [
  {
    id: 'women',
    label: 'ATELIER',
    title: 'Women',
    desc: 'Elegant styles for every celebration.',
    image: '/placeholders/women.jpg',
    badge: 'New Collection',
    href: '/women',
    className: 'md:col-span-6 h-[550px] md:h-[750px]',
    fallbackGradient: 'from-stone-200 to-stone-300'
  },
  {
    id: 'men',
    label: 'MENSWEAR',
    title: 'Men',
    desc: 'Modern tailoring with timeless craftsmanship.',
    image: '/placeholders/men.jpg',
    badge: 'Editor\'s Pick',
    href: '/men',
    className: 'md:col-span-6 h-[550px] md:h-[750px]',
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
    className: 'md:col-span-5 h-[450px] md:h-[600px]',
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
    className: 'md:col-span-7 h-[450px] md:h-[600px]',
    fallbackGradient: 'from-zinc-800 to-zinc-900'
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 40 },
  show: {
    opacity: 1,
    y: 0,
    transition: { 
      duration: 1.2, 
      ease: [0.16, 1, 0.3, 1] 
    }
  }
};

const headerVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 1, ease: [0.16, 1, 0.3, 1] }
  }
};

export default function DepartmentShowcase() {
  return (
    <section className="w-full bg-white px-4 py-20 md:px-8 md:py-32">
      <div className="mx-auto max-w-[1800px]">
        
        <motion.div 
          className="mb-16 md:mb-24 flex flex-col md:flex-row md:items-end md:justify-between gap-8"
          variants={headerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
        >
          <div className="max-w-2xl">
            <span className="mb-4 block text-[10px] font-medium uppercase tracking-[0.25em] text-neutral-500">
              SHOP BY DEPARTMENT
            </span>
            <h2 className="text-4xl md:text-6xl lg:text-7xl font-light tracking-tight text-neutral-900 leading-[1.1]">
              Something <br className="hidden md:block" />
              <span className="text-neutral-500 italic">for Everyone</span>
            </h2>
          </div>
          <p className="max-w-md text-base md:text-lg font-light text-neutral-600 leading-relaxed">
            Discover curated collections crafted for every generation, every celebration and every style.
          </p>
        </motion.div>

        <motion.div 
          className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 lg:gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
        >
          {departments.map((dept) => (
            <motion.div
              key={dept.id}
              variants={itemVariants}
              className={`w-full ${dept.className}`}
            >
              <Link
                to={dept.href}
                className={`group relative block h-full w-full overflow-hidden rounded-[2rem] bg-gradient-to-br ${dept.fallbackGradient} shadow-sm transition-all duration-700 ease-[0.16,1,0.3,1] hover:shadow-xl hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-4 ring-1 ring-black/5`}
                aria-label={`Explore ${dept.title} department`}
              >
                <div className="absolute inset-0 z-10 rounded-[2rem] ring-1 ring-inset ring-white/10 pointer-events-none" />
                
                <img
                  src={dept.image}
                  alt={dept.title}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1.5s] ease-[0.16,1,0.3,1] group-hover:scale-[1.03]"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent transition-opacity duration-700 group-hover:from-black/70" />

                <div className="absolute top-6 left-6 z-20">
                  <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.15em] text-white backdrop-blur-md ring-1 ring-white/20 shadow-sm transition-colors duration-500 group-hover:bg-white/20 group-hover:ring-white/30">
                    {dept.badge}
                  </span>
                </div>

                <div className="absolute bottom-0 left-0 flex w-full flex-col justify-end p-8 md:p-10 lg:p-12 text-white z-20">
                  <span className="mb-3 block text-[10px] font-medium uppercase tracking-[0.25em] text-white/70 transition-all duration-700 ease-[0.16,1,0.3,1] group-hover:-translate-y-2 group-hover:text-white/90">
                    {dept.label}
                  </span>
                  
                  <h3 className="mb-3 text-3xl md:text-4xl lg:text-5xl font-light tracking-tight transition-transform duration-700 ease-[0.16,1,0.3,1] group-hover:-translate-y-2">
                    {dept.title}
                  </h3>
                  
                  <p className="max-w-sm text-sm md:text-base font-light text-white/80 transition-all duration-700 ease-[0.16,1,0.3,1] group-hover:-translate-y-2 group-hover:text-white">
                    {dept.desc}
                  </p>

                  <div className="mt-6 flex items-center overflow-hidden h-6">
                    <div className="flex items-center transform translate-y-8 opacity-0 transition-all duration-700 ease-[0.16,1,0.3,1] group-hover:translate-y-0 group-hover:opacity-100">
                      <span className="text-xs font-medium uppercase tracking-[0.2em]">
                        Explore
                      </span>
                      <div className="relative ml-4 flex items-center justify-center overflow-hidden w-6 h-6">
                        <svg 
                          className="absolute w-5 h-5 transform -translate-x-full transition-transform duration-700 delay-100 ease-[0.16,1,0.3,1] group-hover:translate-x-0" 
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor" 
                          strokeWidth={1.5}
                          aria-hidden="true"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}