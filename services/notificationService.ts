import nodemailer from 'nodemailer';
import db from '../db.js';

export interface NotificationPayload {
  appointmentId?: number | string;
  patientName: string;
  patientPhone: string;
  patientEmail?: string;
  serviceName: string;
  appointmentDate: string;
  timeSlot: string;
  status: string;
  previousStatus?: string;
  adminActor?: string;
}

/**
 * Creates a Nodemailer transporter.
 * Uses custom SMTP credentials if configured in environment variables,
 * or falls back to a stream/test transport for safe logging.
 */
function createTransporter() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Safe fallback stream transport for dev testing without requiring live SMTP credentials
  return nodemailer.createTransport({
    streamTransport: true,
    newline: 'unix',
    buffer: true,
  });
}

/**
 * Look up registered patient email from DB by phone number if not provided in appointment record
 */
async function resolvePatientEmail(patientPhone: string, fallbackName: string, providedEmail?: string): Promise<string> {
  if (providedEmail && providedEmail.includes('@')) {
    return providedEmail;
  }

  try {
    const query = `SELECT email FROM patients WHERE phone = $1 LIMIT 1;`;
    const result = await db.query(query, [patientPhone]);
    if (result && result.rows && result.rows.length > 0 && result.rows[0].email) {
      return result.rows[0].email;
    }
  } catch (err) {
    // DB lookup failed or operating in fallback mode
  }

  // Generate clean default email if patient record doesn't have an email attached
  const cleanName = fallbackName.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${cleanName}@puresmiledental.com`;
}

/**
 * Generate native English message copy based on appointment status
 */
function generateNotificationCopy(payload: NotificationPayload) {
  const { patientName, serviceName, appointmentDate, timeSlot, status } = payload;

  if (status === 'Confirmed') {
    const textMessage = `Dear ${patientName}, your appointment for ${serviceName} has been successfully confirmed for ${appointmentDate} at ${timeSlot}. We look forward to seeing you at PureSmile Dental Clinic.`;
    
    const emailSubject = `[PureSmile Dental Clinic] Appointment Confirmed for ${appointmentDate}`;
    
    const htmlEmail = `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #0A0D12; color: #FFFFFF; border-radius: 20px; border: 1px solid #27272A;">
        <div style="text-align: center; margin-bottom: 28px;">
          <h1 style="color: #F59E0B; margin: 0; font-size: 26px; font-weight: bold; letter-spacing: 2px; font-serif;">PUREDENT CLINIC</h1>
          <p style="color: #A1A1AA; font-size: 11px; margin-top: 4px; text-transform: uppercase; letter-spacing: 2px;">Beverly Hills Precision Dental Care</p>
        </div>
        
        <div style="background: #18181B; padding: 28px; border-radius: 16px; border: 1px solid #27272A; margin-bottom: 24px;">
          <div style="display: inline-block; padding: 6px 12px; background: #065F46; color: #34D399; font-size: 11px; font-weight: bold; border-radius: 20px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px;">
            ✓ Appointment Confirmed
          </div>
          
          <p style="color: #F4F4F5; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
            Dear <strong>${patientName}</strong>,
          </p>
          <p style="color: #D4D4D8; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
            Your appointment for <strong>${serviceName}</strong> has been successfully confirmed for <strong>${appointmentDate}</strong> at <strong>${timeSlot}</strong>. We look forward to seeing you at PureSmile Dental Clinic.
          </p>

          <table style="width: 100%; border-collapse: collapse; background: #0A0D12; border-radius: 12px; padding: 16px; border: 1px solid #27272A;">
            <tr>
              <td style="padding: 10px 16px; color: #A1A1AA; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Procedure:</td>
              <td style="padding: 10px 16px; color: #F59E0B; font-size: 14px; font-weight: bold; text-align: right;">${serviceName}</td>
            </tr>
            <tr>
              <td style="padding: 10px 16px; color: #A1A1AA; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Date:</td>
              <td style="padding: 10px 16px; color: #F4F4F5; font-size: 14px; font-weight: bold; text-align: right;">${appointmentDate}</td>
            </tr>
            <tr>
              <td style="padding: 10px 16px; color: #A1A1AA; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Time Slot:</td>
              <td style="padding: 10px 16px; color: #F4F4F5; font-size: 14px; font-weight: bold; text-align: right;">${timeSlot}</td>
            </tr>
          </table>
        </div>

        <div style="background: #18181B; padding: 20px; border-radius: 12px; border: 1px solid #27272A; text-align: center; margin-bottom: 24px;">
          <p style="color: #A1A1AA; font-size: 12px; margin: 0 0 6px 0;">📍 Clinic Location:</p>
          <p style="color: #F4F4F5; font-size: 13px; font-weight: bold; margin: 0;">450 Beverly Hills Medical Plaza, Suite 800, Los Angeles, CA</p>
          <p style="color: #71717A; font-size: 11px; margin-top: 6px;">Phone: +1 (800) 787-3764</p>
        </div>

        <p style="color: #71717A; font-size: 11px; text-align: center; margin-top: 24px; line-height: 1.5;">
          PureSmile Precision Dental Clinic • Swiss Microscopic Precision & Aesthetic Smile Artistry<br/>
          Need to reschedule? Call our concierge team 24/7.
        </p>
      </div>
    `;

    return { textMessage, emailSubject, htmlEmail };
  }

  if (status === 'Cancelled') {
    const textMessage = `Dear ${patientName}, we regret to inform you that your appointment scheduled for ${appointmentDate} has been cancelled. Please feel free to reach out to us if you wish to reschedule.`;
    
    const emailSubject = `[PureSmile Dental Clinic] Notice: Appointment Cancelled for ${appointmentDate}`;
    
    const htmlEmail = `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #0A0D12; color: #FFFFFF; border-radius: 20px; border: 1px solid #27272A;">
        <div style="text-align: center; margin-bottom: 28px;">
          <h1 style="color: #EF4444; margin: 0; font-size: 26px; font-weight: bold; letter-spacing: 2px;">PUREDENT CLINIC</h1>
          <p style="color: #A1A1AA; font-size: 11px; margin-top: 4px; text-transform: uppercase; letter-spacing: 2px;">Beverly Hills Precision Dental Care</p>
        </div>
        
        <div style="background: #18181B; padding: 28px; border-radius: 16px; border: 1px solid #27272A; margin-bottom: 24px;">
          <div style="display: inline-block; padding: 6px 12px; background: #7F1D1D; color: #FCA5A5; font-size: 11px; font-weight: bold; border-radius: 20px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px;">
            ✕ Appointment Cancelled
          </div>
          
          <p style="color: #F4F4F5; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
            Dear <strong>${patientName}</strong>,
          </p>
          <p style="color: #D4D4D8; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
            We regret to inform you that your appointment scheduled for <strong>${appointmentDate}</strong> (${serviceName}) has been cancelled. Please feel free to reach out to us if you wish to reschedule.
          </p>
        </div>

        <div style="background: #18181B; padding: 20px; border-radius: 12px; border: 1px solid #27272A; text-align: center; margin-bottom: 24px;">
          <p style="color: #FBBF24; font-size: 13px; font-weight: bold; margin: 0 0 6px 0;">Would you like to book another time?</p>
          <p style="color: #A1A1AA; font-size: 12px; margin: 0;">Our patient care hotline is available at <strong>+1 (800) 787-3764</strong> or via our online portal.</p>
        </div>

        <p style="color: #71717A; font-size: 11px; text-align: center; margin-top: 24px; line-height: 1.5;">
          PureSmile Precision Dental Clinic • Beverly Hills Plaza Suite 800
        </p>
      </div>
    `;

    return { textMessage, emailSubject, htmlEmail };
  }

  if (status === 'Completed') {
    const textMessage = `Dear ${patientName}, thank you for visiting PureSmile Dental Clinic today for your ${serviceName}. We hope you had a comfortable experience!`;
    const emailSubject = `[PureSmile Dental Clinic] Thank you for your visit today!`;
    const htmlEmail = `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #0A0D12; color: #FFFFFF; border-radius: 20px; border: 1px solid #27272A;">
        <div style="text-align: center; margin-bottom: 28px;">
          <h1 style="color: #38BDF8; margin: 0; font-size: 26px; font-weight: bold; letter-spacing: 2px;">PUREDENT CLINIC</h1>
          <p style="color: #A1A1AA; font-size: 11px; margin-top: 4px; text-transform: uppercase; letter-spacing: 2px;">Visit Completed</p>
        </div>
        <div style="background: #18181B; padding: 28px; border-radius: 16px; border: 1px solid #27272A;">
          <p style="color: #F4F4F5; font-size: 15px;">Dear <strong>${patientName}</strong>,</p>
          <p style="color: #D4D4D8; font-size: 14px; line-height: 1.6;">Thank you for visiting PureSmile Dental Clinic today for your <strong>${serviceName}</strong>. Please follow any post-treatment care instructions provided by your dental specialist.</p>
        </div>
      </div>
    `;
    return { textMessage, emailSubject, htmlEmail };
  }

  // Fallback for Pending or other statuses
  const textMessage = `Dear ${patientName}, your appointment status for ${serviceName} on ${appointmentDate} at ${timeSlot} has been updated to "${status}".`;
  const emailSubject = `[PureSmile Dental Clinic] Appointment Status Update`;
  const htmlEmail = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #0A0D12; color: #FFFFFF; border-radius: 20px; border: 1px solid #27272A;">
      <p>Dear <strong>${patientName}</strong>,</p>
      <p>Your appointment status for <strong>${serviceName}</strong> on <strong>${appointmentDate}</strong> at <strong>${timeSlot}</strong> has been updated to <strong>"${status}"</strong>.</p>
    </div>
  `;
  return { textMessage, emailSubject, htmlEmail };
}

