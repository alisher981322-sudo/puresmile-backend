import express from 'express';
import db from '../db.js';
import { validateAppointment } from '../middleware/validator.js';
import { recordAuditLog } from './auditLogs.ts';
import { sendAppointmentNotification } from '../services/notificationService.ts';
import { queueWhatsAppAppointmentConfirmation } from '../services/whatsappDispatcher.ts';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/appointments
 * Fetch all booked appointments ordered by creation date
 */
router.get('/appointments', async (req, res) => {
  console.log('==================================================');
  console.log('📅 [GET /api/appointments] Fetching All Appointments');
  console.log('📡 Request Headers:', JSON.stringify(req.headers, null, 2));
  console.log('==================================================');

  const queryStartTime = Date.now();
  try {
    const query = `
      SELECT 
        id, 
        patient_name, 
        patient_phone, 
        service_name, 
        appointment_date, 
        time_slot, 
        status, 
        created_at
      FROM appointments
      ORDER BY created_at DESC;
    `;
    const params = [];

    console.log('📝 [STEP 1] SQL Query String:');
    console.log('   ' + query.trim().replace(/\s+/g, ' '));
    console.log('📊 Mapped Parameter Values:', JSON.stringify(params));

    const result = await db.query(query, params);
    const duration = Date.now() - queryStartTime;

    console.log(`⏱️ [DB METRICS] Execution Duration: ${duration}ms`);
    console.log(`✅ [STEP 2] Database Response Received: ${result.rows.length} records found`);
    console.log('📦 Data Preview (First 2):', JSON.stringify(result.rows.slice(0, 2), null, 2));
    console.log('🎉 [STEP 3] Sending Success Response to Client');
    console.log('==================================================');

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    const duration = Date.now() - queryStartTime;
    console.error('🔥 [DATABASE ERROR - APPOINTMENTS GET FAILURE]');
    console.error(`⏱️ Failed after: ${duration}ms`);
    console.error('🛑 Error Message:', error.message);
    console.error('📍 Full Database Error Stack Trace:\n', error.stack);
    console.log('==================================================');

    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve appointments from database.',
      details: error.message,
    });
  }
});

/**
 * POST /api/appointments
 * Route to book a new appointment and save patient details in PostgreSQL
 * Strictly using parameterized queries ($1, $2, etc.)
 */
