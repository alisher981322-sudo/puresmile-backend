import React, { useState } from 'react';
import { ChevronRight, HeartHandshake, Microscope, Crown, X, Check } from 'lucide-react';

interface ValueCardData {
  id: string;
  tag: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  image: string;
  accentBg: string;
  metric: string;
  details: string[];
}

const VALUES_DATA: ValueCardData[] = [
  {
    id: 'comfort',
    tag: 'GENTLE DENTISTRY',
    title: 'COMFORT',
    subtitle: 'Transparent Aligners & Gentle Protocols',
    description: 'We prioritize anxiety-free dental visits with custom clear aligners, zero-pinch computer-guided anesthesia, and spa-grade ergonomic suites.',
    icon: <HeartHandshake className="w-9 h-9 text-amber-700" />,
    image: '/assets/treatments/09.jpg',
    accentBg: 'from-amber-100/60 via-stone-50 to-amber-50/40',
    metric: 'Painless Anesthesia Delivery',
    details: [
      'Bespoke medical-grade clear aligner therapy (Invisalign Master Provider)',
      'Computer-controlled painless anesthetic delivery system',
      'Acoustic noise-canceling headphones & warm aromatherapy',
      'Minimally invasive enamel preservation guarantee',
    ],
  },
  {
    id: 'precision',
    tag: 'ANATOMICAL ACCURACY',
    title: 'PRECISION',
    subtitle: 'Microscopic Endodontics & Root Anatomy',
    description: 'Operating under surgical dental microscopes at up to 25x magnification, preserving healthy pulp and root structure with zero guesswork.',
    icon: <Microscope className="w-9 h-9 text-stone-700" />,
    image: '/assets/treatments/11.jpg',
    accentBg: 'from-stone-200/60 via-stone-50 to-cyan-50/40',
    metric: '25x Microscopic Magnification',
    details: [
      'Sub-millimeter micro-apical endodontic navigation',
      '3D CBCT cross-sectional nerve canal visualization',
      'Laser-assisted root canal sterilization protocols',
      'Bioactive bioceramic hermetic sealing',
    ],
  },
  {
    id: 'personalized',
    tag: 'BESPOKE DESIGN',
    title: 'PERSONALIZED CARE',
    subtitle: 'Golden Ratio Facial Aesthetic Calibration',
    description: 'Every crown, veneer, and molar restoration is custom designed to match your individual facial contour, skin undertone, and speech phonetics.',
    icon: <Crown className="w-9 h-9 text-amber-600" />,
    image: '/assets/treatments/02.jpg',
    accentBg: 'from-amber-100/50 via-stone-50 to-stone-100/40',
    metric: 'Custom Ceramist Calibration',
    details: [
      'Dynamic 3D facial scanning with natural smile dynamics',
      'Custom shade matching under full-spectrum daylight lamps',
      'One-on-one consultation with master ceramist',
      'Comprehensive post-treatment smile warranty & follow-up',
    ],
  },
];

interface ValuesSectionProps {
  onOpenBooking: () => void;
}

