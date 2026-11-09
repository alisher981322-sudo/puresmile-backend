import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  QrCode, Smartphone, RefreshCw, Power, CheckCircle2, AlertCircle,
  ShieldCheck, X, Laptop, BatteryCharging,
} from 'lucide-react';

interface ConnectedDeviceInfo {
  phone: string;
  pushName: string;
  platform: string;
  linkedAt: string;
  batteryLevel?: number;
  isCharging?: boolean;
}

// 🔥 Added AUTHENTICATING state
type UiStatus = 'DISCONNECTED' | 'INITIALIZING' | 'SCANNING_QR' | 'AUTHENTICATING' | 'CONNECTED';

interface WhatsAppQrSessionData {
  status: UiStatus;
  qrCode: string | null;
  expiresIn: number;
  connectedDevice: ConnectedDeviceInfo | null;
}

interface WhatsAppQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (status: UiStatus) => void;
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('adminToken');
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

function mapBackendStatus(backendStatus: string): UiStatus {
  switch (backendStatus) {
    case 'connected': return 'CONNECTED';
    case 'qr_ready': return 'SCANNING_QR';
    case 'authenticating': return 'AUTHENTICATING';
    case 'initializing': return 'INITIALIZING';
    case 'init_failed':
    default: return 'DISCONNECTED';
  }
}

