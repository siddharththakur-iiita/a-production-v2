import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  MapPin,
  Phone,
  Mail,
  MessageCircle,
  ChevronDown,
  ArrowRight,
} from "lucide-react";

import { FaInstagram } from "react-icons/fa6";
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

// ================= SHARED SUB-COMPONENTS =================
// Small, local, and reused across sections so every eyebrow label and
// hairline divider reads identically — quiet consistency, not repetition.

const Eyebrow = ({ children, className = '' }) => (
  <motion.span
    variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 1, ease: [0.16, 1, 0.3, 1] } } }}
    className={`block text-xs font-semibold uppercase tracking-[0.25em] text-[#B89768] ${className}`}
  >
    {children}
  </motion.span>
);

const Rule = ({ className = '' }) => (
  <div className={`h-px w-12 bg-[#B89768] ${className}`} aria-hidden="true" />
);

// ================= DATA =================

const directory = [
  {
    id: 'telephone',
    label: 'Telephone',
    value: '+91 XXXXXXXXXX',
    href: 'tel:+91XXXXXXXXXX',
    icon: Phone
  },
  {
    id: 'email',
    label: 'Email',
    value: 'contact@aproductions.in',
    href: 'mailto:contact@aproductions.in',
    icon: Mail
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    value: 'Message our concierge',
    href: 'https://wa.me/91XXXXXXXXXX',
    external: true,
    icon: MessageCircle
  },
{
  id: "instagram",
  label: "Instagram",
  value: "@aproductions.in",
  href: "https://instagram.com/aproductions.in",
  external: true,
  icon: FaInstagram,
},
  {
    id: 'atelier',
    label: 'Atelier',
    value: 'Shared upon confirmation, by appointment only',
    icon: MapPin
  }
];

const faqs = [
  {
    question: 'How do I request a private appointment?',
    answer: 'Share a few details through the inquiry form below. A member of our concierge team will read it personally and respond within 24 hours to arrange your consultation.'
  },
  {
    question: 'What does a private consultation entail?',
    answer: 'An unhurried conversation, entirely your own. Our specialists give their full attention to understanding your vision before any discussion of design begins.'
  },
  {
    question: 'Do you offer virtual consultations?',
    answer: 'Yes. Clients further afield are welcomed with the same discretion and care, through a private virtual appointment arranged around your schedule.'
  }
];

// ================= MOTION VARIANTS =================
// A single, calmer easing curve shared with the rest of the site, so the
// Contact page feels like a continuation of About and Home, not a new voice.

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1] } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.1 }
  }
};

