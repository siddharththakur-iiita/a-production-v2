
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

const showcaseData = [
  {
    id: 'ethnic',
    title: "Ethnic Wear",
    label: "Heritage",
    desc: "A celebration of traditional Indian silhouettes reimagined with contemporary grace, featuring lightweight chanderis and intricate zari work.",
    img: "/placeholders/women-ethnic.jpg",
    span: "col-span-1 md:col-span-2 lg:col-span-7",
    aspect: "aspect-[4/3] md:aspect-[16/9]"
  },
  {
    id: 'bridal',
    title: "Bridal Couture",
    label: "The Masterpiece",
    desc: "Heirloom-quality lehengas and sarees, hand-embroidered by master artisans over thousands of hours for your most sacred moments.",
    img: "/placeholders/women-bridal.jpg",
    span: "col-span-1 md:col-span-2 lg:col-span-5",
    aspect: "aspect-[3/4]"
  },
  {
    id: 'festive',
    title: "Festive Edit",
    label: "Celebration",
    desc: "Vibrant, joyous ensembles designed to move gracefully through grand celebrations and intimate festive gatherings.",
    img: "/placeholders/women-festive.jpg",
    span: "col-span-1 md:col-span-2 lg:col-span-4",
    aspect: "aspect-[4/5]"
  },
  {
    id: 'contemporary',
    title: "Contemporary Luxury",
    label: "Modernity",
    desc: "Fluid drapes, structured tailoring, and minimalist embellishments for the global Indian woman.",
    img: "/placeholders/women-contemporary.jpg",
    span: "col-span-1 md:col-span-2 lg:col-span-8",
    aspect: "aspect-[4/3] md:aspect-[16/9]"
  },
  {
    id: 'casual',
    title: "Elevated Casuals",
    label: "Prêt-à-Porter",
    desc: "Refined everyday essentials crafted from breathable premium silks and organic cottons. Luxury in every thread.",
    img: "/placeholders/women-casual.jpg",
    span: "col-span-1 md:col-span-2 lg:col-span-12",
    aspect: "aspect-[16/9] lg:aspect-[21/9]"
  }
];

const materialsData = [
  {
    id: 1,
    title: "Pure Mulberry Silk",
    desc: "Sourced from the finest weavers, our silks offer an unmatched drape and a subtle, natural luster that ages beautifully."
  },
  {
    id: 2,
    title: "Hand Embroidery",
    desc: "Centuries-old techniques preserved by our master craftsmen, adding dimensional artistry and heirloom value to every garment."
  },
  {
    id: 3,
    title: "Premium Craftsmanship",
    desc: "Internal structuring, couture finishing, and uncompromising attention to detail ensure each piece fits flawlessly."
  }
];

