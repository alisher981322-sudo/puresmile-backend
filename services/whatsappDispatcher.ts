import crypto from 'crypto';
import {
  getWhatsAppStatus as getWWebStatus,
  sendWhatsAppWebMessage,
  disconnectWhatsAppClient as disconnectRealWhatsAppClient,
} from './whatsappService.ts';

export type WhatsAppEngine = 'OFFICIAL_API' | 'PUPPETEER_FALLBACK';
export type WhatsAppSessionStatus = 'DISCONNECTED' | 'SCANNING_QR' | 'CONNECTED';

export interface ConnectedDeviceInfo {
  phone: string;
  pushName: string;
  platform: string;
  linkedAt: string;
  batteryLevel?: number;
  isCharging?: boolean;
}

export interface WhatsAppAppointmentPayload {
  appointmentId: number | string;
  patientName: string;
  patientPhone: string;
  serviceName: string;
  appointmentDate: string;
  timeSlot: string;
  clientIp?: string;
  adminActor?: string;
  customNotes?: string;
}

export interface DispatchResult {
  success: boolean;
  messageId?: string;
  engine: WhatsAppEngine;
  recipientPhone: string;
  normalizedPhone: string;
  delayAppliedMs: number;
  durationMs: number;
  statusCode: number;
  queueRemaining: number;
  error?: string;
  details?: any;
}

