import path from 'path';
import fs from 'fs';
import pkg from 'whatsapp-web.js';
import QRCode from 'qrcode';

const { Client, LocalAuth } = pkg as any;

export type WhatsAppWebStatus = 'DISCONNECTED' | 'INITIALIZING' | 'SCANNING_QR' | 'AUTHENTICATING' | 'CONNECTED';

export interface WhatsAppDeviceInfo {
  phone: string;
  pushName: string;
  platform: string;
  linkedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// In-Memory State for Real WhatsApp Web Session
// ─────────────────────────────────────────────────────────────────────────────
let client: any = null;
let currentQR: string | null = null;
let rawQrCode: string | null = null;
let connectionStatus: WhatsAppWebStatus = 'DISCONNECTED';
let connectedDeviceInfo: WhatsAppDeviceInfo | null = null;
let isInitializing = false;
let qrGeneratedAt: number = 0;
const AUTH_DATA_PATH = path.resolve('./.wwebjs_auth');

let initializationPromise: Promise<{ status: WhatsAppWebStatus; qr: string | null }> | null = null;
const CLIENT_INIT_TIMEOUT_MS = parseInt(process.env.WHATSAPP_INIT_TIMEOUT_MS || '120000', 10);
const FORCE_CLEAN_LOCK = process.env.WHATSAPP_FORCE_CLEAN_LOCK === 'true';
let shutdownHooksRegistered = false;

function logWhatsAppWebEvent(title: string, details: Record<string, any>) {
  const timestamp = new Date().toISOString();
  console.log('\n╔════════════════════════════════════════════════════════════════════════════════╗');
  console.log(`║ 📲 [WHATSAPP-WEB.JS] ${title.padEnd(58)} ║`);
  console.log('╠════════════════════════════════════════════════════════════════════════════════╣');
  console.log(`🕒 Timestamp        : ${timestamp}`);
  for (const [key, value] of Object.entries(details)) {
    const keyLabel = String(key).padEnd(16);
    console.log(`🔹 ${keyLabel}: ${value}`);
  }
  console.log('╚════════════════════════════════════════════════════════════════════════════════╝\n');
}

function isFileLockError(err: any): boolean {
  const msg = String(err?.message || err || '').toUpperCase();
  return (
    msg.includes('EPERM') || msg.includes('EBUSY') || msg.includes('EACCES') ||
    msg.includes('LOCKFILE') || msg.includes('SINGLETONLOCK') ||
    msg.includes('PROFILE APPEARS TO BE IN USE') || msg.includes('TARGET CLOSED') || msg.includes('PROTOCOL ERROR')
  );
}

function cleanupStaleLockArtifacts(): void {
  if (!FORCE_CLEAN_LOCK) return;
  if (!fs.existsSync(AUTH_DATA_PATH)) return;
  console.warn('🧹 [WHATSAPP-WEB.JS] WHATSAPP_FORCE_CLEAN_LOCK=true — scanning for stale locks...');
  const lockNames = new Set(['SingletonLock', 'SingletonCookie', 'SingletonSocket']);
  try {
    const walk = (dir: string) => {
      let entries: fs.Dirent[];
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) { walk(full); }
        else if (lockNames.has(entry.name)) {
          try { fs.unlinkSync(full); console.log(`🧹 Removed stale lock: ${full}`); } 
          catch (e: any) { console.warn(`⚠️ Could not remove lock ${full}: ${e?.message || e}`); }
        }
      }
    };
    walk(AUTH_DATA_PATH);
  } catch (e: any) { console.warn(`⚠️ Lock cleanup scan failed: ${e?.message || e}`); }
}

async function safeDestroyClient(): Promise<void> {
  if (!client) return;
  try {
    // 🔥 FIX: Remove all event listeners to prevent memory leaks and dangling handlers
    if (typeof client.removeAllListeners === 'function') {
      client.removeAllListeners();
    }
    await Promise.race([
      client.destroy(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('destroy timeout')), 5000)),
    ]);
    console.log('✅ [WHATSAPP-WEB.JS] Previous client instance destroyed cleanly');
  } catch (e: any) { 
    console.warn(`⚠️ [WHATSAPP-WEB.JS] destroy() did not complete cleanly: ${e?.message || e}`); 
  }
  client = null;
}

function buildChatId(recipientPhone: string, isGroup = false): string {
  if (!recipientPhone || typeof recipientPhone !== 'string') throw new Error('Recipient phone required');
  const trimmed = recipientPhone.trim();
  if (!trimmed) throw new Error('Recipient phone empty');
  if (trimmed.includes('@c.us') || trimmed.includes('@g.us')) return trimmed;
  if (isGroup) {
    const groupPart = trimmed.split('@')[0].replace(/\D/g, '');
    if (!groupPart || groupPart.length < 8) throw new Error(`Invalid group ID: "${recipientPhone}"`);
    return `${groupPart}@g.us`;
  }
  const cleanDigits = trimmed.replace(/\D/g, '');
  if (cleanDigits.length < 8 || cleanDigits.length > 15) throw new Error(`Invalid recipient phone: "${recipientPhone}"`);
  return `${cleanDigits}@c.us`;
}

