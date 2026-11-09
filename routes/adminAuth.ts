import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { JWT_SECRET, authenticateToken, requireAdmin } from '../middleware/auth.js';
import { recordAuditLog } from './auditLogs.ts';

const router = express.Router();

// Pre-configured Admin Identity
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'alisher981322@gmail.com';
export const ADMIN_PHONE = process.env.ADMIN_PHONE || '+923001234567';
export const ADMIN_NAME = 'PureSmile Master Administrator';

// Default initial password: Admin@PureSmile2026!
let adminPasswordHash = bcrypt.hashSync(process.env.ADMIN_DEFAULT_PASSWORD || 'Admin@PureSmile2026!', 10);

// In-Memory Storage for OTP and Password Reset Tokens
interface OtpRecord {
  code: string;
  expiresAt: number;
  attempts: number;
}

interface ResetTokenRecord {
  token: string;
  expiresAt: number;
}

let activeOtp: OtpRecord | null = null;
let activeResetToken: ResetTokenRecord | null = null;

// Mask email for display in UI: e.g. alisher981322@gmail.com -> a*****2@gmail.com
function maskEmail(email: string): string {
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  const [user, domain] = parts;
  if (user.length <= 2) return `${user[0]}*@${domain}`;
  return `${user[0]}${'*'.repeat(Math.max(1, user.length - 2))}${user[user.length - 1]}@${domain}`;
}

