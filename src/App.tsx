import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { ServicesCarousel } from './components/ServicesCarousel';
import { PrecisionTechSection } from './components/PrecisionTechSection';
import { ValuesSection } from './components/ValuesSection';
import { TestimonialsSection } from './components/TestimonialsSection';
import { FaqSection } from './components/FaqSection';
import { CtaSection } from './components/CtaSection';
import { Footer } from './components/Footer';
import { BookingModal } from './components/BookingModal';
import { SearchModal } from './components/SearchModal';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminAuthModal } from './components/AdminAuthModal';
import { Settings, ShieldCheck, KeyRound } from 'lucide-react';

export default function App() {
  const [view, setView] = useState<'client' | 'admin'>('client');
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAdminAuthModalOpen, setIsAdminAuthModalOpen] = useState(false);
  const [bookingService, setBookingService] = useState('Cosmetic Dentistry');
  const [adminToken, setAdminToken] = useState<string>(() => localStorage.getItem('adminToken') || '');

  // Support direct access via URL hash (e.g. your-app.com/#admin)
  useEffect(() => {
    const checkHash = () => {
      if (window.location.hash.toLowerCase() === '#admin') {
        const storedToken = localStorage.getItem('adminToken');
        if (storedToken) {
          setView('admin');
        } else {
          setIsAdminAuthModalOpen(true);
        }
      }
    };
    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, []);

  const handleOpenBooking = (service?: string) => {
    if (service) {
      setBookingService(service);
    }
    setIsBookingOpen(true);
  };

  const handleSelectSearchResult = (query: string) => {
    setBookingService(query);
    setIsBookingOpen(true);
  };

  const handleAdminTrigger = () => {
    // Open the OTP-Secured Admin Authentication Modal
    setIsAdminAuthModalOpen(true);
  };

  const handleLoginSuccess = (token: string, user: any) => {
    setAdminToken(token);
    setView('admin');
    setIsAdminAuthModalOpen(false); 
    
    // Fix: Use replaceState instead of window.location.hash
    window.history.replaceState(null, '', '#admin');
  };

  const handleExitAdmin = () => {
    setView('client');
    // Fix: Use replaceState here too to cleanly remove hash without triggering loops
    window.history.replaceState(null, '', window.location.pathname);
  };

  if (view === 'admin') {
    return (
      <div className="min-h-screen bg-[#F8F7F5] relative">
        <Navbar 
          onOpenBooking={handleExitAdmin} 
          onOpenSearch={() => {}} 
          isAdmin 
        />
        <AdminDashboard 
          onOpenSecurityModal={() => setIsAdminAuthModalOpen(true)}
          onLogout={() => {
            localStorage.removeItem('adminToken');
            setAdminToken('');
            handleExitAdmin();
          }}
        />
        
        {/* OTP-Secured Multi-Step Admin Authentication Modal */}
        <AdminAuthModal
          isOpen={isAdminAuthModalOpen}
          onClose={() => setIsAdminAuthModalOpen(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0D12] text-white flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      
      {/* Top Fixed Navigation */}
      <Navbar
        onOpenBooking={() => handleOpenBooking()}
        onOpenSearch={() => setIsSearchOpen(true)}
      />

      {/* Main Page Flow with Semantic Tags */}
      <main className="flex-1" role="main">
        <HeroSection onOpenBooking={() => handleOpenBooking()} />
        <ServicesCarousel onSelectService={(service) => handleOpenBooking(service)} />
        <PrecisionTechSection onOpenBooking={() => handleOpenBooking()} />
        <ValuesSection onOpenBooking={() => handleOpenBooking()} />
        <TestimonialsSection />
        <FaqSection onOpenBooking={() => handleOpenBooking()} />
        <CtaSection onOpenBooking={() => handleOpenBooking()} />
      </main>

      {/* Footer Bar with Exclusive 5-Click Hidden Admin Trigger */}
      <div id="about-clinic" className="relative">
        <Footer 
          onOpenBooking={() => handleOpenBooking()} 
          onOpenAdminModal={handleAdminTrigger} // ✅ FIXED: Prop name changed
        />
      </div>

      {/* Interactive Consultation Booking Modal */}
      <BookingModal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        initialService={bookingService}
      />

      {/* Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectResult={handleSelectSearchResult}
      />

      {/* OTP-Secured Multi-Step Admin Authentication Modal */}
      <AdminAuthModal
        isOpen={isAdminAuthModalOpen}
        onClose={() => setIsAdminAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

    </div>
  );
}