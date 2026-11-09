import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Users, Calendar, Stethoscope, MessageSquare, Plus, Search, Edit3, Trash2, CheckCircle2, 
  Clock, AlertCircle, RefreshCw, ChevronRight, X, Save, DollarSign, Timer, KeyRound, 
  LogOut, History, Filter, UserCheck, XCircle, CalendarCheck, CalendarX, FileText, 
  Activity, Check, Sparkles, AlertTriangle
} from 'lucide-react';
import { WhatsAppQrModal } from './WhatsAppQrModal';

export type TabType = 'appointments' | 'patients' | 'services' | 'doctors' | 'inquiries' | 'audit_logs';
export type AppointmentStatusFilter = 'ALL' | 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
export type AuditActionFilter = 'ALL' | 'BOOKING' | 'CANCELLATION' | 'PATIENT_VISIT' | 'STATUS_CHANGE' | 'ADMIN_AUTH';

interface AdminDashboardProps {
  onOpenSecurityModal?: () => void;
  onLogout?: () => void;
}

// 🔥 SMART PHONE MATCHER: Handles +1 (US), +92 (PK), spaces, dashes, brackets
function matchesSmartPhone(patientPhone: string, searchQuery: string): boolean {
  if (!patientPhone || !searchQuery) return false;
  
  const rawDigits = patientPhone.replace(/\D/g, '');
  const searchDigits = searchQuery.replace(/\D/g, '');
  
  if (!searchDigits) return false; 
  
  // Handles Pakistan (+92) local 0 normalization & general substring matching
  const normalizedRaw = rawDigits.startsWith('92') && rawDigits.length > 10 ? '0' + rawDigits.slice(2) : rawDigits;
  const normalizedSearch = searchDigits.startsWith('92') && searchDigits.length > 10 ? '0' + searchDigits.slice(2) : searchDigits;

  return rawDigits.includes(searchDigits) || 
         normalizedRaw.includes(normalizedSearch) ||
         searchDigits.includes(rawDigits);
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onOpenSecurityModal, onLogout }) => {
  const [activeTab, setActiveTab] = useState<TabType>('appointments');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Data States
  const [appointments, setAppointments] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditSummary, setAuditSummary] = useState<any>(null);

  // Search & Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [appointmentFilter, setAppointmentFilter] = useState<AppointmentStatusFilter>('ALL');
  const [inquiryFilter, setInquiryFilter] = useState<'ALL' | 'Unread' | 'Resolved'>('ALL');
  
  // Audit Logs Filter States
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const yesterdayStr = useMemo(() => new Date(Date.now() - 86400000).toISOString().split('T')[0], []);
  const [auditDateFilter, setAuditDateFilter] = useState<string>(todayStr);
  const [auditActionFilter, setAuditActionFilter] = useState<AuditActionFilter>('ALL');

  // Custom Delete Modal State
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'service' | 'doctor', id: number, name: string } | null>(null);

  // Service CRUD modal states
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<any | null>(null);
  const [serviceFormData, setServiceFormData] = useState({ name: '', description: '', price: '', duration_minutes: '' });

  // Doctor CRUD modal states
  const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<any | null>(null);
  const [doctorFormData, setDoctorFormData] = useState({ name: '', specialty: '', experience_years: '', bio: '', availability: '' });

  // Patient Inline Edit state
  const [editingPatientId, setEditingPatientId] = useState<number | null>(null);
  const [medicalHistoryInput, setMedicalHistoryInput] = useState('');

  // Quick Check-in Modal
  const [isCheckinModalOpen, setIsCheckinModalOpen] = useState(false);
  const [checkinForm, setCheckinForm] = useState({
    patient_name: '',
    patient_phone: '',
    service_name: 'Teeth Cleaning & Scaling',
    details: 'Patient arrived at clinic frontdesk and completed consultation.',
  });
  // 🔥 2 Text Inputs for Country Code and Number (Default USA +1)
  const [checkinCountryCode, setCheckinCountryCode] = useState('+1');
  const [checkinPhoneNumber, setCheckinPhoneNumber] = useState('');

  // WhatsApp QR Modal State & Live Status
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [whatsAppStatus, setWhatsAppStatus] = useState<'DISCONNECTED' | 'SCANNING_QR' | 'CONNECTED' | 'INITIALIZING' | 'AUTHENTICATING'>('DISCONNECTED');

  // Refs for Race Condition and Filter Dependency Leak
  const fetchCounter = useRef(0);
  const auditFiltersRef = useRef({ date: todayStr, action: 'ALL' as AuditActionFilter });

  // Background Polling for WhatsApp Status (with Auth)
  useEffect(() => {
    const fetchWaStatus = async () => {
      try {
        const token = localStorage.getItem('adminToken') || '';
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch((import.meta.env.VITE_API_URL || '') + '/api/whatsapp/status', { headers });
        const json = await res.json();
        if (json.success && json.data?.sessionStatus) {
          setWhatsAppStatus(json.data.sessionStatus);
        }
      } catch {
        // silent background poll
      }
    };
    fetchWaStatus();
    const interval = setInterval(fetchWaStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  // Debounce Search Term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Sync Audit Filters to Ref
  useEffect(() => {
    auditFiltersRef.current = { date: auditDateFilter, action: auditActionFilter };
  }, [auditDateFilter, auditActionFilter]);

  // Notification Banner
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const getAuthToken = useCallback(() => localStorage.getItem('adminToken') || '', []);

  // Fetch Data
  const fetchData = useCallback(async (tab: TabType) => {
    const reqId = ++fetchCounter.current;
    setLoading(true);
    setError(null);

    try {
      if (tab === 'audit_logs') {
        const { date, action } = auditFiltersRef.current;
        let url = `/api/admin/audit-logs?`;
        if (date && date !== 'ALL_TIME') {
          url += `date=${date}&`;
        }
        if (action !== 'ALL') {
          url += `action=${action}&`;
        }
        const token = getAuthToken();
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const response = await fetch(url, { headers });
        const result = await response.json();
        
        if (reqId !== fetchCounter.current) return;
        if (result.success) {
          setAuditLogs(result.data || []);
          setAuditSummary(result.summary || null);
        } else {
          throw new Error(result.error || 'Failed to fetch audit logs');
        }
      } else {
        const response = await fetch(`/api/${tab}`);
        const result = await response.json();
        
        if (reqId !== fetchCounter.current) return;
        if (result.success) {
          if (tab === 'appointments') setAppointments(result.data || []);
          if (tab === 'patients') setPatients(result.data || []);
          if (tab === 'services') setServices(result.data || []);
          if (tab === 'doctors') setDoctors(result.data || []);
          if (tab === 'inquiries') setInquiries(result.data || []);
        } else {
          throw new Error(result.error || `Failed to fetch ${tab}`);
        }
      }
    } catch (err: any) {
      if (reqId !== fetchCounter.current) return;
      console.error(`🔥 [DASHBOARD ERROR] Fetching ${tab} failed:`, err);
      setError(err.message || 'Error communicating with clinic server');
    } finally {
      if (reqId === fetchCounter.current) {
        setLoading(false);
      }
    }
  }, [getAuthToken]);

  useEffect(() => {
    fetchData(activeTab);
  }, [activeTab, fetchData]);

  // Appointment Status Toggle
  const updateAppointmentStatus = async (id: number, newStatus: string) => {
    try {
      const token = getAuthToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`/api/appointments/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status: newStatus })
      });
      const result = await response.json();

      if (response.status === 401 || response.status === 403) {
        setNotification({
          message: `Admin authorization required: ${result.error || 'Please log in with admin credentials.'}`,
          type: 'error',
        });
        return;
      }

      if (result.success) {
        setAppointments(prev => prev.map(a => a.id === id ? result.data : a));
        const waNote = newStatus === 'Confirmed' ? ' • Outbound WhatsApp confirmation enqueued (Safe 15-30s throttle)' : '';
        setNotification({
          message: `Appointment #${id} updated to '${newStatus}'${waNote}.`,
          type: 'success'
        });
        setTimeout(() => setNotification(null), 4000);
        if (activeTab === 'audit_logs') {
          fetchData('audit_logs');
        }
      } else {
        throw new Error(result.error || 'Failed to update appointment status');
      }
    } catch (err: any) {
      console.error('Failed to update appointment status:', err);
      setNotification({ message: err.message || 'Status update failed', type: 'error' });
    }
  };

  // Inquiry Status Toggle
  const updateInquiryStatus = async (id: number, newStatus: string) => {
    try {
      const response = await fetch(`/api/inquiries/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const result = await response.json();
      if (result.success) {
        setInquiries(prev => prev.map(i => i.id === id ? result.data : i));
        setNotification({
          message: `Inquiry #${id} marked as '${newStatus}'.`,
          type: 'success'
        });
        setTimeout(() => setNotification(null), 3000);
      } else {
        throw new Error(result.error || 'Failed to update inquiry status');
      }
    } catch (err: any) {
      console.error('Failed to update inquiry status:', err);
      setNotification({ 
        message: err.message || 'Failed to update inquiry status', 
        type: 'error' 
      });
      setTimeout(() => setNotification(null), 4000);
    }
  };

  // Patient Medical History Update
  const handleSaveMedicalHistory = async (id: number) => {
    const token = getAuthToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const response = await fetch(`/api/patients/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ medical_history: medicalHistoryInput }),
      });
      const result = await response.json();

      if (response.status === 401 || response.status === 403) {
        setNotification({
          message: `Authentication required: ${result.error || 'Please log in with admin password.'}`,
          type: 'error',
        });
        return;
      }

      if (result.success) {
        setPatients(prev => prev.map(p => p.id === id ? result.data : p));
        setEditingPatientId(null);
        setNotification({
          message: 'Patient medical history updated successfully!',
          type: 'success',
        });
        setTimeout(() => setNotification(null), 3000);
      } else {
        throw new Error(result.error || 'Failed to update patient');
      }
    } catch (err: any) {
      setNotification({ message: err.message || 'Update failed', type: 'error' });
    }
  };

  // Service Save
  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getAuthToken();
    const method = editingService ? 'PUT' : 'POST';
    const url = editingService ? `/api/services/${editingService.id}` : '/api/services';
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(serviceFormData),
      });
      const result = await response.json();

      if (response.status === 401 || response.status === 403) {
        setNotification({
          message: `Admin authorization required: ${result.error || 'Please re-authenticate.'}`,
          type: 'error',
        });
        return;
      }

      if (result.success) {
        setNotification({
          message: result.message || `Service ${editingService ? 'updated' : 'created'} successfully!`,
          type: 'success',
        });
        setTimeout(() => setNotification(null), 3000);

        if (editingService) {
          setServices(prev => prev.map(s => s.id === editingService.id ? result.data : s));
        } else {
          setServices(prev => [result.data, ...prev]);
        }

        setIsServiceModalOpen(false);
        setEditingService(null);
      } else {
        throw new Error(result.error || 'Failed to save service');
      }
    } catch (err: any) {
      setNotification({ message: err.message || 'Error saving service', type: 'error' });
    }
  };

  // Custom Delete Modal Triggers
  const requestDeleteService = (service: any) => {
    setDeleteTarget({ type: 'service', id: service.id, name: service.name });
  };

  const requestDeleteDoctor = (doctor: any) => {
    setDeleteTarget({ type: 'doctor', id: doctor.id, name: doctor.name });
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    const { type, id } = deleteTarget;
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const url = type === 'service' ? `/api/services/${id}` : `/api/doctors/${id}`;
      const response = await fetch(url, { method: 'DELETE', headers });
      const result = await response.json();

      if (response.status === 401 || response.status === 403) {
        setNotification({
          message: `Admin authorization required: ${result.error}`,
          type: 'error',
        });
        return;
      }

      if (result.success) {
        if (type === 'service') {
          setServices(prev => prev.filter(s => s.id !== id));
        } else {
          setDoctors(prev => prev.filter(d => d.id !== id));
        }
        setNotification({ 
          message: `${type === 'service' ? 'Service' : 'Doctor'} removed successfully.`, 
          type: 'success' 
        });
        setTimeout(() => setNotification(null), 3000);
      } else {
        throw new Error(result.error || `Failed to delete ${type}`);
      }
    } catch (err: any) {
      setNotification({ message: err.message || `Error deleting ${type}`, type: 'error' });
    } finally {
      setDeleteTarget(null);
    }
  };

  const openServiceModal = (service?: any) => {
    if (service) {
      setEditingService(service);
      setServiceFormData({
        name: service.name,
        description: service.description,
        price: service.price.toString(),
        duration_minutes: service.duration_minutes.toString()
      });
    } else {
      setEditingService(null);
      setServiceFormData({ name: '', description: '', price: '', duration_minutes: '' });
    }
    setIsServiceModalOpen(true);
  };

  // Doctor Save
  const handleSaveDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getAuthToken();
    const method = editingDoctor ? 'PUT' : 'POST';
    const url = editingDoctor ? `/api/doctors/${editingDoctor.id}` : '/api/doctors';
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(doctorFormData),
      });
      const result = await response.json();

      if (response.status === 401 || response.status === 403) {
        setNotification({
          message: `Admin authorization required: ${result.error || 'Please re-authenticate.'}`,
          type: 'error',
        });
        return;
      }

      if (result.success) {
        setNotification({
          message: `Doctor ${editingDoctor ? 'updated' : 'added'} successfully!`,
          type: 'success',
        });
        setTimeout(() => setNotification(null), 3000);

        if (editingDoctor) {
          setDoctors(prev => prev.map(d => d.id === editingDoctor.id ? result.data : d));
        } else {
          setDoctors(prev => [result.data, ...prev]);
        }

        setIsDoctorModalOpen(false);
        setEditingDoctor(null);
      } else {
        throw new Error(result.error || 'Failed to save doctor');
      }
    } catch (err: any) {
      setNotification({ message: err.message || 'Error saving doctor', type: 'error' });
    }
  };

  const openDoctorModal = (doctor?: any) => {
    if (doctor) {
      setEditingDoctor(doctor);
      setDoctorFormData({
        name: doctor.name,
        specialty: doctor.specialty,
        experience_years: doctor.experience_years.toString(),
        bio: doctor.bio,
        availability: doctor.availability
      });
    } else {
      setEditingDoctor(null);
      setDoctorFormData({ name: '', specialty: '', experience_years: '', bio: '', availability: '' });
    }
    setIsDoctorModalOpen(true);
  };

  // 🔥 Quick Patient Check-in (With Safety Validation & US-friendly formatting)
  const handleQuickCheckinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 🛡️ Safety check for empty phone number and name
    const cleanNumber = checkinPhoneNumber.replace(/\D/g, '');
    if (!cleanNumber || !checkinForm.patient_name.trim()) {
      setNotification({ message: 'Please enter a valid patient name and phone number.', type: 'error' });
      return;
    }

    try {
      const token = getAuthToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const code = checkinCountryCode.trim();
      let formattedNumber = cleanNumber;

      // 🔥 Only strip leading '0' if it's Pakistan (+92). For USA (+1), keep all digits.
      if (code === '+92' && formattedNumber.startsWith('0')) {
        formattedNumber = formattedNumber.slice(1);
      }

      const fullPhone = `${code}${formattedNumber}`;
      const payload = { ...checkinForm, patient_phone: fullPhone };

      const response = await fetch((import.meta.env.VITE_API_URL || '') + '/api/admin/audit-logs/checkin', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (result.success) {
        setNotification({
          message: `Patient ${checkinForm.patient_name} check-in successfully logged!`,
          type: 'success'
        });
        setIsCheckinModalOpen(false);
        setCheckinForm({
          patient_name: '',
          patient_phone: '',
          service_name: 'Teeth Cleaning & Scaling',
          details: 'Patient arrived at clinic frontdesk and completed consultation.',
        });
        setCheckinCountryCode('+1'); // Reset to US default
        setCheckinPhoneNumber('');
        fetchData('audit_logs');
      } else {
        throw new Error(result.error || 'Check-in failed');
      }
    } catch (err: any) {
      setNotification({ message: err.message || 'Failed to log check-in', type: 'error' });
    }
  };

  // Filtered Data (Using debouncedSearchTerm and matchesSmartPhone)
  const filteredAppointments = useMemo(() => {
    return appointments.filter(a => {
      const matchesFilter = appointmentFilter === 'ALL' || a.status === appointmentFilter;
      const q = debouncedSearchTerm.toLowerCase();
      const matchesSearch = !q || 
        (a.patient_name && a.patient_name.toLowerCase().includes(q)) ||
        (a.patient_phone && matchesSmartPhone(a.patient_phone, debouncedSearchTerm)) ||
        (a.service_name && a.service_name.toLowerCase().includes(q)) ||
        (a.appointment_date && a.appointment_date.includes(q));
      return matchesFilter && matchesSearch;
    });
  }, [appointments, appointmentFilter, debouncedSearchTerm]);

  const appointmentCounts = useMemo(() => {
    return {
      all: appointments.length,
      pending: appointments.filter(a => a.status === 'Pending').length,
      confirmed: appointments.filter(a => a.status === 'Confirmed').length,
      completed: appointments.filter(a => a.status === 'Completed').length,
      cancelled: appointments.filter(a => a.status === 'Cancelled').length,
    };
  }, [appointments]);

  const filteredInquiries = useMemo(() => {
    return inquiries.filter(i => {
      const matchesFilter = inquiryFilter === 'ALL' || i.status === inquiryFilter;
      const q = debouncedSearchTerm.toLowerCase();
      const matchesSearch = !q ||
        (i.name && i.name.toLowerCase().includes(q)) ||
        (i.phone && matchesSmartPhone(i.phone, debouncedSearchTerm)) ||
        (i.email && i.email.toLowerCase().includes(q)) ||
        (i.message && i.message.toLowerCase().includes(q));
      return matchesFilter && matchesSearch;
    });
  }, [inquiries, inquiryFilter, debouncedSearchTerm]);

  const filteredPatients = useMemo(() => {
    const q = debouncedSearchTerm.toLowerCase();
    return patients.filter(p => 
      !q ||
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.phone && matchesSmartPhone(p.phone, debouncedSearchTerm)) ||
      (p.email && p.email.toLowerCase().includes(q)) ||
      (p.medical_history && p.medical_history.toLowerCase().includes(q))
    );
  }, [patients, debouncedSearchTerm]);

  const filteredServices = useMemo(() => {
    const q = debouncedSearchTerm.toLowerCase();
    return services.filter(s =>
      !q ||
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.description && s.description.toLowerCase().includes(q))
    );
  }, [services, debouncedSearchTerm]);

  const filteredDoctors = useMemo(() => {
    const q = debouncedSearchTerm.toLowerCase();
    return doctors.filter(d =>
      !q ||
      (d.name && d.name.toLowerCase().includes(q)) ||
      (d.specialty && d.specialty.toLowerCase().includes(q)) ||
      (d.bio && d.bio.toLowerCase().includes(q))
    );
  }, [doctors, debouncedSearchTerm]);

  const filteredAuditLogs = useMemo(() => {
    const q = debouncedSearchTerm.toLowerCase();
    return auditLogs.filter(log =>
      !q ||
      (log.title && log.title.toLowerCase().includes(q)) ||
      (log.patient_name && log.patient_name.toLowerCase().includes(q)) ||
      (log.patient_phone && matchesSmartPhone(log.patient_phone, debouncedSearchTerm)) ||
      (log.service_name && log.service_name.toLowerCase().includes(q)) ||
      (log.details && log.details.toLowerCase().includes(q)) ||
      (log.actor && log.actor.toLowerCase().includes(q))
    );
  }, [auditLogs, debouncedSearchTerm]);

  // Stable Callback for WhatsApp Modal
  const handleWhatsAppStatusChange = useCallback((newStatus: 'DISCONNECTED' | 'SCANNING_QR' | 'CONNECTED' | 'INITIALIZING' | 'AUTHENTICATING') => {
    setWhatsAppStatus(newStatus as any);
  }, []);

  return (
    <div className="min-h-screen bg-[#F8F7F5] text-stone-900 font-sans flex flex-col pt-20">
      
      {/* Top Banner / Streamlined Header Container */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        
        {/* STREAMLINED CLEAN HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-stone-200">
          
          {/* Left: Branding & Status */}
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#D4AF37] via-[#C5A880] to-[#997B4D] p-[1.5px] shadow-sm flex-shrink-0">
              <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center text-[#B38D4F]">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 2C8.5 2 6 4 6 7c0 2.5 1 4.5 1 7 0 2.5.5 5 2 6 1 .7 2-1 3-4 1 3 2 4.7 3 4 1.5-1 2-3.5 2-6 0-2.5 1-4.5 1-7 0-3-2.5-5-6-5Z" />
                </svg>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-serif-luxury font-bold text-stone-900">
                  Clinical Management
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Live Clinic Sync
                </span>
                <span 
                  className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-teal-50 text-teal-800 border border-teal-200"
                  title="Hybrid WhatsApp Engine (Official Cloud API + Puppeteer Fallback with 15-30s human-cadence throttling)"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                  WhatsApp Hybrid
                </span>

                {/* Connect WhatsApp (QR) Button */}
                <button
                  type="button"
                  onClick={() => setIsWhatsAppModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 hover:border-emerald-400 transition-all cursor-pointer shadow-xs active:scale-95"
                  title="Manage WhatsApp Web Device Link & QR Session"
                >
                  <span>🔗</span>
                  <span>Connect WhatsApp (QR)</span>
                  {whatsAppStatus === 'CONNECTED' ? (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Session Connected" />
                  ) : whatsAppStatus === 'SCANNING_QR' ? (
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" title="Awaiting QR Scan" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-stone-400" title="Disconnected" />
                  )}
                </button>
              </div>
              <p className="text-stone-500 text-xs">
                PureSmile Precision Operations, CRM Records & Daily Clinical Audit Trail
              </p>
            </div>
          </div>

          {/* Right: Clean Action Controls */}
          <div className="flex items-center flex-wrap gap-2.5">
            {/* Refresh */}
            <button 
              onClick={() => fetchData(activeTab)}
              className="p-2.5 rounded-xl bg-white border border-stone-200 text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-colors cursor-pointer shadow-sm"
              title="Refresh Current Tab"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-600' : ''}`} />
            </button>

            {/* Security / Password Trigger */}
            {onOpenSecurityModal && (
              <button 
                onClick={onOpenSecurityModal}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100/80 border border-amber-300 text-amber-900 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                title="Manage Admin Password / 2FA OTP"
              >
                <KeyRound className="w-4 h-4 text-amber-700" />
                <span>Security / Password</span>
              </button>
            )}

            {/* Quick Action depending on tab */}
            {activeTab === 'services' && (
              <button 
                onClick={() => openServiceModal()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 text-white text-xs font-bold uppercase tracking-wider hover:bg-black transition-all shadow-md cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Service</span>
              </button>
            )}

            {activeTab === 'audit_logs' && (
              <button 
                onClick={() => setIsCheckinModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider hover:bg-emerald-800 transition-all shadow-md cursor-pointer"
              >
                <UserCheck className="w-4 h-4" />
                <span>Log Patient Check-in</span>
              </button>
            )}

            {/* Exit Admin / Return to Site */}
            {onLogout && (
              <button 
                onClick={onLogout}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200/80 border border-stone-200 text-stone-700 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                title="Exit Admin Panel"
              >
                <LogOut className="w-4 h-4 text-stone-600" />
                <span className="hidden sm:inline">Exit Admin</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Notification Bar */}
        {notification && (
          <div className={`mt-4 p-3.5 rounded-2xl border text-xs flex items-center justify-between animate-in fade-in ${
            notification.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
            notification.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' :
            'bg-amber-50 border-amber-200 text-amber-800'
          }`}>
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? <Check className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
              <span className="font-medium">{notification.message}</span>
            </div>
            <button onClick={() => setNotification(null)} className="p-1 hover:opacity-75">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* MODERNIZED TABS WITH SMOOTH TRANSITIONS & ACTIVE INDICATORS */}
        <div className="mt-6 flex items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-stone-200 shadow-sm overflow-x-auto whitespace-nowrap scrollbar-hide">
          
          {/* Appointments Tab */}
          <button
            onClick={() => setActiveTab('appointments')}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'appointments'
                ? 'bg-stone-900 text-white shadow-sm'
                : 'text-stone-500 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Appointments</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
              activeTab === 'appointments' ? 'bg-stone-800 text-amber-300' : 'bg-stone-100 text-stone-600'
            }`}>
              {appointments.length}
            </span>
          </button>

          {/* Patients Tab */}
          <button
            onClick={() => setActiveTab('patients')}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'patients'
                ? 'bg-stone-900 text-white shadow-sm'
                : 'text-stone-500 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Patients</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
              activeTab === 'patients' ? 'bg-stone-800 text-amber-300' : 'bg-stone-100 text-stone-600'
            }`}>
              {patients.length}
            </span>
          </button>

          {/* Services Tab */}
          <button
            onClick={() => setActiveTab('services')}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'services'
                ? 'bg-stone-900 text-white shadow-sm'
                : 'text-stone-500 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            <span>Services</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
              activeTab === 'services' ? 'bg-stone-800 text-amber-300' : 'bg-stone-100 text-stone-600'
            }`}>
              {services.length}
            </span>
          </button>

          {/* Doctors Tab */}
          <button
            onClick={() => setActiveTab('doctors')}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'doctors'
                ? 'bg-stone-900 text-white shadow-sm'
                : 'text-stone-500 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Doctors</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
              activeTab === 'doctors' ? 'bg-stone-800 text-amber-300' : 'bg-stone-100 text-stone-600'
            }`}>
              {doctors.length}
            </span>
          </button>

          {/* Inquiries Tab */}
          <button
            onClick={() => setActiveTab('inquiries')}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'inquiries'
                ? 'bg-stone-900 text-white shadow-sm'
                : 'text-stone-500 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Inquiries</span>
            {inquiries.some(i => i.status === 'Unread') && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
            )}
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
              activeTab === 'inquiries' ? 'bg-stone-800 text-amber-300' : 'bg-stone-100 text-stone-600'
            }`}>
              {inquiries.length}
            </span>
          </button>

          {/* Dedicated Daily History & Audit Logs Tab */}
          <button
            onClick={() => setActiveTab('audit_logs')}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'audit_logs'
                ? 'bg-stone-900 text-white shadow-sm'
                : 'text-stone-500 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            <History className="w-4 h-4 text-amber-400" />
            <span>Daily History & Logs</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              activeTab === 'audit_logs' ? 'bg-amber-500/30 text-amber-300 border border-amber-400/30' : 'bg-amber-100/60 text-amber-800'
            }`}>
              Audit Trail
            </span>
          </button>
        </div>

        {/* SEARCH & FILTER CONTROLS TOOLBAR */}
        <div className="mt-5 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Universal Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input 
              type="text" 
              placeholder={
                activeTab === 'appointments' ? 'Search patient name, phone, procedure...' :
                activeTab === 'patients' ? 'Search patient name, phone, history...' :
                activeTab === 'services' ? 'Search dental services or procedures...' :
                activeTab === 'inquiries' ? 'Search inquiry sender, email, message...' :
                'Search daily audit events, patients, procedures...'
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 rounded-2xl border border-stone-200 bg-white text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all shadow-sm"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Contextual Filters: APPOINTMENTS TAB */}
          {activeTab === 'appointments' && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-stone-400 font-medium font-mono mr-1">Status:</span>
              {(['ALL', 'Pending', 'Confirmed', 'Completed', 'Cancelled'] as AppointmentStatusFilter[]).map((status) => {
                const count = 
                  status === 'ALL' ? appointmentCounts.all :
                  status === 'Pending' ? appointmentCounts.pending :
                  status === 'Confirmed' ? appointmentCounts.confirmed :
                  status === 'Completed' ? appointmentCounts.completed :
                  appointmentCounts.cancelled;

                return (
                  <button
                    key={status}
                    onClick={() => setAppointmentFilter(status)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      appointmentFilter === status
                        ? 'bg-stone-900 text-white shadow-sm'
                        : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    <span>{status}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                      appointmentFilter === status 
                        ? 'bg-stone-800 text-stone-200' 
                        : 'bg-stone-100 text-stone-500'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Contextual Filters: DAILY HISTORY & LOGS TAB */}
          {activeTab === 'audit_logs' && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-stone-400 font-medium font-mono mr-1">Date:</span>
              
              <button
                onClick={() => { setAuditDateFilter(todayStr); auditFiltersRef.current.date = todayStr; fetchData('audit_logs'); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  auditDateFilter === todayStr
                    ? 'bg-stone-900 text-white shadow-sm'
                    : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                Today
              </button>

              <button
                onClick={() => { setAuditDateFilter(yesterdayStr); auditFiltersRef.current.date = yesterdayStr; fetchData('audit_logs'); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  auditDateFilter === yesterdayStr
                    ? 'bg-stone-900 text-white shadow-sm'
                    : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                Yesterday
              </button>

              <button
                onClick={() => { setAuditDateFilter('ALL_TIME'); auditFiltersRef.current.date = 'ALL_TIME'; fetchData('audit_logs'); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  auditDateFilter === 'ALL_TIME'
                    ? 'bg-stone-900 text-white shadow-sm'
                    : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                All History
              </button>

              {/* Custom Date Input */}
              <input 
                type="date" 
                value={auditDateFilter !== 'ALL_TIME' ? auditDateFilter : ''}
                onChange={(e) => { setAuditDateFilter(e.target.value); auditFiltersRef.current.date = e.target.value; fetchData('audit_logs'); }}
                className="px-3 py-1.5 text-xs rounded-xl bg-white border border-stone-200 text-stone-700 outline-none focus:border-amber-400"
                title="Select Specific Date"
              />
            </div>
          )}

          {/* Contextual Filters: INQUIRIES TAB */}
          {activeTab === 'inquiries' && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-stone-400 font-mono mr-1">Filter:</span>
              {(['ALL', 'Unread', 'Resolved'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setInquiryFilter(status)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    inquiryFilter === status
                      ? 'bg-stone-900 text-white shadow-sm'
                      : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden min-h-[420px]">
          
          {loading && !error ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-3">
              <RefreshCw className="w-8 h-8 text-amber-600 animate-spin" />
              <p className="text-stone-500 text-xs font-medium animate-pulse">Syncing records with server database...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
              <AlertCircle className="w-10 h-10 text-rose-500 mb-3" />
              <h3 className="text-lg font-bold text-stone-900">Database Synchronization Notice</h3>
              <p className="text-stone-500 text-xs mt-1.5 max-w-md">{error}</p>
              <button 
                onClick={() => fetchData(activeTab)}
                className="mt-5 px-5 py-2 rounded-xl bg-stone-900 text-white text-xs font-bold uppercase tracking-wider hover:bg-black transition-all"
              >
                Retry Query
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              
              {/* ======================================================== */}
              {/* 1. APPOINTMENTS TAB                                      */}
              {/* ======================================================== */}
              {activeTab === 'appointments' && (
                <div>
                  {filteredAppointments.length === 0 ? (
                    <div className="py-20 text-center text-stone-400">
                      <Calendar className="w-10 h-10 mx-auto text-stone-300 mb-2" />
                      <p className="text-sm font-semibold text-stone-600">No appointments match your criteria</p>
                      <p className="text-xs text-stone-400 mt-1">Try selecting "ALL" or adjusting your search keyword.</p>
                    </div>
                  ) : (
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-stone-50/80 border-b border-stone-200">
                          <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-stone-500 font-mono">Patient Details</th>
                          <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-stone-500 font-mono">Procedure</th>
                          <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-stone-500 font-mono">Schedule</th>
                          <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-stone-500 font-mono">Status</th>
                          <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-stone-500 font-mono text-right">Quick Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {filteredAppointments.map((appt) => (
                          <tr key={appt.id} className="hover:bg-stone-50/60 transition-colors">
                            <td className="px-6 py-4.5">
                              <div className="font-bold text-stone-900 text-sm">{appt.patient_name}</div>
                              <div className="text-xs text-stone-500 font-mono mt-0.5">{appt.patient_phone}</div>
                            </td>
                            <td className="px-6 py-4.5">
                              <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-900 text-[11px] font-semibold border border-amber-200/60">
                                {appt.service_name}
                              </span>
                            </td>
                            <td className="px-6 py-4.5">
                              <div className="flex items-center gap-1.5 text-stone-800 font-medium text-xs">
                                <Calendar className="w-3.5 h-3.5 text-stone-400" />
                                {appt.appointment_date}
                              </div>
                              <div className="flex items-center gap-1.5 text-stone-500 text-[11px] mt-0.5 font-mono">
                                <Clock className="w-3 h-3 text-stone-400" />
                                {appt.time_slot}
                              </div>
                            </td>
                            <td className="px-6 py-4.5">
                              <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider font-mono border ${
                                appt.status === 'Confirmed' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                                appt.status === 'Completed' ? 'bg-sky-50 text-sky-800 border-sky-200' :
                                appt.status === 'Cancelled' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                                'bg-amber-50 text-amber-800 border-amber-200'
                              }`}>
                                {appt.status}
                              </span>
                            </td>
                            <td className="px-6 py-4.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {appt.status !== 'Confirmed' && (
                                  <button 
                                    onClick={() => updateAppointmentStatus(appt.id, 'Confirmed')}
                                    className="p-1.5 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                                    title="Mark as Confirmed"
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                  </button>
                                )}
                                {appt.status !== 'Completed' && (
                                  <button 
                                    onClick={() => updateAppointmentStatus(appt.id, 'Completed')}
                                    className="p-1.5 rounded-lg text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-colors"
                                    title="Mark as Patient Visited & Completed"
                                  >
                                    <UserCheck className="w-4 h-4" />
                                  </button>
                                )}
                                {appt.status !== 'Cancelled' && (
                                  <button 
                                    onClick={() => updateAppointmentStatus(appt.id, 'Cancelled')}
                                    className="p-1.5 rounded-lg text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
                                    title="Mark as Cancelled"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* ======================================================== */}
              {/* 2. PATIENTS CRM TAB                                      */}
              {/* ======================================================== */}
              {activeTab === 'patients' && (
                <div>
                  {filteredPatients.length === 0 ? (
                    <div className="py-20 text-center text-stone-400">
                      <Users className="w-10 h-10 mx-auto text-stone-300 mb-2" />
                      <p className="text-sm font-semibold text-stone-600">No patient records found</p>
                    </div>
                  ) : (
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-stone-50/80 border-b border-stone-200">
                          <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-stone-500 font-mono">Patient Contact</th>
                          <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-stone-500 font-mono">Clinical & Medical Notes</th>
                          <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-stone-500 font-mono">Registered</th>
                          <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-stone-500 font-mono text-right">Edit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {filteredPatients.map((patient) => (
                          <tr key={patient.id} className="hover:bg-stone-50/60 transition-colors">
                            <td className="px-6 py-4.5">
                              <div className="font-bold text-stone-900 text-sm">{patient.name}</div>
                              <div className="text-xs text-stone-500">{patient.email || 'No email on record'}</div>
                              <div className="text-xs font-mono text-amber-800 mt-0.5">{patient.phone}</div>
                            </td>
                            <td className="px-6 py-4.5 max-w-md">
                              {editingPatientId === patient.id ? (
                                <div className="flex items-start gap-2">
                                  <textarea 
                                    value={medicalHistoryInput}
                                    onChange={(e) => setMedicalHistoryInput(e.target.value)}
                                    className="w-full p-2.5 text-xs border border-stone-300 rounded-xl focus:ring-1 focus:ring-stone-900 outline-none h-20 bg-stone-50"
                                    placeholder="Enter allergies, medical history, clinical observations..."
                                    autoFocus
                                  />
                                  <div className="flex flex-col gap-1.5">
                                    <button 
                                      onClick={() => handleSaveMedicalHistory(patient.id)}
                                      className="p-2 rounded-xl bg-stone-900 text-white hover:bg-black transition-colors"
                                      title="Save Notes"
                                    >
                                      <Save className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                      onClick={() => setEditingPatientId(null)}
                                      className="p-2 rounded-xl bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors"
                                      title="Cancel"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div 
                                  onClick={() => {
                                    setEditingPatientId(patient.id);
                                    setMedicalHistoryInput(patient.medical_history || '');
                                  }}
                                  className="text-xs text-stone-600 italic cursor-pointer hover:text-stone-900 line-clamp-2 p-2 rounded-xl hover:bg-stone-100/70 transition-colors"
                                  title="Click to edit clinical notes"
                                >
                                  {patient.medical_history || 'No medical notes yet. Click here to add observations.'}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4.5 text-xs text-stone-500 font-mono">
                              {new Date(patient.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4.5 text-right">
                              <button 
                                onClick={() => {
                                  setEditingPatientId(patient.id);
                                  setMedicalHistoryInput(patient.medical_history || '');
                                }}
                                className="p-2 rounded-xl bg-stone-50 border border-stone-200 text-stone-600 hover:text-stone-900 transition-all cursor-pointer"
                                title="Edit Notes"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* ======================================================== */}
              {/* 3. SERVICES CATALOG TAB                                  */}
              {/* ======================================================== */}
              {activeTab === 'services' && (
                <div>
                  {/* Catalog Action Sub-Header */}
                  <div className="px-6 py-3.5 bg-stone-50/80 border-b border-stone-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Stethoscope className="w-4 h-4 text-amber-700" />
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-stone-700">
                        Dental Services Catalog ({filteredServices.length} Total)
                      </span>
                    </div>
                    <button 
                      onClick={() => openServiceModal()}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-stone-900 text-white text-xs font-bold uppercase tracking-wider hover:bg-black transition-all shadow-sm cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Add New Service</span>
                    </button>
                  </div>

                  {filteredServices.length === 0 ? (
                    <div className="py-20 text-center text-stone-400">
                      <Stethoscope className="w-10 h-10 mx-auto text-stone-300 mb-2" />
                      <p className="text-sm font-semibold text-stone-600">No services match your search</p>
                      <button 
                        onClick={() => openServiceModal()}
                        className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-bold uppercase tracking-wider hover:bg-black cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Add New Service</span>
                      </button>
                    </div>
                  ) : (
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-stone-50/80 border-b border-stone-200">
                          <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-stone-500 font-mono">Service Name</th>
                          <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-stone-500 font-mono">Description</th>
                          <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-stone-500 font-mono">Pricing</th>
                          <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-stone-500 font-mono text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {filteredServices.map((service) => (
                          <tr key={service.id} className="hover:bg-stone-50/60 transition-colors">
                            <td className="px-6 py-4.5">
                              <div className="font-bold text-stone-900 text-sm">{service.name}</div>
                              <div className="flex items-center gap-1.5 text-[11px] text-stone-400 mt-1 font-mono">
                                <Timer className="w-3 h-3 text-amber-600" />
                                {service.duration_minutes} minutes
                              </div>
                            </td>
                            <td className="px-6 py-4.5">
                              <p className="text-xs text-stone-600 line-clamp-2 max-w-sm">{service.description}</p>
                            </td>
                            <td className="px-6 py-4.5">
                              <div className="flex items-center gap-1 font-bold text-stone-900 text-sm font-mono">
                                <DollarSign className="w-3.5 h-3.5 text-amber-700" />
                                {service.price}
                              </div>
                            </td>
                            <td className="px-6 py-4.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button 
                                  onClick={() => openServiceModal(service)}
                                  className="p-2 rounded-xl bg-stone-50 border border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-all cursor-pointer"
                                  title="Edit Service"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => requestDeleteService(service)}
                                  className="p-2 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 hover:bg-rose-100 transition-all cursor-pointer"
                                  title="Delete Service"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* ======================================================== */}
              {/* 3.5 DOCTORS MANAGEMENT TAB                              */}
              {/* ======================================================== */}
              {activeTab === 'doctors' && (
                <div>
                  <div className="px-6 py-3.5 bg-stone-50/80 border-b border-stone-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-amber-700" />
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-stone-700">
                        Dental Specialists ({filteredDoctors.length} Total)
                      </span>
                    </div>
                    <button 
                      onClick={() => openDoctorModal()}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-stone-900 text-white text-xs font-bold uppercase tracking-wider hover:bg-black transition-all shadow-sm cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Add New Doctor</span>
                    </button>
                  </div>

                  {filteredDoctors.length === 0 ? (
                    <div className="py-20 text-center text-stone-400">
                      <UserCheck className="w-10 h-10 mx-auto text-stone-300 mb-2" />
                      <p className="text-sm font-semibold text-stone-600">No doctors match your search</p>
                      <button 
                        onClick={() => openDoctorModal()}
                        className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-bold uppercase tracking-wider hover:bg-black cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Add New Doctor</span>
                      </button>
                    </div>
                  ) : (
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-stone-50/80 border-b border-stone-200">
                          <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-stone-500 font-mono">Specialist Info</th>
                          <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-stone-500 font-mono">Bio & Experience</th>
                          <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-stone-500 font-mono">Availability</th>
                          <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-stone-500 font-mono text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {filteredDoctors.map((doctor) => (
                          <tr key={doctor.id} className="hover:bg-stone-50/60 transition-colors">
                            <td className="px-6 py-4.5">
                              <div className="font-bold text-stone-900 text-sm">{doctor.name}</div>
                              <div className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md inline-block mt-1">
                                {doctor.specialty}
                              </div>
                            </td>
                            <td className="px-6 py-4.5">
                              <div className="flex items-center gap-1.5 text-xs text-stone-700 font-bold mb-1">
                                <History className="w-3.5 h-3.5" />
                                {doctor.experience_years} Years Experience
                              </div>
                              <p className="text-xs text-stone-500 line-clamp-2 max-w-sm italic">"{doctor.bio}"</p>
                            </td>
                            <td className="px-6 py-4.5">
                              <div className="flex items-center gap-1.5 text-xs text-stone-600 font-mono">
                                <Clock className="w-3.5 h-3.5 text-stone-400" />
                                {doctor.availability}
                              </div>
                            </td>
                            <td className="px-6 py-4.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button 
                                  onClick={() => openDoctorModal(doctor)}
                                  className="p-2 rounded-xl bg-stone-50 border border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-all cursor-pointer"
                                  title="Edit Specialist"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => requestDeleteDoctor(doctor)}
                                  className="p-2 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 hover:bg-rose-100 transition-all cursor-pointer"
                                  title="Remove Specialist"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* ======================================================== */}
              {/* 4. CONTACT INQUIRIES TAB                                 */}
              {/* ======================================================== */}
              {activeTab === 'inquiries' && (
                <div>
                  {filteredInquiries.length === 0 ? (
                    <div className="py-20 text-center text-stone-400">
                      <MessageSquare className="w-10 h-10 mx-auto text-stone-300 mb-2" />
                      <p className="text-sm font-semibold text-stone-600">No contact inquiries found</p>
                    </div>
                  ) : (
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-stone-50/80 border-b border-stone-200">
                          <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-stone-500 font-mono">Sender</th>
                          <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-stone-500 font-mono">Inquiry Message</th>
                          <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-stone-500 font-mono">Status</th>
                          <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-stone-500 font-mono text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {filteredInquiries.map((inquiry) => (
                          <tr key={inquiry.id} className="hover:bg-stone-50/60 transition-colors">
                            <td className="px-6 py-4.5">
                              <div className="font-bold text-stone-900 text-sm">{inquiry.name}</div>
                              <div className="text-[11px] text-stone-500 mt-0.5">{inquiry.email || 'No email provided'}</div>
                              <div className="text-[11px] font-mono text-amber-800">{inquiry.phone}</div>
                            </td>
                            <td className="px-6 py-4.5">
                              <p className="text-xs text-stone-700 leading-relaxed max-w-md italic">"{inquiry.message}"</p>
                            </td>
                            <td className="px-6 py-4.5">
                              <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider font-mono ${
                                inquiry.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800' :
                                inquiry.status === 'Read' ? 'bg-stone-100 text-stone-600' :
                                'bg-amber-100 text-amber-900'
                              }`}>
                                {inquiry.status}
                              </span>
                            </td>
                            <td className="px-6 py-4.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {inquiry.status !== 'Resolved' && (
                                  <button 
                                    onClick={() => updateInquiryStatus(inquiry.id, 'Resolved')}
                                    className="p-2 rounded-xl bg-stone-900 text-white hover:bg-black transition-all cursor-pointer text-xs flex items-center gap-1 font-bold"
                                    title="Mark Resolved"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Resolve</span>
                                  </button>
                                )}
                                {inquiry.status === 'Unread' && (
                                  <button 
                                    onClick={() => updateInquiryStatus(inquiry.id, 'Read')}
                                    className="p-2 rounded-xl bg-stone-100 text-stone-600 hover:bg-stone-200 transition-all cursor-pointer"
                                    title="Mark Read"
                                  >
                                    <ChevronRight className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* ======================================================== */}
              {/* 5. DAILY HISTORY & AUDIT TRAIL TAB (REQUIREMENT #4)     */}
              {/* ======================================================== */}
              {activeTab === 'audit_logs' && (
                <div className="p-6">
                  
                  {/* Daily Metric Highlights */}
                  {auditSummary && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                      
                      <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
                        <div className="flex items-center justify-between text-stone-500 mb-1">
                          <span className="text-[11px] font-bold uppercase font-mono tracking-wider">Daily Events</span>
                          <Activity className="w-4 h-4 text-stone-400" />
                        </div>
                        <div className="text-2xl font-bold font-serif-luxury text-stone-900">
                          {auditSummary.totalForDate}
                        </div>
                        <div className="text-[10px] text-stone-400 font-mono mt-0.5">
                          Date: {auditSummary.selectedDate}
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80">
                        <div className="flex items-center justify-between text-amber-800 mb-1">
                          <span className="text-[11px] font-bold uppercase font-mono tracking-wider">Bookings</span>
                          <CalendarCheck className="w-4 h-4 text-amber-600" />
                        </div>
                        <div className="text-2xl font-bold font-serif-luxury text-amber-950">
                          {auditSummary.bookingsForDate}
                        </div>
                        <div className="text-[10px] text-amber-700/80 font-mono mt-0.5">
                          New Consultations
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80">
                        <div className="flex items-center justify-between text-emerald-800 mb-1">
                          <span className="text-[11px] font-bold uppercase font-mono tracking-wider">Patient Visits</span>
                          <UserCheck className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div className="text-2xl font-bold font-serif-luxury text-emerald-950">
                          {auditSummary.visitsForDate}
                        </div>
                        <div className="text-[10px] text-emerald-700/80 font-mono mt-0.5">
                          Completed / Check-ins
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200/80">
                        <div className="flex items-center justify-between text-rose-800 mb-1">
                          <span className="text-[11px] font-bold uppercase font-mono tracking-wider">Cancellations</span>
                          <CalendarX className="w-4 h-4 text-rose-600" />
                        </div>
                        <div className="text-2xl font-bold font-serif-luxury text-rose-950">
                          {auditSummary.cancellationsForDate}
                        </div>
                        <div className="text-[10px] text-rose-700/80 font-mono mt-0.5">
                          Cancelled Appointments
                        </div>
                      </div>

                    </div>
                  )}

                  {/* Secondary Action Filter Pills */}
                  <div className="flex items-center justify-between flex-wrap gap-3 mb-6 pb-4 border-b border-stone-100">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs text-stone-400 font-mono font-medium mr-1">Event Type:</span>
                      {(['ALL', 'BOOKING', 'PATIENT_VISIT', 'CANCELLATION', 'STATUS_CHANGE', 'ADMIN_AUTH'] as AuditActionFilter[]).map((action) => (
                        <button
                          key={action}
                          onClick={() => { setAuditActionFilter(action); auditFiltersRef.current.action = action; fetchData('audit_logs'); }}
                          className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                            auditActionFilter === action
                              ? 'bg-stone-900 text-white shadow-sm'
                              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                          }`}
                        >
                          {action === 'ALL' ? 'All Events' :
                           action === 'BOOKING' ? 'Bookings' :
                           action === 'PATIENT_VISIT' ? 'Patient Visits' :
                           action === 'CANCELLATION' ? 'Cancellations' :
                           action === 'STATUS_CHANGE' ? 'Status Changes' : 'Security / Auth'}
                        </button>
                      ))}
                    </div>

                    <div className="text-xs text-stone-400 font-mono">
                      Showing {filteredAuditLogs.length} events
                    </div>
                  </div>

                  {/* Chronological Timeline Feed */}
                  {filteredAuditLogs.length === 0 ? (
                    <div className="py-20 text-center text-stone-400">
                      <History className="w-10 h-10 mx-auto text-stone-300 mb-2" />
                      <p className="text-sm font-semibold text-stone-600">No operational audit records for this filter</p>
                      <p className="text-xs text-stone-400 mt-1">Try selecting "All History" or removing your search filter.</p>
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {filteredAuditLogs.map((log) => {
                        const actionStr = log.event_type || log.action || 'EVENT';
                        const isBooking = actionStr.includes('BOOKING');
                        const isCancellation = actionStr.includes('CANCELLATION');
                        const isVisit = actionStr.includes('PATIENT_VISIT') || actionStr.includes('PATIENT_CHECKIN');
                        const isSecurity = actionStr.includes('ADMIN') || actionStr.includes('PASSWORD_CHANGE');

                        return (
                          <div 
                            key={log.id} 
                            className={`p-4 rounded-2xl border transition-all ${
                              isCancellation ? 'bg-rose-50/30 border-rose-200/60 hover:bg-rose-50/50' :
                              isVisit ? 'bg-emerald-50/30 border-emerald-200/60 hover:bg-emerald-50/50' :
                              isBooking ? 'bg-amber-50/30 border-amber-200/60 hover:bg-amber-50/50' :
                              isSecurity ? 'bg-purple-50/30 border-purple-200/60 hover:bg-purple-50/50' :
                              'bg-stone-50/40 border-stone-200 hover:bg-stone-50'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                              
                              <div className="flex items-center gap-2.5">
                                <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider font-mono ${
                                  isCancellation ? 'bg-rose-100 text-rose-800' :
                                  isVisit ? 'bg-emerald-100 text-emerald-800' :
                                  isBooking ? 'bg-amber-100 text-amber-900' :
                                  isSecurity ? 'bg-purple-100 text-purple-900' :
                                  'bg-stone-200 text-stone-800'
                                }`}>
                                  {actionStr.replace(/_/g, ' ')}
                                </span>
                                
                                <h4 className="text-sm font-bold text-stone-900">
                                  {log.title}
                                </h4>
                              </div>

                              <div className="flex items-center gap-2 text-xs text-stone-500 font-mono">
                                <Clock className="w-3.5 h-3.5 text-stone-400" />
                                <span>{log.date} at {log.time}</span>
                              </div>
                            </div>

                            <p className="text-xs text-stone-700 leading-relaxed mb-3">
                              {log.details}
                            </p>

                            <div className="flex items-center flex-wrap gap-2 text-[11px] pt-1 border-t border-stone-200/60 text-stone-500">
                              {log.patient_name && (
                                <span className="font-semibold text-stone-900 flex items-center gap-1">
                                  <Users className="w-3 h-3 text-amber-600" />
                                  <span>{log.patient_name}</span>
                                  {log.patient_phone && <span className="text-stone-400 font-mono text-[10px]">({log.patient_phone})</span>}
                                </span>
                              )}

                              {log.service_name && (
                                <span className="px-2 py-0.5 rounded bg-white border border-stone-200 text-stone-700 font-medium text-[10px]">
                                  {log.service_name}
                                </span>
                              )}

                              {log.new_status && (
                                <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-700 text-[10px] font-mono">
                                  Status: {log.new_status}
                                </span>
                              )}

                              <span className="ml-auto text-stone-400 text-[10px] font-mono">
                                Recorded by: <strong className="text-stone-600">{log.actor}</strong>
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>
              )}

            </div>
          )}
        </div>
      </div>

      {/* SERVICE CRUD MODAL */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-stone-950/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl border border-stone-100 relative">
            <button 
              onClick={() => setIsServiceModalOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-stone-100 text-stone-400 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-2xl font-serif-luxury font-bold text-stone-900 mb-1.5">
              {editingService ? 'Edit Service' : 'Add New Service'}
            </h3>
            <p className="text-xs text-stone-500 mb-6">Define procedure specifications, duration, and price.</p>

            <form onSubmit={handleSaveService} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1.5 font-mono">Service Name</label>
                <input 
                  type="text" 
                  required
                  value={serviceFormData.name}
                  onChange={(e) => setServiceFormData({...serviceFormData, name: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:ring-1 focus:ring-stone-900 outline-none text-sm"
                  placeholder="e.g. Zirconia Ceramic Veneers"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1.5 font-mono">Description</label>
                <textarea 
                  value={serviceFormData.description}
                  onChange={(e) => setServiceFormData({...serviceFormData, description: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:ring-1 focus:ring-stone-900 outline-none text-sm h-24"
                  placeholder="Clinical procedure explanation..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1.5 font-mono">Price ($)</label>
                  <input 
                    type="number" 
                    required
                    value={serviceFormData.price}
                    onChange={(e) => setServiceFormData({...serviceFormData, price: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:ring-1 focus:ring-stone-900 outline-none text-sm"
                    placeholder="450"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1.5 font-mono">Duration (Min)</label>
                  <input 
                    type="number" 
                    required
                    value={serviceFormData.duration_minutes}
                    onChange={(e) => setServiceFormData({...serviceFormData, duration_minutes: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:ring-1 focus:ring-stone-900 outline-none text-sm"
                    placeholder="60"
                  />
                </div>
              </div>
              <div className="pt-4">
                <button 
                  type="submit"
                  className="w-full py-3.5 rounded-2xl bg-stone-900 text-white font-bold uppercase tracking-widest text-xs hover:bg-black transition-all shadow-lg cursor-pointer"
                >
                  {editingService ? 'Update Service' : 'Publish Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DOCTOR CRUD MODAL */}
      {isDoctorModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-stone-950/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl border border-stone-100 relative">
            <button 
              onClick={() => setIsDoctorModalOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-stone-100 text-stone-400 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-2xl font-serif-luxury font-bold text-stone-900 mb-1.5">
              {editingDoctor ? 'Edit specialist' : 'Add New Specialist'}
            </h3>
            <p className="text-xs text-stone-500 mb-6">Register a professional dental practitioner to the clinic.</p>

            <form onSubmit={handleSaveDoctor} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1.5 font-mono">Doctor Name</label>
                <input 
                  type="text" 
                  required
                  value={doctorFormData.name}
                  onChange={(e) => setDoctorFormData({...doctorFormData, name: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:ring-1 focus:ring-stone-900 outline-none text-sm"
                  placeholder="e.g. Dr. Alexander Sterling"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1.5 font-mono">Specialty</label>
                  <input 
                    type="text" 
                    required
                    value={doctorFormData.specialty}
                    onChange={(e) => setDoctorFormData({...doctorFormData, specialty: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:ring-1 focus:ring-stone-900 outline-none text-sm"
                    placeholder="e.g. Orthodontist"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1.5 font-mono">Exp (Years)</label>
                  <input 
                    type="number" 
                    required
                    value={doctorFormData.experience_years}
                    onChange={(e) => setDoctorFormData({...doctorFormData, experience_years: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:ring-1 focus:ring-stone-900 outline-none text-sm"
                    placeholder="10"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1.5 font-mono">Short Bio</label>
                <textarea 
                  required
                  value={doctorFormData.bio}
                  onChange={(e) => setDoctorFormData({...doctorFormData, bio: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:ring-1 focus:ring-stone-900 outline-none text-sm h-20"
                  placeholder="Professional background and expertise..."
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1.5 font-mono">Availability</label>
                <input 
                  type="text" 
                  required
                  value={doctorFormData.availability}
                  onChange={(e) => setDoctorFormData({...doctorFormData, availability: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:ring-1 focus:ring-stone-900 outline-none text-sm"
                  placeholder="e.g. Mon - Fri (9 AM - 5 PM)"
                />
              </div>
              <div className="pt-4">
                <button 
                  type="submit"
                  className="w-full py-3.5 rounded-2xl bg-stone-900 text-white font-bold uppercase tracking-widest text-xs hover:bg-black transition-all shadow-lg cursor-pointer"
                >
                  {editingDoctor ? 'Update Specialist' : 'Register Specialist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK PATIENT CHECK-IN MODAL */}
      {isCheckinModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-stone-950/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl border border-stone-100 relative">
            <button 
              onClick={() => setIsCheckinModalOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-stone-100 text-stone-400 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                <UserCheck className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-serif-luxury font-bold text-stone-900">
                Log Patient Check-in
              </h3>
            </div>
            <p className="text-xs text-stone-500 mb-6">Record a patient arrival or completed visit into today's daily audit trail.</p>

            <form onSubmit={handleQuickCheckinSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1.5 font-mono">Patient Full Name</label>
                <input 
                  type="text" 
                  required
                  value={checkinForm.patient_name}
                  onChange={(e) => setCheckinForm({...checkinForm, patient_name: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:ring-1 focus:ring-stone-900 outline-none text-sm"
                  placeholder="e.g. Elena Rostova"
                  autoFocus
                />
              </div>

              {/* 🔥 2 TEXT INPUT BOXES FOR PHONE */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1.5 font-mono">Phone Number</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={checkinCountryCode} 
                    onChange={(e) => setCheckinCountryCode(e.target.value)} 
                    className="w-20 px-2 py-2.5 rounded-xl border border-stone-200 text-center text-sm font-mono focus:ring-1 focus:ring-stone-900 outline-none" 
                    placeholder="+1" 
                  />
                  <input 
                    type="text" 
                    value={checkinPhoneNumber} 
                    onChange={(e) => setCheckinPhoneNumber(e.target.value)} 
                    className="flex-1 px-4 py-2.5 rounded-xl border border-stone-200 text-sm font-mono focus:ring-1 focus:ring-stone-900 outline-none" 
                    placeholder="555 123 4567" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1.5 font-mono">Procedure / Treatment</label>
                <input 
                  type="text" 
                  value={checkinForm.service_name}
                  onChange={(e) => setCheckinForm({...checkinForm, service_name: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 focus:ring-1 focus:ring-stone-900 outline-none text-sm"
                  placeholder="e.g. Laser Teeth Whitening"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1.5 font-mono">Check-in Observations / Notes</label>
                <textarea 
                  value={checkinForm.details}
                  onChange={(e) => setCheckinForm({...checkinForm, details: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-1 focus:ring-stone-900 outline-none text-xs h-20"
                  placeholder="Patient checked in on time; shade guide A1 matched..."
                />
              </div>

              <div className="pt-2">
                <button 
                  type="submit"
                  className="w-full py-3.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold uppercase tracking-widest text-xs transition-all shadow-lg cursor-pointer"
                >
                  Commit Patient Visit to Daily Logs
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOM DELETE CONFIRMATION MODAL (Issue #4 Fix) */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-stone-950/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl p-8 shadow-2xl border border-stone-100 relative text-center">
            <div className="w-16 h-16 rounded-full bg-rose-100 border border-rose-200 flex items-center justify-center mx-auto mb-4 text-rose-600">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-serif-luxury font-bold text-stone-900 mb-2">
              Delete {deleteTarget.type === 'service' ? 'Service' : 'Doctor'}?
            </h3>
            <p className="text-xs text-stone-500 mb-6 leading-relaxed">
              Are you sure you want to remove <strong className="text-stone-800">"{deleteTarget.name}"</strong>? This action cannot be undone.
            </p>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={executeDelete}
                className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp QR & Device Session Modal */}
      <WhatsAppQrModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        onStatusChange={handleWhatsAppStatusChange}
      />

    </div>
  );
};