const Women = () => {
  return (
    <>
      <Navbar />
      <main className="bg-[#FCFBF9] text-[#111111] font-sans antialiased overflow-hidden selection:bg-[#111111] selection:text-[#FCFBF9]">
        
        <section className="relative h-[90vh] w-full flex flex-col items-center justify-center overflow-hidden">
          <motion.div 
            animate={{ scale: [1, 1.03] }}
            transition={{ duration: 25, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
            className="absolute inset-0 z-0 origin-center"
          >
            <div className="absolute inset-0 bg-black/20 z-10" />
            <img 
              src="/placeholders/women-hero.jpg" 
              alt="Women's Collection Hero" 
              className="w-full h-full object-cover"
              loading="eager"
            />
          </motion.div>

          <div className="relative z-20 text-center text-[#FCFBF9] flex flex-col items-center mt-24 px-6">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#eaddcf]/20 via-transparent to-transparent blur-3xl -z-10 scale-150" />
            
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, delay: 0.2, ease }}
              className="font-serif text-6xl md:text-8xl lg:text-9xl tracking-tight mb-6"
            >
              Women's Collection
            </motion.h1>
            
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, delay: 0.4, ease }}
              className="text-lg md:text-2xl font-light tracking-wide mb-8"
            >
              Crafted For Modern Elegance
            </motion.h2>

            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.2, delay: 0.6, ease }}
              className="max-w-xl mx-auto text-sm md:text-base font-light text-[#FCFBF9]/80 leading-relaxed"
            >
              Explore our universe of exquisite textiles, masterful embroidery, and silhouettes designed to empower. A synthesis of Indian heritage and global sophistication.
            </motion.p>
          </div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.2 }}
            className="absolute bottom-12 z-20 flex flex-col items-center text-[#FCFBF9]/70"
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <ChevronDown className="w-5 h-5 font-light" />
            </motion.div>
          </motion.div>
        </section>

        <section className="py-32 md:py-48 px-6 md:px-12">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeInUp}
            className="max-w-5xl mx-auto text-center"
          >
            <h2 className="font-serif text-4xl md:text-5xl lg:text-7xl leading-[1.2] text-[#111111]">
              "The true essence of style is found in the delicate balance of storied heritage and contemporary grace."
            </h2>
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
            {showcaseData.map((item) => (
              <motion.div 
                key={item.id}
                variants={fadeInUp}
                className={`group flex flex-col ${item.span}`}
              >
                <div className="overflow-hidden rounded-2xl bg-[#f4f2ee]">
                  <Link to="/contact" className="block overflow-hidden cursor-pointer">
                    <motion.div className={`relative w-full ${item.aspect} overflow-hidden`}>
                      <img 
                        src={item.img} 
                        alt={item.title} 
                        className="w-full h-full object-cover transition-transform duration-[1.5s] ease-[0.25,0.1,0.25,1] group-hover:scale-[1.04]"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/0 transition-colors duration-700 group-hover:bg-black/5" />
                    </motion.div>
                  </Link>
                </div>
                
                <div className="mt-10 flex flex-col items-start px-2">
                  <span className="text-[11px] uppercase tracking-[0.25em] text-[#555555] mb-4">
                    {item.label}
                  </span>
                  <h3 className="font-serif text-3xl md:text-4xl lg:text-5xl text-[#111111] mb-5">
                    {item.title}
                  </h3>
                  <p className="text-[#555555] text-sm md:text-base leading-relaxed mb-8 max-w-lg font-light transition-transform duration-500 ease-out group-hover:-translate-y-[2px]">
                    {item.desc}
                  </p>
                  <Link 
                    to="/contact"
                    className="inline-flex items-center space-x-3 group/btn"
                  >
                    <span className="text-sm uppercase tracking-widest text-[#111111] pb-1 bg-left-bottom bg-[length:0%_1px] bg-no-repeat transition-[background-size] duration-500 ease-out group-hover/btn:bg-[length:100%_1px] bg-gradient-to-r from-[#111111] to-[#111111]">
                      Explore Collection
                    </span>
                    <ArrowRight className="w-4 h-4 text-[#111111] opacity-0 -translate-x-4 transition-all duration-500 ease-out group-hover/btn:opacity-100 group-hover/btn:translate-x-0" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </section>

        <section className="relative w-full py-48 lg:py-64 overflow-hidden bg-[#111111]">
          <motion.div 
            initial={{ scale: 1.05 }}
            whileInView={{ scale: 1 }}
            transition={{ duration: 1.5, ease }}
            viewport={{ once: true }}
            className="absolute inset-0 z-0"
          >
            <img 
              src="/placeholders/women-signature.jpg" 
              alt="Signature Piece" 
              className="w-full h-full object-cover opacity-80"
              loading="lazy"
            />
          </motion.div>
          <div className="relative z-20 h-full max-w-[1920px] mx-auto px-6 md:px-12 lg:px-24 flex items-center justify-center md:justify-end text-center md:text-left">
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInUp}
              className="relative max-w-xl text-[#FCFBF9]"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#eaddcf]/15 via-transparent to-transparent blur-3xl -z-10 scale-150" />
              <span className="text-xs uppercase tracking-[0.3em] text-[#FCFBF9]/70 mb-6 block">
                The Mastercraft
              </span>
              <h2 className="font-serif text-5xl md:text-7xl mb-8 leading-tight">
                An Ode to Heritage
              </h2>
              <p className="text-base md:text-lg font-light text-[#FCFBF9]/80 leading-relaxed">
                Discover our signature pieces. Each garment is an architectural marvel of fabric and thread, demanding absolute dedication and devotion from our master artisans to breathe life into the archives of antiquity.
              </p>
            </motion.div>
          </div>
        </section>

        <section className="py-32 md:py-48 px-6 md:px-12 lg:px-24 max-w-[1920px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center relative lg:before:absolute lg:before:inset-y-12 lg:before:left-1/2 lg:before:w-px lg:before:bg-[#555555]/10 lg:before:-translate-x-1/2">
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={fadeInUp}
              className="order-2 lg:order-1 flex flex-col items-start lg:pr-12"
            >
              <span className="text-[11px] uppercase tracking-[0.3em] text-[#555555] mb-6">
                Personalized Service
              </span>
              <h2 className="font-serif text-4xl md:text-6xl text-[#111111] mb-8">
                The Bespoke Experience
              </h2>
              <p className="text-[#555555] text-base md:text-lg font-light leading-relaxed mb-12 max-w-md">
                True luxury is defined by perfect fit. Our bespoke service allows you to customize fabrics, embroideries, and silhouettes to create a garment that is distinctly yours.
              </p>
              
              <div className="space-y-8 w-full max-w-md mb-12">
                <div className="flex flex-col border-b border-[#111111]/10 pb-6">
                  <span className="font-serif text-xl text-[#111111] mb-2">01. Consultation</span>
                  <span className="text-sm font-light text-[#555555]">A private appointment to understand your vision, occasion, and styling preferences.</span>
                </div>
                <div className="flex flex-col border-b border-[#111111]/10 pb-6">
                  <span className="font-serif text-xl text-[#111111] mb-2">02. Luxury Fabrics</span>
                  <span className="text-sm font-light text-[#555555]">Selection from our private archives of pure silks, organzas, and heritage motifs.</span>
                </div>
                <div className="flex flex-col border-b border-[#111111]/10 pb-6">
                  <span className="font-serif text-xl text-[#111111] mb-2">03. Exacting Measurements</span>
                  <span className="text-sm font-light text-[#555555]">Precise calibrations to ensure a flawless, statuesque fit.</span>
                </div>
                <div className="flex flex-col border-b border-[#111111]/10 pb-6">
                  <span className="font-serif text-xl text-[#111111] mb-2">04. Hand Finishing</span>
                  <span className="text-sm font-light text-[#555555]">The final couture touches applied by hand for uncompromising refinement.</span>
                </div>
              </div>

              <Link 
                to="/contact"
                className="inline-block px-10 py-5 bg-[#111111] text-[#FCFBF9] text-sm uppercase tracking-widest hover:bg-[#333333] transition-colors duration-500 rounded-full"
              >
                Book Consultation
              </Link>
            </motion.div>

            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={fadeInUp}
              className="order-1 lg:order-2 w-full aspect-[4/5] overflow-hidden rounded-2xl bg-[#f4f2ee] lg:ml-12"
            >
              <img 
                src="/placeholders/women-bespoke.jpg" 
                alt="Bespoke Experience" 
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </motion.div>
          </div>
        </section>

        <section className="py-32 px-6 md:px-12 lg:px-24 bg-[#f4f2ee]">
          <div className="max-w-[1920px] mx-auto">
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-24"
            >
              {materialsData.map((item, index) => (
                <motion.div 
                  key={item.id}
                  variants={fadeInUp}
                  className="flex flex-col border-t border-[#111111]/10 pt-10"
                >
                  <span className="text-[#555555] text-sm mb-10 font-serif italic">No. 0{index + 1}</span>
                  <h3 className="font-serif text-2xl md:text-3xl text-[#111111] mb-4">
                    {item.title}
                  </h3>
                  <p className="text-[#555555] font-light text-sm md:text-base leading-loose">
                    {item.desc}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        <section className="py-32 md:py-48 px-6">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={fadeInUp}
            className="max-w-5xl mx-auto text-center"
          >
            <blockquote className="font-serif text-3xl md:text-5xl lg:text-6xl leading-[1.3] text-[#111111]">
              "True elegance is a quiet revelation, felt deeply in every thread and sculpted fold."
            </blockquote>
          </motion.div>
        </section>

        <section className="py-24 md:py-40 px-6 bg-[#111111] text-[#FCFBF9] rounded-t-[3rem] md:rounded-t-[5rem]">
          <div className="max-w-5xl mx-auto text-center flex flex-col items-center">
            <motion.h2 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInUp}
              className="font-serif text-4xl md:text-6xl lg:text-7xl mb-16"
            >
              Create Your Signature Look
            </motion.h2>
            
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="flex flex-col md:flex-row items-center justify-center gap-6 w-full md:w-auto"
            >
              <motion.div variants={fadeInUp} className="w-full md:w-auto">
                <Link to="/contact" className="flex items-center justify-center w-full md:w-auto px-10 py-5 bg-[#FCFBF9] text-[#111111] text-sm uppercase tracking-widest rounded-full hover:bg-[#e5e4e1] hover:-translate-y-[2px] transition-all duration-500">
                  Book Consultation
                </Link>
              </motion.div>
              <motion.div variants={fadeInUp} className="w-full md:w-auto">
                <Link to="/contact" className="flex items-center justify-center w-full md:w-auto px-10 py-5 border border-[#FCFBF9]/30 text-[#FCFBF9] text-sm uppercase tracking-widest rounded-full hover:border-[#FCFBF9] hover:bg-[#FCFBF9]/10 transition-colors duration-500">
                  Explore Bridal
                </Link>
              </motion.div>
              <motion.div variants={fadeInUp} className="w-full md:w-auto">
                <Link to="/contact" className="flex items-center justify-center w-full md:w-auto px-10 py-5 border border-[#FCFBF9]/30 text-[#FCFBF9] text-sm uppercase tracking-widest rounded-full hover:border-[#FCFBF9] hover:bg-[#FCFBF9]/10 transition-colors duration-500">
                  Contact Us
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

export default memo(Women);