function resolveChromeExecutablePath(): string | undefined {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  if (process.env.PUPPETEER_EXECUTABLE_PATH && fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) return process.env.PUPPETEER_EXECUTABLE_PATH;

  if (process.platform === 'win32') {
    const winPaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Google\\Chrome\\Application\\chrome.exe') : '',
      process.env.PROGRAMFILES ? path.join(process.env.PROGRAMFILES, 'Google\\Chrome\\Application\\chrome.exe') : '',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    ].filter(Boolean);
    for (const p of winPaths) if (fs.existsSync(p)) return p;
  }

  const unixPaths = ['/usr/bin/google-chrome-stable','/usr/bin/google-chrome','/usr/bin/chromium-browser','/usr/bin/chromium','/snap/bin/chromium'];
  for (const p of unixPaths) if (fs.existsSync(p)) return p;
  return undefined;
}

export async function initializeWhatsAppClient(): Promise<{ status: WhatsAppWebStatus; qr: string | null }> {
  if (connectionStatus === 'CONNECTED' && client) return { status: connectionStatus, qr: null };
  if ((connectionStatus === 'SCANNING_QR' || connectionStatus === 'AUTHENTICATING') && client) {
    return { status: connectionStatus, qr: currentQR };
  }
  
  // 🔥 FIX: Return active initialization promise securely if already running
  if (isInitializing && initializationPromise) return initializationPromise;

  isInitializing = true;
  connectionStatus = 'INITIALIZING';

  initializationPromise = (async (): Promise<{ status: WhatsAppWebStatus; qr: string | null }> => {
    try {
      if (!fs.existsSync(AUTH_DATA_PATH)) fs.mkdirSync(AUTH_DATA_PATH, { recursive: true });
      cleanupStaleLockArtifacts();
      await safeDestroyClient();

      const chromeExecutable = resolveChromeExecutablePath();

      logWhatsAppWebEvent('INITIALIZING CLIENT INSTANCE', {
        'Auth Strategy': 'LocalAuth (Persistent ./.wwebjs_auth)',
        'Engine': chromeExecutable ? `System Chrome (${chromeExecutable})` : 'Headless Chrome',
        'Timeout': `${CLIENT_INIT_TIMEOUT_MS}ms`,
      });

      client = new Client({
        authStrategy: new LocalAuth({ dataPath: AUTH_DATA_PATH, clientId: 'puredentist-admin-session' }),
        // 🔥 FUTURE-PROOF FIX: Use 'local' so it dynamically fetches and caches the latest stable version automatically.
        // No hardcoded URLs to break in the future!
        webVersionCache: {
          type: 'local',
        },
        puppeteer: {
          headless: true,
          timeout: 120000,
          ...(chromeExecutable ? { executablePath: chromeExecutable } : {}),
          args: [
            '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas',
            '--no-first-run', '--no-zygote', '--disable-gpu',
            '--disable-blink-features=AutomationControlled',
            '--disable-features=IsolateOrigins,site-per-process',
            '--window-size=1280,800',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding'
          ],
        },
      });

      client.on('qr', async (qr: string) => {
        rawQrCode = qr;
        qrGeneratedAt = Date.now();
        connectionStatus = 'SCANNING_QR';
        try {
          currentQR = await QRCode.toDataURL(qr, { width: 320, margin: 2, color: { dark: '#064e3b', light: '#ffffff' } });
          logWhatsAppWebEvent('LIVE PAIRING QR CODE GENERATED', { 'QR Length': `${qr.length} chars`, 'Status': 'Awaiting mobile device scan' });
        } catch (qrErr: any) { 
          console.error('❌ [WHATSAPP-WEB.JS] Failed to convert QR to DataURL:', qrErr);
          currentQR = null;
        }
      });

      client.on('authenticated', () => {
        connectionStatus = 'AUTHENTICATING';
        currentQR = null;
        logWhatsAppWebEvent('SESSION AUTHENTICATION SUCCESS', { 'Auth Status': 'Validated. Waiting for ready...' });
      });

      client.on('change_state', (state: any) => {
        console.log(`🔄 [WHATSAPP-WEB.JS] State changed: ${state}`);
      });

      client.on('ready', async () => {
        connectionStatus = 'CONNECTED';
        currentQR = null;
        rawQrCode = null;
        isInitializing = false;
        const userPhone = client.info?.wid?.user || 'Active Verified Number';
        connectedDeviceInfo = {
          phone: userPhone,
          pushName: client.info?.pushname || 'PureDent Clinical Line',
          platform: client.info?.platform || 'WhatsApp Web',
          linkedAt: new Date().toISOString()
        };
        logWhatsAppWebEvent('CLIENT READY - CONNECTED TO WHATSAPP WEB', { 'Phone Number': `+${userPhone}`, 'Status': 'ONLINE & READY' });
      });

      client.on('auth_failure', (msg: string) => {
        connectionStatus = 'DISCONNECTED'; currentQR = null; isInitializing = false;
        logWhatsAppWebEvent('AUTHENTICATION FAILURE', { 'Failure Reason': msg });
      });

      client.on('disconnected', (reason: string) => {
        connectionStatus = 'DISCONNECTED'; currentQR = null; connectedDeviceInfo = null; isInitializing = false;
        logWhatsAppWebEvent('SESSION DISCONNECTED / LOGGED OUT', { 'Reason': reason });
      });

      client.on('error', (err: any) => {
        console.error('❌ [WHATSAPP-WEB.JS] Internal client error event:', err?.message || err);
      });

      await Promise.race([
        client.initialize(),
        new Promise((_, reject) => setTimeout(() => reject(new Error(`Initialization timed out after ${CLIENT_INIT_TIMEOUT_MS}ms`)), CLIENT_INIT_TIMEOUT_MS))
      ]);

      return { status: connectionStatus, qr: currentQR };
    } catch (err: any) {
      await safeDestroyClient();
      connectionStatus = 'DISCONNECTED';
      currentQR = null;
      if (isFileLockError(err)) {
        console.error('\n🚨 FILE LOCK CONFLICT DETECTED (EPERM / EBUSY)\n👉 Fix: Close stray chrome.exe processes and delete ./.wwebjs_auth folder\n');
      } else {
        console.error('❌ [WHATSAPP-WEB.JS] Client initialization error:', err?.message || err);
      }
      return { status: 'DISCONNECTED', qr: null };
    } finally {
      isInitializing = false;
      initializationPromise = null;
    }
  })();

  return initializationPromise;
}

