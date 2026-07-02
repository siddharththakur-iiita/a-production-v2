
import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ChevronDown, ArrowRight } from 'lucide-react';
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const ease = [0.25, 0.1, 0.25, 1];

const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 1.2, ease } 
  }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2 }
  }
};

const collectionsData = [
  {
    id: 1,
    title: "Women's Collection",
    label: "Prêt-à-Porter",
    desc: "Redefining contemporary elegance with fluid silhouettes, intricate detailing, and master craftsmanship.",
    img: "/placeholders/women.jpg",
    span: "col-span-1 md:col-span-2 lg:col-span-8",
    aspect: "aspect-[16/9]"
  },
  {
    id: 2,
    title: "Men's Collection",
    label: "Sartorial Excellence",
    desc: "Sharp, structured, and inherently timeless menswear tailored for the modern gentleman.",
    img: "/placeholders/men.jpg",
    span: "col-span-1 md:col-span-2 lg:col-span-4",
    aspect: "aspect-[3/4]"
  },
  {
    id: 3,
    title: "Kids Collection",
    label: "Little Luxuries",
    desc: "Playful yet refined ensembles crafted with the softest premium fabrics for the next generation.",
    img: "/placeholders/kids.jpg",
    span: "col-span-1 md:col-span-2 lg:col-span-4",
    aspect: "aspect-[3/4]"
  },
  {
    id: 4,
    title: "Bridal Couture",
    label: "The Heritage",
    desc: "Exquisite hand-embroidered masterpieces designed for your most unforgettable moments.",
    img: "/placeholders/bridal.jpg",
    span: "col-span-1 md:col-span-2 lg:col-span-8",
    aspect: "aspect-[16/9]"
  },
  {
    id: 5,
    title: "Festive Edit",
    label: "Celebration",
    desc: "Vibrant hues and rich heritage textiles celebrating the essence of grand Indian festivities.",
    img: "/placeholders/festive.jpg",
    span: "col-span-1 lg:col-span-6",
    aspect: "aspect-[4/5]"
  },
  {
    id: 6,
    title: "Contemporary Casual",
    label: "Everyday Luxury",
    desc: "Elevated essentials and relaxed fits designed for effortless transition from day to evening.",
    img: "/placeholders/casual.jpg",
    span: "col-span-1 lg:col-span-6",
    aspect: "aspect-[4/5]"
  }
];

