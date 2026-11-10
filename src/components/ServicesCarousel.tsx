import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { apiUrl } from '../utils/api';
import { 
  ChevronLeft, 
  ChevronRight, 
  ArrowUpRight, 
  Sparkles, 
  ShieldCheck, 
  Gem, 
  Layers, 
  Activity, 
  Crosshair, 
  Smile, 
  Hammer, 
  HeartPulse, 
  Zap,
} from 'lucide-react';

interface ServiceItem {
  id: string;
  title: string;
  subtitle: string;
  category: 'cleaning' | 'restorative' | 'surgery' | 'cosmetic';
  badge: string;
  description: string;
  note: string;
  priceEstimate: string;
  icon: React.ReactNode;
  accentBg: string;
  metricLabel: string;
  metricValue: string;
  image: string;
}

const ALL_SERVICES: ServiceItem[] = [
  {
    id: 'scaling',
    title: 'Teeth Cleaning & Scaling',
    subtitle: 'Professional Plaque & Tartar Removal',
    category: 'cleaning',
    badge: 'Hygiene & Prevention',
    description: 'Professional dental cleaning to remove plaque and tartar for healthier gums and a fresher breath.',
    note: 'Deep ultrasonic cleaning and polishing',
    priceEstimate: '$95 / Rs. 5,000',
    icon: <ShieldCheck className="w-8 h-8 text-emerald-600" />,
    accentBg: 'from-emerald-100/60 via-stone-50 to-emerald-50/40',
    metricLabel: 'Biofilm Removal',
    metricValue: '99.9% Plaque Clean',
    image: '/assets/treatments/01.jpg'
  },
  {
    id: 'fillings',
    title: 'Tooth Fillings (Cavity Treatment)',
    subtitle: 'Composite & Natural Resin Restoration',
    category: 'restorative',
    badge: 'Tooth Preservation',
    description: 'Careful removal of decay followed by filling the cavity with tooth-colored composite for a seamless look.',
    note: 'Cavity filling and natural shade matching',
    priceEstimate: '$120 / Rs. 6,000',
    icon: <Sparkles className="w-8 h-8 text-amber-600" />,
    accentBg: 'from-amber-100/60 via-stone-50 to-stone-100/40',
    metricLabel: 'Material',
    metricValue: 'Nano-Hybrid Composite',
    image: '/assets/treatments/02.jpg'
  },
  {
    id: 'rct',
    title: 'Root Canal Treatment (RCT)',
    subtitle: 'Microscopic Nerve & Pulp Healing',
    category: 'restorative',
    badge: 'Pain Relief Guarantee',
    description: 'Advanced treatment to save a severely infected or damaged tooth by removing the pulp and sealing the root.',
    note: 'Painless laser and microscopic nerve treatment',
    priceEstimate: '$350 / Rs. 16,000',
    icon: <Activity className="w-8 h-8 text-rose-600" />,
    accentBg: 'from-rose-100/50 via-stone-50 to-amber-50/40',
    metricLabel: 'Tooth Saved',
    metricValue: '98% Success Rate',
    image: '/assets/treatments/03.jpg'
  },
  {
    id: 'whitening',
    title: 'Teeth Whitening (Bleaching)',
    subtitle: 'Cold-Light Laser Enamel Brightening',
    category: 'cosmetic',
    badge: 'Instant Brilliance',
    description: 'Professional laser process to effectively remove stains and brighten your smile significantly.',
    note: 'Up to 8 shades brighter in 45 minutes',
    priceEstimate: '$280 / Rs. 20,000',
    icon: <Gem className="w-8 h-8 text-cyan-600" />,
    accentBg: 'from-cyan-100/50 via-stone-50 to-amber-50/40',
    metricLabel: 'Shades Lift',
    metricValue: 'Up to 8 Shades in 45m',
    image: '/assets/treatments/05.jpg'
  },
  {
    id: 'gums',
    title: 'Gum Treatment (Periodontal Care)',
    subtitle: 'Gingivitis, Bleeding & Laser Therapy',
    category: 'cleaning',
    badge: 'Tissue Healing',
    description: 'Specialized care for gum diseases, including bleeding gums, swelling, and infection management.',
    note: 'Laser treatment for gum inflammation and bleeding',
    priceEstimate: '$150 / Rs. 8,500',
    icon: <HeartPulse className="w-8 h-8 text-rose-700" />,
    accentBg: 'from-rose-100/50 via-stone-50 to-stone-100/40',
    metricLabel: 'Healing Rate',
    metricValue: 'Immediate Inflammation Drop',
    image: '/assets/treatments/10.jpg'
  },
  {
    id: 'dentures',
    title: 'Dentures (Artificial Teeth Set)',
    subtitle: 'Complete & Partial Flexible Acrylic Plates',
    category: 'restorative',
    badge: 'Full Arch Comfort',
    description: 'Custom-made removable artificial teeth set designed for comfort and natural appearance.',
    note: 'Lightweight and natural-looking custom dentures',
    priceEstimate: '$450 / Rs. 35,000',
    icon: <Zap className="w-8 h-8 text-amber-800" />,
    accentBg: 'from-amber-100/60 via-stone-50 to-stone-100/40',
    metricLabel: 'Fit',
    metricValue: 'CAD/CAM Custom Contour',
    image: '/assets/treatments/09.jpg'
  },
  {
    id: 'aligners',
    title: 'Invisible Clear Aligners',
    subtitle: '3D Orthodontic Trays & Aligners',
    category: 'cosmetic',
    badge: 'Smile Alignment',
    description: 'Discreet, removable clear trays to straighten teeth without traditional metal braces.',
    note: 'Clear and invisible orthodontic aligner trays',
    priceEstimate: '$1,200 / Rs. 95,000',
    icon: <Smile className="w-8 h-8 text-indigo-600" />,
    accentBg: 'from-indigo-100/50 via-stone-50 to-amber-50/40',
    metricLabel: 'Duration',
    metricValue: '30 Mins Setup',
    image: '/assets/treatments/07.jpg'
  },
  {
    id: 'crowns',
    title: 'Dental Crowns & Bridges',
    subtitle: 'Zirconia & Porcelain Cap Restoration',
    category: 'restorative',
    badge: 'Natural Aesthetics',
    description: 'Protective caps for weakened teeth or fixed solutions to replace missing teeth.',
    note: 'Swiss-made Zirconia caps and fixed bridges',
    priceEstimate: '$300 / Rs. 18,000',
    icon: <Layers className="w-8 h-8 text-amber-700" />,
    accentBg: 'from-amber-100/70 via-stone-50 to-stone-100/50',
    metricLabel: 'Strength',
    metricValue: '1200 MPa Zirconia',
    image: '/assets/treatments/06.jpg'
  },
  {
    id: 'extraction',
    title: 'Wisdom Tooth Extraction',
    subtitle: 'Gentle & Surgical Removal',
    category: 'surgery',
    badge: 'Painless Protocol',
    description: 'Safe surgical or routine removal of damaged or impacted wisdom teeth.',
    note: 'Painless removal of wisdom and damaged teeth',
    priceEstimate: '$200 / Rs. 10,000',
    icon: <Crosshair className="w-8 h-8 text-stone-700" />,
    accentBg: 'from-stone-200/60 via-stone-50 to-stone-100/40',
    metricLabel: 'Anesthesia',
    metricValue: 'Zero-Pinch Delivery',
    image: '/assets/treatments/04.jpg'
  },
  {
    id: 'pediatric',
    title: 'Pediatric Dental Care',
    subtitle: 'Gentle Child Tooth Care & Fluoride',
    category: 'cleaning',
    badge: 'Child Comfort',
    description: 'Specialized dental care for children including routine cleanings and preventive fluoride treatments.',
    note: 'Friendly and gentle dental care for children',
    priceEstimate: '$80 / Rs. 4,500',
    icon: <Sparkles className="w-8 h-8 text-cyan-600" />,
    accentBg: 'from-cyan-100/60 via-stone-50 to-stone-100/40',
    metricLabel: 'Age Group',
    metricValue: 'Ages 2 - 14 Years',
    image: '/assets/treatments/08.jpg'
  },
];

