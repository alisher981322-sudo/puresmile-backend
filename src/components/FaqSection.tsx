import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Phone, Stethoscope } from 'lucide-react';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: 'all' | 'general' | 'cosmetic' | 'restorative' | 'ortho';
}

interface FaqSectionProps {
  onOpenBooking: () => void;
}

const DENTAL_FAQ_ITEMS: FaqItem[] = [
  {
    id: 'root-canal',
    category: 'restorative',
    question: 'Does a Root Canal Treatment (RCT) hurt, and how is it performed painlessly?',
    answer: 'Contrary to widespread fear, modern root canal treatment is completely painless—very similar to getting a standard filling. Using microscopic computerized local anesthesia, the tooth and surrounding nerves are 100% numbed. We delicately remove inflamed or infected pulp tissue from inside the root canals, disinfect the microscopic branches with laser irrigation, and seal the canals permanently with biocompatible gutta-percha to save your natural tooth.',
  },
  {
    id: 'scaling-myth',
    category: 'general',
    question: 'Does teeth scaling and cleaning make teeth loose or damage natural enamel?',
    answer: 'No, this is one of the most common dental myths. Ultrasonic scaling uses high-frequency micro-vibrations and water spray to gently shatter hardened calculus (tartar) and bacterial biofilm without touching or eroding your tooth enamel. Scaling does not weaken teeth; rather, ignoring tartar buildup causes chronic gum disease (periodontitis) that dissolves the underlying jawbone and eventually leads to loose teeth.',
  },
  {
    id: 'implants-vs-bridges',
    category: 'restorative',
    question: 'What is the clinical difference between a Dental Implant and a Dental Bridge?',
    answer: 'A dental implant is a permanent artificial tooth root made of medical-grade titanium or zirconia placed directly into the jawbone, preserving bone density and leaving adjacent natural teeth completely untouched. A traditional dental bridge requires grinding down and capping two healthy adjacent teeth to suspend a false tooth between them. Implants last a lifetime, do not decay, and prevent facial bone shrinkage.',
  },
  {
    id: 'tooth-sensitivity',
    category: 'general',
    question: 'Why do my teeth send sharp shocks with hot or cold drinks, and how is it treated?',
    answer: 'Tooth sensitivity occurs when protective outer enamel wears down or the gums recede, exposing microscopic channels (dentinal tubules) that transmit temperature signals directly to the inner dental nerve. Common triggers include harsh toothbrushes, acidic erosion, teeth grinding (bruxism), or hairline micro-fractures. Clinical treatments include professional desensitizing varnishes, composite enamel bonding, and custom night guards.',
  },
  {
    id: 'wisdom-teeth',
    category: 'ortho',
    question: 'When is wisdom tooth extraction necessary, and does everyone need them removed?',
    answer: 'Wisdom teeth only require extraction if they are impacted (trapped beneath the gums or bone), erupting at harmful angles that damage adjacent molar roots, or causing recurrent gum infections (pericoronitis) and jaw cysts. If your third molars emerge fully upright, bite properly against opposing teeth, and can be cleaned and flossed without difficulty, removal is entirely unnecessary.',
  },
  {
    id: 'whitening-safety',
    category: 'cosmetic',
    question: 'Is laser teeth whitening safe for enamel, and how long do the results last?',
    answer: 'Yes, clinical in-office whitening is 100% safe when supervised by a dental practitioner. Medical-grade hydrogen peroxide gel releases oxygen ions that penetrate microscopic enamel prisms to break apart deep organic stain compounds without demineralizing the tooth structure. Clinical results typically last 1 to 3 years depending on oral hygiene and consumption of staining agents such as coffee, tea, and tobacco.',
  },
  {
    id: 'veneers-vs-bonding',
    category: 'cosmetic',
    question: 'What is the difference between Porcelain Veneers and Composite Bonding?',
    answer: 'Porcelain veneers are ultra-thin custom ceramic shells fabricated in a dental laboratory; they boast superior optical translucency, are virtually immune to coffee/tea staining, and last 15 to 25+ years. Composite bonding is sculpted chairside with tooth-colored resin in a single appointment; while budget-friendly and fast, composite resin is softer, prone to surface discoloration, and typically lasts 4 to 7 years before needing polish or touch-up.',
  },
  {
    id: 'bleeding-gums',
    category: 'general',
    question: 'Why do my gums bleed during brushing or flossing, and is it an emergency?',
    answer: 'Bleeding gums are the hallmark sign of gingivitis—an active bacterial infection triggered by accumulated plaque along the gumline. Healthy gums never bleed during gentle brushing or flossing. While not an immediate hospital emergency, bleeding gums require professional clinical scaling and targeted antiseptic mouthwash before the inflammation advances to irreversible bone loss and periodontitis.',
  },
  {
    id: 'cavity-filling',
    category: 'restorative',
    question: 'When does tooth decay require a filling, and why are composite resins preferred over silver amalgam?',
    answer: 'A filling is required as soon as bacterial demineralization breaches outer enamel and enters the dentin layer. Modern tooth-colored composite resins chemically bond to natural tooth enamel, requiring far less drilling and tooth reduction than silver amalgam. Composite fillings match your natural tooth shade seamlessly, do not contain mercury, and expand and contract at the same rate as natural enamel during temperature shifts.',
  },
  {
    id: 'clear-aligners-braces',
    category: 'ortho',
    question: 'Can Clear Aligners correct complex bite misalignment, and how long does treatment take?',
    answer: 'Yes. Modern 3D digital clear aligner systems (such as Invisalign) utilize precision attachments and calibrated elastic vectors to treat severe crowding, spacing, overbites, and crossbites. Treatment duration typically ranges from 6 to 18 months. Aligners are completely clear and removable, allowing you to maintain optimal oral hygiene and eat whatever you like without dietary restrictions.',
  },
];



