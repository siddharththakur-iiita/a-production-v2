import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const collections = [
  {
    id: 'ethnic',
    label: 'HERITAGE',
    title: 'Ethnic',
    desc: 'Timeless heritage crafted for modern celebrations.',
    image: '/placeholders/ethnic.jpg',
    href: '/collections/ethnic',
    className: 'md:col-span-7 h-[550px] md:h-[750px]',
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
    className: 'md:col-span-5 h-[550px] md:h-[750px]',
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
    className: 'md:col-span-5 h-[500px] md:h-[650px]',
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
    className: 'md:col-span-7 h-[500px] md:h-[650px]',
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
    className: 'md:col-span-7 h-[500px] md:h-[650px]',
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
    className: 'md:col-span-5 h-[500px] md:h-[650px]',
    fallbackGradient: 'from-indigo-200 to-slate-300',
    overlay: 'from-slate-950/95 via-indigo-950/50 to-transparent group-hover:from-slate-950/100',
    accentText: 'text-indigo-200 group-hover:text-indigo-100'
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

const ctaVariants = {
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1] }
  }
};

export default function FeaturedCollections() {
  const [imageErrors, setImageErrors] = useState({});

  const handleImageError = (id) => {
    setImageErrors(prev => ({ ...prev, [id]: true }));
  };

  return (
    <section className="w-full bg-stone-50 px-4 py-20 md:px-8 md:py-32">
      <div className="mx-auto max-w-[1800px]">
        
        <motion.div 
          className="mb-16 md:mb-24 flex flex-col items-center text-center max-w-4xl mx-auto"
          variants={headerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
        >
          <span className="mb-6 block text-[10px] font-medium uppercase tracking-[0.3em] text-neutral-500">
            Curated Collections
          </span>
          <h2 className="mb-8 text-4xl md:text-6xl lg:text-7xl font-light tracking-tight text-neutral-900 leading-[1.1]">
            Every Occasion <br className="hidden md:block" />
            <span className="text-neutral-500 italic">Has Its Own Story</span>
          </h2>
          <p className="max-w-xl text-base md:text-lg font-light text-neutral-600 leading-relaxed">
            Discover collections thoughtfully curated for every celebration, every milestone and every personal style.
          </p>
        </motion.div>

        <motion.div 
          className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 lg:gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
        >
          {collections.map((collection) => (
            <motion.div
              key={collection.id}
              variants={itemVariants}
              className={`w-full ${collection.className}`}
            >
              <Link
                to={collection.href}
                className={`group relative block h-full w-full overflow-hidden rounded-[2rem] shadow-sm transition-all duration-700 ease-[0.16,1,0.3,1] hover:shadow-2xl hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-4 ring-1 ring-black/5 bg-gradient-to-br ${collection.fallbackGradient}`}
                aria-label={`Explore ${collection.title} collection`}
              >
                <div className="absolute inset-0 z-10 rounded-[2rem] ring-1 ring-inset ring-white/15 pointer-events-none transition-colors duration-700 group-hover:ring-white/25" />
                
                {!imageErrors[collection.id] && (
                  <img
                    src={collection.image}
                    alt={collection.title}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-[2s] ease-[0.16,1,0.3,1] group-hover:scale-[1.05]"
                    onError={() => handleImageError(collection.id)}
                  />
                )}
                
                <div className={`absolute inset-0 bg-gradient-to-t ${collection.overlay} transition-all duration-1000 ease-[0.16,1,0.3,1]`} />

                <div className="absolute bottom-0 left-0 flex w-full flex-col justify-end p-8 md:p-10 lg:p-14 text-white z-20">
                  <span className={`mb-4 block text-[10px] font-medium uppercase tracking-[0.25em] transition-colors duration-700 ease-[0.16,1,0.3,1] ${collection.accentText}`}>
                    {collection.label}
                  </span>
                  
                  <h3 className="mb-4 text-4xl md:text-5xl lg:text-6xl font-light tracking-tight transition-transform duration-700 ease-[0.16,1,0.3,1] group-hover:-translate-y-2">
                    {collection.title}
                  </h3>
                  
                  <p className="max-w-md text-sm md:text-base font-light text-white/80 transition-all duration-700 ease-[0.16,1,0.3,1] group-hover:-translate-y-2 group-hover:text-white/95 leading-relaxed">
                    {collection.desc}
                  </p>

                  <div className="mt-8 flex items-center overflow-hidden h-10">
                    <div className="flex items-center transform translate-y-10 opacity-0 transition-all duration-700 ease-[0.16,1,0.3,1] group-hover:translate-y-0 group-hover:opacity-100">
                      
                      <div className="relative overflow-hidden rounded-full bg-white/10 backdrop-blur-md px-6 py-2.5 ring-1 ring-white/20 transition-all duration-500 group-hover:bg-white/20">
                        <span className="relative z-10 text-[11px] font-medium uppercase tracking-[0.15em] text-white">
                          Explore Collection
                        </span>
                        
                        <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-[1.5s] ease-in-out group-hover:animate-[shimmer_1.5s_infinite]" />
                      </div>

                      <div className="relative ml-4 flex items-center justify-center overflow-hidden w-6 h-6">
                        <ArrowRight 
                          className="absolute w-5 h-5 transform -translate-x-full text-white transition-transform duration-700 delay-100 ease-[0.16,1,0.3,1] group-hover:translate-x-0" 
                          strokeWidth={1.5}
                          aria-hidden="true"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          variants={ctaVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="mt-20 md:mt-32 w-full overflow-hidden rounded-[2.5rem] bg-[#FAFAFA] px-6 py-16 md:px-12 md:py-24 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-black/5"
        >
          <div className="mx-auto max-w-2xl">
            <span className="mb-6 block text-[10px] font-medium uppercase tracking-[0.3em] text-neutral-500">
              Can't Find Your Style?
            </span>
            <h3 className="mb-6 text-3xl md:text-5xl lg:text-6xl font-light tracking-tight text-neutral-900">
              Create Something <br />
              <span className="italic text-neutral-500">Exclusively Yours</span>
            </h3>
            <p className="mb-10 text-base md:text-lg font-light text-neutral-600 leading-relaxed">
              Every garment begins with your vision. Our expert tailoring team will design, measure and craft a piece made exclusively for you.
            </p>
            
            <Link
              to="/tailoring/consultation"
              className="group inline-flex items-center justify-center rounded-full bg-neutral-900 px-8 py-4 text-sm font-light text-white transition-all duration-500 hover:bg-neutral-800 hover:shadow-xl hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 ring-1 ring-transparent"
            >
              <span>Book Custom Consultation</span>
              <ArrowRight className="ml-3 h-4 w-4 transition-transform duration-500 group-hover:translate-x-1" strokeWidth={1.5} />
            </Link>
          </div>
        </motion.div>

      </div>
    </section>
  );
}