interface ServicesCarouselProps {
  onSelectService: (serviceTitle: string) => void;
}

export const ServicesCarousel: React.FC<ServicesCarouselProps> = ({ onSelectService }) => {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadServices() {
      try {
        const url = apiUrl('/api/services');
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          console.warn('API returned non-JSON response (likely static fallback). Using default catalog.');
          return;
        }
        const data = await res.json();
        if (isMounted && data?.success && Array.isArray(data.data) && data.data.length > 0) {
          setServices(data.data);
        }
      } catch (err) {
        console.warn('Could not load dynamic services, using built-in treatment catalog:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadServices();

    return () => {
      isMounted = false;
    };
  }, []);

  const [activeIndex, setActiveIndex] = useState(0);

  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 640;

  const lastActionTime = useRef<number>(0);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  // Map API services to carousel items with guaranteed fallback to ALL_SERVICES
  const carouselItems = useMemo(() => {
    if (!services || services.length === 0) {
      return ALL_SERVICES;
    }
    return services.map((s, idx) => {
      // Find matching hardcoded item for extra UI metadata (icons, colors)
      const meta = ALL_SERVICES.find(item => item.title.toLowerCase().includes((s.name || '').toLowerCase())) || ALL_SERVICES[idx % ALL_SERVICES.length];
      
      return {
        ...meta,
        id: s.id?.toString() || meta.id,
        title: s.name || meta.title,
        description: s.description || meta.description,
        priceEstimate: s.price ? `$${s.price}` : meta.priceEstimate,
        duration: s.duration_minutes || (meta as any).duration
      };
    });
  }, [services]);

  // Update active index once carousel items are ready
  useEffect(() => {
    if (carouselItems.length > 0) {
      setActiveIndex(Math.floor(carouselItems.length / 2));
    }
  }, [carouselItems.length]);

  const handleNext = () => {
    const now = Date.now();
    if (now - lastActionTime.current < 220) return;
    lastActionTime.current = now;
    setActiveIndex((prev) => (prev + 1) % carouselItems.length);
  };

  const handlePrev = () => {
    const now = Date.now();
    if (now - lastActionTime.current < 220) return;
    lastActionTime.current = now;
    setActiveIndex((prev) => (prev - 1 + carouselItems.length) % carouselItems.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;

    if (Math.abs(deltaX) > 35 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
      if (deltaX > 0) {
        handlePrev();
      } else {
        handleNext();
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  if (loading) {
    return (
      <div className="py-32 flex flex-col items-center justify-center space-y-4 bg-[#F8F7F5]">
        <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
        <p className="text-stone-500 font-mono text-xs uppercase tracking-widest">Loading treatment catalog...</p>
      </div>
    );
  }

  return (
    <section id="services" className="relative py-14 sm:py-20 lg:py-28 bg-[#F8F7F5] overflow-hidden border-t border-stone-200/60">
      {/* Subtle background ambient blur */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-amber-100/40 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header (Clean Luxury Typography) */}
        <div className="mb-6 sm:mb-8 max-w-3xl">
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-serif-luxury font-bold text-stone-900 tracking-tight">
            CLINICAL TREATMENTS & PRICING
          </h2>
          <p className="text-xs sm:text-base text-stone-600 max-w-2xl mt-2 font-normal leading-relaxed">
            Transparent clinical pricing with Swiss precision equipment, painless computerized anesthesia, and bespoke porcelain craftsmanship.
          </p>
        </div>
      </div>

      <div 
        className="relative w-full h-[430px] sm:h-[570px] lg:h-[610px] flex items-center justify-center overflow-hidden pt-2 sm:pt-8 perspective-[1200px]"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <button
          onClick={handlePrev}
          aria-label="Previous treatment"
          className="sm:hidden absolute left-0 top-1/2 -translate-y-1/2 z-30 w-7 h-14 bg-white/95 hover:bg-white text-stone-800 hover:text-amber-900 border-y border-r border-stone-300/80 shadow-[3px_4px_16px_rgba(0,0,0,0.12)] backdrop-blur-md rounded-r-xl rounded-l-none flex items-center justify-center pl-0.5 active:scale-95 transition-all cursor-pointer group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        </button>

        <button
          onClick={handleNext}
          aria-label="Next treatment"
          className="sm:hidden absolute right-0 top-1/2 -translate-y-1/2 z-30 w-7 h-14 bg-white/95 hover:bg-white text-stone-800 hover:text-amber-900 border-y border-l border-stone-300/80 shadow-[-3px_4px_16px_rgba(0,0,0,0.12)] backdrop-blur-md rounded-l-xl rounded-r-none flex items-center justify-center pr-0.5 active:scale-95 transition-all cursor-pointer group"
        >
          <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </button>

        <motion.div 
          className="flex items-center justify-center relative w-full h-full max-w-5xl mx-auto transform-gpu preserve-3d"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={(_, info) => {
            const swipeThreshold = 35;
            const velocityThreshold = 200;
            if (info.offset.x > swipeThreshold || info.velocity.x > velocityThreshold) {
              handlePrev();
            } else if (info.offset.x < -swipeThreshold || info.velocity.x < -velocityThreshold) {
              handleNext();
            }
          }}
          style={{ touchAction: 'pan-y' }}
        >
          <AnimatePresence mode="sync">
            {carouselItems.map((item, index) => {
              let distance = index - activeIndex;
              if (distance > carouselItems.length / 2) distance -= carouselItems.length;
              if (distance < -carouselItems.length / 2) distance += carouselItems.length;
              const absDistance = Math.abs(distance);
              
              if (absDistance > 1) return null;

              const isActive = distance === 0;
              const cardSpacing = isMobile ? 255 : 380;
              const targetX = distance * cardSpacing;
              const targetZ = isActive ? (isMobile ? 10 : 50) : (isMobile ? -130 : -260);
              const targetRotateY = distance * (isMobile ? -6 : -12);
              const targetScale = isActive ? (isMobile ? 1.0 : 1.05) : (isMobile ? 0.88 : 0.85);
              const targetOpacity = isActive ? 1 : 0.45;
              const targetBlur = isActive ? 'blur(0px)' : 'blur(3px)';

              const entryX = distance > 0 ? targetX + 160 : targetX - 160;

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{
                    x: entryX,
                    opacity: 0,
                    scale: 0.75,
                    z: -280,
                    rotateY: distance * -15,
                  }}
                  animate={{
                    x: targetX,
                    z: targetZ,
                    rotateY: targetRotateY,
                    scale: targetScale,
                    opacity: targetOpacity,
                    zIndex: 10 - absDistance,
                    filter: targetBlur,
                  }}
                  exit={{
                    x: entryX,
                    opacity: 0,
                    scale: 0.75,
                    z: -280,
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 180,
                    damping: 22,
                    mass: 0.8,
                  }}
                  onClick={() => setActiveIndex(index)}
                  className={`absolute flex-none w-[250px] sm:w-[320px] lg:w-[350px] rounded-2xl sm:rounded-3xl bg-white/95 backdrop-blur-xl border ${
                    isActive 
                      ? 'border-amber-400 shadow-[0_20px_50px_-15px_rgba(216,180,130,0.45)]' 
                      : 'border-stone-200/80 shadow-md'
                  } p-3.5 sm:p-6 transition-colors duration-300 flex flex-col justify-between cursor-pointer transform-gpu`}
                >
                  <div>
                    <div className={`relative w-full h-36 sm:h-44 rounded-xl sm:rounded-2xl bg-gradient-to-br ${item.accentBg} overflow-hidden border border-stone-200/50 flex flex-col items-center justify-center transition-all mb-3`}>
                      <img 
                        src={item.image} 
                        alt={item.title}
                        className="absolute inset-0 w-full h-full object-cover opacity-95"
                      />
                      <div className="absolute top-2.5 right-2.5 z-10 px-3 py-1 rounded-full bg-stone-950/85 backdrop-blur-md border border-amber-400/50 text-amber-300 font-mono font-bold text-[11px] sm:text-xs tracking-wide shadow-xl flex items-center gap-1">
                        <span>{item.priceEstimate}</span>
                      </div>
                    </div>

                    <div className="mt-2 text-left">
                      <h3 className="text-sm sm:text-lg lg:text-xl font-serif-luxury font-bold text-stone-900 leading-snug">
                        {item.title}
                      </h3>
                      <div className="text-[10px] sm:text-[11px] font-semibold text-stone-500 mt-0.5 mb-1">
                        {item.subtitle}
                      </div>
                      <p className="text-[11px] sm:text-xs text-stone-600 line-clamp-2 leading-relaxed mb-1.5">
                        {item.description}
                      </p>
                      <div className="text-[9px] sm:text-[10px] text-amber-900/90 font-medium bg-amber-50/70 px-2 py-0.5 rounded-md border border-amber-100 inline-block line-clamp-1">
                        {item.note}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-stone-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectService(item.title);
                      }}
                      className="group relative w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#E6CA9E] via-[#D8B482] to-[#C5A880] text-amber-950 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all cursor-pointer overflow-hidden"
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        <span>Book Consultation</span>
                        <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </span>
                      <div className="absolute inset-0 bg-white/25 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-12" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
};
