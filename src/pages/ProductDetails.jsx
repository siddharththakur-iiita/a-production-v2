
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  ChevronRight,
  ChevronDown,
  MessageCircle,
  ArrowRight,
  Scissors,
  Ruler,
  Shield,
  Globe,
  Award,
  Sparkles,
  CheckCircle,
  Clock,
  Gem,
  User,
  Feather
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const ProductDetails = () => {
  const [activeImage, setActiveImage] = useState('/product-1.jpg');
  const [activeAccordion, setActiveAccordion] = useState(null);

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

  const product = {
    id: "ivory-zardosi-sherwani",
    name: "The Ivory Zardosi Sherwani",
    category: "Men's Couture",
    description: "An extraordinary testament to royal Indian heritage, this masterpiece features exquisite hand-embroidered Zardosi work on pure raw silk. Designed for the modern aesthete, its structured silhouette is complemented by delicate muted gold accents, offering an unparalleled presence for momentous occasions.",
    fabric: "100% Pure Raw Silk",
    craftsmanship: "Hand-embroidered Zardosi, French Knots",
    availability: "Made To Order (6-8 Weeks)",
    images: [
      '/product-1.jpg',
      '/product-2.jpg',
      '/product-3.jpg',
      '/product-4.jpg',
      '/product-5.jpg'
    ]
  };

  const highlights = [
    { icon: <Scissors size={24} />, title: "Handcrafted", desc: "Meticulously hand-stitched by master artisans." },
    { icon: <Ruler size={24} />, title: "Made To Measure", desc: "Available for custom tailoring to your exact silhouette." },
    { icon: <Sparkles size={24} />, title: "Premium Fabric", desc: "Sourced from the world's most prestigious textile mills." },
    { icon: <Award size={24} />, title: "Artisan Finished", desc: "Exquisite detailing and flawless hand-finishing." },
    { icon: <Globe size={24} />, title: "Worldwide Shipping", desc: "Securely delivered to you, anywhere in the world." }
  ];

  const whyLoveIt = [
    { icon: <Clock size={24} />, title: "Timeless Design", desc: "Aesthetic brilliance that transcends seasonal trends." },
    { icon: <Gem size={24} />, title: "Handcrafted Heritage", desc: "Rooted in centuries of artisanal mastery." },
    { icon: <User size={24} />, title: "Made For You", desc: "Personalized to reflect your unique individual expression." },
    { icon: <Feather size={24} />, title: "Exceptional Comfort", desc: "Uncompromising ease and luxurious drape." }
  ];

  const accordionData = [
    { title: "Fabric & Composition", content: "Crafted from 100% pure raw silk, sourced ethically and woven by heritage looms. The inner lining features breathable Cupro for ultimate comfort and drape. Intricate embellishments are woven using pure metallic threads." },
    { title: "Care Instructions", content: "This is a delicate handcrafted garment. Dry clean only by a luxury specialist. Do not iron directly on embroidery. Store in the provided breathable garment bag in a cool, dry place, away from direct sunlight." },
    { title: "Shipping & Delivery", content: "As this piece is made-to-order, please allow 6-8 weeks for creation. Once completed, it is shipped globally via insured, expedited luxury courier services. A tracking concierge will keep you updated throughout the journey." },
    { title: "Customization", content: "Our atelier welcomes bespoke alterations. Elements such as color, embroidery density, and inner lining can be tailored to your specific preferences during your private consultation." },
    { title: "Measurements", content: "To ensure a flawless fit, we require a comprehensive set of measurements. This can be conducted in our private atelier, or virtually with the assistance of our detailed guide and your local trusted tailor." }
  ];

  const relatedProducts = [
    { id: "midnight-velvet-bandhgala", name: "The Midnight Velvet Bandhgala", category: "Men's Couture", img: "/related-1.jpg" },
    { id: "emerald-silk-kurta", name: "The Emerald Silk Kurta Set", category: "Men's Occasion Wear", img: "/related-2.jpg" },
    { id: "walnut-jacquard-sherwani", name: "The Walnut Jacquard Sherwani", category: "Men's Couture", img: "/related-3.jpg" },
    { id: "muted-gold-safa", name: "The Muted Gold Safa", category: "Accessories", img: "/related-4.jpg" }
  ];

  return (
    <div className="min-h-screen bg-[#FCFAF8] text-[#2C2420] font-sans selection:bg-[#EAE5DF] selection:text-[#2C2420]">
      <Navbar />

      {/* Breadcrumb */}
      <div className="pt-32 pb-8 px-6 md:px-12 lg:px-24 max-w-7xl mx-auto">
        <motion.nav 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center space-x-2 text-xs uppercase tracking-widest text-[#5C4D44] font-medium"
        >
          <Link to="/" className="hover:text-[#B89768] transition-colors">Home</Link>
          <ChevronRight size={12} className="text-[#EAE5DF]" />
          <Link to="/collections" className="hover:text-[#B89768] transition-colors">Collections</Link>
          <ChevronRight size={12} className="text-[#EAE5DF]" />
          <Link to="/collections/men" className="hover:text-[#B89768] transition-colors">Men</Link>
          <ChevronRight size={12} className="text-[#EAE5DF]" />
          <span className="text-[#B89768]">{product.name}</span>
        </motion.nav>
      </div>

      {/* Editorial Product Showcase */}
      <section className="pb-24 px-6 md:px-12 lg:px-24 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24">
          
          {/* Left: Image Gallery */}
          <div className="lg:col-span-7 flex flex-col md:flex-row gap-6">
            {/* Thumbnails (Desktop: Left, Mobile: Bottom) */}
            <div className="order-2 md:order-1 flex md:flex-col gap-4 overflow-x-auto md:overflow-visible no-scrollbar">
              {product.images.map((img, idx) => (
                <button 
                  key={idx}
                  onClick={() => setActiveImage(img)}
                  className={`relative flex-shrink-0 w-20 h-28 md:w-24 md:h-32 rounded-xl overflow-hidden transition-all duration-300 ${activeImage === img ? 'ring-1 ring-[#B89768] opacity-100' : 'opacity-60 hover:opacity-100'}`}
                >
                  <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>

            {/* Main Image */}
            <div className="order-1 md:order-2 flex-grow aspect-[3/4] rounded-[2.5rem] overflow-hidden shadow-xl bg-[#F5F2EC] relative group">
              <AnimatePresence mode="wait">
                <motion.img
                  key={activeImage}
                  src={activeImage}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6, ease: "easeInOut" }}
                  className="w-full h-full object-cover transition-transform duration-[1.5s] ease-out group-hover:scale-105"
                  alt={product.name}
                />
              </AnimatePresence>
            </div>
          </div>

          {/* Right: Product Details */}
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="lg:col-span-5 flex flex-col justify-center"
          >
            <motion.span variants={fadeUp} className="text-[#B89768] tracking-[0.25em] uppercase text-xs font-semibold mb-4 block">
              {product.category}
            </motion.span>
            <motion.h1 variants={fadeUp} className="text-4xl md:text-5xl lg:text-6xl font-serif text-[#2C2420] mb-4 leading-tight">
              {product.name}
            </motion.h1>
            <motion.p variants={fadeUp} className="text-lg md:text-xl font-light text-[#5C4D44] mb-8 italic tracking-wide">
              Made Exclusively To Order
            </motion.p>
            
            <motion.div variants={fadeUp} className="w-12 h-[1px] bg-[#EAE5DF] mb-8" />
            
            <motion.p variants={fadeUp} className="text-[#5C4D44] text-base font-light leading-relaxed mb-8">
              {product.description}
            </motion.p>

            <motion.div variants={fadeUp} className="space-y-4 mb-10">
              <div className="flex items-start gap-3">
                <CheckCircle size={18} className="text-[#B89768] mt-0.5 flex-shrink-0" strokeWidth={1.5} />
                <p className="text-sm font-light text-[#2C2420]"><span className="text-[#5C4D44] uppercase tracking-widest text-xs font-medium mr-2">Fabric:</span> {product.fabric}</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle size={18} className="text-[#B89768] mt-0.5 flex-shrink-0" strokeWidth={1.5} />
                <p className="text-sm font-light text-[#2C2420]"><span className="text-[#5C4D44] uppercase tracking-widest text-xs font-medium mr-2">Craft:</span> {product.craftsmanship}</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle size={18} className="text-[#B89768] mt-0.5 flex-shrink-0" strokeWidth={1.5} />
                <p className="text-sm font-light text-[#2C2420]"><span className="text-[#5C4D44] uppercase tracking-widest text-xs font-medium mr-2">Status:</span> {product.availability}</p>
              </div>
            </motion.div>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4">
              <Link 
                to="/contact#contact-form"
                className="flex-1 inline-flex justify-center items-center gap-3 bg-[#2C2420] text-[#FCFAF8] px-8 py-5 rounded-full uppercase tracking-widest text-xs font-medium hover:bg-[#4A3D36] transition-all duration-300 shadow-md"
              >
                Request Consultation
              </Link>
              <a 
                href="https://wa.me/91XXXXXXXXXX" 
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex justify-center items-center gap-3 bg-transparent border border-[#EAE5DF] text-[#2C2420] px-8 py-5 rounded-full uppercase tracking-widest text-xs font-medium hover:border-[#B89768] hover:text-[#B89768] transition-all duration-300"
              >
                <MessageCircle size={16} /> WhatsApp
              </a>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Product Highlights */}
      <section className="py-24 px-6 md:px-12 lg:px-24 bg-[#F5F2EC] border-t border-[#EAE5DF]">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="max-w-7xl mx-auto flex flex-wrap justify-center gap-6 lg:gap-8"
        >
          {highlights.map((item, idx) => (
            <motion.div 
              key={idx} 
              variants={fadeUp}
              className="bg-white/60 backdrop-blur-md border border-[#EAE5DF] p-8 rounded-3xl flex flex-col items-center text-center w-full sm:w-[calc(50%-1rem)] lg:w-[calc(20%-1.5rem)] shadow-[0_4px_20px_-10px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_-10px_rgba(0,0,0,0.08)] transition-all duration-500 group"
            >
              <div className="text-[#B89768] mb-5 bg-[#FCFAF8] w-14 h-14 flex items-center justify-center rounded-full border border-[#EAE5DF] group-hover:scale-110 transition-transform duration-500">
                {item.icon}
              </div>
              <h4 className="font-serif text-[#2C2420] text-lg mb-2">{item.title}</h4>
              <p className="text-xs font-light text-[#5C4D44] leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Why You'll Love It */}
      <section className="py-24 px-6 md:px-12 lg:px-24 bg-[#FCFAF8] border-t border-[#EAE5DF]">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeUp}
          className="text-center mb-16 max-w-3xl mx-auto"
        >
          <h2 className="text-3xl md:text-4xl font-serif text-[#2C2420] mb-6">Why You'll Love It</h2>
          <div className="w-12 h-[1px] bg-[#B89768] mx-auto mb-8" />
          <p className="text-[#5C4D44] font-light text-lg leading-relaxed">
            Every creation reflects our philosophy of timeless elegance, uncompromising craftsmanship and individual expression.
          </p>
        </motion.div>

        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto"
        >
          {whyLoveIt.map((feature, index) => (
            <motion.div 
              key={index}
              variants={fadeUp}
              className="bg-white/80 backdrop-blur-md border border-[#EAE5DF] p-10 rounded-3xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_-10px_rgba(0,0,0,0.08)] transition-all duration-500 flex flex-col h-full"
            >
              <div className="text-[#B89768] mb-6 bg-[#F5F2EC] w-14 h-14 flex items-center justify-center rounded-full border border-[#EAE5DF]">
                {feature.icon}
              </div>
              <h3 className="text-xl font-serif mb-4 text-[#2C2420]">{feature.title}</h3>
              <p className="text-[#5C4D44] font-light leading-relaxed text-sm">
                {feature.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Editorial Story */}
      <section className="py-32 px-6 md:px-12 lg:px-24 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            className="aspect-[4/5] rounded-[3rem] overflow-hidden shadow-lg order-2 lg:order-1"
          >
            <img 
              src="/editorial-story.jpg" 
              alt="Editorial Inspiration" 
              className="w-full h-full object-cover transition-transform duration-[2s] hover:scale-105"
              loading="lazy"
            />
          </motion.div>
          
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="order-1 lg:order-2 lg:pl-12"
          >
            <motion.span variants={fadeUp} className="text-[#B89768] tracking-[0.25em] uppercase text-xs font-semibold mb-6 block">
              The Story Behind The Craft
            </motion.span>
            <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-serif text-[#2C2420] mb-8 leading-tight">
              Heritage Meets <br /> Modern Luxury
            </motion.h2>
            <motion.div variants={fadeUp} className="w-12 h-[1px] bg-[#B89768] mb-8" />
            <motion.div variants={fadeUp} className="space-y-6 text-[#5C4D44] font-light text-lg leading-relaxed">
              <p>
                Rooted in the royal courts of ancient India, this design draws inspiration from archival textile fragments, reimagined for the contemporary connoisseur. 
              </p>
              <p>
                Every motif is a labor of love, brought to life by master artisans whose skills have been passed down through generations. The result is not merely an article of clothing, but a wearable artifact—a bridge between legendary craftsmanship and modern elegance.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Garment Details Accordion */}
      <section className="py-24 px-6 md:px-12 lg:px-24 bg-white border-y border-[#EAE5DF]">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeUp}
          className="max-w-3xl mx-auto"
        >
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif text-[#2C2420] mb-4">Garment Details</h2>
            <div className="w-12 h-[1px] bg-[#B89768] mx-auto" />
          </div>

          <div className="space-y-4">
            {accordionData.map((item, index) => (
              <div 
                key={index} 
                className="bg-[#FCFAF8] border border-[#EAE5DF] rounded-2xl overflow-hidden transition-all duration-300"
              >
                <button
                  onClick={() => setActiveAccordion(activeAccordion === index ? null : index)}
                  className="w-full flex justify-between items-center px-8 py-6 text-left group"
                >
                  <span className="font-serif text-[#2C2420] text-lg group-hover:text-[#B89768] transition-colors">
                    {item.title}
                  </span>
                  <ChevronDown 
                    size={20} 
                    className={`text-[#B89768] transition-transform duration-300 flex-shrink-0 ml-4 ${activeAccordion === index ? 'rotate-180' : ''}`} 
                  />
                </button>
                <AnimatePresence>
                  {activeAccordion === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                      <p className="text-[#5C4D44] font-light leading-relaxed px-8 pb-8 text-sm">
                        {item.content}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Complete The Look & You May Also Like */}
      <section className="py-32 px-6 md:px-12 lg:px-24 max-w-7xl mx-auto">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeUp}
          className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6"
        >
          <div>
            <h2 className="text-3xl md:text-4xl font-serif text-[#2C2420] mb-4">Complete The Look</h2>
            <div className="w-12 h-[1px] bg-[#B89768]" />
          </div>
          <Link to="/collections" className="group inline-flex items-center gap-2 text-[#5C4D44] hover:text-[#B89768] transition-colors text-xs uppercase tracking-widest font-medium">
            View All <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </motion.div>

        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8"
        >
          {relatedProducts.map((prod, idx) => (
            <motion.div key={idx} variants={fadeUp}>
              <Link to={`/product/${prod.id}`} className="group block cursor-pointer">
                <div className="aspect-[3/4] rounded-3xl overflow-hidden mb-6 bg-[#F5F2EC]">
                  <img 
                    src={prod.img} 
                    alt={prod.name} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <div className="text-center px-4">
                  <span className="text-[#B89768] tracking-[0.2em] uppercase text-[10px] font-semibold mb-2 block">
                    {prod.category}
                  </span>
                  <h3 className="text-lg font-serif text-[#2C2420] mb-2 group-hover:text-[#B89768] transition-colors line-clamp-1">
                    {prod.name}
                  </h3>
                  <span className="text-xs font-light text-[#5C4D44] uppercase tracking-wider">
                    Consult to Purchase
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Luxury CTA */}
      <section className="py-24 px-6 md:px-12 lg:px-24 max-w-6xl mx-auto mb-20">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeUp}
          className="bg-white/80 backdrop-blur-lg border border-[#EAE5DF] rounded-[4rem] p-16 md:p-24 text-center shadow-[0_10px_50px_-15px_rgba(0,0,0,0.05)]"
        >
          <Shield className="mx-auto text-[#B89768] mb-6" size={32} strokeWidth={1.5} />
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif text-[#2C2420] mb-6">Looking For Something Truly Unique?</h2>
          <div className="w-16 h-[1px] bg-[#B89768] mx-auto mb-8" />
          <p className="text-[#5C4D44] text-xl font-light leading-relaxed max-w-2xl mx-auto mb-12">
            Our bespoke tailoring service allows every garment to be customised exclusively for you, from silhouette to embroidery.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link 
              to="/custom-tailoring"
              className="w-full sm:w-auto inline-flex justify-center items-center gap-3 bg-[#2C2420] text-[#FCFAF8] px-10 py-5 rounded-full uppercase tracking-widest text-xs font-medium hover:bg-[#4A3D36] transition-all duration-300 shadow-md"
            >
              Start Custom Tailoring
            </Link>
            <Link 
              to="/contact#contact-form"
              className="w-full sm:w-auto inline-flex justify-center items-center gap-3 bg-transparent border border-[#2C2420] text-[#2C2420] px-10 py-5 rounded-full uppercase tracking-widest text-xs font-medium hover:bg-[#2C2420] hover:text-[#FCFAF8] transition-all duration-300"
            >
              Speak With Our Concierge
            </Link>
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
};

export default ProductDetails;