router.post('/appointments', validateAppointment, async (req, res) => {
  console.log('==================================================');
  console.log('🚀 [POST /api/appointments] Booking New Dental Appointment');
  console.log('📦 Raw Request Body:', JSON.stringify(req.body, null, 2));
  console.log('==================================================');

  const overallStartTime = Date.now();

  try {
    const { patient_name, patient_phone, patient_email, service_name, appointment_date, time_slot } = req.body;

    // 1. Validation: Ensure all required fields are present
    console.log('🔍 [STEP 1] Validating presence of appointment fields...');
    if (!patient_name || !patient_phone || !service_name || !appointment_date || !time_slot) {
      console.log('❌ Validation Failed: Missing required fields');
      return res.status(400).json({
        success: false,
        error: 'Missing required fields. Please provide patient_name, patient_phone, service_name, appointment_date, and time_slot.',
      });
    }
    console.log('✅ Validation Success: All required fields present');

    // 2. Patient Upsert Query (Strictly Parameterized: $1, $2, $3)
    if (patient_email) {
      console.log('👤 [STEP 2] Executing Parameterized Patient Upsert Query...');
      const patientQuery = `
        INSERT INTO patients (name, phone, email)
        VALUES ($1, $2, $3)
        ON CONFLICT (phone) DO UPDATE 
        SET name = EXCLUDED.name, email = EXCLUDED.email
        RETURNING id, name, phone, email;
      `;
      const patientParams = [patient_name, patient_phone, patient_email];

      console.log('📝 SQL Query String:');
      console.log('   ' + patientQuery.trim().replace(/\s+/g, ' '));
      console.log('📊 Mapped Parameter Values ($1, $2, $3):', JSON.stringify(patientParams));

      const patientQueryStart = Date.now();
      const patientResult = await db.query(patientQuery, patientParams);
      const patientDuration = Date.now() - patientQueryStart;

      console.log(`⏱️ [DB METRICS] Patient Upsert Execution Duration: ${patientDuration}ms`);
      console.log('✅ Patient Record Processed:', JSON.stringify(patientResult.rows[0] || {}, null, 2));
    } else {
      console.log('ℹ️ [STEP 2] No email provided; skipping patient email upsert.');
    }

    // 3. Insert Appointment Query (Strictly Parameterized: $1, $2, $3, $4, $5)
    console.log('📅 [STEP 3] Executing Parameterized Appointment Insertion Query...');
    const appointmentQuery = `
      INSERT INTO appointments (patient_name, patient_phone, service_name, appointment_date, time_slot, status)
      VALUES ($1, $2, $3, $4, $5, 'Pending')
      RETURNING id, patient_name, patient_phone, service_name, appointment_date, time_slot, status, created_at;
    `;
    const appointmentParams = [patient_name, patient_phone, service_name, appointment_date, time_slot];

    console.log('📝 SQL Query String:');
    console.log('   ' + appointmentQuery.trim().replace(/\s+/g, ' '));
    console.log('📊 Mapped Parameter Values ($1 to $5):', JSON.stringify(appointmentParams));

    const appointmentQueryStart = Date.now();
    const result = await db.query(appointmentQuery, appointmentParams);
    const appointmentDuration = Date.now() - appointmentQueryStart;
    const bookedAppointment = result.rows[0];

    console.log(`⏱️ [DB METRICS] Appointment Insertion Execution Duration: ${appointmentDuration}ms`);
    console.log('✅ Appointment Created Successfully:', JSON.stringify(bookedAppointment, null, 2));

    const totalDuration = Date.now() - overallStartTime;
    console.log(`⏱️ [TOTAL TIME] Overall API Endpoint Duration: ${totalDuration}ms`);

    // Record in Daily Audit Trail
    try {
      recordAuditLog({
        action: 'BOOKING',
        category: 'appointment',
        title: 'New Online Consultation Booked',
        patient_name: bookedAppointment.patient_name,
        patient_phone: bookedAppointment.patient_phone,
        service_name: bookedAppointment.service_name,
        details: `Online booking for ${bookedAppointment.service_name} on ${bookedAppointment.appointment_date} at ${bookedAppointment.time_slot}.`,
        new_status: bookedAppointment.status || 'Pending',
        actor: 'Patient Online (PureSmile Portal)'
      });
    } catch (auditErr) {
      console.warn('⚠️ Audit logging notice:', auditErr);
    }

    console.log('🎉 [STEP 4] Sending Success Response to Client');
    console.log('==================================================');

    return res.status(201).json({
      success: true,
      message: 'Appointment successfully booked!',
      data: bookedAppointment,
    });

  } catch (error) {
    const totalDuration = Date.now() - overallStartTime;
    console.error('🔥 [DATABASE ERROR - APPOINTMENT CREATION FAILURE]');
    console.error(`⏱️ Failed after: ${totalDuration}ms`);
    console.error('🛑 Error Message:', error.message);
    console.error('📍 Full Database Error Stack Trace:\n', error.stack);
    console.log('==================================================');

    return res.status(500).json({
      success: false,
      error: 'Failed to book appointment due to a database error.',
      details: error.message,
    });
  }
});

/**
 * PUT /api/appointments/:id
 * Update appointment status (e.g. 'Confirmed', 'Cancelled', 'Pending')
 * Protected by Admin JWT Authentication Middleware (RBAC)
 * Strictly using parameterized query: $1, $2
 */