interface QueueItem {
  id: string;
  payload: WhatsAppAppointmentPayload;
  messageText: string;
  normalizedPhone: string;
  enqueuedAt: number;
  resolve: (result: DispatchResult) => void;
  reject: (err: any) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// In-Memory Queue State
// ─────────────────────────────────────────────────────────────────────────────
const messageQueue: QueueItem[] = [];
let isProcessingQueue = false;
let lastDispatchTimestamp = 0;
let totalMessagesDispatched = 0;

/**
 * Normalizes any national/international phone string to E.164 digits format
 * e.g., "+92 300 1234567" -> "923001234567"
 * "03001234567" -> "923001234567" (Pakistan default if 11 digits starting with 0)
 * "+1 (310) 555-0192" -> "13105550192"
 */
export function normalizePhoneNumber(rawPhone: string): string {
  if (!rawPhone) return '';
  let digits = rawPhone.replace(/\D/g, '');

  // Local Pakistani numbers: 03001234567 -> 923001234567
  if (digits.length === 11 && digits.startsWith('03')) {
    digits = '92' + digits.slice(1);
  }

  // 10-digit US numbers without country code
  if (
    digits.length === 10 &&
    (digits.startsWith('2') ||
      digits.startsWith('3') ||
      digits.startsWith('4') ||
      digits.startsWith('5') ||
      digits.startsWith('6') ||
      digits.startsWith('7') ||
      digits.startsWith('8') ||
      digits.startsWith('9'))
  ) {
    digits = '1' + digits;
  }

  return digits;
}

/**
 * Determines which engine to use for dispatching.
 * Official Meta Cloud API is preferred if credentials exist,
 * otherwise falls back to whatsapp-web.js (browser automation).
 */
export function getWhatsAppEngine(): WhatsAppEngine {
  if (process.env.WHATSAPP_MODE_OVERRIDE === 'PUPPETEER_FALLBACK') {
    return 'PUPPETEER_FALLBACK';
  }

  if (process.env.WHATSAPP_MODE_OVERRIDE === 'OFFICIAL_API') {
    // ⚠️ Warn if override is set without credentials — Cloud API will fail at send time
    const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
    const phoneId = process.env.WHATSAPP_PHONE_ID?.trim();
    if (!token || !phoneId) {
      console.warn(
        '⚠️ [WHATSAPP DISPATCHER] WHATSAPP_MODE_OVERRIDE=OFFICIAL_API but credentials are missing. ' +
          'Messages will fail. Unset the override or provide WHATSAPP_ACCESS_TOKEN + WHATSAPP_PHONE_ID.'
      );
    }
    return 'OFFICIAL_API';
  }

  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneId = process.env.WHATSAPP_PHONE_ID?.trim();

  if (
    token &&
    phoneId &&
    token !== 'your-meta-whatsapp-access-token' &&
    phoneId !== 'your-meta-phone-number-id'
  ) {
    return 'OFFICIAL_API';
  }

  return 'PUPPETEER_FALLBACK';
}

/**
 * Composes professional clinical appointment confirmation copy
 */
export function composeAppointmentMessage(
  payload: WhatsAppAppointmentPayload
): string {
  const { appointmentId, patientName, serviceName, appointmentDate, timeSlot } =
    payload;

  // 🔥 DYNAMIC CLINIC WEBSITE URL (With Fallback)
  const clinicUrl = process.env.CLINIC_WEBSITE_URL || 'https://puresmileclinic.com';

  return (
    `🦷 *PUREDENT CLINIC - APPOINTMENT CONFIRMATION*\n\n` +
    `Dear *${patientName}*,\n\n` +
    `Your dental appointment has been *CONFIRMED* by our clinical administration.\n\n` +
    `📋 *Booking Details:*\n` +
    `• *Pass Ref:* #PS-${appointmentId}\n` +
    `• *Treatment:* ${serviceName}\n` +
    `• *Date:* ${appointmentDate}\n` +
    `• *Time Slot:* ${timeSlot}\n` +
    `• *Location:* PureDentist Luxury Care, 450 Beverly Hills Medical Plaza, Suite 800\n\n` +
    `⚠️ *Patient Advisory:*\n` +
    `Please arrive 10 minutes prior to your scheduled slot for optical smile scanning and computerized sanitization.\n\n` +
    `Need to adjust your reservation? Reply to this message or visit our website at ${clinicUrl}.\n\n` +
    `_PureSmile Clinical Health Systems_`
  );
}

/**
 * Logs the prominent Meta WhatsApp Ban Risk Warning required when operating
 * in browser-automation mode.
 */
function logBanRiskAdvisory(normalizedPhone: string, queuePosition: number) {
  console.log(
    '\n╔════════════════════════════════════════════════════════════════════════════════╗'
  );
  console.log(
    '║ ⚠️  WHATSAPP BAN RISK & SECURITY ADVISORY (UNOFFICIAL AUTOMATION ENGINE)      ║'
  );
  console.log(
    '╠════════════════════════════════════════════════════════════════════════════════╣'
  );
  console.log(
    '║ [NOTICE] Official Meta Cloud API credentials are NOT detected in .env.         ║'
  );
  console.log(
    '║ Operating in: WHATSAPP-WEB.JS BROWSER AUTOMATION MODE                          ║'
  );
  console.log(
    '║                                                                                ║'
  );
  console.log(
    '║ 🚨 CRITICAL BAN RISK ALERT:                                                    ║'
  );
  console.log(
    '║ Outbound messaging via unverified WhatsApp Web automation carries an elevated  ║'
  );
  console.log(
    '║ risk of account flagging, rate-limit bans, and permanent phone number blocks.  ║'
  );
  console.log(
    '║                                                                                ║'
  );
  console.log(
    '║ 🛡️ Active Safeguards & Defense In Depth:                                       ║'
  );
  console.log(
    `║ • Rate Limiter: Pacing between 15s to 30s per outbound message                 ║`
  );
  console.log(
    `║ • Queue Position: #${queuePosition} in buffer                                         ║`
  );
  console.log(
    `║ • Target Recipient: +${normalizedPhone}                                            ║`
  );
  console.log(
    '║ • Production Recommendation: Register for Meta WhatsApp Cloud API credentials ║'
  );
  console.log(
    '╚════════════════════════════════════════════════════════════════════════════════╝\n'
  );
}

/**
 * Dispatch outbound message via Meta WhatsApp Cloud API (Graph API)
 */
async function dispatchViaOfficialCloudApi(
  normalizedPhone: string,
  messageText: string,
  payload: WhatsAppAppointmentPayload
): Promise<{
  success: boolean;
  statusCode: number;
  messageId?: string;
  error?: string;
  rawResponse?: any;
}> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim() || '';
  const phoneId = process.env.WHATSAPP_PHONE_ID?.trim() || '';
  const apiVersion = process.env.WHATSAPP_API_VERSION?.trim() || 'v19.0';
  const url = `https://graph.facebook.com/${apiVersion}/${phoneId}/messages`;

