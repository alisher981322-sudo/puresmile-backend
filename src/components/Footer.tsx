import React, { useState, useRef } from 'react';
import { ArrowUpRight, Phone, Mail, MapPin, Clock, ShieldCheck, Lock } from 'lucide-react';

interface FooterProps {
  onOpenBooking: () => void;
  onOpenAdminModal?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenBooking, onOpenAdminModal }) => {
  const [clickCount, setClickCount] = useState<number>(0);
  const [showToast, setShowToast] = useState<boolean>(false);
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleHiddenTriggerClick = () => {
    // Clear previous timeout
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
    }

    const nextCount = clickCount + 1;

    if (nextCount >= 5) {
      // 5th click achieved within 3 seconds!
      setClickCount(0);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2400);
      if (onOpenAdminModal) {
        onOpenAdminModal();
      }
    } else {
      setClickCount(nextCount);
      // Reset if no further click within 3 seconds
      resetTimerRef.current = setTimeout(() => {
        setClickCount(0);
      }, 3000);
    }
  };
  return (
    <footer className="bg-[#090C11] text-stone-400 text-xs border-t border-stone-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16">
        
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
          
          {/* Brand Column (Col 2) */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#D4AF37] via-[#C5A880] to-[#997B4D] p-[1.5px]">
                <div className="w-full h-full bg-[#141822] rounded-[14px] flex items-center justify-center text-amber-300">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 2C8.5 2 6 4 6 7c0 2.5 1 4.5 1 7 0 2.5.5 5 2 6 1 .7 2-1 3-4 1 3 2 4.7 3 4 1.5-1 2-3.5 2-6 0-2.5 1-4.5 1-7 0-3-2.5-5-6-5Z" />
                  </svg>
                </div>
              </div>
              <div>
                <span className="text-xl font-bold text-white tracking-tight font-serif-luxury">PureDent</span>
                <span className="block text-[10px] tracking-widest text-amber-400 font-mono">PRECISION CLINIC</span>
              </div>
            </div>

            <p className="text-stone-400 text-xs leading-relaxed max-w-sm mb-6">
              Advanced dental care with precision, comfort and modern technology. Swiss microscopic accuracy, digital holographic tomography, and bespoke porcelain smile artistry.
            </p>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-stone-300 font-medium">
                <ShieldCheck className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>ADA Accredited Center for Advanced Implantology</span>
              </div>
              <div className="flex items-center gap-2 text-amber-300 font-mono text-[11px]">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>24/7 Dental Emergency Hotline: (800) 787-3764</span>
              </div>
            </div>
          </div>

          {/* Treatments Navigation Column */}
          <div>
            <div className="text-white font-bold text-sm mb-4 uppercase tracking-wider font-mono">
              Treatments
            </div>
            <ul className="space-y-2.5">
              <li><a href="#services" className="hover:text-amber-300 transition-colors">Cosmetic Veneers</a></li>
              <li><a href="#services" className="hover:text-amber-300 transition-colors">Titanium Dental Implants</a></li>
              <li><a href="#services" className="hover:text-amber-300 transition-colors">Laser Teeth Whitening</a></li>
              <li><a href="#services" className="hover:text-amber-300 transition-colors">Preventive Prophylaxis</a></li>
              <li><a href="#services" className="hover:text-amber-300 transition-colors">Invisible Clear Aligners</a></li>
              <li><a href="#technology" className="hover:text-amber-300 transition-colors">Microscopic Root Canal</a></li>
            </ul>
          </div>

          {/* Technology & Experience Column */}
          <div>
            <div className="text-white font-bold text-sm mb-4 uppercase tracking-wider font-mono">
              Technology
            </div>
            <ul className="space-y-2.5">
              <li><a href="#technology" className="hover:text-cyan-300 transition-colors">3D Laser Scanner</a></li>
              <li><a href="#technology" className="hover:text-cyan-300 transition-colors">Digital Smile Transformation</a></li>
              <li><a href="#technology" className="hover:text-cyan-300 transition-colors">0.02mm Optical Tomography</a></li>
              <li><a href="#values" className="hover:text-cyan-300 transition-colors">Computer-Guided Anesthesia</a></li>
              <li><a href="#values" className="hover:text-cyan-300 transition-colors">Bespoke Ceramist Lab</a></li>
              <li><a href="#faq" className="hover:text-amber-400 transition-colors">Patient FAQs</a></li>
            </ul>
          </div>

          {/* Contact & Hours Column */}
          <div>
            <div className="text-white font-bold text-sm mb-4 uppercase tracking-wider font-mono">
              Visit Clinic
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <span>450 Beverly Hills Medical Plaza, Suite 800, Los Angeles, CA</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>+1 (800) 787-3764</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>concierge@puresmiledental.com</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>Mon - Sat: 8:00 AM - 7:00 PM</span>
              </div>
            </div>
          </div>

        </div>

        {/* Secondary Consultation Bar & Copyright with 5-Click Hidden Admin Trigger */}
        <div className="pt-8 border-t border-stone-800/80 flex flex-col md:flex-row items-center justify-between gap-6 relative">
          <div 
            onClick={handleHiddenTriggerClick}
            className="text-stone-500 text-[11px] select-none cursor-pointer flex items-center gap-2 group transition-colors hover:text-stone-400"
            title="PureSmile Precision Clinic"
          >
            <span>
              Copyright © {new Date().getFullYear()} PureSmile / Doctor Dental Clinic. All rights reserved.
            </span>
            {/* Subtle hidden indicator dot */}
            <span 
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                clickCount > 0 
                  ? 'bg-amber-400 scale-125 shadow-[0_0_8px_rgba(245,158,11,0.8)]' 
                  : 'bg-stone-800 group-hover:bg-stone-700'
              }`}
            />
          </div>

          {/* Subtle feedback toast on 5th click */}
          {showToast && (
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[150] px-4 py-2 rounded-full bg-stone-950/95 border border-amber-400/80 text-amber-300 text-xs font-mono shadow-2xl flex items-center gap-2.5 backdrop-blur-md animate-in fade-in slide-in-from-bottom-3 duration-200">
              <Lock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span className="font-bold">🔓 Admin Portal Unlocked</span>
            </div>
          )}

          <div className="flex items-center gap-6">
            <a href="#hero" className="hover:text-stone-300 transition-colors">Privacy Policy</a>
            <a href="#hero" className="hover:text-stone-300 transition-colors">Terms of Care</a>
            <a href="#hero" className="hover:text-stone-300 transition-colors">Patient Portal</a>

            {/* Secondary consultation button */}
            <button
              onClick={onOpenBooking}
              className="px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider text-amber-950 bg-gradient-to-r from-[#E6CA9E] to-[#C99E66] shadow hover:brightness-105 transition-all flex items-center gap-1.5"
            >
              <span>Book Consultation</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>
    </footer>
  );
};

