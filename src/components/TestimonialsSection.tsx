import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, ChevronLeft, ChevronRight, Sparkles, CheckCircle2, ShieldCheck } from 'lucide-react';

interface Testimonial {
  id: number;
  name: string;
  role: string;
  content: string;
  rating: number;
  color: string;
  imageUrl?: string;
  avatarUrl?: string;
  procedure?: string;
}

const testimonials: Testimonial[] = [
  // 1. Alternating Male / Female 3D Patient Profiles (Custom-Designed 2K Studio Renders)
  // 1. Male: Marcus Thorne (Man in navy suit)
  {
    id: 1,
    name: "Marcus Thorne",
    role: "GLOBAL TECH CEO",
    content: "The precision-calibrated veneers completely transformed my presence. The digital preview was executed with microscopic precision, and the final results feel completely natural.",
    rating: 5,
    color: "#D97706",
    imageUrl: "/assets/clinic/Man_in_suit_giving_thumbs-up_fac97c09_2K__1__46ab2600.jpg",
    avatarUrl: "/avatars/avatar_man_suit.png",
    procedure: "Bespoke Ceramic Veneers"
  },
  // 2. Female: Sophia Sterling (Solo woman in white blazer)
  {
    id: 2,
    name: "Sophia Sterling",
    role: "CULTURAL PHILANTHROPIST",
    content: "A genuine world-class experience. From the private penthouse suite to the bespoke shade matching, every single detail was handled with care and artistic perfection.",
    rating: 5,
    color: "#D97706",
    imageUrl: "/assets/clinic/Woman_giving_thumbs_up_gesture_62499d9b_2K__1__6cb2f517.jpg",
    avatarUrl: "/avatars/avatar_woman.png",
    procedure: "Enamel Micro-Sculpting"
  },
  // 3. Male: Julian Pierce (Young doctor / specialist in hoodie)
  {
    id: 3,
    name: "Julian Pierce",
    role: "SURGICAL SPECIALIST",
    content: "The seamless integration of AI diagnostics with Swiss precision craftsmanship sets the standard. I confidently recommend my own colleagues and family here.",
    rating: 5,
    color: "#059669",
    imageUrl: "/assets/clinic/Man_giving_thumbs_up_4f2f9548_2K__1__1e5c89b5.jpg",
    avatarUrl: "/avatars/avatar_doctor.png",
    procedure: "Precision Implant Integration"
  },
  // 4. Female: Elena & Maya Rossi (Mother and daughter pair)
  {
    id: 4,
    name: "Elena & Maya Rossi",
    role: "FASHION DIRECTOR & DAUGHTER",
    content: "Finding a clinic that provides compassionate family dental care alongside high-fashion cosmetic dentistry is extraordinary. The treatment was gentle and 100% painless.",
    rating: 5,
    color: "#0284C7",
    imageUrl: "/assets/clinic/Mother_and_daughter_gesturing_th__0924997f_2K__1__311efa90.jpg",
    avatarUrl: "/avatars/avatar_mother_daughter.png",
    procedure: "Family Aesthetic Dentistry"
  },
  // 5. Male: Dr. Adrian Vance (Aesthetic surgeon in bespoke suit)
  {
    id: 5,
    name: "Dr. Adrian Vance",
    role: "AESTHETIC CONSULTANT",
    content: "As a surgeon, I demand ruthless clinical precision. PureDent's 3D digital planning, biological compatibility, and porcelain layering are truly in a league of their own.",
    rating: 5,
    color: "#0284C7",
    imageUrl: "/assets/clinic/Businessman_giving_thumbs_up_7d75eda9_2K__1__69b9597b.jpg",
    avatarUrl: "/avatars/avatar_businessman.png",
    procedure: "Full Smile Arch Restoration"
  },
  // 6. Female: Sarah Jenkins & Toby (Creative producer and young son)
  {
    id: 6,
    name: "Sarah Jenkins & Toby",
    role: "CREATIVE PRODUCER & SON",
    content: "Gentle, modern, and completely stress-free. Toby was actually excited for his dental appointment, and the orthodontic guidance has been flawless.",
    rating: 5,
    color: "#0284C7",
    imageUrl: "/assets/clinic/Mother_and_son_giving_thumbs_7dacdbe7_2K__1__a433ae60.jpg",
    avatarUrl: "/avatars/avatar_mother_son.png",
    procedure: "Preventative Smile Architecture"
  },
  // 7. Male: Alexander Reed (Venture partner / young executive)
  {
    id: 7,
    name: "Alexander Reed",
    role: "VENTURE PARTNER",
    content: "Remarkable precision and discreet care. The Swiss ceramic smile design gave me back a commanding yet completely natural look without any downtime.",
    rating: 5,
    color: "#059669",
    imageUrl: "/assets/clinic/Man_giving_thumbs_up_93d24838_2K__1__e1908986.jpg",
    avatarUrl: "/avatars/avatar_young_man.png",
    procedure: "Executive Smile Rehabilitation"
  },
  // 8. Female/Family: Clara & Liam (Daughter Clara smiling with architect father)
  {
    id: 8,
    name: "Clara & Liam",
    role: "STUDENT & ARCHITECT",
    content: "A clinic that looks like an art gallery and treats patients like royalty. Seeing Clara smile with total confidence was the best investment we ever made.",
    rating: 5,
    color: "#D97706",
    imageUrl: "/assets/clinic/Man_and_girl_giving_thumbs_983d51a4_2K_b8133de8.jpg",
    avatarUrl: "/avatars/avatar_man_girl.png",
    procedure: "Pediatric & Aesthetic Care"
  },
  // 9. Male: David Chen & Leo (Software architect father and son)
  {
    id: 9,
    name: "David Chen & Leo",
    role: "SOFTWARE ARCHITECT & SON",
    content: "The 3D scanning algorithms and same-day ceramic milling blew me away. No guesswork, no messy impressions—just mathematics and beautiful human craftsmanship.",
    rating: 5,
    color: "#059669",
    imageUrl: "/assets/clinic/Businessman_and_son_giving_thumbs_ec2c71e6_2K__1__24f3a67f.jpg",
    avatarUrl: "/avatars/avatar_businessman_son.png",
    procedure: "Guided Computerized Prosthetics"
  },
];