  const body = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: normalizedPhone,
    type: 'text',
    text: {
      preview_url: false,
      body: messageText,
    },
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data: any = await res.json().catch(() => ({}));

    if (res.ok && data?.messages && data.messages.length > 0) {
      return {
        success: true,
        statusCode: res.status,
        messageId: data.messages[0].id,
        rawResponse: data,
      };
    }

    const errorMessage =
      data?.error?.message || `HTTP ${res.status}: Cloud API error`;
    return {
      success: false,
      statusCode: res.status,
      error: errorMessage,
      rawResponse: data,
    };
  } catch (err: any) {
    return {
      success: false,
      statusCode: 500,
      error: err?.message || 'Network failure connecting to Meta Cloud API',
    };
  }
}

/**
 * Fallback Browser Automation Runner (whatsapp-web.js).
 * Delegates to the authenticated client in whatsappService.ts.
 * Returns a clear error if the client is not connected — never fakes success.
 */
async function dispatchViaPuppeteerFallback(
  normalizedPhone: string,
  messageText: string,
  payload: WhatsAppAppointmentPayload
): Promise<{
  success: boolean;
  statusCode: number;
  messageId: string;
  details?: any;
  error?: string;
}> {
  // 1. Check if real whatsapp-web.js client is connected and active
  const wwebStatus = getWWebStatus();
  if (wwebStatus.connected) {
    console.log(
      `🌐 [WHATSAPP-WEB.JS] Active authenticated client found! Dispatching message to ${normalizedPhone}@c.us...`
    );
    const sendResult = await sendWhatsAppWebMessage(normalizedPhone, messageText);
    if (sendResult.success) {
      return {
        success: true,
        statusCode: 200,
        messageId: sendResult.messageId || `wwebjs_${Date.now()}`,
        details: {
          driver: 'WHATSAPP_WEB_JS_AUTHENTICATED_LOCALAUTH_CLIENT',
          sessionDevice: wwebStatus.device,
          targetChatId: `${normalizedPhone}@c.us`,
        },
      };
    }
    return {
      success: false,
      statusCode: sendResult.statusCode || 500,
      messageId: '',
      error:
        sendResult.error || 'WhatsApp Web client failed to dispatch message',
    };
  }

  // Not connected — report real error, do NOT fake success
  return {
    success: false,
    statusCode: 503,
    messageId: '',
    error:
      'WhatsApp Web is not linked. Please open Admin Dashboard -> Connect WhatsApp and scan the live QR code with your mobile device first.',
  };
}

/**
 * Prints a comprehensive, formatted dispatch trace to the terminal.
 */