// Nodemailer transport setup
async function sendAdminOtpEmail(targetEmail: string, otpCode: string): Promise<boolean> {
  try {
    let transporter: any;

    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    } else {
      // Create a test/stream account or transport for safe logging
      transporter = nodemailer.createTransport({
        streamTransport: true,
        newline: 'unix',
        buffer: true,
      });
    }

    const mailOptions = {
      from: `"PureSmile Clinic Security" <no-reply@puresmiledental.com>`,
      to: targetEmail,
      subject: `[PureSmile Security] Your Admin One-Time Passcode (OTP): ${otpCode}`,
      text: `Your PureSmile Clinic Administrator One-Time Passcode is: ${otpCode}\n\nThis verification code expires in 5 minutes.\nIf you did not request this code, please secure your clinic infrastructure immediately.\n\nPureSmile Dental Clinic, Beverly Hills, CA`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #0A0D12; color: #FFFFFF; border-radius: 16px; border: 1px solid #292524;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #F59E0B; margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 2px;">PUREDENT CLINIC</h1>
            <p style="color: #A8A29E; font-size: 11px; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px;">Precision Dental Security</p>
          </div>
          
          <div style="background: #141822; padding: 24px; border-radius: 12px; border: 1px solid #1F2937; text-align: center;">
            <p style="color: #D6D3D1; font-size: 14px; margin-bottom: 16px;">Here is your single-use Administrator verification code:</p>
            <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #FBBF24; padding: 12px; background: #0A0D12; border-radius: 8px; border: 1px dashed #D97706; display: inline-block;">
              ${otpCode}
            </div>
            <p style="color: #EF4444; font-size: 12px; margin-top: 16px; font-weight: bold;">⏱️ Valid for 5 minutes only.</p>
          </div>

          <p style="color: #78716C; font-size: 11px; margin-top: 24px; text-align: center;">
            Sent to <strong>${targetEmail}</strong> for administrator password management.<br/>
            If you did not initiate this request, contact our security officer immediately.
          </p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 [NODEMAILER] Email notification prepared successfully (MessageId: ${info.messageId || 'streamed'})`);
    return true;
  } catch (err: any) {
    console.warn(`⚠️ [NODEMAILER] Notice: Email transmission attempted with error:`, err?.message || err);
    console.warn(`ℹ️ [NODEMAILER] (The OTP was still logged to the server terminal above for local administrative testing).`);
    return false;
  }
}

/**
 * 1. POST /api/admin/login
 * Verifies admin password against hashed admin credential.
 * Issues signed JWT token with role: 'admin'.
 */
router.post('/login', async (req, res) => {
  const timestamp = new Date().toISOString();
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const { password } = req.body || {};
  const payloadSummary = {
    hasPassword: Boolean(password),
    passwordLength: typeof password === 'string' ? password.length : 0,
    type: typeof password,
  };

  console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
  console.log(`║ 📥 [INCOMING REQUEST] POST /api/admin/login                                    ║`);
  console.log('╠════════════════════════════════════════════════════════════════════════════════╣');
  console.log(`⏰ Timestamp        : ${timestamp}`);
  console.log(`🌐 Client IP        : ${clientIp}`);
  console.log(`📦 Payload Summary  : ${JSON.stringify(payloadSummary)}`);
  console.log(`🎯 Target Account   : ${ADMIN_NAME} <${ADMIN_EMAIL}>`);

  try {
    if (!password || typeof password !== 'string') {
      console.log(`❌ [LOGIN STATUS: FAILED] Password check failed: Empty or invalid password payload`);
      console.log('╚════════════════════════════════════════════════════════════════════════════════╝');
      return res.status(400).json({
        success: false,
        error: 'Password is required to authenticate as Admin.',
      });
    }

    // Compare password against stored hash
    const isMatch = await bcrypt.compare(password, adminPasswordHash);

    if (!isMatch) {
      console.log(`❌ [LOGIN STATUS: FAILED] Password check failed: Invalid admin password credential`);
      console.log('╚════════════════════════════════════════════════════════════════════════════════╝');
      return res.status(401).json({
        success: false,
        error: 'Invalid administrator password. Please check your credentials or reset your password.',
      });
    }

    // Construct admin payload
    const adminPayload = {
      id: 1,
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      phone: ADMIN_PHONE,
      role: 'admin',
      authenticatedVia: 'admin_portal_password',
      issuedAt: timestamp,
    };

    const token = jwt.sign(adminPayload, JWT_SECRET, { expiresIn: '24h' });

    // Record in Daily Audit Trail
    try {
      recordAuditLog({
        event_type: 'ADMIN_LOGIN',
        category: 'security',
        title: 'Administrator Logged In',
        details: `Master administrator authenticated via verified password and issued JWT session token.`,
        actor: `Admin (${ADMIN_EMAIL})`
      });
    } catch (auditErr) {
      console.warn('⚠️ Audit logging notice:', auditErr);
    }

    console.log(`✅ [LOGIN STATUS: SUCCESS] Password check passed! Signed JWT admin token issued.`);
    console.log(`👑 Admin Authorized : ${ADMIN_EMAIL} (Token expires in 24h)`);
    console.log('╚════════════════════════════════════════════════════════════════════════════════╝');

    return res.status(200).json({
      success: true,
      message: 'Administrator authentication successful.',
      token,
      user: adminPayload,
    });
  } catch (err: any) {
    console.error(`🚨 [LOGIN STATUS: ERROR] Unhandled exception during admin login:`, err?.message || err);
    if (err?.stack) console.error(err.stack);
    console.log('╚════════════════════════════════════════════════════════════════════════════════╝');
    return res.status(500).json({
      success: false,
      error: 'An internal error occurred during authentication.',
    });
  }
});

/**
 * 2. POST /api/admin/request-otp
 * Generates a 6-digit OTP code, sets a 5-minute expiration,
 * prints it visibly to CMD terminal, and dispatches via Nodemailer to ADMIN_EMAIL.
 */
router.post('/request-otp', async (req, res) => {
  const timestamp = new Date().toISOString();
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const { reason } = req.body || {};
  const payloadSummary = {
    reason: reason || 'admin_password_reset_request',
    clientProvidedEmail: req.body?.email || 'using_server_configured_admin',
  };

  console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
  console.log(`║ 📥 [INCOMING REQUEST] POST /api/admin/request-otp                              ║`);
  console.log('╠════════════════════════════════════════════════════════════════════════════════╣');
  console.log(`⏰ Timestamp        : ${timestamp}`);
  console.log(`🌐 Client IP        : ${clientIp}`);
  console.log(`📦 Payload Summary  : ${JSON.stringify(payloadSummary)}`);
  console.log(`👤 Target Admin     : ${ADMIN_NAME} <${ADMIN_EMAIL}>`);
  console.log(`📞 Admin Phone      : ${ADMIN_PHONE}`);

  try {
    // Generate 6-digit numeric OTP code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    // Store in memory
    activeOtp = {
      code,
      expiresAt,
      attempts: 0,
    };

    // Heavy Terminal Logging for Developer/Admin Visibility
    console.log('--------------------------------------------------------------------------------');
    console.log(`🔐 ADMIN OTP GENERATED: ${code} | Sent to: ${ADMIN_PHONE}`);
    console.log(`📧 Dispatched To Email: ${ADMIN_EMAIL}`);
    console.log(`⏱️ Expiration       : 5 minutes (${new Date(expiresAt).toLocaleTimeString()})`);
    console.log(`🛡️ Rate Limit       : Maximum 5 verification attempts allowed`);
    console.log('--------------------------------------------------------------------------------');

    // Send via Nodemailer (asynchronous, non-blocking fallback)
    sendAdminOtpEmail(ADMIN_EMAIL, code).catch((err) => {
      console.error('🚨 [NODEMAILER ERROR] Background email dispatch failed:', err?.message || err);
    });

    console.log(`✅ [REQUEST-OTP STATUS: SUCCESS] OTP generated and dispatched successfully.`);
    console.log('╚════════════════════════════════════════════════════════════════════════════════╝');

    return res.status(200).json({
      success: true,
      message: `A 6-digit verification code has been dispatched to ${maskEmail(ADMIN_EMAIL)}. Check your inbox or CMD terminal console.`,
      emailMasked: maskEmail(ADMIN_EMAIL),
      phone: ADMIN_PHONE,
      expiresInSeconds: 300,
      devHint: process.env.NODE_ENV !== 'production' ? 'Code is visible in the server CMD terminal' : undefined,
    });
  } catch (err: any) {
    console.error(`🚨 [REQUEST-OTP STATUS: ERROR] Failed generating OTP:`, err?.message || err);
    if (err?.stack) console.error(err.stack);
    console.log('╚════════════════════════════════════════════════════════════════════════════════╝');
    return res.status(500).json({
      success: false,
      error: 'An internal error occurred while generating verification OTP.',
    });
  }
});

/**
 * 3. POST /api/admin/verify-otp
 * Validates the 6-digit OTP code.
 * Returns a temporary cryptographically signed resetToken valid for 15 minutes.
 */
router.post('/verify-otp', (req, res) => {
  const timestamp = new Date().toISOString();
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const { otp, code } = req.body || {};
  const submittedOtp = (otp || code || '').toString().trim();
  const payloadSummary = {
    codeReceived: submittedOtp ? `${submittedOtp.slice(0, 2)}****` : 'none',
    codeLength: submittedOtp.length,
    rawCodeForDev: process.env.NODE_ENV !== 'production' ? submittedOtp : undefined,
  };

  console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
  console.log(`║ 📥 [INCOMING REQUEST] POST /api/admin/verify-otp                               ║`);
  console.log('╠════════════════════════════════════════════════════════════════════════════════╣');
  console.log(`⏰ Timestamp        : ${timestamp}`);
  console.log(`🌐 Client IP        : ${clientIp}`);
  console.log(`📦 Payload Summary  : ${JSON.stringify(payloadSummary)}`);
  console.log(`🔢 Submitted Code   : "${submittedOtp}"`);

  try {
    if (!activeOtp) {
      console.log(`❌ [OTP VERIFY STATUS: FAILED] No active OTP session found or previous code expired`);
      console.log('╚════════════════════════════════════════════════════════════════════════════════╝');
      return res.status(400).json({
        success: false,
        error: 'No active OTP request found or previous code expired. Please request a new code.',
      });
    }

    // Check expiration
    if (Date.now() > activeOtp.expiresAt) {
      activeOtp = null;
      console.log(`❌ [OTP VERIFY STATUS: FAILED] OTP code has EXPIRED (exceeded 5-minute window).`);
      console.log('╚════════════════════════════════════════════════════════════════════════════════╝');
      return res.status(400).json({
        success: false,
        error: 'The verification code has expired (valid for 5 minutes). Please request a new one.',
      });
    }

    // Increment attempt counter to prevent brute-forcing
    activeOtp.attempts += 1;
    if (activeOtp.attempts > 5) {
      activeOtp = null;
      console.log(`❌ [OTP VERIFY STATUS: FAILED] Maximum verification attempts exceeded (5/5). OTP session invalidated.`);
      console.log('╚════════════════════════════════════════════════════════════════════════════════╝');
      return res.status(429).json({
        success: false,
        error: 'Maximum verification attempts exceeded. Please request a fresh OTP.',
      });
    }

    // Check match
    if (activeOtp.code !== submittedOtp) {
      const remainingAttempts = Math.max(0, 5 - activeOtp.attempts);
      console.log(`❌ [OTP VERIFY STATUS: FAILED] Code mismatch! Submitted: "${submittedOtp}" vs Expected: "${activeOtp.code}" | Remaining attempts: ${remainingAttempts}`);
      console.log('╚════════════════════════════════════════════════════════════════════════════════╝');
      return res.status(400).json({
        success: false,
        error: `Invalid verification code. Please check and try again (${remainingAttempts} attempts remaining).`,
      });
    }

    // OTP verified! Invalidate the OTP so it cannot be reused
    activeOtp = null;

    // Generate secure resetToken
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes to change password

    activeResetToken = {
      token: resetToken,
      expiresAt: resetTokenExpiresAt,
    };

    console.log(`✅ [OTP VERIFY STATUS: SUCCESS] OTP code matched successfully!`);
    console.log(`🎫 Temporary Reset Token Generated: ${resetToken.substring(0, 12)}... (valid 15 mins)`);
    console.log('╚════════════════════════════════════════════════════════════════════════════════╝');

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully. You may now set your new administrator password.',
      resetToken,
      expiresInSeconds: 900,
    });
  } catch (err: any) {
    console.error(`🚨 [OTP VERIFY STATUS: ERROR] Unhandled exception during OTP verification:`, err?.message || err);
    if (err?.stack) console.error(err.stack);
    console.log('╚════════════════════════════════════════════════════════════════════════════════╝');
    return res.status(500).json({
      success: false,
      error: 'An internal error occurred while verifying OTP.',
    });
  }
});

/**
 * 4. POST /api/admin/change-password
 * Accepts { resetToken, newPassword }.
 * Requires valid reset-token from Step 3.
 * Hashes new password and updates stored admin credential.
 */
router.post('/change-password', async (req, res) => {
  const timestamp = new Date().toISOString();
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const { resetToken, newPassword } = req.body || {};
  const payloadSummary = {
    hasResetToken: Boolean(resetToken),
    resetTokenPreview: typeof resetToken === 'string' ? `${resetToken.slice(0, 8)}...` : 'none',
    hasNewPassword: Boolean(newPassword),
    newPasswordLength: typeof newPassword === 'string' ? newPassword.length : 0,
  };

  console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
  console.log(`║ 📥 [INCOMING REQUEST] POST /api/admin/change-password                          ║`);
  console.log('╠════════════════════════════════════════════════════════════════════════════════╣');
  console.log(`⏰ Timestamp        : ${timestamp}`);
  console.log(`🌐 Client IP        : ${clientIp}`);
  console.log(`📦 Payload Summary  : ${JSON.stringify(payloadSummary)}`);

  try {
    if (!resetToken || typeof resetToken !== 'string') {
      console.log(`❌ [PASSWORD UPDATE STATUS: FAILED] Validation error: Missing resetToken in payload`);
      console.log('╚════════════════════════════════════════════════════════════════════════════════╝');
      return res.status(400).json({
        success: false,
        error: 'Security reset token is required. Please verify OTP first.',
      });
    }

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      console.log(`❌ [PASSWORD UPDATE STATUS: FAILED] Validation error: Password too short (< 6 chars) or invalid`);
      console.log('╚════════════════════════════════════════════════════════════════════════════════╝');
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 6 characters long.',
      });
    }

    if (!activeResetToken || activeResetToken.token !== resetToken) {
      console.log(`❌ [PASSWORD UPDATE STATUS: FAILED] Authorization error: Invalid or mismatched reset token`);
      console.log('╚════════════════════════════════════════════════════════════════════════════════╝');
      return res.status(403).json({
        success: false,
        error: 'Invalid or expired password reset session. Please request a new OTP.',
      });
    }

    if (Date.now() > activeResetToken.expiresAt) {
      activeResetToken = null;
      console.log(`❌ [PASSWORD UPDATE STATUS: FAILED] Authorization error: Reset token has expired (> 15 mins)`);
      console.log('╚════════════════════════════════════════════════════════════════════════════════╝');
      return res.status(403).json({
        success: false,
        error: 'Your password reset window has expired. Please verify OTP again.',
      });
    }

    // Hash new password using bcrypt
    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    // Update in-memory hash
    adminPasswordHash = newHash;

    // Invalidate reset token
    activeResetToken = null;

    // Record in Daily Audit Trail
    try {
      recordAuditLog({
        event_type: 'PASSWORD_CHANGE',
        category: 'security',
        title: 'Administrator Password Changed',
        details: `Master administrator password successfully changed after verified OTP challenge.`,
        actor: `Master Admin (${ADMIN_EMAIL})`
      });
    } catch (auditErr) {
      console.warn('⚠️ Audit logging notice:', auditErr);
    }

    console.log(`✅ [PASSWORD UPDATE STATUS: SUCCESS] Administrator password successfully changed!`);
    console.log(`🔒 New Credentials Active : ${ADMIN_EMAIL} can now log in with the updated password.`);
    console.log('╚════════════════════════════════════════════════════════════════════════════════╝');

    return res.status(200).json({
      success: true,
      message: 'Admin password changed successfully. You can now log in with your new password.',
    });
  } catch (err: any) {
    console.error(`🚨 [PASSWORD UPDATE STATUS: ERROR] Failed updating password:`, err?.message || err);
    if (err?.stack) console.error(err.stack);
    console.log('╚════════════════════════════════════════════════════════════════════════════════╝');
    return res.status(500).json({
      success: false,
      error: 'An internal error occurred while changing administrator password.',
    });
  }
});

/**
 * 5. GET /api/admin/info
 * Public/Safe endpoint to retrieve non-sensitive admin meta (masked email, clinic name)
 */
router.get('/info', (req, res) => {
  return res.status(200).json({
    success: true,
    clinicName: 'PureSmile Precision Clinic',
    adminEmailMasked: maskEmail(ADMIN_EMAIL),
    phone: ADMIN_PHONE,
  });
});

export default router;

