import React, { useState, useRef, memo } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Scissors, Ruler, Gem } from 'lucide-react';

// Base64 encoded SVG to prevent markdown link corruption and guarantee valid rendering
const NOISE_SVG = 'data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjAwIDIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZmlsdGVyIGlkPSJub2lzZSI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuOCIgbnVtT2N0YXZlcz0iNCIgc3RpdGNoVGlsZXM9InN0aXRjaCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNub2lzZSkiLz48L3N2Zz4=';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: { 
      duration: 1.4, 
      ease: [0.16, 1, 0.3, 1] 
    }
  }
};

const imageVariants = {
  hidden: { opacity: 0, filter: 'blur(8px)', scale: 0.97 },
  show: {
    opacity: 1,
    filter: 'blur(0px)',
    scale: 1,
    transition: {
      duration: 1.8,
      ease: [0.16, 1, 0.3, 1]
    }
  }
};

const CustomTailoring = memo(() => {
  const [imageError, setImageError] = useState(false);
  const sectionRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"]
  });

  const imageY = useTransform(scrollYProgress, [0, 1], [8, -8]);

  return (
    <section 
      ref={sectionRef}
      aria-labelledby="atelier-heading"
      className="relative w-full overflow-hidden bg-[#FCFBF9] px-4 py-32 md:px-8 md:py-48 lg:py-56"
    >
      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_40%_30%,_#FFFFFF_0%,_transparent_75%)] opacity-90" />
      
      <div 
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.015]" 
        style={{ backgroundImage: `url(${NOISE_SVG})` }} 
      />

      <div className="relative z-10 mx-auto max-w-[1800px]">
        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-12 lg:gap-24">
          
          <motion.div 
            className="flex flex-col justify-center lg:col-span-4 lg:pr-12"
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
          >
            <motion.span 
              variants={itemVariants}
              className="mb-12 block text-[9px] font-medium uppercase tracking-[0.4em] text-[#8C8273]"
            >
              Atelier Service
            </motion.span>
            
            <motion.h2 
              id="atelier-heading"
              variants={itemVariants}
              className="mb-14 text-5xl font-light leading-[1.05] tracking-tight text-[#111111] md:text-6xl lg:text-[5.5rem]"
            >
              Create Something <br />
              <span className="font-serif italic text-[#333333]">Exclusively Yours</span>
            </motion.h2>
            
            <motion.p 
              variants={itemVariants}
              className="mb-16 max-w-md text-base font-light leading-[1.9] text-[#555555] md:text-xl"
            >
              Every garment begins with your vision. Experience the pinnacle of luxury fashion through our bespoke service. Our master artisans will meticulously measure and craft a silhouette tailored exclusively for you.
            </motion.p>
            
            <motion.div variants={itemVariants} className="mb-24">
              <Link
                to="/tailoring/consultation"
                className="group inline-flex items-center justify-center rounded-full bg-neutral-900 px-10 py-4 text-[11px] font-medium uppercase tracking-[0.2em] text-white outline-none ring-1 ring-transparent transition-all duration-700 ease-[0.16,1,0.3,1] hover:-translate-y-1 hover:bg-black hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)] focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-4 focus-visible:ring-offset-[#FCFBF9]"
                aria-label="Book a custom tailoring consultation"
              >
                <span>Book Custom Consultation</span>
                <ArrowRight 
                  className="ml-4 h-4 w-4 transition-transform duration-700 ease-[0.16,1,0.3,1] group-hover:translate-x-2" 
                  strokeWidth={1.5} 
                  aria-hidden="true" 
                />
              </Link>
            </motion.div>

            <motion.div 
              variants={itemVariants}
              className="flex flex-wrap items-center gap-5"
            >
              {[
                { label: 'Handcrafted', icon: Scissors },
                { label: 'Made To Measure', icon: Ruler },
                { label: 'Premium Fabrics', icon: Gem }
              ].map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div 
                    key={index} 
                    className="group flex cursor-default items-center gap-4 rounded-full border border-black/[0.03] bg-[#FAFAFA]/60 px-6 py-2.5 backdrop-blur-md transition-all duration-700 hover:border-black/[0.06] hover:bg-white hover:shadow-sm"
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-full border border-black/5 bg-white/50 transition-colors duration-700 group-hover:bg-white">
                      <Icon className="h-2.5 w-2.5 text-[#8C8273]" strokeWidth={1.5} />
                    </div>
                    <span className="text-[9px] font-medium uppercase tracking-[0.25em] text-[#444444]">
                      {feature.label}
                    </span>
                  </div>
                );
              })}
            </motion.div>
          </motion.div>

          <motion.div 
            className="relative lg:col-span-8"
            variants={imageVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
          >
            <div className="pointer-events-none absolute -inset-12 z-0 bg-[radial-gradient(circle_at_center,_#FFFFFF_0%,_transparent_60%)] opacity-70 blur-3xl" />
            
            <motion.div 
              style={{ y: imageY }}
              className="group relative z-10 w-full overflow-hidden rounded-[2.5rem] bg-[#F7F5F0] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.03] aspect-[4/5] lg:aspect-[4/3]"
            >
              <div className="pointer-events-none absolute inset-0 z-20 rounded-[2.5rem] ring-1 ring-inset ring-white/40" />
              
              <div className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-t from-black/20 via-transparent to-black/5 opacity-40 mix-blend-multiply transition-opacity duration-1000 group-hover:opacity-20" />

              <div className="absolute bottom-8 left-8 z-30 md:bottom-12 md:left-12">
                <div className="flex flex-col items-start justify-center rounded-2xl border border-white/10 bg-white/5 px-8 py-6 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.05)] transition-all duration-700 group-hover:border-white/20 group-hover:bg-white/10">
                  <span className="mb-2 text-[8px] font-medium uppercase tracking-[0.4em] text-white/70 drop-shadow-sm">
                    BESPOKE ATELIER
                  </span>
                  <span className="font-serif text-xl font-light italic text-white drop-shadow-sm">
                    Made to Measure
                  </span>
                </div>
              </div>

              {!imageError ? (
                <img
                  src="/custom-tailoring.jpg"
                  alt="A bespoke atelier showcasing custom luxury tailoring and premium fabrics"
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-[2.5s] ease-[0.16,1,0.3,1] group-hover:scale-[1.02]"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#FDFCFB] to-[#F2EFE9]">
                  <div 
                    className="absolute inset-0 opacity-[0.03]" 
                    style={{ backgroundImage: `url(${NOISE_SVG})` }} 
                  />
                  <div className="relative z-10 flex flex-col items-center gap-5 opacity-80">
                    <span className="text-[9px] font-medium uppercase tracking-[0.5em] text-[#8C8273]">
                      A Productions
                    </span>
                    <span className="font-serif text-3xl font-light italic text-[#333333]">
                      Atelier
                    </span>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>

        </div>
      </div>
    </section>
  );
});

CustomTailoring.displayName = 'CustomTailoring';

export default CustomTailoring;