function logDispatcherExecution(
  item: QueueItem,
  engine: WhatsAppEngine,
  delayAppliedMs: number,
  durationMs: number,
  result: {
    success: boolean;
    statusCode: number;
    messageId?: string;
    error?: string;
    rawResponse?: any;
    details?: any;
  }
) {
  const timestampIso = new Date().toISOString();
  const origin = item.payload.clientIp || '127.0.0.1';
  const adminActor = item.payload.adminActor || 'Clinical Administrator';

  console.log(
    '\n╔════════════════════════════════════════════════════════════════════════════════╗'
  );
  console.log(
    `║ 📲 [WHATSAPP DISPATCHER] ${
      result.success ? 'MESSAGE SUCCESSFULLY SENT' : 'DISPATCH FAILED'
    }                      ║`
  );
  console.log(
    '╠════════════════════════════════════════════════════════════════════════════════╣'
  );
  console.log(`🕒 Timestamp          : ${timestampIso}`);
  console.log(`🌐 Client IP / Origin : ${origin} (PUT /api/appointments/:id)`);
  console.log(`👑 Admin Actor        : ${adminActor}`);
  console.log(`🆔 Appointment ID     : #${item.payload.appointmentId}`);
  console.log(`👤 Patient Name       : ${item.payload.patientName}`);
  console.log(
    `📱 Recipient Phone    : ${item.payload.patientPhone} (Normalized: +${item.normalizedPhone})`
  );
  console.log(`🦷 Clinical Procedure : ${item.payload.serviceName}`);
  console.log(
    `📅 Scheduled Slot     : ${item.payload.appointmentDate} at ${item.payload.timeSlot}`
  );
  console.log(
    `🚀 Dispatch Engine    : [${engine}] ${
      engine === 'OFFICIAL_API'
        ? '(Meta Graph API)'
        : '(whatsapp-web.js Browser Automation)'
    }`
  );
  console.log(
    `🛡️ Rate-Limit Status  : ENFORCED (Safe delay applied: ${(
      delayAppliedMs / 1000
    ).toFixed(1)}s)`
  );
  console.log(`⏱️ Execution Duration : ${durationMs}ms`);
  console.log(
    `📡 Response Status    : HTTP ${result.statusCode} ${
      result.success ? 'OK' : 'ERROR'
    }`
  );
  console.log(`🔑 Message Reference  : ${result.messageId || 'N/A'}`);

  if (result.error) {
    console.log(`🛑 Error Details      : ${result.error}`);
  }

  console.log(
    '----------------------------------------------------------------------------------'
  );
  console.log('💬 [DISPATCHED MESSAGE PAYLOAD]');
  console.log(item.messageText);
  console.log(
    '----------------------------------------------------------------------------------'
  );
  console.log(
    `✅ [SECURITY CHECK] Anti-Spam Cadence Active | Queue Remaining: ${messageQueue.length}`
  );
  console.log(
    '╚════════════════════════════════════════════════════════════════════════════════╝\n'
  );
}

/**
 * Worker that sequentially processes the message queue with safe delay/throttling
 * (random interval between 15-30 seconds) to mimic human behavior.
 */
async function processQueueWorker() {
  if (isProcessingQueue) return;
  isProcessingQueue = true;

  while (messageQueue.length > 0) {
    const item = messageQueue[0];
    const engine = getWhatsAppEngine();

    const isFastDev =
      process.env.WHATSAPP_FAST_QUEUE === 'true' ||
      process.env.NODE_ENV === 'test';
    const minDelay = isFastDev
      ? 1500
      : parseInt(process.env.WHATSAPP_DELAY_MIN_SEC || '15', 10) * 1000;
    const maxDelay = isFastDev
      ? 3000
      : parseInt(process.env.WHATSAPP_DELAY_MAX_SEC || '30', 10) * 1000;
    const randomThrottleMs =
      Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;

    const timeSinceLastDispatch = Date.now() - lastDispatchTimestamp;
    let requiredWait = 0;

    if (
      lastDispatchTimestamp > 0 &&
      timeSinceLastDispatch < randomThrottleMs
    ) {
      requiredWait = randomThrottleMs - timeSinceLastDispatch;
    } else if (lastDispatchTimestamp === 0 && !isFastDev) {
      // First message human jitter delay (1.2s - 2.5s)
      requiredWait = Math.floor(Math.random() * 1300) + 1200;
    }

    if (requiredWait > 0) {
      console.log(
        `⏳ [QUEUE THROTTLING] Pacing outbound message by ${(
          requiredWait / 1000
        ).toFixed(1)}s (Anti-Ban Human Cadence)...`
      );
      await new Promise((resolve) => setTimeout(resolve, requiredWait));
    }

    if (engine === 'PUPPETEER_FALLBACK') {
      logBanRiskAdvisory(item.normalizedPhone, messageQueue.length);
    }

    const executionStart = Date.now();
    let dispatchOutcome: any;

    try {
      if (engine === 'OFFICIAL_API') {
        dispatchOutcome = await dispatchViaOfficialCloudApi(
          item.normalizedPhone,
          item.messageText,
          item.payload
        );
      } else {
        dispatchOutcome = await dispatchViaPuppeteerFallback(
          item.normalizedPhone,
          item.messageText,
          item.payload
        );
      }
    } catch (unexpectedErr: any) {
      dispatchOutcome = {
        success: false,
        statusCode: 500,
        error: unexpectedErr?.message || 'Unexpected dispatcher exception',
      };
    }

    const executionDuration = Date.now() - executionStart;
    lastDispatchTimestamp = Date.now();
    totalMessagesDispatched++;

    messageQueue.shift();

    const dispatchResult: DispatchResult = {
      success: dispatchOutcome.success,
      messageId: dispatchOutcome.messageId,
      engine,
      recipientPhone: item.payload.patientPhone,
      normalizedPhone: item.normalizedPhone,
      delayAppliedMs: requiredWait,
      durationMs: executionDuration,
      statusCode: dispatchOutcome.statusCode,
      queueRemaining: messageQueue.length,
      error: dispatchOutcome.error,
      details: dispatchOutcome.details || dispatchOutcome.rawResponse,
    };

    logDispatcherExecution(
      item,
      engine,
      requiredWait,
      executionDuration,
      dispatchOutcome
    );

    item.resolve(dispatchResult);
  }

  isProcessingQueue = false;
}