const Collections = () => {
  return (
    <>
      <Navbar />
      <main className="bg-[#FCFBF9] text-[#111111] font-sans antialiased overflow-hidden selection:bg-[#111111] selection:text-[#FCFBF9]">
        
        <section className="relative h-screen w-full flex flex-col items-center justify-center overflow-hidden">
          <motion.div 
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.8, ease }}
            className="absolute inset-0 z-0"
          >
            <div className="absolute inset-0 bg-black/30 z-10" />
            <img 
              src="/placeholders/hero-collections.jpg" 
              alt="Luxury Collections Hero" 
              className="w-full h-full object-cover"
              loading="eager"
            />
          </motion.div>

          <div className="relative z-20 text-center text-[#FCFBF9] flex flex-col items-center mt-24 px-6">
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, delay: 0.2, ease }}
              className="font-serif text-6xl md:text-8xl lg:text-9xl tracking-tight mb-6"
            >
              The World of A Productions
            </motion.h1>
            
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, delay: 0.4, ease }}
              className="text-lg md:text-2xl font-light tracking-wide mb-8"
            >
              Curated for Every Occasion
            </motion.h2>

            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.2, delay: 0.6, ease }}
              className="max-w-xl mx-auto text-sm md:text-base font-light text-[#FCFBF9]/80 leading-relaxed"
            >
              Discover our meticulously crafted ranges, designed to transcend seasons and define personal elegance. Each piece is a testament to our dedication to museum-quality artistry.
            </motion.p>
          </div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.2 }}
            className="absolute bottom-12 z-20 flex flex-col items-center text-[#FCFBF9]/70"
          >
            <span className="text-[10px] uppercase tracking-[0.3em] mb-4">Discover</span>
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <ChevronDown className="w-5 h-5 font-light" />
            </motion.div>
          </motion.div>
        </section>

        <section className="py-32 md:py-48 px-6 md:px-12 bg-[#FCFBF9]">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeInUp}
            className="max-w-4xl mx-auto text-center"
          >
            <p className="font-serif text-3xl md:text-5xl lg:text-6xl leading-[1.3] text-[#111111]">
              We view clothing not merely as fabric, but as the canvas upon which personal history is gracefully written.
            </p>
          </motion.div>
        </section>

        <section className="px-6 md:px-12 lg:px-24 pb-32 md:pb-48 max-w-[1920px] mx-auto">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 md:gap-16 lg:gap-24"
          >
            {collectionsData.map((item) => (
              <motion.div 
                key={item.id}
                variants={fadeInUp}
                className={`group flex flex-col ${item.span}`}
              >
                <div className="overflow-hidden rounded-2xl bg-[#f4f2ee] shadow-sm transition-shadow duration-700 group-hover:shadow-xl">
                  <Link to={`/collections/${item.title.toLowerCase().replace(/ /g, '-')}`} className="block overflow-hidden">
                    <motion.div className={`relative w-full ${item.aspect} overflow-hidden`}>
                      <img 
                        src={item.img} 
                        alt={item.title} 
                        className="w-full h-full object-cover transition-transform duration-[1.5s] ease-[0.25,0.1,0.25,1] group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/0 transition-colors duration-700 group-hover:bg-black/10" />
                    </motion.div>
                  </Link>
                </div>
                
                <div className="mt-10 flex flex-col items-start px-2">
                  <span className="text-[11px] uppercase tracking-[0.25em] text-[#555555] mb-4">
                    {item.label}
                  </span>
                  <h3 className="font-serif text-3xl md:text-4xl text-[#111111] mb-4">
                    {item.title}
                  </h3>
                  <p className="text-[#555555] text-sm md:text-base leading-relaxed mb-8 max-w-md font-light">
                    {item.desc}
                  </p>
                  <Link 
                    to={`/collections/${item.title.toLowerCase().replace(/ /g, '-')}`}
                    className="inline-flex items-center space-x-3 group/btn"
                  >
                    <span className="text-sm uppercase tracking-widest text-[#111111] border-b border-transparent transition-colors duration-300 group-hover/btn:border-[#111111]">
                      Explore Collection
                    </span>
                    <ArrowRight className="w-4 h-4 text-[#111111] opacity-0 -translate-x-4 transition-all duration-500 ease-out group-hover/btn:opacity-100 group-hover/btn:translate-x-0" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </section>

        <section className="relative w-full py-32 md:py-48 overflow-hidden bg-[#111111] text-[#FCFBF9]">
          <div className="absolute inset-0 z-0 opacity-40">
            <img 
              src="/placeholders/atelier-banner.jpg" 
              alt="Bespoke Atelier" 
              className="w-full h-full object-cover grayscale"
              loading="lazy"
            />
          </div>
          <div className="relative z-10 max-w-5xl mx-auto px-6 text-center flex flex-col items-center">
            <motion.span 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInUp}
              className="text-xs uppercase tracking-[0.3em] text-[#FCFBF9]/70 mb-8"
            >
              The Atelier
            </motion.span>
            <motion.h2 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInUp}
              className="font-serif text-5xl md:text-7xl lg:text-8xl mb-8"
            >
              Bespoke Tailoring
            </motion.h2>
            <motion.p 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInUp}
              className="text-base md:text-lg font-light text-[#FCFBF9]/80 max-w-2xl leading-relaxed mb-12"
            >
              Experience the zenith of personalization. Our master tailors collaborate intimately with you to construct garments that map flawlessly to your physique and lifestyle, upholding a legacy of uncompromising precision.
            </motion.p>
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInUp}
            >
              <Link 
                to="/bespoke"
                className="inline-block px-10 py-5 bg-[#FCFBF9] text-[#111111] text-sm uppercase tracking-widest hover:bg-[#e5e4e1] transition-colors duration-500 rounded-full"
              >
                Book Consultation
              </Link>
            </motion.div>
          </div>
        </section>

        <section className="py-32 md:py-56 px-6 bg-[#FCFBF9]">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={fadeInUp}
            className="max-w-5xl mx-auto text-center"
          >
            <blockquote className="font-serif text-4xl md:text-6xl lg:text-7xl leading-[1.2] text-[#111111]">
              "Every garment begins with intention and is perfected through craftsmanship."
            </blockquote>
          </motion.div>
        </section>

        <section className="py-24 md:py-40 px-6 bg-[#f4f2ee] rounded-t-[3rem] md:rounded-t-[5rem]">
          <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
            <motion.h2 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInUp}
              className="font-serif text-4xl md:text-6xl text-[#111111] mb-16"
            >
              Begin Your Journey
            </motion.h2>
            
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="flex flex-col md:flex-row items-center justify-center gap-6 w-full md:w-auto"
            >
              <motion.div variants={fadeInUp} className="w-full md:w-auto">
                <Link to="/collections/women" className="flex items-center justify-center w-full md:w-auto px-10 py-5 border border-[#111111] text-[#111111] text-sm uppercase tracking-widest rounded-full hover:bg-[#111111] hover:text-[#FCFBF9] transition-all duration-500">
                  Explore Women
                </Link>
              </motion.div>
              <motion.div variants={fadeInUp} className="w-full md:w-auto">
                <Link to="/collections/men" className="flex items-center justify-center w-full md:w-auto px-10 py-5 border border-[#111111] text-[#111111] text-sm uppercase tracking-widest rounded-full hover:bg-[#111111] hover:text-[#FCFBF9] transition-all duration-500">
                  Explore Men
                </Link>
              </motion.div>
              <motion.div variants={fadeInUp} className="w-full md:w-auto">
                <Link to="/bespoke" className="flex items-center justify-center w-full md:w-auto px-10 py-5 bg-[#111111] border border-[#111111] text-[#FCFBF9] text-sm uppercase tracking-widest rounded-full hover:bg-[#333333] hover:border-[#333333] transition-all duration-500 shadow-lg shadow-black/10">
                  Book Consultation
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
};

export default memo(Collections);