export const ValuesSection: React.FC<ValuesSectionProps> = ({ onOpenBooking }) => {
  const [selectedDetail, setSelectedDetail] = useState<ValueCardData | null>(null);

  return (
    <section id="values" className="relative py-24 lg:py-32 bg-[#F1EFEA] overflow-hidden">
      {/* Background soft studio light gradients */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-stone-200/60 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-amber-100/30 rounded-full blur-[140px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif-luxury font-bold text-stone-900 tracking-tight mb-4">
            The PureDent Difference
          </h2>
          <p className="text-stone-600 text-sm sm:text-base leading-relaxed">
            Uncompromising care sculpted for you. Experience the harmony of compassionate hospitality and Swiss-engineered dental science housed within our contemporary frosted glass suites.
          </p>
        </div>

        {/* 3 Frosted Glass Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 items-stretch">
          {VALUES_DATA.map((item) => (
            <div
              key={item.id}
              className="group relative rounded-2xl sm:rounded-3xl bg-white/80 backdrop-blur-xl border border-white/90 p-5 sm:p-8 shadow-[0_10px_35px_-5px_rgba(0,0,0,0.06)] hover:shadow-[0_20px_50px_-10px_rgba(216,180,130,0.25)] transition-all duration-300 flex flex-col justify-between h-full hover:-translate-y-2"
            >
              <div>
                {/* Clean Image Box without floating icon/metric overlays */}
                <div className="relative w-full h-36 sm:h-44 rounded-xl sm:rounded-2xl border border-stone-200/60 overflow-hidden mb-4 sm:mb-6 group-hover:scale-[1.02] transition-all">
                  {/* Background Image */}
                  <img 
                    src={item.image} 
                    alt={item.title}
                    className="absolute inset-0 w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700"
                  />
                </div>

                {/* Card Title & Content */}
                <h3 className="text-xl sm:text-2xl font-serif-luxury font-bold text-stone-900 mb-1 group-hover:text-amber-800 transition-colors">
                  {item.title}
                </h3>
                <div className="text-[11px] sm:text-xs font-semibold text-stone-500 mb-2 sm:mb-3">
                  {item.subtitle}
                </div>
                <p className="text-xs sm:text-sm text-stone-600 leading-relaxed line-clamp-3 sm:line-clamp-none">
                  {item.description}
                </p>
              </div>

              {/* Action Button: [Learn More >] */}
              <div className="mt-5 sm:mt-8 pt-3 sm:pt-5 border-t border-stone-200/60 flex items-center justify-start">
                <button
                  onClick={() => setSelectedDetail(item)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-950 group-hover:text-amber-700 transition-colors cursor-pointer"
                >
                  <span>Learn More</span>
                  <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>
              </div>

              {/* Border Trim Glow */}
              <div className="absolute inset-0 rounded-3xl border-2 border-transparent group-hover:border-amber-400/30 pointer-events-none transition-colors"></div>
            </div>
          ))}
        </div>

      </div>

      {/* Learn More Detail Modal */}
      {selectedDetail && (
        <div 
          onClick={() => setSelectedDetail(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl border border-stone-100 overflow-hidden cursor-default"
          >
            {/* Modal Header Image Background (Subtle) */}
            <div className="absolute top-0 left-0 w-full h-32 opacity-[0.08] pointer-events-none">
              <img src={selectedDetail.image} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white"></div>
            </div>

            <button
              onClick={() => setSelectedDetail(null)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-stone-100/80 hover:bg-stone-200 flex items-center justify-center text-stone-600 transition-colors cursor-pointer z-10"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="relative z-10">
              <div className="text-xs font-mono font-bold uppercase tracking-wider text-amber-800 mb-1">
                {selectedDetail.tag}
              </div>
              <h3 className="text-2xl font-serif-luxury font-bold text-stone-900 mb-2">
                {selectedDetail.title}
              </h3>
              <p className="text-xs font-medium text-stone-500 mb-4">
                {selectedDetail.subtitle}
              </p>
              <p className="text-sm text-stone-600 mb-6 leading-relaxed">
                {selectedDetail.description}
              </p>

              <div className="space-y-2.5 mb-8">
                <div className="text-xs font-bold uppercase tracking-wider text-stone-900 mb-2 font-mono">
                  Clinical Standards & Protocols:
                </div>
                {selectedDetail.details.map((point, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-stone-700">
                    <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-2.5 h-2.5" />
                    </div>
                    <span>{point}</span>
                  </div>
                ))}
              </div>

              <div>
                <button
                  onClick={() => {
                    setSelectedDetail(null);
                    onOpenBooking();
                  }}
                  className="w-full py-3.5 rounded-full text-xs font-bold uppercase tracking-wider text-amber-950 bg-gradient-to-r from-[#E6CA9E] to-[#C5A880] shadow-md hover:shadow-lg transition-all cursor-pointer"
                >
                  Schedule Consultation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
