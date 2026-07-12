import { memo, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FaInstagram } from "react-icons/fa6";
import { MessageCircle } from "lucide-react";

const EASE_LUXURY = [0.16, 1, 0.3, 1];
const EASE_STYLE = { '--ease-luxury': 'cubic-bezier(0.16, 1, 0.3, 1)' };

const QUICK_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Collections', to: '/collections' },
  { label: 'Custom Design', to: '/custom-tailoring' },
  { label: 'Contact', to: '/contact' },
];

const CONTACT_DETAILS = [
  { label: '+91 87651 76866', href: 'tel:+918765176866' },
  { label: 'aprodcoution@gmail.com', href: 'mailto:aprodcoution@gmail.com' },
];

const SOCIAL_LINKS = [
  {
    label: 'Instagram',
    href: 'https://instagram.com/YOUR_INSTAGRAM',
    icon: FaInstagram,
  },
  {
    label: 'WhatsApp',
    href: 'https://wa.me/918765176866',
    icon: MessageCircle,
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.05 }
  }
};

const LINK_CLASS =
  'inline-flex items-center gap-2 py-1 text-gray-400 transition-colors duration-300 ease-[var(--ease-luxury)] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A27A]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1E1E1E] rounded-sm';

/** Shared column heading — keeps the three secondary columns visually identical without repeating the class string three times. */
function ColumnHeading({ children }) {
  return (
    <h3 className="mb-6 text-2xl font-serif text-[#C8A27A]">
      {children}
    </h3>
  );
}

function Footer() {
  const shouldReduceMotion = useReducedMotion();

  const itemVariants = useMemo(
    () => ({
      hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 24 },
      show: {
        opacity: 1,
        y: 0,
        transition: { duration: shouldReduceMotion ? 0.4 : 1.1, ease: EASE_LUXURY }
      }
    }),
    [shouldReduceMotion]
  );

  return (
    <footer
      className="bg-[#1E1E1E] px-6 py-24 text-white sm:px-8 lg:px-16 lg:py-32"
      style={EASE_STYLE}
    >
      <motion.div
        className="mx-auto max-w-[1800px]"
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-100px' }}
      >
        <div className="grid gap-14 sm:grid-cols-2 lg:grid-cols-4 lg:gap-16">

          {/* Brand */}
          <motion.div variants={itemVariants}>
            <h2 className="mb-5 font-serif text-4xl tracking-[0.04em] text-[#C8A27A]">
              A Productions
            </h2>
            <p className="max-w-sm leading-relaxed text-gray-400">
              Custom fashion studio specialising in made-to-order couture, contemporary fashion, bridal inspirations and personalized tailoring.
            </p>
          </motion.div>

          {/* Quick Links */}
          <motion.div variants={itemVariants}>
            <ColumnHeading>Quick Links</ColumnHeading>
            <nav aria-label="Footer">
              <ul className="space-y-2">
                {QUICK_LINKS.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} className={LINK_CLASS}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </motion.div>

          {/* Contact */}
          <motion.div variants={itemVariants}>
            <ColumnHeading>Contact</ColumnHeading>
            <ul className="space-y-2">
              {CONTACT_DETAILS.map((detail) => (
                <li key={detail.href}>
                  <a href={detail.href} className={LINK_CLASS}>
                    {detail.label}
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Socials */}
          <motion.div variants={itemVariants}>
            <ColumnHeading>Connect</ColumnHeading>
            <ul className="space-y-2">
              {SOCIAL_LINKS.map(({ label, href, icon: Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`${label} (opens in a new tab)`}
                    className={LINK_CLASS}
                  >
                    <Icon className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>

        </div>

        <motion.div
          variants={itemVariants}
          className="mt-20 border-t border-[#3B2A21] pt-10 text-center text-sm text-gray-500"
        >
          © {new Date().getFullYear()} A Productions. All rights reserved.
        </motion.div>
      </motion.div>
    </footer>
  );
}

export default memo(Footer);
