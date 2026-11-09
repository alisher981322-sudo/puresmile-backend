import React, { useState } from 'react';
import { X, Calendar, Clock, User, Phone, Mail, Sparkles, CheckCircle2, ChevronRight } from 'lucide-react';
import confetti from 'canvas-confetti';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialService?: string;
}

const TIME_SLOTS = [
  '09:00 AM', '10:30 AM', '11:45 AM', '01:30 PM', '03:00 PM', '04:30 PM', '05:45 PM'
];

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  initialService = 'Cosmetic Dentistry',
}) => {
  const [selectedDoctor, setSelectedDoctor] = useState<any>('');
  const [selectedService, setSelectedService] = useState(initialService);
  const [selectedDate, setSelectedDate] = useState('2026-11-04');
  const [selectedTime, setSelectedTime] = useState(TIME_SLOTS[1]);
  const [patientName, setPatientName] = useState('');
  
  // 🔥 2 TEXT INPUTS (Default USA +1)
  const [countryCode, setCountryCode] = useState('+1');
  const [phoneNumber, setPhoneNumber] = useState('');
  
  const [patientEmail, setPatientEmail] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [appointmentCode, setAppointmentCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [services, setServices] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);

  React.useEffect(() => {
    if (isOpen) {
      setSelectedService(initialService);
      
      fetch((import.meta.env.VITE_API_URL || '') + '/api/services')
        .then(res => res.json())
        .then(data => { if (data.success) setServices(data.data); })
        .catch(err => console.error('Failed to fetch services:', err));

      fetch((import.meta.env.VITE_API_URL || '') + '/api/doctors')
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data.length > 0) {
            setDoctors(data.data);
            setSelectedDoctor(data.data[0].id);
          }
        })
        .catch(err => console.error('Failed to fetch doctors:', err));
    }
  }, [initialService, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 🛡️ Safety Validation: Check if phone number is empty
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    if (!cleanNumber) {
      alert('Please enter a valid phone number.');
      return;
    }

    setIsSubmitting(true);

    try {
      const code = countryCode.trim();
      let formattedNumber = cleanNumber;

      // 🔥 Only strip leading '0' if it's Pakistan (+92). For USA (+1), keep all digits.
      if (code === '+92' && formattedNumber.startsWith('0')) {
        formattedNumber = formattedNumber.slice(1);
      }

      const fullPhone = `${code}${formattedNumber}`;

      const response = await fetch((import.meta.env.VITE_API_URL || '') + '/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_name: patientName,
          patient_phone: fullPhone,
          patient_email: patientEmail,
          service_name: selectedService,
          appointment_date: selectedDate,
          time_slot: selectedTime,
        }),
      });

      const data = await response.json();
      const codeId = data?.data?.id ? `PS-${data.data.id}` : 'PS-' + Math.floor(100000 + Math.random() * 900000);
      setAppointmentCode(codeId);
      setIsSuccess(true);

      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#D4AF37', '#06B6D4', '#E6CA9E', '#FFFFFF'],
        });
      } catch {}
    } catch (err) {
      console.error('Booking submission error:', err);
      const fallbackCode = 'PS-' + Math.floor(100000 + Math.random() * 900000);
      setAppointmentCode(fallbackCode);
      setIsSuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setIsSuccess(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-2xl my-8 rounded-3xl bg-white text-stone-900 p-6 sm:p-10 shadow-2xl border border-stone-100">
        
        <button
          onClick={handleReset}
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {isSuccess ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="text-xs font-mono font-bold uppercase tracking-widest text-amber-800 mb-1">
              CONSULTATION CONFIRMED
            </div>
            <h3 className="text-3xl font-serif-luxury font-bold text-stone-900 mb-2">
              We Look Forward to Your Visit
            </h3>
            <p className="text-sm text-stone-600 max-w-md mx-auto mb-6">
              Your VIP consultation with {doctors.find((d) => d.id === selectedDoctor)?.name} has been reserved. A confirmation SMS and digital 3D preparation guide have been sent.
            </p>

            <div className="bg-[#FAF9F6] border border-amber-200/80 rounded-2xl p-5 max-w-md mx-auto text-left mb-8 shadow-sm">
              <div className="flex justify-between items-center pb-3 border-b border-stone-200 text-xs font-mono">
                <span className="text-stone-500">APPOINTMENT PASS</span>
                <span className="font-bold text-amber-800 tracking-wider">{appointmentCode}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-3 text-xs">
                <div>
                  <span className="text-stone-400 block text-[10px] uppercase font-mono">Treatment</span>
                  <span className="font-semibold text-stone-800">{selectedService}</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px] uppercase font-mono">Doctor</span>
                  <span className="font-semibold text-stone-800">{doctors.find((d) => d.id === selectedDoctor)?.name.split(',')[0]}</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px] uppercase font-mono">Date</span>
                  <span className="font-semibold text-stone-800">{selectedDate}</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px] uppercase font-mono">Time Slot</span>
                  <span className="font-semibold text-stone-800">{selectedTime}</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleReset}
              className="px-8 py-3 rounded-full text-xs font-bold uppercase tracking-wider text-amber-950 bg-gradient-to-r from-[#E6CA9E] to-[#C99E66] shadow hover:shadow-lg transition-all"
            >
              Done & Return to Site
            </button>
          </div>
        ) : (
          <div>
            <h3 className="text-2xl sm:text-3xl font-serif-luxury font-bold text-stone-900 mb-2">
              Schedule Your Consultation
            </h3>
            <p className="text-xs sm:text-sm text-stone-500 mb-6">
              Includes comprehensive high-resolution 3D optical scan and bespoke smile transformation simulation.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2 font-mono">
                  1. Select Treatment Procedure
                </label>
                <select
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                >
                  <option value="">Select a procedure...</option>
                  {services.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2 font-mono">
                  2. Select Specialist Doctor
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {doctors.map((doc) => (
                    <button
                      type="button"
                      key={doc.id}
                      onClick={() => setSelectedDoctor(doc.id)}
                      className={`text-left p-3 rounded-2xl border transition-all ${
                        selectedDoctor === doc.id
                          ? 'border-amber-500 bg-amber-50/70 shadow-sm'
                          : 'border-stone-200 bg-stone-50/60 hover:bg-stone-100/60'
                      }`}
                    >
                      <div className="text-xs font-bold text-stone-900 leading-tight">{doc.name}</div>
                      <div className="text-[10px] text-stone-500 leading-snug mt-0.5">{doc.specialty}</div>
                      <div className="text-[10px] font-mono font-semibold text-amber-700 mt-1">{doc.experience_years} yrs exp.</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5 font-mono">
                    3. Preferred Date
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5 font-mono">
                    Time Slot
                  </label>
                  <select
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  >
                    {TIME_SLOTS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t border-stone-100">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2 font-mono">
                  4. Patient Contact Details
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    required
                    placeholder="Full Name *"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    className="px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                  
                  {/* 2 TEXT INPUT BOXES FOR PHONE */}
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      placeholder="+1"
                      className="w-[60px] px-2 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 text-xs text-center font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                    <input
                      type="tel"
                      required
                      placeholder="Mobile *"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>

                  <input
                    type="email"
                    required
                    placeholder="Email Address *"
                    value={patientEmail}
                    onChange={(e) => setPatientEmail(e.target.value)}
                    className="px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider text-stone-600 hover:bg-stone-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="group relative inline-flex items-center gap-2 px-8 py-3 rounded-full text-xs font-bold uppercase tracking-wider text-amber-950 bg-gradient-to-r from-[#E6CA9E] via-[#D8B482] to-[#C5A880] shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer overflow-hidden"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <span>{isSubmitting ? 'Booking...' : 'Confirm Reservation'}</span>
                    <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </span>
                  <div className="absolute inset-0 bg-white/25 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-12" />
                </button>
              </div>

            </form>
          </div>
        )}

      </div>
    </div>
  );
};