export const WhatsAppQrModal: React.FC<WhatsAppQrModalProps> = ({ isOpen, onClose, onStatusChange }) => {
  const [sessionData, setSessionData] = useState<WhatsAppQrSessionData>({
    status: 'DISCONNECTED', qrCode: null, expiresIn: 0, connectedDevice: null,
  });
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const applyResponse = useCallback((json: any) => {
    if (!json) return;
    const backendStatus = String(json.status || 'initializing');
    const uiStatus = mapBackendStatus(backendStatus);
    const qr = json.qr || json.data?.qrCode || null;
    const device = json.device || json.data?.connectedDevice || null;
    const expiresIn = json.expiresIn ?? json.data?.expiresIn ?? 60;

    // 🔥 FIX: Timer Reset Glitch. Only reset to 60 if a NEW QR code arrives.
    setSessionData((prev) => {
      const isNewQr = qr !== prev.qrCode && qr !== null;
      return {
        status: uiStatus,
        qrCode: qr,
        expiresIn: isNewQr ? 60 : prev.expiresIn,
        connectedDevice: device,
      };
    });

    if (uiStatus === 'CONNECTED') {
      setError(null); setSuccessToast('WhatsApp connected successfully.');
      setTimeout(() => setSuccessToast(null), 4000);
    }
    if (backendStatus === 'init_failed') setError('WhatsApp Web failed to start.');
    else if (uiStatus !== 'DISCONNECTED') setError(null);
    onStatusChange?.(uiStatus);
  }, [onStatusChange]);

  const fetchSnapshot = useCallback(async (opts: { waitMs?: number; silent?: boolean } = {}) => {
    const { waitMs = 0, silent = true } = opts;
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/whatsapp/qr?wait_ms=${waitMs}`, { headers: authHeaders() });
      if (res.status === 401 || res.status === 403) { setError('Session expired. Please log in again.'); return; }
      const json = await res.json().catch(() => null);
      if (!json) { setError('Invalid response.'); return; }
      if (res.status === 503) { applyResponse(json); setError(json?.message || 'WhatsApp failed.'); return; }
      applyResponse(json);
    } catch (err: any) { if (!silent) setError(err?.message || 'Failed to fetch status'); }
    finally { if (!silent) setLoading(false); }
  }, [applyResponse]);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    fetchSnapshot({ waitMs: 0, silent: false });
    const interval = setInterval(() => fetchSnapshot({ waitMs: 0, silent: true }), 3000);
    return () => clearInterval(interval);
  }, [isOpen, fetchSnapshot]);

  // Countdown
  useEffect(() => {
    if (sessionData.status !== 'SCANNING_QR' || !sessionData.qrCode) return;
    const tick = setInterval(() => {
      setSessionData((prev) => ({ ...prev, expiresIn: prev.expiresIn > 0 ? prev.expiresIn - 1 : 0 }));
    }, 1000);
    return () => clearInterval(tick);
  }, [sessionData.status, sessionData.qrCode]);

  const handleConnect = async () => {
    setActionLoading(true); setError(null);
    try { await fetchSnapshot({ waitMs: 25000, silent: true }); } finally { setActionLoading(false); }
  };

  const handleRefresh = async () => {
    setActionLoading(true); setError(null);
    try { await fetchSnapshot({ waitMs: 0, silent: true }); } finally { setActionLoading(false); }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect?')) return;
    setActionLoading(true); setError(null);
    try {
      const res = await fetch((import.meta.env.VITE_API_URL || '') + '/api/whatsapp/disconnect', { method: 'POST', headers: authHeaders() });
      if (res.status === 401 || res.status === 403) { setError('Session expired.'); return; }
      const json = await res.json().catch(() => null);
      if (json?.success) {
        setSessionData({ status: 'DISCONNECTED', qrCode: null, expiresIn: 0, connectedDevice: null });
        setSuccessToast('Disconnected.'); setTimeout(() => setSuccessToast(null), 4000);
        onStatusChange?.('DISCONNECTED');
      } else throw new Error(json?.error || 'Disconnect failed');
    } catch (err: any) { setError(err?.message); } finally { setActionLoading(false); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-stone-900 to-stone-950 px-6 py-5 text-white flex items-center justify-between border-b border-emerald-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-inner"><QrCode className="w-5 h-5" /></div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif-luxury text-lg font-bold tracking-wide">WhatsApp Device Sync</h3>
                {sessionData.status === 'CONNECTED' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>Connected</span>
                ) : sessionData.status === 'AUTHENTICATING' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/40"><span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse"></span>Logging In</span>
                ) : sessionData.status === 'SCANNING_QR' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>Scanning QR</span>
                ) : sessionData.status === 'INITIALIZING' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/40"><span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse"></span>Starting</span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-500/20 text-stone-300 border border-stone-500/40"><span className="w-1.5 h-1.5 rounded-full bg-stone-400"></span>Disconnected</span>
                )}
              </div>
              <p className="text-xs text-stone-300 mt-0.5">Link clinical WhatsApp Web for automated confirmations</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-stone-300 hover:text-white transition-colors cursor-pointer"><X className="w-4 h-4" /></button>
        </div>

        {/* Feedback */}
        {error && <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs text-red-700"><AlertCircle className="w-4 h-4 text-red-600 shrink-0" /><span className="flex-1">{error}</span></div>}
        {successToast && <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800"><CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /><span className="flex-1 font-medium">{successToast}</span></div>}

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[75vh] space-y-5">
          {/* CONNECTED */}
          {sessionData.status === 'CONNECTED' && sessionData.connectedDevice && (
            <div className="space-y-4">
              <div className="p-5 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/50 rounded-2xl border border-emerald-200/80 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md"><Smartphone className="w-6 h-6" /></div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-stone-900 text-sm">{sessionData.connectedDevice.pushName || 'PureDent Line'}</h4>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs"><CheckCircle2 className="w-4 h-4 text-emerald-600" />Connected</span>
                      </div>
                      <p className="text-xs text-stone-600 font-mono mt-0.5">+{sessionData.connectedDevice.phone}</p>
                    </div>
                  </div>
                  <div className="text-right"><div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-stone-200 text-[11px] font-medium text-stone-700 shadow-xs"><BatteryCharging className="w-3.5 h-3.5 text-emerald-600" /><span>{sessionData.connectedDevice.batteryLevel || 94}%</span></div></div>
                </div>
                <div className="mt-4 pt-4 border-t border-emerald-100 grid grid-cols-2 gap-3 text-xs">
                  <div><span className="text-stone-400 block text-[10px] uppercase font-bold tracking-wider">Host Platform</span><span className="text-stone-800 font-medium flex items-center gap-1 mt-0.5"><Laptop className="w-3.5 h-3.5 text-stone-500" />{sessionData.connectedDevice.platform || 'WhatsApp Web'}</span></div>
                  <div><span className="text-stone-400 block text-[10px] uppercase font-bold tracking-wider">Sync Established</span><span className="text-stone-800 font-medium mt-0.5 block">{new Date(sessionData.connectedDevice.linkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
                </div>
              </div>
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 text-xs text-stone-600 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-stone-800"><ShieldCheck className="w-4 h-4 text-emerald-600" /><span>Outbound Automation Active</span></div>
                <p className="text-stone-500 leading-relaxed text-[11px]">All patient messages will route through this session with anti-spam pacing.</p>
              </div>
              <button type="button" onClick={handleDisconnect} disabled={actionLoading} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50 shadow-xs"><Power className="w-3.5 h-3.5" /><span>Logout / Disconnect Session</span></button>
            </div>
          )}

          {/* SCANNING_QR */}
          {sessionData.status === 'SCANNING_QR' && (
            <div className="space-y-4 text-center">
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 flex flex-col items-center">
                <div className="relative p-3 bg-white rounded-2xl shadow-md border border-stone-200">
                  {sessionData.qrCode ? <img src={sessionData.qrCode} alt="WhatsApp Web QR Code" className="w-60 h-60 rounded-xl object-contain mx-auto transition-all" /> : <div className="w-60 h-60 rounded-xl bg-stone-100 flex flex-col items-center justify-center text-stone-400 gap-2"><RefreshCw className="w-8 h-8 animate-spin text-emerald-600" /><span className="text-xs">Generating secure pairing handshake...</span></div>}
                  {sessionData.expiresIn <= 10 && sessionData.expiresIn > 0 && (
                    <div className="absolute inset-0 bg-stone-900/70 backdrop-blur-xs rounded-2xl flex flex-col items-center justify-center text-white p-4">
                      <p className="text-xs font-semibold mb-2">QR code expiring soon</p>
                      <button onClick={handleRefresh} disabled={actionLoading} className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-xs font-bold transition-all cursor-pointer shadow-sm">Refresh Code</button>
                    </div>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs font-medium text-stone-600">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span><span>Scan now:</span>
                  <span className="font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">{sessionData.expiresIn}s</span>
                </div>
              </div>
              <div className="text-left bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-2 text-xs text-stone-600">
                <p className="font-bold text-stone-900 text-[11px] uppercase tracking-wider">How to Link WhatsApp:</p>
                <ol className="list-decimal list-inside space-y-1 text-stone-600 leading-relaxed text-[11px]">
                  <li>Open <strong>WhatsApp</strong> on your mobile phone</li>
                  <li>Tap <strong>Menu (⋮)</strong> on Android or <strong>Settings (⚙️)</strong> on iPhone</li>
                  <li>Select <strong>Linked Devices</strong> &rarr; <strong>Link a Device</strong></li>
                  <li>Point your camera at this QR code to capture and pair</li>
                </ol>
              </div>
              <div className="flex items-center gap-2.5 pt-1">
                <button type="button" onClick={handleRefresh} disabled={actionLoading} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 font-medium text-xs transition-colors cursor-pointer shadow-xs disabled:opacity-50"><RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? 'animate-spin' : ''}`} /><span>Refresh QR</span></button>
              </div>
            </div>
          )}

          {/* 🔥 AUTHENTICATING (NEW UI FIX) */}
          {sessionData.status === 'AUTHENTICATING' && (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-sky-50 border border-sky-200 flex items-center justify-center mx-auto text-sky-600 shadow-sm"><RefreshCw className="w-8 h-8 animate-spin" /></div>
              <div className="max-w-xs mx-auto space-y-1.5">
                <h4 className="font-serif-luxury text-base font-bold text-stone-900">Logging in to WhatsApp...</h4>
                <p className="text-xs text-stone-500 leading-relaxed">Device scanned successfully! Finalizing the secure handshake. This takes 5-10 seconds.</p>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-50 border border-sky-200 text-[11px] text-sky-700 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse"></span>Please wait…</div>
            </div>
          )}

          {/* INITIALIZING */}
          {sessionData.status === 'INITIALIZING' && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-sky-50 border border-sky-200 flex items-center justify-center mx-auto text-sky-600 shadow-sm"><RefreshCw className="w-8 h-8 animate-spin" /></div>
              <div className="max-w-xs mx-auto space-y-1.5">
                <h4 className="font-serif-luxury text-base font-bold text-stone-900">Starting WhatsApp Web Client</h4>
                <p className="text-xs text-stone-500 leading-relaxed">Launching headless Chrome and loading WhatsApp Web. This usually takes 10–20 seconds.</p>
              </div>
            </div>
          )}

          {/* DISCONNECTED */}
          {sessionData.status === 'DISCONNECTED' && (
            <div className="text-center py-4 space-y-5">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600 shadow-sm"><QrCode className="w-8 h-8" /></div>
              <div className="max-w-xs mx-auto space-y-1.5">
                <h4 className="font-serif-luxury text-base font-bold text-stone-900">No Active WhatsApp Web Session</h4>
                <p className="text-xs text-stone-500 leading-relaxed">Connect your clinic's mobile phone to send instant booking confirmations.</p>
              </div>
              <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200/60 text-left text-xs text-emerald-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold"><ShieldCheck className="w-4 h-4 text-emerald-700" /><span>Dual Hybrid Architecture</span></div>
                <p className="text-emerald-800/80 text-[11px] leading-relaxed">If Official Meta API is not configured, PureDentist routes dispatch via this linked Web session with rate limiting.</p>
              </div>
              <div className="flex flex-col gap-2 pt-2">
                <button type="button" onClick={handleConnect} disabled={actionLoading || loading} className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs tracking-wide transition-all shadow-md hover:shadow-lg cursor-pointer active:scale-98 disabled:opacity-50"><QrCode className="w-4 h-4" /><span>{actionLoading ? 'Connecting…' : '🔗 Connect WhatsApp'}</span></button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-stone-50 border-t border-stone-200 flex items-center justify-between text-[11px] text-stone-500">
          <span className="flex items-center gap-1.5 font-mono"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>PureDentist E.164 Engine</span>
          <button onClick={onClose} className="text-stone-600 hover:text-stone-900 font-semibold cursor-pointer">Close</button>
        </div>
      </div>
    </div>
  );
};
