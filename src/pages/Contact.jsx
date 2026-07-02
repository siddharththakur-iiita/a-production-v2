
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, 
  Clock, 
  Phone, 
  Mail, 
  MessageCircle, 
  ChevronDown, 
  ArrowRight 
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const Contact = () => {
  const [activeFaq, setActiveFaq] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Form submission logic
  };

  const scrollToForm = () => {
    document.getElementById('contact-form')?.scrollIntoView({ 
      behavior: 'smooth' 
    });
  };

  const faqs = [
    {
      question: "How do I request a private appointment?",
      answer: "Please fill out our private inquiry form below. Our concierge team will review your request and contact you within 24 hours to schedule your exclusive consultation."
    },
    {
      question: "What does a private consultation entail?",
      answer: "A private consultation is a bespoke experience tailored to your specific needs. Our specialists dedicate their undivided attention to understanding your vision and providing highly personalized guidance."
    },
    {
      question: "Do you offer virtual consultations?",
      answer: "Yes, we accommodate our global clientele with secure and private virtual consultations, maintaining the same level of discretion and excellence as our in-person appointments."
    }
  ];

  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  return (
    <div className="min-h-screen bg-[#FCFAF8] text-[#2C2420] font-sans selection:bg-[#EAE5DF] selection:text-[#2C2420]">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 px-6 md:px-12 lg:px-24 overflow-hidden">
        <motion.div 
          className="relative z-10 text-center max-w-4xl mx-auto"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          <motion.span variants={fadeUp} className="text-[#B89768] tracking-[0.25em] uppercase text-xs font-semibold mb-6 block">
            A Productions Concierge
          </motion.span>
          <motion.h1 variants={fadeUp} className="text-5xl md:text-7xl font-serif font-light mb-8 text-[#2C2420] tracking-wide">
            Contact Us
          </motion.h1>
          <motion.p variants={fadeUp} className="text-[#5C4D44] text-lg font-light max-w-2xl mx-auto leading-relaxed">
            Reach out to our concierge to discover a world of unparalleled craftsmanship, bespoke services, and exceptional styling guidance.
          </motion.p>
        </motion.div>
      </section>

      {/* Information Cards (Glassmorphism & Rounded Corners) */}
      <section className="py-12 px-6 md:px-12 lg:px-24 max-w-7xl mx-auto">
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
        >
          {/* Card 1: Atelier */}
          <motion.div variants={fadeUp} className="bg-white/60 backdrop-blur-md border border-[#EAE5DF] p-10 rounded-3xl text-center shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-10px_rgba(0,0,0,0.08)] transition-all duration-500">
            <MapPin className="mx-auto text-[#B89768] mb-6" size={28} strokeWidth={1.5} />
            <h3 className="text-xl font-serif mb-3 text-[#2C2420]">Private Atelier</h3>
            <p className="text-[#5C4D44] font-light leading-relaxed text-sm">
              Location shared only after appointment confirmation.
            </p>
          </motion.div>

          {/* Card 2: Consultations */}
          <motion.div variants={fadeUp} className="bg-white/60 backdrop-blur-md border border-[#EAE5DF] p-10 rounded-3xl text-center shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-10px_rgba(0,0,0,0.08)] transition-all duration-500">
            <Clock className="mx-auto text-[#B89768] mb-6" size={28} strokeWidth={1.5} />
            <h3 className="text-xl font-serif mb-3 text-[#2C2420]">Private Consultations</h3>
            <p className="text-[#5C4D44] font-light leading-relaxed text-sm">
              By Appointment Only
            </p>
          </motion.div>

          {/* Card 3: Contact Details */}
          <motion.div variants={fadeUp} className="bg-white/60 backdrop-blur-md border border-[#EAE5DF] p-10 rounded-3xl text-center shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-10px_rgba(0,0,0,0.08)] transition-all duration-500 flex flex-col justify-center">
            <div className="flex items-center justify-center gap-3 mb-4 text-[#5C4D44] hover:text-[#B89768] transition-colors">
              <Phone size={18} strokeWidth={1.5} />
              <a href="tel:+91XXXXXXXXXX" className="font-light tracking-wide">+91 XXXXXXXXXX</a>
            </div>
            <div className="flex items-center justify-center gap-3 text-[#5C4D44] hover:text-[#B89768] transition-colors">
              <Mail size={18} strokeWidth={1.5} />
              <a href="mailto:contact@aproductions.in" className="font-light tracking-wide">contact@aproductions.in</a>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* WhatsApp Concierge Section */}
      <section className="py-16 px-6 md:px-12 lg:px-24 max-w-7xl mx-auto">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="bg-[#F5F2EC] border border-[#EAE5DF] rounded-[2.5rem] p-12 md:p-20 text-center shadow-sm relative overflow-hidden"
        >
          <div className="relative z-10">
            <MessageCircle className="mx-auto text-[#B89768] mb-6" size={32} strokeWidth={1.5} />
            <h2 className="text-3xl md:text-4xl font-serif mb-6 text-[#2C2420]">Speak With Our Concierge</h2>
            <p className="text-[#5C4D44] text-lg font-light max-w-2xl mx-auto mb-10 leading-relaxed">
              Our concierge team is available to assist with bespoke tailoring, styling guidance, custom commissions and appointment scheduling.
            </p>
            <a 
              href="https://wa.me/91XXXXXXXXXX" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-[#2C2420] text-[#FCFAF8] px-8 py-4 rounded-full uppercase tracking-widest text-xs font-medium hover:bg-[#4A3D36] transition-colors duration-300 shadow-md"
            >
              Contact via WhatsApp <ArrowRight size={16} />
            </a>
          </div>
        </motion.div>
      </section>

      {/* Editorial Visit Section (Replacing Maps) */}
      <section className="py-16 px-6 md:px-12 lg:px-24 max-w-5xl mx-auto text-center">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeUp}
          className="bg-white/80 backdrop-blur-lg border border-[#EAE5DF] rounded-[3rem] p-12 md:p-24 shadow-sm"
        >
          <h2 className="text-3xl md:text-4xl font-serif text-[#2C2420] mb-6">Visit Our Private Atelier</h2>
          <div className="w-12 h-[1px] bg-[#B89768] mx-auto mb-8" />
          <p className="text-[#5C4D44] text-lg font-light leading-relaxed max-w-2xl mx-auto mb-12">
            Our private couture atelier welcomes clients exclusively by appointment. The exact studio location is shared only after your consultation has been confirmed.
          </p>
          <button 
            onClick={scrollToForm}
            className="inline-block border border-[#2C2420] text-[#2C2420] px-10 py-4 rounded-full uppercase tracking-widest text-xs font-medium hover:bg-[#2C2420] hover:text-[#FCFAF8] transition-all duration-300"
          >
            Request Private Appointment
          </button>
        </motion.div>
      </section>

      {/* Main Contact Form Section */}
      <section id="contact-form" className="py-24 px-6 md:px-12 lg:px-24 max-w-4xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeUp}
        >
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif mb-4 text-[#2C2420]">Inquire</h2>
            <div className="w-12 h-[1px] bg-[#B89768] mx-auto" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-8 bg-white/50 backdrop-blur-md border border-[#EAE5DF] p-8 md:p-12 rounded-[2.5rem] shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label htmlFor="name" className="text-xs tracking-widest uppercase text-[#5C4D44] ml-2">Full Name *</label>
                <input 
                  type="text" 
                  id="name" 
                  name="name" 
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full bg-white border border-[#EAE5DF] px-6 py-4 rounded-2xl text-[#2C2420] focus:outline-none focus:border-[#B89768] focus:ring-1 focus:ring-[#B89768] transition-all"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="email" className="text-xs tracking-widest uppercase text-[#5C4D44] ml-2">Email Address *</label>
                <input 
                  type="email" 
                  id="email" 
                  name="email" 
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full bg-white border border-[#EAE5DF] px-6 py-4 rounded-2xl text-[#2C2420] focus:outline-none focus:border-[#B89768] focus:ring-1 focus:ring-[#B89768] transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label htmlFor="phone" className="text-xs tracking-widest uppercase text-[#5C4D44] ml-2">Phone Number (Optional)</label>
                <input 
                  type="tel" 
                  id="phone" 
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full bg-white border border-[#EAE5DF] px-6 py-4 rounded-2xl text-[#2C2420] focus:outline-none focus:border-[#B89768] focus:ring-1 focus:ring-[#B89768] transition-all"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="subject" className="text-xs tracking-widest uppercase text-[#5C4D44] ml-2">Subject *</label>
                <input 
                  type="text" 
                  id="subject" 
                  name="subject" 
                  required
                  value={formData.subject}
                  onChange={handleInputChange}
                  className="w-full bg-white border border-[#EAE5DF] px-6 py-4 rounded-2xl text-[#2C2420] focus:outline-none focus:border-[#B89768] focus:ring-1 focus:ring-[#B89768] transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="message" className="text-xs tracking-widest uppercase text-[#5C4D44] ml-2">Your Message *</label>
              <textarea 
                id="message" 
                name="message" 
                rows="5"
                required
                value={formData.message}
                onChange={handleInputChange}
                className="w-full bg-white border border-[#EAE5DF] px-6 py-4 rounded-2xl text-[#2C2420] focus:outline-none focus:border-[#B89768] focus:ring-1 focus:ring-[#B89768] transition-all resize-none"
              />
            </div>

            <div className="pt-4 flex justify-center">
              <button 
                type="submit" 
                className="group relative inline-flex items-center gap-3 bg-[#2C2420] text-[#FCFAF8] px-12 py-4 rounded-full text-xs tracking-widest uppercase font-medium hover:bg-[#4A3D36] transition-all duration-300 shadow-md"
              >
                <span>Submit Inquiry</span>
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </form>
        </motion.div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 px-6 md:px-12 lg:px-24 max-w-3xl mx-auto border-t border-[#EAE5DF]">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeUp}
        >
          <div className="text-center mb-16">
            <h2 className="text-3xl font-serif text-[#2C2420] mb-4">Frequently Asked Questions</h2>
            <div className="w-12 h-[1px] bg-[#B89768] mx-auto" />
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div 
                key={index} 
                className="bg-white/60 backdrop-blur-sm border border-[#EAE5DF] rounded-2xl overflow-hidden shadow-sm"
              >
                <button
                  onClick={() => setActiveFaq(activeFaq === index ? null : index)}
                  className="w-full flex justify-between items-center px-6 py-5 text-left group"
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
                      <p className="text-[#5C4D44] font-light leading-relaxed px-6 pb-6">
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

      <Footer />
    </div>
  );
};

export default Contact;