/**
 * Public method to queue an appointment confirmation for WhatsApp dispatch.
 * Returns a promise that resolves when the message has been dispatched
 * through the rate-limited queue.
 */
export function queueWhatsAppAppointmentConfirmation(
  payload: WhatsAppAppointmentPayload
): Promise<DispatchResult> {
  const normalizedPhone = normalizePhoneNumber(payload.patientPhone);
  const messageText = composeAppointmentMessage(payload);
  const queueId = `wa_msg_${Date.now()}_${crypto
    .randomBytes(4)
    .toString('hex')}`;

  console.log(
    `📥 [WHATSAPP QUEUE] Enqueued confirmation for Patient: "${payload.patientName}" (Phone: ${payload.patientPhone} -> +${normalizedPhone}). Queue depth: ${messageQueue.length + 1}`
  );

  return new Promise<DispatchResult>((resolve, reject) => {
    const queueItem: QueueItem = {
      id: queueId,
      payload,
      messageText,
      normalizedPhone,
      enqueuedAt: Date.now(),
      resolve,
      reject,
    };

    messageQueue.push(queueItem);

    processQueueWorker().catch((err) => {
      console.error('🔥 [QUEUE WORKER ERROR]', err);
    });
  });
}

/**
 * Returns current metrics and operational health of the WhatsApp Dispatcher.
 */
export function getWhatsAppDispatcherStatus() {
  const engine = getWhatsAppEngine();
  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim() || '';
  const phoneId = process.env.WHATSAPP_PHONE_ID?.trim() || '';
  const wweb = getWWebStatus();

  return {
    status: 'active',
    engine,
    officialApiConfigured: Boolean(
      token && phoneId && token !== 'your-meta-whatsapp-access-token'
    ),
    metaPhoneId: phoneId
      ? `${phoneId.slice(0, 4)}...${phoneId.slice(-4)}`
      : null,
    connected: wweb.connected,
    sessionStatus: wweb.status,
    connectedDevice: wweb.device,
    hasActiveQr: Boolean(wweb.hasQr),
    isInitializing: wweb.isInitializing,
    queueLength: messageQueue.length,
    isProcessing: isProcessingQueue,
    totalDispatched: totalMessagesDispatched,
    lastDispatchTimestamp: lastDispatchTimestamp
      ? new Date(lastDispatchTimestamp).toISOString()
      : null,
    safeDelayRangeSeconds: {
      min: parseInt(process.env.WHATSAPP_DELAY_MIN_SEC || '15', 10),
      max: parseInt(process.env.WHATSAPP_DELAY_MAX_SEC || '30', 10),
    },
  };
}

/**
 * Wrapper that delegates to the real WhatsApp Web client teardown.
 * Kept for backwards compatibility with callers that use this name.
 */
export async function disconnectWhatsAppSession(
  adminActor?: string,
  clientIp?: string
) {
  const timestampIso = new Date().toISOString();
  console.log(
    `🔌 [WHATSAPP DISPATCHER] Session disconnect initiated by ${
      adminActor || 'Admin'
    } (${clientIp || '127.0.0.1'}) at ${timestampIso}`
  );
  return disconnectRealWhatsAppClient({ force: false });
}
