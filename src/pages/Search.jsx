import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Search, 
  ArrowRight, 
  SearchX,
  Shield,
  MessageCircle,
  X
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ProductCard from '../components/product/ProductCard';

const SearchPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const categories = [
    'All',
    'Women',
    'Men',
    'Kids',
    'Bridal',
    'Festive',
    'Custom Tailoring',
    'Accessories'
  ];

  const mockProducts = [
    { 
      id: "ivory-zardosi-sherwani", 
      name: "The Ivory Zardosi Sherwani", 
      category: "Men", 
      desc: "Exquisite hand-embroidered Zardosi work on pure raw silk.",
      img: "/product-1.jpg",
      badge: "Made To Order"
    },
    { 
      id: "crimson-heritage-lehenga", 
      name: "The Crimson Heritage Lehenga", 
      category: "Bridal", 
      desc: "Intricate zardozi and gota patti on rich velvet.",
      img: "/product-2.jpg",
      badge: "Bespoke"
    },
    { 
      id: "emerald-silk-kurta", 
      name: "The Emerald Silk Kurta Set", 
      category: "Men", 
      desc: "Fluid emerald silk with minimal muted gold accents.",
      img: "/product-3.jpg",
      badge: "Made To Order"
    },
    { 
      id: "blush-organza-anarkali", 
      name: "The Blush Organza Anarkali", 
      category: "Women", 
      desc: "Ethereal organza detailed with delicate pearl embroidery.",
      img: "/product-4.jpg",
      badge: "Made To Order"
    },
    { 
      id: "midnight-velvet-bandhgala", 
      name: "The Midnight Velvet Bandhgala", 
      category: "Men", 
      desc: "Structured velvet silhouette for momentous occasions.",
      img: "/related-1.jpg",
      badge: "Custom"
    },
    { 
      id: "pastel-brocade-lehenga", 
      name: "The Pastel Brocade Lehenga", 
      category: "Festive", 
      desc: "Lightweight heritage brocade woven with metallic threads.",
      img: "/related-2.jpg",
      badge: "Made To Order"
    },
    { 
      id: "muted-gold-safa", 
      name: "The Muted Gold Safa", 
      category: "Accessories", 
      desc: "Hand-twisted tissue silk safa for the modern groom.",
      img: "/related-4.jpg",
      badge: "Made To Order"
    },
    { 
      id: "ivory-silk-kurta-kids", 
      name: "The Mini Ivory Silk Kurta", 
      category: "Kids", 
      desc: "Uncompromising luxury tailored for the little ones.",
      img: "/product-kids-1.jpg",
      badge: "Made To Order"
    }
  ];

  const filteredProducts = useMemo(() => {
    return mockProducts.filter(product => {
      const matchesSearch = 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (product.desc || product.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = activeCategory === 'All' || product.category === activeCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, activeCategory]);

  return (
    <div className="min-h-screen bg-[#FCFAF8] text-[#2C2420] font-sans selection:bg-[#EAE5DF] selection:text-[#2C2420]">
      <Navbar />

      {/* Hero & Search Section */}
      <section className="pt-40 pb-16 px-6 md:px-12 lg:px-24 bg-gradient-to-b from-[#F5F2EC] to-[#FCFAF8]">
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="max-w-4xl mx-auto text-center"
        >
          <motion.span variants={fadeUp} className="text-[#B89768] tracking-[0.25em] uppercase text-xs font-semibold mb-6 block">
            The Archives
          </motion.span>
          <motion.h1 variants={fadeUp} className="text-4xl md:text-6xl font-serif font-light mb-6 text-[#2C2420] tracking-wide">
            Discover Your Perfect Piece
          </motion.h1>
          <motion.p variants={fadeUp} className="text-[#5C4D44] text-lg font-light max-w-2xl mx-auto mb-12 leading-relaxed">
            Search through our exclusive collections crafted for timeless elegance. Every garment is a testament to uncompromising luxury.
          </motion.p>

          <motion.div variants={fadeUp} className="relative max-w-2xl mx-auto">
            <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-[#B89768]">
              <Search size={20} strokeWidth={1.5} />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search for 'Sherwani', 'Silk', or 'Bridal'..."
              className="w-full bg-white/60 backdrop-blur-xl border border-[#EAE5DF] rounded-full py-5 pl-14 pr-14 text-[#2C2420] placeholder:text-[#5C4D44]/50 focus:outline-none focus:border-[#B89768] focus:ring-1 focus:ring-[#B89768] transition-all duration-300 shadow-[0_8px_30px_-10px_rgba(0,0,0,0.04)] text-lg font-light"
            />
            <AnimatePresence>
              {searchTerm && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 pr-6 flex items-center text-[#5C4D44] hover:text-[#B89768] transition-colors"
                >
                  <X size={20} strokeWidth={1.5} />
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Search Results Summary */}
          <motion.div variants={fadeUp} className="mt-6 text-[#5C4D44] text-xs tracking-widest uppercase font-medium">
            {searchTerm ? (
              `Showing ${filteredProducts.length} result${filteredProducts.length !== 1 ? 's' : ''} for "${searchTerm}"`
            ) : (
              `Showing ${filteredProducts.length} luxury piece${filteredProducts.length !== 1 ? 's' : ''}`
            )}
          </motion.div>

          {/* Luxury Statistics Row */}
          <motion.div variants={fadeUp} className="mt-16 pt-8 border-t border-[#EAE5DF] flex flex-wrap justify-center items-center gap-6 md:gap-12 text-[#5C4D44] text-xs uppercase tracking-widest font-medium">
            <span>250+ Luxury Pieces</span>
            <span className="hidden md:inline text-[#B89768]">•</span>
            <span>Made To Order</span>
            <span className="hidden md:inline text-[#B89768]">•</span>
            <span>Worldwide Shipping</span>
            <span className="hidden md:inline text-[#B89768]">•</span>
            <span>Custom Tailoring</span>
          </motion.div>
        </motion.div>
      </section>

      {/* Category Filters */}
      <section className="py-8 px-6 md:px-12 lg:px-24 max-w-7xl mx-auto border-b border-[#EAE5DF]">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="flex flex-wrap justify-center gap-3 md:gap-4"
        >
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-6 py-2.5 rounded-full text-xs uppercase tracking-widest font-medium transition-all duration-300 ${
                activeCategory === category
                  ? 'bg-[#2C2420] text-[#FCFAF8] shadow-md'
                  : 'bg-transparent border border-[#EAE5DF] text-[#5C4D44] hover:border-[#B89768] hover:text-[#2C2420]'
              }`}
            >
              {category}
            </button>
          ))}
        </motion.div>
      </section>

      {/* Search Results */}
      <section className="py-24 px-6 md:px-12 lg:px-24 max-w-7xl mx-auto min-h-[50vh]">
        <AnimatePresence mode="wait">
          {filteredProducts.length > 0 ? (
            <motion.div 
              key="results"
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0 }}
              variants={staggerContainer}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8"
            >
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={{
                    ...product,
                    image: product.image || product.img,
                    description: product.description || product.desc
                  }}
                  variants={fadeUp}
                />
              ))}
            </motion.div>
          ) : (
            <motion.div 
              key="empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center justify-center text-center py-10"
            >
              <div className="w-24 h-24 bg-[#F5F2EC] rounded-full flex items-center justify-center mb-8 border border-[#EAE5DF]">
                <SearchX size={32} className="text-[#B89768]" strokeWidth={1.5} />
              </div>
              <h2 className="text-3xl font-serif text-[#2C2420] mb-4">No Matching Pieces Found</h2>
              <p className="text-[#5C4D44] font-light text-lg mb-10 max-w-md">
                Try refining your search terms or explore our curated collections to find your perfect garment.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mb-16">
                <Link 
                  to="/collections"
                  onClick={() => {
                    setSearchTerm('');
                    setActiveCategory('All');
                  }}
                  className="inline-flex justify-center items-center gap-3 bg-[#2C2420] text-[#FCFAF8] px-8 py-4 rounded-full uppercase tracking-widest text-xs font-medium hover:bg-[#4A3D36] transition-all duration-300 shadow-md"
                >
                  Explore Collections <ArrowRight size={16} />
                </Link>
                <Link 
                  to="/contact"
                  className="inline-flex justify-center items-center gap-3 bg-transparent border border-[#2C2420] text-[#2C2420] px-8 py-4 rounded-full uppercase tracking-widest text-xs font-medium hover:bg-[#2C2420] hover:text-[#FCFAF8] transition-all duration-300"
                >
                  Speak With Our Concierge
                </Link>
              </div>

              {/* Suggested Collections for Empty State */}
              <div className="border-t border-[#EAE5DF] pt-12 w-full max-w-2xl mx-auto">
                <h3 className="text-xs uppercase tracking-widest text-[#B89768] mb-6 font-semibold">Suggested Collections</h3>
                <div className="flex flex-wrap justify-center gap-4">
                  <Link 
                    to="/collections/wedding" 
                    className="px-6 py-3 bg-white/60 backdrop-blur-md border border-[#EAE5DF] rounded-full text-sm font-medium text-[#5C4D44] hover:border-[#B89768] hover:text-[#2C2420] transition-colors"
                  >
                    Wedding
                  </Link>
                  <Link 
                    to="/collections/festive" 
                    className="px-6 py-3 bg-white/60 backdrop-blur-md border border-[#EAE5DF] rounded-full text-sm font-medium text-[#5C4D44] hover:border-[#B89768] hover:text-[#2C2420] transition-colors"
                  >
                    Festive
                  </Link>
                  <Link 
                    to="/collections/signature" 
                    className="px-6 py-3 bg-white/60 backdrop-blur-md border border-[#EAE5DF] rounded-full text-sm font-medium text-[#5C4D44] hover:border-[#B89768] hover:text-[#2C2420] transition-colors"
                  >
                    Signature Collection
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Luxury CTA */}
      <section className="py-24 px-6 md:px-12 lg:px-24 max-w-6xl mx-auto mb-20 border-t border-[#EAE5DF]">
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
            Can't find what you're looking for? Our atelier can create a bespoke garment exclusively for you.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link 
              to="/custom-tailoring"
              className="w-full sm:w-auto inline-flex justify-center items-center gap-3 bg-[#2C2420] text-[#FCFAF8] px-10 py-5 rounded-full uppercase tracking-widest text-xs font-medium hover:bg-[#4A3D36] transition-all duration-300 shadow-md"
            >
              Start Custom Tailoring
            </Link>
            <Link 
              to="/contact"
              className="w-full sm:w-auto inline-flex justify-center items-center gap-3 bg-transparent border border-[#2C2420] text-[#2C2420] px-10 py-5 rounded-full uppercase tracking-widest text-xs font-medium hover:bg-[#2C2420] hover:text-[#FCFAF8] transition-all duration-300"
            >
              <MessageCircle size={16} /> Speak With Our Concierge
            </Link>
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
};

export default SearchPage;