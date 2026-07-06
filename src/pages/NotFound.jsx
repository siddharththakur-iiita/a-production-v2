import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  Sparkles, 
  User, 
  Smile, 
  Scissors, 
  Info, 
  MessageCircle, 
  Layers 
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const NotFound = () => {
  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const destinations = [
    { path: "/women", title: "Women", desc: "Timeless elegance and exquisite craftsmanship.", icon: <Sparkles size={24} aria-hidden="true" /> },
    { path: "/men", title: "Men", desc: "Structured silhouettes and heritage tailoring.", icon: <User size={24} aria-hidden="true" /> },
    { path: "/kids", title: "Kids", desc: "Uncompromising quality for the little ones.", icon: <Smile size={24} aria-hidden="true" /> },
    { path: "/custom-tailoring", title: "Custom Tailoring", desc: "Bespoke garments crafted exclusively for you.", icon: <Scissors size={24} aria-hidden="true" /> },
    { path: "/collections", title: "Collections", desc: "Explore our complete curated archives.", icon: <Layers size={24} aria-hidden="true" /> },
    { path: "/about", title: "About", desc: "Discover the heritage of A Productions.", icon: <Info size={24} aria-hidden="true" /> },
    { path: "/contact", title: "Contact", desc: "Speak with our dedicated concierge team.", icon: <MessageCircle size={24} aria-hidden="true" /> }
  ];

  return (
    <div className="min-h-screen bg-[#FCFAF8] text-[#2C2420] font-sans selection:bg-[#EAE5DF] selection:text-[#2C2420] flex flex-col relative">
      {/* Subtle Animated Background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        <motion.div 
          animate={{ x: [0, 30, 0], y: [0, 40, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute top-[10%] left-[5%] w-[40vw] h-[40vw] max-w-[600px] max-h-[600px] bg-[#B89768]/[0.04] rounded-full blur-3xl" 
        />
        <motion.div 
          animate={{ x: [0, -40, 0], y: [0, 30, 0] }}
          transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
          className="absolute top-[40%] right-[5%] w-[35vw] h-[35vw] max-w-[500px] max-h-[500px] bg-[#2C2420]/[0.02] rounded-full blur-3xl" 
        />
        <motion.div 
          animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[10%] left-[25%] w-[45vw] h-[45vw] max-w-[700px] max-h-[700px] bg-[#B89768]/[0.03] rounded-full blur-3xl" 
        />
      </div>

      <Navbar />

      <main className="flex-grow relative z-10">
        {/* Hero & Illustration Section */}
        <section className="pt-40 pb-24 px-6 md:px-12 lg:px-24 overflow-hidden">
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="max-w-5xl mx-auto text-center"
          >
            <motion.span variants={fadeUp} className="text-[#B89768] tracking-[0.25em] uppercase text-xs font-semibold mb-6 block">
              Error 404
            </motion.span>
            
            <motion.h1 variants={fadeUp} className="text-4xl md:text-6xl lg:text-7xl font-serif font-light mb-8 text-[#2C2420] tracking-wide leading-tight">
              The Page You're Looking For <br className="hidden md:block" /> Doesn't Exist
            </motion.h1>
            
            <motion.p variants={fadeUp} className="text-[#5C4D44] text-lg font-light max-w-2xl mx-auto mb-16 leading-relaxed">
              The destination you're searching for may have moved, been redesigned, or no longer exists. Please continue exploring our curated collections.
            </motion.p>

            {/* Pure HTML/Tailwind Abstract Luxury Illustration */}
            <motion.div 
              variants={fadeUp} 
              className="relative w-full h-[40vh] md:h-[50vh] bg-gradient-to-br from-[#FCFAF8] via-[#F5F2EC] to-[#EAE5DF] rounded-[3rem] shadow-[0_4px_40px_-10px_rgba(0,0,0,0.05)] overflow-hidden mb-16 group flex items-center justify-center border border-white/80"
              aria-hidden="true"
            >
              {/* Abstract Glass Panels */}
              <motion.div 
                animate={{ y: [-15, 15, -15], rotate: [-2, 2, -2] }} 
                transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-[15%] left-[10%] w-[35%] h-[50%] bg-white/40 backdrop-blur-xl border border-white/60 rounded-[2.5rem] shadow-[0_8px_32px_rgba(44,36,32,0.03)] rotate-[-4deg] z-10"
              />
              <motion.div 
                animate={{ y: [15, -15, 15], rotate: [4, -4, 4] }} 
                transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
                className="absolute bottom-[10%] right-[12%] w-[28%] h-[55%] bg-gradient-to-b from-white/60 to-white/20 backdrop-blur-md border border-white/70 rounded-[3rem] shadow-[0_8px_32px_rgba(184,151,104,0.04)] rotate-[6deg] z-10"
              />
              <motion.div 
                animate={{ scale: [1, 1.05, 1], opacity: [0.6, 0.8, 0.6] }} 
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-[35%] right-[35%] w-[15%] h-[20%] bg-[#B89768]/10 backdrop-blur-lg border border-[#B89768]/20 rounded-full z-10"
              />

              {/* Central Translucent 404 */}
              <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                <span className="text-[12rem] md:text-[22rem] font-serif font-light text-[#2C2420]/[0.03] select-none tracking-tighter drop-shadow-sm group-hover:scale-105 transition-transform duration-[3s] ease-out">
                  404
                </span>
              </div>

              {/* Muted Gold Accents */}
              <div className="absolute top-[25%] right-[25%] w-3 h-3 rounded-full bg-[#B89768]/40 shadow-[0_0_20px_rgba(184,151,104,0.6)] z-20" />
              <div className="absolute bottom-[35%] left-[20%] w-2 h-2 rounded-full bg-[#B89768]/50 shadow-[0_0_15px_rgba(184,151,104,0.5)] z-20" />
            </motion.div>

            {/* Luxury CTA Buttons */}
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Link 
                to="/collections" 
                aria-label="Explore our collections"
                className="w-full sm:w-auto inline-flex justify-center items-center gap-3 bg-[#2C2420] text-[#FCFAF8] px-10 py-5 rounded-full uppercase tracking-widest text-xs font-medium hover:bg-[#4A3D36] transition-all duration-300 shadow-md"
              >
                Explore Collections <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <Link 
                to="/" 
                aria-label="Return to homepage"
                className="w-full sm:w-auto inline-flex justify-center items-center gap-3 bg-transparent border border-[#2C2420] text-[#2C2420] px-10 py-5 rounded-full uppercase tracking-widest text-xs font-medium hover:bg-[#2C2420] hover:text-[#FCFAF8] transition-all duration-300"
              >
                Return Home
              </Link>
              <Link 
                to="/contact" 
                aria-label="Contact our concierge"
                className="w-full sm:w-auto inline-flex justify-center items-center gap-3 bg-transparent border border-[#EAE5DF] text-[#2C2420] px-10 py-5 rounded-full uppercase tracking-widest text-xs font-medium hover:border-[#B89768] hover:text-[#B89768] transition-all duration-300"
              >
                Contact Concierge
              </Link>
            </motion.div>

            {/* Subtle Text Button */}
            <motion.div variants={fadeUp} className="mt-8 flex justify-center">
              <Link 
                to="/collections" 
                aria-label="Continue Shopping"
                className="group inline-flex items-center gap-2 text-[#5C4D44] hover:text-[#B89768] transition-colors text-xs uppercase tracking-widest font-medium"
              >
                Continue Shopping 
                <ArrowRight size={14} className="transition-transform duration-500 ease-out group-hover:translate-x-1" aria-hidden="true" />
              </Link>
            </motion.div>
          </motion.div>
        </section>

        {/* Suggested Destinations */}
        <section className="py-24 px-6 md:px-12 lg:px-24 bg-white/60 backdrop-blur-sm border-t border-[#EAE5DF]">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            className="max-w-7xl mx-auto"
          >
            <div className="text-center mb-16">
              <h2 className="text-3xl font-serif text-[#2C2420] mb-4">Suggested Destinations</h2>
              <div className="w-12 h-[1px] bg-[#B89768] mx-auto" />
            </div>

            <motion.div 
              variants={staggerContainer} 
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              {destinations.map((dest, idx) => (
                <motion.div key={idx} variants={fadeUp} className="h-full">
                  <Link 
                    to={dest.path}
                    aria-label={`Navigate to ${dest.title}`}
                    className="block h-full bg-white/80 backdrop-blur-md border border-[#EAE5DF] p-8 rounded-3xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.02)] hover:shadow-[0_15px_40px_-10px_rgba(44,36,32,0.08)] hover:-translate-y-2 transition-all duration-700 ease-out group relative overflow-hidden"
                  >
                    <div className="text-[#B89768] mb-5 bg-[#F5F2EC] w-12 h-12 flex items-center justify-center rounded-full border border-[#EAE5DF] group-hover:scale-110 transition-transform duration-700 ease-out">
                      {dest.icon}
                    </div>
                    <h3 className="font-serif text-[#2C2420] text-xl mb-3 group-hover:text-[#B89768] transition-colors duration-500">
                      {dest.title}
                    </h3>
                    <p className="text-sm font-light text-[#5C4D44] leading-relaxed">
                      {dest.desc}
                    </p>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </section>

        {/* Luxury Quote */}
        <section className="py-24 px-6 md:px-12 lg:px-24 bg-white/40 backdrop-blur-sm border-t border-[#EAE5DF]">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            className="max-w-4xl mx-auto text-center"
          >
            <h2 className="text-3xl md:text-5xl font-serif text-[#2C2420] mb-8 italic tracking-wide leading-relaxed">
              "Every masterpiece begins with finding the right path."
            </h2>
            <div className="w-16 h-[1px] bg-[#B89768] mx-auto" />
          </motion.div>
        </section>
      </main>

      <Footer className="relative z-10" />
    </div>
  );
};

export default NotFound;