router.put('/appointments/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const adminActor = req.user?.name || req.user?.email || 'Admin';

  console.log('==================================================');
  console.log(`✍️ [PUT /api/appointments/${id}] Updating Appointment Status`);
  console.log(`🛡️ [RBAC VERIFIED] Authorized Admin : ${adminActor} (Role: ${req.user?.role || 'admin'})`);
  console.log('📦 Request Body:', JSON.stringify(req.body, null, 2));
  console.log('==================================================');

  const queryStartTime = Date.now();

  try {
    const ALLOWED_STATUSES = ['Pending', 'Confirmed', 'Completed', 'Cancelled'];
    if (!status || !ALLOWED_STATUSES.includes(status)) {
      console.log(`❌ Invalid status requested: ${status}`);
      return res.status(400).json({
        success: false,
        error: `Invalid status. Allowed values: ${ALLOWED_STATUSES.join(', ')}`,
      });
    }

    const query = `
      UPDATE appointments
      SET status = $1
      WHERE id = $2
      RETURNING id, patient_name, patient_phone, service_name, appointment_date, time_slot, status, created_at;
    `;
    const params = [status, Number(id)];

    console.log('📝 [STEP 1] SQL Query String:');
    console.log('   ' + query.trim().replace(/\s+/g, ' '));
    console.log('📊 Mapped Parameter Values ($1, $2):', JSON.stringify(params));

    const result = await db.query(query, params);
    const duration = Date.now() - queryStartTime;

    console.log(`⏱️ [DB METRICS] Execution Duration: ${duration}ms`);

    if (result.rows.length === 0) {
      console.log(`⚠️ Appointment with ID ${id} not found.`);
      return res.status(404).json({
        success: false,
        error: `Appointment with ID ${id} not found.`,
      });
    }

    const updatedAppt = result.rows[0];
    console.log('✅ [STEP 2] Appointment Status Updated:', JSON.stringify(updatedAppt, null, 2));

    // Record in Daily Audit Trail
    try {
      let actionType = 'STATUS_CHANGE';
      let title = `Appointment #${id} Marked as ${status}`;
      let category = 'appointment';

      if (status === 'Cancelled') {
        actionType = 'CANCELLATION';
        title = `Appointment #${id} Cancelled`;
      } else if (status === 'Completed') {
        actionType = 'PATIENT_VISIT';
        title = `Patient Visit Completed / Checked In`;
        category = 'clinical';
      } else if (status === 'Confirmed') {
        title = `Appointment #${id} Confirmed by Clinic`;
      }

      recordAuditLog({
        action: actionType,
        category,
        title,
        patient_name: updatedAppt.patient_name,
        patient_phone: updatedAppt.patient_phone,
        service_name: updatedAppt.service_name,
        details: `Status updated to '${status}'. Scheduled: ${updatedAppt.appointment_date} at ${updatedAppt.time_slot}.`,
        new_status: status,
        actor: `Admin (${adminActor})`
      });
    } catch (auditErr) {
      console.warn('⚠️ Audit logging notice:', auditErr);
    }

    // Trigger Automated Patient Notifications (Nodemailer Email)
    try {
      const apptDateStr = typeof updatedAppt.appointment_date === 'string'
        ? updatedAppt.appointment_date
        : new Date(updatedAppt.appointment_date).toISOString().split('T')[0];

      await sendAppointmentNotification({
        appointmentId: updatedAppt.id,
        patientName: updatedAppt.patient_name,
        patientPhone: updatedAppt.patient_phone,
        patientEmail: req.body.patient_email || req.body.email,
        serviceName: updatedAppt.service_name,
        appointmentDate: apptDateStr,
        timeSlot: updatedAppt.time_slot,
        status: updatedAppt.status,
        adminActor,
      });

      // Trigger Resilient Hybrid WhatsApp Dispatcher (Official Meta Cloud API + Puppeteer Fallback & Safe Rate-Limiting Queue)
      if (status === 'Confirmed') {
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
        queueWhatsAppAppointmentConfirmation({
          appointmentId: updatedAppt.id,
          patientName: updatedAppt.patient_name,
          patientPhone: updatedAppt.patient_phone,
          serviceName: updatedAppt.service_name,
          appointmentDate: apptDateStr,
          timeSlot: updatedAppt.time_slot,
          clientIp: Array.isArray(clientIp) ? clientIp[0] : clientIp,
          adminActor,
        }).catch((waErr) => {
          console.warn('⚠️ [WHATSAPP DISPATCH HANDLER NOTICE]:', waErr?.message || waErr);
        });
      }
    } catch (notifErr) {
      console.warn('⚠️ Notification system notice:', notifErr);
    }

    console.log('🎉 [STEP 3] Sending Success Response');
    console.log('==================================================');

    return res.status(200).json({
      success: true,
      message: `Appointment #${id} updated to '${status}' successfully!`,
      data: updatedAppt,
    });
  } catch (error) {
    const duration = Date.now() - queryStartTime;
    console.error(`🔥 [DATABASE ERROR - APPOINTMENT #${id} STATUS UPDATE FAILURE]`);
    console.error(`⏱️ Failed after: ${duration}ms`);
    console.error('🛑 Error Message:', error.message);
    console.error('📍 Full Database Error Stack Trace:\n', error.stack);
    console.log('==================================================');

    return res.status(500).json({
      success: false,
      error: 'Failed to update appointment status.',
      details: error.message,
    });
  }
});

export default router;

