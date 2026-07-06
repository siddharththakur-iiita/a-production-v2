import React, { useState, memo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const ProductCard = memo(({ product, variants }) => {
    const [imgError, setImgError] = useState(false);

    // Default animation variants if not provided by a parent stagger container
    const defaultVariants = {
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
    };

    const cardVariants = variants || defaultVariants;

    if (!product) return null;

    // Pre-compute standardized data to avoid repeated checks
    const productImage = product.image || product.img || product.images?.[0];
    const productDescription = product.description || product.desc;
    const showPlaceholder = !productImage || imgError;

    return (
        <motion.div variants={cardVariants}>
            <Link
                to={`/product/${product.id}`}
                className="group block cursor-pointer"
                aria-label={`View details for ${product.name}`}
            >
                <div className="aspect-[3/4] rounded-3xl overflow-hidden mb-6 bg-[#F5F2EC] relative shadow-[0_4px_20px_-10px_rgba(0,0,0,0.03)] group-hover:shadow-[0_8px_30px_-10px_rgba(0,0,0,0.08)] transition-all duration-500">

                    {/* Luxury Badges Container */}
                    <div 
                        className="absolute top-4 left-4 right-4 flex justify-between items-start z-10 pointer-events-none"
                        aria-hidden="true"
                    >
                        <div className="flex flex-col gap-2">
                            {product.badge && (
                                <span className="bg-white/80 backdrop-blur-md px-4 py-1.5 rounded-full text-[9px] uppercase tracking-[0.2em] font-semibold text-[#2C2420] border border-[#EAE5DF]/50 shadow-sm inline-block w-max">
                                    {product.badge}
                                </span>
                            )}
                            {product.featured && !product.badge && (
                                <span className="bg-white/80 backdrop-blur-md px-4 py-1.5 rounded-full text-[9px] uppercase tracking-[0.2em] font-semibold text-[#2C2420] border border-[#EAE5DF]/50 shadow-sm inline-block w-max">
                                    Featured
                                </span>
                            )}
                        </div>

                        {product.newArrival && (
                            <span className="bg-[#B89768]/90 backdrop-blur-md px-4 py-1.5 rounded-full text-[9px] uppercase tracking-[0.2em] font-semibold text-white border border-[#B89768]/50 shadow-sm inline-block w-max">
                                New Arrival
                            </span>
                        )}
                    </div>

                    {/* Lazy Loaded Image or Luxury Placeholder */}
                    {showPlaceholder ? (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-[#F5F2EC] transition-transform duration-[1.5s] ease-out group-hover:scale-105">
                            <span className="text-8xl font-serif text-[#2C2420]/10 leading-none select-none" aria-hidden="true">
                                A
                            </span>
                            <span className="text-[9px] uppercase tracking-[0.2em] font-semibold text-[#5C4D44]/40 mt-4 select-none">
                                Image Coming Soon
                            </span>
                        </div>
                    ) : (
                        <img
                            src={productImage}
                            alt={product.name || "Luxury fashion piece"}
                            className="w-full h-full object-cover transition-transform duration-[1.5s] ease-out group-hover:scale-105"
                            loading="lazy"
                            onError={() => setImgError(true)}
                        />
                    )}
                </div>

                {/* Editorial Text Container */}
                <div className="text-center px-4 relative overflow-hidden">
                    <span className="text-[#B89768] tracking-[0.2em] uppercase text-[10px] font-semibold mb-2 block">
                        {product.category}
                    </span>

                    <h3 className="text-lg font-serif text-[#2C2420] mb-2 group-hover:text-[#B89768] transition-colors line-clamp-1">
                        {product.name}
                    </h3>

                    {productDescription && (
                        <p className="text-[#5C4D44] font-light text-xs leading-relaxed line-clamp-2">
                            {productDescription}
                        </p>
                    )}

                    {/* View Details Animated Reveal */}
                    <div className="overflow-hidden mt-3 h-5" aria-hidden="true">
                        <p className="text-[#B89768] text-[10px] uppercase tracking-widest font-medium opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500 ease-out flex items-center justify-center gap-1">
                            View Details <ArrowRight size={12} aria-hidden="true" />
                        </p>
                    </div>
                </div>
            </Link>
        </motion.div>
    );
});

ProductCard.displayName = 'ProductCard';

export default ProductCard;