const Contact = () => {
  const shouldReduceMotion = useReducedMotion();
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
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Form submission logic
  };

  const scrollToForm = () => {
    document.getElementById('contact-form')?.scrollIntoView({
      behavior: shouldReduceMotion ? 'auto' : 'smooth'
    });
  };

  return (
    <div className="min-h-screen bg-[#FCFAF8] text-[#2C2420] font-sans selection:bg-[#EAE5DF] selection:text-[#2C2420]">
      <Navbar />

      <main>
        {/* ================= HERO ================= */}
        <section aria-label="Introduction" className="relative pt-40 pb-24 px-6 md:px-12 lg:px-24 overflow-hidden">
          <motion.div
            className="relative z-10 text-center max-w-3xl mx-auto"
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            <Eyebrow className="mb-8">A Productions — Private Concierge</Eyebrow>
            <motion.h1
              variants={fadeUp}
              className="text-5xl md:text-7xl font-serif font-light mb-8 text-[#2C2420] leading-[1.1] tracking-tight"
            >
              Let's Begin <br />
              <span className="italic text-[#4A3D36]">a Conversation</span>
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="text-[#5C4D44] text-lg font-light max-w-xl mx-auto leading-[1.9]"
            >
              Every commission begins with a conversation, not a form. Reach us through whichever channel feels most comfortable, and our concierge will take it from there.
            </motion.p>
          </motion.div>
        </section>

        {/* ================= SECTION: CONTACT DIRECTORY ================= */}
        {/* An editorial index rather than a grid of cards — the way a fashion
            house's own contact page reads, quiet and typographic. */}
        <section aria-labelledby="directory-heading" className="px-6 md:px-12 lg:px-24 max-w-4xl mx-auto py-16 md:py-24">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeUp} className="mb-14 text-center">
              <Eyebrow className="mb-6 justify-center flex">Reach Us</Eyebrow>
              <h2 id="directory-heading" className="text-3xl md:text-4xl font-serif font-light text-[#2C2420]">
                A Directory
              </h2>
            </motion.div>

            <motion.dl variants={fadeUp} className="divide-y divide-[#EAE5DF] border-t border-b border-[#EAE5DF]">
              {directory.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.id}
                    className="flex flex-col gap-2 py-7 sm:flex-row sm:items-center sm:justify-between sm:gap-8"
                  >
                    <dt className="flex items-center gap-4 text-xs font-semibold uppercase tracking-[0.2em] text-[#5C4D44]">
                      <Icon size={16} strokeWidth={1.5} className="text-[#B89768]" aria-hidden="true" />
                      {item.label}
                    </dt>
                    <dd className="font-serif text-lg font-light text-[#2C2420] sm:text-right">
                      {item.href ? (
                        <a
                          href={item.href}
                          target={item.external ? '_blank' : undefined}
                          rel={item.external ? 'noopener noreferrer' : undefined}
                          className="rounded-sm underline decoration-[#EAE5DF] underline-offset-4 transition-colors hover:text-[#B89768] hover:decoration-[#B89768] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B89768] focus-visible:ring-offset-4 focus-visible:ring-offset-[#FCFAF8]"
                        >
                          {item.value}
                        </a>
                      ) : (
                        <span className="font-light text-[#5C4D44]">{item.value}</span>
                      )}
                    </dd>
                  </div>
                );
              })}
            </motion.dl>
          </motion.div>
        </section>

        {/* ================= SECTION: THE CONSULTATION ================= */}
        <section aria-labelledby="consultation-heading" className="px-6 md:px-12 lg:px-24 max-w-4xl mx-auto py-16 md:py-24">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={staggerContainer}
            className="border border-[#EAE5DF] rounded-[2.5rem] px-8 py-16 md:px-20 md:py-24 text-center"
          >
            <Eyebrow className="mb-6 justify-center flex">The Consultation</Eyebrow>
            <motion.h2
              id="consultation-heading"
              variants={fadeUp}
              className="text-3xl md:text-4xl font-serif font-light text-[#2C2420] mb-6"
            >
              An Invitation to the Atelier
            </motion.h2>
            <motion.div variants={fadeUp}>
              <Rule className="mx-auto mb-8" />
            </motion.div>
            <motion.p
              variants={fadeUp}
              className="text-[#5C4D44] text-lg font-light leading-[1.9] max-w-xl mx-auto mb-12"
            >
              A private consultation is where every garment begins — an unhurried hour with our specialists, dedicated entirely to your vision. The atelier's location is shared only once your appointment is confirmed.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-col items-center gap-6">
              <button
                onClick={scrollToForm}
                className="group inline-flex items-center gap-3 bg-[#2C2420] text-[#FCFAF8] px-10 py-4 rounded-full uppercase tracking-[0.2em] text-xs font-medium transition-all duration-500 ease-out hover:bg-[#4A3D36] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C2420] focus-visible:ring-offset-4 focus-visible:ring-offset-[#FCFAF8]"
              >
                <span>Request a Consultation</span>
                <ArrowRight size={16} strokeWidth={1.5} className="transition-transform duration-500 group-hover:translate-x-1" aria-hidden="true" />
              </button>
              <a
                href="https://wa.me/91XXXXXXXXXX"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium uppercase tracking-[0.2em] text-[#5C4D44] underline decoration-[#EAE5DF] underline-offset-4 transition-colors hover:text-[#B89768] hover:decoration-[#B89768] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B89768] focus-visible:ring-offset-4 focus-visible:ring-offset-[#FCFAF8] rounded-sm"
              >
                Or message us directly on WhatsApp
              </a>
            </motion.div>
          </motion.div>
        </section>

        {/* ================= SECTION: INQUIRY FORM ================= */}
        <section id="contact-form" aria-labelledby="inquire-heading" className="py-16 md:py-24 px-6 md:px-12 lg:px-24 max-w-4xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={fadeUp}
          >
            <div className="text-center mb-6">
              <h2 id="inquire-heading" className="text-3xl md:text-4xl font-serif font-light mb-4 text-[#2C2420]">
                Inquire
              </h2>
              <Rule className="mx-auto" />
            </div>
            <p className="text-center text-[#5C4D44] font-light mb-16 max-w-md mx-auto">
              Every inquiry is read personally by our concierge team, never a mailing list.
            </p>

            <form
              onSubmit={handleSubmit}
              className="space-y-10 bg-white/50 backdrop-blur-md border border-[#EAE5DF] p-8 md:p-14 rounded-[2.5rem] shadow-sm"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-xs tracking-[0.2em] uppercase text-[#5C4D44] ml-1">
                    Full Name <span aria-hidden="true">*</span>
                    <span className="sr-only"> (required)</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    aria-required="true"
                    autoComplete="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full bg-white border border-[#EAE5DF] px-6 py-4 rounded-2xl text-[#2C2420] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B89768] focus:border-[#B89768]"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="email" className="text-xs tracking-[0.2em] uppercase text-[#5C4D44] ml-1">
                    Email Address <span aria-hidden="true">*</span>
                    <span className="sr-only"> (required)</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    aria-required="true"
                    autoComplete="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full bg-white border border-[#EAE5DF] px-6 py-4 rounded-2xl text-[#2C2420] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B89768] focus:border-[#B89768]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label htmlFor="phone" className="text-xs tracking-[0.2em] uppercase text-[#5C4D44] ml-1">
                    Phone Number <span className="normal-case font-normal text-[#8C8273]">(optional)</span>
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    autoComplete="tel"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full bg-white border border-[#EAE5DF] px-6 py-4 rounded-2xl text-[#2C2420] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B89768] focus:border-[#B89768]"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="subject" className="text-xs tracking-[0.2em] uppercase text-[#5C4D44] ml-1">
                    Reason for Inquiry <span aria-hidden="true">*</span>
                    <span className="sr-only"> (required)</span>
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    required
                    aria-required="true"
                    value={formData.subject}
                    onChange={handleInputChange}
                    className="w-full bg-white border border-[#EAE5DF] px-6 py-4 rounded-2xl text-[#2C2420] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B89768] focus:border-[#B89768]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="message" className="text-xs tracking-[0.2em] uppercase text-[#5C4D44] ml-1">
                  Tell Us About Your Vision <span aria-hidden="true">*</span>
                  <span className="sr-only"> (required)</span>
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows="5"
                  required
                  aria-required="true"
                  value={formData.message}
                  onChange={handleInputChange}
                  className="w-full bg-white border border-[#EAE5DF] px-6 py-4 rounded-2xl text-[#2C2420] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B89768] focus:border-[#B89768] resize-none"
                />
              </div>

              <div className="pt-2 flex flex-col items-center gap-4">
                <button
                  type="submit"
                  className="group relative inline-flex items-center gap-3 bg-[#2C2420] text-[#FCFAF8] px-12 py-4 rounded-full text-xs tracking-[0.2em] uppercase font-medium transition-all duration-500 ease-out hover:bg-[#4A3D36] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C2420] focus-visible:ring-offset-4 focus-visible:ring-offset-[#FCFAF8]"
                >
                  <span>Send Private Inquiry</span>
                  <ArrowRight size={16} strokeWidth={1.5} className="transition-transform duration-500 group-hover:translate-x-1" aria-hidden="true" />
                </button>
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#8C8273]">
                  Fields marked * are required
                </span>
              </div>
            </form>
          </motion.div>
        </section>

        {/* ================= SECTION: FAQ ================= */}
        <section aria-labelledby="faq-heading" className="py-16 md:py-24 px-6 md:px-12 lg:px-24 max-w-3xl mx-auto border-t border-[#EAE5DF]">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={fadeUp}
          >
            <div className="text-center mb-16">
              <h2 id="faq-heading" className="text-3xl font-serif font-light text-[#2C2420] mb-4">
                Frequently Asked Questions
              </h2>
              <Rule className="mx-auto" />
            </div>

            <div className="space-y-4">
              {faqs.map((faq, index) => {
                const isOpen = activeFaq === index;
                const panelId = `faq-panel-${index}`;
                const buttonId = `faq-button-${index}`;
                return (
                  <div
                    key={faq.question}
                    className="border border-[#EAE5DF] rounded-2xl overflow-hidden"
                  >
                    <h3 className="m-0">
                      <button
                        id={buttonId}
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        onClick={() => setActiveFaq(isOpen ? null : index)}
                        className="w-full flex justify-between items-center gap-4 px-6 py-5 text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B89768] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FCFAF8]"
                      >
                        <span className="font-serif text-[#2C2420] text-lg font-light group-hover:text-[#B89768] transition-colors">
                          {faq.question}
                        </span>
                        <ChevronDown
                          size={20}
                          strokeWidth={1.5}
                          aria-hidden="true"
                          className={`text-[#B89768] transition-transform duration-300 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
                        />
                      </button>
                    </h3>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          id={panelId}
                          role="region"
                          aria-labelledby={buttonId}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: shouldReduceMotion ? 0 : 0.4, ease: [0.16, 1, 0.3, 1] }}
                        >
                          <p className="text-[#5C4D44] font-light leading-[1.8] px-6 pb-6">
                            {faq.answer}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Contact;
