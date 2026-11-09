import React, { useRef, useEffect, useState } from 'react';
import { Calendar, ShieldCheck, Clock, Sparkles } from 'lucide-react';
import { motion, useInView } from 'motion/react';

interface CtaSectionProps {
  onOpenBooking: () => void;
}

export const CtaSection: React.FC<CtaSectionProps> = ({ onOpenBooking }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.3 });
  const [hasPlayed, setHasPlayed] = useState(false);

  useEffect(() => {
    if (isInView && videoRef.current && !hasPlayed) {
      videoRef.current.playbackRate = 1.5;
      videoRef.current.play().catch(error => {
        console.error("Video play failed:", error);
      });
      setHasPlayed(true);
    }
  }, [isInView, hasPlayed]);

  return (
    <section className="relative pt-6 pb-10 sm:pt-14 sm:pb-18 lg:pt-16 lg:pb-24 bg-[#0A0D12] text-white overflow-hidden">
      {/* Background warm golden ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[750px] h-[550px] bg-gradient-to-tr from-amber-600/15 via-amber-400/10 to-transparent rounded-full blur-[160px] pointer-events-none"></div>
      
      {/* Subtle radial luxury dust */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff05_1px,transparent_1px)] [background-size:32px_32px] opacity-40"></div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        
        {/* Main Video Card Container with Overlaid Text */}
        <div 
          ref={containerRef}
          className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-amber-500/25 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85),0_0_30px_rgba(216,180,130,0.15)] aspect-[16/11] sm:aspect-[16/9] w-full max-w-4xl mx-auto bg-black flex flex-col justify-between"
        >
          {/* The Smile Video Background (Plays only once on arrival - no loop) */}
          <div className="absolute inset-0 z-0">
            <video
              ref={videoRef}
              src="/assets/clinic/smile_video.mp4"
              muted
              playsInline
              preload="auto"
              className="w-full h-full object-cover opacity-100"
              style={{ filter: 'contrast(1.08) brightness(1.22) saturate(1.08)' }}
            />
            
            {/* Soft Top & Bottom Dark Gradient - Leaves Center Mouth & Teeth Bright & Crystal Clear */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/70 z-10 pointer-events-none" />
          </div>

          {/* Top Overlaid Text (Title) */}
          <div className="relative z-20 pt-3 sm:pt-5 lg:pt-6 px-4 sm:px-8 text-center flex flex-col items-center">
            <motion.h2 
              initial={{ opacity: 0, y: -10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-3xl sm:text-5xl lg:text-6xl xl:text-7xl font-serif-luxury font-bold tracking-tight text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.95)] leading-[1.1]"
            >
              Your Smile.<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F5E6CE] via-[#E6CA9E] to-[#C5A880]">Our Precision.</span>
            </motion.h2>
          </div>

          {/* Center Space: Unobstructed View of the Glowing Smile & Teeth Laser */}
          <div className="relative z-10 flex-1 min-h-[10px] sm:min-h-[20px] pointer-events-none" />

          {/* Bottom Overlaid Content (Subtitle + CTA Button) */}
          <div className="relative z-20 pb-3.5 sm:pb-6 lg:pb-7 px-4 sm:px-8 flex flex-col items-center text-center">
            <motion.p 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xs sm:text-base lg:text-lg font-normal text-stone-200 tracking-wide max-w-sm sm:max-w-2xl mx-auto opacity-95 leading-relaxed drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)] mb-2.5 sm:mb-3.5"
            >
              Experience Swiss-calibrated aesthetic dentistry with same-day 3D digital smile previews, painless computerized anesthesia, and bespoke porcelain veneers.
            </motion.p>

            <motion.button
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              onClick={onOpenBooking}
              className="group relative px-6 py-3 sm:px-10 sm:py-3.5 rounded-full bg-gradient-to-r from-[#E6CA9E] to-[#C99E66] text-amber-950 font-bold uppercase tracking-[0.16em] sm:tracking-[0.2em] text-[11px] sm:text-xs shadow-[0_15px_35px_-5px_rgba(230,202,158,0.45)] hover:shadow-[0_20px_45px_-5px_rgba(230,202,158,0.65)] hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer overflow-hidden flex items-center gap-2"
            >
              <span className="relative z-10 flex items-center gap-2">
                Begin Transformation
                <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform group-hover:translate-x-1" />
              </span>
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-12" />
            </motion.button>
          </div>
        </div>

        {/* Trust & Care Reassurance Badges */}
        <div className="mt-4 sm:mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-6 text-left max-w-4xl mx-auto pt-4 sm:pt-6 border-t border-stone-800/40">
          <div className="flex items-center gap-3.5 sm:gap-4 text-stone-300">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-amber-400 flex-shrink-0 shadow-inner">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">Same-Day 3D Preview</div>
              <div className="text-[10px] sm:text-[11px] text-stone-500 font-mono">Digital smile simulation</div>
            </div>
          </div>

          <div className="flex items-center gap-3.5 sm:gap-4 text-stone-300">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-amber-400 flex-shrink-0 shadow-inner">
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">Lifetime Warranty</div>
              <div className="text-[10px] sm:text-[11px] text-stone-500 font-mono">On all titanium implants</div>
            </div>
          </div>

          <div className="flex items-center gap-3.5 sm:gap-4 text-stone-300">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-amber-400 flex-shrink-0 shadow-inner">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">Zero Wait Time</div>
              <div className="text-[10px] sm:text-[11px] text-stone-500 font-mono">Private VIP concierge suite</div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};

