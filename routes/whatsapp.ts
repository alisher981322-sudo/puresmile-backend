import express from 'express';
import {
  getWhatsAppDispatcherStatus,
  queueWhatsAppAppointmentConfirmation,
  normalizePhoneNumber,
} from '../services/whatsappDispatcher.ts';
import {
  initializeWhatsAppClient,
  getWhatsAppStatus as getRealWhatsAppStatus,
  getLiveQrCode as getRealLiveQrCode,
  disconnectWhatsAppClient as disconnectRealWhatsAppClient,
} from '../services/whatsappService.ts';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();
const DEFAULT_WAIT_MS = parseInt(process.env.WHATSAPP_QR_WAIT_MS || '25000', 10);
const MAX_WAIT_MS = 60000;
const POLL_INTERVAL_MS = 500;

function resolveWaitMs(raw: any): number {
  const parsed = Number.parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed < 0) return DEFAULT_WAIT_MS;
  return Math.min(parsed, MAX_WAIT_MS);
}

function buildQrResponse(live: ReturnType<typeof getRealLiveQrCode>, mode: 'qr_ready' | 'connected' | 'initializing' | 'authenticating' | 'init_failed') {
  return {
    success: mode !== 'init_failed',
    status: mode,
    sessionStatus: live.status,
    connected: live.connected,
    isInitializing: live.isInitializing,
    qr: live.qr,
    device: live.device,
    expiresIn: 60,
    data: { qrCode: live.qr, status: mode, sessionStatus: live.status, connected: live.connected, connectedDevice: live.device, isInitializing: live.isInitializing, expiresIn: 60 },
  };
}

async function waitForQrOrConnection(waitMs: number): Promise<ReturnType<typeof buildQrResponse>> {
  const start = Date.now();
  while (true) {
    const live = getRealLiveQrCode();
    
    if (live.connected) return buildQrResponse(live, 'connected');
    // 🔥 FIX: Send back 'authenticating' if QR is scanned but ready event hasn't fired yet
    if (live.status === 'AUTHENTICATING') return buildQrResponse(live, 'authenticating'); 
    if (live.qr) return buildQrResponse(live, 'qr_ready');
    
    if (!live.isInitializing && live.status === 'DISCONNECTED') return buildQrResponse(live, 'init_failed');
    if (Date.now() - start >= waitMs) return buildQrResponse(live, 'initializing');
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

router.get('/whatsapp/status', authenticateToken, requireAdmin, (_req, res) => {
  try {
    const realStatus = getRealWhatsAppStatus();
    const dispatcherStatus = getWhatsAppDispatcherStatus();
    return res.status(200).json({
      success: true, connected: realStatus.connected, status: realStatus.status, device: realStatus.device,
      isInitializing: realStatus.isInitializing, hasQr: realStatus.hasQr, qrGeneratedAt: realStatus.qrGeneratedAt,
      data: { ...dispatcherStatus, sessionStatus: realStatus.status, status: realStatus.status, connected: realStatus.connected, connectedDevice: realStatus.device, isInitializing: realStatus.isInitializing },
    });
  } catch (err: any) { return res.status(500).json({ success: false, error: err?.message }); }
});

router.get('/whatsapp/qr', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const waitMs = resolveWaitMs(req.query.wait_ms);
    const before = getRealWhatsAppStatus();
    if (!before.connected && before.status === 'DISCONNECTED' && !before.isInitializing) {
      initializeWhatsAppClient().catch((err) => console.error('❌ Auto-init error:', err?.message || err));
    }
    const payload = await waitForQrOrConnection(waitMs);
    if (payload.status === 'init_failed') return res.status(503).json({ ...payload, success: false, message: 'WhatsApp Web client failed to start.' });
    return res.status(200).json(payload);
  } catch (err: any) { return res.status(500).json({ success: false, error: err?.message }); }
});

router.post('/whatsapp/connect', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const waitMs = resolveWaitMs(req.query.wait_ms ?? '0');
    initializeWhatsAppClient().catch((err) => console.error('❌ Init error:', err?.message || err));
    if (waitMs === 0) {
      const live = getRealLiveQrCode();
      const status = live.connected ? 'connected' : live.status === 'AUTHENTICATING' ? 'authenticating' : live.qr ? 'qr_ready' : live.isInitializing ? 'initializing' : 'init_failed';
      return res.status(200).json({ ...buildQrResponse(live, status as any), message: live.qr ? 'QR ready.' : 'Client starting.' });
    }
    const payload = await waitForQrOrConnection(waitMs);
    return res.status(200).json(payload);
  } catch (err: any) { return res.status(500).json({ success: false, error: err?.message }); }
});

router.post('/whatsapp/disconnect', authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    await disconnectRealWhatsAppClient({ force: false });
    return res.status(200).json({ success: true, connected: false, status: 'DISCONNECTED', message: 'Session destroyed.' });
  } catch (err: any) { return res.status(500).json({ success: false, error: err?.message }); }
});

router.post('/whatsapp/test-send', authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const { phone, patient_name, service_name, appointment_date, time_slot } = req.body || {};
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const adminActor = req.user?.name || req.user?.email || 'Administrator';

    if (!phone) return res.status(400).json({ success: false, error: 'Phone required.' });
    const normalized = normalizePhoneNumber(phone);
    if (!normalized || normalized.length < 8 || normalized.length > 15) return res.status(400).json({ success: false, error: 'Invalid phone.' });

    const payload = { appointmentId: Math.floor(100 + Math.random() * 900), patientName: patient_name || 'VIP Test Patient', patientPhone: phone, serviceName: service_name || 'Teeth Cleaning', appointmentDate: appointment_date || new Date().toISOString().split('T')[0], timeSlot: time_slot || '10:30 AM', clientIp: Array.isArray(clientIp) ? clientIp[0] : clientIp, adminActor };
    const queuePromise = queueWhatsAppAppointmentConfirmation(payload);
    
    if (req.query.wait === 'true') {
      const outcome = await queuePromise;
      return res.status(outcome.success ? 200 : 500).json({ success: outcome.success, data: outcome });
    }
    return res.status(202).json({ success: true, message: 'Enqueued.', data: { enqueued: true, recipient: payload.patientPhone, normalized } });
  } catch (err: any) { return res.status(500).json({ success: false, error: err?.message }); }
});

export default router;
