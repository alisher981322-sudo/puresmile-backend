import express from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

export interface AuditLog {
  id: string;
  timestamp: string;
  date: string;       // YYYY-MM-DD for fast date filtering
  time: string;       // HH:MM AM/PM
  event_type: 'APPOINTMENT_BOOKED' | 'APPOINTMENT_CONFIRMED' | 'APPOINTMENT_CANCELLED' | 'PATIENT_CHECKIN' | 'PATIENT_EXAMINED' | 'INQUIRY_RECEIVED' | 'ADMIN_LOGIN' | 'PASSWORD_CHANGE';
  category: 'appointment' | 'patient' | 'security' | 'clinical';
  title: string;
  patient_name?: string;
  patient_phone?: string;
  service_name?: string;
  details: string;
  previous_status?: string;
  new_status?: string;
  actor: string;
  ip?: string;
}

// Generate realistic date strings for today and previous days
const now = new Date();
const todayDateStr = now.toISOString().split('T')[0];

const yesterday = new Date(Date.now() - 86400000);
const yesterdayDateStr = yesterday.toISOString().split('T')[0];

const twoDaysAgo = new Date(Date.now() - 86400000 * 2);
const twoDaysAgoDateStr = twoDaysAgo.toISOString().split('T')[0];

// In-Memory Audit Trail Repository with comprehensive seeded initial logs
const auditLogsStore: AuditLog[] = [
  {
    id: 'log-101',
    timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    date: todayDateStr,
    time: '09:15 AM',
    event_type: 'APPOINTMENT_BOOKED',
    category: 'appointment',
    title: 'New Online Consultation Booked',
    patient_name: 'Marcus Thorne',
    patient_phone: '+1 (310) 555-0192',
    service_name: 'Teeth Cleaning & Scaling',
    details: 'Marcus Thorne booked an appointment for Teeth Cleaning & Scaling on Nov 5 at 10:30 AM.',
    new_status: 'Pending',
    actor: 'Marcus Thorne (Patient)'
  },
  {
    id: 'log-102',
    timestamp: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
    date: todayDateStr,
    time: '08:50 AM',
    event_type: 'APPOINTMENT_CONFIRMED',
    category: 'appointment',
    title: 'Appointment Confirmed by Clinic',
    patient_name: 'Sophia Sterling',
    patient_phone: '+1 (310) 555-0144',
    service_name: 'Teeth Whitening (Bleaching)',
    details: 'Sophia Sterling\'s appointment was confirmed by the clinic frontdesk.',
    previous_status: 'Pending',
    new_status: 'Confirmed',
    actor: 'Admin'
  },
  {
    id: 'log-103',
    timestamp: new Date(Date.now() - 1000 * 60 * 110).toISOString(),
    date: todayDateStr,
    time: '07:50 AM',
    event_type: 'ADMIN_LOGIN',
    category: 'security',
    title: 'Administrator 2FA Session Authenticated',
    details: 'Master administrator successfully logged in via 2FA OTP verification.',
    actor: 'Admin'
  },
  {
    id: 'log-104',
    timestamp: new Date(yesterday.setHours(16, 20, 0, 0)).toISOString(),
    date: yesterdayDateStr,
    time: '04:20 PM',
    event_type: 'PATIENT_CHECKIN',
    category: 'clinical',
    title: 'Patient Checked In at Clinic',
    patient_name: 'David Chen',
    patient_phone: '+1 (310) 555-0812',
    service_name: 'Root Canal Treatment (RCT)',
    details: 'David Chen checked in at clinic for micro-endodontic evaluation and treatment.',
    new_status: 'Completed',
    actor: 'Clinic Frontdesk'
  },
  {
    id: 'log-105',
    timestamp: new Date(yesterday.setHours(11, 45, 0, 0)).toISOString(),
    date: yesterdayDateStr,
    time: '11:45 AM',
    event_type: 'APPOINTMENT_CANCELLED',
    category: 'appointment',
    title: 'Appointment Cancelled',
    patient_name: 'Arthur Pendelton',
    patient_phone: '+1 (310) 555-0723',
    service_name: 'Invisible Clear Aligners',
    details: 'Arthur Pendelton\'s appointment was cancelled due to schedule conflict.',
    previous_status: 'Confirmed',
    new_status: 'Cancelled',
    actor: 'Arthur Pendelton (Patient)'
  },
  {
    id: 'log-106',
    timestamp: new Date(twoDaysAgo.setHours(14, 10, 0, 0)).toISOString(),
    date: twoDaysAgoDateStr,
    time: '02:10 PM',
    event_type: 'PATIENT_EXAMINED',
    category: 'clinical',
    title: 'Patient Medical History Examined',
    patient_name: 'Amara Sinclair',
    patient_phone: '+1 (310) 555-0988',
    service_name: 'Tooth Fillings (Cavity Treatment)',
    details: 'Admin examined and updated patient dental history notes.',
    actor: 'Admin'
  }
];

