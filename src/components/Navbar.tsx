import React, { useState, useEffect } from 'react';
import { Search, Menu, X, ArrowRight, Sparkles, Calendar, Phone, Clock, ChevronRight, Settings } from 'lucide-react';

interface NavbarProps {
  onOpenBooking: () => void;
  onOpenSearch: () => void;
  onOpenAdmin?: () => void;
  isAdmin?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenBooking, onOpenSearch, onOpenAdmin, isAdmin = false }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu when screen resizes to desktop size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navClasses = isAdmin 
    ? "fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-white/90 backdrop-blur-md border-b border-stone-200"
    : "fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-[#0A0D12]/90 backdrop-blur-md border-b border-white/10";

  const logoTextClasses = isAdmin ? "text-stone-900" : "text-white";
  const linkClasses = isAdmin 
    ? "text-sm font-semibold text-stone-600 hover:text-stone-950 transition-colors" 
    : "text-sm font-semibold text-stone-300 hover:text-amber-400 transition-colors";

  const navLinks = [
    { label: 'Home', href: '#hero' },
    { label: 'Treatments', href: '#services' },
    { label: 'Technology', href: '#technology', badge: true },
    { label: 'Experience', href: '#values' },
    { label: 'FAQ', href: '#faq' },
    { label: 'About', href: '#about-clinic' },
  ];

  const handleLinkClick = (href: string) => {
    setMobileMenuOpen(false);
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav className={navClasses}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Left: Clinic Logo */}
          <a 
            href="#hero" 
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 group focus:outline-none"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#D4AF37] via-[#C5A880] to-[#997B4D] p-[1.5px] shadow-sm transition-transform duration-300 group-hover:scale-105">
              <div className={`w-full h-full ${isAdmin ? 'bg-white' : 'bg-[#0A0D12]'} rounded-[14px] flex items-center justify-center text-[#E6CA9E]`}>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 2C8.5 2 6 4 6 7c0 2.5 1 4.5 1 7 0 2.5.5 5 2 6 1 .7 2-1 3-4 1 3 2 4.7 3 4 1.5-1 2-3.5 2-6 0-2.5 1-4.5 1-7 0-3-2.5-5-6-5Z" />
                  <path d="M9 10c1-1 2-1 3 0" />
                </svg>
              </div>
            </div>
            <div className="flex flex-col">
              <span className={`font-bold tracking-tight text-xl ${logoTextClasses} flex items-center gap-1.5 font-serif-luxury`}>
                PureDent
                <span className="text-[10px] uppercase font-bold tracking-widest text-amber-950 bg-amber-400 px-2 py-0.5 rounded-full font-sans">
                  {isAdmin ? 'Admin' : 'Clinic'}
                </span>
              </span>
              <span className="text-[10px] font-bold text-stone-500 tracking-widest uppercase font-mono">PRECISION CLINIC</span>
            </div>
          </a>

          {/* Center: Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-7">
            {!isAdmin ? (
              navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className={`${linkClasses} ${link.badge ? 'flex items-center gap-1.5' : ''}`}
                >
                  <span>{link.label}</span>
                  {link.badge && (
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#00F2FE]" />
                  )}
                </a>
              ))
            ) : (
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-stone-400 font-mono">
                PureSmile Management Interface v1.0
              </div>
            )}
          </div>

          {/* Right: Search + Booking CTA (Desktop & Tablet) */}
          <div className="hidden md:flex items-center gap-3">
            {!isAdmin && (
              <>
                <button
                  onClick={onOpenSearch}
                  title="Search treatments & doctors"
                  className="w-10 h-10 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-stone-300 hover:text-white flex items-center justify-center transition-all shadow-sm hover:shadow cursor-pointer"
                >
                  <Search className="w-4 h-4" />
                </button>
                {onOpenAdmin && (
                  <button
                    onClick={onOpenAdmin}
                    title="Admin & Doctor Portal"
                    className="w-10 h-10 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-stone-400 hover:text-amber-300 flex items-center justify-center transition-all shadow-sm hover:shadow cursor-pointer"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                )}
              </>
            )}

            <button
              onClick={onOpenBooking}
              className="group relative inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider text-amber-950 bg-gradient-to-r from-[#E6CA9E] via-[#D8B482] to-[#C5A880] shadow-[0_4px_16px_rgba(216,180,130,0.35)] hover:shadow-[0_8px_24px_rgba(216,180,130,0.6)] hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer overflow-hidden"
            >
              <span className="relative z-10 flex items-center gap-1.5">
                <span>{isAdmin ? 'Return to Site' : 'Book Consultation'}</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </span>
              <div className="absolute inset-0 bg-white/25 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-12" />
            </button>
          </div>

          {/* Mobile & Tablet Controls (Screen < 768px: Search & Hamburger) */}
          <div className="flex md:hidden items-center gap-2">
            {!isAdmin && (
              <button 
                onClick={onOpenSearch} 
                className="p-2.5 rounded-xl border border-white/10 bg-white/5 text-stone-300 hover:text-white hover:bg-white/10 transition-colors"
                title="Search"
                aria-label="Search treatments"
              >
                <Search className="w-5 h-5" />
              </button>
            )}
            
            {/* The 3 Lines (Hamburger) Button */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
              className={`p-2.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                mobileMenuOpen 
                  ? 'bg-amber-400/20 border-amber-400/50 text-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.2)]' 
                  : isAdmin 
                    ? 'border-stone-200 bg-stone-100 text-stone-700 hover:bg-stone-200' 
                    : 'border-white/10 bg-white/5 text-stone-300 hover:text-white hover:bg-white/10'
              }`}
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6 transition-transform duration-200 rotate-90 scale-105" />
              ) : (
                <Menu className="w-6 h-6 transition-transform duration-200" />
              )}
            </button>
          </div>

        </div>
      </div>

      {/* MOBILE NAVIGATION MENU DRAWER / DROPDOWN */}
      {mobileMenuOpen && (
        <div 
          className={`md:hidden border-b transition-all duration-300 animate-in slide-in-from-top-4 fade-in ${
            isAdmin 
              ? 'bg-white border-stone-200 text-stone-900 shadow-2xl' 
              : 'bg-[#0A0D12]/98 backdrop-blur-2xl border-white/10 text-white shadow-[0_20px_50px_rgba(0,0,0,0.8)]'
          }`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-2">
            
            {/* Quick Header Banner */}
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/5 text-xs font-mono text-stone-400">
              <span className="uppercase tracking-widest text-[11px]">Precision Dental Navigation</span>
              <span className="text-amber-400 font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                PureDent Luxury Care
              </span>
            </div>

            {/* Menu Links */}
            {!isAdmin ? (
              navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={(e) => {
                    e.preventDefault();
                    handleLinkClick(link.href);
                  }}
                  className={`flex items-center justify-between px-4 py-3.5 rounded-xl text-base font-semibold transition-all ${
                    isAdmin 
                      ? 'text-stone-700 hover:text-stone-950 hover:bg-stone-100' 
                      : 'text-stone-200 hover:text-amber-300 hover:bg-white/5'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    {link.label}
                    {link.badge && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                        3D Tech
                      </span>
                    )}
                  </span>
                  <ChevronRight className="w-4 h-4 text-stone-500" />
                </a>
              ))
            ) : (
              <div className="py-4 px-2 text-stone-500 text-sm font-medium">
                Administrative Control Panel active. Return to main site below.
              </div>
            )}

            {/* Action CTA Button inside Mobile Menu */}
            <div className="pt-4 mt-2 border-t border-white/5 flex flex-col gap-3">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenBooking();
                }}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-full text-sm font-bold uppercase tracking-wider text-amber-950 bg-gradient-to-r from-[#E6CA9E] via-[#D8B482] to-[#C5A880] shadow-[0_4px_16px_rgba(216,180,130,0.35)] hover:shadow-[0_8px_24px_rgba(216,180,130,0.6)] active:scale-[0.98] transition-all cursor-pointer"
              >
                <Calendar className="w-4 h-4 text-amber-950" />
                <span>{isAdmin ? 'Return to Site' : 'Book Consultation'}</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>

              {!isAdmin && onOpenAdmin && (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAdmin();
                  }}
                  className="w-full flex items-center justify-between py-3 px-4 rounded-xl text-xs font-semibold text-stone-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-all cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <Settings className="w-4 h-4 text-amber-400" />
                    <span>Admin & Doctor Portal</span>
                  </span>
                  <span className="text-[10px] uppercase font-mono tracking-wider bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded font-bold">
                    Open
                  </span>
                </button>
              )}

              {/* Quick Contact & Hours Strip */}
              <div className="mt-2 p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col gap-2 text-xs text-stone-400">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-stone-300 font-medium">
                    <Phone className="w-3.5 h-3.5 text-amber-400" />
                    +1 (310) 555-0192
                  </span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                    Open Today
                  </span>
                </div>
                <div className="flex items-center gap-2 text-stone-500">
                  <Clock className="w-3.5 h-3.5 text-stone-400" />
                  <span>Mon – Sat: 8:00 AM – 7:00 PM</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </nav>
  );
};

