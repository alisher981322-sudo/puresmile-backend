import React from 'react';
import { HeroScene } from './3d/HeroScene';
import { ArrowRight, Sparkles, Shield, Award, CheckCircle } from 'lucide-react';

interface HeroSectionProps {
  onOpenBooking: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onOpenBooking }) => {
  return (
    <section id="hero" className="relative pt-24 sm:pt-28 pb-4 sm:pb-8 lg:pb-16 bg-[#0A0D12] overflow-hidden radial-dark-obsidian">
      
      {/* Background ambient lighting blobs */}
      <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[700px] h-[700px] bg-cyan-500/5 rounded-full blur-[160px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Hero Content (Left - Col 6) */}
          <div className="lg:col-span-6 flex flex-col justify-center pt-4 lg:pt-0">
            
            {/* Primary Catchphrase */}
            <div className="flex items-center gap-3 mb-6">
              <span className="w-8 h-[1px] bg-amber-500/50"></span>
              <div className="text-[10px] sm:text-xs font-bold text-amber-400 tracking-[0.3em] uppercase font-mono drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]">
                A Better Smile Begins Here
              </div>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-serif-luxury font-bold text-white tracking-[-0.02em] leading-[1.05] mb-6 text-balance">
              Advanced Dental Care <br className="hidden lg:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F5E6CE] via-[#E6CA9E] to-[#C5A880]">
                With Unrivaled Precision.
              </span>
            </h1>

            {/* Narrative Subtitle */}
            <p className="text-base sm:text-lg text-stone-400 max-w-xl leading-relaxed mb-8 font-normal text-balance">
              Painless procedures, same-day digital 3D scans, and tailored cosmetic dentistry in Beverly Hills. Swiss microscopic precision meets bespoke porcelain artistry.
            </p>

            {/* CTA Button: Sand-gold pill button [Book Consultation →] */}
            <div className="flex items-center gap-4 mb-10">
              <button
                onClick={onOpenBooking}
                aria-label="Book Consultation with PureDent Clinic"
                className="group relative inline-flex items-center justify-center gap-2 px-9 py-4.5 rounded-full text-xs sm:text-sm font-bold uppercase tracking-wider text-amber-950 bg-gradient-to-r from-[#E6CA9E] via-[#D8B482] to-[#C5A880] shadow-[0_8px_30px_rgba(216,180,130,0.4)] hover:shadow-[0_15px_40px_rgba(216,180,130,0.65)] hover:-translate-y-1 active:scale-95 transition-all cursor-pointer overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <span>Book Consultation</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </span>
                <div className="absolute inset-0 bg-white/25 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-12" />
              </button>
            </div>

            {/* Clinical Trust Metrics (Sleek Glassmorphic Cards) */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-4 pt-8 border-t border-white/10 max-w-xl">
              <div className="p-3 sm:p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-amber-500/30 transition-all flex flex-col justify-center">
                <div className="text-xl sm:text-3xl font-serif-luxury font-bold text-white tracking-tight">0.02<span className="text-amber-400 text-sm sm:text-lg">mm</span></div>
                <div className="text-[9px] sm:text-[10px] font-mono font-semibold uppercase tracking-wider text-stone-400 mt-1 whitespace-nowrap">Swiss Tolerance</div>
              </div>

              <div className="p-3 sm:p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-amber-500/30 transition-all flex flex-col justify-center">
                <div className="text-xl sm:text-3xl font-serif-luxury font-bold text-white tracking-tight">12<span className="text-amber-400 text-sm sm:text-lg">k+</span></div>
                <div className="text-[9px] sm:text-[10px] font-mono font-semibold uppercase tracking-wider text-stone-400 mt-1 whitespace-nowrap">Perfect Smiles</div>
              </div>

              <div className="p-3 sm:p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-amber-500/30 transition-all flex flex-col justify-center">
                <div className="text-xl sm:text-3xl font-serif-luxury font-bold text-white tracking-tight">100<span className="text-amber-400 text-sm sm:text-lg">%</span></div>
                <div className="text-[9px] sm:text-[10px] font-mono font-semibold uppercase tracking-wider text-stone-400 mt-1 whitespace-nowrap">Grade V Titanium</div>
              </div>
            </div>

          </div>

          {/* Hero 3D Model (Right - Col 6) */}
          <div className="lg:col-span-6 relative flex items-center justify-center">
            <HeroScene className="w-full h-[320px] sm:h-[400px] lg:h-[480px]" />
          </div>

        </div>
      </div>
    </section>
  );
};