// Safe Typewriter Hook without recursive re-render loops
function useSafeTypewriter(text: string, speed = 14) {
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    setDisplayText('');
    setIsTyping(true);
    let index = 0;

    const timer = setInterval(() => {
      index++;
      if (index <= text.length) {
        setDisplayText(text.slice(0, index));
      } else {
        setIsTyping(false);
        clearInterval(timer);
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed]);

  return { displayText, isTyping };
}

export const TestimonialsSection: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [cloudPosition, setCloudPosition] = useState<'right' | 'left'>('left');
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Safe bounds check for active index
  const safeActiveIndex = activeIndex >= testimonials.length ? 0 : activeIndex;
  const currentTestimonial = testimonials[safeActiveIndex] || testimonials[0];

  // Typing effect safely triggered on currentTestimonial.content
  const { displayText, isTyping } = useSafeTypewriter(currentTestimonial.content, 14);

  // Preload all avatars in the background for zero-delay instant switching
  useEffect(() => {
    testimonials.forEach((t) => {
      const src = t.avatarUrl || t.imageUrl;
      if (src) {
        const img = new Image();
        img.src = src;
      }
    });
  }, []);

  const lastActionTime = useRef<number>(0);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const isDragging = useRef<boolean>(false);
  const dragStartX = useRef<number>(0);

  const handleNext = () => {
    const now = Date.now();
    if (now - lastActionTime.current < 250) return;
    lastActionTime.current = now;
    setActiveIndex((prev) => (prev + 1) % testimonials.length);
  };

  const handlePrev = () => {
    const now = Date.now();
    if (now - lastActionTime.current < 250) return;
    lastActionTime.current = now;
    setActiveIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;

    // Trigger horizontal swipe on 35px threshold if horizontal motion dominates vertical scroll
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

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    dragStartX.current = e.clientX;
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const deltaX = e.clientX - dragStartX.current;
    if (Math.abs(deltaX) > 40) {
      if (deltaX > 0) {
        handlePrev();
      } else {
        handleNext();
      }
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Dynamic horizontal offsets for the 3D character glide track
  const sideOffset = windowWidth < 640 ? 115 : windowWidth < 1024 ? 220 : windowWidth < 1280 ? 320 : 380;
  const N = testimonials.length;

  return (
    <section
      id="testimonials"
      className="relative py-8 sm:py-14 lg:pt-20 lg:pb-28 bg-[#F1EFEA] overflow-hidden border-b border-stone-300/80"
    >
      {/* Top subtle studio ambient warmth */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-amber-100/40 via-transparent to-transparent rounded-full blur-[100px] pointer-events-none" />

      {/* Main Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20">
        
        {/* Section Header (Clean Luxury Typography - No Pills) */}
        <div className="text-center max-w-3xl mx-auto mb-3 sm:mb-8">
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-serif-luxury font-bold text-stone-900 tracking-tight">
            The Art of the Smile
          </h2>
          <p className="text-stone-600 text-xs sm:text-base mt-1 sm:mt-2.5 font-normal max-w-2xl mx-auto leading-relaxed">
            Explore genuine life-changing smile journeys and aesthetic transformations from our global patients.
          </p>
        </div>

        {/* Central Stage: Character Track & Floating Speech Cloud */}
        <div className="max-w-6xl mx-auto relative flex flex-col items-center">
          
          {/* Floating Speech Cloud Column with natural balanced distance from avatar */}
          <div
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className={`w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[400px] z-30 mb-1.5 sm:mb-4 lg:mb-0 lg:absolute lg:top-4 transition-all duration-300 touch-pan-y ${
              cloudPosition === 'left'
                ? 'lg:right-[calc(50%+135px)] xl:right-[calc(50%+145px)]'
                : 'lg:left-[calc(50%+135px)] xl:left-[calc(50%+145px)]'
            }`}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTestimonial.id}
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="bg-white/95 backdrop-blur-md text-stone-900 rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 shadow-[0_12px_32px_rgba(0,0,0,0.06),0_3px_8px_rgba(0,0,0,0.02)] relative border border-stone-200/90"
              >


                {/* Testimonial Quote with Safe Typewriter Effect */}
                <div className="pt-1 sm:pt-2 min-h-[58px] sm:min-h-[88px] flex items-center">
                  <p className="text-stone-800 font-serif-luxury italic text-xs sm:text-sm lg:text-base leading-relaxed pl-2 sm:pl-3">
                    "{displayText}"
                    {isTyping && (
                      <span className="inline-block w-1.5 h-3.5 sm:h-4 bg-amber-500 ml-1 translate-y-0.5 animate-pulse" />
                    )}
                  </p>
                </div>

                {/* Bottom Bar: Procedure Badge + Gold Stars + Verified Tag */}
                <div className="pt-2 sm:pt-3.5 mt-2 sm:mt-3 border-t border-stone-100 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {[...Array(currentTestimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      ))}
                      <span className="text-[11px] sm:text-xs font-mono font-bold text-amber-700 ml-1">5.0</span>
                    </div>

                    <div className="inline-flex items-center gap-1 text-emerald-700 font-mono text-[10px] sm:text-[11px] font-bold tracking-wider uppercase">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Verified Case</span>
                    </div>
                  </div>


                </div>

                {/* Speech Bubble Pointer Tail (points toward center character) */}
                {cloudPosition === 'right' ? (
                  <div className="hidden lg:block absolute -left-3 top-20 w-0 h-0 border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent border-r-[12px] border-r-white drop-shadow-sm pointer-events-none" />
                ) : (
                  <div className="hidden lg:block absolute -right-3 top-20 w-0 h-0 border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent border-l-[12px] border-l-white drop-shadow-sm pointer-events-none" />
                )}

                {/* Mobile downward pointer tail */}
                <div className="lg:hidden absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[10px] border-t-white drop-shadow-sm pointer-events-none" />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Unified Animated 3D Avatar Stage (Continuous Smooth Glide & Swipe Gesture) */}
          <div 
            className="relative w-full h-[310px] sm:h-[380px] lg:h-[480px] flex items-end justify-center overflow-visible select-none cursor-grab active:cursor-grabbing touch-pan-y"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            style={{ touchAction: 'pan-y' }}
          >
            
            {/* Soft Ambient Contact Shadow under center */}
            <div className="absolute bottom-10 sm:bottom-14 left-1/2 -translate-x-1/2 w-52 sm:w-72 h-5 sm:h-6 bg-stone-900/15 rounded-full blur-xl pointer-events-none z-0" />

            {/* All avatars rendered with spring physics motion for unbroken gliding */}
            {testimonials.map((item, index) => {
              let diff = ((index - safeActiveIndex) % N + N) % N;
              if (diff > N / 2) {
                diff -= N;
              }

              const isActive = diff === 0;
              const isPrev = diff === -1;
              const isNext = diff === 1;

              // Compute smooth coordinate targets
              let targetX = 0;
              let targetScale = 1;
              let targetOpacity = 1;
              let targetZIndex = 20;

              if (isActive) {
                targetX = 0;
                targetScale = 1;
                targetOpacity = 1;
                targetZIndex = 25;
              } else if (isNext) {
                targetX = sideOffset;
                targetScale = windowWidth < 640 ? 0.6 : 0.72;
                targetOpacity = 0.45;
                targetZIndex = 15;
              } else if (isPrev) {
                targetX = -sideOffset;
                targetScale = windowWidth < 640 ? 0.6 : 0.72;
                targetOpacity = 0.45;
                targetZIndex = 15;
              } else if (diff === 2) {
                targetX = sideOffset + 220;
                targetScale = 0.5;
                targetOpacity = 0;
                targetZIndex = 5;
              } else if (diff === -2) {
                targetX = -sideOffset - 220;
                targetScale = 0.5;
                targetOpacity = 0;
                targetZIndex = 5;
              } else {
                targetX = diff > 0 ? sideOffset + 350 : -sideOffset - 350;
                targetScale = 0.4;
                targetOpacity = 0;
                targetZIndex = 0;
              }

              return (
                <motion.div
                  key={item.id}
                  animate={{
                    x: targetX,
                    scale: targetScale,
                    opacity: targetOpacity,
                    zIndex: targetZIndex,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 240,
                    damping: 26,
                    mass: 0.8,
                  }}
                  onClick={() => {
                    if (isNext) handleNext();
                    if (isPrev) handlePrev();
                  }}
                  className={`absolute bottom-0 flex flex-col items-center justify-end origin-bottom ${
                    isNext || isPrev ? 'cursor-pointer group hover:opacity-80 transition-opacity' : ''
                  }`}
                  style={{
                    pointerEvents: isActive || isNext || isPrev ? 'auto' : 'none',
                  }}
                >
                  {/* Full-Body 3D Character Model Image */}
                  <img
                    src={item.avatarUrl || item.imageUrl}
                    alt={item.name}
                    className={`object-contain object-bottom pointer-events-none select-none transition-all duration-300 ${
                      isActive
                        ? 'h-[230px] sm:h-[300px] lg:h-[400px] w-auto max-w-[190px] sm:max-w-[260px] lg:max-w-[340px] drop-shadow-[0_12px_22px_rgba(0,0,0,0.12)]'
                        : 'h-[160px] sm:h-[210px] lg:h-[290px] w-auto max-w-[125px] sm:max-w-[170px] lg:max-w-[210px] drop-shadow-[0_6px_12px_rgba(0,0,0,0.06)]'
                    }`}
                    loading="eager"
                  />

                  {/* Information Label underneath Avatar */}
                  {isActive && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: 0.05 }}
                      className="text-center mt-1.5 mb-0.5"
                    >
                      <h3 className="text-base sm:text-xl lg:text-2xl font-serif-luxury font-bold text-stone-900 tracking-wide">
                        {item.name}
                      </h3>
                      <p className="text-[10px] sm:text-xs font-mono font-bold tracking-widest text-amber-800 uppercase mt-0.5">
                        {item.role}
                      </p>
                    </motion.div>
                  )}

                  {isPrev && (
                    <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-mono text-stone-600 font-semibold mt-1 uppercase tracking-wider group-hover:text-amber-800 transition-colors">
                      <ChevronLeft className="w-3 h-3" />
                      <span>{item.name.split(' ')[0]}</span>
                    </div>
                  )}

                  {isNext && (
                    <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-mono text-stone-600 font-semibold mt-1 uppercase tracking-wider group-hover:text-amber-800 transition-colors">
                      <span>{item.name.split(' ')[0]}</span>
                      <ChevronRight className="w-3 h-3" />
                    </div>
                  )}
                </motion.div>
              );
            })}

          </div>

        </div>

      </div>

    </section>
  );
};