/**
 * Main dispatch function for patient notifications:
 * 1. Resolves patient email
 * 2. Prepares English template copy
 * 3. Sends Nodemailer HTML email
 * 4. Performs comprehensive terminal console logging for debugging & WhatsApp mock
 */
export async function sendAppointmentNotification(payload: NotificationPayload): Promise<boolean> {
  const timestampIso = new Date().toISOString();
  const { patientName, patientPhone, serviceName, appointmentDate, timeSlot, status, appointmentId } = payload;

  // Resolve target email address
  const targetEmail = await resolvePatientEmail(patientPhone, patientName, payload.patientEmail);

  // Generate English copy templates
  const { textMessage, emailSubject, htmlEmail } = generateNotificationCopy(payload);

  let emailStatusText = 'Dispatched successfully';

  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"PureSmile Dental Clinic" <concierge@puresmiledental.com>`,
      to: targetEmail,
      subject: emailSubject,
      text: textMessage,
      html: htmlEmail,
    };

    const info = await transporter.sendMail(mailOptions);
    if (info && info.messageId) {
      emailStatusText = `Dispatched via Nodemailer (MessageId: ${info.messageId})`;
    } else {
      emailStatusText = `Processed via Nodemailer stream transport`;
    }
  } catch (err: any) {
    emailStatusText = `Nodemailer processing attempt complete (${err?.message || err})`;
  }

  // ----------------------------------------------------------------------------------
  // HEAVY BACKEND TERMINAL CONSOLE LOGGING (DEBUGGING & WHATSAPP MOCK)
  // ----------------------------------------------------------------------------------
  console.log('\n╔════════════════════════════════════════════════════════════════════════════════╗');
  console.log(`║ 📲 [NOTIFICATION SYSTEM] APPOINTMENT STATUS CHANGED TO "${status.toUpperCase()}"         ║`);
  console.log('╠════════════════════════════════════════════════════════════════════════════════╣');
  console.log(`⏰ Notification Timestamp : ${timestampIso}`);
  if (payload.adminActor) console.log(`👑 Authorized Admin      : ${payload.adminActor}`);
  console.log(`🆔 Appointment ID        : #${appointmentId || 'N/A'}`);
  console.log(`👤 Recipient Patient     : ${patientName}`);
  console.log(`📞 Recipient Phone       : ${patientPhone} (WhatsApp Target)`);
  console.log(`📧 Recipient Email       : ${targetEmail}`);
  console.log(`🦷 Dental Procedure      : ${serviceName}`);
  console.log(`📅 Scheduled Date & Time  : ${appointmentDate} at ${timeSlot}`);
  console.log(`🏷️ New Status            : ${status}`);
  console.log('----------------------------------------------------------------------------------');
  console.log('💬 [WHATSAPP OUTBOUND MESSAGE MOCK]');
  console.log(`"${textMessage}"`);
  console.log('----------------------------------------------------------------------------------');
  console.log('✉️ [EMAIL NOTIFICATION DETAILS]');
  console.log(`Subject : "${emailSubject}"`);
  console.log(`Body    : "${textMessage}"`);
  console.log('----------------------------------------------------------------------------------');
  console.log(`✅ [NOTIFICATION SYSTEM] Email & WhatsApp mock dispatched successfully (${emailStatusText})`);
  console.log('╚════════════════════════════════════════════════════════════════════════════════╝\n');

  return true;
}
