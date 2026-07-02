
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  ChevronDown, 
  ArrowRight, 
  ArrowDown, 
  Scissors, 
  Ruler, 
  Star, 
  Gem, 
  Shield, 
  Heart,
  MessageCircle,
  CheckCircle,
  Award,
  Lock,
  Globe,
  Sparkles
} from 'lucide-react';
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const CustomTailoring = () => {
  const [activeFaq, setActiveFaq] = useState(null);

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

  const processSteps = [
    { num: "01", title: "Private Consultation", desc: "Understanding your vision, lifestyle, and sartorial preferences in our private atelier." },
    { num: "02", title: "Measurements", desc: "Precise measurements taken by our master tailors to ensure a flawless silhouette." },
    { num: "03", title: "Fabric Selection", desc: "Curating the finest materials from our exclusive library of global luxury textiles." },
    { num: "04", title: "Craftsmanship", desc: "Meticulous pattern making, cutting, and hand-stitching your bespoke garment." },
    { num: "05", title: "Final Delivery", desc: "Final fittings and adjustments to achieve absolute perfection before delivery." }
  ];

  const fabrics = [
    { title: "Raw Silk", img: "/silk.jpg", desc: "Richly textured and naturally luminous, perfect for structured festive wear." },
    { title: "Italian Linen", img: "/linen.jpg", desc: "Breathable and effortlessly elegant, sourced from premier Italian mills." },
    { title: "Premium Cotton", img: "/cotton.jpg", desc: "Crisp, lightweight, and incredibly soft for unparalleled everyday luxury." },
    { title: "Velvet", img: "/velvet.jpg", desc: "Plush and opulent, offering deep, rich tones for evening and winter wear." },
    { title: "Organza", img: "/organza.jpg", desc: "Sheer and ethereal, crafted for delicate overlays and intricate embroidery." }
  ];

  const features = [
    { icon: <Ruler size={24} />, title: "Perfect Fit", desc: "Drafted from scratch based on your unique body architecture." },
    { icon: <Star size={24} />, title: "Exclusive Design", desc: "One-of-a-kind creations tailored specifically to your aesthetic." },
    { icon: <Gem size={24} />, title: "Premium Fabrics", desc: "Access to the world's most luxurious and rare textiles." },
    { icon: <Scissors size={24} />, title: "Handcrafted Excellence", desc: "Decades of artisanal expertise poured into every stitch." },
    { icon: <Shield size={24} />, title: "Private Experience", desc: "Absolute discretion and dedicated attention in our atelier." },
    { icon: <Heart size={24} />, title: "Lifetime Elegance", desc: "Garments constructed to endure, remaining timeless for generations." }
  ];

  const promises = [
    { icon: <Award size={24} />, title: "Handcrafted in India", desc: "Proudly preserving centuries-old artisanal techniques and embroidery traditions." },
    { icon: <Lock size={24} />, title: "Private Consultations", desc: "Exclusive appointments ensuring absolute discretion and dedicated personal attention." },
    { icon: <Ruler size={24} />, title: "Made to Measure", desc: "Drafted specifically for your unique silhouette without standard blocks or templates." },
    { icon: <Sparkles size={24} />, title: "Premium Fabrics", desc: "Unrestricted access to the world's most prestigious and rare luxury textiles." },
    { icon: <Globe size={24} />, title: "Worldwide Delivery", desc: "Secure, insured global shipping delivering your masterpiece flawlessly to your door." },
    { icon: <Shield size={24} />, title: "Lifetime Craftsmanship", desc: "Unwavering commitment to quality, ensuring your garment endures for generations." }
  ];

  const faqs = [
    {
      question: "How long does bespoke tailoring take?",
      answer: "A bespoke commission typically takes 4 to 6 weeks from the initial consultation to final delivery. This allows our artisans the necessary time for meticulous hand-finishing and multiple fittings to ensure absolute perfection."
    },
    {
      question: "Can I choose my own fabric?",
      answer: "Absolutely. We offer an extensive library of the world's finest textiles. During your consultation, our master tailors will guide you through our curated selection to find the perfect drape, weight, and texture for your piece."
    },
    {
      question: "Do you offer virtual consultations?",
      answer: "Yes, we accommodate our global clientele with secure and private virtual consultations. While initial measurements are best taken in person, we can coordinate with local trusted tailors for measurements and handle the design and fabric selection virtually."
    },
    {
      question: "Can I request custom embroidery?",
      answer: "Custom embroidery is one of our signatures. Our in-house artisans specialize in intricate zardozi, aari, and thread work. We can incorporate personalized motifs, monograms, or elaborate traditional designs into your bespoke garment."
    },
    {
      question: "Do you ship internationally?",
      answer: "Yes, we ship globally using premium, insured courier services. Your bespoke garments are carefully packaged to ensure they arrive in pristine condition, regardless of your location."
    }
  ];

  return (
    <div className="min-h-screen bg-[#FCFAF8] text-[#2C2420] font-sans selection:bg-[#EAE5DF] selection:text-[#2C2420]">
      <Navbar />

      {/* Hero Section */}
      <section className="relative min-h-screen pt-32 pb-20 px-6 md:px-12 lg:px-24 flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-30 bg-gradient-to-b from-[#F5F2EC] to-transparent pointer-events-none" />
        
        <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center relative z-10 mt-12">
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="order-2 lg:order-1"
          >
            <motion.span variants={fadeUp} className="text-[#B89768] tracking-[0.25em] uppercase text-xs font-semibold mb-6 block">
              Atelier A Productions
            </motion.span>
            <motion.h1 variants={fadeUp} className="text-5xl md:text-7xl lg:text-8xl font-serif font-light mb-8 text-[#2C2420] tracking-wide leading-[1.1]">
              Bespoke <br /> Tailoring
            </motion.h1>
            <motion.p variants={fadeUp} className="text-[#5C4D44] text-lg md:text-xl font-light max-w-lg mb-10 leading-relaxed">
              Every bespoke garment begins with your vision and is meticulously handcrafted to your exact measurements by our master artisans, creating timeless pieces that exist exclusively for you.
            </motion.p>
            <motion.div variants={fadeUp}>
              <Link 
                to="/contact#contact-form"
                className="inline-flex items-center gap-3 bg-[#2C2420] text-[#FCFAF8] px-10 py-5 rounded-full uppercase tracking-widest text-xs font-medium hover:bg-[#4A3D36] transition-all duration-300 shadow-md hover:shadow-lg"
              >
                Book Private Consultation <ArrowRight size={16} />
              </Link>
            </motion.div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="order-1 lg:order-2 relative"
          >
            <div className="aspect-[3/4] rounded-[3rem] overflow-hidden shadow-2xl relative">
              <div className="absolute inset-0 bg-[#2C2420]/10 mix-blend-overlay z-10" />
              <img 
                src="/tailoring-hero.jpg" 
                alt="Bespoke Tailoring by A Productions" 
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Minimal Scroll Indicator */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5, duration: 1 }}
              className="absolute -bottom-8 left-12 hidden lg:flex flex-col items-center gap-4 text-[#B89768]"
            >
              <span className="text-[10px] uppercase tracking-widest font-medium transform -rotate-90 origin-bottom mb-12">Scroll</span>
              <motion.div 
                animate={{ y: [0, 8, 0] }} 
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              >
                <ArrowDown size={16} strokeWidth={1.5} />
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* The Bespoke Experience */}
      <section className="py-24 px-6 md:px-12 lg:px-24 bg-[#F5F2EC]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            className="aspect-square rounded-[3rem] overflow-hidden shadow-lg"
          >
            <img 
              src="/experience.jpg" 
              alt="The Bespoke Experience" 
              className="w-full h-full object-cover"
            />
          </motion.div>
          
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="lg:pl-12"
          >
            <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-serif text-[#2C2420] mb-6">The Bespoke Experience</motion.h2>
            <motion.div variants={fadeUp} className="w-12 h-[1px] bg-[#B89768] mb-10" />
            <motion.p variants={fadeUp} className="text-[#5C4D44] font-light leading-relaxed mb-10 text-lg">
              True luxury lies in the details. Our bespoke tailoring service is an intimate collaboration between client and artisan, resulting in a garment that is undeniably yours.
            </motion.p>
            
            <div className="space-y-6">
              {['Personal Consultation & Styling', 'Extensive Design Discussion', 'Precise Body Measurements', 'Curated Fabric Selection', 'Handcrafted Construction', 'Perfection in Final Fitting'].map((item, index) => (
                <motion.div key={index} variants={fadeUp} className="flex items-center gap-4">
                  <CheckCircle className="text-[#B89768]" size={20} strokeWidth={1.5} />
                  <span className="text-[#2C2420] font-light text-lg">{item}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Our Process */}
      <section className="py-32 px-6 md:px-12 lg:px-24 max-w-7xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeUp}
          className="text-center mb-20"
        >
          <span className="text-[#B89768] tracking-[0.25em] uppercase text-xs font-semibold mb-4 block">The Journey</span>
          <h2 className="text-4xl md:text-5xl font-serif text-[#2C2420] mb-6">Our Process</h2>
          <div className="w-12 h-[1px] bg-[#B89768] mx-auto" />
        </motion.div>

        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-8"
        >
          {processSteps.map((step, index) => (
            <motion.div 
              key={index}
              variants={fadeUp}
              className="bg-white/60 backdrop-blur-md border border-[#EAE5DF] p-8 rounded-3xl relative overflow-hidden group hover:bg-[#F5F2EC] transition-colors duration-500 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-10px_rgba(0,0,0,0.08)]"
            >
              <div className="text-5xl font-serif font-light text-[#EAE5DF] mb-6 transition-colors duration-500 group-hover:text-[#B89768]/20">
                {step.num}
              </div>
              <h3 className="text-xl font-serif mb-4 text-[#2C2420] relative z-10">{step.title}</h3>
              <p className="text-[#5C4D44] font-light text-sm leading-relaxed relative z-10">
                {step.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Premium Fabrics */}
      <section className="py-32 px-6 md:px-12 lg:px-24 bg-white border-y border-[#EAE5DF]">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8"
          >
            <div>
              <span className="text-[#B89768] tracking-[0.25em] uppercase text-xs font-semibold mb-4 block">Materials</span>
              <h2 className="text-4xl md:text-5xl font-serif text-[#2C2420]">Premium Fabrics</h2>
            </div>
            <p className="text-[#5C4D44] font-light max-w-md text-lg leading-relaxed">
              We source only the most exquisite textiles from the world's most renowned mills to construct your masterpiece.
            </p>
          </motion.div>

          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {fabrics.map((fabric, index) => (
              <motion.div 
                key={index}
                variants={fadeUp}
                className="bg-[#FCFAF8] rounded-[2.5rem] p-6 border border-[#EAE5DF] group"
              >
                <div className="aspect-[4/3] rounded-[2rem] overflow-hidden mb-6">
                  <img 
                    src={fabric.img} 
                    alt={fabric.title} 
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                  />
                </div>
                <div className="px-4 pb-4">
                  <h3 className="text-2xl font-serif text-[#2C2420] mb-3">{fabric.title}</h3>
                  <p className="text-[#5C4D44] font-light leading-relaxed text-sm">
                    {fabric.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Craftsmanship */}
      <section className="py-32 px-6 md:px-12 lg:px-24 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="lg:col-span-5"
          >
            <motion.span variants={fadeUp} className="text-[#B89768] tracking-[0.25em] uppercase text-xs font-semibold mb-6 block">
              The Art of Tailoring
            </motion.span>
            <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-serif text-[#2C2420] mb-8 leading-tight">
              Uncompromising <br /> Craftsmanship
            </motion.h2>
            <motion.div variants={fadeUp} className="space-y-6 text-[#5C4D44] font-light text-lg leading-relaxed">
              <p>
                Our bespoke process is a testament to traditional tailoring, where every cut and stitch is executed by hand. We do not rely on standard blocks; a unique paper pattern is drafted exclusively for you.
              </p>
              <p>
                From meticulous hand-padded lapels that hold their shape over time, to intricate hand-embroidered detailing that elevates the garment from clothing to art, our dedication to craftsmanship is absolute.
              </p>
            </motion.div>
          </motion.div>

          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            className="lg:col-span-7 h-[600px] rounded-[3rem] overflow-hidden shadow-xl"
          >
            <img 
              src="/craftsmanship.jpg" 
              alt="Artisan Craftsmanship" 
              className="w-full h-full object-cover"
            />
          </motion.div>
        </div>
      </section>

      {/* Why Bespoke */}
      <section className="py-32 px-6 md:px-12 lg:px-24 bg-[#F5F2EC] border-y border-[#EAE5DF]">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeUp}
          className="text-center mb-20 max-w-3xl mx-auto"
        >
          <h2 className="text-4xl md:text-5xl font-serif text-[#2C2420] mb-6">Why Bespoke?</h2>
          <div className="w-12 h-[1px] bg-[#B89768] mx-auto mb-8" />
          <p className="text-[#5C4D44] font-light text-lg leading-relaxed">
            Off-the-rack garments are made for a theoretical standard. Bespoke tailoring is created for the reality of your individual form.
          </p>
        </motion.div>

        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto"
        >
          {features.map((feature, index) => (
            <motion.div 
              key={index}
              variants={fadeUp}
              className="bg-white/60 backdrop-blur-md border border-[#EAE5DF] p-10 rounded-3xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-10px_rgba(0,0,0,0.08)] transition-all duration-500"
            >
              <div className="text-[#B89768] mb-6 bg-[#FCFAF8] w-14 h-14 flex items-center justify-center rounded-full border border-[#EAE5DF]">
                {feature.icon}
              </div>
              <h3 className="text-2xl font-serif mb-4 text-[#2C2420]">{feature.title}</h3>
              <p className="text-[#5C4D44] font-light leading-relaxed text-sm">
                {feature.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Our Promise */}
      <section className="py-32 px-6 md:px-12 lg:px-24 bg-[#FCFAF8]">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeUp}
          className="text-center mb-20 max-w-3xl mx-auto"
        >
          <h2 className="text-4xl md:text-5xl font-serif text-[#2C2420] mb-6">Our Promise</h2>
          <div className="w-12 h-[1px] bg-[#B89768] mx-auto mb-8" />
          <p className="text-[#5C4D44] font-light text-lg leading-relaxed">
            Every commission reflects our uncompromising commitment to craftsmanship, discretion and timeless elegance.
          </p>
        </motion.div>

        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto"
        >
          {promises.map((promise, index) => (
            <motion.div 
              key={index}
              variants={fadeUp}
              className="bg-white/80 backdrop-blur-md border border-[#EAE5DF] p-10 rounded-3xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-10px_rgba(0,0,0,0.08)] transition-all duration-500"
            >
              <div className="text-[#B89768] mb-6 bg-[#F5F2EC] w-14 h-14 flex items-center justify-center rounded-full border border-[#EAE5DF]">
                {promise.icon}
              </div>
              <h3 className="text-2xl font-serif mb-4 text-[#2C2420]">{promise.title}</h3>
              <p className="text-[#5C4D44] font-light leading-relaxed text-sm">
                {promise.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* FAQ Section */}
      <section className="py-32 px-6 md:px-12 lg:px-24 max-w-3xl mx-auto border-t border-[#EAE5DF]">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeUp}
        >
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif text-[#2C2420] mb-4">Frequently Asked Questions</h2>
            <div className="w-12 h-[1px] bg-[#B89768] mx-auto" />
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div 
                key={index} 
                className="bg-white border border-[#EAE5DF] rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300"
              >
                <button
                  onClick={() => setActiveFaq(activeFaq === index ? null : index)}
                  className="w-full flex justify-between items-center px-8 py-6 text-left group"
                >
                  <span className="font-serif text-[#2C2420] text-lg group-hover:text-[#B89768] transition-colors">
                    {faq.question}
                  </span>
                  <ChevronDown 
                    size={20} 
                    className={`text-[#B89768] transition-transform duration-300 flex-shrink-0 ml-4 ${activeFaq === index ? 'rotate-180' : ''}`} 
                  />
                </button>
                <AnimatePresence>
                  {activeFaq === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                      <p className="text-[#5C4D44] font-light leading-relaxed px-8 pb-8 text-sm">
                        {faq.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Luxury CTA */}
      <section className="py-32 px-6 md:px-12 lg:px-24 max-w-6xl mx-auto mb-20">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeUp}
          className="bg-white/80 backdrop-blur-lg border border-[#EAE5DF] rounded-[4rem] p-16 md:p-24 text-center shadow-[0_10px_50px_-15px_rgba(0,0,0,0.05)]"
        >
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif text-[#2C2420] mb-6">Begin Your Bespoke Journey</h2>
          <div className="w-16 h-[1px] bg-[#B89768] mx-auto mb-8" />
          <p className="text-[#5C4D44] text-xl font-light leading-relaxed max-w-2xl mx-auto mb-12">
            Every masterpiece begins with a private consultation. Let us create a garment that perfectly reflects your personal style.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link 
              to="/contact#contact-form"
              className="w-full sm:w-auto inline-flex justify-center items-center gap-3 bg-[#2C2420] text-[#FCFAF8] px-10 py-5 rounded-full uppercase tracking-widest text-xs font-medium hover:bg-[#4A3D36] transition-all duration-300 shadow-md"
            >
              Book Private Consultation
            </Link>
            <a 
              href="https://wa.me/91XXXXXXXXXX" 
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex justify-center items-center gap-3 bg-transparent border border-[#2C2420] text-[#2C2420] px-10 py-5 rounded-full uppercase tracking-widest text-xs font-medium hover:bg-[#2C2420] hover:text-[#FCFAF8] transition-all duration-300"
            >
              <MessageCircle size={16} /> Chat on WhatsApp
            </a>
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
};

export default CustomTailoring;

