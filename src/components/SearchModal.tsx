import React, { useState } from 'react';
import { Search, X, ArrowRight, Sparkles, Activity, Shield } from 'lucide-react';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectResult: (query: string) => void;
}

const SEARCH_DATABASE = [
  { title: 'Teeth Cleaning & Scaling', category: 'Hygiene', section: 'services', desc: 'Danton ki professional safai aur plaque/tartar hatana ($95 / Rs. 5,000)' },
  { title: 'Tooth Fillings (Cavity Treatment)', category: 'Restorative', section: 'services', desc: 'Karraye (cavity) ko saaf karke composite se fill karna ($120 / Rs. 6,000)' },
  { title: 'Root Canal Treatment (RCT)', category: 'Endodontics', section: 'services', desc: 'Nerve infection khatam karna aur dant bachana ($350 / Rs. 16,000)' },
  { title: 'Tooth Extraction (Tooth Removal)', category: 'Surgery', section: 'services', desc: 'Kharab dant ya Wisdom Tooth safely nikalna ($150 / Rs. 7,000)' },
  { title: 'Teeth Whitening (Bleaching)', category: 'Cosmetic', section: 'services', desc: 'Laser cold-light se 8 shades safedi aur chamak ($280 / Rs. 20,000)' },
  { title: 'Dental Crowns & Bridges', category: 'Prosthodontics', section: 'services', desc: 'Kamzor dant par cap (crown) aur missing danton ka bridge ($450 / Rs. 22,000)' },
  { title: 'Orthodontic Braces / Aligners', category: 'Orthodontics', section: 'services', desc: 'Terhay danton ko seedha karne ke liye braces / Invisalign ($1,600 / Rs. 120,000)' },
  { title: 'Dental Implants', category: 'Implantology', section: 'services', desc: 'Permanent titanium artificial root aur cap ($1,200 / Rs. 95,000)' },
  { title: 'Dentures (Artificial Teeth Set)', category: 'Prosthodontics', section: 'services', desc: 'Missing danton ke liye lightweight artificial teeth set ($550 / Rs. 40,000)' },
  { title: 'Gum Treatment (Periodontal Care)', category: 'Periodontics', section: 'services', desc: 'Masooron se khoon aana aur soozish ka laser ilaj ($180 / Rs. 10,000)' },
  { title: 'Holographic 3D Laser Diagnostic Scanner', category: 'Technology', section: 'technology', desc: '0.02mm optical tolerance zero-radiation wireframe scan' },
  { title: 'Smile Transformation Studio', category: 'Orthodontics', section: 'technology', desc: 'Digital before/after alignment simulation and arch symmetry' },
  { title: 'Dr. Marcus Vance, DDS', category: 'Doctor', section: 'booking', desc: 'Chief Prosthodontist & Master Implantologist' },
  { title: 'Dr. Elena Rostova, DMD', category: 'Doctor', section: 'booking', desc: 'Cosmetic Smile Architect & Veneer Specialist' },
];

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, onSelectResult }) => {
  const [query, setQuery] = useState('');

  if (!isOpen) return null;

  const filteredResults = query.trim() === ''
    ? SEARCH_DATABASE.slice(0, 5)
    : SEARCH_DATABASE.filter(item => 
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.category.toLowerCase().includes(query.toLowerCase()) ||
        item.desc.toLowerCase().includes(query.toLowerCase())
      );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-stone-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-3xl bg-white text-stone-900 p-6 shadow-2xl border border-stone-100">
        
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 pb-4 border-b border-stone-200">
          <Search className="w-5 h-5 text-stone-400" />
          <input
            type="text"
            autoFocus
            placeholder="Search treatments, 3D scanner, doctors..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 text-base text-stone-900 placeholder-stone-400 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="py-4 space-y-2 max-h-96 overflow-y-auto">
          <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-stone-400 mb-2 px-2">
            {query.trim() === '' ? 'Popular Clinical Searches' : `Results (${filteredResults.length})`}
          </div>

          {filteredResults.length === 0 ? (
            <div className="text-center py-8 text-stone-500 text-xs">
              No matching dental procedures or technologies found. Try &quot;Veneers&quot;, &quot;Laser&quot;, or &quot;Implants&quot;.
            </div>
          ) : (
            filteredResults.map((item, idx) => (
              <button
                key={idx}
                onClick={() => {
                  onSelectResult(item.title);
                  onClose();
                  // Smooth scroll to section if relevant
                  if (item.section !== 'booking') {
                    const el = document.getElementById(item.section);
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="w-full text-left p-3 rounded-2xl hover:bg-stone-50 transition-colors flex items-center justify-between group border border-transparent hover:border-stone-200/60"
              >
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-bold text-stone-900 group-hover:text-amber-800 transition-colors">
                      {item.title}
                    </span>
                    <span className="text-[10px] font-mono uppercase bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">
                      {item.category}
                    </span>
                  </div>
                  <div className="text-xs text-stone-500 line-clamp-1">{item.desc}</div>
                </div>

                <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-amber-700 transition-transform group-hover:translate-x-1" />
              </button>
            ))
          )}
        </div>

        {/* Footer Hint */}
        <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] font-mono text-stone-400">
          <span>Doctor Dental Clinic Search</span>
          <span>ESC to close</span>
        </div>

      </div>
    </div>
  );
};