/**
 * Fast typing answer component.
 * Guaranteed to type out fresh from character 0 every single time the answer is revealed.
 */
const FastTypingAnswer: React.FC<{ text: string }> = ({ text }) => {
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    // Reset on mount
    setDisplayText('');
    setIsTyping(true);

    let currentIndex = 0;
    // Fast typing pacing: reveals 3 characters every 10ms (~1.0s total completion)
    const step = 3;
    const intervalTime = 10;

    const timer = setInterval(() => {
      currentIndex += step;
      if (currentIndex >= text.length) {
        setDisplayText(text);
        setIsTyping(false);
        clearInterval(timer);
      } else {
        setDisplayText(text.slice(0, currentIndex));
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, [text]);

  return (
    <div className="relative">
      <p className="text-sm sm:text-base text-stone-300 leading-relaxed font-normal">
        {displayText}
        {isTyping && (
          <span className="inline-block w-1.5 h-4 bg-amber-400 ml-1.5 translate-y-0.5 animate-pulse rounded-xs" />
        )}
      </p>
    </div>
  );
};

export const FaqSection: React.FC<FaqSectionProps> = ({ onOpenBooking }) => {
  const [openId, setOpenId] = useState<string | null>('root-canal');

  const filteredItems = DENTAL_FAQ_ITEMS;

  const toggleAccordion = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <section id="faq" className="relative pt-16 pb-6 sm:pt-24 sm:pb-12 lg:pt-28 lg:pb-14 bg-[#0A0D12] text-white overflow-hidden border-t border-stone-800/80">
      {/* Background Ambient Lighting Blobs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-amber-600/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-cyan-600/5 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header (Zero-Pill Discipline - Clean Luxury Typography) */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif-luxury font-bold text-white tracking-tight">
            Frequently Asked Dental Questions
          </h2>
          <p className="text-stone-400 text-sm sm:text-base mt-4 font-normal max-w-2xl mx-auto leading-relaxed">
            Direct clinical guidance from our dental surgeons on root canals, implants, sensitivity, veneers, scaling myths, and everyday oral health.
          </p>

        </div>

        {/* Accordion Questions List */}
        <div className="max-w-4xl mx-auto space-y-4">
          {filteredItems.map((item, idx) => {
            const isOpen = openId === item.id;

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.03 }}
                className={`rounded-2xl transition-all duration-300 border ${
                  isOpen
                    ? 'bg-[#121721] border-amber-400/35 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)]'
                    : 'bg-[#0f131a]/80 border-stone-800/80 hover:border-stone-700/80 hover:bg-[#12161f]'
                }`}
              >
                <button
                  onClick={() => toggleAccordion(item.id)}
                  aria-expanded={isOpen}
                  className="w-full px-6 sm:px-8 py-5 sm:py-6 text-left cursor-pointer select-none"
                >
                  <div>
                    <span className={`text-base sm:text-lg font-serif-luxury font-medium transition-colors ${
                      isOpen ? 'text-amber-200' : 'text-stone-200'
                    }`}>
                      {item.question}
                    </span>
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key={`answer-${item.id}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 sm:px-8 pb-6 pt-2 border-t border-white/5">
                        {/* Always types out fast on each reveal */}
                        <FastTypingAnswer text={item.answer} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom Clinical Assistance Card */}
        <div className="mt-8 sm:mt-14 max-w-4xl mx-auto rounded-3xl bg-gradient-to-r from-stone-900/90 via-[#141a24] to-stone-900/90 border border-stone-800 p-6 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-5 sm:gap-6">
          <div className="text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 text-amber-400 text-xs font-mono font-bold uppercase tracking-wider mb-2">
              <Stethoscope className="w-4 h-4" />
              <span>Personalized Dental Consultation</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-serif-luxury font-bold text-white mb-2">
              Experiencing a specific dental concern or discomfort?
            </h3>
            <p className="text-stone-400 text-xs sm:text-sm max-w-md">
              Speak directly with our clinical specialists for an immediate digital 3D evaluation and painless treatment plan.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto flex-shrink-0">
            <button
              onClick={onOpenBooking}
              className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-gradient-to-r from-[#E6CA9E] via-[#D8B482] to-[#C5A880] text-amber-950 text-xs font-bold uppercase tracking-wider shadow-lg hover:brightness-105 hover:-translate-y-0.5 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <span>Book Clinical Visit</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href="tel:+13105550199"
              className="w-full sm:w-auto px-5 py-3.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-stone-200 hover:text-amber-300 text-xs font-mono font-semibold flex items-center justify-center gap-2 transition-all whitespace-nowrap"
            >
              <Phone className="w-3.5 h-3.5 text-amber-400" />
              <span>(310) 555-0199</span>
            </a>
          </div>
        </div>

      </div>
    </section>
  );
};