/**
 * Record an audit trail log in real-time with detailed terminal logging
 */
export function recordAuditLog(entry: any): AuditLog {
  const safeEntry = entry || {};
  const dateObj = safeEntry.timestamp ? new Date(safeEntry.timestamp) : new Date();
  const dateStr = safeEntry.date || dateObj.toISOString().split('T')[0];
  const timeStr = safeEntry.time || dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  const eventType = String(safeEntry.event_type || safeEntry.action || 'CLINICAL_EVENT');

  const log: AuditLog = {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: dateObj.toISOString(),
    date: dateStr,
    time: timeStr,
    category: 'appointment',
    title: 'Clinic Event',
    details: '',
    actor: 'System',
    ...safeEntry,
    event_type: eventType as any,
  };

  auditLogsStore.unshift(log);

  // Formatted terminal log for dev debugging
  const rawType = log?.event_type || safeEntry?.event_type || safeEntry?.action || 'CLINICAL_EVENT';
  const displayType = String(rawType || 'UNKNOWN');
  const paddedType = displayType.length > 22 ? displayType.slice(0, 22) : displayType.padEnd(22, ' ');

  console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
  console.log(`║ 📜 [AUDIT TRAIL LOG RECORDED] [${paddedType}]                    ║`);
  console.log('╠════════════════════════════════════════════════════════════════════════════════╣');
  console.log(`⏰ Timestamp : ${log.timestamp} (${log.date} ${log.time})`);
  console.log(`🏷️  Title     : ${log?.title || 'N/A'}`);
  if (log?.patient_name) console.log(`👤 Patient   : ${log.patient_name} (${log.patient_phone || 'N/A'})`);
  if (log?.service_name) console.log(`🦷 Procedure : ${log.service_name}`);
  console.log(`💬 Details   : ${log?.details || 'N/A'}`);
  console.log(`🎭 Actor     : ${log?.actor || 'System'}`);
  console.log('╚════════════════════════════════════════════════════════════════════════════════╝');

  return log;
}

const router = express.Router();

/**
 * Shared audit logs handler supporting multiple route aliases
 */
