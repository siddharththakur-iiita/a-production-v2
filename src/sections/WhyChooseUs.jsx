import React, { useRef, memo } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Scissors, Ruler, Gem, Hourglass } from 'lucide-react';

const NOISE_SVG = 'data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjAwIDIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZmlsdGVyIGlkPSJub2lzZSI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuOCIgbnVtT2N0YXZlcz0iNCIgc3RpdGNoVGlsZXM9InN0aXRjaCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNub2lzZSkiLz48L3N2Zz4=';

const features = [
  {
    id: 1,
    label: 'ARTISTRY',
    title: 'Master Craftsmanship',
    desc: 'Meticulously handcrafted by master artisans with decades of heritage expertise.',
    icon: Scissors,
  },
  {
    id: 2,
    label: 'BESPOKE',
    title: 'Made to Measure',
    desc: 'An uncompromising fit, tailored exclusively to your unique silhouette and vision.',
    icon: Ruler,
  },
  {
    id: 3,
    label: 'MATERIALS',
    title: 'Premium Fabrics',
    desc: 'Sourced from the finest mills globally, ensuring an unmatched tactile experience.',
    icon: Gem,
  },
  {
    id: 4,
    label: 'AESTHETIC',
    title: 'Timeless Design',
    desc: 'Silhouettes that transcend seasons, blending Indian heritage with modern elegance.',
    icon: Hourglass,
  },
];

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

const WhyChooseUs = memo(() => {
  const sectionRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"]
  });

  const subtleY = useTransform(scrollYProgress, [0, 1], [15, -15]);

  return (
    <section 
      ref={sectionRef}
      aria-labelledby="why-choose-us-heading"
      className="relative w-full overflow-hidden bg-[#FCFBF9] px-4 py-32 md:px-8 md:py-48 lg:py-56"
    >
      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_70%_40%,_#FFFFFF_0%,_transparent_70%)] opacity-90" />
      
      <div 
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.02]" 
        style={{ backgroundImage: `url(${NOISE_SVG})` }} 
      />

      <div className="relative z-10 mx-auto max-w-[1800px]">
        <div className="grid grid-cols-1 gap-20 lg:grid-cols-12 lg:gap-16 xl:gap-24">
          
          <motion.div 
            className="flex flex-col justify-center lg:col-span-5 lg:pr-8"
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
          >
            <motion.span 
              variants={itemVariants}
              className="mb-12 block text-[9px] font-medium uppercase tracking-[0.4em] text-[#8C8273]"
            >
              The A Productions Difference
            </motion.span>
            
            <motion.h2 
              id="why-choose-us-heading"
              variants={itemVariants}
              className="mb-14 text-5xl font-light leading-[1.05] tracking-tight text-[#111111] md:text-6xl lg:text-[6rem] xl:text-[6.5rem]"
            >
              Craftsmanship <br />
              <span className="font-serif italic text-[#333333]">Without Compromise</span>
            </motion.h2>
            
            <motion.p 
              variants={itemVariants}
              className="mb-12 max-w-lg text-base font-light leading-[1.9] text-[#555555] md:text-xl"
            >
              We believe that true luxury lies in the unseen details. Every garment we create is a testament to the uncompromising pursuit of perfection, blending profound Indian artistry with refined modern elegance.
            </motion.p>
            
            <motion.div 
              variants={itemVariants} 
              className="mb-14 h-px w-[120px] bg-[#EAE8E3]" 
            />
            
            <motion.div variants={itemVariants}>
              <Link
                to="/about"
                className="group inline-flex items-center justify-center rounded-full bg-neutral-900 px-10 py-4 text-[11px] font-medium uppercase tracking-[0.2em] text-white outline-none ring-1 ring-transparent transition-all duration-700 ease-[0.16,1,0.3,1] hover:-translate-y-1 hover:bg-black hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)] focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-4 focus-visible:ring-offset-[#FCFBF9]"
                aria-label="Discover our heritage and craftsmanship"
              >
                <span>Discover Our Heritage</span>
                <ArrowRight 
                  className="ml-4 h-4 w-4 transition-transform duration-700 ease-[0.16,1,0.3,1] group-hover:translate-x-2" 
                  strokeWidth={1.5} 
                  aria-hidden="true" 
                />
              </Link>
            </motion.div>
          </motion.div>

          <motion.div 
            className="lg:col-span-7 lg:col-start-6 xl:col-span-6 xl:col-start-7"
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            style={{ y: subtleY }}
          >
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8 lg:gap-12">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                const isEven = index % 2 !== 0;
                
                return (
                  <motion.article 
                    key={feature.id}
                    variants={itemVariants}
                    className={`group relative flex flex-col items-start overflow-hidden rounded-[2.5rem] bg-[#FAFAFA]/40 border border-black/[0.02] p-10 md:p-14 lg:p-16 backdrop-blur-md transition-all duration-700 ease-[0.16,1,0.3,1] hover:-translate-y-1.5 hover:bg-white hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.04)] hover:border-black/[0.03] ${isEven ? 'sm:mt-24 lg:mt-32 xl:mt-40' : ''}`}
                  >
                    <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-br from-white/60 to-transparent opacity-0 transition-opacity duration-700 group-hover:opacity-100" />
                    
                    <div className="relative z-10 mb-12 flex h-12 w-12 items-center justify-center rounded-full border border-black/[0.03] bg-white/60 transition-colors duration-700 group-hover:bg-[#FDFCFB]">
                      <Icon className="h-4 w-4 text-[#8C8273]" strokeWidth={1.5} />
                    </div>
                    
                    <span className="relative z-10 mb-6 block text-[8px] font-medium uppercase tracking-[0.3em] text-[#8C8273] transition-colors duration-700 group-hover:text-[#666666]">
                      {feature.label}
                    </span>
                    
                    <h3 className="relative z-10 mb-6 font-serif text-2xl font-light tracking-wide text-[#111111] md:text-3xl">
                      {feature.title}
                    </h3>
                    
                    <p className="relative z-10 text-sm font-light leading-[1.9] text-[#666666] md:text-base">
                      {feature.desc}
                    </p>
                  </motion.article>
                );
              })}
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
});

WhyChooseUs.displayName = 'WhyChooseUs';

export default WhyChooseUs;