export function getWhatsAppStatus() {
  return {
    connected: connectionStatus === 'CONNECTED',
    status: connectionStatus,
    device: connectedDeviceInfo,
    hasQr: Boolean(currentQR),
    qrGeneratedAt: qrGeneratedAt ? new Date(qrGeneratedAt).toISOString() : null,
    isInitializing,
  };
}

export function getLiveQrCode() {
  return {
    qr: currentQR,
    status: connectionStatus,
    connected: connectionStatus === 'CONNECTED',
    device: connectedDeviceInfo,
    isInitializing,
  };
}

export async function disconnectWhatsAppClient(options: { force?: boolean } = {}): Promise<{ success: boolean; status: WhatsAppWebStatus }> {
  try {
    if (initializationPromise && !options.force) {
      try { await Promise.race([initializationPromise, new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 10000))]); } catch {}
    }
    await safeDestroyClient();
    connectionStatus = 'DISCONNECTED'; currentQR = null; rawQrCode = null; connectedDeviceInfo = null; isInitializing = false; initializationPromise = null;
    if (fs.existsSync(AUTH_DATA_PATH)) {
      try { fs.rmSync(AUTH_DATA_PATH, { recursive: true, force: true }); } catch (rmErr: any) { console.warn(`⚠️ Could not remove auth files: ${rmErr?.message || rmErr}`); }
    }
    return { success: true, status: 'DISCONNECTED' };
  } catch (err: any) { return { success: false, status: connectionStatus }; }
}

export async function sendWhatsAppWebMessage(recipientPhone: string, messageBody: string, options: { isGroup?: boolean } = {}): Promise<{ success: boolean; messageId?: string; statusCode: number; error?: string; }> {
  if (connectionStatus !== 'CONNECTED' || !client) return { success: false, statusCode: 503, error: 'WhatsApp not connected.' };
  let chatId: string;
  try { chatId = buildChatId(recipientPhone, options.isGroup); } catch (e: any) { return { success: false, statusCode: 400, error: e?.message }; }
  if (!messageBody || messageBody.trim().length === 0) return { success: false, statusCode: 400, error: 'Message body empty.' };
  try {
    const sentMessage = await client.sendMessage(chatId, messageBody);
    return { success: true, messageId: sentMessage?.id?._serialized || sentMessage?.id?.id || `wamid_${Date.now()}`, statusCode: 200 };
  } catch (err: any) { return { success: false, statusCode: 500, error: err?.message || 'Dispatch failed' }; }
}

function registerShutdownHooks(): void {
  if (shutdownHooksRegistered) return;
  shutdownHooksRegistered = true;
  const handleSignal = (signal: 'SIGINT' | 'SIGTERM') => async () => {
    await disconnectWhatsAppClient({ force: true });
    if (process.listenerCount(signal) <= 1) process.exit(0);
  };
  process.once('SIGINT', handleSignal('SIGINT'));
  process.once('SIGTERM', handleSignal('SIGTERM'));
}
registerShutdownHooks();