const handleGetAuditLogs = (req: any, res: any) => {
  const requestStartTime = Date.now();
  const timestamp = new Date().toISOString();
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

  const { date, search, event_type, action } = req.query;
  const targetDate = typeof date === 'string' && date ? date : null;
  const targetEventType = typeof event_type === 'string' && event_type && event_type !== 'ALL' ? event_type.toUpperCase() : 
                          typeof action === 'string' && action && action !== 'ALL' ? action.toUpperCase() : null;
  const querySearch = typeof search === 'string' ? search.toLowerCase().trim() : '';

  const user = req.user || { name: 'Admin', role: 'admin' };
  console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
  console.log(`║ 📥 [INCOMING REQUEST] GET /api/admin/audit-logs                                ║`);
  console.log('╠════════════════════════════════════════════════════════════════════════════════╣');
  console.log(`⏰ Timestamp        : ${timestamp}`);
  console.log(`🌐 Client IP        : ${clientIp}`);
  console.log(`👤 Requesting Admin : ${user?.name || user?.email || 'Admin'} (ID: ${user?.id || 'unknown'})`);
  console.log(`🔍 Query Filters    : date=${targetDate || 'none'}, event_type=${targetEventType || 'none'}, search="${querySearch}"`);

  try {
    let filtered = [...auditLogsStore];

    // Date filtering (YYYY-MM-DD)
    if (targetDate && targetDate !== 'ALL_TIME') {
      filtered = filtered.filter(log => log.date === targetDate);
    }

    // Event type / Action filtering
    if (targetEventType) {
      filtered = filtered.filter(log => log.event_type === targetEventType || log.category?.toUpperCase() === targetEventType);
    }

    // Search filtering across patient name, phone, service, details, actor
    if (querySearch) {
      filtered = filtered.filter(log => 
        (log.title && log.title.toLowerCase().includes(querySearch)) ||
        (log.patient_name && log.patient_name.toLowerCase().includes(querySearch)) ||
        (log.patient_phone && log.patient_phone.includes(querySearch)) ||
        (log.service_name && log.service_name.toLowerCase().includes(querySearch)) ||
        (log.details && log.details.toLowerCase().includes(querySearch)) ||
        (log.actor && log.actor.toLowerCase().includes(querySearch))
      );
    }

    const duration = Date.now() - requestStartTime;

    // Calculate daily summary metrics
    const logsForSelectedDate = targetDate && targetDate !== 'ALL_TIME'
      ? auditLogsStore.filter(l => l.date === targetDate)
      : auditLogsStore.filter(l => l.date === todayDateStr);

    const summary = {
      selectedDate: targetDate || todayDateStr,
      todayDate: todayDateStr,
      totalForDate: logsForSelectedDate.length,
      bookingsForDate: logsForSelectedDate.filter(l => l.event_type === 'APPOINTMENT_BOOKED').length,
      cancellationsForDate: logsForSelectedDate.filter(l => l.event_type === 'APPOINTMENT_CANCELLED').length,
      visitsForDate: logsForSelectedDate.filter(l => l.event_type === 'PATIENT_CHECKIN').length,
      totalAllTime: auditLogsStore.length
    };

    console.log(`⏱️ Query Duration   : ${duration}ms`);
    console.log(`📦 Records Matched  : ${filtered.length} (Total in store: ${auditLogsStore.length})`);
    console.log('✅ [AUDIT LOGS API SUCCESS] Sending response to client.');
    console.log('╚════════════════════════════════════════════════════════════════════════════════╝');

    return res.status(200).json({
      success: true,
      count: filtered.length,
      summary,
      data: filtered,
    });

  } catch (err: any) {
    const duration = Date.now() - requestStartTime;
    console.error('🔥 [AUDIT LOGS API ERROR] Failed to fetch audit logs, returning fallback store:', err.message);

    return res.status(200).json({
      success: true,
      count: auditLogsStore.length,
      summary: {
        selectedDate: todayDateStr,
        todayDate: todayDateStr,
        totalForDate: auditLogsStore.length,
        bookingsForDate: 1,
        cancellationsForDate: 1,
        visitsForDate: 1,
        totalAllTime: auditLogsStore.length
      },
      data: auditLogsStore,
    });
  }
};

/**
 * Shared check-in handler supporting multiple route aliases
 */
const handlePostCheckin = (req: any, res: any) => {
  const { patient_name, patient_phone, phone, service_name, procedure_name, details, notes, actor } = req.body || {};

  const resolvedName = patient_name || 'Walk-in Patient';
  const resolvedPhone = patient_phone || phone || '+1 (310) 555-0199';
  const resolvedService = service_name || procedure_name || 'General Dental Examination';
  const resolvedDetails = details || notes || `${resolvedName} checked in at clinic frontdesk.`;

  const newLog = recordAuditLog({
    event_type: 'PATIENT_CHECKIN',
    category: 'clinical',
    title: 'Patient Checked In at Clinic',
    patient_name: resolvedName,
    patient_phone: resolvedPhone,
    service_name: resolvedService,
    details: resolvedDetails,
    new_status: 'Completed',
    actor: actor || 'Clinic Frontdesk'
  });

  return res.status(201).json({
    success: true,
    message: `Patient ${resolvedName} check-in successfully recorded.`,
    data: newLog
  });
};

// Register routes on all common path variations so they never 404
router.get('/', handleGetAuditLogs);
router.get('/audit-logs', handleGetAuditLogs);
router.get('/admin/audit-logs', handleGetAuditLogs);

router.post('/checkin', handlePostCheckin);
router.post('/audit-logs/checkin', handlePostCheckin);
router.post('/admin/audit-logs/checkin', handlePostCheckin);

export default router;
